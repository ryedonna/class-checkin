'use client';

import QRCode from 'qrcode';
import { useState } from 'react';
import { encodeClassQR } from '@/lib/qr';

type Card = { key: string; className: string; src: string };

const SAMPLE = '5 Bestari\n5 Cemerlang\nMakmal Sains 1';

/** Admin tool: turn a list of classes/rooms into printable QR codes. Runs fully in the browser. */
export default function QrGeneratorPage() {
  const [text, setText] = useState(SAMPLE);
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const names = Array.from(
        new Set(
          text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        )
      );
      const out = await Promise.all(
        names.map(async (className, idx) => ({
          key: `${idx}-${className}`,
          className,
          src: await QRCode.toDataURL(encodeClassQR(className), {
            width: 480,
            margin: 2,
            errorCorrectionLevel: 'M',
          }),
        }))
      );
      setCards(out);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wide">
      <div className="no-print">
        <h1>Classroom QR Generator</h1>
        <p>
          One class or room per line. Print the page and stick each code on its classroom door.
          Teachers scan it with the check-in app when they enter.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} />
        <div className="actions">
          <button className="btn" type="button" onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate'}
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => window.print()}
            disabled={cards.length === 0}
          >
            Print
          </button>
        </div>
      </div>

      <div className="qr-grid">
        {cards.map((c) => (
          <figure className="qr-card" key={c.key}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.src} alt={`QR code for ${c.className}`} width={200} height={200} />
            <figcaption>{c.className}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
