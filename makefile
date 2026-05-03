.PHONY: i dev test lc format lf check chunks embeddings rag-build rag-dry-run upload-chunks upload-embeddings clean

VENV_BIN := .venv/bin
RUFF := $(if $(wildcard $(VENV_BIN)/ruff),$(VENV_BIN)/ruff,ruff)
BLACK := $(if $(wildcard $(VENV_BIN)/black),$(VENV_BIN)/black,black)
PYTEST := $(if $(wildcard $(VENV_BIN)/pytest),$(VENV_BIN)/pytest,pytest)

# Install Python dependencies
i:
	python -m pip install -r requirements.txt

# Run tests
test:
	$(PYTEST)

# Lint check
lc:
	$(RUFF) check .

# Format code
format:
	$(BLACK) .

# Lint fix + format
lf:
	$(RUFF) check . --fix
	$(BLACK) .

# Full local quality check
check:
	$(RUFF) check .
	$(BLACK) --check .
	$(PYTEST)

# Generate resume_chunks.json from canonical-profile.md
chunks:
	python scripts/build_chunks.py \
		--input data/canonical-profile.md \
		--output data/resume_chunks.json

# Dry-run embedding generation without calling OpenAI
rag-dry-run: chunks
	python scripts/build_embeddings.py \
		--input data/resume_chunks.json \
		--output data/resume_embeddings.json \
		--model text-embedding-3-small \
		--dry-run

# Generate resume_embeddings.json from resume_chunks.json
embeddings: chunks
	python scripts/build_embeddings.py \
		--input data/resume_chunks.json \
		--output data/resume_embeddings.json \
		--model text-embedding-3-small

# Full RAG build: canonical-profile.md -> resume_chunks.json -> resume_embeddings.json
rag-build: chunks embeddings

# Upload resume_chunks.json to Cloudflare R2
upload-chunks:
	wrangler r2 object put resume-rag-assistant/dataset/v2/resume_chunks.json \
		--file data/resume_chunks.json

# Upload resume_embeddings.json to Cloudflare R2
upload-embeddings:
	wrangler r2 object put resume-rag-assistant/dataset/v2/resume_embeddings.json \
		--file data/resume_embeddings.json

# Clean generated Python/cache files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
