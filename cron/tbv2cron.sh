#!/bin/bash
#
# Helper for cronjobs. Captures stdout and stderr to log and err files.
#
# Useful for jobs that need to run sequentially.

basePath=$HOME/amplio-backend
just=just --justfile $basePath
crondir=$basePath/cron

# create logs directory if it doesn't exist
logsDir=$crondir/logs
if [ ! -d $logsDir ]; then
  mkdir $logsDir
fi

cronlog=$logsDir/cron.log
jobtime=$(date +%Y%m%d-%H%M%S)

echo "Running cron job at $(date) in $(pwd)" > $cronlog
cd /$HOME
source ./.profile
export PATH=/$HOME/bin:$PATH:$HOME/snap/bin
echo "PATH=${PATH}"

function doTask() {
    # 'name' for convenience
    name=$1
    # set up log & err files, convenience link to latest log
    logfile=$logsDir/${jobtime}-${name}.log
    touch $logfile
    rm $logsDir/${name}.log
    ln -s $logfile $logsDir/${name}.log

    echo "Running ${name} job, logging to $logfile" >>$cronlog
    export TIME="\t%E elapsed\n\t%U user\n\t%S sys\n\t%Kk total\n\t%Mk resident\n\t%P %%cpu"
    /usr/bin/time -ao ${logfile} ${just} import-v2-stats --s3 tbcd >${logfile} 2>&1
    ${just} email --subject 'TBv2 Stats Import' --body ${logfile}

}

doTask tbv2stats
