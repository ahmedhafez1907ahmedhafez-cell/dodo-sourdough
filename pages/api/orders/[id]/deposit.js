// ============================================================
// PATCH /api/orders/[id]/deposit   { paid: true | false }
// أدمن بس.
//
// J&T معندهاش API عام، فمفيش شحن أوتوماتيك هنا. الزرار ده بيأكّد
// بس إن العربون وصل ويحوّل حالة الأوردر لـ"قيد التحضير" — وبعدها
// إنت اللي بتسجّل الشحنة يدوي من تطبيق J&T بنفسك.
// ============================================================

import { adminDb, requireAdmin, ApiError } from "../../../../lib/firebaseAdmin";
import { AFTER_DEPOSIT_STATUS, AWAITING_DEPOSIT } from "../../../../lib/orderStatus";

export default async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method !== "PATCH") {
      res.setHeader("Allow", "PATCH");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;
    const paid = (req.body || {}).paid !== false;

    const ref = adminDb.collection("orders").doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "الطلب مش موجود" });

    // ---- تراجع عن التأكيد ----
    if (!paid) {
      await ref.update({ depositPaid: false, status: AWAITING_DEPOSIT });
      return res.status(200).json({ ok: true, depositPaid: false });
    }

    // ---- تأكيد العربون ----
    await ref.update({
      depositPaid: true,
      depositPaidAt: new Date().toISOString(),
      status: AFTER_DEPOSIT_STATUS,
    });

    return res.status(200).json({ ok: true, depositPaid: true });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
