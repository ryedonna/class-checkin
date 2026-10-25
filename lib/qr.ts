const PREFIX = 'CLASS|';

/**
 * Reads a class QR code. Format: "CLASS|<class name>", e.g. "CLASS|5 Bestari".
 * The prefix stops random QR codes (posters, URLs) from being recorded as classes.
 */
export function parseClassQR(raw: string): { className: string } | null {
  const text = raw.trim();
  if (text.slice(0, PREFIX.length).toUpperCase() !== PREFIX) return null;
  const className = text.slice(PREFIX.length).trim();
  if (!className || className.length > 100) return null;
  return { className };
}

/** What the QR generator encodes for a class. */
export function encodeClassQR(className: string): string {
  return PREFIX + className.trim();
}
