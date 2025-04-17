export MAX_PROCESSES=12
export JAVA_OPTS="-Xms2g -Xmx164g"

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
