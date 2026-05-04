const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const target = process.argv[2];
const referenceDir = path.join(__dirname, "../reference-cv-files");

function main() {
  const filePath = target ? path.resolve(process.cwd(), target) : findFirstCvFile();
  if (!filePath) {
    console.log("No .cv file found. Add one to backend/reference-cv-files/ or pass a path:");
    console.log("  node scripts/inspectCvFile.js backend/reference-cv-files/sample.cv");
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`Inspecting: ${filePath}`);
  console.log(`Size: ${buffer.length} bytes`);

  const candidates = buildCandidates(buffer);
  for (const candidate of candidates) {
    console.log(`\n--- Candidate: ${candidate.label} ---`);
    inspectCandidate(candidate.content);
  }
}

function findFirstCvFile() {
  if (!fs.existsSync(referenceDir)) return null;
  const file = fs.readdirSync(referenceDir).find((name) => name.toLowerCase().endsWith(".cv"));
  return file ? path.join(referenceDir, file) : null;
}

function buildCandidates(buffer) {
  const candidates = [{ label: "raw text", content: buffer.toString("utf8") }];

  try {
    candidates.push({ label: "gzip decompressed", content: zlib.gunzipSync(buffer).toString("utf8") });
  } catch (_) {}

  try {
    candidates.push({ label: "deflate decompressed", content: zlib.inflateSync(buffer).toString("utf8") });
  } catch (_) {}

  const text = buffer.toString("utf8").trim();
  if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 20) {
    try {
      const decoded = Buffer.from(text, "base64");
      candidates.push({ label: "base64 decoded text", content: decoded.toString("utf8") });
      try {
        candidates.push({ label: "base64 decoded + gzip", content: zlib.gunzipSync(decoded).toString("utf8") });
      } catch (_) {}
    } catch (_) {}
  }

  return candidates;
}

function inspectCandidate(content) {
  const preview = content.slice(0, 500);
  console.log(`Preview:\n${preview}${content.length > 500 ? "\n..." : ""}`);

  try {
    const json = JSON.parse(content);
    console.log("\nDetected JSON.");
    printJsonStructure(json);
    reportCircuitHints(json);
  } catch (_) {
    console.log("\nNot valid JSON for this candidate.");
  }
}

function printJsonStructure(value, depth = 0, keyName = "root") {
  const indent = "  ".repeat(depth);
  if (depth > 5) {
    console.log(`${indent}${keyName}: ...`);
    return;
  }
  if (Array.isArray(value)) {
    console.log(`${indent}${keyName}: Array(${value.length})`);
    if (value.length) printJsonStructure(value[0], depth + 1, "[0]");
    return;
  }
  if (value && typeof value === "object") {
    console.log(`${indent}${keyName}: Object`);
    Object.keys(value).slice(0, 30).forEach((key) => printJsonStructure(value[key], depth + 1, key));
    return;
  }
  console.log(`${indent}${keyName}: ${typeof value} = ${String(value).slice(0, 80)}`);
}

function reportCircuitHints(json) {
  const text = JSON.stringify(json).toLowerCase();
  const hints = ["project", "name", "circuit", "input", "output", "gate", "wire", "connection", "x", "y"];
  console.log("\nStorage hints:");
  hints.forEach((hint) => {
    console.log(`- ${hint}: ${text.includes(hint) ? "found" : "not obvious"}`);
  });
}

main();
