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

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
