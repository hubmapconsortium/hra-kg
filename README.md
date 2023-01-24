# Human Reference Atlas Knowledge Base (HRA-KG) Generator

## Pre-requisite

1. Install LinkML toolkit
```
pip install linkml
```

2. Install Turtle Merge tool
```
npm install -g ttl-merge
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

## Using Turtle Merge commands

### Merge RDF/Turtle files

```
ttl-merge -i hra/enriched/[FILE1].rdf hra/enriched/[FILE2].rdf ... > hra/integrated/hra-kg.rdf
```
