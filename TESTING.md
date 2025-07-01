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

Tests are located alongside their corresponding source files with the `.test.ts` suffix.

Current test coverage includes:
- `StringUtils` - Utility functions for shortening addresses and transaction IDs

## GitHub Actions

Tests are automatically run on every pull request via GitHub Actions. The CI workflow:
1. Sets up Node.js 18
2. Installs dependencies
3. Runs linting
4. Executes the test suite

The workflow file is located at `.github/workflows/ci.yml`.