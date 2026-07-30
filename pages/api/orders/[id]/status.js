import { adminDb, requireAdmin, ApiError } from "../../../../lib/firebaseAdmin";
import { isValidStatus } from "../../../../lib/orderStatus";

export default async function handler(req, res) {
  try {
    if (req.method !== "PATCH") {
      res.setHeader("Allow", "PATCH");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await requireAdmin(req);
    const { id } = req.query;
    const { status } = req.body || {};
    if (!isValidStatus(status)) {
      return res.status(400).json({ error: "حالة غير معروفة" });
    }
    await adminDb.collection("orders").doc(id).update({ status });
    return res.status(200).json({ ok: true });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
