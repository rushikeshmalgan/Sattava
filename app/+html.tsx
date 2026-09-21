import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The HTML shell of the web build. Web-only: it is not used on iOS or Android, and it runs in Node during
 * the static export, so it must not touch the DOM or any browser API.
 *
 * It exists because the generated document otherwise had an empty <title>, which shows a bare URL in the
 * browser tab and in a bookmark.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover so the layout reaches under a phone's notch, as it does in the native app. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="description" content="Log Indian meals from a photo and track calories, macros and water against ICMR guidance." />
        {/* No <title> here: the router renders its own (see the Head in app/_layout.tsx), and a second one
            would be ignored by the browser while making the document invalid. */}

        {/* Keeps body scrolling off, so only ScrollViews scroll — matching the native app. */}
        <ScrollViewStyleReset />

        {/* Set before first paint, so a reload does not flash white in dark mode. */}
        <style dangerouslySetInnerHTML={{ __html: BACKGROUND_STYLE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BACKGROUND_STYLE = `
body { background-color: #F8FAFC; }
@media (prefers-color-scheme: dark) {
  body { background-color: #0F1115; }
}`;
