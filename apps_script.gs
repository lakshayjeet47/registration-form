// Google Apps Script for registered players API.
// 1) Set SPREADSHEET_ID to your Google Sheet ID (string from the sheet URL)
// 2) Set SHEET_NAME to your response tab name, e.g. "Form Responses 1"
// 3) Deploy as Web App: Execute as "Me", Who has access "Anyone"
const SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';
const SHEET_NAME = 'Form Responses 1';

// Optional: keep doPost for custom direct submissions.
function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    var data = e && e.parameter ? e.parameter : {};
    sheet.appendRow([
      new Date(),
      data.playerName || '',
      data.teamName || '',
      data.gender || '',
      data.academy || '',
      data.from || '',
      data.mobile || ''
    ]);

    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return buildApiOutput({ ok: true, data: [] }, e);
    }

    var headers = data[0];
    var rows = data.slice(1);

    var nameIdx = findHeaderIndex(headers, ['player name', 'name', 'full name', 'participant name']);
    var genderIdx = findHeaderIndex(headers, ['gender', 'sex']);

    if (nameIdx === -1 || genderIdx === -1) {
      return buildApiOutput({
        ok: false,
        error: 'Could not find Player Name and Gender columns in row 1.'
      }, e);
    }

    var players = [];
    rows.forEach(function(row) {
      var name = String(row[nameIdx] || '').trim();
      var gender = normalizeGender(row[genderIdx]);

      if (name && (gender === 'male' || gender === 'female')) {
        players.push({
          'PLAYER NAME': name,
          'GENDER': gender
        });
      }
    });

    return buildApiOutput({ ok: true, data: players }, e);
  } catch (err) {
    return buildApiOutput({ ok: false, error: err.message }, e);
  }
}

function findHeaderIndex(headers, candidates) {
  var normalizedHeaders = headers.map(function(header) {
    return normalizeHeader(header);
  });

  for (var i = 0; i < candidates.length; i++) {
    var idx = normalizedHeaders.indexOf(normalizeHeader(candidates[i]));
    if (idx !== -1) return idx;
  }

  return -1;
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeGender(value) {
  var raw = String(value || '').toLowerCase().trim();
  if (raw === 'male' || raw === 'm' || raw === 'boy' || raw === 'boys') return 'male';
  if (raw === 'female' || raw === 'f' || raw === 'girl' || raw === 'girls') return 'female';
  return 'other';
}

function buildApiOutput(payload, e) {
  var text = JSON.stringify(payload);
  var callback = e && e.parameter ? e.parameter.callback : '';

  if (callback) {
    callback = callback.replace(/[^0-9A-Za-z_$.]/g, '');
    return ContentService
      .createTextOutput(callback + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
