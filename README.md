# Human Reference Atlas Knowledge Base (HRA-KG) Generator

## Pre-requisite

Install LinkML toolkit
```
pip install linkml
```

## Using LinkML commands

### Generate JSON Schema

```
gen-json-schema specs/[FILE_NAME].yaml > ccf/[FILE_NAME].schema.json
```

### Validate JSON File

```
check-jsonschema --schemafile ccf/[FILE_NAME].schema.json hra/normalized/[FILE_NAME].json
```

### Convert JSON to RDF

```
linkml-convert -s specs/[FILE_NAME].yaml -f json -t rdf -o hra/enriched/[FILE_NAME].rdf hra/normalized/[FILE_NAME].json
```

### Generate JSON-LD Context

```
gen-jsonld-context specs/[FILE_NAME].yaml > ccf/[FILE_NAME].context.jsonld
```

### Generate Markdown Documentation

```
gen-markdown -d docs/[ROOT_FOLDER] specs/[FILE_NAME].yaml
```
