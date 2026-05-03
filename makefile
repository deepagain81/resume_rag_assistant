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

# Generate chunks.json from canonical-profile.md
chunks:
	python scripts/build_chunks.py \
		--input data/canonical-profile.md \
		--output data/chunks.json

# Dry-run embedding generation without calling OpenAI
rag-dry-run: chunks
	python scripts/build_embeddings.py \
		--input data/chunks.json \
		--output data/embeddings.json \
		--model text-embedding-3-small \
		--dry-run

# Generate embeddings.json from chunks.json
embeddings: chunks
	python scripts/build_embeddings.py \
		--input data/chunks.json \
		--output data/embeddings.json \
		--model text-embedding-3-small

# Full RAG build: canonical-profile.md -> chunks.json -> embeddings.json
rag-build: chunks embeddings

# Upload chunks.json to Cloudflare R2
upload-chunks:
	wrangler r2 object put resume-bucket/dataset/v2/resume_chunks.json \
		--file data/chunks.json

# Upload embeddings.json to Cloudflare R2
upload-embeddings:
	wrangler r2 object put resume-bucket/dataset/v2/resume_embeddings.json \
		--file data/embeddings.json

# Clean generated Python/cache files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
