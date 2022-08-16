build:
	@rm -rf output
	@python3 build.py build
	@cp -r static output/
	@echo "static/ => output/static/"

gen-css:
	sass --sourcemap=none sass/stylesheet.scss:static/css/stylesheet.css

dev:
	@python3 build.py dev

.PHONY: build dev
