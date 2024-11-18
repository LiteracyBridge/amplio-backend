#!/bin/bash
#
# Helper for cronjobs. Captures stdout and stderr to log and err files.
#
# Useful for jobs that need to run sequentially.

crondir=/home/$USER/amplio-backend/cron

# create logs directory if it doesn't exist
logs_dir=$crondir/logs
if [ ! -d $logs_dir ]; then
  mkdir $logs_dir
fi

cronlog=$logs_dir/cron.log
jobtime=$(date +%Y%m%d-%H%M%S)

echo "Running cron job at $(date) in $(pwd)" > $cronlog
cd /home/$USER
source ./.profile
export PATH=/home/$USER:/home/$USER/bin:$PATH
echo "PATH=${PATH}"

function doTask() {
    # 'name' for convenience
    name=$1
    # set up log & err files, convenience link to latest log
    logfile=$logs_dir/${jobtime}-${name}.log
    touch $logfile
    rm $logs_dir/${name}.log
    ln -s $logfile $logs_dir/${name}.log

    echo "Running ${name} job, logging to $logfile" >>$cronlog
    export TIME="\t%E elapsed\n\t%U user\n\t%S sys\n\t%Kk total\n\t%Mk resident\n\t%P %%cpu"
    /usr/bin/time -ao ${logfile} just import-v2-stats --s3 tbcd >${logfile} 2>&1
    just email --subject 'TBv2 Stats Import' --body ${logfile}

}

doTask tbv2stats
