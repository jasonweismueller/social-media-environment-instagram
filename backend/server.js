// backend/server.js
import express from "express";
import AWS from "aws-sdk";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const {
  AWS_REGION,
  S3_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} = process.env;

// Basic sanity checks
if (!AWS_REGION || !S3_BUCKET) {
  console.error("Missing AWS_REGION or S3_BUCKET in .env");
  process.exit(1);
}

AWS.config.update({
  region: AWS_REGION,
  // If you put AWS creds in ~/.aws/credentials or env, you can omit these two:
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3({ signatureVersion: "v4" });
const app = express();

// CORS: allow your Vite dev server origins to request this signer
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5179",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5179",
    ],
    methods: ["GET"],
  })
);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Presign PUT
app.get("/sign-upload", async (req, res) => {
  try {
    const { filename, type } = req.query;
    if (!filename || !type) {
      return res.status(400).json({ error: "filename and type are required" });
    }

    const key = `videos/${Date.now()}-${filename}`;
    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: String(type),
      Expires: 60, // seconds
      // Do NOT set ACL here unless your bucket policy allows it (Block Public Access usually blocks it).
      // ACL: "public-read"
    };

    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);
    const fileUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    console.log("[sign-upload] ->", { key, type, fileUrl });
    res.json({ uploadUrl, fileUrl });
  } catch (err) {
    console.error("[sign-upload] ERROR", err);
    res.status(500).json({ error: "Failed to sign URL" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Signer running at http://localhost:${PORT}`);
});