# General options
name = chrome-nano
version = $(shell git describe --tags --always)

all: assets/suckless-logo@16px.png assets/suckless-logo@32px.png assets/suckless-logo@48px.png assets/suckless-logo@128px.png

assets/suckless-logo.svg:
	curl -sSL -z $@ --create-dirs -o $@ https://suckless.org/logo.svg

assets/suckless-logo@16px.png: assets/suckless-logo.svg
	inkscape $< -o $@ -w 16 -h 16

assets/suckless-logo@32px.png: assets/suckless-logo.svg
	inkscape $< -o $@ -w 32 -h 32

assets/suckless-logo@48px.png: assets/suckless-logo.svg
	inkscape $< -o $@ -w 48 -h 48

assets/suckless-logo@128px.png: assets/suckless-logo.svg
	inkscape $< -o $@ -w 128 -h 128

build: all

release: clean build
	7z a releases/$(name)-$(version).zip manifest.json src assets

clean:
	git clean -d -f -X
