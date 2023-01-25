# Development Notes

## Generating ref-organ.json

The data post-procesing steps:

1. Download the source file from https://raw.githubusercontent.com/hubmapconsortium/hubmap-ontology/master/source_data/reference-spatial-entities.jsonld
2. Remove all top-level `RetiredSpatialEntity` and `SpatialPlacement` objects because they are patches that will be used later at the integration part downstream.
3. Wrap the objects into an array and group it as "spatial_entities".
```
{
	"spatial_entities": [ ... ]
}
```
4. Download the source file from https://raw.githubusercontent.com/hubmapconsortium/hubmap-ontology/master/source_data/generated-reference-spatial-entities.jsonld
5. Separate the `ExtractionSet`, `SpatialEntity`, and `SpatialPlacement` objects, wrap them into separate arrays and group them using different keys.
```
{
	"extraction_sets": [ ... ],
	"spatial_entities": [ ... append with the spatial entities from the above ],
	"rui_placements": [ ... ]
}
```
6. Remove `@context` and `@type`. These definitions are added in the LinkML data specification.
7. Rename `@id` to `id`. This definition is added in the LinkML data specification.
8. Rename `dimension_units` to `dimension_unit`, `scaling_units` to `scaling_unit`, `rotation_units` to `rotation_unit`, and `translation_units` to `translation_unit` for clarity (cardinality = 1).
9. Rename `placement` to `placements` when cardinality > 1 and keep `placement` when cardinality = 1.
10. Rename `sex` to `organ_donor_sex` and `side` to `organ_side` for clarity.
11. Replace `UBERON:` with the prefix `http://purl.obolibrary.org/obo/UBERON_`
11. Replace the hash symbol `#` with the prefix `http://lod.humanatlas.io/ref-organ/` for values in the `id`, `target`, `source`, `representation_of`, `reference_organ` and `extraction_set`.

## Generating asct-b-[ORGAN_NAME].json

1. Download the JSON document from the asctb-api.
2. Remove all objects that has an empty `@id`.
3. Fill out the `label` value with the `name` value when the label is empty.
4. Remove all `notes` fields. It will require a different data modelling to include this field.
5. Rename `rdfs_label` to `label`, `name` to `preferred_name`, `b_type` to `biomarker_type` for clarity.
6. Replace `UBERON:` with the prefix `http://purl.obolibrary.org/obo/UBERON_`
7. Replace `FMA:` with the prefix `http://purl.org/sig/ont/fma/fma`
8. Replace `CL:` with the prefix `http://purl.obolibrary.org/obo/CL`
9. Replace `HGNC:` with the prefix `http://identifiers.org/hgnc/`
10. Replace `DOI:` with the prefix `https://doi.org/`
10. In the `references` object: 
   * Copy the `id` value and paste it in the new `pubmed_id` field.
   * Replace the `id` value with the `doi` value. This is because the DOI is more reliable as the reference identifier.
11. Remove all duplicates.
