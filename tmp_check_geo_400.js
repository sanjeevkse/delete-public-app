#!/usr/bin/env node
require('dotenv').config({ path: '/Users/rish6ix/personal/Feed/.env' });
const mysql = require('mysql2/promise');

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 8081}/api`;
const MASTER_OTP = process.env.GEO_TEST_MASTER_OTP || process.env.MASTER_OTP || '123456';

const randomMobile = () => {
  const firstDigit = Math.floor(Math.random() * 4) + 6;
  const remaining = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0');
  return `+91${firstDigit}${remaining}`;
};

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
};

const client = (token) => ({
  async req(method, path, body) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload = body;
    if (payload && !(payload instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(payload);
    }
    const response = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });
    const data = await safeJson(response);
    return { response, data };
  }
});

const login = async (contactNumber) => {
  const c = client();
  await c.req('POST', '/auth/request-otp', { contactNumber });
  const { response, data } = await c.req('POST', '/auth/login', { contactNumber, otp: MASTER_OTP });
  if (!response.ok) throw new Error(`login failed ${contactNumber}: ${JSON.stringify(data)}`);
  return { token: data?.data?.token, user: data?.data?.user };
};

const q1 = async (db, sql, p=[]) => {
  const [rows] = await db.execute(sql,p);
  return rows[0] || null;
};

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const adminUser = (await q1(db, `SELECT u.id, u.contact_number AS contactNumber
      FROM tbl_user u
      INNER JOIN tbl_xref_user_role ur ON ur.user_id = u.id AND ur.status = 1
      INNER JOIN tbl_meta_user_role r ON r.id = ur.role_id AND r.status = 1
      WHERE LOWER(r.disp_name) = 'admin' AND u.contact_number IS NOT NULL
      ORDER BY u.id ASC LIMIT 1`))
      || (await q1(db, `SELECT id, contact_number AS contactNumber FROM tbl_user WHERE contact_number IS NOT NULL ORDER BY id ASC LIMIT 1`));

  const urbanGeo = await q1(db, `SELECT state_id AS stateId,district_id AS districtId,taluk_id AS talukId,mp_constituency_id AS mpConstituencyId,mla_constituency_id AS mlaConstituencyId,settlement_type AS settlementType,governing_body AS governingBody,local_body_id AS localBodyId,ward_number_id AS wardNumberId,booth_number_id AS boothNumberId,polling_station_id AS pollingStationId FROM tbl_geo_political WHERE status=1 AND settlement_type='URBAN' AND local_body_id IS NOT NULL AND ward_number_id IS NOT NULL AND booth_number_id IS NOT NULL ORDER BY id ASC LIMIT 1`);

  const ruralGeo = await q1(db, `SELECT state_id AS stateId,district_id AS districtId,taluk_id AS talukId,mp_constituency_id AS mpConstituencyId,mla_constituency_id AS mlaConstituencyId,settlement_type AS settlementType,governing_body AS governingBody,hobali_id AS hobaliId,gram_panchayat_id AS gramPanchayatId,main_village_id AS mainVillageId,sub_village_id AS subVillageId,booth_number_id AS boothNumberId,polling_station_id AS pollingStationId FROM tbl_geo_political WHERE status=1 AND settlement_type='RURAL' AND governing_body='GP' AND gram_panchayat_id IS NOT NULL AND main_village_id IS NOT NULL AND booth_number_id IS NOT NULL ORDER BY id ASC LIMIT 1`);

  const lookups = {
    eventType: await q1(db, `SELECT id FROM tbl_meta_event_type WHERE status=1 ORDER BY id ASC LIMIT 1`),
    designation: await q1(db, `SELECT id FROM tbl_meta_designation WHERE status=1 ORDER BY id ASC LIMIT 1`),
    scheme: await q1(db, `SELECT id FROM tbl_scheme WHERE status=1 ORDER BY id ASC LIMIT 1`),
    governmentLevel: await q1(db, `SELECT id FROM tbl_meta_government_level WHERE status=1 ORDER BY id ASC LIMIT 1`),
    sector: await q1(db, `SELECT id FROM tbl_meta_complaint_sector WHERE status=1 ORDER BY id ASC LIMIT 1`),
    schemeType: await q1(db, `SELECT id FROM tbl_meta_scheme_type_lookup WHERE status=1 ORDER BY id ASC LIMIT 1`),
    ownershipType: await q1(db, `SELECT id FROM tbl_meta_ownership_type WHERE status=1 ORDER BY id ASC LIMIT 1`),
    gender: await q1(db, `SELECT id FROM tbl_meta_gender_option WHERE status=1 ORDER BY id ASC LIMIT 1`),
    widowStatus: await q1(db, `SELECT id FROM tbl_meta_widow_status WHERE status=1 ORDER BY id ASC LIMIT 1`),
    disabilityStatus: await q1(db, `SELECT id FROM tbl_meta_disability_status WHERE status=1 ORDER BY id ASC LIMIT 1`),
    employmentStatus: await q1(db, `SELECT id FROM tbl_meta_employment_status WHERE status=1 ORDER BY id ASC LIMIT 1`)
  };

  const admin = await login(adminUser.contactNumber);
  const pub = await login(randomMobile());

  const adminC = client(admin.token);
  const pubC = client(pub.token);

  const e = await adminC.req('POST', '/events', {
    title: '[debug] geo 400', description: 'debug', place: 'x', eventTypeId: lookups.eventType.id,
    latitude: 12.9, longitude: 77.5, startDate: '2026-04-01', startTime: '10:00', endDate: '2026-04-01', endTime: '12:00', referredBy: 'debug'
  });
  const eventId = e.data?.data?.id;
  console.log('create event', e.response.status, e.data?.message, 'id=', eventId);

  const r1 = await pubC.req('POST', `/events/${eventId}/register`, {
    fullName: 'Geo Bed Legacy Registration', contactNumber: pub.user.contactNumber, email: 'legacy-registration@example.com',
    wardNumberId: urbanGeo.wardNumberId, boothNumberId: urbanGeo.boothNumberId, designationId: lookups.designation.id
  });
  console.log('register legacy', r1.response.status, JSON.stringify(r1.data));

  const r2 = await pubC.req('POST', `/events/${eventId}/register`, {
    fullName: 'Geo Bed Guest', contactNumber: randomMobile(), email: 'guest-registration@example.com', designationId: lookups.designation.id,
    ...ruralGeo
  });
  console.log('register rural', r2.response.status, JSON.stringify(r2.data));

  const form = new FormData();
  const pngBytes = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0x0d,0x49,0x48,0x44,0x52,0,0,0,1,0,0,0,1,8,6,0,0,0,0x1f,0x15,0xc4,0x89,0,0,0,0x0d,0x49,0x44,0x41,0x54,0x78,0x9c,0x63,0xf8,0xcf,0xc0,0,0,0x03,0x01,0x01,0,0xc9,0xfe,0x92,0xef,0,0,0,0,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82]);
  form.append('document', new Blob([pngBytes], { type: 'image/png' }), 'geo-bed.png');
  const payload = {
    schemeId: lookups.scheme.id, applicantType: 'SELF', applicantName: 'Geo Bed Applicant', mobilePrimary: pub.user.contactNumber,
    email: 'scheme@example.com', addressLine: 'Scheme address', governmentLevelId: lookups.governmentLevel.id, sectorId: lookups.sector.id,
    schemeTypeId: lookups.schemeType.id, ownershipTypeId: lookups.ownershipType.id, genderOptionId: lookups.gender.id,
    widowStatusId: lookups.widowStatus.id, disabilityStatusId: lookups.disabilityStatus.id, employmentStatusId: lookups.employmentStatus.id,
    termsAccepted: 'true', ...ruralGeo
  };
  for (const [k,v] of Object.entries(payload)) if (v !== undefined && v !== null) form.append(k, String(v));
  const s = await pubC.req('POST', '/scheme-applications', form);
  console.log('scheme apply', s.response.status, JSON.stringify(s.data));

  await db.end();
})();
