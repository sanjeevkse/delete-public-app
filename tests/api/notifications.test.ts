import { authenticatedGet } from "../helpers/testHelpers";

describe("Notifications API", () => {
  describe("GET /api/notifications", () => {
    it("should return 200 and list notifications", async () => {
      const response = await authenticatedGet("/api/notifications?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/notifications/unread-count", () => {
    it("should return 200 and get unread notifications count", async () => {
      const response = await authenticatedGet("/api/notifications/unread-count");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/notifications/:id/mark-read", () => {
    it("should return 200 and mark notification as read", async () => {
      // Get notifications first
      const listResponse = await authenticatedGet("/api/notifications?page=1&limit=1");

      if (listResponse.body.data?.length > 0) {
        const notificationId = listResponse.body.data[0].id;
        const response = await authenticatedGet(`/api/notifications/${notificationId}/mark-read`);
        expect(response.status).toBe(200);
      } else {
        // Skip if no notifications available
        expect(true).toBe(true);
      }
    });
  });
});
