/**
 * ASCT+B Draft Fixes
 *
 * A Google Apps Script for the draft ASCT+B table index sheet
 * (https://docs.google.com/spreadsheets/d/1ER90abGCF84MVdIFl51KEawfuuM5YhUbLCgt2i50nHg).
 * It makes simple, mechanical fixes to each draft table listed in the index, and flags problems that need a person.
 *
 * Install:
 *   1. Open the index sheet, then Extensions > Apps Script.
 *   2. Paste this file into Code.gs (or add it as a new file) and save.
 *   3. Reload the index sheet. An "ASCT+B Fixes" menu appears.
 *   4. The first run asks for permission to edit spreadsheets you have access to.
 *
 * Use:
 *   - "Preview fixes" lists every change it would make, without changing anything.
 *   - "Apply fixes" makes the changes.
 *   - Both write their results to a "Fix Report" tab in the index sheet (cleared on each run).
 *   - Run them on all tables, or select one or more rows of the index first and use the "selected tables" items.
 *
 * What gets fixed automatically:
 *   - Column headers: missing or extra slashes, e.g. 'BProtein10/LABEL' -> 'BProtein/10/LABEL',
 *     'BMetabolites/2LABEL' -> 'BMetabolites/2/LABEL', 'BProtein/11/' -> 'BProtein/11'.
 *   - ID cells (columns ending in /ID):
 *       - surrounding whitespace:                'CL:4030010 '     -> 'CL:4030010'
 *       - space after the colon:                 'HGNC: 2197'      -> 'HGNC:2197'
 *       - underscore instead of colon:           'UBERON_0002009'  -> 'UBERON:0002009'
 *       - lowercase prefix / missing colon:      'fma323217'       -> 'FMA:323217'
 *       - known prefix typos:                    'HGNCL2514', 'GNC:7569' -> 'HGNC:2514', 'HGNC:7569'
 *   - The "Version Number:" row is moved up to the version in the table's file name (e.g. heart_v1.8_DRAFT -> v1.8).
 *     It is never moved backwards; a row that's ahead of the file name is flagged instead.
 *
 * Only AS, CT and biomarker (B*) ID columns are checked; REF columns hold DOIs and are left alone.
 *
 * What gets flagged for a person (never changed):
 *   - More than one ID in a cell, e.g. 'HGNC:11782, HGNC:7955'
 *   - UBERON IDs in cell type (CT) columns, and CL IDs in anatomical structure (AS) columns
 *   - Other text in an ID cell, e.g. 'NOT FOUND NEEDS TO BE REQUESTED' or 'CL:0009103 l'
 *   - Missing or placeholder "Date:" and "Author Name(s):" values
 *
 * Only cells that hold plain values are changed; cells with formulas are skipped.
 */

// ============================================================================
// Configuration
// ============================================================================

const FIX_CONFIG = {
  /** Name of the tab the report is written to */
  reportSheetName: "Fix Report",
  /** Set the "Version Number:" row from the version in the file name */
  fixVersionRow: true,
  /** Stop starting new tables after this long, to stay under Apps Script's 6 minute limit */
  maxRuntimeMs: 5 * 60 * 1000,
};

/** Column types whose ID cells are checked. REF columns hold DOIs and links, so they are left alone. */
const ID_COLUMN_TYPES = /^(AS|CT|B[A-Z]+)$/;

/** ID prefixes we know, in their correct case */
const KNOWN_PREFIXES = ["UBERON", "CL", "PCL", "LMHA", "FMA", "ILX", "GO", "HGNC"];

/** Prefix typos seen in the tables. Only applied in biomarker (B*) columns, where HGNC IDs are expected. */
const BIOMARKER_PREFIX_TYPOS = { HGNCL: "HGNC", GNC: "HGNC" };

/** Header column types, in their usual spelling */
const HEADER_TYPES = ["AS", "CT", "BGene", "BProtein", "BLipid", "BMetabolites", "BProteoform", "FTU", "REF"];

/** Header suffixes after the column number */
const HEADER_SUFFIXES = ["LABEL", "ID", "NOTES", "ABBR", "DOI"];

// ============================================================================
// Menu
// ============================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("ASCT+B Fixes")
    .addItem("Preview fixes (all tables)", "previewAllTables")
    .addItem("Apply fixes (all tables)", "applyAllTables")
    .addSeparator()
    .addItem("Preview fixes (selected tables)", "previewSelectedTables")
    .addItem("Apply fixes (selected tables)", "applySelectedTables")
    .addToUi();
}

function previewAllTables() {
  runFixes_(readIndex_(), false);
}

function applyAllTables() {
  if (confirmApply_("all tables in the index")) {
    runFixes_(readIndex_(), true);
  }
}

function previewSelectedTables() {
  runFixes_(selectedIndexEntries_(), false);
}

function applySelectedTables() {
  const entries = selectedIndexEntries_();
  if (entries.length > 0 && confirmApply_(entries.map((e) => e.name).join(", "))) {
    runFixes_(entries, true);
  }
}

function confirmApply_(what) {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    "Apply ASCT+B fixes",
    `This will edit the draft tables for: ${what}.\n\nRun "Preview fixes" first if you haven't. Continue?`,
    ui.ButtonSet.OK_CANCEL
  );
  return answer === ui.Button.OK;
}

// ============================================================================
// Reading the index
// ============================================================================

/** The index tab is the one whose first row has a 'file_id' column */
function getIndexSheet_() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const sheet = sheets.find((s) =>
    s
      .getRange(1, 1, 1, s.getLastColumn() || 1)
      .getValues()[0]
      .includes("file_id")
  );
  if (!sheet) {
    throw new Error("Could not find the index tab (a tab whose first row has a 'file_id' column).");
  }
  return sheet;
}

/** Turn index rows into entries: { row, folder, filename, fileId, gid, name, version } */
function readIndex_() {
  const values = getIndexSheet_().getDataRange().getDisplayValues();
  const header = values[0].map((h) => h.trim());
  const col = (name) => header.indexOf(name);

  return values
    .slice(1)
    .map((row, i) => {
      const filename = (row[col("filename")] || "").trim();
      return {
        row: i + 2,
        folder: (row[col("folder")] || "").trim(),
        filename,
        fileId: (row[col("file_id")] || "").trim(),
        gid: (row[col("gid")] || "0").trim() || "0",
        name: filename.split("_v")[0],
        version: (filename.match(/_(v[\d.]+)_DRAFT/i) || [])[1],
      };
    })
    .filter((entry) => entry.filename && entry.fileId);
}

/** Index entries for the rows the user has selected on the index tab */
function selectedIndexEntries_() {
  const indexSheet = getIndexSheet_();
  const active = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (active.getSheetId() !== indexSheet.getSheetId()) {
    SpreadsheetApp.getUi().alert(`Select one or more table rows on the "${indexSheet.getName()}" tab first.`);
    return [];
  }

  const selectedRows = new Set();
  active
    .getActiveRangeList()
    .getRanges()
    .forEach((range) => {
      for (let r = range.getRow(); r < range.getRow() + range.getNumRows(); r++) {
        selectedRows.add(r);
      }
    });

  const entries = readIndex_().filter((entry) => selectedRows.has(entry.row));
  if (entries.length === 0) {
    SpreadsheetApp.getUi().alert("The selection does not include any table rows.");
  }
  return entries;
}

// ============================================================================
// Running the fixes
// ============================================================================

/**
 * Preview or apply fixes for the given index entries and write the report.
 *
 * @param {object[]} entries - From readIndex_()
 * @param {boolean} apply - false to preview only
 */
function runFixes_(entries, apply) {
  if (entries.length === 0) {
    return;
  }

  const started = Date.now();
  const report = [];
  const skipped = [];

  for (const entry of entries) {
    if (Date.now() - started > FIX_CONFIG.maxRuntimeMs) {
      skipped.push(entry.name);
      continue;
    }

    SpreadsheetApp.getActiveSpreadsheet().toast(`Checking ${entry.name}...`, "ASCT+B Fixes", 5);
    try {
      report.push(...fixTable_(entry, apply));
    } catch (error) {
      report.push(reportRow_(entry, "", "", "error", String(error.message || error), "", "error"));
    }
  }

  writeReport_(report, apply, skipped);
}

/** Open one draft table, work out its changes, and (if apply is true) write them */
function fixTable_(entry, apply) {
  const spreadsheet = SpreadsheetApp.openById(entry.fileId);
  const sheet = spreadsheet.getSheets().find((s) => String(s.getSheetId()) === entry.gid);
  if (!sheet) {
    throw new Error(`No tab with gid ${entry.gid} in this spreadsheet`);
  }

  const range = sheet.getDataRange();
  const values = range.getDisplayValues();
  const formulas = range.getFormulas();

  const { changes, flags } = findFixes(values, entry.version, FIX_CONFIG);
  const rows = [];

  for (const change of changes) {
    const { row, col } = change;
    if (formulas[row][col]) {
      rows.push(reportRow_(entry, change, "skipped: cell has a formula"));
      continue;
    }
    if (apply) {
      const cell = sheet.getRange(row + 1, col + 1);
      // Store as plain text so Sheets never reinterprets an ID as a number or date
      cell.setNumberFormat("@").setValue(change.newValue);
    }
    rows.push(reportRow_(entry, change, apply ? "applied" : "preview"));
  }

  for (const flag of flags) {
    rows.push(reportRow_(entry, flag, "needs review"));
  }

  if (rows.length === 0) {
    rows.push(reportRow_(entry, { row: -1, col: -1, rule: "no issues found" }, "ok"));
  }
  return rows;
}

// ============================================================================
// Finding fixes (pure functions: no Sheets calls, so they can be tested outside Apps Script)
// ============================================================================

/**
 * Work out the changes and flags for one table.
 *
 * @param {string[][]} values - The table's cell values (display values), row by row
 * @param {string | undefined} fileVersion - Version from the file name, e.g. 'v1.8'
 * @param {{ fixVersionRow: boolean }} config
 * @returns {{ changes: object[], flags: object[] }} each item is
 *   { row, col, header, rule, oldValue, newValue? } with 0-based row/col
 */
function findFixes(values, fileVersion, config) {
  const changes = [];
  const flags = [];

  const headerRow = values.findIndex((row) => String(row[0]).trim() === "AS/1");
  if (headerRow === -1) {
    flags.push({ row: 0, col: 0, header: "", rule: "no 'AS/1' header row found", oldValue: "" });
    return { changes, flags };
  }

  // --- Metadata rows above the table ---
  for (let r = 0; r < headerRow; r++) {
    const label = String(values[r][0]).trim().replace(/:$/, "");
    const value = String(values[r][1] || "").trim();

    if (label === "Version Number" && fileVersion && value !== fileVersion) {
      if (compareVersions(value, fileVersion) > 0) {
        // Never move a version backwards; the file name in the index is probably out of date
        flags.push({
          row: r,
          col: 1,
          header: label,
          rule: `version row is ahead of file name (${fileVersion})`,
          oldValue: value,
        });
      } else if (config.fixVersionRow) {
        changes.push({
          row: r,
          col: 1,
          header: label,
          rule: "version row behind file name",
          oldValue: value,
          newValue: fileVersion,
        });
      }
    }
    if (label === "Date" && !looksLikeDate(value)) {
      flags.push({ row: r, col: 1, header: label, rule: "missing or placeholder date", oldValue: value });
    }
    if (label === "Author Name(s)" && (!value || /delimited/i.test(value))) {
      flags.push({ row: r, col: 1, header: label, rule: "no authors", oldValue: value });
    }
  }

  // --- Column headers ---
  const headers = values[headerRow].map((h) => String(h).trim());
  headers.forEach((header, col) => {
    const fixed = fixHeader(header);
    if (fixed !== header) {
      changes.push({ row: headerRow, col, header, rule: "header typo", oldValue: header, newValue: fixed });
    }
  });

  // --- ID cells ---
  const fixedHeaders = headers.map(fixHeader);
  for (let r = headerRow + 1; r < values.length; r++) {
    fixedHeaders.forEach((header, col) => {
      const match = header.match(/^([A-Za-z]+)\/\d+\/ID$/);
      const raw = String(values[r][col] || "");
      if (!match || !ID_COLUMN_TYPES.test(match[1].toUpperCase()) || !raw.trim()) {
        return;
      }
      const result = fixIdCell(raw, match[1].toUpperCase());
      if (result.newValue !== undefined && result.newValue !== raw) {
        changes.push({ row: r, col, header, rule: result.rule, oldValue: raw, newValue: result.newValue });
      }
      if (result.flag) {
        flags.push({ row: r, col, header, rule: result.flag, oldValue: raw });
      }
    });
  }

  return { changes, flags };
}

/**
 * Compare versions like 'v1.9' and 'v1.10' numerically. Anything unparseable (e.g. 'v' or '') sorts first.
 * @returns {number} negative if a < b, 0 if equal, positive if a > b
 */
function compareVersions(a, b) {
  const parse = (v) => (/^v?\d+(\.\d+)*$/.test(v) ? v.replace(/^v/, "").split(".").map(Number) : [-1]);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** True for values like '12/15/2026', '2026-12-15' or 'December 15, 2026' */
function looksLikeDate(value) {
  return (
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value) ||
    /^\d{4}-\d{2}-\d{2}$/.test(value) ||
    /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(value)
  );
}

/**
 * Fix slash typos in a column header, keeping the author's capitalization.
 * Examples: 'BProtein10/LABEL' -> 'BProtein/10/LABEL', 'BMetabolites/2LABEL' -> 'BMetabolites/2/LABEL',
 * 'BProtein/11/' -> 'BProtein/11'. Headers that don't look like a typed column are returned unchanged.
 */
function fixHeader(header) {
  const types = HEADER_TYPES.join("|");
  const suffixes = HEADER_SUFFIXES.join("|");
  const pattern = new RegExp(`^(${types})\\s*/?\\s*(\\d+)\\s*(?:/?\\s*(${suffixes}))?\\s*/?$`, "i");
  const match = header.match(pattern);
  if (!match) {
    return header;
  }
  const [, type, number, suffix] = match;
  return suffix ? `${type}/${number}/${suffix}` : `${type}/${number}`;
}

/**
 * Fix or flag one ID cell.
 *
 * @param {string} raw - Cell value
 * @param {string} columnType - 'AS', 'CT', 'BGENE', 'BPROTEIN', ...
 * @returns {{ newValue?: string, rule?: string, flag?: string }}
 */
function fixIdCell(raw, columnType) {
  const value = raw.replace(/ /g, " ").trim();

  // Several IDs in one cell can't be fixed mechanically
  if (/[,;/]|\s(and|or)\s/i.test(value) && (value.match(/[A-Za-z]+[:_]\s*\d+/g) || []).length > 1) {
    return { flag: "more than one ID in a cell" };
  }

  // PREFIX[:_ ]digits, in any case, with optional spaces
  const match = value.match(/^([A-Za-z]+)\s*[:_]?\s*(\d+)$/);
  if (!match) {
    return value === raw ? { flag: unexpectedIdFlag(value, columnType) } : { newValue: value, rule: "whitespace" };
  }

  let prefix = match[1].toUpperCase();
  const digits = match[2];
  if (columnType.startsWith("B") && BIOMARKER_PREFIX_TYPOS[prefix]) {
    prefix = BIOMARKER_PREFIX_TYPOS[prefix];
  }
  if (!KNOWN_PREFIXES.includes(prefix)) {
    return value === raw ? { flag: unexpectedIdFlag(value, columnType) } : { newValue: value, rule: "whitespace" };
  }

  const fixed = `${prefix}:${digits}`;
  const result = fixed === raw ? {} : { newValue: fixed, rule: describeIdFix(raw, fixed) };

  // Right format, wrong kind of ID for the column
  if (columnType === "CT" && prefix === "UBERON") {
    result.flag = "UBERON (anatomy) ID in a cell type column";
  } else if (columnType === "AS" && prefix === "CL") {
    result.flag = "CL (cell type) ID in an anatomical structure column";
  }
  return result;
}

/** Flag text for an ID that isn't in a recognized format, or undefined if it's fine as-is */
function unexpectedIdFlag(value, columnType) {
  // Other well-formed CURIEs and identifiers (e.g. LOC105379168, UniProt P55017) are left alone
  if (
    /^[A-Za-z][A-Za-z0-9.-]*:[A-Za-z0-9_.-]+$/.test(value) ||
    /^LOC\d+$/.test(value) ||
    /^[A-Z][0-9][A-Z0-9]{3}[0-9]$/.test(value)
  ) {
    return undefined;
  }
  return `unexpected ${columnType} ID value`;
}

/** Short description of what changed in an ID */
function describeIdFix(raw, fixed) {
  const trimmed = raw.trim();
  if (trimmed !== raw && trimmed === fixed) return "whitespace";
  if (/\s/.test(trimmed)) return "space inside ID";
  if (trimmed.includes("_")) return "underscore instead of colon";
  if (!trimmed.includes(":")) return "missing colon";
  if (trimmed.split(":")[0] !== fixed.split(":")[0]) return "prefix typo or case";
  return "ID format";
}

// ============================================================================
// Report
// ============================================================================

/** One report row: [table, cell, column, rule, old value, new value, status, link] */
function reportRow_(entry, item, status) {
  const hasCell = item.row >= 0 && item.col >= 0;
  const a1 = hasCell ? columnLetter_(item.col) + (item.row + 1) : "";
  const link =
    `https://docs.google.com/spreadsheets/d/${entry.fileId}/edit#gid=${entry.gid}` + (a1 ? `&range=${a1}` : "");
  return [entry.name, a1, item.header || "", item.rule || "", item.oldValue ?? "", item.newValue ?? "", status, link];
}

function columnLetter_(index) {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

function writeReport_(rows, applied, skipped) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(FIX_CONFIG.reportSheetName) || spreadsheet.insertSheet(FIX_CONFIG.reportSheetName);
  sheet.clear();

  const header = ["Table", "Cell", "Column", "Issue", "Old value", "New value", "Status", "Link"];
  const title =
    `${applied ? "Applied" : "Preview"} — ${new Date().toLocaleString()}` +
    (skipped.length ? ` — ran out of time, not checked: ${skipped.join(", ")}` : "");

  sheet.getRange(1, 1).setValue(title).setFontWeight("bold");
  sheet.getRange(2, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  if (rows.length > 0) {
    // Plain text so old/new values are shown exactly as they are in the tables
    sheet.getRange(3, 1, rows.length, header.length).setNumberFormat("@").setValues(rows);
  }
  sheet.setFrozenRows(2);
  sheet.autoResizeColumns(1, header.length - 1);

  const counts = {};
  rows.forEach((row) => (counts[row[6]] = (counts[row[6]] || 0) + 1));
  const summary = Object.entries(counts)
    .map(([status, n]) => `${n} ${status}`)
    .join(", ");
  spreadsheet.setActiveSheet(sheet);
  SpreadsheetApp.getUi().alert(`ASCT+B Fixes: ${summary || "nothing to report"}.\n\nSee the "${sheet.getName()}" tab.`);
}
