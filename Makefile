PNPM ?= pnpm

.DEFAULT_GOAL := help

.PHONY: help install hooks precommit dev build preview format format-check lint test test-watch analyze analyze-full dead-code dupes check clean typecheck

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)

##@ Setup

install: ## Install dependencies
	$(PNPM) install

hooks: ## Install tracked git hooks (.githooks)
	./scripts/install-hooks.sh

##@ Develop

dev: ## Start Vite dev server
	$(PNPM) dev

preview: ## Preview production build
	$(PNPM) preview

build: ## Build production assets to dist/
	$(PNPM) build

##@ Quality

format: ## Format with Oxfmt
	$(PNPM) format

format-check: ## Check formatting without writing
	$(PNPM) format:check

lint: ## Lint with Oxlint
	$(PNPM) lint

typecheck: ## Typecheck with tsc (no emit)
	$(PNPM) typecheck

test: ## Run Vitest once
	$(PNPM) test

test-watch: ## Run Vitest in watch mode
	$(PNPM) test:watch

analyze: ## Fallow dead code + duplication
	$(PNPM) analyze

analyze-full: ## Fallow dead code + dupes + health
	$(PNPM) analyze:full

dead-code: ## Fallow unused exports/files/deps
	$(PNPM) exec fallow dead-code

dupes: ## Fallow duplicated code
	$(PNPM) exec fallow dupes

##@ Gates

precommit: format-check lint test typecheck ## Fast quality gate used by git pre-commit

check: format-check lint typecheck test analyze build ## Full local quality gate

##@ Maintenance

clean: ## Remove build output and caches
	rm -rf dist node_modules/.vite coverage
