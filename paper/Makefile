.PHONY: help images pdf svg clean

DOT_DIR := images/graphviz
DOT_FILES := $(wildcard $(DOT_DIR)/*.dot)
PDF_FILES := $(patsubst $(DOT_DIR)/%.dot,images/%.pdf,$(DOT_FILES))
SVG_FILES := $(patsubst $(DOT_DIR)/%.dot,images/%.svg,$(DOT_FILES))

help:
	@echo "Paper - Makefile commands"
	@echo ""
	@echo "  make images  - Convert all Graphviz .dot files to PDF and SVG images"
	@echo "  make pdf     - Convert all Graphviz .dot files to PDF images"
	@echo "  make svg     - Convert all Graphviz .dot files to SVG images"
	@echo "  make clean   - Remove generated PDF and SVG images"

images: pdf svg

pdf: $(PDF_FILES)

svg: $(SVG_FILES)

images/%.pdf: $(DOT_DIR)/%.dot
	dot -Tpdf $< -o $@

images/%.svg: $(DOT_DIR)/%.dot
	dot -Tsvg $< -o $@

clean:
	rm -f $(PDF_FILES) $(SVG_FILES)
