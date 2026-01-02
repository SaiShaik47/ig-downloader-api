import express from "express";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Writes IG_COOKIES (Netscape cookies.txt content) to a temp file.
 * Railway cannot use "--cookies-from-browser", so we use "--cookies <file>".
 */
function getCookieFilePath() {
  const cookieText = (process.env.IG_COOKIES || "").trim();
  if (!cookieText) return null;

  const filePath = path.join(os.tmpdir(), "ig_cookies.txt");
  fs.writeFileSync(filePath, cookieText, "utf8");
  return filePath;
}

app.get("/", (_, res) => {
  res.json({ ok: true, message: "IG Downloader API running" });
});

// GET /ig?url=<instagram_link>
app.get("/ig", (req, res) => {
  const url = (req.query.url || "").toString().trim();
  if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

  const cookieFile = getCookieFilePath();

  const args = [
    "--no-warnings",
    "--ignore-errors",
    "--no-playlist",
    ...(cookieFile ? ["--cookies", cookieFile] : []),
    "-g",
    url
  ];

  execFile("yt-dlp", args, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      const reason = (stderr || err.message || "").toString().slice(0, 400);
      return res.status(200).json({ ok: false, reason });
    }

    const urls = (stdout || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    if (!urls.length) {
      return res.status(200).json({
        ok: false,
        reason: "No media URLs found (might be private, removed, or cookies expired)"
      });
    }

    res.json({ ok: true, urls });
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("API running on port", PORT);
});
