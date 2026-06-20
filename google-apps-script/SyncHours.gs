/**
 * SimpleRoster → Stunden-Sync für die Auswertungs-Tabelle
 * ---------------------------------------------------------
 * Holt die echten Tages-Gesamtstunden aus SimpleRoster (/api/daily-hours)
 * und trägt sie in die Spalte "Gesamtstunden" des passenden Monats-Tabs ein.
 *
 * Einrichtung:
 *  1. In der Tabelle:  Erweiterungen → Apps Script  → diesen Code einfügen.
 *  2. Unten CONFIG ausfüllen (API_URL + TOKEN).
 *  3. Einmal `syncYesterday` ausführen (Berechtigungen erlauben).
 *  4. Auslöser (Uhr-Symbol) → täglich, z. B. 06:00–07:00 → Funktion `syncYesterday`.
 */

var CONFIG = {
  // Basis-URL deiner SimpleRoster-Installation (ohne Slash am Ende):
  API_URL: 'https://simple-roster.vercel.app',
  // Muss SHEET_SYNC_TOKEN (oder DASHBOARD_API_KEY) in SimpleRoster entsprechen:
  TOKEN: 'HIER-TOKEN-EINSETZEN',

  TZ: 'Europe/Berlin',
  // Tab-Name. "All Data" ist immer das erste Blatt – dorthin schreibt auch das
  // Lightspeed-Umsatz-Script (getSheets()[0]), beide treffen also dieselbe Zeile.
  SHEET_NAME: 'All Data',
  // Bereits gefüllte Zellen überschreiben?  false = nur leere Zellen füllen.
  OVERWRITE: false,
  // HARTE Untergrenze: Tage VOR diesem Datum werden NIE geschrieben – egal was
  // die API liefert oder wie OVERWRITE steht. Schützt die historischen Daten aus
  // der Zeit vor SimpleRoster. SimpleRoster zählt erst ab hier verlässlich.
  START_DATE: '2026-06-20',
};

/** Täglich per Auslöser: trägt die Stunden von GESTERN ein. */
function syncYesterday() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  syncDate(Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd'));
}

/** Manuell nachholen: Stunden eines bestimmten Tages eintragen ("yyyy-MM-dd"). */
function syncSpecificDate() {
  syncDate('2026-06-18'); // <- bei Bedarf anpassen und ausführen
}

/** Ganzen Zeitraum nachtragen (z. B. ['2026-06-01','2026-06-18']). */
function syncRange() {
  var from = '2026-06-01', to = '2026-06-18';
  var data = fetchHours(from, to);
  Object.keys(data.days || {}).forEach(function (day) {
    writeHours(day, data.days[day].hours);
  });
}

/**
 * Wird vom Lightspeed-Umsatz-Script am Ende aufgerufen (Verkettung).
 * Bekommt die gerade importierten Tage als deutsche Datumsstrings ("DD.MM.YYYY")
 * und trägt für jeden die Stunden nach – direkt nachdem die Umsatz-Zeile erzeugt
 * wurde. START_DATE + Freigabe-Gate greifen wie immer.
 */
function syncImportedDates(germanDates) {
  (germanDates || []).forEach(function (g) {
    var m = String(g).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!m) return;
    var ymd = m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
    try { syncDate(ymd); } catch (e) { Logger.log('Stunden-Sync ' + ymd + ': ' + e); }
  });
}

function syncDate(dateStr) {
  var data = fetchHours(dateStr, dateStr);
  // Nur freigegebene Tage kommen zurück. Fehlt der Tag → noch nicht freigegeben → nichts schreiben.
  if (!data.days || !data.days[dateStr]) {
    Logger.log('⏭ ' + dateStr + ' ist noch nicht freigegeben – übersprungen.');
    return;
  }
  writeHours(dateStr, data.days[dateStr].hours);
}

function fetchHours(from, to) {
  var url = CONFIG.API_URL + '/api/daily-hours?from=' + from + '&to=' + to +
            '&key=' + encodeURIComponent(CONFIG.TOKEN);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('API-Fehler ' + resp.getResponseCode() + ': ' + resp.getContentText());
  }
  return JSON.parse(resp.getContentText());
}

/** Schreibt `hours` in die Gesamtstunden-Zelle der Zeile mit `dateStr`. */
function writeHours(dateStr, hours) {
  // Schutzschild: niemals historische Tage (vor START_DATE) anfassen.
  if (CONFIG.START_DATE && dateStr < CONFIG.START_DATE) {
    Logger.log('🛡 ' + dateStr + ' liegt vor START_DATE (' + CONFIG.START_DATE + ') – übersprungen.');
    return false;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = CONFIG.SHEET_NAME
    ? [ss.getSheetByName(CONFIG.SHEET_NAME)].filter(Boolean)
    : ss.getSheets().filter(function (s) { return s.getName().toLowerCase().indexOf('bolle') === -1; });

  for (var i = 0; i < sheets.length; i++) {
    if (writeInSheet(sheets[i], dateStr, hours)) {
      Logger.log('✓ ' + dateStr + ' → ' + hours + ' h in Tab "' + sheets[i].getName() + '"');
      return true;
    }
  }
  Logger.log('⚠ Zeile für ' + dateStr + ' nicht gefunden.');
  return false;
}

function writeInSheet(sheet, dateStr, hours) {
  var values = sheet.getDataRange().getValues();
  // Kopfzeile mit "Datum" und "Gesamtstunden" suchen
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var datumCol = -1, stdCol = -1;
    for (var c = 0; c < row.length; c++) {
      var head = String(row[c]).trim().toLowerCase();
      if (head === 'datum') datumCol = c;
      if (head === 'gesamtstunden') stdCol = c;
    }
    if (datumCol === -1 || stdCol === -1) continue;

    // Datenzeilen unter dieser Kopfzeile durchsuchen
    for (var dr = r + 1; dr < values.length; dr++) {
      if (cellToYMD(values[dr][datumCol]) === dateStr) {
        var existing = values[dr][stdCol];
        if (!CONFIG.OVERWRITE && existing !== '' && existing !== null) return true; // schon gefüllt
        sheet.getRange(dr + 1, stdCol + 1).setValue(hours);
        return true;
      }
    }
  }
  return false;
}

/** Datums-Zelle (Date oder Text) → "yyyy-MM-dd". */
function cellToYMD(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd');
  if (typeof v === 'string') {
    var s = v.trim();
    var m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);          // 16.06.2026
    if (m) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
    m = s.match(/(\d{1,2})\.\s*(\d{1,2})\s+(\d{4})/);          // Mo., 15. 06 2026
    if (m) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
  }
  return null;
}

function pad(n) { return ('0' + n).slice(-2); }
