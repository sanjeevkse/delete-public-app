#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const runId = `full-api-coverage-bed-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const REPORT_DIR = path.join(ROOT, "artifacts", "full-api-coverage-bed");

const suites = [
  {
    name: "Accessibility matrix scenarios",
    script: path.join(ROOT, "scripts", "accessibilityMatrixTestBed.js"),
    reportDir: path.join(ROOT, "artifacts", "accessibility-matrix-test-bed")
  },
  {
    name: "CRUD API scenarios",
    script: path.join(ROOT, "scripts", "crudApiTestBed.js"),
    reportDir: path.join(ROOT, "artifacts", "crud-api-test-bed")
  },
  {
    name: "Geo and accessibility scenarios",
    script: path.join(ROOT, "scripts", "geoApiTestBed.js"),
    reportDir: path.join(ROOT, "artifacts", "geo-api-test-bed")
  },
  {
    name: "All route sweep",
    script: path.join(ROOT, "scripts", "allApiTestBed.js"),
    reportDir: path.join(ROOT, "artifacts", "all-api-test-bed")
  }
];

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const newestFile = (dir, extension) => {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(extension))
    .map((file) => ({
      file,
      mtime: fs.statSync(path.join(dir, file)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? path.join(dir, files[0].file) : null;
};

const runSuite = (suite) => {
  const result = spawnSync(process.execPath, [suite.script], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
    env: process.env
  });

  const jsonPath = newestFile(suite.reportDir, ".json");
  const mdPath = newestFile(suite.reportDir, ".md");
  const report = jsonPath ? JSON.parse(fs.readFileSync(jsonPath, "utf8")) : null;

  return {
    name: suite.name,
    script: suite.script,
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    jsonPath,
    mdPath,
    report
  };
};

const linesForSuite = (suiteResult) => {
  const lines = [
    `## ${suiteResult.name}`,
    "",
    `- Script: \`${path.relative(ROOT, suiteResult.script)}\``,
    `- Exit Code: \`${suiteResult.exitCode}\``
  ];

  if (suiteResult.jsonPath) {
    lines.push(`- JSON Report: \`${path.relative(ROOT, suiteResult.jsonPath)}\``);
  }
  if (suiteResult.mdPath) {
    lines.push(`- MD Report: \`${path.relative(ROOT, suiteResult.mdPath)}\``);
  }

  if (suiteResult.report?.summary) {
    const summary = suiteResult.report.summary;
    const parts = Object.entries(summary).map(([key, value]) => `${key}=${value}`);
    lines.push(`- Summary: \`${parts.join(", ")}\``);
  }

  if (suiteResult.exitCode !== 0 && suiteResult.stderr) {
    lines.push("", "```text", suiteResult.stderr.trim(), "```");
  }

  lines.push("");
  return lines;
};

function main() {
  ensureDir(REPORT_DIR);

  const startedAt = new Date().toISOString();
  const suiteResults = suites.map(runSuite);
  const finishedAt = new Date().toISOString();

  const combined = {
    runId,
    startedAt,
    finishedAt,
    suites: suiteResults.map((result) => ({
      name: result.name,
      script: path.relative(ROOT, result.script),
      exitCode: result.exitCode,
      jsonPath: result.jsonPath ? path.relative(ROOT, result.jsonPath) : null,
      mdPath: result.mdPath ? path.relative(ROOT, result.mdPath) : null,
      summary: result.report?.summary ?? null
    }))
  };

  const jsonPath = path.join(REPORT_DIR, `${runId}.json`);
  const mdPath = path.join(REPORT_DIR, `${runId}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2) + "\n");

  const mdLines = [
    "# Full API Coverage Bed",
    "",
    `- Run ID: \`${runId}\``,
    `- Started At: \`${startedAt}\``,
    `- Finished At: \`${finishedAt}\``,
    ""
  ];
  suiteResults.forEach((result) => mdLines.push(...linesForSuite(result)));
  fs.writeFileSync(mdPath, mdLines.join("\n"));

  console.log(JSON.stringify({ jsonPath, mdPath, suites: combined.suites }, null, 2));

  if (suiteResults.some((result) => result.exitCode !== 0)) {
    process.exitCode = 1;
  }
}

main();
