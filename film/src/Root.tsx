import React from 'react';
import { Composition } from 'remotion';
import { Film } from './Film';
import { RDUR } from './timeline';

// 30 fps master: the web hero is encoded at 30 anyway, and it halves 3D render time.
const FPS = 30;
const frames = Math.ceil(RDUR * FPS);

export const Root: React.FC = () => (
  <>
    <Composition id="HeroDesktop" component={Film} durationInFrames={frames} fps={FPS} width={1920} height={1080} defaultProps={{ portrait: false }} />
    <Composition id="HeroPhone" component={Film} durationInFrames={frames} fps={FPS} width={1080} height={1920} defaultProps={{ portrait: true }} />
  </>
);
