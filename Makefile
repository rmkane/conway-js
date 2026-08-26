PNPM ?= pnpm

.DEFAULT_GOAL := help

.PHONY: help install hooks update upgrade \
	dev build preview \
	format format-check lint typecheck test test-watch \
	analyze analyze-full analyze-dead-code analyze-dupes analyze-health analyze-hotspots \
	analyze-targets analyze-audit analyze-security analyze-flags analyze-list analyze-viz \
	analyze-watch analyze-fix dead-code dupes \
	precommit check \
	version version-set version-bump version-commit \
	tag-push tag-delete release \
	clean

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)

##@ Setup

install: ## Install dependencies
	$(PNPM) install

hooks: ## Install tracked git hooks (.githooks)
	./scripts/install-hooks.sh

update: ## Update deps within package.json ranges
	$(PNPM) run update

upgrade: ## Upgrade deps to latest (may bump majors)
	$(PNPM) run upgrade

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

precommit: ## Fast quality gate used by git pre-commit
	$(PNPM) precommit

check: format-check lint typecheck test analyze build ## Full local quality gate

##@ Version

# Re-read on each use so bump → commit in one `make` sees the new value.
APP_VERSION = $(shell node -p "require('./package.json').version")
APP_TAG = v$(APP_VERSION)

version: ## Show current app version
	@echo $(APP_VERSION)

version-set: ## Write exact version to package.json (VERSION=1.2.3)
ifndef VERSION
	$(error VERSION is required: make version-set VERSION=1.2.3)
endif
	$(PNPM) version --no-git-tag-version $(VERSION)

version-bump: ## Bump package.json version (KIND=patch|minor|major)
ifndef KIND
	$(error KIND is required: make version-bump KIND=patch|minor|major)
endif
	$(PNPM) version --no-git-tag-version $(KIND)

version-commit: ## Commit version change (message: Bump version to X.Y.Z)
	@if git diff --quiet HEAD -- package.json; then \
		echo "package.json version is unchanged; nothing to commit" >&2; \
		exit 1; \
	fi
	git add package.json pnpm-lock.yaml
	git commit -m "Bump version to $(APP_VERSION)" -- package.json pnpm-lock.yaml

##@ Release

tag-push: ## Create annotated tag vX.Y.Z and push it to origin
	git tag -a "$(APP_TAG)" -m "$(APP_TAG)"
	git push origin "$(APP_TAG)"

tag-delete: ## Delete local + remote tag (TAG=v1.0.0, default current)
	git tag -d "$(or $(TAG),$(APP_TAG))"
	git push origin ":refs/tags/$(or $(TAG),$(APP_TAG))"

# Optional KIND=patch|minor|major bumps before validation and release.
release: ## [bump] → check → version-commit → push branch → tag-push
ifdef KIND
	$(MAKE) version-bump KIND=$(KIND)
endif
	$(MAKE) check
	$(MAKE) version-commit
	git push
	$(MAKE) tag-push

##@ Maintenance

clean: ## Remove build output and caches
	rm -rf dist node_modules/.vite coverage
