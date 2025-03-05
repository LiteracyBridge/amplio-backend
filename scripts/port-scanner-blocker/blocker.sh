#!/bin/bash

IFTOP_LOG_FILE="/tmp/iftop.log"
IFTOP_TEMP_LOG_FILE="/tmp/tmp-iftop.log"
OUTPUT_FILE="/tmp/block-ips.sh"

sudo iftop -PFG -t -n -s 60 -L 2000 > $IFTOP_TEMP_LOG_FILE

awk '{ print $1, $NF }' $IFTOP_TEMP_LOG_FILE > $IFTOP_LOG_FILE

python3 ift_logs_reader.py

chmod +x $OUTPUT_FILE

cat $OUTPUT_FILE
# sudo bash $OUTPUT_FILE

# rm $OUTPUT_FILE
