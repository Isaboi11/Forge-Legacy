import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML for every web page during static rendering.
 * This runs in Node, not the browser, so no client APIs / hooks here.
 * Adds the "Add to Home Screen" (PWA) tags so the site installs as a
 * fullscreen app with the Forge pillars icon.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* App name + install / Add to Home Screen */}
        <title>Forge Legacy</title>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Forge Legacy" />
        <meta name="theme-color" content="#0E0E12" />

        {/*
          PAINT THE ATHLETE'S THEME BEFORE REACT EXISTS.

          ⚠ `expo export` PRERENDERS these pages in Node, where there is no `localStorage` — so the
          HTML on disk is always the Forge default. Without this, a Paper athlete gets a full dark
          frame on every load until the bundle parses and hydrates: the exact "flash of a different
          product" that `splash-continuity.test.mjs` exists to prevent, arriving through the one door
          that test cannot see.

          It runs before `<body>` is parsed and reads the same `fl_theme_v1` key `theme-choice.web.ts`
          resolves from, so the two cannot disagree. Everything is inside a try/catch because
          `localStorage` THROWS rather than returning null in a private window or with site data
          blocked — an unhandled throw here would take the page down before the app ever loads.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var p = localStorage.getItem('fl_theme_v1') === 'paper';
  var bg = p ? '#F6F2E8' : '#0E0E12';
  document.documentElement.style.backgroundColor = bg;
  document.documentElement.setAttribute('data-theme', p ? 'paper' : 'forge');
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', bg);
}catch(e){}})();`,
          }}
        />

        <ScrollViewStyleReset />
      </head>
      {/* The inline script above sets the real colour; this is the value the prerender ships with, and
          it only shows if scripts are blocked entirely. */}
      <body style={{ backgroundColor: '#0E0E12' }}>{children}</body>
    </html>
  );
}
