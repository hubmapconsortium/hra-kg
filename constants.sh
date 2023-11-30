
if [ "$(which do-processor)" ==  "" ]; then
  if [ -e "../hra-do-processor/.venv/bin/activate" ]; then
    source  ../hra-do-processor/.venv/bin/activate
  else
    alias do-processor=./src/do-processor.sh
  fi
fi
