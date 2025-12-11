import request from "supertest";
// Import models to initialize associations before importing app
import "../../src/models";
import app, { registerErrorHandlers } from "../../src/app";

// Register error handlers once for all tests
registerErrorHandlers();

export const testApp = app;

interface AuthTokens {
  authToken: string;
  userId: string;
}

let cachedTokens: AuthTokens | null = null;
let authInProgress: Promise<AuthTokens> | null = null;

/**
 * Helper function to get authentication token for tests
 * This will request OTP and login once, then cache the token
 * Uses a promise to prevent multiple concurrent auth requests
 */
export const getAuthToken = async (): Promise<AuthTokens> => {
  // Return cached token if available
  if (cachedTokens) {
    return cachedTokens;
  }

  // If authentication is already in progress, wait for it
  if (authInProgress) {
    return authInProgress;
  }

  // Start authentication
  authInProgress = (async () => {
    // Use a unique test phone number
    const contactNumber = "8888888888";

    // Request OTP
    const otpResponse = await request(app).post("/api/auth/request-otp").send({ contactNumber });

    if (otpResponse.status !== 200) {
      authInProgress = null;
      throw new Error(`Failed to request OTP: ${otpResponse.status}`);
    }

    const otp = otpResponse.body.data?.otp;
    if (!otp) {
      authInProgress = null;
      throw new Error("OTP not found in response");
    }

    // Login with OTP
    const loginResponse = await request(app).post("/api/auth/login").send({ contactNumber, otp });

    if (loginResponse.status !== 200) {
      authInProgress = null;
      throw new Error(`Failed to login: ${loginResponse.status}`);
    }

    cachedTokens = {
      authToken: loginResponse.body.data.token,
      userId: loginResponse.body.data.user.id
    };

    authInProgress = null;
    return cachedTokens;
  })();

  return authInProgress;
};

/**
 * Helper to clear cached tokens (useful for testing logout scenarios)
 */
export const clearAuthToken = (): void => {
  cachedTokens = null;
};

/**
 * Helper to make authenticated GET request
 */
export const authenticatedGet = async (url: string) => {
  const { authToken } = await getAuthToken();
  return request(app).get(url).set("Authorization", `Bearer ${authToken}`);
};

/**
 * Helper to make authenticated POST request
 */
export const authenticatedPost = async (url: string, data?: any) => {
  const { authToken } = await getAuthToken();
  return request(app)
    .post(url)
    .set("Authorization", `Bearer ${authToken}`)
    .send(data || {});
};

/**
 * Helper to make authenticated PUT request
 */
export const authenticatedPut = async (url: string, data?: any) => {
  const { authToken } = await getAuthToken();
  return request(app)
    .put(url)
    .set("Authorization", `Bearer ${authToken}`)
    .send(data || {});
};

/**
 * Helper to make authenticated PATCH request
 */
export const authenticatedPatch = async (url: string, data?: any) => {
  const { authToken } = await getAuthToken();
  return request(app)
    .patch(url)
    .set("Authorization", `Bearer ${authToken}`)
    .send(data || {});
};

/**
 * Helper to make authenticated DELETE request
 */
export const authenticatedDelete = async (url: string) => {
  const { authToken } = await getAuthToken();
  return request(app).delete(url).set("Authorization", `Bearer ${authToken}`);
};
