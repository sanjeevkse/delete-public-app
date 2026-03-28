#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

require("../dist/models");

const REPORT_DIR = path.join(process.cwd(), "artifacts", "accessibility-matrix-test-bed");
const runId = `accessibility-matrix-test-bed-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const { validateAccessibles } = require("../dist/services/userAccessService");
const {
  compileUserAccessScopes,
  resolveGeoUnitIdsForAccessibles
} = require("../dist/services/userAccessScopeService");
const { resolveGeoUnitRecordFromInput } = require("../dist/services/geoUnitService");

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

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

const queryMany = async (db, sql, params = []) => {
  const [rows] = await db.execute(sql, params);
  return Array.isArray(rows) ? rows : [];
};

const writeReportFiles = (report) => {
  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, `${runId}.json`);
  const mdPath = path.join(REPORT_DIR, `${runId}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const lines = [
    "# Accessibility Matrix Test Bed",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Started At: \`${report.startedAt}\``,
    `- Finished At: \`${report.finishedAt}\``,
    `- Passed: \`${report.summary.passed}\``,
    `- Failed: \`${report.summary.failed}\``,
    "",
    "## Scenarios"
  ];

  for (const scenario of report.scenarios) {
    lines.push(`- [${scenario.status}] ${scenario.name}`);
    if (scenario.error) {
      lines.push(`  error: ${scenario.error}`);
    }
  }

  fs.writeFileSync(mdPath, lines.join("\n") + "\n");
  return { jsonPath, mdPath };
};

const normalizeRow = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, typeof value === "bigint" ? Number(value) : value])
  );

const randomPick = (rows) => rows[Math.floor(Math.random() * rows.length)];
const pickDifferent = (rows, seed, key) => rows.find((row) => row[key] !== seed[key]) ?? rows[0];

const runScenario = async (report, scenario) => {
  try {
    const details = await scenario.run();
    report.scenarios.push({
      name: scenario.name,
      status: "passed",
      details: details ?? null
    });
    report.summary.passed += 1;
  } catch (error) {
    report.scenarios.push({
      name: scenario.name,
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    });
    report.summary.failed += 1;
  }
};

const expectThrows = async (fn, matcher) => {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!matcher(message)) {
      throw new Error(`Unexpected error message: ${message}`);
    }
    return;
  }
  throw new Error("Expected scenario to throw");
};

async function main() {
  const report = {
    runId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    summary: { passed: 0, failed: 0 },
    scenarios: []
  };

  const db = await connectDb();
  try {
    const urbanRows = (await queryMany(
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
          ward_number_id AS wardNumberId,
          booth_number_id AS boothNumberId,
          polling_station_id AS pollingStationId
        FROM tbl_geo_political
        WHERE status = 1
          AND settlement_type = 'URBAN'
          AND local_body_id IS NOT NULL
          AND ward_number_id IS NOT NULL
          AND booth_number_id IS NOT NULL
        ORDER BY RAND()
        LIMIT 5
      `
    )).map(normalizeRow);

    const ruralRows = (await queryMany(
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
          hobali_id AS hobaliId,
          gram_panchayat_id AS gramPanchayatId,
          main_village_id AS mainVillageId,
          sub_village_id AS subVillageId,
          booth_number_id AS boothNumberId,
          polling_station_id AS pollingStationId
        FROM tbl_geo_political
        WHERE status = 1
          AND settlement_type = 'RURAL'
          AND governing_body = 'GP'
          AND gram_panchayat_id IS NOT NULL
          AND main_village_id IS NOT NULL
          AND booth_number_id IS NOT NULL
        ORDER BY RAND()
        LIMIT 5
      `
    )).map(normalizeRow);

    if (urbanRows.length === 0 || ruralRows.length === 0) {
      throw new Error("Missing urban or rural geo rows for accessibility matrix tests");
    }

    const urban = randomPick(urbanRows);
    const rural = randomPick(ruralRows);
    const urbanAlt = pickDifferent(urbanRows, urban, "id");
    const ruralAlt = pickDifferent(ruralRows, rural, "id");

    await runScenario(report, {
      name: "Urban wildcard compiles to LOCAL_BODY and covers sample leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            stateId: urban.stateId,
            mpConstituencyId: urban.mpConstituencyId,
            mlaConstituencyId: urban.mlaConstituencyId,
            settlementType: "URBAN",
            governingBody: urban.governingBody,
            localBodyId: urban.localBodyId,
            wardNumberId: -1
          }
        ]);
        const compiled = compileUserAccessScopes(validated);
        if (compiled.length !== 1 || compiled[0].scopeType !== "LOCAL_BODY" || compiled[0].scopeId !== urban.localBodyId) {
          throw new Error(`Unexpected compiled scope: ${JSON.stringify(compiled)}`);
        }
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(urban.id)) {
          throw new Error("Resolved geo access does not include sampled urban leaf");
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "Rural wildcard compiles to GRAM_PANCHAYAT and covers sample leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            stateId: rural.stateId,
            mlaConstituencyId: rural.mlaConstituencyId,
            settlementType: "RURAL",
            governingBody: "GP",
            gramPanchayatId: rural.gramPanchayatId,
            mainVillageId: -1
          }
        ]);
        const compiled = compileUserAccessScopes(validated);
        if (
          compiled.length !== 1 ||
          compiled[0].scopeType !== "GRAM_PANCHAYAT" ||
          compiled[0].scopeId !== rural.gramPanchayatId
        ) {
          throw new Error(`Unexpected compiled scope: ${JSON.stringify(compiled)}`);
        }
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(rural.id)) {
          throw new Error("Resolved geo access does not include sampled rural leaf");
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "Top-level wildcard compiles to GLOBAL unrestricted access",
      run: async () => {
        const validated = validateAccessibles([{ stateId: -1 }]);
        const compiled = compileUserAccessScopes(validated);
        if (compiled.length !== 1 || compiled[0].scopeType !== "GLOBAL") {
          throw new Error(`Unexpected compiled scope: ${JSON.stringify(compiled)}`);
        }
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.unrestricted) {
          throw new Error("Expected unrestricted result for GLOBAL wildcard");
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "Exact urban booth access resolves and includes sample leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "URBAN",
            governingBody: urban.governingBody,
            localBodyId: urban.localBodyId,
            wardNumberId: urban.wardNumberId,
            boothNumberId: urban.boothNumberId
          }
        ]);
        const compiled = compileUserAccessScopes(validated);
        if (compiled[0].scopeType !== "BOOTH") {
          throw new Error(`Expected BOOTH scope, got ${compiled[0].scopeType}`);
        }
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(urban.id)) {
          throw new Error("Exact urban booth access did not include sample leaf");
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "Exact rural booth access resolves and includes sample leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "RURAL",
            governingBody: "GP",
            gramPanchayatId: rural.gramPanchayatId,
            mainVillageId: rural.mainVillageId,
            boothNumberId: rural.boothNumberId
          }
        ]);
        const compiled = compileUserAccessScopes(validated);
        if (compiled[0].scopeType !== "BOOTH") {
          throw new Error(`Expected BOOTH scope, got ${compiled[0].scopeType}`);
        }
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(rural.id)) {
          throw new Error("Exact rural booth access did not include sample leaf");
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "MLA wildcard compiles to MLA_CONSTITUENCY and covers urban sample leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            stateId: urban.stateId,
            mpConstituencyId: urban.mpConstituencyId,
            mlaConstituencyId: urban.mlaConstituencyId,
            wardNumberId: -1
          }
        ]);
        const compiled = compileUserAccessScopes(validated);
        if (compiled.length !== 1 || compiled[0].scopeType !== "MLA_CONSTITUENCY") {
          throw new Error(`Unexpected compiled scope: ${JSON.stringify(compiled)}`);
        }
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(urban.id)) {
          throw new Error("MLA wildcard did not include sampled urban leaf");
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "Main-village wildcard compiles to MAIN_VILLAGE and covers rural sample leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "RURAL",
            governingBody: "GP",
            gramPanchayatId: rural.gramPanchayatId,
            mainVillageId: rural.mainVillageId,
            subVillageId: -1
          }
        ]);
        const compiled = compileUserAccessScopes(validated);
        if (compiled.length !== 1 || compiled[0].scopeType !== "MAIN_VILLAGE") {
          throw new Error(`Unexpected compiled scope: ${JSON.stringify(compiled)}`);
        }
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(rural.id)) {
          throw new Error("Main village wildcard did not include sampled rural leaf");
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "Explicit child after wildcard is rejected",
      run: async () => {
        await expectThrows(
          async () =>
            compileUserAccessScopes(
              validateAccessibles([
                {
                  mlaConstituencyId: urban.mlaConstituencyId,
                  wardNumberId: -1,
                  boothNumberId: urban.boothNumberId
                }
              ])
            ),
          (message) => message.includes("after a wildcard ancestor")
        );
      }
    });

    await runScenario(report, {
      name: "Duplicate access rows dedupe to one compiled scope",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "URBAN",
            governingBody: urban.governingBody,
            localBodyId: urban.localBodyId,
            wardNumberId: -1
          },
          {
            settlementType: "URBAN",
            governingBody: urban.governingBody,
            localBodyId: urban.localBodyId,
            wardNumberId: -1
          }
        ]);
        const compiled = compileUserAccessScopes(validated);
        if (compiled.length !== 1) {
          throw new Error(`Expected one deduped scope, got ${compiled.length}`);
        }
        return compiled[0];
      }
    });

    await runScenario(report, {
      name: "Multiple access rows union includes both sampled urban leaves",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "URBAN",
            governingBody: urban.governingBody,
            localBodyId: urban.localBodyId,
            wardNumberId: urban.wardNumberId,
            boothNumberId: urban.boothNumberId
          },
          {
            settlementType: "URBAN",
            governingBody: urbanAlt.governingBody,
            localBodyId: urbanAlt.localBodyId,
            wardNumberId: urbanAlt.wardNumberId,
            boothNumberId: urbanAlt.boothNumberId
          }
        ]);
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(urban.id) || !resolved.geoUnitIds.includes(urbanAlt.id)) {
          throw new Error("Union access did not include both sampled urban leaves");
        }
        return { geoUnitCount: resolved.geoUnitIds.length };
      }
    });

    await runScenario(report, {
      name: "Urban scoped access excludes sampled rural leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "URBAN",
            governingBody: urban.governingBody,
            localBodyId: urban.localBodyId,
            wardNumberId: -1
          }
        ]);
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (resolved.geoUnitIds.includes(rural.id)) {
          throw new Error("Urban scoped access unexpectedly included rural leaf");
        }
        return { checkedExcludedGeoUnitId: rural.id };
      }
    });

    await runScenario(report, {
      name: "Rural scoped access excludes sampled urban leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "RURAL",
            governingBody: "GP",
            gramPanchayatId: rural.gramPanchayatId,
            mainVillageId: -1
          }
        ]);
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (resolved.geoUnitIds.includes(urban.id)) {
          throw new Error("Rural scoped access unexpectedly included urban leaf");
        }
        return { checkedExcludedGeoUnitId: urban.id };
      }
    });

    await runScenario(report, {
      name: "Invalid rural non-GP branch is rejected",
      run: async () => {
        await expectThrows(
          async () =>
            validateAccessibles([
              {
                settlementType: "RURAL",
                governingBody: "CMC",
                localBodyId: urban.localBodyId
              }
            ]),
          (message) => message.includes("must use GP")
        );
      }
    });

    await runScenario(report, {
      name: "Urban exact leaf still resolves when pollingStationId is omitted",
      run: async () => {
        const record = await resolveGeoUnitRecordFromInput({
          settlementType: "URBAN",
          governingBody: urban.governingBody,
          localBodyId: urban.localBodyId,
          wardNumberId: urban.wardNumberId,
          boothNumberId: urban.boothNumberId
        });
        if (!record || Number(record.id) !== urban.id) {
          throw new Error("Expected omitted urban pollingStationId to still resolve sampled leaf");
        }
        return { geoUnitId: Number(record.id) };
      }
    });

    await runScenario(report, {
      name: "GP with localBodyId is rejected",
      run: async () => {
        await expectThrows(
          async () =>
            validateAccessibles([
              {
                governingBody: "GP",
                localBodyId: urban.localBodyId
              }
            ]),
          (message) => message.includes("localBodyId is not valid")
        );
      }
    });

    await runScenario(report, {
      name: "Ambiguous urban ancestor-only geo input is rejected",
      run: async () => {
        await expectThrows(
          async () =>
            resolveGeoUnitRecordFromInput({
              settlementType: "URBAN",
              governingBody: urban.governingBody,
              localBodyId: urban.localBodyId
            }),
          (message) => message.includes("multiple geoUnits")
        );
      }
    });

    await runScenario(report, {
      name: "Optional rural hobaliId and pollingStationId can be omitted when leaf is unique",
      run: async () => {
        const record = await resolveGeoUnitRecordFromInput({
          settlementType: "RURAL",
          governingBody: "GP",
          gramPanchayatId: rural.gramPanchayatId,
          mainVillageId: rural.mainVillageId,
          boothNumberId: rural.boothNumberId
        });
        if (!record || Number(record.id) !== rural.id) {
          throw new Error("Expected omitted optional fields to still resolve the sampled rural leaf");
        }
        return { geoUnitId: Number(record.id) };
      }
    });

    await runScenario(report, {
      name: "Exact rural leaf resolves when optional hobaliId is present",
      run: async () => {
        const record = await resolveGeoUnitRecordFromInput({
          settlementType: "RURAL",
          governingBody: "GP",
          hobaliId: rural.hobaliId,
          gramPanchayatId: rural.gramPanchayatId,
          mainVillageId: rural.mainVillageId,
          subVillageId: rural.subVillageId,
          boothNumberId: rural.boothNumberId
        });
        if (!record || Number(record.id) !== rural.id) {
          throw new Error("Expected exact rural payload with hobaliId to resolve sampled leaf");
        }
        return { geoUnitId: Number(record.id) };
      }
    });

    await runScenario(report, {
      name: "Multiple access rows across branches union includes one urban and one rural leaf",
      run: async () => {
        const validated = validateAccessibles([
          {
            settlementType: "URBAN",
            governingBody: urban.governingBody,
            localBodyId: urban.localBodyId,
            wardNumberId: urban.wardNumberId,
            boothNumberId: urban.boothNumberId
          },
          {
            settlementType: "RURAL",
            governingBody: "GP",
            gramPanchayatId: ruralAlt.gramPanchayatId,
            mainVillageId: ruralAlt.mainVillageId,
            boothNumberId: ruralAlt.boothNumberId
          }
        ]);
        const resolved = await resolveGeoUnitIdsForAccessibles(validated);
        if (!resolved.geoUnitIds.includes(urban.id) || !resolved.geoUnitIds.includes(ruralAlt.id)) {
          throw new Error("Cross-branch union did not include both sampled leaves");
        }
        return { geoUnitCount: resolved.geoUnitIds.length };
      }
    });

    await runScenario(report, {
      name: "Branch-mixed urban settlement with rural IDs does not resolve",
      run: async () => {
        await expectThrows(
          async () =>
            resolveGeoUnitRecordFromInput({
              settlementType: "URBAN",
              gramPanchayatId: rural.gramPanchayatId,
              mainVillageId: rural.mainVillageId
            }),
          (message) => message.includes("do not resolve to any geoUnit")
        );
      }
    });
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
