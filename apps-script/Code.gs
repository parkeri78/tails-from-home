/**
 * Tails From Home: booking backend (Google Apps Script)
 *
 * This code runs inside Google, attached to our Google Sheet.
 * - Customers tab: one row per customer (their profile)
 * - Bookings tab:  one row per booking request
 * It also emails the family every time a booking comes in.
 *
 * Privacy: the phone look-up only sends back the FIRST NAME and PETS.
 * Address, email and full name never leave the Sheet.
 */

// Who gets the "new booking" email. Blank = the Google account that owns this Sheet.
// Add more people with commas: 'mom@example.com, grace@example.com'
const NOTIFY_EMAILS = '';

const CUSTOMER_HEADERS = ['Phone', 'Name', 'Email', 'Address', 'Pets', 'First booked', 'Last updated'];
const BOOKING_HEADERS  = ['Received', 'New / Returning', 'Name', 'Phone', 'Email', 'Address', 'Pets',
                          'Services', 'Start', 'End', 'Meet & greet', 'Notes'];

/** Run this ONCE from the editor to create the two tabs. */
function setup() {
  sheet_('Customers', CUSTOMER_HEADERS);
  sheet_('Bookings', BOOKING_HEADERS);
}

/** Look-up: website asks "is this phone a customer?" */
function doGet(e) {
  const phone = cleanPhone_(e.parameter.phone);
  const found = phone.length === 10 ? findCustomer_(phone) : null;
  if (!found) return json_({ found: false });
  return json_({
    found: true,
    firstName: String(found.values[1]).trim().split(' ')[0],
    pets: parsePets_(found.values[4])
  });
}

/** Booking: website sends a filled-in form. */
function doPost(e) {
  const lock = LockService.getScriptLock();   // one booking at a time, so rows don't clash
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const phone = cleanPhone_(d.phone);
    if (phone.length !== 10) return json_({ ok: false, error: 'bad phone' });

    const customers = sheet_('Customers', CUSTOMER_HEADERS);
    const found = findCustomer_(phone);
    const old = found ? found.values : [];
    const now = new Date();

    // Keep old info when a returning customer leaves a box blank
    const name    = clean_(d.name)    || old[1] || '';
    const email   = clean_(d.email)   || old[2] || '';
    const address = clean_(d.address) || old[3] || '';
    const pets    = (d.pets || []).filter(p => p && p.name).map(p => ({
      name: clean_(p.name), breed: clean_(p.breed), size: clean_(p.size), age: clean_(p.age)
    }));

    const row = [phone, name, email, address, JSON.stringify(pets), found ? old[5] : now, now];
    if (found) customers.getRange(found.row, 1, 1, row.length).setValues([row]);
    else customers.appendRow(row);

    const petsText = pets.map(p => p.name + ' (' + [p.breed, p.size, p.age].filter(String).join(', ') + ')').join('; ');
    const services = (d.services || []).map(clean_).join(', ');
    sheet_('Bookings', BOOKING_HEADERS).appendRow([
      now, found ? 'Returning' : 'New', name, phone, email, address, petsText,
      services, clean_(d.start), clean_(d.end), clean_(d.meet), clean_(d.notes)
    ]);

    MailApp.sendEmail({
      to: NOTIFY_EMAILS || Session.getEffectiveUser().getEmail(),
      subject: '🐾 New booking request: ' + name + ' (' + (found ? 'returning' : 'NEW') + ')',
      body: [
        'Name: ' + name,
        'Phone: ' + phone,
        'Email: ' + email,
        'Address: ' + address,
        'Pets: ' + petsText,
        'Services: ' + services,
        'Dates: ' + clean_(d.start) + ' to ' + clean_(d.end),
        'Meet & greet: ' + clean_(d.meet),
        'Notes: ' + clean_(d.notes),
        '',
        'Open the Sheet: ' + SpreadsheetApp.getActive().getUrl()
      ].join('\n')
    });

    return json_({ ok: true, firstName: String(name).split(' ')[0] });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- helpers ----------

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    if (name === 'Customers') sh.getRange('A:A').setNumberFormat('@');  // keep phones as text
    if (name === 'Bookings') sh.getRange('D:D').setNumberFormat('@');
  }
  return sh;
}

function findCustomer_(phone) {
  const values = sheet_('Customers', CUSTOMER_HEADERS).getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (cleanPhone_(String(values[i][0])) === phone) return { row: i + 1, values: values[i] };
  }
  return null;
}

function parsePets_(text) {
  try { return JSON.parse(text) || []; } catch (e) { return []; }
}

function cleanPhone_(p) { return String(p || '').replace(/\D/g, '').slice(-10); }

// Trim text, cap length, and stop "formula injection" (text starting with = + - @)
function clean_(v) {
  let s = String(v == null ? '' : v).trim().slice(0, 1000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
