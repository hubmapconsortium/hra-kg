# Human Reference Atlas Knowledge Base (HRA-KG) Generator

## Pre-requisite

Install LinkML toolkit
```
pip install linkml
```

## Using LinkML commands

### Generate JSON Schema

```
cd specs
gen-json-schema --not-closed [FILE_NAME].yaml > ../ccf/[FILE_NAME].schema.json
```

### Validate JSON File

```
cd ccf
check-jsonschema --schemafile [FILE_NAME].schema.json ../hra/normalized/[FILE_NAME].json
```

### Convert JSON to RDF

```
cd specs
linkml-convert -s [FILE_NAME].yaml -f json -t rdf -o ../hra/enriched/[FILE_NAME].rdf ../hra/normalized/[FILE_NAME].json
```

### Generate JSON-LD Context

```
cd specs
gen-jsonld-context [FILE_NAME].yaml > ../ccf/[FILE_NAME].context.jsonld
```

### Generate Markdown Documentation

```
cd specs
gen-markdown -d ../docs/[ROOT_FOLDER] [FILE_NAME].yaml
```
