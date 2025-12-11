import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Jobs API", () => {
  let createdJobId: string;

  describe("GET /api/jobs", () => {
    it("should return 200 and list jobs", async () => {
      const response = await authenticatedGet("/api/jobs?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/jobs", () => {
    it("should return 200 and create job", async () => {
      const response = await authenticatedPost("/api/jobs", {
        title: "Test Job",
        description: "Test job description",
        company: "Test Company"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdJobId = response.body.data.id;
      }
    });
  });

  describe("GET /api/jobs/:id", () => {
    it("should return 200 and get job by id", async () => {
      if (!createdJobId) {
        const createResponse = await authenticatedPost("/api/jobs", {
          title: "Test Job for Get",
          description: "Description",
          company: "Company"
        });
        createdJobId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/jobs/${createdJobId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/jobs/:id", () => {
    it("should return 200 and update job", async () => {
      if (!createdJobId) {
        const createResponse = await authenticatedPost("/api/jobs", {
          title: "Test Job for Update",
          description: "Description",
          company: "Company"
        });
        createdJobId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/jobs/${createdJobId}`, {
        title: "Updated Test Job",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/jobs/:id", () => {
    it("should return 200 and delete job", async () => {
      const createResponse = await authenticatedPost("/api/jobs", {
        title: "Test Job to Delete",
        description: "Description to delete",
        company: "Company"
      });
      const jobIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/jobs/${jobIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});
