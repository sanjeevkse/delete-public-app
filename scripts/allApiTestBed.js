#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const BASE_URL = process.env.ALL_API_TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 8081}`;
const API_BASE = `${BASE_URL}/api`;
const MASTER_OTP = process.env.ALL_API_TEST_MASTER_OTP || process.env.MASTER_OTP || "123456";
const REPORT_DIR = path.join(process.cwd(), "artifacts", "all-api-test-bed");
const REQUEST_TIMEOUT_MS = Number(process.env.ALL_API_TEST_TIMEOUT_MS || 30000);

const ROUTE_MOUNTS = {
  authRoutes: ["/api/auth"],
  sidebarRoutes: ["/api/auth"],
  postRoutes: ["/api"],
  eventRoutes: ["/api"],
  jobRoutes: ["/api"],
  schemeRoutes: ["/api"],
  schemeCategoryRoutes: ["/api"],
  schemeSectorRoutes: ["/api"],
  userSchemeApplicationRoutes: ["/api"],
  memberRoutes: ["/api"],
  communityRoutes: ["/api"],
  familyMemberRoutes: ["/api"],
  businessRoutes: ["/api"],
  wardNumberRoutes: ["/api"],
  mlaConstituencyRoutes: ["/api"],
  boothNumberRoutes: ["/api"],
  complaintDepartmentRoutes: ["/api"],
  complaintSectorRoutes: ["/api"],
  complainTypesRoutes: ["/api"],
  complaintRoutes: ["/api"],
  complaintStatusRoutes: ["/api"],
  PaEventRoutes: ["/api"],
  scheduleEventRoutes: ["/api"],
  formBuilderRoutes: ["/api"],
  formEventRoutes: ["/api"],
  formSubmissionRoutes: ["/api/form-submissions"],
  metaTablesRoutes: ["/api"],
  notificationRoutes: ["/api/notifications"],
  notificationRecipientRoutes: ["/api/notifications"],
  targetedNotificationRoutes: ["/api/notifications"],
  roleRoutes: ["/api/roles", "/api/admin/roles", "/admin/roles"],
  permissionRoutes: ["/api/permissions", "/api/admin/permissions", "/admin/permissions"],
  permissionGroupRoutes: ["/api/admin/permission-groups", "/admin/permission-groups"],
  reportRoutes: ["/api/reports"],
  conditionalListRoutes: ["/api"],
  geoLookupRoutes: ["/api"],
  casteRelationRoutes: ["/api"],
  adminRoutes: ["/api/admin", "/admin"],
  telescopeRoutes: ["/telescope"],
  userRoutes: ["/api/admin/users", "/admin/users"]
};

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];
const ROUTE_FILES = Object.keys(ROUTE_MOUNTS).map((name) => path.join(process.cwd(), "src/routes", `${name}.ts`));
const runId = `all-api-test-bed-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const RETRYABLE_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "EPIPE"]);

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const readFileIfExists = (filePath) => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};

const parseRoutesFromFile = (filePath) => {
  const source = readFileIfExists(filePath);
  if (!source) {
    return [];
  }

  const routeFile = path.basename(filePath, ".ts");
  const mounts = ROUTE_MOUNTS[routeFile] || [];
  const regex = /router\.(get|post|put|patch|delete)\(\s*["'`](.*?)["'`]/g;
  const routes = [];
  let match = regex.exec(source);
  while (match) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    mounts.forEach((mount) => {
      const combined = `${mount}${routePath === "/" ? "" : routePath}`.replace(/\/+/g, "/");
      routes.push({
        sourceFile: routeFile,
        method,
        routePath,
        fullPath: combined || "/"
      });
    });
    match = regex.exec(source);
  }
  return routes;
};

const inventoryRoutes = () => {
  const seen = new Set();
  const routes = [];
  ROUTE_FILES.forEach((filePath) => {
    parseRoutesFromFile(filePath).forEach((route) => {
      const key = `${route.method}:${route.fullPath}`;
      if (!seen.has(key)) {
        seen.add(key);
        routes.push(route);
      }
    });
  });
  return routes.sort((a, b) => `${a.fullPath}:${a.method}`.localeCompare(`${b.fullPath}:${b.method}`));
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

const queryFirstIdIfTableExists = async (db, tableName, idColumn = "id", whereClause = "1=1") => {
  try {
    const row = await queryOne(
      db,
      `SELECT ${idColumn} AS id FROM ${tableName} WHERE ${whereClause} ORDER BY ${idColumn} ASC LIMIT 1`
    );
    return row ? Number(row.id) : null;
  } catch (error) {
    if (error && error.code === "ER_NO_SUCH_TABLE") {
      return null;
    }
    throw error;
  }
};

const queryLatestIdIfTableExists = async (db, tableName, idColumn = "id", whereClause = "1=1") => {
  try {
    const row = await queryOne(
      db,
      `SELECT ${idColumn} AS id FROM ${tableName} WHERE ${whereClause} ORDER BY ${idColumn} DESC LIMIT 1`
    );
    return row ? Number(row.id) : null;
  } catch (error) {
    if (error && error.code === "ER_NO_SUCH_TABLE") {
      return null;
    }
    throw error;
  }
};

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createClient = (token) => ({
  async request(method, targetPath, options = {}) {
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
      const response = await fetch(`${BASE_URL}${targetPath}`, {
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

const loginViaOtp = async (contactNumber) => {
  const client = createClient();
  await requestWithRetry(client, "POST", "/api/auth/request-otp", { body: { contactNumber } });
  const { response, data } = await requestWithRetry(client, "POST", "/api/auth/login", {
    body: { contactNumber, otp: MASTER_OTP }
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${contactNumber}: ${JSON.stringify(data)}`);
  }

  return {
    token: data?.data?.token,
    user: data?.data?.user
  };
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

  const publicRole = await queryOne(
    db,
    `SELECT id FROM tbl_meta_user_role WHERE LOWER(disp_name) = 'public' AND status = 1 LIMIT 1`
  );

  const ids = {
    eventId: await queryFirstIdIfTableExists(db, "tbl_event", "id", "status = 1"),
    postId: await queryFirstIdIfTableExists(db, "tbl_post", "id", "status = 1"),
    schemeId: await queryFirstIdIfTableExists(db, "tbl_scheme", "id", "status = 1"),
    schemeCategoryId: await queryFirstIdIfTableExists(db, "tbl_scheme_category", "id", "status = 1"),
    schemeSectorId: await queryFirstIdIfTableExists(db, "tbl_scheme_sector", "id", "status = 1"),
    memberId: await queryFirstIdIfTableExists(db, "tbl_member", "id", "status = 1"),
    communityId: await queryFirstIdIfTableExists(db, "tbl_community", "id", "status = 1"),
    familyMemberId: await queryFirstIdIfTableExists(db, "tbl_family_member", "id", "status = 1"),
    businessId: await queryFirstIdIfTableExists(db, "tbl_business", "id", "status = 1"),
    wardNumberId: await queryFirstIdIfTableExists(db, "tbl_meta_ward_number", "id", "status = 1"),
    boothNumberId: await queryFirstIdIfTableExists(db, "tbl_meta_booth_number", "id", "status = 1"),
    mlaConstituencyId: await queryFirstIdIfTableExists(db, "tbl_meta_mla_constituency", "id", "status = 1"),
    complaintDepartmentId: await queryFirstIdIfTableExists(db, "tbl_meta_complaint_department", "id", "status = 1"),
    complaintSectorId: await queryFirstIdIfTableExists(db, "tbl_meta_complaint_sector", "id", "status = 1"),
    complaintTypeId: await queryFirstIdIfTableExists(db, "tbl_meta_complaint_type", "id", "status = 1"),
    complaintStatusId: await queryFirstIdIfTableExists(db, "tbl_meta_complaint_status", "id", "status = 1"),
    paEventId: await queryFirstIdIfTableExists(db, "tbl_pa_event", "id", "status = 1"),
    scheduleEventId: await queryFirstIdIfTableExists(db, "tbl_schedule_event", "id", "status = 1"),
    formId: await queryFirstIdIfTableExists(db, "tbl_form", "id", "status = 1"),
    formFieldId: await queryFirstIdIfTableExists(db, "tbl_form_field", "id", "status = 1"),
    formFieldOptionId: await queryFirstIdIfTableExists(db, "tbl_form_field_option", "id", "status = 1"),
    formEventId: await queryFirstIdIfTableExists(db, "tbl_form_event", "id", "status = 1"),
    submissionId: await queryFirstIdIfTableExists(db, "tbl_form_submission", "id", "status = 1"),
    notificationLogId: await queryLatestIdIfTableExists(db, "tbl_notification_logs", "id"),
    targetedLogId: await queryLatestIdIfTableExists(db, "tbl_targeted_notification_logs", "id"),
    schemeApplicationId: await queryFirstIdIfTableExists(
      db,
      "tbl_user_scheme_applications",
      "application_id",
      "status = 1"
    ),
    jobId: await queryFirstIdIfTableExists(db, "tbl_job", "id", "status = 1"),
    complaintId: await queryFirstIdIfTableExists(db, "tbl_complaint", "id", "status = 1"),
    permissionId: await queryFirstIdIfTableExists(db, "tbl_permission", "id", "status = 1"),
    permissionGroupId: await queryFirstIdIfTableExists(db, "tbl_permission_group", "id", "status = 1"),
    roleId: await queryFirstIdIfTableExists(db, "tbl_role", "id", "status = 1"),
    sidebarId: await queryFirstIdIfTableExists(db, "tbl_sidebar", "id", "status = 1"),
    userId: await queryFirstIdIfTableExists(db, "tbl_user", "id", "status IN (1,2)"),
    formEventAccessibilityId: await queryFirstIdIfTableExists(db, "tbl_form_event_accessibility", "id"),
    registryCollectionId: await queryFirstIdIfTableExists(
      db,
      "tbl_meta_registry_collection",
      "id",
      "deleted_at IS NULL"
    ),
    registryEntryId: await queryFirstIdIfTableExists(db, "tbl_meta_table_registry", "id", "status = 1")
  };

  const tableNameRow = await queryOne(
    db,
    `SELECT table_name AS tableName FROM tbl_meta_table_registry WHERE status = 1 ORDER BY id ASC LIMIT 1`
  );

  const urbanGeo = await queryOne(
    db,
    `
      SELECT
        state_id AS stateId,
        district_id AS districtId,
        taluk_id AS talukId,
        mp_constituency_id AS mpConstituencyId,
        mla_constituency_id AS mlaConstituencyId,
        settlement_type AS settlementType,
        governing_body AS governingBody,
        local_body_id AS localBodyId,
        ward_number_id AS wardNumberId,
        booth_number_id AS boothNumberId
      FROM tbl_geo_political
      WHERE status = 1
        AND settlement_type = 'URBAN'
        AND local_body_id IS NOT NULL
        AND ward_number_id IS NOT NULL
      ORDER BY id ASC
      LIMIT 1
    `
  );

  const ruralGeo = await queryOne(
    db,
    `
      SELECT
        state_id AS stateId,
        district_id AS districtId,
        taluk_id AS talukId,
        mp_constituency_id AS mpConstituencyId,
        mla_constituency_id AS mlaConstituencyId,
        settlement_type AS settlementType,
        governing_body AS governingBody,
        gram_panchayat_id AS gramPanchayatId,
        main_village_id AS mainVillageId,
        booth_number_id AS boothNumberId
      FROM tbl_geo_political
      WHERE status = 1
        AND settlement_type = 'RURAL'
        AND governing_body = 'GP'
        AND gram_panchayat_id IS NOT NULL
        AND main_village_id IS NOT NULL
      ORDER BY id ASC
      LIMIT 1
    `
  );

  if (!adminUser || !publicRole) {
    throw new Error("Could not discover required admin/public users");
  }

  const notificationRecipientUser = ids.notificationLogId
    ? await queryOne(
        db,
        `
          SELECT user_id AS userId
          FROM tbl_notification_recipients
          WHERE notification_log_id = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [ids.notificationLogId]
      )
    : null;

  return {
    adminUser: { id: Number(adminUser.id), contactNumber: adminUser.contactNumber },
    publicRoleId: Number(publicRole.id),
    ids,
    tableName: tableNameRow?.tableName || "tbl_meta_state",
    urbanGeo,
    ruralGeo,
    notificationRecipientUserId: notificationRecipientUser ? Number(notificationRecipientUser.userId) : null,
    testMobile: randomMobile(),
    viewKey: "default"
  };
};

const makeImageForm = (extra = {}) => {
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
  form.append("document", new Blob([pngBytes], { type: "image/png" }), "all-api.png");
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });
  return form;
};

const resolveParamValue = (route, paramName, ctx) => {
  const ids = ctx.ids;
  const map = {
    id:
      ids[`${route.sourceFile.replace(/Routes$/, "")}Id`] ??
      ids.eventId ??
      ids.userId ??
      1,
    userId: ids.userId ?? ctx.adminUser.id,
    roleId: ids.roleId ?? ctx.publicRoleId ?? 1,
    permissionId: ids.permissionId ?? 1,
    permissionGroupId: ids.permissionGroupId ?? 1,
    contactNumber: ctx.adminUser.contactNumber,
    notificationLogId: ids.notificationLogId ?? 1,
    targetedLogId: ids.targetedLogId ?? 1,
    registrationId: 1,
    submissionId: ids.submissionId ?? 1,
    formEventId: ids.formEventId ?? 1,
    formId: ids.formId ?? 1,
    fieldId: ids.formFieldId ?? 1,
    optionId: ids.formFieldOptionId ?? 1,
    eventId: ids.eventId ?? 1,
    postId: ids.postId ?? 1,
    schemeId: ids.schemeId ?? 1,
    schemeTypeId: 1,
    stepId: 1,
    memberId: ids.memberId ?? 1,
    communityId: ids.communityId ?? 1,
    familyMemberId: ids.familyMemberId ?? 1,
    businessId: ids.businessId ?? 1,
    wardNumberId: ids.wardNumberId ?? 1,
    boothNumberId: ids.boothNumberId ?? 1,
    mlaConstituencyId: ids.mlaConstituencyId ?? 1,
    complaintId: ids.complaintId ?? 1,
    jobId: ids.jobId ?? 1,
    tableName: ctx.tableName,
    table_name: ctx.tableName,
    viewKey: ctx.viewKey,
    sidebarId: ids.sidebarId ?? 1,
    sidebarViewId: 1,
    role_id: ids.roleId ?? ctx.publicRoleId ?? 1,
    user_id: ids.userId ?? ctx.adminUser.id
  };

  return map[paramName] ?? 1;
};

const resolvePath = (route, ctx) =>
  route.fullPath.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, paramName) =>
    encodeURIComponent(String(resolveParamValue(route, paramName, ctx)))
  );

const enrichPath = (route, resolvedPath, ctx) => {
  if (route.fullPath === "/api/notifications/:notificationLogId/user-status") {
    const userId = ctx.notificationRecipientUserId ?? ctx.adminUser.id;
    return `${resolvedPath}?userId=${encodeURIComponent(String(userId))}`;
  }
  if (route.fullPath === "/api/notifications/users/:userId/failed") {
    return `${resolvedPath}?limit=10&offset=0`;
  }
  if (route.fullPath === "/api/notifications/delivery/summary") {
    return `${resolvedPath}?status=failed`;
  }
  return resolvedPath;
};

const chooseClient = (route, clients) => {
  if (route.fullPath === "/api/auth/request-otp" || route.fullPath === "/api/auth/login") {
    return clients.anon;
  }
  if (route.fullPath.startsWith("/telescope")) {
    return clients.anon;
  }
  if (route.fullPath.startsWith("/api/auth")) {
    return clients.admin;
  }
  return clients.admin;
};

const buildBody = (route, ctx) => {
  const pathName = route.fullPath;
  const method = route.method;

  if (pathName === "/api/auth/request-otp") {
    return { contactNumber: ctx.testMobile };
  }
  if (pathName === "/api/auth/login") {
    return { contactNumber: ctx.testMobile, otp: MASTER_OTP };
  }
  if (pathName === "/api/auth/profile" && method === "PATCH") {
    return { displayName: `All API Test ${runId}` };
  }
  if (pathName === "/api/notifications/tokens/register") {
    ctx.notificationToken = `all-api-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { token: ctx.notificationToken, platform: "web" };
  }
  if (pathName === "/api/notifications/tokens/unregister") {
    return { userId: ctx.adminUser.id, token: ctx.notificationToken || "all-api-missing-token" };
  }
  if (pathName === "/api/notifications/topics/subscribe") {
    return { topic: "all-api-bed" };
  }
  if (pathName === "/api/notifications/topics/unsubscribe") {
    return { topic: "all-api-bed" };
  }
  if (pathName === "/api/notifications/send/user") {
    return { userId: ctx.adminUser.id, title: "All API Bed", body: "user notification" };
  }
  if (pathName === "/api/notifications/send/users") {
    return { userIds: [ctx.adminUser.id], title: "All API Bed", body: "user notifications" };
  }
  if (pathName === "/api/notifications/send/topic") {
    return { topic: "all-api-bed", title: "All API Bed", body: "topic notification" };
  }
  if (pathName === "/api/notifications/send/broadcast") {
    return { title: "All API Bed", body: "broadcast notification" };
  }
  if (pathName === "/api/notifications/send/targeted") {
    return {
      title: "All API Bed",
      body: "targeted notification",
      roleId: ctx.publicRoleId,
      accesses: ctx.ruralGeo
        ? [
            {
              settlementType: "RURAL",
              governingBody: "GP",
              gramPanchayatId: ctx.ruralGeo.gramPanchayatId,
              mainVillageId: ctx.ruralGeo.mainVillageId
            }
          ]
        : []
    };
  }
  if (pathName === "/api/complaint-types" && method === "POST") {
    return {
      dispName: `All API Complaint Type ${Date.now()}`,
      description: "all api complaint type",
      steps: [{ stepOrder: 1, dispName: "Step One", description: "initial step" }]
    };
  }
  if (pathName.endsWith("/register")) {
    return {
      fullName: "All API Bed",
      contactNumber: ctx.testMobile,
      designationId: 1
    };
  }
  if (pathName.includes("/scheme-applications") && method === "POST") {
    return makeImageForm({
      schemeId: ctx.ids.schemeId ?? 1,
      applicantType: "SELF",
      applicantName: "All API Applicant",
      mobilePrimary: ctx.testMobile,
      addressLine: "API test address",
      governmentLevelId: 1,
      sectorId: 1,
      schemeTypeId: 1,
      ownershipTypeId: 1,
      genderOptionId: 1,
      widowStatusId: 1,
      disabilityStatusId: 1,
      employmentStatusId: 1,
      termsAccepted: "true"
    });
  }
  if (/(POST|PUT|PATCH)/.test(method)) {
    return {};
  }
  return undefined;
};

const classifyResult = (route, response, data) => {
  const status = response.status;
  const reason = data?.error?.message || data?.message || `HTTP ${status}`;
  const isEnvironmentBlocked =
    reason.includes("Firebase has not been initialized") ||
    reason.includes("OTP provider is not configured") ||
    reason.includes("No active device tokens found") ||
    reason.includes("No users found matching the specified access and role criteria");

  if (reason.includes("Failed to lookup view") && route.sourceFile === "adminRoutes") {
    return { bucket: "reachable4xx", reason };
  }

  if (status >= 500) {
    return { bucket: isEnvironmentBlocked ? "reachable4xx" : "failed", reason };
  }
  if (status === 404) {
    if (reason.includes("No active device tokens found")) {
      return { bucket: "reachable4xx", reason };
    }
    if (reason.includes("No users found matching the specified access and role criteria")) {
      return { bucket: "reachable4xx", reason };
    }
    return {
      bucket: route.fullPath.includes(":") ? "soft404" : "failed",
      reason
    };
  }
  if (status >= 400) {
    return { bucket: "reachable4xx", reason };
  }
  return { bucket: "passed", reason: null };
};

const writeReports = (report) => {
  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, `${runId}.json`);
  const mdPath = path.join(REPORT_DIR, `${runId}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const lines = [
    "# All API Test Bed",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Base URL: \`${report.baseUrl}\``,
    `- Total Routes: \`${report.summary.total}\``,
    `- Passed: \`${report.summary.passed}\``,
    `- Reachable 4xx: \`${report.summary.reachable4xx}\``,
    `- Soft 404: \`${report.summary.soft404}\``,
    `- Failed: \`${report.summary.failed}\``,
    "",
    "## Routes"
  ];

  report.results.forEach((result) => {
    lines.push(
      `- [${result.bucket}] ${result.method} ${result.path} -> ${result.httpStatus}`
    );
    if (result.reason) {
      lines.push(`  reason: ${result.reason}`);
    }
  });

  fs.writeFileSync(mdPath, lines.join("\n") + "\n");
  return { jsonPath, mdPath };
};

async function main() {
  const routes = inventoryRoutes();
  const report = {
    runId,
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    summary: {
      total: routes.length,
      passed: 0,
      reachable4xx: 0,
      soft404: 0,
      failed: 0
    },
    results: []
  };

  const db = await connectDb();
  try {
    const ctx = await discoverContext(db);
    const adminSession = await loginViaOtp(ctx.adminUser.contactNumber);
    const clients = {
      anon: createClient(),
      admin: createClient(adminSession.token)
    };

    for (const route of routes) {
      const resolvedPath = enrichPath(route, resolvePath(route, ctx), ctx);
      const body = buildBody(route, ctx);
      const client = chooseClient(route, clients);
      let options = {};
      if (body !== undefined) {
        options = { body };
      }

      try {
        const { response, data } = await requestWithRetry(client, route.method, resolvedPath, options);
        const classified = classifyResult(route, response, data);
        report.summary[classified.bucket] += 1;
        report.results.push({
          sourceFile: route.sourceFile,
          method: route.method,
          path: resolvedPath,
          template: route.fullPath,
          httpStatus: response.status,
          bucket: classified.bucket,
          reason: classified.reason
        });
      } catch (error) {
        report.summary.failed += 1;
        report.results.push({
          sourceFile: route.sourceFile,
          method: route.method,
          path: resolvedPath,
          template: route.fullPath,
          httpStatus: null,
          bucket: "failed",
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }
  } finally {
    await db.end();
    report.finishedAt = new Date().toISOString();
    const files = writeReports(report);
    console.log(JSON.stringify({ summary: report.summary, reportFiles: files }, null, 2));
    if (report.summary.failed > 0) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
