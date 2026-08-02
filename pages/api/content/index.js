import { adminDb, requireAdmin, ApiError } from "../../../lib/firebaseAdmin";
import { CONTENT_TYPES } from "../../../lib/contentTypes";

const PLATFORMS = ["instagram", "tiktok", "facebook", "youtube"];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return await listContent(req, res);
    if (req.method === "POST") return await addContent(req, res);
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("/api/content error:", e.code || "", e.message || e);
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}

async function listContent(req, res) {
  // كانت الـ limit(100) بتخفي أي منشورات بعد أول 100. الحد ده يغطّي
  // الأرشيف الحالي (أكثر من 200) من غير ما نغيّر ترتيب المنشورات.
  const snap = await adminDb.collection("content").orderBy("createdAt", "desc").limit(500).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return res.status(200).json({ items });
}

// أدمن بس — إضافة منشور جديد يدوياً (اللينك بتاعه)
async function addContent(req, res) {
  await requireAdmin(req);
  const b = req.body || {};
  if (!PLATFORMS.includes(b.platform)) return res.status(400).json({ error: "منصة غير معروفة" });
  if (!b.url || !/^https?:\/\//.test(b.url)) return res.status(400).json({ error: "لازم رابط صحيح (يبدأ بـ https://)" });
  const allowedTypes = CONTENT_TYPES[b.platform].map((t) => t.key);
  const type = allowedTypes.includes(b.type) ? b.type : allowedTypes[0];
  const docRef = await adminDb.collection("content").add({
    platform: b.platform,
    type,
    url: b.url,
    caption: b.caption || "",
    createdAt: new Date().toISOString(),
  });
  return res.status(201).json({ id: docRef.id });
}
