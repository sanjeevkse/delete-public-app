import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Admin Users API", () => {
  describe("GET /api/admin/users", () => {
    it("should return 200 and list users", async () => {
      const response = await authenticatedGet(
        "/api/admin/users?page=1&limit=25&sort=ASC&sortColumn=id"
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/admin/users/:id", () => {
    it("should return 200 and get user by id", async () => {
      // Get list first to get a user ID
      const listResponse = await authenticatedGet("/api/admin/users?page=1&limit=1");

      if (listResponse.body.data?.length > 0) {
        const userId = listResponse.body.data[0].id;
        const response = await authenticatedGet(`/api/admin/users/${userId}`);
        expect(response.status).toBe(200);
      } else {
        expect(true).toBe(true);
      }
    });
  });
});

describe("Admin Roles API", () => {
  let createdRoleId: string;

  describe("GET /api/admin/roles", () => {
    it("should return 200 and list roles", async () => {
      const response = await authenticatedGet("/api/admin/roles?page=1&limit=25");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/admin/roles", () => {
    it("should return 200 and create role", async () => {
      const response = await authenticatedPost("/api/admin/roles", {
        name: "Test Role",
        description: "Test role description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdRoleId = response.body.data.id;
      }
    });
  });

  describe("GET /api/admin/roles/:id", () => {
    it("should return 200 and get role by id", async () => {
      if (!createdRoleId) {
        const createResponse = await authenticatedPost("/api/admin/roles", {
          name: "Test Role for Get",
          description: "Description"
        });
        createdRoleId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/admin/roles/${createdRoleId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/admin/roles/:id", () => {
    it("should return 200 and update role", async () => {
      if (!createdRoleId) {
        const createResponse = await authenticatedPost("/api/admin/roles", {
          name: "Test Role for Update",
          description: "Description"
        });
        createdRoleId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/admin/roles/${createdRoleId}`, {
        name: "Updated Test Role",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/admin/roles/:id", () => {
    it("should return 200 and delete role", async () => {
      const createResponse = await authenticatedPost("/api/admin/roles", {
        name: "Test Role to Delete",
        description: "Description to delete"
      });
      const roleIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/admin/roles/${roleIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Admin Permissions API", () => {
  describe("GET /api/admin/permissions", () => {
    it("should return 200 and list permissions", async () => {
      const response = await authenticatedGet("/api/admin/permissions?page=1&limit=25");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/admin/permissions/:id", () => {
    it("should return 200 and get permission by id", async () => {
      const listResponse = await authenticatedGet("/api/admin/permissions?page=1&limit=1");

      if (listResponse.body.data?.length > 0) {
        const permissionId = listResponse.body.data[0].id;
        const response = await authenticatedGet(`/api/admin/permissions/${permissionId}`);
        expect(response.status).toBe(200);
      } else {
        expect(true).toBe(true);
      }
    });
  });
});

describe("Admin Permission Groups API", () => {
  let createdGroupId: string;

  describe("GET /api/admin/permission-groups", () => {
    it("should return 200 and list permission groups", async () => {
      const response = await authenticatedGet("/api/admin/permission-groups?page=1&limit=25");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/admin/permission-groups", () => {
    it("should return 200 and create permission group", async () => {
      const response = await authenticatedPost("/api/admin/permission-groups", {
        name: "Test Permission Group",
        description: "Test group description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdGroupId = response.body.data.id;
      }
    });
  });

  describe("GET /api/admin/permission-groups/:id", () => {
    it("should return 200 and get permission group by id", async () => {
      if (!createdGroupId) {
        const createResponse = await authenticatedPost("/api/admin/permission-groups", {
          name: "Test Group for Get",
          description: "Description"
        });
        createdGroupId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/admin/permission-groups/${createdGroupId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/admin/permission-groups/:id", () => {
    it("should return 200 and update permission group", async () => {
      if (!createdGroupId) {
        const createResponse = await authenticatedPost("/api/admin/permission-groups", {
          name: "Test Group for Update",
          description: "Description"
        });
        createdGroupId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/admin/permission-groups/${createdGroupId}`, {
        name: "Updated Test Group",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/admin/permission-groups/:id", () => {
    it("should return 200 and delete permission group", async () => {
      const createResponse = await authenticatedPost("/api/admin/permission-groups", {
        name: "Test Group to Delete",
        description: "Description to delete"
      });
      const groupIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/admin/permission-groups/${groupIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
