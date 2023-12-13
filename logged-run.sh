#!/bin/bash
source constants.sh

time bash -c "time ./run.sh 2>&1" | tee log.txt
