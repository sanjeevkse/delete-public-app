#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const XLSX = require("xlsx");

const INPUT_PATH =
  process.argv[2] ||
  path.join(process.cwd(), "Jansev-Rigistration-Qes.xlsx - Registration Form.csv");
const OUTPUT_PATH =
  process.argv[3] ||
  path.join(process.cwd(), "sql", "GEO_IDEAL_ARCHITECTURE_STAGE_SEED_SQL.sql");

const HEADERS_ROW_INDEX = 1;
const FIRST_DATA_ROW_INDEX = 3;

const normalizeWhitespace = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const nullableText = (value) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  return normalized;
};

const parseConstituency = (value) => {
  const normalized = nullableText(value);
  if (!normalized) {
    return { code: null, name: null };
  }

  const match = normalized.match(/^([0-9]+)\s*-\s*(.+)$/);
  if (!match) {
    return { code: null, name: normalized };
  }

  return {
    code: match[1],
    name: normalizeWhitespace(match[2])
  };
};

const parseSettlementType = (value) => {
  const normalized = nullableText(value);
  if (!normalized) {
    return null;
  }

  const upper = normalized.toUpperCase();
  return upper === "URBAN" || upper === "RURAL" ? upper : null;
};

const parseLocalBody = (settlementType, localBodyRaw, gpOrWardRaw) => {
  if (settlementType === "RURAL") {
    return {
      localBodyType: "GP",
      localBodyName: nullableText(gpOrWardRaw),
      gramPanchayatName: nullableText(gpOrWardRaw),
      wardName: null
    };
  }

  const normalized = nullableText(localBodyRaw);
  const gpOrWard = nullableText(gpOrWardRaw);
  if (!normalized) {
    return {
      localBodyType: null,
      localBodyName: null,
      gramPanchayatName: null,
      wardName: gpOrWard
    };
  }

  const match = normalized.match(/^(.*?)\s*\((GBA|CC|CMC|TMC|TP)\)$/i);
  if (match) {
    return {
      localBodyType: match[2].toUpperCase(),
      localBodyName: normalizeWhitespace(match[1]),
      gramPanchayatName: null,
      wardName: gpOrWard
    };
  }

  return {
    localBodyType: normalized.toUpperCase(),
    localBodyName: normalized,
    gramPanchayatName: null,
    wardName: gpOrWard
  };
};

const parseBoothNumber = (value) => {
  const normalized = nullableText(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const toHexUtf8 = (value) => Buffer.from(String(value), "utf8").toString("hex");

const sqlString = (value) => {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `CONVERT(0x${toHexUtf8(value)} USING utf8mb4)`;
};

const sqlJson = (value) =>
  `CAST(CONVERT(0x${toHexUtf8(JSON.stringify(value))} USING utf8mb4) AS JSON)`;

const workbook = XLSX.readFile(INPUT_PATH, { raw: false });
const firstSheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[firstSheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

const headers = rows[HEADERS_ROW_INDEX];
if (!Array.isArray(headers) || headers.length === 0) {
  throw new Error("Could not find the registration CSV headers on row 2.");
}

const dataRows = rows.slice(FIRST_DATA_ROW_INDEX);
const rawInserts = [];
const normalizedInserts = [];

for (let index = 0; index < dataRows.length; index += 1) {
  const row = dataRows[index];
  if (!Array.isArray(row) || row.every((cell) => normalizeWhitespace(cell) === "")) {
    continue;
  }

  const record = {};
  headers.forEach((header, headerIndex) => {
    record[header] = row[headerIndex] ?? "";
  });

  const settlementType = parseSettlementType(record["Urban/Rural"]);
  if (!settlementType) {
    continue;
  }

  const { code: mpCode, name: mpName } = parseConstituency(record["MP No & MP Name"]);
  const { code: mlaCode, name: mlaName } = parseConstituency(record["MLA No & MLA Name"]);
  const localBody = parseLocalBody(
    settlementType,
    record["GBA/CC/CMC/TMC/TP"],
    record["GP/ Ward "]
  );

  const normalizedRecord = {
    sourceRowNo: index + FIRST_DATA_ROW_INDEX + 1,
    stateName: nullableText(record["State"]),
    districtName: nullableText(record["District Name"]),
    mpCode,
    mpName,
    mlaCode,
    mlaName,
    talukName: nullableText(record["Taluk Name"]),
    settlementType,
    localBodyType: localBody.localBodyType,
    localBodyName: localBody.localBodyName,
    hobaliName: nullableText(record["Hobali"]),
    gramPanchayatName: localBody.gramPanchayatName,
    wardName: localBody.wardName,
    mainVillageName: nullableText(record["Main Area / Village"]),
    subVillageName: nullableText(record["Sub-Area/Village"]),
    boothNumber: parseBoothNumber(record["Booth No"]),
    pollingStationName: nullableText(record[" Bck End show PS_Name"])
  };

  const sourceHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizedRecord))
    .digest("hex");

  rawInserts.push(
    `(${normalizedRecord.sourceRowNo}, ${sqlJson(record)}, 1, NOW())`
  );
  normalizedInserts.push(
    `(${normalizedRecord.sourceRowNo}, ${sqlString(normalizedRecord.stateName)}, ${sqlString(
      normalizedRecord.districtName
    )}, ${sqlString(normalizedRecord.mpCode)}, ${sqlString(
      normalizedRecord.mpName
    )}, ${sqlString(normalizedRecord.mlaCode)}, ${sqlString(
      normalizedRecord.mlaName
    )}, ${sqlString(normalizedRecord.talukName)}, ${sqlString(
      normalizedRecord.settlementType
    )}, ${sqlString(normalizedRecord.localBodyType)}, ${sqlString(
      normalizedRecord.localBodyName
    )}, ${sqlString(normalizedRecord.hobaliName)}, ${sqlString(
      normalizedRecord.gramPanchayatName
    )}, ${sqlString(normalizedRecord.wardName)}, ${sqlString(
      normalizedRecord.mainVillageName
    )}, ${sqlString(normalizedRecord.subVillageName)}, ${
      normalizedRecord.boothNumber === null ? "NULL" : normalizedRecord.boothNumber
    }, ${sqlString(normalizedRecord.pollingStationName)}, ${sqlString(sourceHash)}, NOW())`
  );
}

const sql = `-- Generated from ${path.basename(INPUT_PATH)}
-- Rows: ${normalizedInserts.length}

CREATE TABLE IF NOT EXISTS stg_geo_registration_raw (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_row_no INT NOT NULL,
  raw_payload_json JSON NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stg_geo_registration_raw_row (source_row_no)
);

CREATE TABLE IF NOT EXISTS stg_geo_registration_normalized (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_row_no INT NOT NULL,
  state_name VARCHAR(191) NOT NULL,
  district_name VARCHAR(191) DEFAULT NULL,
  mp_code VARCHAR(32) DEFAULT NULL,
  mp_name VARCHAR(191) DEFAULT NULL,
  mla_code VARCHAR(32) DEFAULT NULL,
  mla_name VARCHAR(191) DEFAULT NULL,
  taluk_name VARCHAR(191) DEFAULT NULL,
  settlement_type ENUM('URBAN', 'RURAL') NOT NULL,
  local_body_type ENUM('GBA', 'CC', 'CMC', 'TMC', 'TP', 'GP') NOT NULL,
  local_body_name VARCHAR(191) DEFAULT NULL,
  hobali_name VARCHAR(191) DEFAULT NULL,
  gram_panchayat_name VARCHAR(191) DEFAULT NULL,
  ward_name VARCHAR(191) DEFAULT NULL,
  main_village_name VARCHAR(191) DEFAULT NULL,
  sub_village_name VARCHAR(191) DEFAULT NULL,
  booth_number INT DEFAULT NULL,
  polling_station_name VARCHAR(255) DEFAULT NULL,
  source_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stg_geo_registration_normalized_hash (source_hash),
  KEY idx_stg_geo_registration_normalized_taluk (taluk_name),
  KEY idx_stg_geo_registration_normalized_local_body (local_body_type, local_body_name)
);

DELETE FROM stg_geo_registration_raw;
DELETE FROM stg_geo_registration_normalized;

INSERT INTO stg_geo_registration_raw (
  source_row_no,
  raw_payload_json,
  status,
  created_at
) VALUES
${rawInserts.join(",\n")};

INSERT INTO stg_geo_registration_normalized (
  source_row_no,
  state_name,
  district_name,
  mp_code,
  mp_name,
  mla_code,
  mla_name,
  taluk_name,
  settlement_type,
  local_body_type,
  local_body_name,
  hobali_name,
  gram_panchayat_name,
  ward_name,
  main_village_name,
  sub_village_name,
  booth_number,
  polling_station_name,
  source_hash,
  created_at
) VALUES
${normalizedInserts.join(",\n")};
`;

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, sql);
process.stdout.write(`Wrote ${normalizedInserts.length} normalized rows to ${OUTPUT_PATH}\n`);
