# Testing

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Running Tests

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm test
```

## Test Structure

Tests are located in the `src/tests/` directory with the `.test.ts` suffix.

Current test coverage includes:

- `StringUtils` - Utility functions for shortening addresses and transaction IDs

## GitHub Actions

The CI pipeline runs on every pull request via GitHub Actions with two separate jobs:

### Lint Job

1. Sets up Node.js 18
2. Installs dependencies
3. Runs linting (Prettier + TypeScript compilation)

### Test Job

1. Sets up Node.js 18
2. Installs dependencies
3. Executes the test suite

Both jobs run in parallel for faster feedback. The workflow file is located at `.github/workflows/ci.yml`.
