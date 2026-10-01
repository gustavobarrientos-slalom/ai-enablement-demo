import { useEffect, useState } from 'react';
import { createQr, type QrResult } from '../lib/qr';
import { QR_COLORS } from '../ui/theme';

export function QrCode({ text, name, onTooLarge }: {
  text: string;
  name: string;
  onTooLarge?: () => void;
}) {
  const [result, setResult] = useState<QrResult | null>(null);

  useEffect(() => {
    let mounted = true;
    void createQr(text).then((next) => {
      if (!mounted) return;
      setResult(next);
      if (next.kind === 'too-large') onTooLarge?.();
    });
    return () => { mounted = false; };
  }, [text, onTooLarge]);

  if (!result) {
    return <div aria-label="Loading QR code" className="block h-[240px] min-w-[240px] w-full max-w-[320px] animate-pulse bg-white" />;
  }

  if (result.kind === 'too-large') return null;

  const path = result.modules.reduce((commands, filled, index) => {
    if (!filled) return commands;
    const x = index % result.size;
    const y = Math.floor(index / result.size);
    return `${commands}M${x + 4} ${y + 4}h1v1h-1z`;
  }, '');

  return (
    <svg
      role="img"
      aria-label={`QR code for ${name}`}
      viewBox={`0 0 ${result.size + 8} ${result.size + 8}`}
      className="block h-auto min-w-[240px] w-full max-w-[320px] aspect-square"
      shapeRendering="crispEdges"
      fill={QR_COLORS.dark}
    >
      <rect width={result.size + 8} height={result.size + 8} fill={QR_COLORS.light} />
      <path d={path} fill={QR_COLORS.dark} />
    </svg>
  );
}
