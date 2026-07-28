import { adminDb, requireAdmin, ApiError } from "../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  try {
    await requireAdmin(req);
    const { id } = req.query;
    if (req.method === "PATCH") {
      await adminDb.collection("products").doc(id).update(req.body || {});
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      await adminDb.collection("products").doc(id).delete();
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
