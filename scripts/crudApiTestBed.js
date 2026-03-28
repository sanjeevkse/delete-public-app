#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const BASE_URL = process.env.CRUD_API_TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 8081}/api`;
const MASTER_OTP = process.env.CRUD_API_TEST_MASTER_OTP || process.env.MASTER_OTP || "123456";
const REPORT_DIR = path.join(process.cwd(), "artifacts", "crud-api-test-bed");
const REQUEST_TIMEOUT_MS = Number(process.env.CRUD_API_TEST_TIMEOUT_MS || 8000);
const runId = `crud-api-test-bed-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const RETRYABLE_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "EPIPE"]);

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDb = async () =>
  mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

const queryOne = async (db, sql, params = []) => {
  const [rows] = await db.execute(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const createClient = (token) => ({
  async request(method, apiPath, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body = options.body;
    if (body && !(body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE_URL}${apiPath}`, {
        method,
        headers,
        body,
        signal: controller.signal
      });
      const data = await safeJson(response);
      return { response, data };
    } finally {
      clearTimeout(timeout);
    }
  }
});

const expectStatus = async (client, method, apiPath, options, expectedStatuses) => {
  const { response, data } = await requestWithRetry(client, method, apiPath, options);
  if (!expectedStatuses.includes(response.status)) {
    const err = new Error(
      `Expected [${expectedStatuses.join(", ")}] for ${method} ${apiPath}, got ${response.status}`
    );
    err.httpStatus = response.status;
    err.responseBody = data;
    throw err;
  }
  return { response, data };
};

const requestWithRetry = async (client, method, apiPath, options = {}, attempts = 5) => {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await client.request(method, apiPath, options);
    } catch (error) {
      lastError = error;
      const code = error?.cause?.code || error?.code;
      if (!RETRYABLE_CODES.has(code) || attempt === attempts) {
        throw error;
      }
      await sleep(400 * attempt);
    }
  }
  throw lastError;
};

const extractData = (payload) => {
  if (!payload) return null;
  return payload.data !== undefined ? payload.data : payload;
};

const uniqueName = (prefix) => `${prefix} ${Date.now()} ${Math.floor(Math.random() * 10000)}`;

const loginViaOtp = async (contactNumber) => {
  const client = createClient();
  await requestWithRetry(client, "POST", "/auth/request-otp", { body: { contactNumber } });
  const { response, data } = await requestWithRetry(client, "POST", "/auth/login", {
    body: { contactNumber, otp: MASTER_OTP }
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${contactNumber}: ${JSON.stringify(data)}`);
  }

  const token = data?.data?.token;
  const user = data?.data?.user;
  if (!token || !user?.id) {
    throw new Error(`Login response missing token/user for ${contactNumber}`);
  }

  return { token, user };
};

const writeReportFiles = (report) => {
  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, `${runId}.json`);
  const mdPath = path.join(REPORT_DIR, `${runId}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const lines = [
    "# CRUD API Test Bed",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Base URL: \`${report.baseUrl}\``,
    `- Started At: \`${report.startedAt}\``,
    `- Finished At: \`${report.finishedAt}\``,
    `- Passed: \`${report.summary.passed}\``,
    `- Failed: \`${report.summary.failed}\``,
    `- Skipped: \`${report.summary.skipped}\``,
    "",
    "## Scenarios"
  ];

  for (const scenario of report.scenarios) {
    lines.push(
      `- [${scenario.status}] ${scenario.name}: ${scenario.method} ${scenario.path} -> ${scenario.httpStatus ?? "n/a"}`
    );
    if (scenario.error) {
      lines.push(`  error: ${scenario.error}`);
    }
  }

  fs.writeFileSync(mdPath, lines.join("\n") + "\n");
  return { jsonPath, mdPath };
};

const runScenario = async (report, scenario) => {
  const startedAt = new Date().toISOString();
  try {
    const result = await scenario.run();
    report.scenarios.push({
      name: scenario.name,
      method: scenario.method,
      path: scenario.path,
      status: "passed",
      httpStatus: result.httpStatus ?? null,
      startedAt,
      finishedAt: new Date().toISOString(),
      details: result.details ?? null
    });
    report.summary.passed += 1;
  } catch (error) {
    report.scenarios.push({
      name: scenario.name,
      method: scenario.method,
      path: scenario.path,
      status: scenario.optional ? "skipped" : "failed",
      httpStatus: error.httpStatus ?? null,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message || String(error),
      details: error.responseBody ?? null
    });
    if (scenario.optional) {
      report.summary.skipped += 1;
    } else {
      report.summary.failed += 1;
    }
  }
};

const discoverContext = async (db) => {
  const adminUser =
    (await queryOne(
    db,
    `
      SELECT u.id, u.contact_number AS contactNumber
      FROM tbl_user u
      INNER JOIN tbl_xref_user_role ur ON ur.user_id = u.id AND ur.status = 1
      INNER JOIN tbl_meta_user_role r ON r.id = ur.role_id AND r.status = 1
      WHERE LOWER(r.disp_name) = 'admin'
        AND u.contact_number IS NOT NULL
      ORDER BY u.id ASC
      LIMIT 1
    `
  )) ||
    (await queryOne(
      db,
      `
        SELECT id, contact_number AS contactNumber
        FROM tbl_user
        WHERE contact_number IS NOT NULL
        ORDER BY id ASC
        LIMIT 1
      `
    ));
  const permission = await queryOne(db, `SELECT id FROM tbl_meta_permission WHERE status = 1 ORDER BY id ASC LIMIT 1`);
  const mla = await queryOne(db, `SELECT id FROM tbl_meta_mla_constituency WHERE status = 1 ORDER BY id ASC LIMIT 1`);

  if (!adminUser || !permission || !mla) {
    throw new Error("Discovery failed: missing admin user, permission, or MLA constituency");
  }

  return {
    adminUser,
    permissionId: Number(permission.id),
    mlaConstituencyId: Number(mla.id)
  };
};

async function main() {
  const report = {
    runId,
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    summary: { passed: 0, failed: 0, skipped: 0 },
    scenarios: []
  };

  const db = await connectDb();
  try {
    const ctx = await discoverContext(db);
    const adminSession = await loginViaOtp(ctx.adminUser.contactNumber);
    const adminClient = createClient(adminSession.token);

    await runScenario(report, {
      name: "Permission group lifecycle",
      method: "CRUD",
      path: "/admin/permission-groups",
      run: async () => {
        const label = uniqueName("CRUD Permission Group");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/admin/permission-groups",
          { body: { label, description: "crud test" } },
          [200, 201]
        );
        const created = extractData(createRes.data);
        const id = created?.id;
        if (!id) throw new Error("Permission group create response missing id");

        await expectStatus(adminClient, "GET", "/admin/permission-groups", {}, [200]);
        await expectStatus(adminClient, "GET", `/admin/permission-groups/${id}`, {}, [200]);
        await expectStatus(adminClient, "GET", `/admin/permission-groups/${id}/permissions`, {}, [200]);
        await expectStatus(
          adminClient,
          "PUT",
          `/admin/permission-groups/${id}`,
          { body: { label: `${label} Updated`, description: "updated" } },
          [200]
        );
        await expectStatus(adminClient, "PATCH", `/admin/permission-groups/${id}/deactivate`, {}, [200]);
        await expectStatus(adminClient, "PATCH", `/admin/permission-groups/${id}/activate`, {}, [200]);
        const delRes = await expectStatus(
          adminClient,
          "DELETE",
          `/admin/permission-groups/${id}`,
          {},
          [200]
        );
        return { httpStatus: delRes.response.status, details: { id } };
      }
    });

    await runScenario(report, {
      name: "Role lifecycle with permission assignment",
      method: "CRUD",
      path: "/roles",
      run: async () => {
        const dispName = uniqueName("CRUD Role");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/roles",
          { body: { dispName, description: "crud role" } },
          [200, 201]
        );
        const created = extractData(createRes.data);
        const id = created?.id;
        if (!id) throw new Error("Role create response missing id");

        await expectStatus(adminClient, "GET", "/roles", {}, [200]);
        await expectStatus(adminClient, "GET", `/roles/${id}`, {}, [200]);
        await expectStatus(adminClient, "GET", `/roles/${id}/permissions`, {}, [200]);
        await expectStatus(
          adminClient,
          "POST",
          `/roles/${id}/permissions`,
          { body: { permissionIds: [ctx.permissionId] } },
          [200]
        );
        await expectStatus(
          adminClient,
          "PUT",
          `/roles/${id}`,
          { body: { dispName: `${dispName} Updated`, description: "updated role", permissions: [] } },
          [200]
        );
        await expectStatus(
          adminClient,
          "DELETE",
          `/roles/${id}/permissions/${ctx.permissionId}`,
          {},
          [200, 404]
        );
        const delRes = await expectStatus(adminClient, "DELETE", `/roles/${id}`, {}, [200, 204]);
        return { httpStatus: delRes.response.status, details: { id } };
      }
    });

    await runScenario(report, {
      name: "Scheme category lifecycle",
      method: "CRUD",
      path: "/scheme-categories",
      run: async () => {
        const dispName = uniqueName("CRUD Scheme Category");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/scheme-categories",
          { body: { dispName, description: "crud category" } },
          [201]
        );
        const id = extractData(createRes.data)?.id;
        if (!id) throw new Error("Scheme category create response missing id");

        await expectStatus(adminClient, "GET", "/scheme-categories", {}, [200]);
        await expectStatus(adminClient, "GET", `/scheme-categories/${id}`, {}, [200]);
        await expectStatus(
          adminClient,
          "PUT",
          `/scheme-categories/${id}`,
          { body: { dispName: `${dispName} Updated`, description: "updated category" } },
          [200]
        );
        await expectStatus(
          adminClient,
          "PATCH",
          `/scheme-categories/${id}/status`,
          { body: { status: 0 } },
          [200]
        );
        const delRes = await expectStatus(adminClient, "DELETE", `/scheme-categories/${id}`, {}, [200, 204]);
        return { httpStatus: delRes.response.status, details: { id } };
      }
    });

    await runScenario(report, {
      name: "Scheme sector lifecycle",
      method: "CRUD",
      path: "/scheme-sectors",
      run: async () => {
        const dispName = uniqueName("CRUD Scheme Sector");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/scheme-sectors",
          { body: { dispName, description: "crud sector" } },
          [201]
        );
        const id = extractData(createRes.data)?.id;
        if (!id) throw new Error("Scheme sector create response missing id");

        await expectStatus(adminClient, "GET", "/scheme-sectors", {}, [200]);
        await expectStatus(adminClient, "GET", `/scheme-sectors/${id}`, {}, [200]);
        await expectStatus(
          adminClient,
          "PUT",
          `/scheme-sectors/${id}`,
          { body: { dispName: `${dispName} Updated`, description: "updated sector" } },
          [200]
        );
        await expectStatus(
          adminClient,
          "PATCH",
          `/scheme-sectors/${id}/status`,
          { body: { status: 0 } },
          [200]
        );
        const delRes = await expectStatus(adminClient, "DELETE", `/scheme-sectors/${id}`, {}, [200, 204]);
        return { httpStatus: delRes.response.status, details: { id } };
      }
    });

    await runScenario(report, {
      name: "Ward number lifecycle",
      method: "CRUD",
      path: "/ward-numbers",
      run: async () => {
        const dispName = uniqueName("CRUD Ward");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/ward-numbers",
          { body: { dispName } },
          [201]
        );
        const id = extractData(createRes.data)?.id;
        if (!id) throw new Error("Ward number create response missing id");

        await expectStatus(adminClient, "GET", "/ward-numbers?need_all=1", {}, [200]);
        await expectStatus(adminClient, "GET", `/ward-numbers/${id}`, {}, [200]);
        await expectStatus(
          adminClient,
          "PUT",
          `/ward-numbers/${id}`,
          { body: { dispName: `${dispName} Updated` } },
          [200]
        );
        await expectStatus(adminClient, "PATCH", `/ward-numbers/${id}/status`, {}, [200]);
        const delRes = await expectStatus(adminClient, "DELETE", `/ward-numbers/${id}`, {}, [200]);
        return { httpStatus: delRes.response.status, details: { id } };
      }
    });

    await runScenario(report, {
      name: "Booth number lifecycle",
      method: "CRUD",
      path: "/booth-numbers",
      run: async () => {
        const dispName = uniqueName("CRUD Booth");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/booth-numbers",
          { body: { mlaConstituencyId: ctx.mlaConstituencyId, dispName } },
          [201]
        );
        const id = extractData(createRes.data)?.id;
        if (!id) throw new Error("Booth number create response missing id");

        await expectStatus(
          adminClient,
          "GET",
          `/booth-numbers?mlaConstituencyId=${ctx.mlaConstituencyId}`,
          {},
          [200]
        );
        await expectStatus(adminClient, "GET", `/booth-numbers/${id}`, {}, [200]);
        await expectStatus(
          adminClient,
          "PUT",
          `/booth-numbers/${id}`,
          { body: { mlaConstituencyId: ctx.mlaConstituencyId, dispName: `${dispName} Updated` } },
          [200]
        );
        await expectStatus(adminClient, "PATCH", `/booth-numbers/${id}/status`, {}, [200]);
        const delRes = await expectStatus(adminClient, "DELETE", `/booth-numbers/${id}`, {}, [200]);
        return { httpStatus: delRes.response.status, details: { id } };
      }
    });

    await runScenario(report, {
      name: "Complaint sector lifecycle",
      method: "CRUD",
      path: "/complaint-sectors",
      run: async () => {
        const dispName = uniqueName("CRUD Complaint Sector");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/complaint-sectors",
          { body: { dispName, description: "crud complaint sector" } },
          [201]
        );
        const id = extractData(createRes.data)?.id;
        if (!id) throw new Error("Complaint sector create response missing id");

        await expectStatus(adminClient, "GET", "/complaint-sectors", {}, [200]);
        await expectStatus(adminClient, "GET", `/complaint-sectors/${id}`, {}, [200]);
        await expectStatus(
          adminClient,
          "PUT",
          `/complaint-sectors/${id}`,
          { body: { dispName: `${dispName} Updated`, description: "updated complaint sector" } },
          [200]
        );
        const delRes = await expectStatus(adminClient, "DELETE", `/complaint-sectors/${id}`, {}, [200]);
        return { httpStatus: delRes.response.status, details: { id } };
      }
    });

    await runScenario(report, {
      name: "Complaint department lifecycle",
      method: "CRUD",
      path: "/complaint-departments",
      run: async () => {
        const sectorName = uniqueName("CRUD Sector For Department");
        const sectorCreate = await expectStatus(
          adminClient,
          "POST",
          "/complaint-sectors",
          { body: { dispName: sectorName, description: "department parent sector" } },
          [201]
        );
        const sectorId = extractData(sectorCreate.data)?.id;
        if (!sectorId) throw new Error("Complaint sector for department missing id");

        const deptName = uniqueName("CRUD Complaint Department");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/complaint-departments",
          { body: { dispName: deptName, description: "crud complaint department", complaintSectorId: sectorId } },
          [201]
        );
        const id = extractData(createRes.data)?.id;
        if (!id) throw new Error("Complaint department create response missing id");

        await expectStatus(adminClient, "GET", `/complaint-departments?complaintSectorId=${sectorId}`, {}, [200]);
        await expectStatus(adminClient, "GET", `/complaint-departments/${id}`, {}, [200]);
        await expectStatus(
          adminClient,
          "PUT",
          `/complaint-departments/${id}`,
          {
            body: {
              dispName: `${deptName} Updated`,
              description: "updated complaint department",
              complaintSectorId: sectorId
            }
          },
          [200]
        );
        await expectStatus(adminClient, "DELETE", `/complaint-departments/${id}`, {}, [200]);
        const sectorDelete = await expectStatus(adminClient, "DELETE", `/complaint-sectors/${sectorId}`, {}, [200]);
        return { httpStatus: sectorDelete.response.status, details: { id, sectorId } };
      }
    });

    await runScenario(report, {
      name: "Complaint type lifecycle",
      method: "CRUD",
      path: "/complaint-types",
      run: async () => {
        const sectorName = uniqueName("CRUD Sector For Type");
        const sectorCreate = await expectStatus(
          adminClient,
          "POST",
          "/complaint-sectors",
          { body: { dispName: sectorName, description: "type parent sector" } },
          [201]
        );
        const sectorId = extractData(sectorCreate.data)?.id;
        if (!sectorId) throw new Error("Complaint sector for type missing id");

        const deptName = uniqueName("CRUD Department For Type");
        const deptCreate = await expectStatus(
          adminClient,
          "POST",
          "/complaint-departments",
          { body: { dispName: deptName, description: "type parent department", complaintSectorId: sectorId } },
          [201]
        );
        const departmentId = extractData(deptCreate.data)?.id;
        if (!departmentId) throw new Error("Complaint department for type missing id");

        const dispName = uniqueName("CRUD Complaint Type");
        const createRes = await expectStatus(
          adminClient,
          "POST",
          "/complaint-types",
          {
            body: {
              dispName,
              description: "crud complaint type",
              complaintDepartmentId: departmentId,
              steps: [
                { stepOrder: 1, dispName: "Step One", description: "first step" },
                { stepOrder: 2, dispName: "Step Two", description: "second step" }
              ]
            }
          },
          [201]
        );
        const created = extractData(createRes.data);
        const id = created?.id;
        if (!id) throw new Error("Complaint type create response missing id");

        await expectStatus(adminClient, "GET", "/complaint-types", {}, [200]);
        const getRes = await expectStatus(adminClient, "GET", `/complaint-types/${id}`, {}, [200]);
        const existingSteps = extractData(getRes.data)?.steps || [];
        await expectStatus(
          adminClient,
          "PUT",
          `/complaint-types/${id}`,
          {
            body: {
              dispName: `${dispName} Updated`,
              description: "updated complaint type",
              complaintDepartmentId: departmentId,
              steps: existingSteps.length > 0
                ? existingSteps.map((step, index) => ({
                    id: step.id,
                    stepOrder: index + 1,
                    dispName: `${step.name || step.dispName} Updated`,
                    description: "updated step"
                  }))
                : [{ stepOrder: 1, dispName: "Updated Step", description: "updated step" }]
            }
          },
          [200]
        );
        await expectStatus(adminClient, "DELETE", `/complaint-types/${id}`, {}, [200]);
        await expectStatus(adminClient, "DELETE", `/complaint-departments/${departmentId}`, {}, [200]);
        const sectorDelete = await expectStatus(adminClient, "DELETE", `/complaint-sectors/${sectorId}`, {}, [200]);
        return { httpStatus: sectorDelete.response.status, details: { id, departmentId, sectorId } };
      }
    });

    await runScenario(report, {
      name: "Geo lookup urban and rural reads",
      method: "GET",
      path: "/geo-lookup",
      run: async () => {
        await expectStatus(adminClient, "GET", "/geo-lookup?request_entity=mp_constituency", {}, [200]);
        await expectStatus(adminClient, "GET", "/geo-lookup?request_entity=mla_constituency", {}, [200]);
        await expectStatus(adminClient, "GET", "/geo-lookup?request_entity=ward&need_all=1", {}, [200]);
        const rural = await expectStatus(adminClient, "GET", "/geo-lookup?request_entity=gram_panchayat&need_all=1", {}, [200]);
        return { httpStatus: rural.response.status };
      }
    });
  } finally {
    await db.end();
    report.finishedAt = new Date().toISOString();
    const paths = writeReportFiles(report);
    console.log(JSON.stringify({ summary: report.summary, paths }, null, 2));
    if (report.summary.failed > 0) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
