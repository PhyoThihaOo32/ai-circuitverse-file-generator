function download(res, filename, contentType, content) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(String(content || ""), "utf8");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(body);
}

module.exports = { download };
