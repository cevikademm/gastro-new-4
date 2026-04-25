# 2MC Gastro Test Suite Documentation

## Overview

This is a comprehensive test suite for the **2MC Gastro** commercial kitchen planning and equipment management platform. The test suite includes unit tests, store tests, library tests, and integration tests covering all major functionality.

**Technology Stack:**
- Vitest 4.1.4 (testing framework)
- React 19 Testing Library
- Zustand (state management)
- TypeScript 5.8.2
- jsdom (browser environment)

## Test Structure

```
src/
├── stores/__tests__/          # Store unit tests
│   ├── cartStore.test.ts
│   ├── authStore.test.ts
│   ├── catalogStore.test.ts
│   ├── orderStore.test.ts
│   ├── projectStore.test.ts
│   ├── compareStore.test.ts
│   └── bomStore.test.ts
├── lib/__tests__/             # Library/utility tests
│   ├── analytics.test.ts
│   ├── payment.test.ts
│   └── leadCapture.test.ts
├── __tests__/integration/     # Integration tests
│   ├── checkout-flow.test.ts
│   └── project-flow.test.ts
└── test/
    └── setup.ts               # Test environment setup
```

## Test Scripts

Add these scripts to `package.json`:

```bash
npm run test              # Run tests once
npm run test:watch       # Watch mode for development
npm run test:ui          # Interactive UI dashboard
npm run test:coverage    # Generate coverage report
```

## Configuration Files

### vitest.config.ts
- Browser environment: jsdom
- Global test utilities
- Setup file: src/test/setup.ts
- Coverage reporting (v8 provider)

### src/test/setup.ts
- localStorage mocking
- window.matchMedia mocking
- crypto.randomUUID mocking
- IntersectionObserver/ResizeObserver mocks
- Testing Library cleanup hooks

## Test Coverage

### Store Tests (7 test suites)

#### 1. **cartStore.test.ts** - Shopping Cart Management
- Add items to cart with quantities
- Remove items from cart
- Update item quantities
- Clear cart
- Calculate totals (items, price)
- Check if item is in cart
- Group items by category

#### 2. **authStore.test.ts** - Authentication & User Management
- Login with email/password
- Handle pending approval status
- User registration
- Logout and session clearing
- Profile updates
- Session restoration from storage
- Notification preferences

#### 3. **catalogStore.test.ts** - Equipment Catalog & Filtering
- Equipment listing and retrieval
- Search by name, code, description
- Filter by category, power type, kW range
- Sort by name, power, price (asc/desc)
- Add/remove items from planning list
- Pagination support
- Series and multi-filter combinations

#### 4. **orderStore.test.ts** - Order Management
- Create orders from cart items
- Order number generation
- Fetch user orders
- Get order by ID
- Order status tracking (pending, confirmed, shipped, etc.)
- Error handling for authentication

#### 5. **projectStore.test.ts** - Project Management
- Create commercial kitchen projects
- Update project properties
- Delete projects
- Select active project
- Add/remove equipment to projects
- Modify product details in projects
- Track project lifecycle (drafting → quoted → complete)

#### 6. **compareStore.test.ts** - Equipment Comparison
- Add items to comparison list (max 6)
- Remove items from comparison
- Toggle item comparison
- Check if item is being compared
- Clear comparison and hide panel
- Support for multiple sources (Diamond, Combisteel)

#### 7. **bomStore.test.ts** - Bill of Materials
- Add BOM line items
- Remove items from BOM
- Update item quantity and status
- Search BOM by code/description
- Calculate total items and unique SKUs
- Status tracking (inStock, ordered, processing)

### Library Tests (3 test suites)

#### 8. **analytics.test.ts** - Google Analytics Integration
- Initialize analytics (GA and Clarity)
- Track page views with path and title
- Track custom events with parameters
- Handle missing gtag gracefully
- Support for common e-commerce events

#### 9. **payment.test.ts** - Stripe Payment Processing
- Create payment intent with order data
- Return client secret and payment intent ID
- Handle different currencies (EUR, USD, etc.)
- Large amount handling
- Error handling for missing credentials

#### 10. **leadCapture.test.ts** - Lead Management
- Check if lead has been captured
- Mark lead as captured
- Submit leads with source tracking
- Track event analytics
- Send follow-up emails
- Handle multiple lead sources (BOM PDF, Design Save, Newsletter, etc.)
- Error resilience (continue if Supabase or email fails)

### Integration Tests (2 test suites)

#### 11. **checkout-flow.test.ts** - Complete Purchase Flow
- Add items → Authenticate → Create order
- Prevent checkout without authentication
- Calculate correct totals at each step
- Handle cart modifications before checkout
- Track order history
- Order creation with item details
- Error handling for payment failures
- Cart integrity maintenance

#### 12. **project-flow.test.ts** - Project Planning Workflow
- Create project → Add equipment → Generate BOM
- Manage multiple independent projects
- Track equipment changes in project
- Calculate project costs from equipment
- BOM generation from project equipment
- Handle quantities in BOM items
- Project lifecycle tracking (draft → quoted → in-progress → complete)
- Equipment validation before adding

## Key Features Tested

### Authentication & Authorization
- Login/Register flows
- Session management
- Approval workflows
- Profile management
- Subscription tiers (free vs pro)

### Shopping & Ordering
- Cart operations (add, remove, update)
- Order creation and tracking
- Payment intent creation
- Order history retrieval

### Project Management
- Project CRUD operations
- Equipment selection and placement
- Project status tracking
- BOM generation from equipment

### Catalog & Search
- Equipment filtering (category, power, brand)
- Search functionality
- Sorting options
- Equipment comparisons

### Analytics & Tracking
- Event tracking
- Page view tracking
- Lead capture tracking
- Conversion events

### Data Persistence
- localStorage for cart and auth
- Supabase integration
- Email notifications
- Lead capture storage

## Running Tests

### Basic Test Run
```bash
npm run test
```

### Watch Mode (Auto-rerun on changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```
Coverage HTML report will be generated in `coverage/` directory.

### UI Dashboard
```bash
npm run test:ui
```
Opens interactive browser dashboard at http://localhost:51204

## Mock Strategy

### Zustand Store Mocking
- Directly manipulate store state for testing
- No component wrapper needed
- Reset state in beforeEach

### Supabase Mocking
```typescript
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { /* mocked methods */ },
    from: vi.fn(() => ({ /* mocked query builder */ })),
  },
}));
```

### Module Mocking
- gastroSync (cart/project sync)
- analytics (tracking)
- email (notifications)
- payment (Stripe)

## Test Assertions

Common patterns used throughout:

```typescript
// Item counts
expect(useCartStore.getState().items).toHaveLength(1);

// Totals and calculations
expect(useCartStore.getState().getTotalPrice()).toBe(4500);

// Boolean checks
expect(useAuthStore.getState().isAuthenticated).toBe(true);

// Array operations
expect(filtered).toHaveLength(3);
expect(filtered.every(e => e.category === 'fryer')).toBe(true);

// Object properties
expect(order).toHaveProperty('id');
expect(order?.status).toBe('pending');
```

## Best Practices

1. **Setup/Teardown**: Clear state and localStorage in beforeEach
2. **Mocks**: Mock external services (Supabase, analytics, email)
3. **Isolation**: Test one concern per test
4. **Names**: Descriptive test names that explain intent
5. **Assertions**: Multiple related assertions per test OK
6. **Coverage**: Aim for >80% on public APIs

## Extending Tests

### Adding Store Tests
1. Create `src/stores/__tests__/newStore.test.ts`
2. Mock dependencies
3. Test state mutations in beforeEach
4. Test each action method
5. Test computed properties/getters

### Adding Library Tests
1. Create `src/lib/__tests__/newLib.test.ts`
2. Mock external dependencies
3. Test success and error paths
4. Test parameter variations

### Adding Integration Tests
1. Create `src/__tests__/integration/newFlow.test.ts`
2. Combine multiple stores/libraries
3. Test complete user workflows
4. Verify state consistency across operations

## CI/CD Integration

The test suite is ready for CI/CD pipelines:

```yaml
# Example GitHub Actions
- run: npm ci
- run: npm run lint
- run: npm run test
- run: npm run test:coverage
```

## Dependencies

All test dependencies are in `package.json`:
- vitest: ^4.1.4
- @testing-library/react: ^16.3.2
- @testing-library/jest-dom: ^6.9.1
- @testing-library/user-event: ^14.6.1
- jsdom: ^29.0.2

## Notes

- Tests do NOT require VM memory to run (no actual browser)
- TypeScript types are available for all store APIs
- Mock setup is isolated per test suite
- localStorage is properly cleaned between tests
- All async operations are properly awaited

## Troubleshooting

### localStorage issues
Ensure setup.ts is loaded before tests run via vitest.config.ts

### Mock not working
Check vi.mock() is at top of file before imports

### Async test timeout
Increase timeout in vitest.config.ts or individual tests

### TypeScript errors
Run `npm run lint` to check tsconfig compatibility

---

**Created:** April 2026
**Framework:** React 19 + TypeScript + Zustand + Vitest
**Project:** 2MC Gastro Commercial Kitchen Management
