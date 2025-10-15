# Test Suite

## Test Structure

```
tests/
├── unit/           # Unit tests
│   ├── api/        # API unit tests
│   ├── web/        # Web unit tests
│   └── worker/     # Worker unit tests
├── integration/    # Integration tests
└── e2e/           # End-to-end tests
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run specific project tests
npm run test -- --selectProjects api
npm run test -- --selectProjects web
npm run test -- --selectProjects worker
npm run test -- --selectProjects integration

# Run with coverage
npm run test:coverage
```

### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed
```

### All Tests
```bash
# Run all tests
npm run test:all
```

## Test Configuration

- **Jest**: Unit and integration tests
- **Playwright**: End-to-end tests
- **Coverage**: HTML and LCOV reports in `coverage/` directory
- **Reports**: Playwright reports in `playwright-report/` directory

## Test Environment

- **Unit Tests**: Node.js environment
- **Web Tests**: jsdom environment
- **E2E Tests**: Real browser environment (Chrome, Firefox, Safari)

## Writing Tests

### Unit Tests
- Place in `tests/unit/[service]/` directory
- Use `.test.ts` or `.test.tsx` extension
- Follow Jest testing patterns

### Integration Tests
- Place in `tests/integration/` directory
- Test service interactions
- Use `.test.ts` extension

### E2E Tests
- Place in `tests/e2e/` directory
- Use `.spec.ts` extension
- Follow Playwright testing patterns

## Test Data

- Use test fixtures for consistent data
- Mock external API calls
- Use test database for integration tests
- Clean up test data after each test

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock External Dependencies**: Don't make real API calls
5. **Test Edge Cases**: Test both success and failure scenarios
6. **Maintain Test Data**: Keep test data up to date
7. **Fast Tests**: Keep unit tests fast (< 100ms each)
8. **Reliable Tests**: Avoid flaky tests

## Coverage Goals

- **Unit Tests**: > 80% coverage
- **Integration Tests**: > 60% coverage
- **E2E Tests**: Critical user journeys covered

## Troubleshooting

### Common Issues

1. **Test Timeout**: Increase timeout in test configuration
2. **Flaky Tests**: Add retries or improve test stability
3. **Environment Issues**: Check test environment setup
4. **Mock Issues**: Verify mock implementations

### Debug Mode

```bash
# Run tests in debug mode
npm run test -- --verbose
npm run test:e2e -- --debug
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Scheduled runs

All tests must pass before merging to main branch.

