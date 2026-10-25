/**
 * Teacher class check-in -> Google Form  (backend for the Next.js app)
 *
 * Deploy as Web app:  Execute as: Me   |   Who has access: Anyone
 * The app sends each check-in here; the script submits it to the Google Form.
 */

// ====== CONFIG ======
const FORM_ID = 'PASTE_YOUR_FORM_ID_HERE';
const SECRET_TOKEN = 'change-this-to-a-long-random-string'; // must match SCRIPT_TOKEN in the app
const TIMEZONE = 'Asia/Kuala_Lumpur';
const COOLDOWN_SECONDS = 600; // same teacher + class + subject within 10 min = duplicate

// Must match the question titles in the Form EXACTLY (all "Short answer")
const FIELDS = {
  teacher: 'Teacher',
  className: 'Class',
  subject: 'Subject',
  date: 'Date',
  timeIn: 'Time In'
};
// ====================

function doGet() {
  return json_({ ok: true, message: 'Attendance backend is running.' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.token !== SECRET_TOKEN) return json_({ ok: false, message: 'Unauthorized' });

    const teacher = String(data.teacher || '').trim();
    const className = String(data.className || '').trim();
    const subject = String(data.subject || '').trim();
    if (!teacher || !className || !subject) {
      return json_({ ok: false, message: 'Missing teacher, class or subject' });
    }

    // Use the phone's scan time so check-ins queued offline keep the real time entered
    const when = data.scannedAt ? new Date(data.scannedAt) : new Date();
    const dateStr = Utilities.formatDate(when, TIMEZONE, 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(when, TIMEZONE, 'HH:mm:ss');
    const summary = teacher + ' - ' + className + ' (' + subject + ')';

    const cache = CacheService.getScriptCache();
    const key = ('in|' + teacher + '|' + className + '|' + subject).slice(0, 240);
    if (cache.get(key)) {
      return json_({ ok: true, duplicate: true, message: 'Already recorded: ' + summary });
    }

    const form = FormApp.openById(FORM_ID);
    const response = form.createResponse();
    const values = {};
    values[FIELDS.teacher] = teacher;
    values[FIELDS.className] = className;
    values[FIELDS.subject] = subject;
    values[FIELDS.date] = dateStr;
    values[FIELDS.timeIn] = timeStr;

    form.getItems().forEach(function (item) {
      if (item.getType() !== FormApp.ItemType.TEXT) return;
      const title = item.getTitle();
      if (values.hasOwnProperty(title) && values[title] !== '') {
        response.withItemResponse(item.asTextItem().createResponse(values[title]));
      }
    });
    response.submit();
    cache.put(key, '1', COOLDOWN_SECONDS);

    return json_({ ok: true, message: 'Recorded ' + timeStr + ': ' + summary });
  } catch (err) {
    return json_({ ok: false, message: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
