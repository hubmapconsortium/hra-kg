#!/bin/bash
set -e
source constants.sh

# ---------------------------------------
# Argument parsing
# ---------------------------------------

declare -a args
declare -i from=0 to=100

# Parse flags and named arguments
while (("$#" > 0)); do
  case $1 in
  --from)
    from="$2"
    shift 2
    ;;

  --to)
    to="$2"
    shift 2
    ;;

  -* | --*)
    echo "Unknown option $1"
    exit 1
    ;;

  *)
    args+=("$1")
    shift
    ;;
  esac
done

# Restore positional arguments
set -- "${args[@]}"

# Parse position arguments
declare arg1="${args[0]}"

if [[ -n "$arg1" ]]; then
  from="10#$arg1"
  to="$((from + 1))"
fi

# Error on extra arguments
if (( "$#" > 1 )); then
  echo "Unknown extra positional arguments ${@:1}"
  exit 1
fi

# ---------------------------------------
# Setup
# ---------------------------------------

# Code to signal an early but normal exit
export STOP_CODE=99

# ---------------------------------------
# Main logic
# ---------------------------------------

declare -i index

echo "Run started on $(date)..."
echo
for script in scripts/??-*.sh; do
  [[ "$script" =~ ([0-9]{2})-.*\.sh ]]
  index="10#${BASH_REMATCH[1]}"
  if (( index < from )); then
    continue
  elif (( index >= to )); then
    break
  fi

  echo "Running $script..."
  if time bash "$script"; then
    echo
  elif [[ "$?" == "$STOP_CODE" ]]; then
    echo
    echo "Early exit signaled from $script"
    break
  else
    exit "$?"
  fi
done

echo
echo "Run completed on $(date)"
