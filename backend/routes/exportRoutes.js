const express = require("express");
const { generateDiagramSvg } = require("../services/circuitDiagramService");
const { generateInstructionsText } = require("../services/circuitVerseInstructionService");
const { generateCircuitVerseFile } = require("../services/circuitVerseFileService");
const { exportTruthTableCsv } = require("../utils/csvExporter");
const { download } = require("../utils/fileHelpers");

const router = express.Router();

function requestBody(req) {
  if (req.body && req.body.payload) {
    try {
      return JSON.parse(req.body.payload);
    } catch (error) {
      throw new Error("Invalid export payload.");
    }
  }
  return req.body || {};
}

function exportError(res, err) {
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ success: false, error: message });
}

router.post("/svg", (req, res) => {
  try {
    const body = requestBody(req);
    const svg = body.diagramSvg || generateDiagramSvg(body.circuitModel || {});
    download(res, "ai-generated-circuit.svg", "image/svg+xml", svg);
  } catch (err) { exportError(res, err); }
});

router.post("/cv", (req, res) => {
  try {
    const body = requestBody(req);
    const cv = generateCircuitVerseFile(body.circuitModel || {});
    download(res, "ai-generated-circuit.cv", "application/octet-stream", cv);
  } catch (err) { exportError(res, err); }
});

router.post("/csv", (req, res) => {
  try {
    const body = requestBody(req);
    const csv = exportTruthTableCsv(body.truthTable || []);
    download(res, "truth-table.csv", "text/csv", csv);
  } catch (err) { exportError(res, err); }
});

router.post("/txt", (req, res) => {
  try {
    const body = requestBody(req);
    const txt = Array.isArray(body.instructions)
      ? generateInstructionsText(body.instructions)
      : String(body.instructions || "");
    download(res, "logic-build-steps.txt", "text/plain", txt);
  } catch (err) { exportError(res, err); }
});

router.post("/json", (req, res) => {
  try {
    const body = requestBody(req);
    const json = JSON.stringify(body.circuitModel || {}, null, 2);
    download(res, "internal-circuit-model.json", "application/json", json);
  } catch (err) { exportError(res, err); }
});

module.exports = router;
