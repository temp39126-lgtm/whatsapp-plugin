import { Fragment } from 'react';

export function highlightParts(text: string, highlight: string): Array<{ text: string; match: boolean }> {
  const term = highlight.trim();
  if (!term) return [{ text, match: false }];

  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part) => ({
    text: part,
    match: part.toLowerCase() === term.toLowerCase(),
  }));
}

export function HighlightedText({
  text,
  highlight,
  className,
}: {
  text: string;
  highlight?: string;
  className?: string;
}) {
  const parts = highlightParts(text, highlight ?? '');

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded bg-yellow-200/80 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        )
      )}
    </span>
  );
}