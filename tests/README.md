# API Tests

This directory contains comprehensive unit tests for all API endpoints in the application.

## Test Structure

The tests are organized by API groups:

- `auth.test.ts` - Authentication endpoints (OTP, login, profile)
- `posts.test.ts` - Posts CRUD operations and reactions
- `events.test.ts` - Events management and registration
- `jobs.test.ts` - Jobs listings and management
- `notifications.test.ts` - Notifications management
- `schemes.test.ts` - Schemes, categories, and sectors
- `admin.test.ts` - Admin users, roles, permissions
- `members.test.ts` - Members management
- `communities-businesses-family.test.ts` - Communities, businesses, and family members
- `complaints.test.ts` - Complaint types, complaints, departments, and status
- `pa-events-wards-booths.test.ts` - PA events, ward numbers, and booth numbers
- `meta-forms-applications.test.ts` - Meta tables, form builder, and scheme applications
- `health.test.ts` - Health check endpoint

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage

```bash
npm run test:coverage
```

### Run specific test file

```bash
npm test -- auth.test.ts
```

## Test Setup

1. **Environment Configuration**: Create a `.env.test` file based on `.env.test.example`
2. **Database**: Ensure your test database is set up and accessible
3. **Authentication**: Tests automatically handle authentication using the helper functions

## Test Helpers

Located in `helpers/testHelpers.ts`, these provide:

- `getAuthToken()` - Get authentication token for tests
- `authenticatedGet()` - Make authenticated GET requests
- `authenticatedPost()` - Make authenticated POST requests
- `authenticatedPut()` - Make authenticated PUT requests
- `authenticatedPatch()` - Make authenticated PATCH requests
- `authenticatedDelete()` - Make authenticated DELETE requests

## Test Coverage

All tests perform simple 200 status code checks for successful API responses. These are positive test cases that verify the endpoints are working correctly.

## Notes

- Tests use the contact number `9898989898` for authentication
- Each test suite creates and cleans up its own test data
- Tests run with a 30-second timeout to accommodate slower operations
- The test app instance is shared across all tests for better performance
