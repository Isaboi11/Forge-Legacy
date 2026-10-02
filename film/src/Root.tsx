import React from 'react';
import { Composition } from 'remotion';
import { Film } from './Film';
import { AD15_DUR, RDUR } from './timeline';

// 60 fps master (the recordings are 60 fps; the turn and pull-back read smoother). The web files are encoded down
// to 30 from it.
const FPS = 60;
const frames = Math.ceil(RDUR * FPS);
const adFrames = AD15_DUR * FPS;

export const Root: React.FC = () => (
  <>
    <Composition id="HeroDesktop" component={Film} durationInFrames={frames} fps={FPS} width={1920} height={1080} defaultProps={{ portrait: false }} />
    <Composition id="HeroPhone" component={Film} durationInFrames={frames} fps={FPS} width={1080} height={1920} defaultProps={{ portrait: true }} />
    <Composition id="Ad15Desktop" component={Film} durationInFrames={adFrames} fps={FPS} width={1920} height={1080} defaultProps={{ portrait: false, cut: 'ad15' as const }} />
    <Composition id="Ad15Phone" component={Film} durationInFrames={adFrames} fps={FPS} width={1080} height={1920} defaultProps={{ portrait: true, cut: 'ad15' as const }} />
  </>
);
