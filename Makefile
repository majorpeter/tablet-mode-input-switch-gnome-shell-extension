.PHONY: setuid all

util/input-evt-inhibitor: util/main.cpp util/config.h
	g++ -std=c++20 -o util/input-evt-inhibitor util/main.cpp

setuid: util/input-evt-inhibitor
	sudo chown root:root util/input-evt-inhibitor && sudo chmod u+s util/input-evt-inhibitor

all: util setuid
