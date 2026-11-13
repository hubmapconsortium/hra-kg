---
name: pull-asctb-drafts
description: Pull the latest draft ASCT+B tables from the Google Sheets draft index into digital-objects/asct-b/<name>/draft, report what changed vs the latest release, normalize/build the drafts with hra-do-processor, and offer to commit. Use when asked to pull, update, refresh, sync, or check draft ASCT+B (asct-b) tables, or to set up asct-b drafts.
---

# Pull draft ASCT+B tables

Draft ASCT+B tables live in Google Sheets. The draft index sheet
(https://docs.google.com/spreadsheets/d/1ER90abGCF84MVdIFl51KEawfuuM5YhUbLCgt2i50nHg/edit#gid=0,
columns `folder,filename,file_id,gid`) lists one sheet per organ. `src/pull-asctb-drafts.js` (run via
`jobs/pull-asctb-drafts.sh`) downloads each as CSV into `digital-objects/asct-b/<name>/draft/raw/`.

The organ `<name>` is the `filename` prefix before `_v` (e.g. `allen-brain_v1.10_DRAFT` -> `allen-brain`,
`White_Adipose` -> `adipose`). The `_vX.Y_DRAFT` suffix is the version the authors intend to release next.

## Run everything from the repo root

All commands below assume the working directory is the hra-kg repo root, and need `../hra-do-processor`
with `node_modules` and `.venv` installed (or `HRA_DO_PROCESSOR_HOME` set).

## Steps

### 1. Pull

If the user named organs, pass them; otherwise pull all. If the user seems unsure, do a `--dry-run` first.

```bash
jobs/pull-asctb-drafts.sh --json scratch/asctb-drafts-report.json [name ...]
```

Options: `--dry-run` (write nothing), `--force` (rebuild draft metadata.yaml from the latest release, discarding
hand edits; otherwise an existing draft only gets its CSV replaced).

Statuses in the report:

| status | meaning |
| --- | --- |
| `new-draft` | Draft created from latest `vX/raw/metadata.yaml`, with creators/reviewers/creation_date refreshed from the CSV header and `hubmapId`/`doi`/`citation` removed |
| `new-organ` | No released version exists; stub metadata.yaml generated (description is a TODO) |
| `updated-csv` | Draft already existed; only the CSV was replaced, metadata.yaml kept |
| `regenerated` | Draft existed and `--force` rebuilt it |
| `draft-current` | Draft CSV already identical to the sheet; nothing written |
| `unchanged` | Sheet data and people match the latest release; no draft created |
| `empty` | New organ whose sheet is still an empty template; no draft created |
| `error` | Download failed (often: sheet not shared publicly) or not an ASCT+B CSV |

The script exits non-zero if any table had an `error`; the other tables are still processed.

### 2. Summarize for the user

Read `scratch/asctb-drafts-report.json` and give a concise summary:
- Counts per status, and which organs are new drafts / new organs / updated.
- Errors, with each `sheetUrl` so the user can fix sharing.
- Sheet version vs latest release (`sheetVersion` vs `latestVersion`). When the sheet version equals the latest
  release (e.g. sheet `v1.7`, latest `v1.7`), point out that the sheet's version was probably not bumped yet.
  At release time the draft is promoted with `do-processor bump-draft asct-b/<name>/draft --minor` (or `--major`),
  so mention which flag matches the sheet's intended version.
- Row count changes (`latestRows` -> `draftRows`), people added/removed, and every warning (ORCID/name count
  mismatches and changed ORCIDs need a human to check `metadata.yaml`).

### 3. Normalize each new/updated draft

For each organ whose status is `new-draft`, `new-organ`, `updated-csv`, or `regenerated`:

```bash
source constants.sh && do-processor --exclude-bad-values normalize asct-b/<name>/draft
```

Then read `digital-objects/asct-b/<name>/draft/normalized/warnings.yaml` and any `*-validation-errors.yaml` in that
folder, and summarize them per organ (group repeated warnings, give counts, show a few examples). Normalized and
enriched outputs are git-ignored.

### 4. Full build

Ask before running full builds when there are many drafts (each can take minutes). For each draft:

```bash
mkdir -p dist/asct-b/<name>/draft && ./src/run-do-processor.sh --exclude-bad-values build --clean asct-b/<name>/draft
```

This is the same invocation `scripts/10-build-digital-objects.sh` uses. Run independent builds in the background
when there are several, and report any that fail (with the tail of their output). Success means
`dist/asct-b/<name>/draft/graph.ttl` exists.

### 5. Follow-ups for new organs

For `new-organ` drafts remind the user to:
- Replace the `TODO` description in `digital-objects/asct-b/<name>/draft/raw/metadata.yaml`.
- Check creators/reviewers (empty lists if the sheet header had none), project_leads, funders and citationOverall
  (copied from the kidney release as a template).

### Fixing problems in the sheets

Fix problems at the source (the Google Sheets), then re-pull; don't hand-edit draft CSVs. For mechanical issues
(malformed IDs like `UBERON_0002009`, `HGNC: 2197`, `fma323217`; header typos like `BProtein10/LABEL`; version rows
behind the file name), point the user to `src/google-apps-script/asctb-draft-fixes.gs`. It's an Apps Script for the
draft index sheet with an "ASCT+B Fixes" menu that previews or applies those fixes across all draft tables and flags
the rest in a "Fix Report" tab. Its fix rules are pure functions (`findFixes`, `fixHeader`, `fixIdCell`) that can be
tested locally by evaluating the file in Node against the draft CSVs.

### 6. Offer to commit

Show `git status --short digital-objects/asct-b` and offer to commit. Only stage draft raw files:

```bash
git add digital-objects/asct-b/*/draft/raw
```

Propose a message like `Update ASCT+B drafts (kidney, heart, ...)`. Never commit or push without the user's
confirmation. Drafts are intentionally committed and are built/deployed by the normal full build; collection and
test-release jobs already skip `draft` versions.
