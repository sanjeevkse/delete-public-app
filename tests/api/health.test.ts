import request from "supertest";
import { testApp } from "../helpers/testHelpers";

describe("Health Check API", () => {
  describe("GET /api/health", () => {
    it("should return 200 and health status", async () => {
      const response = await request(testApp).get("/api/health");
      expect(response.status).toBe(200);
    });
  });
});
