import { adminDb, requireAdmin, ApiError } from "../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  try {
    if (req.method !== "DELETE") {
      res.setHeader("Allow", "DELETE");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await requireAdmin(req);
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "مفيش رقم" });
    await adminDb.collection("content").doc(id).delete();
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("/api/content/[id] error:", e.code || "", e.message || e);
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
