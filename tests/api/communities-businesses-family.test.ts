import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Communities API", () => {
  let createdCommunityId: string;

  describe("GET /api/communities", () => {
    it("should return 200 and list communities", async () => {
      const response = await authenticatedGet("/api/communities?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/communities", () => {
    it("should return 200 and create community", async () => {
      const response = await authenticatedPost("/api/communities", {
        name: "Test Community",
        description: "Test community description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdCommunityId = response.body.data.id;
      }
    });
  });

  describe("GET /api/communities/:id", () => {
    it("should return 200 and get community by id", async () => {
      if (!createdCommunityId) {
        const createResponse = await authenticatedPost("/api/communities", {
          name: "Test Community for Get",
          description: "Description"
        });
        createdCommunityId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/communities/${createdCommunityId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/communities/:id", () => {
    it("should return 200 and update community", async () => {
      if (!createdCommunityId) {
        const createResponse = await authenticatedPost("/api/communities", {
          name: "Test Community for Update",
          description: "Description"
        });
        createdCommunityId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/communities/${createdCommunityId}`, {
        name: "Updated Test Community",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/communities/:id", () => {
    it("should return 200 and delete community", async () => {
      const createResponse = await authenticatedPost("/api/communities", {
        name: "Test Community to Delete",
        description: "Description to delete"
      });
      const communityIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/communities/${communityIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Businesses API", () => {
  let createdBusinessId: string;

  describe("GET /api/businesses", () => {
    it("should return 200 and list businesses", async () => {
      const response = await authenticatedGet("/api/businesses?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/businesses", () => {
    it("should return 200 and create business", async () => {
      const response = await authenticatedPost("/api/businesses", {
        name: "Test Business",
        description: "Test business description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdBusinessId = response.body.data.id;
      }
    });
  });

  describe("GET /api/businesses/:id", () => {
    it("should return 200 and get business by id", async () => {
      if (!createdBusinessId) {
        const createResponse = await authenticatedPost("/api/businesses", {
          name: "Test Business for Get",
          description: "Description"
        });
        createdBusinessId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/businesses/${createdBusinessId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/businesses/:id", () => {
    it("should return 200 and update business", async () => {
      if (!createdBusinessId) {
        const createResponse = await authenticatedPost("/api/businesses", {
          name: "Test Business for Update",
          description: "Description"
        });
        createdBusinessId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/businesses/${createdBusinessId}`, {
        name: "Updated Test Business",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/businesses/:id", () => {
    it("should return 200 and delete business", async () => {
      const createResponse = await authenticatedPost("/api/businesses", {
        name: "Test Business to Delete",
        description: "Description to delete"
      });
      const businessIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/businesses/${businessIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Family Members API", () => {
  let createdFamilyMemberId: string;

  describe("GET /api/family-members", () => {
    it("should return 200 and list family members", async () => {
      const response = await authenticatedGet("/api/family-members?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/family-members", () => {
    it("should return 200 and create family member", async () => {
      const response = await authenticatedPost("/api/family-members", {
        name: "Test Family Member",
        relationship: "Spouse"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdFamilyMemberId = response.body.data.id;
      }
    });
  });

  describe("GET /api/family-members/:id", () => {
    it("should return 200 and get family member by id", async () => {
      if (!createdFamilyMemberId) {
        const createResponse = await authenticatedPost("/api/family-members", {
          name: "Test Family Member for Get",
          relationship: "Child"
        });
        createdFamilyMemberId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/family-members/${createdFamilyMemberId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/family-members/:id", () => {
    it("should return 200 and update family member", async () => {
      if (!createdFamilyMemberId) {
        const createResponse = await authenticatedPost("/api/family-members", {
          name: "Test Family Member for Update",
          relationship: "Parent"
        });
        createdFamilyMemberId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/family-members/${createdFamilyMemberId}`, {
        name: "Updated Test Family Member"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/family-members/:id", () => {
    it("should return 200 and delete family member", async () => {
      const createResponse = await authenticatedPost("/api/family-members", {
        name: "Test Family Member to Delete",
        relationship: "Sibling"
      });
      const familyMemberIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/family-members/${familyMemberIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
