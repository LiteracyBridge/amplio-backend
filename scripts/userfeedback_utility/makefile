# https://dev.to/flpslv/using-makefiles-to-build-and-publish-docker-containers-7c8

help: helper

.PHONY: help build push

helper:
	@echo "build, upload (docker), deploy (python)"

deploy:
	mkdir -vp ~/workspace/dashboard-scripts/AWS-LB/bin/ufUtility/
	cp -v *.py ~/workspace/dashboard-scripts/AWS-LB/bin/ufUtility/
	mkdir -vp ~/Dropbox\ \(Amplio\)/AWS-LB/bin/ufUtility/
	cp -v *.py ~/Dropbox\ \(Amplio\)/AWS-LB/bin/ufUtility/

build:
	@cd docker_build; docker build -t audio-converter:latest .

push:
	@docker push audio-converter:latest

all: build push
