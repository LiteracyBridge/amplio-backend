set positional-arguments := true
set dotenv-load := true

# Enables loading .env values

VIRTUAL_ENV := `pipenv --venv 2> /dev/null`
PYTHONPATH := "PYTHONPATH=" + env('PYTHONPATH', '') + ":" + invocation_directory() + "/src"
python := VIRTUAL_ENV / "bin/python"
uvicorn := VIRTUAL_ENV / "bin/uvicorn"

default:
    @just --choose

venv:
    export PIPENV_IGNORE_VIRTUALENVS=1
    . {{ VIRTUAL_ENV }}/bin/activate

install: venv
    pipenv install --verbose

server: venv
    @echo "Starting the API server using the value of APP_ENV (default to 'production')"
    {{ PYTHONPATH }} {{ uvicorn }} src.app:app --reload

dev: venv
    @echo "Starting the API server in development mode"
    APP_ENV=local {{ PYTHONPATH }} {{ uvicorn }} src.app:app --reload

prod: venv
    @echo "Starts the API server in production mode"
    APP_ENV=production {{ PYTHONPATH }} {{ uvicorn }} src.app:app --reload

new_acm *args='': venv
	{{ PYTHONPATH }} {{ python }} scripts/new_acm/new_acm.py "$@"

tableau_geo *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/tableau/tableau_geo_importer.py "$@"

logs_reader *args='': venv
    {{ PYTHONPATH }} {{ python }} scripts/v2LogReader/main.py "$@"

move_android_collected_data *args='': venv
    @echo "Moving collected stats data by the Android TB Loader from amplio-program-content to acm-stats bucket"
    {{ PYTHONPATH }} {{ python }} scripts/acm-stats/move_android_collected_data.py

# TODO: Add a build step to compile acm & copy jars to AWS-LB/bin dir
