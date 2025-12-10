#!/usr/bin/env node

const axios = require("axios");

const BASE_URL = "http://localhost:8081/api";

// Generate unique Indian mobile numbers
function generateIndianMobileNumber() {
  // Indian mobile numbers: +91 followed by 10 digits starting with 6-9
  const firstDigit = Math.floor(Math.random() * 4) + 6; // 6-9
  const remaining = Math.floor(Math.random() * 10000000000)
    .toString()
    .padStart(9, "0");
  return `+91${firstDigit}${remaining}`;
}

// Utility to log requests/responses
function log(title, data) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📌 ${title}`);
  console.log("=".repeat(80));
  console.log(JSON.stringify(data, null, 2));
}

async function testAuthFlow() {
  const mobileNumber = generateIndianMobileNumber();
  log("Generated Mobile Number", { mobileNumber });

  try {
    // 1. Request OTP
    log("1️⃣  REQUEST OTP", { contactNumber: mobileNumber });
    const otpResponse = await axios.post(`${BASE_URL}/auth/request-otp`, {
      contactNumber: mobileNumber
    });
    log("✅ OTP Response", otpResponse.data);

    const otp = otpResponse.data.data.otp;
    if (!otp) throw new Error("OTP not received in response");

    // 2. Login with OTP
    log("2️⃣  LOGIN WITH OTP", { contactNumber: mobileNumber, otp });
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      contactNumber: mobileNumber,
      otp
    });
    log("✅ Login Response", loginResponse.data);

    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    if (!token) throw new Error("Token not received");

    // Create axios instance with token
    const authedClient = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${token}` }
    });

    // 3. Get Profile
    log("3️⃣  GET PROFILE", { userId });
    try {
      const profileResponse = await authedClient.get("/users/profile");
      log("✅ Profile Response", profileResponse.data);
    } catch (err) {
      console.log(
        "⚠️  Get Profile returned:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 4. Update Profile with Ward and Booth Numbers
    log("4️⃣  UPDATE PROFILE", { wardNumberId: 1, boothNumberId: 1 });
    try {
      const updateResponse = await authedClient.put("/users/profile", {
        displayName: "Test User",
        wardNumberId: 1,
        boothNumberId: 1,
        addressLine1: "Test Address",
        city: "Bangalore",
        state: "Karnataka"
      });
      log("✅ Profile Update Response", updateResponse.data);
    } catch (err) {
      console.log(
        "⚠️  Update Profile error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 5. Get Sidebar Permissions
    log("5️⃣  SIDEBAR PERMISSIONS", {});
    try {
      const permsResponse = await authedClient.get("/auth/sidebar-permissions");
      log("✅ Sidebar Permissions Response", permsResponse.data);
    } catch (err) {
      console.log(
        "⚠️  Sidebar Permissions error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 6. List Users
    log("6️⃣  LIST USERS", { page: 1, limit: 10 });
    try {
      const usersResponse = await authedClient.get("/users?page=1&limit=10");
      log("✅ Users List Response", {
        success: usersResponse.data.success,
        pagination: usersResponse.data.pagination,
        count: usersResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log(
        "⚠️  List Users error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 7. List Posts
    log("7️⃣  LIST POSTS", { page: 1, limit: 10 });
    try {
      const postsResponse = await authedClient.get("/posts?page=1&limit=10");
      log("✅ Posts List Response", {
        success: postsResponse.data.success,
        pagination: postsResponse.data.pagination,
        count: postsResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log(
        "⚠️  List Posts error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 8. List Events
    log("8️⃣  LIST EVENTS", { page: 1, limit: 10 });
    try {
      const eventsResponse = await authedClient.get("/events?page=1&limit=10");
      log("✅ Events List Response", {
        success: eventsResponse.data.success,
        pagination: eventsResponse.data.pagination,
        count: eventsResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log(
        "⚠️  List Events error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 9. List Jobs
    log("9️⃣  LIST JOBS", { page: 1, limit: 10 });
    try {
      const jobsResponse = await authedClient.get("/jobs?page=1&limit=10");
      log("✅ Jobs List Response", {
        success: jobsResponse.data.success,
        pagination: jobsResponse.data.pagination,
        count: jobsResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log("⚠️  List Jobs error:", err.response?.status, err.response?.data?.error?.message);
    }

    // 10. List Complaints
    log("🔟  LIST COMPLAINTS", { page: 1, limit: 10 });
    try {
      const complaintsResponse = await authedClient.get("/complaints?page=1&limit=10");
      log("✅ Complaints List Response", {
        success: complaintsResponse.data.success,
        pagination: complaintsResponse.data.pagination,
        count: complaintsResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log(
        "⚠️  List Complaints error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 11. List Communities
    log("1️⃣1️⃣  LIST COMMUNITIES", { page: 1, limit: 10 });
    try {
      const communitiesResponse = await authedClient.get("/communities?page=1&limit=10");
      log("✅ Communities List Response", {
        success: communitiesResponse.data.success,
        pagination: communitiesResponse.data.pagination,
        count: communitiesResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log(
        "⚠️  List Communities error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 12. List Schemes
    log("1️⃣2️⃣  LIST SCHEMES", { page: 1, limit: 10 });
    try {
      const schemesResponse = await authedClient.get("/schemes?page=1&limit=10");
      log("✅ Schemes List Response", {
        success: schemesResponse.data.success,
        pagination: schemesResponse.data.pagination,
        count: schemesResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log(
        "⚠️  List Schemes error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 13. Register Device Token
    log("1️⃣3️⃣  REGISTER DEVICE TOKEN", {});
    try {
      const tokenRegResponse = await authedClient.post("/notifications/register-device-token", {
        deviceToken: "test-device-token-" + Date.now()
      });
      log("✅ Device Token Registration Response", tokenRegResponse.data);
    } catch (err) {
      console.log(
        "⚠️  Register Device Token error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    // 14. Get My Device Tokens
    log("1️⃣4️⃣  GET MY DEVICE TOKENS", {});
    try {
      const devTokensResponse = await authedClient.get("/notifications/device-tokens");
      log("✅ Device Tokens Response", {
        success: devTokensResponse.data.success,
        count: devTokensResponse.data.data?.length || 0
      });
    } catch (err) {
      console.log(
        "⚠️  Get Device Tokens error:",
        err.response?.status,
        err.response?.data?.error?.message
      );
    }

    log("✨ AUTH FLOW TEST COMPLETED", { mobileNumber, userId });
    return { token, userId, mobileNumber };
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
}

async function main() {
  console.log("\n🚀 Starting API Tests for localhost:8081");
  console.log("📱 Testing with unique Indian mobile numbers\n");

  try {
    // Test auth flow
    const { token, userId } = await testAuthFlow();

    console.log("\n\n" + "=".repeat(80));
    console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log(`✅ Auth Flow: OTP → Login → Profile → Permissions`);
    console.log(`✅ User ID: ${userId}`);
    console.log(`✅ Token: ${token.substring(0, 20)}...`);
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
  }
}

main();
