# Class Check-in (Next.js + TypeScript)

Installable web app (PWA) that records **when a teacher enters a class and what they teach**.
Only teachers scan. Students do nothing.

Each classroom has one printed QR code. The teacher scans it, taps a subject, and a row
appears in your Google Form. No database.

```
Phone (PWA) --> /api/checkin (Next.js, holds the secret) --> Google Apps Script --> Google Form
```

## How a teacher uses it
1. **First time only:** enter your name and tick the subjects you teach. Saved on the phone.
2. **Every class:** open the app, scan the classroom QR.
   - You teach 1 subject: recorded instantly, nothing to tap.
   - You teach several: tap the subject (the one you used last time in that class is on top).
   - Optional "auto-confirm" (in your profile): the last-used subject is recorded after 3 seconds unless you tap another.
3. The **time entered is the moment of the scan**, even if you are offline and it syncs later.

## Google Form
Create a Form with five **Short answer** questions titled exactly:
`Teacher`, `Class`, `Subject`, `Date`, `Time In`.
If you already made a Form for the earlier student version, delete those questions
(or make a new Form). Link responses to a Sheet (Responses tab -> Link to Sheets).
Form ID is in the URL: `https://docs.google.com/forms/d/<FORM_ID>/edit`

## Apps Script backend
1. script.google.com -> open your project, replace `Code.gs` with `apps-script/Code.gs`.
2. Set `FORM_ID` and `SECRET_TOKEN` (a long random string).
3. Deploy -> New deployment -> **Web app**: Execute as **Me**, access **Anyone**.
   If you already deployed the old version: Deploy -> Manage deployments -> edit -> **New version**.
4. Copy the **/exec** URL.

## Run locally
```bash
npm install
cp .env.example .env.local     # fill in APPS_SCRIPT_URL and SCRIPT_TOKEN
npm run dev
```
Camera needs HTTPS or `localhost`. The service worker only registers in production
(`npm run build && npm start`).

## Deploy to Vercel
1. Push to GitHub, import the repo in Vercel (defaults are fine).
2. Add environment variables **before** deploying:
   - `APPS_SCRIPT_URL` = the /exec URL
   - `SCRIPT_TOKEN` = same value as `SECRET_TOKEN` in Code.gs
3. Open the `.vercel.app` link on each teacher's phone, then
   Android (Chrome): menu -> Install app, or iPhone (Safari): Share -> Add to Home Screen.

## Classroom QR codes
Open `/qr` on the deployed site, enter one class or room per line (e.g. `5 Bestari`,
`Makmal Sains 1`), Generate, Print, stick on the door. Each code contains `CLASS|<name>`.
Any other QR code is rejected as "Not a classroom QR code".

## Customising
- **Subject list:** edit `SUBJECT_OPTIONS` in `lib/config.ts`. Teachers can also add their own.
- **Countdown length:** `AUTO_CONFIRM_SECONDS` in `lib/config.ts`.
- **Duplicate window:** `COOLDOWN_SECONDS` in `Code.gs` (same teacher + class + subject within 10 min is ignored).
  Choosing a different subject for the same class is allowed, so a wrong pick can be corrected.
- After editing `public/sw.js` or cached assets, bump `CACHE` so phones update.

## Limits worth knowing
- **Teacher identity is the name typed on the phone, not a verified login.** Someone could
  type another teacher's name. If you need proof, the next step is a per-teacher PIN or Google sign-in.
- A teacher scanning from outside the room would still be recorded. A QR on the door
  only proves intent, not location.
- **Offline:** check-ins are saved on the phone and sent when online (badge shows the count).
- `/qr` is public but only draws codes in the browser.
