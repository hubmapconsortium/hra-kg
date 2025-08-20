import fs from 'fs';
import path from 'path';

const INPUT_DIR = './dist';
const OUTPUT_DIR = './scratch/updates';
const BASE_REMOTE_URL = 'https://api.datacite.org/dois';
const IGNORED_ATTRS = new Set(['publicationYear', 'publisher', 'dates', 'language', 'formats', 'types']);

function* findFiles(dir, fileName) {
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      yield* findFiles(filePath, fileName);
    } else if (file === fileName) {
      yield filePath;
    }
  }
}

function mkdirpSync(dir) {
  if (fs.existsSync(dir)) return;
  mkdirpSync(path.dirname(dir));
  fs.mkdirSync(dir);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringifyWithoutNulls(obj) {
  return JSON.stringify(obj, (_key, value) => (value === null ? undefined : value));
}

function getUpdatedAttributes(local, remote) {
  if (!remote.data) {
    console.log('Error!', local.data.id, remote);
    return undefined;
  }
  const updated = {};
  const current = remote.data.attributes;
  const localAttrs = Object.entries(local.data.attributes).filter(([a, _v]) => !IGNORED_ATTRS.has(a));
  let hadUpdate = false;
  for (const [attribute, value] of localAttrs) {
    if (JSON.stringify(value) !== stringifyWithoutNulls(current[attribute])) {
      updated[attribute] = value;
      // updated[attribute + '.old'] = current[attribute];
      hadUpdate = true;
    }
  }
  return hadUpdate ? updated : undefined;
}

mkdirpSync(OUTPUT_DIR);

for (const doiFile of findFiles(INPUT_DIR, 'doi.json')) {
  const localDoi = JSON.parse(fs.readFileSync(doiFile, 'utf8'));
  const doi = localDoi.data.id;
  const hubmapId = doi.split('/')[1].toUpperCase();
  const remoteDoi = await fetch(`${BASE_REMOTE_URL}/${doi}`).then((r) => r.json());

  const updatedAttributes = getUpdatedAttributes(localDoi, remoteDoi);
  if (updatedAttributes) {
    const updatePayload = {
      data: {
        type: 'dois',
        attributes: updatedAttributes,
      },
    };

    const outputFile = path.join(OUTPUT_DIR, `${hubmapId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(updatePayload, null, 2));
  }
  sleep(0.5);
}
