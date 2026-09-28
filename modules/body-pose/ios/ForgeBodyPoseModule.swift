import AVFoundation
import ExpoModulesCore
import UIKit
import Vision

/**
 ══ FIND THE ATHLETE'S JOINTS IN A FORM-CHECK CLIP, ON THE PHONE ══

 `Docs/Form-Check-Body-Pose-Build-Plan.md` §3. Apple's Vision body pose (2D, PO decision 1) — free,
 offline, nothing leaves the device. This file returns RAW JOINTS and nothing else: which person is the
 athlete, where the reps are and what a number means are decided in TypeScript
 (`src/domain/coach/pose/`), where they can be unit-tested on a machine with no Xcode on it. Keep it
 that way — a rule added here is a rule nobody in this project can run a test against, and this file's
 first compile is the EAS build.

 Wire (the TS loader is `src/lib/body-pose.ts`):
   track(uri, { startMs, endMs, fps, maxPeople }) → { width, height, nominalFps, frames: [{ t, people }] }
   detect([uri])                                  → [{ t: 0, people }] one per image, same order
   cancel()
 Each person is 19 joints × [x, y, confidence], flat, in `ForgeBodyPoseModule.joints` order (the TS
 constant `POSE_JOINTS` must match). x/y are 0–1 from the TOP-left of the upright frame. Missing = 0,0,0.

 ⚠ ORIENTATION IS PASSED, NOT ASSUMED. A phone clip is stored sideways with a `preferredTransform`; Vision
   reading a sideways person finds almost nothing (label-reader's lesson, for photos).

 ⚠ DENSE, CAPPED, CANCELLABLE. `AVAssetReader` decodes the trim once, in order (one seek per frame would be
   far too slow); one sample is kept per 1000/fps ms of presentation time; at most 300 samples; 20 s wall
   clock; the cancel flag and the clock are checked every sample; `autoreleasepool` per frame.

 ⚠ THE REQUEST REVISION IS PINNED so an iOS update cannot silently change the numbers the TS was tuned on.
 */

struct TrackOptions: Record {
  @Field var startMs: Double = 0
  @Field var endMs: Double = 0
  @Field var fps: Double = 10
  @Field var maxPeople: Int = 4
}

struct PoseFailure: Error {
  let code: String
  let message: String
}

final class CancelFlag {
  private let lock = NSLock()
  private var value = false

  func set(_ v: Bool) {
    lock.lock()
    value = v
    lock.unlock()
  }

  var isSet: Bool {
    lock.lock()
    defer { lock.unlock() }
    return value
  }
}

public class ForgeBodyPoseModule: Module {
  private let cancelFlag = CancelFlag()

  static let maxSamples = 300
  static let timeLimit: TimeInterval = 20

  /// Vision's joints in the wire order. Changing this changes `POSE_JOINTS` in `src/domain/coach/pose/joints.ts`.
  static let joints: [VNHumanBodyPoseObservation.JointName] = [
    .nose, .leftEye, .rightEye, .leftEar, .rightEar, .neck,
    .leftShoulder, .rightShoulder, .leftElbow, .rightElbow, .leftWrist, .rightWrist,
    .root, .leftHip, .rightHip, .leftKnee, .rightKnee, .leftAnkle, .rightAnkle,
  ]

  public func definition() -> ModuleDefinition {
    Name("ForgeBodyPose")

    AsyncFunction("track") { (uri: String, options: TrackOptions, promise: Promise) in
      let flag = self.cancelFlag
      flag.set(false)
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          promise.resolve(try ForgeBodyPoseModule.track(uri: uri, options: options, cancelled: flag))
        } catch let failure as PoseFailure {
          promise.reject(failure.code, failure.message)
        } catch {
          promise.reject("ERR_POSE_TRACK", error.localizedDescription)
        }
      }
    }

    AsyncFunction("detect") { (uris: [String], promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        promise.resolve(uris.map { ForgeBodyPoseModule.detect(uri: $0) })
      }
    }

    Function("cancel") {
      self.cancelFlag.set(true)
    }
  }

  // MARK: - The dense pass

  static func track(uri: String, options: TrackOptions, cancelled: CancelFlag) throws -> [String: Any] {
    guard let url = fileURL(uri) else {
      throw PoseFailure(code: "ERR_POSE_VIDEO", message: "Could not open the clip")
    }
    let asset = AVURLAsset(url: url)
    guard let track = asset.tracks(withMediaType: .video).first else {
      throw PoseFailure(code: "ERR_POSE_VIDEO", message: "The clip has no video")
    }
    let transform = track.preferredTransform
    let upright = track.naturalSize.applying(transform)
    let orientation = ForgeBodyPoseModule.orientation(transform)

    let durationMs = CMTimeGetSeconds(asset.duration) * 1000
    let startMs = max(0, options.startMs)
    var endMs = options.endMs > startMs ? options.endMs : durationMs
    if durationMs.isFinite && durationMs > 0 { endMs = min(endMs, durationMs) }
    guard endMs.isFinite, endMs > startMs else {
      throw PoseFailure(code: "ERR_POSE_VIDEO", message: "Nothing to read in that window")
    }
    let stepMs = 1000 / max(1, min(30, options.fps))
    let maxPeople = max(1, min(8, options.maxPeople))

    let reader = try AVAssetReader(asset: asset)
    reader.timeRange = CMTimeRange(
      start: CMTime(seconds: startMs / 1000, preferredTimescale: 600),
      end: CMTime(seconds: endMs / 1000, preferredTimescale: 600)
    )
    let output = AVAssetReaderTrackOutput(
      track: track,
      outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
    )
    output.alwaysCopiesSampleData = false
    guard reader.canAdd(output) else {
      throw PoseFailure(code: "ERR_POSE_VIDEO", message: "Could not read the clip")
    }
    reader.add(output)
    guard reader.startReading() else {
      throw PoseFailure(code: "ERR_POSE_VIDEO", message: reader.error?.localizedDescription ?? "Could not read the clip")
    }
    defer {
      if reader.status == .reading { reader.cancelReading() }
    }

    let request = VNDetectHumanBodyPoseRequest()
    request.revision = VNDetectHumanBodyPoseRequestRevision1

    let started = Date()
    var nextMs = startMs
    var frames: [[String: Any]] = []

    while frames.count < maxSamples {
      if cancelled.isSet {
        throw PoseFailure(code: "ERR_POSE_CANCELLED", message: "Cancelled")
      }
      if Date().timeIntervalSince(started) > timeLimit {
        throw PoseFailure(code: "ERR_POSE_TIMEOUT", message: "Body tracking took too long")
      }
      guard let sample = output.copyNextSampleBuffer() else { break }
      let frame: [String: Any]? = autoreleasepool {
        let ms = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample)) * 1000
        guard ms.isFinite, ms + 1 >= nextMs, let pixels = CMSampleBufferGetImageBuffer(sample) else { return nil }
        while nextMs <= ms { nextMs += stepMs }
        let handler = VNImageRequestHandler(cvPixelBuffer: pixels, orientation: orientation, options: [:])
        do {
          try handler.perform([request])
        } catch {
          return ["t": ms, "people": [[Double]]()]
        }
        let people = (request.results ?? []).prefix(maxPeople).map { ForgeBodyPoseModule.flatten($0) }
        return ["t": ms, "people": Array(people)]
      }
      if let frame { frames.append(frame) }
    }

    if frames.isEmpty && reader.status == .failed {
      throw PoseFailure(code: "ERR_POSE_VIDEO", message: reader.error?.localizedDescription ?? "Could not read the clip")
    }
    return [
      "width": Double(abs(upright.width)),
      "height": Double(abs(upright.height)),
      "nominalFps": Double(track.nominalFrameRate),
      "frames": frames,
    ]
  }

  // MARK: - Stills (the JPEGs that are sent and drawn)

  static func detect(uri: String) -> [String: Any] {
    let empty: [String: Any] = ["t": 0, "people": [[Double]]()]
    guard
      let url = fileURL(uri),
      let data = try? Data(contentsOf: url),
      let image = UIImage(data: data),
      let cgImage = image.cgImage
    else { return empty }

    let request = VNDetectHumanBodyPoseRequest()
    request.revision = VNDetectHumanBodyPoseRequestRevision1
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: imageOrientation(image.imageOrientation), options: [:])
    do {
      try handler.perform([request])
    } catch {
      return empty
    }
    let people = (request.results ?? []).prefix(4).map { ForgeBodyPoseModule.flatten($0) }
    return ["t": 0, "people": Array(people)]
  }

  // MARK: - Helpers

  /// 19 joints × [x, y, confidence]. Vision's origin is BOTTOM-left; flipped to top-left for the TS.
  static func flatten(_ observation: VNHumanBodyPoseObservation) -> [Double] {
    let points = (try? observation.recognizedPoints(.all)) ?? [:]
    var out: [Double] = []
    out.reserveCapacity(joints.count * 3)
    for name in joints {
      if let p = points[name], p.confidence > 0 {
        out.append(Double(p.location.x))
        out.append(Double(1 - p.location.y))
        out.append(Double(p.confidence))
      } else {
        out.append(contentsOf: [0, 0, 0])
      }
    }
    return out
  }

  static func fileURL(_ uri: String) -> URL? {
    if let url = URL(string: uri), url.scheme != nil { return url }
    return uri.isEmpty ? nil : URL(fileURLWithPath: uri)
  }

  /// A video track's rotation as the orientation Vision needs to see the athlete upright.
  static func orientation(_ t: CGAffineTransform) -> CGImagePropertyOrientation {
    let a = t.a.rounded(), b = t.b.rounded(), c = t.c.rounded(), d = t.d.rounded()
    if a == 0 && b == 1 && c == -1 && d == 0 { return .right }
    if a == 0 && b == -1 && c == 1 && d == 0 { return .left }
    if a == -1 && b == 0 && c == 0 && d == -1 { return .down }
    return .up
  }

  static func imageOrientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch o {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
