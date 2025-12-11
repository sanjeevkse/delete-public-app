import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("PA Events API", () => {
  let createdPAEventId: string;

  describe("GET /api/pa-events", () => {
    it("should return 200 and list PA events", async () => {
      const response = await authenticatedGet("/api/pa-events?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/pa-events", () => {
    it("should return 200 and create PA event", async () => {
      const response = await authenticatedPost("/api/pa-events", {
        title: "Test PA Event",
        description: "Test PA event description",
        startDate: "2024-12-15",
        endDate: "2024-12-16"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdPAEventId = response.body.data.id;
      }
    });
  });

  describe("GET /api/pa-events/:id", () => {
    it("should return 200 and get PA event by id", async () => {
      if (!createdPAEventId) {
        const createResponse = await authenticatedPost("/api/pa-events", {
          title: "Test PA Event for Get",
          description: "Description",
          startDate: "2024-12-15",
          endDate: "2024-12-16"
        });
        createdPAEventId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/pa-events/${createdPAEventId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/pa-events/:id", () => {
    it("should return 200 and update PA event", async () => {
      if (!createdPAEventId) {
        const createResponse = await authenticatedPost("/api/pa-events", {
          title: "Test PA Event for Update",
          description: "Description",
          startDate: "2024-12-15",
          endDate: "2024-12-16"
        });
        createdPAEventId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/pa-events/${createdPAEventId}`, {
        title: "Updated Test PA Event",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/pa-events/:id", () => {
    it("should return 200 and delete PA event", async () => {
      const createResponse = await authenticatedPost("/api/pa-events", {
        title: "Test PA Event to Delete",
        description: "Description to delete",
        startDate: "2024-12-15",
        endDate: "2024-12-16"
      });
      const eventIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/pa-events/${eventIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Ward Numbers API", () => {
  let createdWardId: string;

  describe("GET /api/ward-numbers", () => {
    it("should return 200 and list ward numbers", async () => {
      const response = await authenticatedGet("/api/ward-numbers?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/ward-numbers", () => {
    it("should return 200 and create ward number", async () => {
      const response = await authenticatedPost("/api/ward-numbers", {
        wardNumber: "123",
        wardName: "Test Ward"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdWardId = response.body.data.id;
      }
    });
  });

  describe("GET /api/ward-numbers/:id", () => {
    it("should return 200 and get ward number by id", async () => {
      if (!createdWardId) {
        const createResponse = await authenticatedPost("/api/ward-numbers", {
          wardNumber: "124",
          wardName: "Test Ward for Get"
        });
        createdWardId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/ward-numbers/${createdWardId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/ward-numbers/:id", () => {
    it("should return 200 and update ward number", async () => {
      if (!createdWardId) {
        const createResponse = await authenticatedPost("/api/ward-numbers", {
          wardNumber: "125",
          wardName: "Test Ward for Update"
        });
        createdWardId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/ward-numbers/${createdWardId}`, {
        wardName: "Updated Test Ward"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/ward-numbers/:id", () => {
    it("should return 200 and delete ward number", async () => {
      const createResponse = await authenticatedPost("/api/ward-numbers", {
        wardNumber: "126",
        wardName: "Test Ward to Delete"
      });
      const wardIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/ward-numbers/${wardIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Booth Numbers API", () => {
  let createdBoothId: string;

  describe("GET /api/booth-numbers", () => {
    it("should return 200 and list booth numbers", async () => {
      const response = await authenticatedGet("/api/booth-numbers?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/booth-numbers", () => {
    it("should return 200 and create booth number", async () => {
      const response = await authenticatedPost("/api/booth-numbers", {
        boothNumber: "456",
        boothName: "Test Booth"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdBoothId = response.body.data.id;
      }
    });
  });

  describe("GET /api/booth-numbers/:id", () => {
    it("should return 200 and get booth number by id", async () => {
      if (!createdBoothId) {
        const createResponse = await authenticatedPost("/api/booth-numbers", {
          boothNumber: "457",
          boothName: "Test Booth for Get"
        });
        createdBoothId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/booth-numbers/${createdBoothId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/booth-numbers/:id", () => {
    it("should return 200 and update booth number", async () => {
      if (!createdBoothId) {
        const createResponse = await authenticatedPost("/api/booth-numbers", {
          boothNumber: "458",
          boothName: "Test Booth for Update"
        });
        createdBoothId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/booth-numbers/${createdBoothId}`, {
        boothName: "Updated Test Booth"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/booth-numbers/:id", () => {
    it("should return 200 and delete booth number", async () => {
      const createResponse = await authenticatedPost("/api/booth-numbers", {
        boothNumber: "459",
        boothName: "Test Booth to Delete"
      });
      const boothIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/booth-numbers/${boothIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
