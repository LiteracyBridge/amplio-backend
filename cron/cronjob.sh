#!/bin/bash
#
# Helper for cronjobs. Captures stdout and stderr to log and err files.
#
# Useful for jobs that need to run sequentially.

crondir=$HOME/amplio-backend/cron

# create logs directory if it doesn't exist
logs_dir=$crondir/logs
if [ ! -d $logs_dir ]; then
  mkdir $logs_dir
fi

cronlog=$logs_dir/cron.log
jobtime=$(date +%Y%m%d-%H%M%S)

echo "Running cron job at $(date) in $(pwd)" >$cronlog
cd /$HOME
source ./.profile
export PATH=/$HOME/bin:$PATH:$HOME/snap/bin
echo "PATH=${PATH}"

function doTask() {
  # 'name' for convenience
  name=$1
  # set up log & err files, convenience link to latest log
  logfile=$logs_dir/${jobtime}-${name}.log
  errfile=$logs_dir/${jobtime}-${name}.err
  touch $logfile
  rm $logs_dir/${name}.log
  ln -s $logfile $logs_dir/${name}.log
  rm $logs_dir/${name}.err
  ln -s $errfile $logs_dir/${name}.err

  echo "Running ${name} job, logging to $logfile" >>$cronlog
  $crondir/${name}wrapper.sh >>$logfile 2>$errfile

  # delete size-zero error logs
  if [ ! -s $errfile ]; then
    rm $errfile
    rm $logs_dir/${name}.err
  fi
}

#doTask dropbox

doTask stats
