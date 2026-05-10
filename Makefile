.PHONY: dev test prod build lint migrate

# --- Développement local ---
dev:
	cd backend && PYTHONPATH=. uvicorn app.main:app --reload --port 8000

# --- Tests ---
test:
	cd backend && PYTHONPATH=. pytest tests/ -v --cov=app --cov-report=term-missing

lint:
	cd backend && ruff check app/ tests/

# --- Docker production ---
prod:
	docker compose -f docker-compose.yml up -d --build

prod-stop:
	docker compose -f docker-compose.yml down

prod-logs:
	docker compose -f docker-compose.yml logs -f

# --- Docker test ---
test-env:
	docker compose -f docker-compose.test.yml up -d --build

test-env-stop:
	docker compose -f docker-compose.test.yml down

# --- Base de données ---
migrate:
	@echo "Appliquer backend/migrations/001_initial_schema.sql via Supabase SQL Editor"
	@echo "ou : supabase db push --db-url \$$SUPABASE_URL"

# --- Build image seule ---
build:
	docker build -t hvac-dashboard .
