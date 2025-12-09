export MAX_PROCESSES=12
export JAVA_OPTS="-Xms8g -Xmx96g -XX:+UseParallelGC -XX:-UseCompressedOops"
export NODE_OPTIONS="--max-old-space-size=96000"

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
