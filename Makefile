VIRTUAL_ENV = $(shell pipenv --venv 2> /dev/null)

export_envs:
	# export PYTHONPATH=${PYTHONPATH}:${PWD}/src
	export PIPENV_IGNORE_VIRTUALENVS=1

venv: export_envs
	source $(VIRTUAL_ENV)/bin/activate;
	export PYTHONPATH=${PYTHONPATH}:${PWD}/src;


# # Default
# help: helper
# build: builder

# helper:
#     echo "help, build"

server: venv
	PYTHONPATH=${PYTHONPATH}:${PWD}/src uvicorn src.app:app --reload
