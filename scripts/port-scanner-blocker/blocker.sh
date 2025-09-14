#!/bin/bash

IFTOP_LOG_FILE="/tmp/iftop.log"
IFTOP_TEMP_LOG_FILE="/tmp/tmp-iftop.log"
OUTPUT_FILE="/tmp/block-ips.sh"

sudo iftop -PFG -t -n -s 3600 -L 2000 > $IFTOP_TEMP_LOG_FILE

awk '{ print $1, $NF }' $IFTOP_TEMP_LOG_FILE > $IFTOP_LOG_FILE

python3 ift_logs_reader.py

cat $OUTPUT_FILE

sudo bash $OUTPUT_FILE

# save iptables rules
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
sudo sh -c 'ip6tables-save > /etc/iptables/rules.v6'

# restore updated rules
sudo sh -c 'iptables-restore < /etc/iptables/rules.v4'
sudo sh -c 'ip6tables-restore < /etc/iptables/rules.v6'

rm $OUTPUT_FILE
