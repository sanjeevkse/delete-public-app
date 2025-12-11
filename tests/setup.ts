import dotenv from "dotenv";

// Load test environment variables BEFORE any other imports
// This ensures env.ts picks up the test configuration
dotenv.config({ path: ".env.test" });

import { getAuthToken } from "./helpers/testHelpers";

// Set default timeout for all tests
jest.setTimeout(30000);

// Global test setup - runs once before all tests
// Using a global flag to ensure authentication happens only once
(global as any).__TEST_AUTH_INITIALIZED__ = (global as any).__TEST_AUTH_INITIALIZED__ || false;

beforeAll(async () => {
  if (!(global as any).__TEST_AUTH_INITIALIZED__) {
    console.log("Initializing test authentication...");
    try {
      await getAuthToken();
      console.log("✓ Authentication successful");
      (global as any).__TEST_AUTH_INITIALIZED__ = true;
    } catch (error) {
      console.error("✗ Failed to authenticate:", error);
      throw error; // Fail fast if auth doesn't work
    }
  }
});

afterAll(() => {
  // Cleanup happens after all tests complete
});
