import { useMemo, useRef } from 'react';
import { normalizeHex } from '../utils/hexParser';

interface CodePaletteInputProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
  placeholder?: string;
  rows?: number;
}

interface Segment {
  text: string;
  kind: 'text' | 'delimiter' | 'hex' | 'comment';
}

const HEX_OR_DELIMITER_REGEX = /(#[0-9a-fA-F]{3,8}\b|[0-9a-fA-F]{3,8}\b|[,;])/g;

const getTokenColors = (rawHex: string) => {
  const normalized = normalizeHex(rawHex);
  if (!normalized) {
    return {
      text: '#0f172a',
      background: 'rgba(148, 163, 184, 0.2)',
      border: 'rgba(148, 163, 184, 0.35)',
    };
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const foreground = luminance > 180 ? '#0f172a' : '#f8fafc';
  const border = luminance > 180 ? 'rgba(100, 116, 139, 0.45)' : 'rgba(248, 250, 252, 0.35)';
  return {
    text: foreground,
    background: `#${normalized}`,
    border,
  };
};

const splitLine = (line: string): Segment[] => {
  const commentIndex = line.indexOf('//');
  const codePart = commentIndex === -1 ? line : line.slice(0, commentIndex);
  const commentPart = commentIndex === -1 ? '' : line.slice(commentIndex);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of codePart.matchAll(HEX_OR_DELIMITER_REGEX)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({
        text: codePart.slice(cursor, start),
        kind: 'text',
      });
    }

    if (token === ',' || token === ';') {
      segments.push({ text: token, kind: 'delimiter' });
    } else {
      segments.push({ text: token, kind: 'hex' });
    }

    cursor = start + token.length;
  }

  if (cursor < codePart.length) {
    segments.push({ text: codePart.slice(cursor), kind: 'text' });
  }

  if (commentPart) {
    segments.push({ text: commentPart, kind: 'comment' });
  }

  return segments;
};

export const CodePaletteInput = ({ value, onChange, id, placeholder, rows = 5 }: CodePaletteInputProps) => {
  const preRef = useRef<HTMLPreElement | null>(null);

  const lines = useMemo(() => {
    const rawLines = value.length > 0 ? value.split('\n') : [''];
    return rawLines.map((line) => splitLine(line));
  }, [value]);

  const syncScroll = (target: HTMLTextAreaElement) => {
    if (!preRef.current) {
      return;
    }
    preRef.current.scrollTop = target.scrollTop;
  };

  return (
    <div className="relative w-full max-w-full min-w-0 overflow-hidden">
      <pre
        ref={preRef}
        aria-hidden="true"
        className="pointer-events-none min-h-[7rem] w-full max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-sm leading-6"
      >
        {value.length === 0 ? (
          <span className="text-slate-500">{placeholder}</span>
        ) : (
          lines.map((segments, lineIndex) => (
            <div key={`line-${lineIndex}`}>
              {segments.map((segment, segmentIndex) => {
                if (segment.kind === 'delimiter') {
                  return (
                    <span key={`seg-${lineIndex}-${segmentIndex}`} className="text-sky-300">
                      {segment.text}
                    </span>
                  );
                }
                if (segment.kind === 'comment') {
                  return (
                    <span key={`seg-${lineIndex}-${segmentIndex}`} className="text-slate-500">
                      {segment.text}
                    </span>
                  );
                }
                if (segment.kind === 'hex') {
                  const tokenColors = getTokenColors(segment.text);
                  return (
                    <span
                      key={`seg-${lineIndex}-${segmentIndex}`}
                      className="rounded-sm"
                      style={{
                        color: tokenColors.text,
                        backgroundColor: tokenColors.background,
                        boxShadow: `inset 0 0 0 1px ${tokenColors.border}`,
                      }}
                    >
                      {segment.text}
                    </span>
                  );
                }
                return (
                  <span key={`seg-${lineIndex}-${segmentIndex}`} className="text-slate-200">
                    {segment.text}
                  </span>
                );
              })}
              {lineIndex < lines.length - 1 ? '\n' : ''}
            </div>
          ))
        )}
      </pre>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => syncScroll(event.currentTarget)}
        rows={rows}
        wrap="soft"
        spellCheck={false}
        className="absolute inset-0 w-full max-w-full resize-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg border border-transparent bg-transparent p-3 font-mono text-sm leading-6 text-transparent caret-white outline-none focus:ring-2 focus:ring-sky-400"
      />
    </div>
  );
};
