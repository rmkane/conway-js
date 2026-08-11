PNPM ?= pnpm

.PHONY: help install dev build preview format format-check lint test test-watch check clean

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*?##/ { printf "  %-14s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies
	$(PNPM) install

dev: ## Start Vite dev server
	$(PNPM) dev

build: ## Typecheck and build to dist/
	$(PNPM) build

preview: ## Preview production build
	$(PNPM) preview

format: ## Format with Oxfmt
	$(PNPM) format

format-check: ## Check formatting without writing
	$(PNPM) format:check

lint: ## Lint with Oxlint
	$(PNPM) lint

test: ## Run Vitest once
	$(PNPM) test

test-watch: ## Run Vitest in watch mode
	$(PNPM) test:watch

check: format-check lint test build ## Format-check, lint, test, and build

clean: ## Remove build output and caches
	rm -rf dist node_modules/.vite coverage
