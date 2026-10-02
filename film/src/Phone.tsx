import React from 'react';
import type { Pose } from './timeline';

// A generic premium phone — deliberately NOT an iPhone. Apple's marketing guidelines forbid 3D renders of
// Apple products and spinning their images, so: a centred punch-hole camera (no Dynamic Island), a plain
// two-lens bump, and the FL mark on the back. Screen is 402 × 862 logical px, the iPhone-size viewport the
// recordings are captured at (430 × 932 scaled into the bezel).

export const SCREEN_W = 402;
export const SCREEN_H = 862;

const edgeLayers = Array.from({ length: 12 }, (_, i) => i + 1);

// The screen's top-left inside the phone body (bezel 4 + 10): `lift` children are placed in screen coordinates
// from here, outside the screen's clip, so a lifted piece can rise off the glass and grow past the edges.
export const SCREEN_X = 14;

export const Phone: React.FC<{ pose: Pose; children: React.ReactNode; overlay?: React.ReactNode; lift?: React.ReactNode }> = ({ pose, children, overlay, lift }) => {
  const p = pose;
  return (
    <div
      style={{
        position: 'absolute', left: -215, top: -445, width: 430, height: 890, transformStyle: 'preserve-3d',
        transform: `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`,
      }}
    >
      {edgeLayers.map((i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: 66, transform: `translateZ(-${i}px)`,
          background: 'linear-gradient(90deg,#26231f,#6f675e 22%,#34302b 50%,#7a7168 78%,#26231f)',
        }} />
      ))}
      {/* back */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 66, transform: 'translateZ(-13px) rotateY(180deg)', backfaceVisibility: 'hidden',
        background: 'linear-gradient(150deg,#2f2b27,#161412 55%,#25211d)', boxShadow: 'inset 0 0 0 3px #4f4740',
      }}>
        <div style={{ position: 'absolute', left: 38, top: 38, width: 74, height: 150, borderRadius: 37, background: '#121110', boxShadow: 'inset 0 0 0 2px #3d3732' }}>
          {[16, 82].map((top) => (
            <i key={top} style={{
              position: 'absolute', left: 13, top, width: 48, height: 48, borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%,#3a434c,#05070a 60%)', boxShadow: '0 0 0 4px #24201c',
            }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 410, textAlign: 'center', fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 44, letterSpacing: '.2em', background: 'linear-gradient(#F3D9AE,#C99767 55%,#7E5C3B)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>FL</div>
      </div>
      {/* front */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 66, padding: 4, backfaceVisibility: 'hidden',
        background: 'linear-gradient(135deg,#9a9086,#34302b 28%,#6d655d 58%,#26231f 82%,#857c72)',
      }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 62, background: '#020203', padding: 10 }}>
          <div style={{ position: 'relative', width: SCREEN_W, height: SCREEN_H, borderRadius: 52, overflow: 'hidden', background: '#05080A' }}>
            {children}
            <div style={{ position: 'absolute', left: '50%', top: 14, width: 22, height: 22, marginLeft: -11, borderRadius: '50%', background: '#000', boxShadow: '0 0 0 2px #0b0b0c', zIndex: 50 }} />
            {overlay}
          </div>
        </div>
      </div>
      {lift && <div style={{ position: 'absolute', left: SCREEN_X, top: SCREEN_X, transformStyle: 'preserve-3d' }}>{lift}</div>}
    </div>
  );
};
