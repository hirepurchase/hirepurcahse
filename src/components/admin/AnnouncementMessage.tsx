'use client';

import { Fragment } from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Renders an announcement's plain-text message with its links made usable.
 *
 * Announcements are typed as free text by an admin, so nothing here is ever
 * treated as HTML — every part is rendered as a React text node and only
 * http/https runs are turned into anchors. A line that is nothing but a URL
 * becomes a full-width button, which is what makes a link tappable on the
 * phones agents actually use; a URL inside a sentence stays an inline link.
 */

const URL_RE = /(https?:\/\/[^\s<>"')]+)/g;

function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Trailing punctuation belongs to the sentence, not to the address. */
function splitTrailingPunctuation(url: string): [string, string] {
  const m = url.match(/[.,;:!?]+$/);
  return m ? [url.slice(0, -m[0].length), m[0]] : [url, ''];
}

function InlineLinks({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const [raw, tail] = splitTrailingPunctuation(part);
        const href = safeHref(raw);
        if (!href) return <Fragment key={i}>{part}</Fragment>;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 break-all"
            >
              {raw}
            </a>
            {tail}
          </Fragment>
        );
      })}
    </>
  );
}

export default function AnnouncementMessage({ message }: { message: string }) {
  const lines = message.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const href = URL_RE.test(trimmed) ? safeHref(trimmed) : null;
        URL_RE.lastIndex = 0; // the regex is global; reset before the next line

        // A line holding nothing but a link is the call to action.
        if (href && trimmed.replace(URL_RE, '').trim() === '') {
          URL_RE.lastIndex = 0;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Open the new address
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          );
        }
        URL_RE.lastIndex = 0;

        if (trimmed === '') return <div key={i} className="h-1" />;

        return (
          <p key={i} className="whitespace-pre-wrap text-sm text-gray-800">
            <InlineLinks text={line} />
          </p>
        );
      })}
    </div>
  );
}
