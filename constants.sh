export MAX_PROCESSES=10
export JAVA_OPTS="-Xmx64g -XX:+UseParallelGC -XX:TieredStopAtLevel=3 -XX:-UseCompressedOops" # Blazegraph Runner and relation-graph Tweaks
export ROBOT_JAVA_ARGS=$JAVA_OPTS # Robot Tweaks
export JVM_ARGS=$JAVA_OPTS # Apache Jena Tweaks
export NODE_OPTIONS="--max-old-space-size=96000" # Node.js Tweaks

if [ -e "env.sh" ]; then
  source env.sh
fi

if [ "$(which do-processor)" ==  "" ]; then
  if [ -e "../hra-do-processor/.venv/bin/activate" ]; then
    source  ../hra-do-processor/.venv/bin/activate
  else
    alias do-processor=./src/do-processor.sh
  fi
fi
