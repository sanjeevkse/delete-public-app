import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Members API", () => {
  let createdMemberId: string;

  describe("GET /api/members", () => {
    it("should return 200 and list members", async () => {
      const response = await authenticatedGet("/api/members?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/members", () => {
    it("should return 200 and create member", async () => {
      const response = await authenticatedPost("/api/members", {
        name: "Test Member",
        contactNumber: "9876543210"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdMemberId = response.body.data.id;
      }
    });
  });

  describe("GET /api/members/:id", () => {
    it("should return 200 and get member by id", async () => {
      if (!createdMemberId) {
        const createResponse = await authenticatedPost("/api/members", {
          name: "Test Member for Get",
          contactNumber: "9876543211"
        });
        createdMemberId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/members/${createdMemberId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/members/:id", () => {
    it("should return 200 and update member", async () => {
      if (!createdMemberId) {
        const createResponse = await authenticatedPost("/api/members", {
          name: "Test Member for Update",
          contactNumber: "9876543212"
        });
        createdMemberId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/members/${createdMemberId}`, {
        name: "Updated Test Member"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/members/:id", () => {
    it("should return 200 and delete member", async () => {
      const createResponse = await authenticatedPost("/api/members", {
        name: "Test Member to Delete",
        contactNumber: "9876543213"
      });
      const memberIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/members/${memberIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
