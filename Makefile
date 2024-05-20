VIRTUAL_ENV = $(shell pipenv --venv 2> /dev/null)
PYTHONPATH = $(shell echo PYTHONPATH=$$PYTHONPATH:${PWD}/src)

venv:
	export PIPENV_IGNORE_VIRTUALENVS=1
	source $(VIRTUAL_ENV)/bin/activate;

install: venv
	pipenv install --verbose

# # Default
# help: helper
# build: builder

# helper:
#     echo "help, build"

server: venv
	$(PYTHONPATH) uvicorn src.app:app --reload

tableau_importer: venv
	$(PYTHONPATH) python scripts/tableau/tableau_geo_importer.py
