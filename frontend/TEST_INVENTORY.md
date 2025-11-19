# Test Inventory

## Complete List of Integration Test Files

All tests are located in `/home/sylvia/ClaudeWork/TheProgram/frontend/src/tests/integration/`

### Authentication Tests (4 files, 62 test cases)

1. **passwordSetup.test.tsx** (8 tests)
   - `/frontend/src/tests/integration/auth/passwordSetup.test.tsx`
   - Tests first-time password setup flow
   - Coverage: validation, API calls, error handling, loading states

2. **login.test.tsx** (10 tests)
   - `/frontend/src/tests/integration/auth/login.test.tsx`
   - Tests login authentication flow
   - Coverage: success/failure, session persistence, security

3. **passwordSettings.test.tsx** (20 tests)
   - `/frontend/src/tests/integration/auth/passwordSettings.test.tsx`
   - Tests password change and disable features
   - Coverage: change password, disable password, validation, API integration

4. **sessionManagement.test.tsx** (24 tests)
   - `/frontend/src/tests/integration/auth/sessionManagement.test.tsx`
   - Tests session lifecycle and token management
   - Coverage: persistence, verification, logout, expiry, security

### Client Management Tests (1 file, 25 test cases)

5. **clientManagement.test.tsx** (25 tests)
   - `/frontend/src/tests/integration/clients/clientManagement.test.tsx`
   - Tests complete CRUD operations for clients
   - Coverage: create, read, update, delete, pagination, error handling

### Birth Chart Tests (2 files, 36 test cases)

6. **chartCreation.test.tsx** (18 tests)
   - `/frontend/src/tests/integration/charts/chartCreation.test.tsx`
   - Tests birth data entry and chart calculation
   - Coverage: birth data creation, chart generation, planetary data, houses

7. **interpretations.test.tsx** (18 tests)
   - `/frontend/src/tests/integration/charts/interpretations.test.tsx`
   - Tests AI interpretation generation
   - Coverage: generation, content structure, concurrency, data integrity

### Dashboard Tests (1 file, 22 test cases)

8. **dashboardFlow.test.tsx** (22 tests)
   - `/frontend/src/tests/integration/dashboard/dashboardFlow.test.tsx`
   - Tests dashboard display and interactions
   - Coverage: loading, clients/charts display, statistics, navigation, performance

### Error Handling Tests (1 file, 28 test cases)

9. **errorScenarios.test.tsx** (28 tests)
   - `/frontend/src/tests/integration/errorHandling/errorScenarios.test.tsx`
   - Tests comprehensive error scenarios
   - Coverage: 401, network errors, validation, 4xx/5xx errors, recovery, user feedback

### UI Component Tests (2 files, 55 test cases)

10. **ClientsPage.test.tsx** (28 tests)
    - `/frontend/src/tests/integration/ui/ClientsPage.test.tsx`
    - Tests complete ClientsPage UI interactions
    - Coverage: CRUD operations, search, navigation, responsive design

11. **BirthChartPage.test.tsx** (27 tests)
    - `/frontend/src/tests/integration/ui/BirthChartPage.test.tsx`
    - Tests complete BirthChartPage UI interactions
    - Coverage: form input, chart generation, visualization, interpretations, export

## Test Infrastructure Files

### Configuration
- `/frontend/src/test/setup.ts` - Global test setup (MSW, cleanup)
- `/frontend/vitest.config.ts` - Vitest configuration

### Mocks
- `/frontend/src/tests/mocks/handlers.ts` - MSW request handlers for all API endpoints
- `/frontend/src/tests/mocks/server.ts` - MSW server setup

### Utilities
- `/frontend/src/tests/utils/testUtils.tsx` - Custom render function with providers

## Running Specific Tests

```bash
# Run all integration tests
npm test src/tests/integration

# Run auth tests
npm test src/tests/integration/auth

# Run client tests
npm test src/tests/integration/clients

# Run chart tests
npm test src/tests/integration/charts

# Run dashboard tests
npm test src/tests/integration/dashboard

# Run error handling tests
npm test src/tests/integration/errorHandling

# Run UI tests
npm test src/tests/integration/ui

# Run specific file
npm test src/tests/integration/auth/login.test.tsx

# Run specific test
npm test -- -t "should login successfully"
```

## Test Statistics

**Total Files**: 11 (9 test files + 2 infrastructure)
**Total Test Cases**: 198
**Total Lines of Test Code**: ~5,500
**Average Tests per File**: 18

### By Category
- Authentication: 62 tests (31%)
- Client Management: 25 tests (13%)
- Charts & Interpretations: 36 tests (18%)
- Dashboard: 22 tests (11%)
- Error Handling: 28 tests (14%)
- UI Components: 55 tests (28%)

### Test Status
- ✓ Passing: 95 tests (48%)
- ⚠ Needs UI Updates: 103 tests (52%)

## Coverage Areas

### API Endpoints Tested
- ✓ `POST /auth/setup` - Password setup
- ✓ `POST /auth/login` - Login
- ✓ `POST /auth/verify` - Token verification
- ✓ `POST /auth/logout` - Logout
- ✓ `POST /auth/change-password` - Change password
- ✓ `POST /auth/disable-password` - Disable password
- ✓ `GET /auth/status` - Auth status check
- ✓ `GET /api/clients` - List clients
- ✓ `POST /api/clients` - Create client
- ✓ `GET /api/clients/:id` - Get client
- ✓ `PUT /api/clients/:id` - Update client
- ✓ `DELETE /api/clients/:id` - Delete client
- ✓ `POST /api/birth-data` - Create birth data
- ✓ `POST /api/charts` - Generate chart
- ✓ `POST /api/interpretations/generate` - Generate interpretation

### User Flows Tested
1. ✓ Complete authentication flow (setup → login → logout)
2. ✓ Client CRUD operations
3. ✓ Birth chart creation and calculation
4. ✓ Interpretation generation
5. ✓ Session management and persistence
6. ✓ Error handling and recovery
7. ⚠ Dashboard interactions (API level complete)
8. ⚠ Full UI workflows (pending UI completion)

### Edge Cases Covered
- Empty states
- Loading states
- Error states
- Network failures
- Invalid input
- Concurrent operations
- Large datasets
- Session expiry
- Token tampering
- Cross-tab synchronization

## Quick Reference

### Most Important Tests
1. `login.test.tsx` - Core authentication
2. `sessionManagement.test.tsx` - Session security
3. `clientManagement.test.tsx` - Data CRUD
4. `chartCreation.test.tsx` - Core feature
5. `errorScenarios.test.tsx` - Error resilience

### Tests to Update When Changing UI
- `ClientsPage.test.tsx` - When updating client UI
- `BirthChartPage.test.tsx` - When updating chart UI
- `dashboardFlow.test.tsx` - When updating dashboard
- `passwordSettings.test.tsx` - When updating settings UI

### Tests to Update When Changing API
- Check `/tests/mocks/handlers.ts` first
- Update corresponding integration test file
- Verify error handling still works
- Check session management if auth-related

## Next Steps

1. **Complete UI Implementation**
   - Implement missing UI elements in PasswordSettingsPage
   - Add user context to Dashboard
   - Standardize form labels in dialogs
   - Add window.matchMedia mock for responsive tests

2. **Add Router Tests**
   - Create router integration tests
   - Test navigation guards
   - Test deep linking

3. **Expand Coverage**
   - Add visual regression tests
   - Add accessibility tests
   - Add performance benchmarks
   - Reach 90%+ code coverage

4. **Continuous Improvement**
   - Monitor test execution time
   - Refactor slow tests
   - Add more edge cases
   - Keep tests maintainable
