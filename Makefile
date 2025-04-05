NAME=tabletmodeinputswitch
DOMAIN=majorpeter.github.com

.PHONY: setuid prepare pack install clean all

node_modules: package-lock.json
	npm ci

dist/extension.js: extension.ts node_modules
	npm run-script build

dist/input-evt-inhibitor: util/main.cpp util/config.h
	g++ -std=c++20 -o dist/input-evt-inhibitor util/main.cpp

setuid: dist/input-evt-inhibitor
	sudo chown root:root dist/input-evt-inhibitor && sudo chmod u+s dist/input-evt-inhibitor

prepare: dist/extension.js dist/input-evt-inhibitor setuid
	@cp metadata.json dist/
	@cp README.md dist/

pack: prepare
	@(cd dist && zip ../$(NAME).zip -9r .)

install: prepare
	@rm -rf ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)
	mv dist ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)

clean:
	@rm -rf dist $(NAME).zip util/input-evt-inhibitor

all: prepare pack
