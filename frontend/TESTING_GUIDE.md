# Testing Guide for The Program Frontend

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test src/tests/integration/auth/login.test.tsx

# Run tests with coverage
npm test:coverage

# Run tests with UI
npm test:ui
```

## Test Structure

```
frontend/src/
├── test/
│   └── setup.ts                 # Global test configuration
├── tests/
│   ├── mocks/
│   │   ├── handlers.ts          # MSW request handlers
│   │   └── server.ts            # Mock server setup
│   ├── utils/
│   │   └── testUtils.tsx        # Custom render function
│   └── integration/
│       ├── auth/                # Authentication tests
│       │   ├── passwordSetup.test.tsx
│       │   ├── login.test.tsx
│       │   ├── passwordSettings.test.tsx
│       │   └── sessionManagement.test.tsx
│       ├── clients/             # Client management tests
│       │   └── clientManagement.test.tsx
│       ├── charts/              # Birth chart tests
│       │   ├── chartCreation.test.tsx
│       │   └── interpretations.test.tsx
│       ├── dashboard/           # Dashboard tests
│       │   └── dashboardFlow.test.tsx
│       ├── errorHandling/       # Error scenario tests
│       │   └── errorScenarios.test.tsx
│       └── ui/                  # UI component tests
│           ├── ClientsPage.test.tsx
│           └── BirthChartPage.test.tsx
```

## Writing Tests

### Basic Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'

// Component or API to test
import { YourComponent } from '@/features/your-feature/YourComponent'

// Don't mock stores for integration tests
vi.unmock('@/store/authStore')

describe('Your Feature Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated state
    setMockPasswordState(true, 'test1234')
    localStorage.setItem('session_token', 'mock-jwt-token-abc123')

    useAuthStore.setState({
      isAuthenticated: true,
      token: 'mock-jwt-token-abc123',
      needsPasswordSetup: false,
      isLoading: false,
      error: null,
    })
  })

  describe('Feature Name', () => {
    it('should do something specific', async () => {
      const user = userEvent.setup()
      renderWithProviders(<YourComponent />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/expected text/i)).toBeInTheDocument()
      })

      // Interact with UI
      const button = screen.getByRole('button', { name: /click me/i })
      await user.click(button)

      // Verify result
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument()
      })
    })
  })
})
```

### Testing User Interactions

```typescript
// Setup user event
const user = userEvent.setup()

// Click button
await user.click(screen.getByRole('button', { name: /submit/i }))

// Type in input
await user.type(screen.getByLabelText(/email/i), 'test@example.com')

// Clear input
await user.clear(screen.getByLabelText(/email/i))

// Select option
await user.selectOptions(
  screen.getByLabelText(/country/i),
  screen.getByRole('option', { name: 'United States' })
)

// Check checkbox
await user.click(screen.getByRole('checkbox', { name: /agree/i }))
```

### Testing Async Operations

```typescript
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument()
})

// Wait for element to disappear
await waitFor(() => {
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})

// Wait with timeout
await waitFor(() => {
  expect(screen.getByText(/slow operation/i)).toBeInTheDocument()
}, { timeout: 5000 })

// Find async element
const asyncElement = await screen.findByText(/async content/i)
expect(asyncElement).toBeInTheDocument()
```

### Testing API Calls

```typescript
import { createClient } from '@/lib/api/clients'

// Test successful API call
it('should create client', async () => {
  const client = await createClient({
    first_name: 'John',
    last_name: 'Doe',
  })

  expect(client.id).toBeDefined()
  expect(client.first_name).toBe('John')
})

// Test API error
it('should handle API error', async () => {
  try {
    await createClient({ first_name: '' })
    expect.fail('Should have thrown error')
  } catch (error: any) {
    expect(error.response.status).toBe(422)
  }
})
```

### Mocking API Responses

```typescript
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/mocks/server'

// Override default handler for specific test
it('should handle server error', async () => {
  server.use(
    http.get('http://localhost:8000/api/clients', () => {
      return HttpResponse.json(
        { detail: 'Internal server error' },
        { status: 500 }
      )
    })
  )

  // Your test code here
})
```

### Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const user = userEvent.setup()
  renderWithProviders(<YourForm />)

  // Fill form
  await user.type(screen.getByLabelText(/name/i), 'John Doe')
  await user.type(screen.getByLabelText(/email/i), 'john@example.com')

  // Submit
  await user.click(screen.getByRole('button', { name: /submit/i }))

  // Verify success
  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument()
  })
})

it('should show validation errors', async () => {
  const user = userEvent.setup()
  renderWithProviders(<YourForm />)

  // Submit without filling
  await user.click(screen.getByRole('button', { name: /submit/i }))

  // Check validation
  const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement
  expect(nameInput.validity.valid).toBe(false)
})
```

### Testing Navigation

```typescript
it('should navigate to details page', async () => {
  const user = userEvent.setup()
  renderWithProviders(<YourComponent />)

  const link = screen.getByRole('link', { name: /view details/i })
  await user.click(link)

  // Verify link href
  expect(link).toHaveAttribute('href', '/details/123')
})
```

### Testing Loading States

```typescript
it('should show loading spinner', async () => {
  renderWithProviders(<YourComponent />)

  // Loading should appear
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Wait for content
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    expect(screen.getByText(/content/i)).toBeInTheDocument()
  })
})
```

### Testing Error States

```typescript
it('should display error message', async () => {
  server.use(
    http.get('http://localhost:8000/api/data', () => {
      return HttpResponse.json(
        { detail: 'Something went wrong' },
        { status: 500 }
      )
    })
  )

  renderWithProviders(<YourComponent />)

  await waitFor(() => {
    expect(screen.getByText(/error|failed/i)).toBeInTheDocument()
  })
})
```

## Common Queries

### Finding Elements

```typescript
// By role (preferred)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { name: /title/i })

// By label
screen.getByLabelText(/password/i)

// By placeholder
screen.getByPlaceholderText(/enter email/i)

// By text
screen.getByText(/welcome back/i)

// By test ID (last resort)
screen.getByTestId('custom-element')

// Query variants
screen.getByX()      // Throws if not found
screen.queryByX()    // Returns null if not found
screen.findByX()     // Async, waits for element
screen.getAllByX()   // Returns array
```

### Assertions

```typescript
// Element presence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Visibility
expect(element).toBeVisible()
expect(element).not.toBeVisible()

// Disabled state
expect(button).toBeDisabled()
expect(button).toBeEnabled()

// Text content
expect(element).toHaveTextContent('Hello')
expect(element).toHaveTextContent(/hello/i)

// Attributes
expect(link).toHaveAttribute('href', '/home')
expect(input).toHaveValue('test@example.com')

// Form validation
expect(input).toBeRequired()
expect(input).toBeInvalid()
expect(input).toBeValid()

// Classes
expect(element).toHaveClass('active')
```

## Best Practices

### DO
- ✓ Use `renderWithProviders` for all component tests
- ✓ Wait for async operations with `waitFor` or `findBy`
- ✓ Query by role and accessible names (screen readers)
- ✓ Clean up after tests (localStorage, mocks)
- ✓ Test user behavior, not implementation
- ✓ Write descriptive test names
- ✓ Use `beforeEach` for common setup
- ✓ Test one thing per test
- ✓ Use realistic test data

### DON'T
- ✗ Don't use `setTimeout` in tests
- ✗ Don't test implementation details
- ✗ Don't query by class names or IDs (use roles)
- ✗ Don't mock zustand stores in integration tests
- ✗ Don't skip cleanup
- ✗ Don't write brittle tests
- ✗ Don't test third-party libraries
- ✗ Don't forget to await async operations

## Debugging Tests

### View Component Output
```typescript
import { screen } from '@testing-library/react'

// Print DOM
screen.debug()

// Print specific element
screen.debug(screen.getByRole('button'))

// Use logRoles to see available roles
import { logRoles } from '@testing-library/react'
const { container } = renderWithProviders(<Component />)
logRoles(container)
```

### Run Single Test
```bash
# Run specific test
npm test -- -t "should login successfully"

# Run specific file
npm test src/tests/integration/auth/login.test.tsx

# Run in watch mode
npm test -- --watch
```

### Use Test UI
```bash
npm test:ui
```

## Troubleshooting

### Test Timeout
```typescript
// Increase timeout for slow operations
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument()
}, { timeout: 10000 })
```

### Element Not Found
```typescript
// Use screen.debug() to see what's rendered
screen.debug()

// Use findBy for async elements
const element = await screen.findByText(/async content/i)

// Check if element exists but is hidden
const element = screen.queryByText(/hidden/i, { hidden: true })
```

### Mock Not Working
```typescript
// Make sure to reset mocks
beforeEach(() => {
  resetMocks()
  server.resetHandlers()
})

// Check MSW handler is correct
// Handlers are in /tests/mocks/handlers.ts
```

### State Not Updating
```typescript
// Make sure to use unmock for stores
vi.unmock('@/store/authStore')

// Verify state is set correctly
beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    // ... other state
  })
})
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For questions or issues with tests:
1. Check this guide first
2. Review existing test examples
3. Check test output with `screen.debug()`
4. Review the detailed test report in `INTEGRATION_TEST_REPORT.md`
