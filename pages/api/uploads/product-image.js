import crypto from "crypto";
import { adminStorage, requireAdmin, ApiError } from "../../../lib/firebaseAdmin";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
    await requireAdmin(req);
    const { dataUrl, filename = "product-image" } = req.body || {};
    const m = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m || !ALLOWED.has(m[1])) return res.status(400).json({ error: "ارفع صورة JPG أو PNG أو WebP فقط" });
    const bytes = Buffer.from(m[2], "base64");
    if (!bytes.length || bytes.length > MAX_BYTES) return res.status(400).json({ error: "حجم الصورة لازم يكون أقل من 3 ميجابايت" });
    const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
    const safeName = String(filename).replace(/[^a-z0-9._-]/gi, "-").slice(0, 50);
    const path = `products/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName || "image"}.${ext}`;
    const file = adminStorage.bucket().file(path);
    const downloadToken = crypto.randomUUID();
    await file.save(bytes, { resumable: false, contentType: m[1], metadata: { cacheControl: "public,max-age=31536000,immutable", metadata: { firebaseStorageDownloadTokens: downloadToken } } });
    const encodedPath = encodeURIComponent(path);
    return res.status(201).json({ url: `https://firebasestorage.googleapis.com/v0/b/${file.bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}` });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    console.error("product image upload:", e.message || e);
    return res.status(status).json({ error: e.message || "تعذر رفع الصورة. تأكد من تفعيل Firebase Storage واسم الـ bucket." });
  }
}
