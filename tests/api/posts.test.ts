import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Posts API", () => {
  let createdPostId: string;

  describe("GET /api/posts", () => {
    it("should return 200 and list posts", async () => {
      const response = await authenticatedGet("/api/posts?page=1&limit=20&sort=DESC");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/my-posts", () => {
    it("should return 200 and list my posts", async () => {
      const response = await authenticatedGet("/api/my-posts?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/posts", () => {
    it("should return 200 and create post", async () => {
      const response = await authenticatedPost("/api/posts", {
        title: "Test Post",
        content: "This is a test post content"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdPostId = response.body.data.id;
      }
    });
  });

  describe("GET /api/posts/:id", () => {
    it("should return 200 and get post by id", async () => {
      if (!createdPostId) {
        // Create a post first
        const createResponse = await authenticatedPost("/api/posts", {
          title: "Test Post for Get",
          content: "Content"
        });
        createdPostId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/posts/${createdPostId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/posts/:id", () => {
    it("should return 200 and update post", async () => {
      if (!createdPostId) {
        // Create a post first
        const createResponse = await authenticatedPost("/api/posts", {
          title: "Test Post for Update",
          content: "Content"
        });
        createdPostId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/posts/${createdPostId}`, {
        title: "Updated Test Post",
        content: "Updated content"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/posts/:id/reactions", () => {
    it("should return 200 and react to post", async () => {
      if (!createdPostId) {
        // Create a post first
        const createResponse = await authenticatedPost("/api/posts", {
          title: "Test Post for Reaction",
          content: "Content"
        });
        createdPostId = createResponse.body.data?.id;
      }

      const response = await authenticatedPost(`/api/posts/${createdPostId}/reactions`, {
        type: "like"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("should return 200 and delete post", async () => {
      // Create a post to delete
      const createResponse = await authenticatedPost("/api/posts", {
        title: "Test Post to Delete",
        content: "Content to delete"
      });
      const postIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/posts/${postIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
