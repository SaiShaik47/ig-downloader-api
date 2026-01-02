import express from "express";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const app = express();

/**
 * WRITE COOKIES FROM RAILWAY VARIABLE TO TEMP FILE
 * IG_COOKIES = full cookies.txt content
 */
function getCookieFile() {
  const cookieText = (process.env.IG_COOKIES || "").trim();
  if (!cookieText) return null;

  const cookiePath = path.join(os.tmpdir(), "ig_cookies.txt");
  fs.writeFileSync(cookiePath, cookieText, "utf8");
  return cookiePath;
}

/**
 * HEALTHCHECK (Railway uses this to know app is alive)
 */
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

/**
 * HOME (optional)
 */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Instagram Downloader API running"
  });
});

/**
 * MAIN INSTAGRAM ENDPOINT
 * /ig?url=https://www.instagram.com/reel/XXXX/
 * Works for: reels, posts, stories (cookies needed for stories)
 */
app.get("/ig", (req, res) => {
  const url = (req.query.url || "").toString().trim();

  if (!url) {
    return res.status(400).json({
      ok: false,
      reason: "Missing Instagram URL"
    });
  }

  const cookieFile = getCookieFile();

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
      return res.json({
        ok: false,
        reason: (stderr || err.message || "yt-dlp error")
          .toString()
          .slice(0, 400)
      });
    }

    const urls = (stdout || "")
      .split("\n")
      .map(u => u.trim())
      .filter(Boolean);

    if (!urls.length) {
      return res.json({
        ok: false,
        reason: "No media found (private / deleted / cookies expired)"
      });
    }

    return res.json({
      ok: true,
      count: urls.length,
      urls
    });
  });
});

/**
 * PORT — MUST BE LAST
 * Railway injects PORT (often 8080)
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ API running on port", PORT);
});
