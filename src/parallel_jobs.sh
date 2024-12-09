#!/bin/bash

# Max number of concurrent jobs
MAX_PROCESSES=${MAX_PROCESSES:-5}
# Array to store process IDs
PIDS=()

# Function: Wait for a slot to be available
wait_for_slot() {
    while [ "${#PIDS[@]}" -ge "$MAX_PROCESSES" ]; do
        for i in "${!PIDS[@]}"; do
            if ! kill -0 "${PIDS[$i]}" 2>/dev/null; then
                wait "${PIDS[$i]}"
                EXIT_CODE=$?
                if [ "$EXIT_CODE" -ne 0 ]; then
                    echo "Process failed with exit code $EXIT_CODE. Exiting..."
                    kill_all
                    exit 1
                fi
                unset PIDS[$i]
            fi
        done
        PIDS=("${PIDS[@]}") # Rebuild array to remove empty slots
        sleep 1
    done
}

# Function: Queue a new job for execution
queue_job() {
    local COMMAND=$1
    wait_for_slot
    echo "Starting job: $COMMAND"
    eval "$COMMAND" &  # Run the command in the background
    PIDS+=($!)          # Store the PID of the background process
}

# Function: Wait for all jobs to complete
wait_for_empty_queue() {
    for PID in "${PIDS[@]}"; do
        wait "$PID"
        EXIT_CODE=$?
        if [ "$EXIT_CODE" -ne 0 ]; then
            echo "Process failed with exit code $EXIT_CODE. Exiting..."
            exit 1
        fi
    done
}

# Helper: Kill all running jobs (cleanup)
kill_all() {
    echo "Terminating all running jobs..."
    for PID in "${PIDS[@]}"; do
        kill "$PID" 2>/dev/null || true
    done
}

# Trap to ensure cleanup on script termination
trap kill_all EXIT
