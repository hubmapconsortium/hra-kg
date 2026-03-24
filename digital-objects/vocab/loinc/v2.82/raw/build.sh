#!/bin/bash

# Convert the source ontology file in functional syntax to RDF/XML
robot convert -i DocumentOntology.owl --format owl -o loinc.owl
