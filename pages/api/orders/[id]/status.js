import { adminDb, requireAdmin, ApiError } from "../../../../lib/firebaseAdmin";
import { isValidStatus, AWAITING_DEPOSIT } from "../../../../lib/orderStatus";

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
    // لو نقلت الأوردر لأي حالة غير "في انتظار العربون"، يبقى العربون
    // وصل بالبديهة — مش منطقي تبدأ تحضّر أوردر لسه مدفعش.
    const patch = { status };
    if (status === AWAITING_DEPOSIT) {
      patch.depositPaid = false;
    } else if (status === "ملغي") {
      // الإلغاء لا يعني أن العربون وصل، ولا نغيّر سجلّ دفع موجود.
      const existing = await adminDb.collection("orders").doc(id).get();
      patch.depositPaid = !!existing.data()?.depositPaid;
    } else {
      patch.depositPaid = true;
    }

    const ref = adminDb.collection("orders").doc(id);
    await ref.update(patch);
    return res.status(200).json({ ok: true, depositPaid: patch.depositPaid });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
