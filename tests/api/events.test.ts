import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Events API", () => {
  let createdEventId: string;

  describe("GET /api/events", () => {
    it("should return 200 and list events", async () => {
      const response = await authenticatedGet("/api/events?page=1&limit=20&sort=ASC");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/events", () => {
    it("should return 200 and create event", async () => {
      const response = await authenticatedPost("/api/events", {
        title: "Test Event",
        description: "Test event description",
        startDate: "2024-12-15",
        endDate: "2024-12-16",
        place: "Test Location"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdEventId = response.body.data.id;
      }
    });
  });

  describe("GET /api/events/:id", () => {
    it("should return 200 and get event by id", async () => {
      if (!createdEventId) {
        const createResponse = await authenticatedPost("/api/events", {
          title: "Test Event for Get",
          description: "Description",
          startDate: "2024-12-15",
          endDate: "2024-12-16",
          place: "Location"
        });
        createdEventId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/events/${createdEventId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/events/:id", () => {
    it("should return 200 and update event", async () => {
      if (!createdEventId) {
        const createResponse = await authenticatedPost("/api/events", {
          title: "Test Event for Update",
          description: "Description",
          startDate: "2024-12-15",
          endDate: "2024-12-16",
          place: "Location"
        });
        createdEventId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/events/${createdEventId}`, {
        title: "Updated Test Event",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/events/:id/register", () => {
    it("should return 200 and register for event", async () => {
      if (!createdEventId) {
        const createResponse = await authenticatedPost("/api/events", {
          title: "Test Event for Registration",
          description: "Description",
          startDate: "2024-12-15",
          endDate: "2024-12-16",
          place: "Location"
        });
        createdEventId = createResponse.body.data?.id;
      }

      const response = await authenticatedPost(`/api/events/${createdEventId}/register`, {});
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/events/:id/unregister", () => {
    it("should return 200 and unregister from event", async () => {
      if (!createdEventId) {
        const createResponse = await authenticatedPost("/api/events", {
          title: "Test Event for Unregistration",
          description: "Description",
          startDate: "2024-12-15",
          endDate: "2024-12-16",
          place: "Location"
        });
        createdEventId = createResponse.body.data?.id;

        // Register first
        await authenticatedPost(`/api/events/${createdEventId}/register`, {});
      }

      const response = await authenticatedPost(`/api/events/${createdEventId}/unregister`, {});
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/events/:id", () => {
    it("should return 200 and delete event", async () => {
      const createResponse = await authenticatedPost("/api/events", {
        title: "Test Event to Delete",
        description: "Description to delete",
        startDate: "2024-12-15",
        endDate: "2024-12-16",
        place: "Location"
      });
      const eventIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/events/${eventIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
