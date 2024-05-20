set positional-arguments

VIRTUAL_ENV := `pipenv --venv 2> /dev/null`
PYTHONPATH := "PYTHONPATH=" + env('PYTHONPATH', '') + ":" + invocation_directory() +"/src"

default:
	@just --choose

venv:
	export PIPENV_IGNORE_VIRTUALENVS=1
	source {{ VIRTUAL_ENV }}/bin/activate;

install: venv
	pipenv install --verbose

# # Default
# help: helper
# build: builder

# helper:
#     echo "help, build"

server: venv
	{{ PYTHONPATH }} uvicorn src.app:app --reload

tableau_geo *args='': venv
	{{ PYTHONPATH }} python scripts/tableau/tableau_geo_importer.py $@

logs_reader *args='':
	{{ PYTHONPATH }} python scripts/v2LogReader/main.py $@
