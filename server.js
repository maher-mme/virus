const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname), {
  maxAge: "1d",
  setHeaders(res, filePath) {
    // HTML, service-worker et manifest doivent toujours etre frais
    // pour que les MAJ soient detectees rapidement
    if (filePath.endsWith(".html") ||
        filePath.endsWith("service-worker.js") ||
        filePath.endsWith("manifest.json")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  }
}));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
