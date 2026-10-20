import { Fragment } from "react";

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;

function normalizeHref(url: string) {
  return url.startsWith("www.") ? `https://${url}` : url;
}

function trimTrailingPunctuation(url: string) {
  return url.replace(/[.,:;"')\]}!?]+$/, "");
}

export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: Array<{ key: string; type: "text" | "link"; value: string }> =
    [];
  let lastIndex = 0;
  const regex = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        key: `t-${lastIndex}`,
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }
    parts.push({
      key: `l-${match.index}`,
      type: "link",
      value: trimTrailingPunctuation(match[0]),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      key: `t-${lastIndex}`,
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part) =>
        part.type === "link" ? (
          <a
            key={part.key}
            href={normalizeHref(part.value)}
            target="_blank"
            rel="noopener noreferrer"
            className="linkified-url"
          >
            {part.value}
          </a>
        ) : (
          <Fragment key={part.key}>{part.value}</Fragment>
        ),
      )}
    </span>
  );
}
