'use client';

import { useState } from 'react';
import CameraScanner from '@/components/CameraScanner';
import ProfileForm from '@/components/ProfileForm';
import RecentList from '@/components/RecentList';
import SubjectSheet from '@/components/SubjectSheet';
import { useCheckIn } from '@/hooks/useCheckIn';
import { parseClassQR } from '@/lib/qr';

type OpenSheet = { className: string; t: number; suggested?: string };

export default function HomePage() {
  const { ready, profile, saveProfile, waiting, recent, status, notify, suggestSubject, checkIn } =
    useCheckIn();
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);

  // Wait for saved data to load so the setup screen doesn't flash for returning teachers
  if (!ready) return null;

  const handleDetect = (raw: string) => {
    if (!profile || sheet || editing) return;

    const parsed = parseClassQR(raw);
    if (!parsed) {
      notify({ text: 'Not a classroom QR code', tone: 'bad' });
      return;
    }

    const t = Date.now(); // the moment they entered the class

    // Teaches one subject: nothing to choose, record straight away
    if (profile.subjects.length === 1) {
      checkIn(parsed.className, profile.subjects[0], t);
      return;
    }
    setSheet({ className: parsed.className, t, suggested: suggestSubject(parsed.className) });
  };

  return (
    <>
      <header className="app-header">
        <h1>Class Check-in</h1>
        {profile && (
          <button type="button" onClick={() => setEditing(true)}>
            {profile.teacher} ✎
          </button>
        )}
      </header>

      <main>
        {!profile ? (
          <ProfileForm onSave={saveProfile} />
        ) : editing ? (
          <ProfileForm
            initial={profile}
            onSave={(p) => {
              saveProfile(p);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : cameraBlocked ? (
          <div className="card">
            <strong>Camera not available</strong>
            <p>Allow camera access for this site in your browser settings, then reload.</p>
            <button className="btn" type="button" onClick={() => location.reload()}>
              Reload
            </button>
          </div>
        ) : (
          <>
            <CameraScanner onDetect={handleDetect} onError={() => setCameraBlocked(true)} />
            <div className={`banner ${status.tone}`} role="status" aria-live="polite">
              {status.text}
            </div>
            <RecentList items={recent} waiting={waiting} />
          </>
        )}
      </main>

      {profile && sheet && (
        <SubjectSheet
          className={sheet.className}
          scannedAt={sheet.t}
          subjects={profile.subjects}
          suggested={sheet.suggested}
          autoConfirm={profile.autoConfirm}
          onPick={(subject) => {
            checkIn(sheet.className, subject, sheet.t);
            setSheet(null);
          }}
          onCancel={() => setSheet(null)}
        />
      )}
    </>
  );
}
