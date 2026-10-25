'use client';

import { useState } from 'react';
import { SUBJECT_OPTIONS } from '@/lib/config';
import type { Profile } from '@/lib/types';

type Props = {
  initial?: Profile | null;
  onSave: (profile: Profile) => void;
  /** Present only when editing an existing profile */
  onCancel?: () => void;
};

/** One-time setup (and later edits): teacher name + the subjects they teach. */
export default function ProfileForm({ initial, onSave, onCancel }: Props) {
  const [teacher, setTeacher] = useState(initial?.teacher ?? '');
  const [subjects, setSubjects] = useState<string[]>(initial?.subjects ?? []);
  const [custom, setCustom] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(initial?.autoConfirm ?? false);
  const [tried, setTried] = useState(false);

  // Built-in list plus any custom subjects the teacher added
  const options = [...SUBJECT_OPTIONS, ...subjects.filter((s) => !SUBJECT_OPTIONS.includes(s))];

  const toggle = (s: string) =>
    setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const addCustom = () => {
    const s = custom.trim();
    if (!s) return;
    setSubjects((cur) => (cur.includes(s) ? cur : [...cur, s]));
    setCustom('');
  };

  const invalid = !teacher.trim() || subjects.length === 0;

  return (
    <section className="card">
      <h2>{initial ? 'Your profile' : 'Welcome'}</h2>
      {!initial && (
        <p className="intro">
          Set this up once. After that, scanning a classroom QR only needs one tap.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (invalid) return;
          onSave({ teacher: teacher.trim(), subjects, autoConfirm });
        }}
      >
        <label className="field-label" htmlFor="teacher">
          Your name
        </label>
        <input
          id="teacher"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          placeholder="e.g. Cikgu Aisyah"
          autoComplete="name"
          maxLength={100}
        />

        <span className="field-label">Subjects you teach</span>
        <div className="chips">
          {options.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={subjects.includes(s)}
              onClick={() => toggle(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="inline-add">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Other subject"
            maxLength={100}
            aria-label="Add another subject"
          />
          <button type="button" className="btn secondary" onClick={addCustom}>
            Add
          </button>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={autoConfirm}
            onChange={(e) => setAutoConfirm(e.target.checked)}
          />
          <span>
            Auto-confirm: after a scan, record the subject I used last time in that class
            unless I tap another one.
          </span>
        </label>

        {tried && invalid && (
          <p className="hint">Enter your name and choose at least one subject.</p>
        )}

        <div className="form-actions">
          {onCancel && (
            <button type="button" className="btn secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn">
            {initial ? 'Save' : 'Start'}
          </button>
        </div>
      </form>
    </section>
  );
}
