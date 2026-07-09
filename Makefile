.PHONY: setup lint format test test-cov run build preview typecheck ci

# Install dependencies and git hooks.
setup:
	npm ci || npm install

# Static analysis.
lint:
	npm run lint

# Auto-format the whole tree.
format:
	npm run format

# Type-check the project (tsc project references).
typecheck:
	npm run typecheck

# Run the unit test suite once.
test:
	npm run test

# Run tests with coverage (fails below 80%).
test-cov:
	npm run test:cov

# Start the Vite dev server.
run:
	npm run dev

# Preview a production build locally.
preview:
	npm run preview

# Produce the production build in dist/.
build:
	npm run build

# Everything CI runs, in one shot.
ci: lint typecheck test-cov build
