import { NextResponse } from 'next/server';
import type { ApiResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  teacher?: unknown;
  className?: unknown;
  subject?: unknown;
  scannedAt?: unknown;
};

const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const reply = (body: ApiResult, status = 200) => NextResponse.json(body, { status });

/**
 * Forwards a teacher check-in to the Google Apps Script web app.
 * The shared secret lives only here (server env), never in the browser.
 */
export async function POST(req: Request) {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const token = process.env.SCRIPT_TOKEN;
  if (!scriptUrl || !token) {
    return reply({ ok: false, message: 'Server is not configured' }, 500);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return reply({ ok: false, message: 'Bad request' }, 400);
  }

  const teacher = str(body.teacher, 100);
  const className = str(body.className, 100);
  const subject = str(body.subject, 100);
  if (!teacher || !className || !subject) {
    return reply({ ok: false, message: 'Missing teacher, class or subject' }, 400);
  }

  const payload = {
    token,
    teacher,
    className,
    subject,
    scannedAt: str(body.scannedAt, 40),
  };

  try {
    const upstream = await fetch(scriptUrl, {
      method: 'POST',
      // text/plain keeps Apps Script happy (no CORS preflight / content-type parsing quirks)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      cache: 'no-store',
    });
    const data = (await upstream.json()) as ApiResult;
    return NextResponse.json(data);
  } catch {
    // Apps Script down, or returned a non-JSON page (e.g. wrong deployment access)
    return reply({ ok: false, message: 'Attendance backend unavailable' }, 502);
  }
}
