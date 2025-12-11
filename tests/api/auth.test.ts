import request from "supertest";
import { testApp } from "../helpers/testHelpers";

describe("Auth API", () => {
  describe("POST /api/auth/request-otp", () => {
    it("should return 200 and generate OTP", async () => {
      const response = await request(testApp)
        .post("/api/auth/request-otp")
        .send({ contactNumber: "9898989898" });

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should return 200 and login successfully", async () => {
      // First request OTP
      const otpResponse = await request(testApp)
        .post("/api/auth/request-otp")
        .send({ contactNumber: "9898989898" });

      const otp = otpResponse.body.data?.otp;

      // Then login
      const response = await request(testApp)
        .post("/api/auth/login")
        .send({ contactNumber: "9898989898", otp });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/auth/profile", () => {
    it("should return 200 and get user profile", async () => {
      // Login first
      const otpResponse = await request(testApp)
        .post("/api/auth/request-otp")
        .send({ contactNumber: "9898989898" });

      const otp = otpResponse.body.data?.otp;

      const loginResponse = await request(testApp)
        .post("/api/auth/login")
        .send({ contactNumber: "9898989898", otp });

      const token = loginResponse.body.data.token;

      const response = await request(testApp)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("PATCH /api/auth/profile", () => {
    it("should return 200 and update profile", async () => {
      // Login first
      const otpResponse = await request(testApp)
        .post("/api/auth/request-otp")
        .send({ contactNumber: "9898989898" });

      const otp = otpResponse.body.data?.otp;

      const loginResponse = await request(testApp)
        .post("/api/auth/login")
        .send({ contactNumber: "9898989898", otp });

      const token = loginResponse.body.data.token;

      const response = await request(testApp)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Test User" });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/auth/sidebar", () => {
    it("should return 200 and get sidebar entries", async () => {
      // Login first
      const otpResponse = await request(testApp)
        .post("/api/auth/request-otp")
        .send({ contactNumber: "9898989898" });

      const otp = otpResponse.body.data?.otp;

      const loginResponse = await request(testApp)
        .post("/api/auth/login")
        .send({ contactNumber: "9898989898", otp });

      const token = loginResponse.body.data.token;

      const response = await request(testApp)
        .get("/api/auth/sidebar")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });
});
