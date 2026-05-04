const express = require("express");
const { getArtifact } = require("../services/downloadBundleService");
const { download } = require("../utils/fileHelpers");

const router = express.Router();

router.get("/:bundleId/:type", (req, res) => {
  const artifact = getArtifact(req.params.bundleId, req.params.type);
  if (!artifact) {
    return res.status(404).json({ success: false, error: "Download artifact expired or not found. Generate the circuit again." });
  }
  download(res, artifact.filename, artifact.contentType, artifact.content);
});

module.exports = router;
