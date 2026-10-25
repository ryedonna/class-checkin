'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { scanFeedback } from '@/lib/feedback';
import { readStored, writeStored } from '@/lib/storage';
import type { ApiResult, CheckIn, Profile, Status } from '@/lib/types';

const KEYS = {
  profile: 'att2.profile',
  queue: 'att2.queue',
  recent: 'att2.recent',
  lastSubject: 'att2.lastSubject',
} as const;

export const IDLE_STATUS: Status = {
  text: "Scan the QR code on the classroom door",
  tone: 'idle',
};

/**
 * Teacher profile, check-in queue (offline-safe), remembered subject per class, and the sync loop.
 * Refs hold the source of truth so the sync loop never reads stale state.
 */
export function useCheckIn() {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [recent, setRecent] = useState<CheckIn[]>([]);
  const [status, setStatus] = useState<Status>(IDLE_STATUS);

  const profileRef = useRef<Profile | null>(null);
  const queueRef = useRef<CheckIn[]>([]);
  const recentRef = useRef<CheckIn[]>([]);
  const lastSubjectRef = useRef<Record<string, string>>({});
  const busy = useRef(false);

  const commit = useCallback((queue: CheckIn[], recentItems: CheckIn[]) => {
    queueRef.current = queue;
    recentRef.current = recentItems;
    setWaiting(queue.length);
    setRecent(recentItems);
    writeStored(KEYS.queue, queue);
    writeStored(KEYS.recent, recentItems);
  }, []);

  const flush = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0];

        let res: Response;
        try {
          res = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teacher: item.teacher,
              className: item.className,
              subject: item.subject,
              scannedAt: new Date(item.t).toISOString(),
            }),
          });
        } catch {
          setStatus({
            text: `Offline. ${queueRef.current.length} check-in(s) will sync later`,
            tone: 'warn',
          });
          return;
        }

        // Server/backend trouble: keep the check-in and retry later
        if (res.status >= 500) {
          setStatus({ text: 'Server unavailable. Will retry.', tone: 'warn' });
          return;
        }

        const out = (await res.json().catch(() => null)) as ApiResult | null;
        const rest = queueRef.current.slice(1);
        const mark = (patch: Partial<CheckIn>) =>
          recentRef.current.map((c) => (c.key === item.key ? { ...c, ...patch } : c));

        if (out?.ok) {
          commit(rest, mark({ sent: true }));
          setStatus({ text: out.message, tone: out.duplicate ? 'warn' : 'ok' });
        } else {
          // Rejected (bad input etc.): retrying would not help, so drop it and say so
          commit(rest, mark({ failed: true }));
          setStatus({
            text: `Not saved: ${out?.message ?? 'unexpected response'}`,
            tone: 'bad',
          });
        }
      }
    } finally {
      busy.current = false;
    }
  }, [commit]);

  // Load saved state once on the client
  useEffect(() => {
    const savedProfile = readStored<Profile | null>(KEYS.profile, null);
    const savedQueue = readStored<CheckIn[]>(KEYS.queue, []);
    const savedRecent = readStored<CheckIn[]>(KEYS.recent, []);
    profileRef.current = savedProfile;
    queueRef.current = savedQueue;
    recentRef.current = savedRecent;
    lastSubjectRef.current = readStored<Record<string, string>>(KEYS.lastSubject, {});
    setProfileState(savedProfile);
    setWaiting(savedQueue.length);
    setRecent(savedRecent);
    setReady(true);
  }, []);

  // Keep trying to sync: on load, on reconnect, when the app returns to the foreground, and every 15 s
  useEffect(() => {
    if (!ready) return;
    void flush();
    const onOnline = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void flush();
    };
    const timer = setInterval(() => void flush(), 15000);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready, flush]);

  const saveProfile = useCallback((next: Profile) => {
    const clean: Profile = {
      teacher: next.teacher.trim(),
      subjects: Array.from(new Set(next.subjects.map((s) => s.trim()).filter(Boolean))),
      autoConfirm: next.autoConfirm,
    };
    if (!clean.teacher || clean.subjects.length === 0) return;
    profileRef.current = clean;
    setProfileState(clean);
    writeStored(KEYS.profile, clean);
  }, []);

  /** The subject this teacher used last time in this class, if they still teach it. */
  const suggestSubject = useCallback((className: string): string | undefined => {
    const last = lastSubjectRef.current[className];
    return last && profileRef.current?.subjects.includes(last) ? last : undefined;
  }, []);

  /** Record entering a class. `t` is the moment the QR was scanned. */
  const checkIn = useCallback(
    (className: string, subject: string, t: number = Date.now()) => {
      const teacher = profileRef.current?.teacher;
      if (!teacher) return;

      scanFeedback();
      const item: CheckIn = {
        key: `${t}-${className}`,
        teacher,
        className,
        subject,
        t,
        sent: false,
      };
      commit([...queueRef.current, item], [item, ...recentRef.current].slice(0, 30));

      lastSubjectRef.current = { ...lastSubjectRef.current, [className]: subject };
      writeStored(KEYS.lastSubject, lastSubjectRef.current);

      setStatus({ text: `${className} · ${subject}`, tone: 'ok' });
      void flush();
    },
    [commit, flush]
  );

  return {
    ready,
    profile,
    saveProfile,
    waiting,
    recent,
    status,
    notify: setStatus,
    suggestSubject,
    checkIn,
  };
}
