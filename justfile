set positional-arguments := true
set dotenv-load := true
# Enables loading .env values

VIRTUAL_ENV := `pipenv --venv 2> /dev/null`
PYTHONPATH := "PYTHONPATH=" + env('PYTHONPATH', '') + ":" + source_directory() + "/src"
python := VIRTUAL_ENV / "bin/python"
uvicorn := VIRTUAL_ENV / "bin/uvicorn"

default:
    @just --choose

venv:
    export PIPENV_IGNORE_VIRTUALENVS=1
    . {{ VIRTUAL_ENV }}/bin/activate

install: venv
    pipenv install --verbose "$@"

server: venv
    @echo "Starting the API server using the value of APP_ENV (default to 'production')"
    {{ PYTHONPATH }} {{ uvicorn }} src.app:app --reload

[doc("Runs pyright linter")]
lint: venv
    pyright

dev: venv
    @echo "Starting the API server in development mode"
    APP_ENV=local {{ PYTHONPATH }} {{ uvicorn }} src.app:app --reload

prod: venv
    @echo "Starts the API server in production mode"
    APP_ENV=production {{ PYTHONPATH }} {{ uvicorn }} src.app:app --reload

new-acm *args='': venv
	npm run console new-acm -- "$@"

tableau-geo *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/tableau/tableau_geo_importer.py "$@"

# START: Statistics related commands
[doc("Inserts processed stats 'tbsdeployed.csv' and 'tbscollected.csv' files into the database")]
[group("statistics")]
csv-insert *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/acm_stats/csv_insert.py "$@"

[group("statistics")]
move-android-collected-data *args='': venv
    @echo "Moving collected stats data by the Android TB Loader from amplio-program-content to acm_stats bucket"
    {{ PYTHONPATH }} {{ python }} scripts/acm_stats/move_android_collected_data.py

[doc("Updates the usage info of the program(s) in the database")]
[group("statistics")]
update-usage-info *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/acm_stats/usage_info_updater.py "$@"

[group("statistics")]
kv2csv *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/acm_stats/kv2csv.py "$@"

[doc("Converts user feedback audio files from a18 to wav/mp3")]
[group("statistics")]
uf-utility *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/userfeedback_utility/ufUtility.py "$@"

[doc("Import Talking Books v1 statistics into db")]
[group("statistics")]
import-v1-stats *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/acm_stats/import_v1_stats.py "$@"
    just update-usage-info

[doc("Re-imports Talking Books v1 statistics into db")]
[group("statistics")]
re-import-v1-stats *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/acm_stats/re_import_stats.py "$@"
    just update-usage-info

[doc("Import Talking Book v2 statistics into db")]
import-v2-stats *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/v2_log_reader/main.py "$@"
    just update-usage-info

[group("docker")]
[doc("Builds the audio converter docker image")]
docker-build-audio-converter:
    docker build --t audio-converter --file scripts/userfeedback_utility/docker_build/dockerfile

# END: Statistics related commands

# START: Migration commands

[doc("Executes alembic")]
[group("migration")]
alembic *args='': venv
    cd src/alembic; {{ VIRTUAL_ENV }}/bin/alembic "$@"

migration-run *args='': venv
    cd src/alembic; {{ VIRTUAL_ENV }}/bin/alembic upgrade head

[doc("Reverts migration given the revision number")]
[group("migration")]
migration-revert *args='': venv
    cd src/alembic; {{ VIRTUAL_ENV }}/bin/alembic downgrade "$1"

[doc("Creates a new migration file")]
[group("migration")]
migration-create *args='': venv
    cd src/alembic; {{ VIRTUAL_ENV }}/bin/alembic revision --message "$@"

[doc("Dumps psql database contents. Usage backup-db <username> <db-name> <output-name>")]
backup-db *args='':
    echo "NB: Don't forget to set \$PGHOST, \$PGPORT env variables!"

    pg_dump --verbose --password --create --clean --schema-only --username "$1" --dbname "$2" --file "$3"_schema.sql
    pg_dump --format=custom --data-only --verbose --password --username "$1" --dbname "$2" --file "$3".data
    pg_dump --format=custom --verbose --password --username "$1" --dbname "$2" --file "$3".full

# END: Migration commands

[doc("Executes a python script. Usage: just run_script <script_name.py> <args>")]
run-script *args='': venv
    {{ PYTHONPATH }} {{ python }} "$@"

disable-ipv6:
    #!/usr/bin/env bash
    set -euxo pipefail

    sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
    sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
    sudo sysctl -w net.ipv6.conf.lo.disable_ipv6=1

[group("deploy")]
[doc("Deploy user feedback utility scripts")]
deploy-uf-utilities:

# TODO: Add a build step to compile acm & copy jars to AWS-LB/bin dir
