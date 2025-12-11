import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Schemes API", () => {
  let createdSchemeId: string;

  describe("GET /api/schemes", () => {
    it("should return 200 and list schemes", async () => {
      const response = await authenticatedGet("/api/schemes?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/schemes", () => {
    it("should return 200 and create scheme", async () => {
      const response = await authenticatedPost("/api/schemes", {
        title: "Test Scheme",
        description: "Test scheme description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdSchemeId = response.body.data.id;
      }
    });
  });

  describe("GET /api/schemes/:id", () => {
    it("should return 200 and get scheme by id", async () => {
      if (!createdSchemeId) {
        const createResponse = await authenticatedPost("/api/schemes", {
          title: "Test Scheme for Get",
          description: "Description"
        });
        createdSchemeId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/schemes/${createdSchemeId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/schemes/:id", () => {
    it("should return 200 and update scheme", async () => {
      if (!createdSchemeId) {
        const createResponse = await authenticatedPost("/api/schemes", {
          title: "Test Scheme for Update",
          description: "Description"
        });
        createdSchemeId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/schemes/${createdSchemeId}`, {
        title: "Updated Test Scheme",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/schemes/:id", () => {
    it("should return 200 and delete scheme", async () => {
      const createResponse = await authenticatedPost("/api/schemes", {
        title: "Test Scheme to Delete",
        description: "Description to delete"
      });
      const schemeIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/schemes/${schemeIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Scheme Categories API", () => {
  let createdCategoryId: string;

  describe("GET /api/scheme-categories", () => {
    it("should return 200 and list scheme categories", async () => {
      const response = await authenticatedGet("/api/scheme-categories?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/scheme-categories", () => {
    it("should return 200 and create scheme category", async () => {
      const response = await authenticatedPost("/api/scheme-categories", {
        name: "Test Category"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdCategoryId = response.body.data.id;
      }
    });
  });

  describe("GET /api/scheme-categories/:id", () => {
    it("should return 200 and get scheme category by id", async () => {
      if (!createdCategoryId) {
        const createResponse = await authenticatedPost("/api/scheme-categories", {
          name: "Test Category for Get"
        });
        createdCategoryId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/scheme-categories/${createdCategoryId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/scheme-categories/:id", () => {
    it("should return 200 and update scheme category", async () => {
      if (!createdCategoryId) {
        const createResponse = await authenticatedPost("/api/scheme-categories", {
          name: "Test Category for Update"
        });
        createdCategoryId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/scheme-categories/${createdCategoryId}`, {
        name: "Updated Test Category"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/scheme-categories/:id", () => {
    it("should return 200 and delete scheme category", async () => {
      const createResponse = await authenticatedPost("/api/scheme-categories", {
        name: "Test Category to Delete"
      });
      const categoryIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/scheme-categories/${categoryIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Scheme Sectors API", () => {
  let createdSectorId: string;

  describe("GET /api/scheme-sectors", () => {
    it("should return 200 and list scheme sectors", async () => {
      const response = await authenticatedGet("/api/scheme-sectors?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/scheme-sectors", () => {
    it("should return 200 and create scheme sector", async () => {
      const response = await authenticatedPost("/api/scheme-sectors", {
        name: "Test Sector"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdSectorId = response.body.data.id;
      }
    });
  });

  describe("GET /api/scheme-sectors/:id", () => {
    it("should return 200 and get scheme sector by id", async () => {
      if (!createdSectorId) {
        const createResponse = await authenticatedPost("/api/scheme-sectors", {
          name: "Test Sector for Get"
        });
        createdSectorId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/scheme-sectors/${createdSectorId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/scheme-sectors/:id", () => {
    it("should return 200 and update scheme sector", async () => {
      if (!createdSectorId) {
        const createResponse = await authenticatedPost("/api/scheme-sectors", {
          name: "Test Sector for Update"
        });
        createdSectorId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/scheme-sectors/${createdSectorId}`, {
        name: "Updated Test Sector"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/scheme-sectors/:id", () => {
    it("should return 200 and delete scheme sector", async () => {
      const createResponse = await authenticatedPost("/api/scheme-sectors", {
        name: "Test Sector to Delete"
      });
      const sectorIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/scheme-sectors/${sectorIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
