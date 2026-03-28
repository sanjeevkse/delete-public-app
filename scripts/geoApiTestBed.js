#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const BASE_URL = process.env.GEO_TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 8081}/api`;
const MASTER_OTP = process.env.GEO_TEST_MASTER_OTP || process.env.MASTER_OTP || "123456";
const REPORT_DIR = path.join(process.cwd(), "artifacts", "geo-api-test-bed");

const nowStamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const runId = `geo-api-test-bed-${nowStamp()}`;

const toQuery = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
};

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const writeReportFiles = (report) => {
  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, `${runId}.json`);
  const mdPath = path.join(REPORT_DIR, `${runId}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const lines = [
    `# Geo API Test Bed`,
    ``,
    `- Run ID: \`${report.runId}\``,
    `- Base URL: \`${report.baseUrl}\``,
    `- Started At: \`${report.startedAt}\``,
    `- Finished At: \`${report.finishedAt}\``,
    `- Passed: \`${report.summary.passed}\``,
    `- Failed: \`${report.summary.failed}\``,
    `- Skipped: \`${report.summary.skipped}\``,
    ``,
    `## Scenarios`
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRYABLE_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "EPIPE"]);

const randomMobile = () => {
  const firstDigit = Math.floor(Math.random() * 4) + 6;
  const remaining = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `+91${firstDigit}${remaining}`;
};

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const createClient = (token) => {
  return {
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

      const response = await fetch(`${BASE_URL}${apiPath}`, {
        method,
        headers,
        body
      }).catch((error) => {
        throw error;
      });
      const data = await safeJson(response);
      return { response, data };
    }
  };
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

  const senderUser = await queryOne(
    db,
    `
      SELECT u.id, u.contact_number AS contactNumber, ur.role_id AS roleId
      FROM tbl_user u
      INNER JOIN tbl_xref_user_role ur ON ur.user_id = u.id AND ur.status = 1
      WHERE u.id = 4
        AND u.contact_number IS NOT NULL
      LIMIT 1
    `
  );

  const publicRole = await queryOne(
    db,
    `SELECT id FROM tbl_meta_user_role WHERE LOWER(disp_name) = 'public' AND status = 1 LIMIT 1`
  );

  const urbanGeo = await queryOne(
    db,
    `
      SELECT
        id,
        state_id AS stateId,
        district_id AS districtId,
        taluk_id AS talukId,
        mp_constituency_id AS mpConstituencyId,
        mla_constituency_id AS mlaConstituencyId,
        settlement_type AS settlementType,
        governing_body AS governingBody,
        local_body_id AS localBodyId,
        hobali_id AS hobaliId,
        gram_panchayat_id AS gramPanchayatId,
        main_village_id AS mainVillageId,
        sub_village_id AS subVillageId,
        polling_station_id AS pollingStationId,
        ward_number_id AS wardNumberId,
        booth_number_id AS boothNumberId
      FROM tbl_geo_political
      WHERE status = 1
        AND settlement_type = 'URBAN'
        AND local_body_id IS NOT NULL
        AND ward_number_id IS NOT NULL
        AND booth_number_id IS NOT NULL
      ORDER BY id ASC
      LIMIT 1
    `
  );

  const ruralGeo = await queryOne(
    db,
    `
      SELECT
        id,
        state_id AS stateId,
        district_id AS districtId,
        taluk_id AS talukId,
        mp_constituency_id AS mpConstituencyId,
        mla_constituency_id AS mlaConstituencyId,
        settlement_type AS settlementType,
        governing_body AS governingBody,
        local_body_id AS localBodyId,
        hobali_id AS hobaliId,
        gram_panchayat_id AS gramPanchayatId,
        main_village_id AS mainVillageId,
        sub_village_id AS subVillageId,
        polling_station_id AS pollingStationId,
        ward_number_id AS wardNumberId,
        booth_number_id AS boothNumberId
      FROM tbl_geo_political
      WHERE status = 1
        AND settlement_type = 'RURAL'
        AND governing_body = 'GP'
        AND gram_panchayat_id IS NOT NULL
        AND main_village_id IS NOT NULL
        AND booth_number_id IS NOT NULL
      ORDER BY id ASC
      LIMIT 1
    `
  );

  const lookups = {
    complaintType: await queryOne(db, `SELECT id FROM tbl_meta_complaint_type WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    eventType: await queryOne(db, `SELECT id FROM tbl_meta_event_type WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    color: await queryOne(db, `SELECT id FROM tbl_meta_color WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    designation: await queryOne(db, `SELECT id FROM tbl_meta_designation WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    form: await queryOne(db, `SELECT id FROM tbl_form WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    scheme: await queryOne(db, `SELECT id FROM tbl_scheme WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    governmentLevel: await queryOne(db, `SELECT id FROM tbl_meta_government_level WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    sector: await queryOne(db, `SELECT id FROM tbl_meta_complaint_sector WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    schemeType: await queryOne(db, `SELECT id FROM tbl_meta_scheme_type_lookup WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    ownershipType: await queryOne(db, `SELECT id FROM tbl_meta_ownership_type WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    gender: await queryOne(db, `SELECT id FROM tbl_meta_gender_option WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    widowStatus: await queryOne(db, `SELECT id FROM tbl_meta_widow_status WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    disabilityStatus: await queryOne(db, `SELECT id FROM tbl_meta_disability_status WHERE status = 1 ORDER BY id ASC LIMIT 1`),
    employmentStatus: await queryOne(db, `SELECT id FROM tbl_meta_employment_status WHERE status = 1 ORDER BY id ASC LIMIT 1`)
  };

  if (!adminUser || !urbanGeo || !ruralGeo || !lookups.form || !lookups.scheme || !publicRole) {
    throw new Error("Discovery failed: required admin user, geo leaves, form, scheme, or public role are missing");
  }

  return {
    adminUser,
    senderUser,
    publicRoleId: Number(publicRole.id),
    urbanGeo,
    ruralGeo,
    lookups: Object.fromEntries(
      Object.entries(lookups).map(([key, value]) => [key, value ? Number(value.id) : null])
    )
  };
};

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

const createPublicSession = async () => {
  const contactNumber = randomMobile();
  return loginViaOtp(contactNumber);
};

const cloneGeo = (geo, keys) => {
  const out = {};
  for (const key of keys) {
    if (geo[key] !== undefined && geo[key] !== null) {
      out[key] = geo[key];
    }
  }
  return out;
};

const makeImageFileForm = (filename) => {
  const form = new FormData();
  const pngBytes = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0xc9, 0xfe, 0x92,
    0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  form.append("document", new Blob([pngBytes], { type: "image/png" }), filename);
  return form;
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
    return result;
  } catch (error) {
    report.scenarios.push({
      name: scenario.name,
      method: scenario.method,
      path: scenario.path,
      status: scenario.optional ? "skipped" : "failed",
      httpStatus: error.httpStatus ?? null,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message || String(error)
    });
    if (scenario.optional) {
      report.summary.skipped += 1;
      return null;
    }
    report.summary.failed += 1;
    return null;
  }
};

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
  const cleanup = [];

  try {
    const ctx = await discoverContext(db);
    const adminSession = await loginViaOtp(ctx.adminUser.contactNumber);
    const publicSession = await createPublicSession();
    const adminClient = createClient(adminSession.token);
    const publicClient = createClient(publicSession.token);

    await expectStatus(
      publicClient,
      "POST",
      "/notifications/tokens/register",
      {
        body: { token: `geo-bed-${Date.now()}-public`, platform: "web" }
      },
      [200, 201]
    );

    let senderClient = null;
    if (ctx.senderUser?.contactNumber) {
      try {
        const senderSession = await loginViaOtp(ctx.senderUser.contactNumber);
        senderClient = createClient(senderSession.token);
        await expectStatus(
          senderClient,
          "POST",
          "/notifications/tokens/register",
          {
            body: { token: `geo-bed-${Date.now()}-sender`, platform: "web" }
          },
          [200, 201]
        );
      } catch (error) {
        report.scenarios.push({
          name: "Seed targeted-notification sender device token",
          method: "POST",
          path: "/notifications/tokens/register",
          status: "skipped",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: error.message || String(error)
        });
        report.summary.skipped += 1;
      }
    }

    const urbanExact = cloneGeo(ctx.urbanGeo, [
      "stateId",
      "districtId",
      "talukId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "settlementType",
      "governingBody",
      "localBodyId",
      "pollingStationId",
      "wardNumberId",
      "boothNumberId"
    ]);

    const ruralExact = cloneGeo(ctx.ruralGeo, [
      "stateId",
      "districtId",
      "talukId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "settlementType",
      "governingBody",
      "hobaliId",
      "gramPanchayatId",
      "mainVillageId",
      "subVillageId",
      "pollingStationId",
      "boothNumberId"
    ]);

    const urbanFilter = cloneGeo(ctx.urbanGeo, [
      "stateId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "settlementType",
      "governingBody",
      "localBodyId",
      "wardNumberId"
    ]);

    const ruralFilter = cloneGeo(ctx.ruralGeo, [
      "stateId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "settlementType",
      "governingBody",
      "gramPanchayatId",
      "mainVillageId"
    ]);

    await runScenario(report, {
      name: "Profile patch with legacy ward/booth",
      method: "PATCH",
      path: "/auth/profile",
      run: async () => {
        const { response } = await expectStatus(publicClient, "PATCH", "/auth/profile", {
          body: {
            displayName: "Geo Bed Legacy Profile",
            addressLine1: "Legacy Lane",
            city: "Bengaluru",
            wardNumberId: ctx.urbanGeo.wardNumberId,
            boothNumberId: ctx.urbanGeo.boothNumberId
          }
        }, [200]);
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Profile patch with full urban geo leaf",
      method: "PATCH",
      path: "/auth/profile",
      run: async () => {
        const { response } = await expectStatus(publicClient, "PATCH", "/auth/profile", {
          body: {
            displayName: "Geo Bed Urban Profile",
            addressLine1: "Urban Test Street",
            city: "Bengaluru",
            ...urbanExact
          }
        }, [200]);
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Profile patch with full rural geo leaf",
      method: "PATCH",
      path: "/auth/profile",
      run: async () => {
        const { response } = await expectStatus(publicClient, "PATCH", "/auth/profile", {
          body: {
            displayName: "Geo Bed Rural Profile",
            addressLine1: "Rural Test Street",
            city: "Village",
            ...ruralExact
          }
        }, [200]);
        return { httpStatus: response.status };
      }
    });

    let complaintId = null;
    await runScenario(report, {
      name: "Create complaint with legacy ward/booth",
      method: "POST",
      path: "/complaints",
      run: async () => {
        const { response, data } = await expectStatus(publicClient, "POST", "/complaints", {
          body: {
            selfOther: "self",
            complaintTypeId: ctx.lookups.complaintType,
            wardNumberId: ctx.urbanGeo.wardNumberId,
            boothNumberId: ctx.urbanGeo.boothNumberId,
            title: `[geo-bed] legacy complaint ${runId}`,
            description: "Legacy geo complaint payload",
            locationText: "Legacy geo location",
            latitude: 12.9716,
            longitude: 77.5946,
            fullName: "Geo Bed User",
            contactNumber: publicSession.user.contactNumber,
            fullAddress: "Legacy complaint address"
          }
        }, [201]);
        complaintId = data?.data?.id ?? null;
        return { httpStatus: response.status, details: { complaintId } };
      }
    });

    await runScenario(report, {
      name: "Create complaint with full urban geo leaf",
      method: "POST",
      path: "/complaints",
      run: async () => {
        const { response } = await expectStatus(publicClient, "POST", "/complaints", {
          body: {
            selfOther: "self",
            complaintTypeId: ctx.lookups.complaintType,
            title: `[geo-bed] exact complaint ${runId}`,
            description: "Exact geo complaint payload",
            locationText: "Exact geo location",
            latitude: 12.9716,
            longitude: 77.5946,
            fullName: "Geo Bed User",
            contactNumber: publicSession.user.contactNumber,
            fullAddress: "Exact complaint address",
            ...urbanExact
          }
        }, [201]);
        return { httpStatus: response.status };
      }
    });

    let createdEventId = null;
    await runScenario(report, {
      name: "Create event for registration/report tests",
      method: "POST",
      path: "/events",
      run: async () => {
        const { response, data } = await expectStatus(adminClient, "POST", "/events", {
          body: {
            title: `[geo-bed] event ${runId}`,
            description: "Geo API test bed event",
            place: "Test Hall",
            eventTypeId: ctx.lookups.eventType,
            latitude: 12.9716,
            longitude: 77.5946,
            startDate: "2026-04-01",
            startTime: "10:00",
            endDate: "2026-04-01",
            endTime: "12:00",
            referredBy: "geo-bed"
          }
        }, [201]);
        createdEventId = data?.data?.id ?? null;
        cleanup.push({ client: adminClient, method: "DELETE", path: `/events/${createdEventId}` });
        return { httpStatus: response.status, details: { eventId: createdEventId } };
      }
    });

    await runScenario(report, {
      name: "Register event with legacy ward/booth",
      method: "POST",
      path: `/events/${createdEventId}/register`,
      run: async () => {
        const { response } = await expectStatus(publicClient, "POST", `/events/${createdEventId}/register`, {
          body: {
            fullName: "Geo Bed Legacy Registration",
            contactNumber: publicSession.user.contactNumber,
            email: "legacy-registration@example.com",
            wardNumberId: ctx.urbanGeo.wardNumberId,
            boothNumberId: ctx.urbanGeo.boothNumberId,
            designationId: ctx.lookups.designation
          }
        }, [200, 201]);
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Register guest with full rural geo leaf",
      method: "POST",
      path: `/events/${createdEventId}/register`,
      run: async () => {
        const { response } = await expectStatus(publicClient, "POST", `/events/${createdEventId}/register`, {
          body: {
            fullName: "Geo Bed Guest",
            contactNumber: randomMobile(),
            email: "guest-registration@example.com",
            designationId: ctx.lookups.designation,
            ...ruralExact
          }
        }, [200, 201]);
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "List event registrations with partial geo filter",
      method: "GET",
      path: `/events/${createdEventId}/registrations`,
      run: async () => {
        const { response } = await expectStatus(
          adminClient,
          "GET",
          `/events/${createdEventId}/registrations${toQuery(urbanFilter)}`,
          {},
          [200]
        );
        return { httpStatus: response.status };
      }
    });

    let scheduleEventId = null;
    await runScenario(report, {
      name: "Create schedule event with full urban geo leaf",
      method: "POST",
      path: "/schedule-events",
      run: async () => {
        const { response, data } = await expectStatus(adminClient, "POST", "/schedule-events", {
          body: {
            title: `[geo-bed] schedule ${runId}`,
            description: "Geo API test bed schedule event",
            eventTypeId: ctx.lookups.eventType,
            colorId: ctx.lookups.color,
            start: "2026-04-02T10:00:00.000Z",
            end: "2026-04-02T11:00:00.000Z",
            latitude: 12.9716,
            longitude: 77.5946,
            locationText: "Schedule venue",
            ...urbanExact
          }
        }, [201]);
        scheduleEventId = data?.data?.id ?? null;
        cleanup.push({ client: adminClient, method: "DELETE", path: `/schedule-events/${scheduleEventId}` });
        return { httpStatus: response.status, details: { scheduleEventId } };
      }
    });

    await runScenario(report, {
      name: "List schedule events with partial geo filter",
      method: "GET",
      path: "/schedule-events",
      run: async () => {
        const { response } = await expectStatus(
          adminClient,
          "GET",
          `/schedule-events${toQuery({ ...urbanFilter, sort: "ASC", sortColumn: "start" })}`,
          {},
          [200]
        );
        return { httpStatus: response.status };
      }
    });

    let schemeApplicationId = null;
    await runScenario(report, {
      name: "Create scheme application with full rural geo leaf",
      method: "POST",
      path: "/scheme-applications",
      optional:
        !ctx.lookups.governmentLevel ||
        !ctx.lookups.sector ||
        !ctx.lookups.schemeType ||
        !ctx.lookups.ownershipType ||
        !ctx.lookups.gender ||
        !ctx.lookups.widowStatus ||
        !ctx.lookups.disabilityStatus ||
        !ctx.lookups.employmentStatus,
      run: async () => {
        const form = makeImageFileForm("geo-bed.png");
        const payload = {
          schemeId: ctx.lookups.scheme,
          applicantType: "SELF",
          applicantName: "Geo Bed Applicant",
          mobilePrimary: publicSession.user.contactNumber,
          email: "scheme@example.com",
          addressLine: "Scheme address",
          governmentLevelId: ctx.lookups.governmentLevel,
          sectorId: ctx.lookups.sector,
          schemeTypeId: ctx.lookups.schemeType,
          ownershipTypeId: ctx.lookups.ownershipType,
          genderOptionId: ctx.lookups.gender,
          widowStatusId: ctx.lookups.widowStatus,
          disabilityStatusId: ctx.lookups.disabilityStatus,
          employmentStatusId: ctx.lookups.employmentStatus,
          termsAccepted: "true",
          ...ruralExact
        };
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null) form.append(key, String(value));
        }
        const { response, data } = await expectStatus(publicClient, "POST", "/scheme-applications", {
          body: form
        }, [201]);
        schemeApplicationId = data?.data?.id ?? null;
        cleanup.push({ client: publicClient, method: "DELETE", path: `/scheme-applications/${schemeApplicationId}` });
        return { httpStatus: response.status, details: { schemeApplicationId } };
      }
    });

    await runScenario(report, {
      name: "List scheme applications with partial geo filter",
      method: "GET",
      path: "/scheme-applications",
      run: async () => {
        const { response } = await expectStatus(
          publicClient,
          "GET",
          `/scheme-applications${toQuery({ ...ruralFilter, status: 1, applicantType: "SELF", page: 1, limit: 20 })}`,
          {},
          [200]
        );
        return { httpStatus: response.status };
      }
    });

    let formEventId = null;
    await runScenario(report, {
      name: "Create form event with full geo accessibility payloads",
      method: "POST",
      path: "/form-events",
      run: async () => {
        const { response, data } = await expectStatus(adminClient, "POST", "/form-events", {
          body: {
            formId: ctx.lookups.form,
            title: `[geo-bed] form event ${runId}`,
            description: "Geo API test bed form event",
            startDate: "2026-04-03",
            endDate: "2026-04-10",
            accessibility: [
              {
                ...urbanExact,
                wardNumberId: ctx.urbanGeo.wardNumberId,
                boothNumberId: ctx.urbanGeo.boothNumberId,
                userRoleId: ctx.publicRoleId
              },
              {
                stateId: ctx.ruralGeo.stateId,
                mpConstituencyId: ctx.ruralGeo.mpConstituencyId,
                mlaConstituencyId: ctx.ruralGeo.mlaConstituencyId,
                settlementType: "RURAL",
                governingBody: "GP",
                gramPanchayatId: ctx.ruralGeo.gramPanchayatId,
                mainVillageId: -1,
                wardNumberId: -1,
                boothNumberId: -1,
                userRoleId: ctx.publicRoleId
              }
            ]
          }
        }, [201]);
        formEventId = data?.data?.id ?? null;
        cleanup.push({ client: adminClient, method: "DELETE", path: `/form-events/${formEventId}` });
        return { httpStatus: response.status, details: { formEventId } };
      }
    });

    await runScenario(report, {
      name: "Update form event with full geo accessibility payload",
      method: "PUT",
      path: `/form-events/${formEventId}`,
      run: async () => {
        const { response } = await expectStatus(adminClient, "PUT", `/form-events/${formEventId}`, {
          body: {
            title: `[geo-bed] form event update ${runId}`,
            startDate: "2026-04-04",
            endDate: "2026-04-11",
            accessibility: [
              {
                ...urbanExact,
                userRoleId: ctx.publicRoleId
              }
            ]
          }
        }, [200]);
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Users report with partial geo filter",
      method: "GET",
      path: "/reports/users",
      run: async () => {
        const { response } = await expectStatus(
          adminClient,
          "GET",
          `/reports/users${toQuery({ ...urbanFilter, page: 1, limit: 25 })}`,
          {},
          [200]
        );
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Public events report with partial geo filter",
      method: "GET",
      path: "/reports/public-events",
      run: async () => {
        const { response } = await expectStatus(
          adminClient,
          "GET",
          `/reports/public-events${toQuery({ eventId: createdEventId, ...urbanFilter })}`,
          {},
          [200]
        );
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Posts report with partial geo filter",
      method: "GET",
      path: "/reports/posts",
      run: async () => {
        const { response } = await expectStatus(
          adminClient,
          "GET",
          `/reports/posts${toQuery({ ...urbanFilter, days: 7 })}`,
          {},
          [200]
        );
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Form event report with legacy ward/booth filter",
      method: "GET",
      path: `/reports/form-events/${formEventId}`,
      run: async () => {
        const { response } = await expectStatus(
          adminClient,
          "GET",
          `/reports/form-events/${formEventId}${toQuery({
            ward_number_id: ctx.urbanGeo.wardNumberId,
            booth_number_id: ctx.urbanGeo.boothNumberId
          })}`,
          {},
          [200]
        );
        return { httpStatus: response.status };
      }
    });

    await runScenario(report, {
      name: "Targeted notification with partial geo accesses",
      method: "POST",
      path: "/notifications/send/targeted",
      optional: true,
      run: async () => {
        const actingClient = senderClient ?? adminClient;
        const { response } = await expectStatus(actingClient, "POST", "/notifications/send/targeted", {
          body: {
            title: `[geo-bed] targeted ${runId}`,
            body: "Geo targeted notification",
            roleId: ctx.publicRoleId,
            accesses: [
              {
                settlementType: "RURAL",
                governingBody: "GP",
                gramPanchayatId: ctx.ruralGeo.gramPanchayatId,
                mainVillageId: ctx.ruralGeo.mainVillageId
              }
            ],
            data: { runId }
          }
        }, [200]);
        return { httpStatus: response.status };
      }
    });

    for (const item of cleanup.reverse()) {
      try {
        await item.client.request(item.method, item.path, {});
        await sleep(100);
      } catch {
        // best-effort cleanup
      }
    }
  } finally {
    await db.end();
    report.finishedAt = new Date().toISOString();
    const paths = writeReportFiles(report);
    console.log(JSON.stringify({ summary: report.summary, reportFiles: paths }, null, 2));
    if (report.summary.failed > 0) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
