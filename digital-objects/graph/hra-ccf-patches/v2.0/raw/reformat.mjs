import { writeFileSync } from 'fs';

const REF_SPATIAL_ENTITIES = 'https://raw.githubusercontent.com/hubmapconsortium/hubmap-ontology/master/source_data/reference-spatial-entities.jsonld'

async function migrateCcfPatches() {
  const results = await fetch(REF_SPATIAL_ENTITIES).then(r => r.json());

  const jsonld = {
    '@context': [
      'https://hubmapconsortium.github.io/hubmap-ontology/ccf-context.jsonld',
      {
        ccf1: 'http://purl.org/ccf/latest/ccf.owl#',
        hra: 'https://purl.humanatlas.io/graph/hra-ccf-patches#',
        schema: 'http://schema.org/',
      },
    ],
    '@graph': results.map((s) => {
      delete s['@context'];
      delete s.placement?.[0]['@context'];
      if (s.creator) {
        let { creator_orcid, creator_first_name, creator_last_name } = s;
        let label = `${creator_first_name} ${creator_last_name}`;
        if (creator_orcid === 'https://orcid.org/0000-0002-6703-7647') {
          label = 'Bruce W. Herr II';
        } else if (s.creator === 'Kristin Browne') {
          creator_orcid = 'https://orcid.org/0000-0003-4066-7531';
        }
        s.creator = {
          '@id': creator_orcid,
          '@type': 'schema:Person',
          label,
          'schema:name': label,
          'schema:firstName': creator_first_name,
          'schema:lastName': creator_last_name,
          'schema:identifier': creator_orcid.split('/').slice(-1)[0],
        };

        delete s.creator_first_name;
        delete s.creator_last_name;
        delete s.creator_orcid;
      }
      s['@id'] = s['@id'].replace('#', 'ccf1:');
      if (s.placement) {
        const placement = s.placement[0];
        placement['@id'] = placement['@id'].replace('#', 'ccf1:');
        placement['target'] = placement['target'].replace('#', 'ccf1:');
      }
      if (s.object) {
        s.object['@id'] = s.object['@id'].replace('#', 'ccf1:');
        s.object.placement['@id'] = s.object.placement['@id'].replace('#', 'ccf1:');
        s.object.placement['target'] = s.object.placement['target'].replace('#', 'ccf1:');
      }
      if (s.source) {
        s.source = s.source.replace('#', 'ccf1:');
        s.target = s.target.replace('#', 'ccf1:');
      }
      return s;
    }),
  };

  writeFileSync('patches.jsonld', JSON.stringify(jsonld, null, 2));
}

await migrateCcfPatches();
