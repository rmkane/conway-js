PNPM ?= pnpm

.DEFAULT_GOAL := help

.PHONY: help install hooks precommit dev build preview format format-check lint test test-watch \
	analyze analyze-full analyze-dead-code analyze-dupes analyze-health analyze-hotspots \
	analyze-targets analyze-audit analyze-security analyze-flags analyze-list analyze-viz \
	analyze-watch analyze-fix dead-code dupes check clean typecheck

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

analyze: ## Fallow dead code + duplication (CI gate)
	$(PNPM) analyze

analyze-full: ## Fallow dead-code + dupes + health
	$(PNPM) analyze:full

analyze-dead-code: ## Unused exports, files, deps, cycles
	$(PNPM) analyze:dead-code

analyze-dupes: ## Copy-paste / structural duplication
	$(PNPM) analyze:dupes

analyze-health: ## Complexity, maintainability, file scores
	$(PNPM) analyze:health

analyze-hotspots: ## Complex + frequently changing files
	$(PNPM) analyze:hotspots

analyze-targets: ## Ranked refactoring targets
	$(PNPM) analyze:targets

analyze-audit: ## Changed-files review (PR-oriented)
	$(PNPM) analyze:audit

analyze-security: ## Security sink candidates (opt-in)
	$(PNPM) analyze:security

analyze-flags: ## Feature-flag usage patterns
	$(PNPM) analyze:flags

analyze-list: ## Discovered files, entry points, workspaces
	$(PNPM) analyze:list

analyze-viz: ## Write interactive HTML map (fallow-viz.html)
	$(PNPM) analyze:viz

analyze-watch: ## Re-run analysis as files change
	$(PNPM) analyze:watch

analyze-fix: ## Auto-fix safe unused-code findings
	$(PNPM) analyze:fix

dead-code: analyze-dead-code ## Alias for analyze-dead-code

dupes: analyze-dupes ## Alias for analyze-dupes

##@ Gates

precommit: format-check lint test typecheck ## Fast quality gate used by git pre-commit

check: format-check lint typecheck test analyze build ## Full local quality gate

##@ Maintenance

clean: ## Remove build output and caches
	rm -rf dist node_modules/.vite coverage
