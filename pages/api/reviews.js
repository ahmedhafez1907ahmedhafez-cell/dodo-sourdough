import { adminDb, requireAdmin } from "../../lib/firebaseAdmin";
import crypto from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return await listReviews(req, res);
    if (req.method === "POST") return await addReview(req, res);
    if (req.method === "DELETE") return await deleteReview(req, res);
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "خطأ غير متوقع" });
  }
}

async function listReviews(req, res) {
  const snap = await adminDb.collection("reviews").orderBy("createdAt", "desc").limit(100).get();
  // مهم: منرجعش الـ deleteKey للعامة أبداً — ده سر صاحب التعليق
  const reviews = snap.docs.map((d) => {
    const { deleteKey, ...rest } = d.data();
    return { id: d.id, ...rest };
  });
  return res.status(200).json({ reviews });
}

async function addReview(req, res) {
  const b = req.body || {};
  const name = String(b.name || "").trim().slice(0, 60);
  const text = String(b.text || "").trim().slice(0, 600);
  const stars = Math.min(5, Math.max(1, Number(b.stars) || 5));
  if (!name) return res.status(400).json({ error: "اكتب اسمك" });
  if (text.length < 10) return res.status(400).json({ error: "اكتب رأيك (10 أحرف على الأقل)" });

  // مفتاح حذف سري — بيتخزن في متصفح صاحب التعليق بس، وبيه يقدر يحذف تعليقه
  const deleteKey = crypto.randomBytes(24).toString("hex");
  const docRef = await adminDb.collection("reviews").add({
    name, text, stars, deleteKey, createdAt: new Date().toISOString(),
  });
  return res.status(201).json({ id: docRef.id, deleteKey });
}

async function deleteReview(req, res) {
  const id = String(req.query.id || (req.body && req.body.id) || "");
  if (!id) return res.status(400).json({ error: "id مطلوب" });

  // 1) الأدمن يقدر يحذف أي تعليق
  try {
    await requireAdmin(req);
    await adminDb.collection("reviews").doc(id).delete();
    return res.status(200).json({ ok: true, by: "admin" });
  } catch {
    // مش أدمن — نكمل لطريقة صاحب التعليق
  }

  // 2) صاحب التعليق يحذف تعليقه بالمفتاح السري بتاعه
  const deleteKey = String((req.body && req.body.deleteKey) || "");
  if (!deleteKey) return res.status(403).json({ error: "مش مسموح" });
  const doc = await adminDb.collection("reviews").doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: "التعليق مش موجود" });
  if (doc.data().deleteKey !== deleteKey) return res.status(403).json({ error: "مش مسموح" });
  await doc.ref.delete();
  return res.status(200).json({ ok: true, by: "owner" });
}
