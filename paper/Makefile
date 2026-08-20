.PHONY: help images clean

DOT_DIR := images/graphviz
DOT_FILES := $(wildcard $(DOT_DIR)/*.dot)
PDF_FILES := $(patsubst $(DOT_DIR)/%.dot,images/%.pdf,$(DOT_FILES))

help:
	@echo "Paper - Makefile commands"
	@echo ""
	@echo "  make images  - Convert all Graphviz .dot files to PDF images"
	@echo "  make clean   - Remove generated PDF images"

images: $(PDF_FILES)

images/%.pdf: $(DOT_DIR)/%.dot
	dot -Tpdf $< -o $@

clean:
	rm -f $(PDF_FILES)
