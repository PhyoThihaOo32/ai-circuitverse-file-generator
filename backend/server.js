const path = require("path");
const express = require("express");
require("dotenv").config();

const analyzeRoutes = require("./routes/analyzeRoutes");
const exportRoutes = require("./routes/exportRoutes");
const downloadRoutes = require("./routes/downloadRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "AI Logic Diagram Generator backend running"
  });
});

app.use("/api", analyzeRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/download", downloadRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Serve the patched CircuitVerse simulator as a self-contained static bundle
app.use(
  "/simulator",
  express.static(
    path.join(__dirname, "simulator-dist"),
    { index: "index.html" }
  )
);

app.use(
  express.static(path.join(__dirname, "../frontend"), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    }
  })
);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`AI Logic Diagram Generator running at http://localhost:${PORT}`);
});
