# Resume RAG Assistant

A minimal Python starter project for building a resume-focused RAG assistant.

## Goal

Build a clean, production-ready foundation for a resume-focused RAG application.

## Tech Stack

* Python 3.12
* FastAPI
* pytest
* ruff
* black
* mypy
* pre-commit

## Project Structure

```text
resume-rag-assistant/
├── .venv/
├── README.md
├── Makefile
├── requirements.txt
├── pyproject.toml
├── .pre-commit-config.yaml
├── src/
│   └── app/
│       ├── __init__.py
│       ├── main.py
└── tests/
```

## Requirements

* Python 3.12.x

This project is currently pinned to Python 3.12 only:

```toml
requires-python = ">=3.12,<3.13"
```

## Setup

Create and activate a virtual environment, then install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
make i
pre-commit install
```

## Run the App

```bash
make dev
```

This uses:

```bash
fastapi dev src/app/main.py
```

## Run Tests

```bash
make test
```

## Lint and Format

Lint only:

```bash
make lc
```

Format only:

```bash
make format
```

Auto-fix lint issues and format:

```bash
make lf
```

## Run Project Checks

```bash
make check
```

This runs:

* ruff check
* black --check
* pytest

## Clean Cache Files

```bash
make clean
```

This removes common local cache files such as:

* `__pycache__`
* `*.pyc`
* `.pytest_cache`
* `.ruff_cache`

## Development Workflow

A practical local workflow is:

```bash
make lf
make check
git add .
git commit -m "Your message"
```

## Tooling Configuration

Project tooling is configured in `pyproject.toml`, including:

* pytest
* ruff
* black
* mypy

## Notes
