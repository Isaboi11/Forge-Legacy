import ExpoModulesCore
import UIKit
import Vision

/**
 ══ READ A NUTRITION FACTS PHOTO, ON THE PHONE ══

 `Scan Nutrition Label v2.dc.html`. Apple's Vision text recogniser — free, offline, nothing leaves the
 device. This file returns LINES and nothing else: which number is calories is decided in TypeScript
 (`domain/nutrition/label-read.ts`), where it can be unit-tested on a machine with no Xcode on it. Keep
 it that way — a rule added here is a rule nobody in this project can run a test against.

 ⚠ WHY NOT `expo-text-extractor`: it returns bare strings. The design's bronze dot means "Forge isn't
   confident about this value", and only Vision's per-line `confidence` can say that. Positions come
   back too, so a label whose name and number land on separate lines can be rejoined into one row.

 ⚠ ORIENTATION IS PASSED, NOT ASSUMED. A phone photo is stored sideways with an EXIF flag; `cgImage`
   drops that flag, and Vision reading a sideways label finds almost nothing.

 ⚠ LANGUAGE CORRECTION IS OFF. It "fixes" `8g` into words; a label is numbers.
 */
public class ForgeLabelReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ForgeLabelReader")

    AsyncFunction("read") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard
          let url = URL(string: uri),
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data),
          let cgImage = image.cgImage
        else {
          promise.reject("ERR_LABEL_IMAGE", "Could not open the photo")
          return
        }

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en-US"]

        let handler = VNImageRequestHandler(
          cgImage: cgImage,
          orientation: ForgeLabelReaderModule.orientation(image.imageOrientation),
          options: [:]
        )

        do {
          try handler.perform([request])
        } catch {
          promise.reject("ERR_LABEL_READ", error.localizedDescription)
          return
        }

        var lines: [[String: Any]] = []
        for observation in request.results ?? [] {
          guard let top = observation.topCandidates(1).first else { continue }
          // Vision's box is normalised with the origin BOTTOM-left; flip to top-left for the layout code.
          let box = observation.boundingBox
          lines.append([
            "text": top.string,
            "confidence": Double(top.confidence),
            "x": Double(box.minX),
            "y": Double(1 - box.maxY),
            "w": Double(box.width),
            "h": Double(box.height),
          ])
        }
        promise.resolve(lines as Any)
      }
    }
  }

  static func orientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
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
