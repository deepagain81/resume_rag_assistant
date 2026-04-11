.PHONY: i dev test lc format lf check clean

i:
	python -m pip install -r requirements.txt

dev:
	fastapi dev src/app/main.py

test:
	pytest

lc:
	ruff check .

format:
	black .

lf:
	ruff check . --fix
	black .

check:
	ruff check .
	black --check .
	pytest

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
