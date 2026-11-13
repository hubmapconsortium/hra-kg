/**
 * Pull the latest draft ASCT+B tables from Google Sheets into `digital-objects/asct-b/<name>/draft/raw`.
 *
 * Usage:
 *   node src/pull-asctb-drafts.js [--dry-run] [--force] [--json report.json] [name ...]
 *
 * Options:
 *   --dry-run      Report what would happen, but don't write any files
 *   --force        Rebuild an existing draft's metadata.yaml (normally only its CSV is replaced)
 *   --json <file>  Also write the full report as JSON
 *   name ...       Only pull these tables (e.g. `kidney heart`); default is all of them
 *
 * How it works:
 *   1. Download the draft index sheet, which lists one Google Sheet per organ (folder, filename, file_id, gid).
 *   2. Download each organ's sheet as CSV.
 *   3. Compare it against the latest released version (`digital-objects/asct-b/<name>/vX.Y`).
 *   4. Write the CSV plus a metadata.yaml into the organ's `draft/raw` folder:
 *        - organs with a release: copy the release's metadata.yaml, refresh creators, reviewers and
 *          creation_date from the CSV header, and drop the release-specific DOI fields
 *        - new organs: generate a stub metadata.yaml (the description is left as a TODO)
 *   5. Print a summary table (and optionally a JSON report).
 *
 * The yaml and papaparse libraries are borrowed from ../hra-do-processor (override with HRA_DO_PROCESSOR_HOME).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// ============================================================================
// Configuration
// ============================================================================

/** Google Sheet that lists every draft ASCT+B table */
const INDEX_SHEET_ID = '1ER90abGCF84MVdIFl51KEawfuuM5YhUbLCgt2i50nHg';
const INDEX_GID = '0';

/** Where ASCT+B digital objects live, relative to the repo root */
const ASCTB_HOME = './digital-objects/asct-b';

/** New organs copy shared metadata (project leads, license, funders, ...) from this organ's latest release */
const REFERENCE_ORGAN = 'kidney';

/** Fields that belong to a specific release, so they are removed from drafts */
const DROPPED_DRAFT_FIELDS = ['hubmapId', 'doi', 'citation'];

/** How many sheets to download at once */
const CONCURRENCY = 6;

/** Download retries for temporary failures (network errors, timeouts, HTTP 429 and 5xx) */
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 2000; // Doubles after each failed attempt: 2s, 4s, 8s
const DOWNLOAD_TIMEOUT_MS = 60000;

const USAGE = 'Usage: node src/pull-asctb-drafts.js [--dry-run] [--force] [--json report.json] [name ...]';

// ============================================================================
// Dependencies (borrowed from hra-do-processor)
// ============================================================================

const PROCESSOR_HOME = path.resolve(process.env.HRA_DO_PROCESSOR_HOME || '../hra-do-processor');

if (!fs.existsSync(path.join(PROCESSOR_HOME, 'node_modules', 'yaml'))) {
  console.error(
    `Could not find hra-do-processor dependencies in ${PROCESSOR_HOME}/node_modules.\n` +
      'Set HRA_DO_PROCESSOR_HOME or run `npm ci` in ../hra-do-processor.'
  );
  process.exit(2);
}

const require = createRequire(path.join(PROCESSOR_HOME, 'package.json'));
const YAML = require('yaml');
const Papa = require('papaparse');

// ============================================================================
// Command line
// ============================================================================

/**
 * Parse command line arguments.
 *
 * @param {string[]} argv - Arguments after `node script.js`
 * @returns {{ dryRun: boolean, force: boolean, json?: string, names: string[] }}
 */
function parseArgs(argv) {
  const opts = { dryRun: false, force: false, json: undefined, names: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--force') {
      opts.force = true;
    } else if (arg === '--json') {
      opts.json = argv[++i];
    } else if (arg === '-h' || arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}\n${USAGE}`);
      process.exit(2);
    } else {
      opts.names.push(arg);
    }
  }

  return opts;
}

// ============================================================================
// Google Sheets
// ============================================================================

/** URL that downloads one tab (gid) of a Google Sheet as CSV */
const sheetCsvUrl = (id, gid) => `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

/** URL for a person to open the sheet in a browser */
const sheetEditUrl = (id, gid) => `https://docs.google.com/spreadsheets/d/${id}/edit#gid=${gid}`;

/** HTTP statuses worth retrying: rate limiting and server-side errors */
const isRetryableStatus = (status) => status === 429 || status >= 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Download a URL as text, once.
 * Google returns an HTML sign-in page (not an error) for sheets that aren't shared publicly, so treat HTML as a
 * failure. Errors that are worth retrying are marked with `error.retryable = true`.
 */
async function fetchTextOnce(url) {
  let res;
  try {
    res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  } catch (cause) {
    // Network failure or timeout
    const error = new Error(`${cause.name === 'TimeoutError' ? 'Timed out' : cause.message} fetching ${url}`);
    error.retryable = true;
    throw error;
  }

  if (!res.ok) {
    const error = new Error(`HTTP ${res.status} fetching ${url}`);
    error.retryable = isRetryableStatus(res.status);
    throw error;
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (contentType.includes('text/html') || /^\s*<(!doctype|html)/i.test(text)) {
    throw new Error(`Got HTML instead of CSV (is the sheet shared publicly?) from ${url}`);
  }

  return text;
}

/**
 * Download a URL as text, retrying temporary failures with exponential backoff.
 * Permanent failures (e.g. HTTP 401/404 or an HTML sign-in page) fail immediately.
 */
async function fetchText(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchTextOnce(url);
    } catch (error) {
      if (!error.retryable || attempt >= MAX_ATTEMPTS) {
        if (attempt > 1) {
          error.message += ` (after ${attempt} attempts)`;
        }
        throw error;
      }
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.error(`Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${error.message}`);
      await sleep(delay);
    }
  }
}

/**
 * Download the draft index and turn each row into an entry describing one draft table.
 *
 * Example row: `Brain,allen-brain_v1.10_DRAFT,<file_id>,<gid>` becomes
 * `{ name: 'allen-brain', sheetVersion: 'v1.10', ... }`.
 */
async function fetchDraftIndex() {
  const csv = await fetchText(sheetCsvUrl(INDEX_SHEET_ID, INDEX_GID));
  const rows = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

  return rows
    .filter((row) => row.filename && row.file_id)
    .map((row) => {
      const filename = row.filename.trim();
      return {
        folder: row.folder.trim(),
        filename,
        file_id: row.file_id.trim(),
        gid: (row.gid || '0').trim(),
        // The digital object name is the filename prefix, e.g. 'kidney_v1.9_DRAFT' -> 'kidney'
        name: filename.split('_v')[0],
        // The version the authors intend to release next, e.g. 'v1.9'
        sheetVersion: (filename.match(/_(v[\d.]+)_DRAFT/i) || [])[1],
      };
    });
}

// ============================================================================
// ASCT+B CSV parsing
// ============================================================================
//
// An ASCT+B CSV has a metadata block on top, then the table itself starting at the `AS/1,...` header row:
//
//   "Anatomical Structures, Cell Types and Biomarkers Table for Kidney",,,
//   Author Name(s):,Sanjay Jain; M. Todd Valerius; ...
//   Author ORCID(s):,0000-0003-2804-127X; 0000-0001-8143-9231; ...
//   Reviewer(s):,...
//   Reviewer ORCID(s):,...
//   Date:,12/15/2026
//   Version Number:,v1.8
//   AS/1,AS/1/LABEL,AS/1/ID,...      <- table starts here
//   kidney,kidney,UBERON:0002113,...

/** True if a line has no content other than commas and whitespace */
const isBlankLine = (line) => /^[,\s]*$/.test(line);

/**
 * Return the table part of an ASCT+B CSV (from the `AS/1` header row down), with line endings normalized and
 * trailing blank lines removed so two versions can be compared directly.
 * Returns undefined if the CSV has no `AS/1` row (i.e. it isn't an ASCT+B table).
 */
function dataSection(csvText) {
  const lines = csvText.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.startsWith('AS/1,'));
  if (start === -1) {
    return undefined;
  }

  const tableLines = lines.slice(start);
  while (tableLines.length > 0 && isBlankLine(tableLines[tableLines.length - 1])) {
    tableLines.pop();
  }
  return tableLines.join('\n');
}

/** Number of non-blank rows in the table, not counting the `AS/1` header row */
function countDataRows(csvText) {
  const section = dataSection(csvText);
  if (!section) {
    return 0;
  }
  return section.split('\n').filter((line) => !isBlankLine(line)).length - 1;
}

/**
 * Template sheets contain instructions such as 'Semicolon delimited' where the values should be.
 * Treat those as empty.
 */
const isPlaceholder = (value) => /delimited/i.test(value);

/**
 * Parse the metadata block above the table.
 *
 * @returns {{ title: string, fields: Record<string, string> }} where fields are keyed by label without the
 *   trailing colon, e.g. `fields['Author Name(s)']`
 */
function parseHeader(csvText) {
  const rows = Papa.parse(csvText, { skipEmptyLines: false }).data;
  const fields = {};
  let title = '';

  for (const row of rows) {
    const label = (row[0] || '').trim();
    const value = (row[1] || '').trim();

    if (label.startsWith('AS/1')) {
      break; // Reached the table
    }
    if (!label) {
      continue;
    }

    // The first label-only row is the table title
    if (!title && !label.endsWith(':') && !value) {
      title = label;
      continue;
    }

    // Labels usually end with ':', but not always (e.g. 'Author ORCID(s)')
    fields[label.replace(/:$/, '').trim()] = isPlaceholder(value) ? '' : value;
  }

  return { title, fields };
}

/**
 * Convert a date as written in the sheet (e.g. '12/15/2026' or 'June 15, 2026') to YYYY-MM-DD.
 * Falls back to today's date when the sheet's date is missing or can't be parsed.
 */
function formatDate(dateText) {
  const parsed = dateText ? new Date(dateText) : new Date(NaN);
  const date = isNaN(parsed.getTime()) ? new Date() : parsed;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ============================================================================
// People (creators and reviewers)
// ============================================================================
//
// Sheets list names and ORCIDs in two separate cells that are meant to be in the same order:
//   Author Name(s):  Jane Doe; John Smith
//   Author ORCID(s): 0000-0001-...; 0000-0002-...
// People who already appear in the latest release are reused as-is so their names stay consistent.

/** Normalize a name for comparison: lowercase, no periods, single spaces */
const normalizeName = (name) =>
  (name || '')
    .toLowerCase()
    .replace(/[.\s]+/g, ' ')
    .trim();

/**
 * Loose name comparison that ignores middle names and initials,
 * e.g. 'Ellen Quardokus' matches 'Ellen M. Quardokus'.
 */
function namesMatch(a, b) {
  const partsA = normalizeName(a).split(' ');
  const partsB = normalizeName(b).split(' ');
  return partsA[0] === partsB[0] && partsA[partsA.length - 1] === partsB[partsB.length - 1];
}

/** Split a list of names. Sheets usually use ';' but sometimes ',' (or a mix of both). */
function splitNames(namesText) {
  if (!namesText) {
    return [];
  }
  return namesText
    .split(/[;,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Pull every ORCID (e.g. 0000-0002-1234-567X) out of free text */
function extractOrcids(orcidsText) {
  const matches = (orcidsText || '').matchAll(/\d{4}-\d{4}-\d{4}-\d{3}[\dXx]/g);
  return [...matches].map((match) => match[0].toUpperCase());
}

/**
 * Index everyone mentioned in a metadata.yaml by ORCID and by normalized name.
 *
 * @param {object | undefined} metadata - Parsed metadata.yaml of the latest release
 */
function indexKnownPeople(metadata) {
  const byOrcid = new Map();
  const byName = new Map();

  for (const key of ['project_leads', 'reviewers', 'externalReviewers', 'creators']) {
    for (const person of metadata?.[key] || []) {
      if (person?.orcid) {
        byOrcid.set(person.orcid.toUpperCase(), person);
      }
      if (person?.fullName) {
        byName.set(normalizeName(person.fullName), person);
      }
    }
  }

  return { byOrcid, byName };
}

/** Build a new metadata.yaml person entry, splitting the name into first name(s) and last name */
function newPerson(fullName, orcid) {
  const parts = fullName.split(/\s+/);
  const person = {
    fullName,
    firstName: parts.length > 1 ? parts.slice(0, -1).join(' ') : fullName,
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
  };
  if (orcid) {
    person.orcid = orcid;
  }
  return person;
}

/**
 * Turn one name + ORCID pair from the sheet into a metadata.yaml person entry, reusing the existing entry for
 * people already known from the latest release. The name is trusted over the ORCID: when the ORCID belongs to
 * someone else (e.g. the ORCID list is out of order), the known entry for the name is used instead.
 *
 * Always returns a copy, so the same object never appears twice in the output (which would make the YAML
 * library write &anchors / *aliases).
 */
function resolvePerson(fullName, orcid, knownPeople, label, warnings) {
  const byOrcid = orcid ? knownPeople.byOrcid.get(orcid) : undefined;
  const byName = knownPeople.byName.get(normalizeName(fullName));

  // ORCID and name agree with a known person
  if (byOrcid && namesMatch(byOrcid.fullName, fullName)) {
    return { ...byOrcid };
  }

  // The ORCID belongs to someone else, so the sheet's ORCID list is probably out of order
  if (byOrcid) {
    warnings.push(
      `${label}: ORCID ${orcid} next to ${fullName} belongs to ${byOrcid.fullName}; ` +
        (byName ? `using ${fullName}'s known ORCID instead` : 'ORCID dropped, please verify metadata.yaml')
    );
    return byName ? { ...byName } : newPerson(fullName);
  }

  // Known name without an ORCID in the sheet
  if (byName && !orcid) {
    return { ...byName };
  }

  // Known name but a different ORCID than before
  if (byName?.orcid && orcid && byName.orcid.toUpperCase() !== orcid) {
    warnings.push(`${label}: ORCID for ${fullName} changed from ${byName.orcid} to ${orcid}`);
  }

  return newPerson(fullName, orcid);
}

/**
 * Turn the names and ORCIDs cells from the sheet into a list of people.
 * Adds warnings when the lists don't line up, contain duplicates, or disagree with the latest release.
 *
 * @param {string} namesText - e.g. 'Jane Doe; John Smith'
 * @param {string} orcidsText - e.g. '0000-0001-...; 0000-0002-...'
 * @param {object} knownPeople - Result of indexKnownPeople()
 * @param {string} label - 'Authors' or 'Reviewers', used in warnings
 * @param {string[]} warnings - Warnings are appended here
 */
function parsePeople(namesText, orcidsText, knownPeople, label, warnings) {
  const names = splitNames(namesText);
  const orcids = extractOrcids(orcidsText);

  if (orcids.length > 0 && names.length !== orcids.length) {
    warnings.push(
      `${label}: ${names.length} names but ${orcids.length} ORCIDs; paired by position, please verify metadata.yaml`
    );
  }

  const duplicates = orcids.filter((orcid, i) => orcids.indexOf(orcid) !== i);
  if (duplicates.length > 0) {
    warnings.push(`${label}: duplicate ORCID(s) in sheet: ${[...new Set(duplicates)].join(', ')}`);
  }

  return names.map((name, i) => resolvePerson(name, orcids[i], knownPeople, label, warnings));
}

/** Two entries are the same person if their ORCIDs or normalized names match */
function isSamePerson(a, b) {
  if (a.orcid && b.orcid && a.orcid.toUpperCase() === b.orcid.toUpperCase()) {
    return true;
  }
  return normalizeName(a.fullName) === normalizeName(b.fullName);
}

/** Names of people added and removed between two lists */
function diffPeople(before = [], after = []) {
  return {
    added: after.filter((a) => !before.some((b) => isSamePerson(a, b))).map((p) => p.fullName),
    removed: before.filter((b) => !after.some((a) => isSamePerson(a, b))).map((p) => p.fullName),
  };
}

/** True if two people lists contain the same people (order doesn't matter) */
function haveSamePeople(before = [], after = []) {
  const { added, removed } = diffPeople(before, after);
  return added.length === 0 && removed.length === 0;
}

// ============================================================================
// Released versions on disk
// ============================================================================

/** Compare version folder names numerically, so v1.10 sorts after v1.9 */
function compareVersions(a, b) {
  const toNumbers = (version) =>
    version
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const numbersA = toNumbers(a);
  const numbersB = toNumbers(b);
  for (let i = 0; i < Math.max(numbersA.length, numbersB.length); i++) {
    const difference = (numbersA[i] || 0) - (numbersB[i] || 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/** Latest released version folder of an organ (e.g. 'v1.8'), or undefined if it has never been released */
function getLatestVersion(name) {
  const organDir = path.join(ASCTB_HOME, name);
  if (!fs.existsSync(organDir)) {
    return undefined;
  }

  const versions = fs
    .readdirSync(organDir)
    .filter((version) => /^v\d+(\.\d+)*$/.test(version))
    .filter((version) => fs.existsSync(path.join(organDir, version, 'raw', 'metadata.yaml')))
    .sort(compareVersions);

  return versions[versions.length - 1];
}

/** The CSV file name a metadata.yaml points to (`datatable` is normally a one-item list) */
function getDatatableFile(metadata) {
  const datatable = metadata?.datatable;
  return Array.isArray(datatable) ? datatable[0] : datatable;
}

/**
 * Load an organ's latest release: its version, raw metadata.yaml (text and parsed), CSV file name, and CSV text.
 * Every field is undefined if the organ has never been released.
 */
function loadLatestRelease(name) {
  const version = getLatestVersion(name);
  if (!version) {
    return {};
  }

  const rawDir = path.join(ASCTB_HOME, name, version, 'raw');
  const metadataText = fs.readFileSync(path.join(rawDir, 'metadata.yaml'), 'utf8');
  const metadata = YAML.parse(metadataText);
  const csvFile = getDatatableFile(metadata);
  const csvPath = csvFile ? path.join(rawDir, csvFile) : undefined;
  const csvText = csvPath && fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf8') : undefined;

  return { version, metadataText, metadata, csvFile, csvText };
}

// ============================================================================
// Building draft metadata.yaml
// ============================================================================
//
// metadata.yaml is edited one top-level field at a time, as raw text. Re-serializing the whole file with a YAML
// library would re-wrap multi-line values (like the tab-separated citations), creating noisy diffs.

/**
 * Split a YAML document into one text block per top-level field, keeping their original order and formatting.
 *
 * @returns {{ preamble: string, blocks: { key: string, text: string }[] }} preamble is any text (e.g. comments)
 *   before the first field
 */
function splitTopLevelFields(yamlText) {
  const doc = YAML.parseDocument(yamlText);
  const pairs = doc.contents?.items || [];
  const preamble = pairs.length > 0 ? yamlText.slice(0, pairs[0].key.range[0]) : yamlText;

  const blocks = pairs.map((pair, i) => {
    const start = pair.key.range[0];
    const end = i + 1 < pairs.length ? pairs[i + 1].key.range[0] : yamlText.length;
    return { key: String(pair.key.value), text: yamlText.slice(start, end) };
  });

  return { preamble, blocks };
}

/** Serialize a single top-level field as YAML text, e.g. `creators:\n  - fullName: ...` */
function yamlField(key, value) {
  return YAML.stringify({ [key]: value }, { lineWidth: 0 });
}

/** creation_date is quoted to match existing metadata files */
const creationDateField = (date) => `creation_date: "${date}"\n`;

/** Join field blocks back into one YAML document, making sure each block ends with a newline */
function joinFields(preamble, blocks) {
  const body = blocks.map((text) => (text.endsWith('\n') ? text : text + '\n')).join('');
  return preamble + body;
}

/**
 * Draft metadata for an organ that has been released before: the latest release's metadata.yaml with creators,
 * reviewers and creation_date replaced, and release-only fields (DOI, citation, ...) removed.
 */
function buildDraftMetadataFromRelease(releaseMetadataText, creators, reviewers, creationDate) {
  const { preamble, blocks } = splitTopLevelFields(releaseMetadataText);
  const replacements = {
    creators: yamlField('creators', creators),
    reviewers: yamlField('reviewers', reviewers),
    creation_date: creationDateField(creationDate),
  };

  const output = [];
  for (const { key, text } of blocks) {
    if (DROPPED_DRAFT_FIELDS.includes(key)) {
      continue;
    }
    if (key in replacements) {
      output.push(replacements[key]);
      delete replacements[key];
    } else {
      output.push(text);
    }
  }

  // Add any replaced fields that the release didn't have
  output.push(...Object.values(replacements));

  return joinFields(preamble, output);
}

/**
 * Stub metadata for an organ that has never been released. Shared fields (project leads, license, funders, ...)
 * are copied verbatim from the reference organ's latest release. The description is left as a TODO.
 */
function buildDraftMetadataForNewOrgan(entry, creators, reviewers, creationDate, csvFile) {
  const reference = loadLatestRelease(REFERENCE_ORGAN);
  const referenceBlocks = reference.metadataText ? splitTopLevelFields(reference.metadataText).blocks : [];
  const fromReference = (key) => referenceBlocks.find((block) => block.key === key)?.text;

  const organ = entry.folder.replace(/_/g, ' ').trim(); // e.g. 'Diseased_Kidney' -> 'Diseased Kidney'

  const fields = [
    yamlField('title', `Anatomical Structures, Cell Types, plus Biomarkers (ASCT+B) table for ${organ}`),
    yamlField('description', `TODO: Describe the ${organ} ASCT+B table.`),
    yamlField('creators', creators),
    fromReference('project_leads'),
    yamlField('reviewers', reviewers),
    yamlField('externalReviewers', []),
    creationDateField(creationDate),
    fromReference('license'),
    fromReference('publisher'),
    fromReference('funders'),
    fromReference('citationOverall'),
    yamlField('datatable', [csvFile]),
  ];

  // Skip any fields the reference organ didn't have
  return joinFields('', fields.filter(Boolean));
}

// ============================================================================
// Processing one draft table
// ============================================================================
//
// Each table ends up with one of these statuses:
//   new-draft      Draft created from the latest release's metadata
//   new-organ      Never released; stub metadata generated
//   updated-csv    Draft already existed; only its CSV was replaced
//   regenerated    Draft already existed and --force rebuilt it
//   draft-current  Draft CSV is already identical to the sheet; nothing written
//   unchanged      Sheet matches the latest release; no draft created
//   empty          New organ whose sheet is still an empty template; no draft created
//   error          Download failed or the CSV isn't an ASCT+B table

/**
 * Download one draft table, compare it with the latest release, and (unless --dry-run) write the draft.
 *
 * @param {object} entry - One entry from fetchDraftIndex()
 * @param {object} opts - Parsed command line options
 * @returns {Promise<object>} The report for this table
 */
async function processDraft(entry, opts) {
  const report = {
    name: entry.name,
    folder: entry.folder,
    sheetVersion: entry.sheetVersion,
    sheetUrl: sheetEditUrl(entry.file_id, entry.gid),
    latestVersion: undefined,
    status: undefined,
    notes: [],
    warnings: [],
  };

  // --- Download the sheet ---

  let csvText;
  try {
    csvText = await fetchText(sheetCsvUrl(entry.file_id, entry.gid));
  } catch (error) {
    report.status = 'error';
    report.notes.push(error.message);
    return report;
  }

  if (!dataSection(csvText)) {
    report.status = 'error';
    report.notes.push('Downloaded CSV has no AS/1 header row; is this an ASCT+B table?');
    return report;
  }

  const header = parseHeader(csvText);
  report.title = header.title;
  report.headerVersion = header.fields['Version Number'] || undefined;
  report.draftRows = countDataRows(csvText);

  // --- Compare with the latest release ---

  const release = loadLatestRelease(entry.name);
  report.latestVersion = release.version;
  if (release.csvText !== undefined) {
    report.latestRows = countDataRows(release.csvText);
  }

  const knownPeople = indexKnownPeople(release.metadata);
  const { fields } = header;
  const creators = parsePeople(
    fields['Author Name(s)'],
    fields['Author ORCID(s)'],
    knownPeople,
    'Authors',
    report.warnings
  );
  const reviewers = parsePeople(
    fields['Reviewer(s)'],
    fields['Reviewer ORCID(s)'],
    knownPeople,
    'Reviewers',
    report.warnings
  );
  if (creators.length === 0) {
    report.warnings.push('No authors found in CSV header');
  }
  report.creators = diffPeople(release.metadata?.creators, creators);
  report.reviewers = diffPeople(release.metadata?.reviewers, reviewers);

  // --- Decide what to do ---

  const draftDir = path.join(ASCTB_HOME, entry.name, 'draft', 'raw');
  const draftMetadataPath = path.join(draftDir, 'metadata.yaml');
  const draftExists = fs.existsSync(draftMetadataPath);
  const draftMetadata = draftExists ? YAML.parse(fs.readFileSync(draftMetadataPath, 'utf8')) : undefined;

  // Same table and same people as the latest release: nothing new to draft
  const matchesRelease =
    release.csvText !== undefined &&
    dataSection(release.csvText) === dataSection(csvText) &&
    haveSamePeople(release.metadata.creators, creators) &&
    haveSamePeople(release.metadata.reviewers, reviewers);
  if (matchesRelease) {
    report.status = 'unchanged';
    if (draftExists) {
      report.notes.push(`Existing draft left in place, but sheet matches ${release.version}`);
    }
    return report;
  }

  // A brand new organ whose sheet only has the template's root row
  if (!release.version && !draftExists && report.draftRows <= 1) {
    report.status = 'empty';
    report.notes.push('Sheet is still an empty template; no draft created');
    return report;
  }

  // Keep the CSV file name stable across versions so git diffs stay readable
  const csvFile = release.csvFile || getDatatableFile(draftMetadata) || `asct-b-vh-${entry.name}.csv`;
  const draftCsvPath = path.join(draftDir, csvFile);
  report.csvFile = csvFile;

  let metadataText; // Stays undefined when the existing draft metadata.yaml should be kept

  if (draftExists && !opts.force) {
    // Keep any hand edits to the draft's metadata.yaml; just refresh the CSV
    const existingCsv = fs.existsSync(draftCsvPath) ? fs.readFileSync(draftCsvPath, 'utf8') : undefined;
    report.status = existingCsv === csvText ? 'draft-current' : 'updated-csv';
  } else {
    const creationDate = formatDate(fields['Date']);
    if (release.metadataText) {
      metadataText = buildDraftMetadataFromRelease(release.metadataText, creators, reviewers, creationDate);
      report.status = draftExists ? 'regenerated' : 'new-draft';
    } else {
      metadataText = buildDraftMetadataForNewOrgan(entry, creators, reviewers, creationDate, csvFile);
      report.status = 'new-organ';
      report.notes.push('Fill in the TODO description in metadata.yaml');
    }
  }

  // --- Write the draft ---

  if (!opts.dryRun && report.status !== 'draft-current') {
    if (opts.force && draftExists) {
      fs.rmSync(draftDir, { recursive: true, force: true });
    }
    fs.mkdirSync(draftDir, { recursive: true });
    fs.writeFileSync(draftCsvPath, csvText);
    if (metadataText) {
      fs.writeFileSync(draftMetadataPath, metadataText);
    }
  }

  return report;
}

// ============================================================================
// Reporting
// ============================================================================

/** Format a people diff as '+Added Person, -Removed Person' (empty string if nothing changed) */
function formatPeopleDiff(diff) {
  if (!diff || (diff.added.length === 0 && diff.removed.length === 0)) {
    return '';
  }
  return [...diff.added.map((name) => `+${name}`), ...diff.removed.map((name) => `-${name}`)].join(', ');
}

/** Print a column-aligned text table */
function printTable(header, rows) {
  const widths = header.map((title, i) => Math.max(title.length, ...rows.map((row) => String(row[i]).length)));
  const formatRow = (row) => row.map((cell, i) => String(cell).padEnd(widths[i])).join('  ');

  console.log(formatRow(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  rows.forEach((row) => console.log(formatRow(row)));
}

/** Print the summary table, per-organ details (people changes, warnings, notes), and status counts */
function printReport(reports, opts) {
  console.log(opts.dryRun ? '\n[DRY RUN] No files were written.\n' : '');

  // One row per table
  printTable(
    ['name', 'status', 'sheet', 'latest', 'rows(latest→draft)'],
    reports.map((r) => [
      r.name,
      r.status,
      r.sheetVersion || '',
      r.latestVersion || '-',
      r.draftRows === undefined ? '' : `${r.latestRows ?? '-'}→${r.draftRows}`,
    ])
  );

  // Details for tables that have something worth reading
  const withDetails = reports.filter(
    (r) => r.notes.length > 0 || r.warnings.length > 0 || formatPeopleDiff(r.creators) || formatPeopleDiff(r.reviewers)
  );
  if (withDetails.length > 0) {
    console.log('\nDetails:');
    for (const r of withDetails) {
      console.log(`  ${r.name}:`);
      if (formatPeopleDiff(r.creators)) {
        console.log(`    creators: ${formatPeopleDiff(r.creators)}`);
      }
      if (formatPeopleDiff(r.reviewers)) {
        console.log(`    reviewers: ${formatPeopleDiff(r.reviewers)}`);
      }
      r.warnings.forEach((warning) => console.log(`    warning: ${warning}`));
      r.notes.forEach((note) => console.log(`    note: ${note}`));
      if (r.status === 'error') {
        console.log(`    sheet: ${r.sheetUrl}`);
      }
    }
  }

  // How many tables ended up in each status
  const counts = {};
  for (const r of reports) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }
  const summary = Object.entries(counts)
    .map(([status, count]) => `${status}=${count}`)
    .join(' ');
  console.log(`\nSummary: ${summary}`);
}

// ============================================================================
// Main
// ============================================================================

/** Run `fn` over `items` with at most `limit` calls in flight; results keep the input order */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Decide which tables to pull
  let entries = await fetchDraftIndex();
  if (opts.names.length > 0) {
    const available = new Set(entries.map((entry) => entry.name));
    const unknown = opts.names.filter((name) => !available.has(name));
    if (unknown.length > 0) {
      console.error(`Unknown ASCT+B table name(s): ${unknown.join(', ')}`);
      console.error(`Available: ${[...available].sort().join(', ')}`);
      process.exit(2);
    }
    entries = entries.filter((entry) => opts.names.includes(entry.name));
  }

  // Pull them
  const reports = await mapWithConcurrency(entries, CONCURRENCY, (entry) => processDraft(entry, opts));
  reports.sort((a, b) => a.name.localeCompare(b.name));

  // Report
  printReport(reports, opts);
  if (opts.json) {
    fs.mkdirSync(path.dirname(path.resolve(opts.json)), { recursive: true });
    fs.writeFileSync(opts.json, JSON.stringify({ dryRun: opts.dryRun, results: reports }, null, 2));
    console.log(`Report written to ${opts.json}`);
  }

  // Fail the run if any table couldn't be downloaded
  if (reports.some((r) => r.status === 'error')) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
