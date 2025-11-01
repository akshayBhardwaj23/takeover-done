# Testing Documentation

## Overview

This document describes the testing strategy and setup for the AI E-Commerce Support Assistant application.

## Testing Infrastructure

We use **Vitest** as our testing framework for its excellent TypeScript support, fast execution, and compatibility with our monorepo setup.

### Key Technologies

- **Vitest**: Fast, Vite-native unit test framework
- **@vitest/coverage-v8**: Code coverage reporting
- **Prisma**: Database testing with isolated test data
- **tRPC**: Type-safe API testing with mocked contexts

## Test Structure

```
packages/
├── api/
│   └── src/
│       └── __tests__/
│           ├── api.test.ts              # tRPC endpoint tests
│           ├── crypto.test.ts           # Encryption utilities tests
│           └── validation.test.ts       # Input validation tests
├── db/
│   └── src/
│       └── __tests__/
│           └── usage.test.ts           # Usage tracking tests
tests/
└── setup.ts                             # Global test setup
```

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Run tests with coverage
```bash
pnpm test:coverage
```

### Run tests for specific package
```bash
pnpm --filter @ai-ecom/api test
pnpm --filter @ai-ecom/db test
```

## Test Configuration

### Environment Variables

Tests require the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string for test database
- `TEST_DATABASE_URL`: Optional separate test database (recommended for CI/CD)
- `ENCRYPTION_KEY`: 32-byte hex key for testing encryption (optional)

### Test Database Setup

The test suite automatically:
1. Creates isolated test data for each test
2. Cleans up after each test (unless disabled)
3. Runs migrations before tests

**Important**: Use a separate test database in production CI/CD to avoid data conflicts.

```bash
# Set test database URL
export TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
```

## Test Categories

### 1. Unit Tests

**Location**: `packages/api/src/__tests__/`

Tests for individual utility functions and logic:

- **validation.test.ts**: Input sanitization and validation
- **crypto.test.ts**: Encryption/decryption functions

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { safeEmail } from '../validation';

describe('safeEmail', () => {
  it('should validate correct emails', () => {
    expect(safeEmail('test@example.com')).toBe('test@example.com');
  });
});
```

### 2. Integration Tests

**Location**: `packages/api/src/__tests__/api.test.ts`

Tests for tRPC API endpoints with database interactions:

- Authentication and authorization
- CRUD operations
- Business logic flows
- Error handling

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { appRouter } from '../index';

describe('tRPC API', () => {
  it('should create and retrieve order', async () => {
    const caller = appRouter.createCaller(authContext);
    const result = await caller.actionCreate({
      shop: 'test.myshopify.com',
      shopifyOrderId: '12345',
      type: 'REFUND',
    });
    expect(result).toHaveProperty('actionId');
  });
});
```

### 3. Database Tests

**Location**: `packages/db/src/__tests__/`

Tests for database models and usage tracking:

- **usage.test.ts**: Subscription limits, usage tracking, quota management

**Example**:
```typescript
import { testPrisma } from '@ai-ecom/db';

describe('Usage tracking', () => {
  it('should track email limits', async () => {
    const subscription = await ensureSubscription(userId);
    const limitCheck = await canSendEmail(userId);
    expect(limitCheck.allowed).toBe(true);
  });
});
```

## Critical Test Coverage

### Authentication & Authorization

- [x] Reject unauthenticated requests
- [x] Multi-tenant data isolation
- [x] User-scoped data access
- [x] Shop ownership verification

### API Endpoints

- [x] Public endpoints (health, echo)
- [x] Orders management
- [x] Threads and messages
- [x] AI reply suggestions
- [x] Action creation and approval
- [x] Analytics data
- [x] Usage summary
- [x] Email aliases

### Data Validation

- [x] Email format validation
- [x] Shopify domain validation
- [x] HTML sanitization
- [x] Input length limits
- [x] Number clamping

### Encryption

- [x] AES-256 encryption/decryption
- [x] Secure token handling
- [x] Fallback behavior

### Usage Tracking

- [x] Subscription creation
- [x] Email quota tracking
- [x] Limit enforcement
- [x] Usage history
- [x] Plan upgrades

## Writing New Tests

### 1. Test File Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { testFunction } from '../module';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup test data
  });

  describe('feature name', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test';

      // Act
      const result = await testFunction(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### 2. Testing tRPC Endpoints

```typescript
import { appRouter } from '../index';

describe('Endpoint Name', () => {
  it('should handle request', async () => {
    // Create authenticated context
    const caller = appRouter.createCaller({
      session: { user: { id: userId } },
      userId: userId,
    });

    // Call endpoint
    const result = await caller.endpointName({ input: 'data' });

    // Assert
    expect(result).toBeDefined();
  });
});
```

### 3. Testing Database Operations

```typescript
import { testPrisma } from '@ai-ecom/db';

describe('Database Operation', () => {
  beforeEach(async () => {
    // Clean up before each test
    await testPrisma.model.deleteMany();
  });

  it('should create record', async () => {
    const record = await testPrisma.model.create({
      data: { /* test data */ },
    });
    expect(record).toBeDefined();
  });
});
```

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on other tests:
- Use `beforeEach` to set up fresh data
- Clean up after tests
- Don't share state between tests

### 2. Descriptive Names

Use clear, descriptive test names:
```typescript
// ❌ Bad
it('works', () => {});

// ✅ Good
it('should reject invalid shop domain', () => {});
```

### 3. Arrange-Act-Assert

Structure tests clearly:
```typescript
it('should calculate total', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### 4. Test Edge Cases

Don't just test happy paths:
- Invalid inputs
- Empty states
- Boundary conditions
- Error scenarios

### 5. Mock External Services

Mock API calls and external services:
```typescript
import { vi } from 'vitest';

vi.mock('../external-service', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
}));
```

## CI/CD Integration

### GitHub Actions

Example workflow:
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

## Debugging Tests

### Run single test
```bash
pnpm test validation.test.ts
```

### Debug with Node inspector
```bash
node --inspect-brk node_modules/.bin/vitest
```

### Verbose output
```bash
pnpm test -- --reporter=verbose
```

## Coverage Goals

Target coverage metrics:

- **Overall**: 80%+
- **Critical paths**: 95%+
- **Utilities**: 90%+
- **API endpoints**: 85%+

View coverage report:
```bash
pnpm test:coverage
open coverage/index.html
```

## Next Steps

### Planned Test Additions

1. **E2E Tests** (Playwright/Cypress)
   - User signup flow
   - Shopify OAuth flow
   - Email reply workflow

2. **Webhook Tests**
   - Shopify webhook validation
   - Email webhook handling

3. **Payment Tests**
   - Razorpay integration
   - Subscription lifecycle

4. **AI Tests**
   - OpenAI API mocking
   - Reply quality assurance

5. **Performance Tests**
   - Load testing
   - Rate limit validation

## Troubleshooting

### Tests fail with database errors

**Solution**: Ensure `TEST_DATABASE_URL` is set and migrations are run:
```bash
export TEST_DATABASE_URL=postgresql://...
pnpm db:migrate
```

### Tests timeout

**Solution**: Increase timeout in test file:
```typescript
it('slow test', async () => {
  // ...
}, { timeout: 10000 });
```

### Import errors

**Solution**: Check `vitest.config.ts` aliases and `tsconfig.json` paths.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Contributing

When adding new features:

1. Write tests alongside implementation
2. Aim for high coverage on new code
3. Update this documentation if adding new test patterns
4. Run full test suite before committing

---

**Last Updated**: January 2025
**Maintainer**: Development Team

