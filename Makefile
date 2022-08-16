build:
	@rm -rf output
	@python3 build.py build
	@cp -r static output/
	@echo "static/ => output/static/"

dev:
	@python3 build.py dev

.PHONY: build dev
