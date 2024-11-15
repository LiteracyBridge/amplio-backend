#!/bin/bash

echo "Stats import and processing started at $(date)"
echo "path:$PATH"
# cd ~/acm-stats/AWS-LB
# time ./runAll.sh
time just import-v1-stats
echo "Stats import and processing finished at $(date)"
