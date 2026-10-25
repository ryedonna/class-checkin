import type { CheckIn } from '@/lib/types';

function mark(c: CheckIn): string {
  if (c.failed) return '✗';
  return c.sent ? '✓' : '…';
}

export default function RecentList({ items, waiting }: { items: CheckIn[]; waiting: number }) {
  return (
    <div className="card">
      <div className="row">
        <strong>Recent check-ins</strong>
        {waiting > 0 && <span className="pill">{waiting} waiting to sync</span>}
      </div>
      {items.length === 0 ? (
        <small>Nothing recorded yet.</small>
      ) : (
        <ul>
          {items.slice(0, 8).map((c) => (
            <li key={c.key}>
              <span>
                {c.className} · {c.subject}
              </span>
              <span className="time">
                {new Date(c.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                {mark(c)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
