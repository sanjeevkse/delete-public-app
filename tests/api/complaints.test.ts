import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete
} from "../helpers/testHelpers";

describe("Complaint Types API", () => {
  let createdComplaintTypeId: string;

  describe("GET /api/complaint-types", () => {
    it("should return 200 and list complaint types", async () => {
      const response = await authenticatedGet("/api/complaint-types?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/complaint-types", () => {
    it("should return 200 and create complaint type", async () => {
      const response = await authenticatedPost("/api/complaint-types", {
        name: "Test Complaint Type",
        description: "Test complaint type description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdComplaintTypeId = response.body.data.id;
      }
    });
  });

  describe("GET /api/complaint-types/:id", () => {
    it("should return 200 and get complaint type by id", async () => {
      if (!createdComplaintTypeId) {
        const createResponse = await authenticatedPost("/api/complaint-types", {
          name: "Test Complaint Type for Get",
          description: "Description"
        });
        createdComplaintTypeId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/complaint-types/${createdComplaintTypeId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/complaint-types/:id", () => {
    it("should return 200 and update complaint type", async () => {
      if (!createdComplaintTypeId) {
        const createResponse = await authenticatedPost("/api/complaint-types", {
          name: "Test Complaint Type for Update",
          description: "Description"
        });
        createdComplaintTypeId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/complaint-types/${createdComplaintTypeId}`, {
        name: "Updated Test Complaint Type",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/complaint-types/:id", () => {
    it("should return 200 and delete complaint type", async () => {
      const createResponse = await authenticatedPost("/api/complaint-types", {
        name: "Test Complaint Type to Delete",
        description: "Description to delete"
      });
      const typeIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/complaint-types/${typeIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Complaints API", () => {
  let createdComplaintId: string;

  describe("GET /api/complaints", () => {
    it("should return 200 and list complaints", async () => {
      const response = await authenticatedGet("/api/complaints?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/complaints", () => {
    it("should return 200 and create complaint", async () => {
      const response = await authenticatedPost("/api/complaints", {
        title: "Test Complaint",
        description: "Test complaint description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdComplaintId = response.body.data.id;
      }
    });
  });

  describe("GET /api/complaints/:id", () => {
    it("should return 200 and get complaint by id", async () => {
      if (!createdComplaintId) {
        const createResponse = await authenticatedPost("/api/complaints", {
          title: "Test Complaint for Get",
          description: "Description"
        });
        createdComplaintId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(`/api/complaints/${createdComplaintId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/complaints/:id", () => {
    it("should return 200 and update complaint", async () => {
      if (!createdComplaintId) {
        const createResponse = await authenticatedPost("/api/complaints", {
          title: "Test Complaint for Update",
          description: "Description"
        });
        createdComplaintId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(`/api/complaints/${createdComplaintId}`, {
        title: "Updated Test Complaint",
        description: "Updated description"
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/complaints/:id", () => {
    it("should return 200 and delete complaint", async () => {
      const createResponse = await authenticatedPost("/api/complaints", {
        title: "Test Complaint to Delete",
        description: "Description to delete"
      });
      const complaintIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(`/api/complaints/${complaintIdToDelete}`);
      expect(response.status).toBe(200);
    });
  });
});

describe("Complaint Sector Department API", () => {
  let createdDepartmentId: string;

  describe("GET /api/complaint-sector-departments", () => {
    it("should return 200 and list complaint sector departments", async () => {
      const response = await authenticatedGet("/api/complaint-sector-departments?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/complaint-sector-departments", () => {
    it("should return 200 and create complaint sector department", async () => {
      const response = await authenticatedPost("/api/complaint-sector-departments", {
        name: "Test Department",
        description: "Test department description"
      });

      expect(response.status).toBe(200);

      if (response.body.data?.id) {
        createdDepartmentId = response.body.data.id;
      }
    });
  });

  describe("GET /api/complaint-sector-departments/:id", () => {
    it("should return 200 and get complaint sector department by id", async () => {
      if (!createdDepartmentId) {
        const createResponse = await authenticatedPost("/api/complaint-sector-departments", {
          name: "Test Department for Get",
          description: "Description"
        });
        createdDepartmentId = createResponse.body.data?.id;
      }

      const response = await authenticatedGet(
        `/api/complaint-sector-departments/${createdDepartmentId}`
      );
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/complaint-sector-departments/:id", () => {
    it("should return 200 and update complaint sector department", async () => {
      if (!createdDepartmentId) {
        const createResponse = await authenticatedPost("/api/complaint-sector-departments", {
          name: "Test Department for Update",
          description: "Description"
        });
        createdDepartmentId = createResponse.body.data?.id;
      }

      const response = await authenticatedPut(
        `/api/complaint-sector-departments/${createdDepartmentId}`,
        {
          name: "Updated Test Department",
          description: "Updated description"
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/complaint-sector-departments/:id", () => {
    it("should return 200 and delete complaint sector department", async () => {
      const createResponse = await authenticatedPost("/api/complaint-sector-departments", {
        name: "Test Department to Delete",
        description: "Description to delete"
      });
      const departmentIdToDelete = createResponse.body.data?.id;

      const response = await authenticatedDelete(
        `/api/complaint-sector-departments/${departmentIdToDelete}`
      );
      expect(response.status).toBe(200);
    });
  });
});

describe("Complaint Status API", () => {
  describe("GET /api/complaint-status", () => {
    it("should return 200 and list complaint statuses", async () => {
      const response = await authenticatedGet("/api/complaint-status?page=1&limit=20");
      expect(response.status).toBe(200);
    });
  });
});
