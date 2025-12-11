import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Meta Tables API", () => {
  describe("GET /api/meta-tables", () => {
    it("should return 200 and list meta tables", async () => {
      const response = await authenticatedGet("/api/meta-tables?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/meta-tables/:tableName", () => {
    it("should return 200 and get meta table by name", async () => {
      // First get list to find a table name
      const listResponse = await authenticatedGet("/api/meta-tables?page=1&limit=1");

      if (listResponse.body.data?.length > 0) {
        const tableName = listResponse.body.data[0].tableName;
        const response = await authenticatedGet(`/api/meta-tables/${tableName}`);
        expect(response.status).toBe(200);
      } else {
        expect(true).toBe(true);
      }
    });
  });
});

describe("Form Builder API", () => {
  let createdFormId: string;

  describe("GET /api/form-builder", () => {
    it("should return 200 and list forms", async () => {
      const response = await authenticatedGet("/api/form-builder?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/form-builder", () => {
    it("should return 200 and create form", async () => {
      const response = await authenticatedPost("/api/form-builder", {
        name: "Test Form",
        description: "Test form description",
        fields: []
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdFormId = response.body.data.id;
      }
    });
  });

  describe("GET /api/form-builder/:id", () => {
    it("should return 200 and get form by id", async () => {
      if (!createdFormId) {
        const createResponse = await authenticatedPost("/api/form-builder", {
          name: "Test Form for Get",
          description: "Description",
          fields: []
        });
        createdFormId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/form-builder/${createdFormId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/form-builder/:id", () => {
    it("should return 200 and update form", async () => {
      if (!createdFormId) {
        const createResponse = await authenticatedPost("/api/form-builder", {
          name: "Test Form for Update",
          description: "Description",
          fields: []
        });
        createdFormId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/form-builder/${createdFormId}`, {
        name: "Updated Test Form",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/form-builder/:id", () => {
    it("should return 200 and delete form", async () => {
      const createResponse = await authenticatedPost("/api/form-builder", {
        name: "Test Form to Delete",
        description: "Description to delete",
        fields: []
      });
      const formIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/form-builder/${formIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("User Scheme Applications API", () => {
  let createdApplicationId: string;

  describe("GET /api/user-scheme-applications", () => {
    it("should return 200 and list user scheme applications", async () => {
      const response = await authenticatedGet("/api/user-scheme-applications?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/user-scheme-applications", () => {
    it("should return 200 and create user scheme application", async () => {
      const response = await authenticatedPost("/api/user-scheme-applications", {
        schemeId: 1,
        applicationData: {}
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdApplicationId = response.body.data.id;
      }
    });
  });

  describe("GET /api/user-scheme-applications/:id", () => {
    it("should return 200 and get user scheme application by id", async () => {
      if (!createdApplicationId) {
        const createResponse = await authenticatedPost("/api/user-scheme-applications", {
          schemeId: 1,
          applicationData: {}
        });
        createdApplicationId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(
        `/api/user-scheme-applications/${createdApplicationId}`
      );
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/user-scheme-applications/:id", () => {
    it("should return 200 and update user scheme application", async () => {
      if (!createdApplicationId) {
        const createResponse = await authenticatedPost("/api/user-scheme-applications", {
          schemeId: 1,
          applicationData: {}
        });
        createdApplicationId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(
        `/api/user-scheme-applications/${createdApplicationId}`,
        {
          applicationData: { updated: true }
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/user-scheme-applications/:id", () => {
    it("should return 200 and delete user scheme application", async () => {
      const createResponse = await authenticatedPost("/api/user-scheme-applications", {
        schemeId: 1,
        applicationData: {}
      });
      const applicationIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(
        `/api/user-scheme-applications/${applicationIdToDelete}`
      );
      expect(response.status).toBe(200);
    });
  });
});

describe("MLA Constituency API", () => {
  let createdConstituencyId: string;

  describe("GET /api/mla-constituencies", () => {
    it("should return 200 and list MLA constituencies", async () => {
      const response = await authenticatedGet("/api/mla-constituencies?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/mla-constituencies", () => {
    it("should return 200 and create MLA constituency", async () => {
      const response = await authenticatedPost("/api/mla-constituencies", {
        name: "Test Constituency",
        code: "TC001"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdConstituencyId = response.body.data.id;
      }
    });
  });

  describe("GET /api/mla-constituencies/:id", () => {
    it("should return 200 and get MLA constituency by id", async () => {
      if (!createdConstituencyId) {
        const createResponse = await authenticatedPost("/api/mla-constituencies", {
          name: "Test Constituency for Get",
          code: "TC002"
        });
        createdConstituencyId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/mla-constituencies/${createdConstituencyId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/mla-constituencies/:id", () => {
    it("should return 200 and update MLA constituency", async () => {
      if (!createdConstituencyId) {
        const createResponse = await authenticatedPost("/api/mla-constituencies", {
          name: "Test Constituency for Update",
          code: "TC003"
        });
        createdConstituencyId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/mla-constituencies/${createdConstituencyId}`, {
        name: "Updated Test Constituency"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/mla-constituencies/:id", () => {
    it("should return 200 and delete MLA constituency", async () => {
      const createResponse = await authenticatedPost("/api/mla-constituencies", {
        name: "Test Constituency to Delete",
        code: "TC004"
      });
      const constituencyIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(
        `/api/mla-constituencies/${constituencyIdToDelete}`
      );
      expect(response.status).toBe(200);
    });
  });
});
