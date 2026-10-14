/**
 * Web HTML shell (expo-router `+html.tsx`).
 *
 * This file is **web only** — Metro ignores it on iOS and Android.
 *
 * It exists for one reason: Expo's default web shell leaves the document with
 * a white background, which flashes before hydration and shows through on
 * overscroll. Painting the document void-black keeps the web build
 * indistinguishable from the native one.
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* `viewport-fit=cover` lets the layout reach under the web-safe areas. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0A0A0A" />

        {/* Default Expo resets, incl. the 100%-height chain the app shell needs. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: WEB_SHELL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const WEB_SHELL_CSS = `
html, body {
  background-color: #0A0A0A;
  color: #F9FAFB;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}

/* React Native Web lays out with flexbox; a stretched column root keeps the
   app shell behaving like the native one at every viewport width. */
#root {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}
`;
