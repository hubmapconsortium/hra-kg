#!/bin/bash

cd /data

sed "s/@@TIMEOUT@@/$BLAZEGRAPH_TIMEOUT/" /blazegraph/readonly_cors.tmp.xml | sed "s/@@READONLY@@/$BLAZEGRAPH_READONLY/" >readonly_cors.xml

java -Xmx$BLAZEGRAPH_MEMORY -Dfile.encoding=UTF-8 -Djetty.start.timeout=60 -Djetty.port=$BLAZEGRAPH_PORT -Djetty.overrideWebXml=readonly_cors.xml -Dbigdata.propertyFile=blazegraph.properties -cp /blazegraph/blazegraph.jar:/blazegraph/jetty-servlets-9.2.3.v20140905.jar com.bigdata.rdf.sail.webapp.StandaloneNanoSparqlServer

PID=$!

stop_server() {
  echo "Shutting down blazegraph..."
  kill "$PID" 2>/dev/null || true
  sleep 3
}

trap stop_server EXIT
