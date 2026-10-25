'use client';

import { useEffect, useRef, useState } from 'react';
import { AUTO_CONFIRM_SECONDS } from '@/lib/config';

type Props = {
  className: string;
  /** When the QR was scanned (shown so the teacher can see what will be recorded) */
  scannedAt: number;
  subjects: string[];
  /** Subject used last time in this class, shown first */
  suggested?: string;
  autoConfirm: boolean;
  onPick: (subject: string) => void;
  onCancel: () => void;
};

/** Bottom sheet shown after scanning a class QR: one tap to choose the subject. */
export default function SubjectSheet({
  className,
  scannedAt,
  subjects,
  suggested,
  autoConfirm,
  onPick,
  onCancel,
}: Props) {
  const auto = autoConfirm && suggested !== undefined;
  const [left, setLeft] = useState(AUTO_CONFIRM_SECONDS);
  const pickRef = useRef(onPick);
  const done = useRef(false);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!auto || suggested === undefined || done.current) return;
    if (left <= 0) {
      done.current = true;
      pickRef.current(suggested);
      return;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [auto, suggested, left]);

  const choose = (subject: string) => {
    if (done.current) return;
    done.current = true;
    onPick(subject);
  };

  const ordered = suggested ? [suggested, ...subjects.filter((s) => s !== suggested)] : subjects;
  const time = new Date(scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Choose subject for ${className}`}>
      <div className="sheet">
        <h2>{className}</h2>
        <p>
          Entered at {time}
          {auto ? ` · recording ${suggested} in ${left}s` : ' · what are you teaching?'}
        </p>
        <div className="subject-list">
          {ordered.map((s) => (
            <button
              key={s}
              type="button"
              className={`subject-btn${s === suggested ? ' primary' : ''}`}
              onClick={() => choose(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <button type="button" className="cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
