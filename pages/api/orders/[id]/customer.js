import crypto from "crypto";
import { adminDb, ApiError } from "../../../../lib/firebaseAdmin";
import { cancelBostaDelivery } from "../../../../lib/bosta";

function validToken(order, token) {
  const expected = order.customerCancelTokenHash || "";
  const actual = crypto.createHash("sha256").update(String(token || "")).digest("hex");
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export default async function handler(req, res) {
  try {
    if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
    const ref = adminDb.collection("orders").doc(String(req.query.id));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "الطلب غير موجود" });
    const order = snap.data();
    const token = req.method === "GET" ? req.query.token : req.body?.token;
    if (!validToken(order, token)) return res.status(403).json({ error: "لا يمكن التحقق من هذا الطلب على الجهاز الحالي" });

    if (req.method === "GET") return res.status(200).json({ status: order.status, depositPaid: !!order.depositPaid, cancelledByCustomer: !!order.cancelledByCustomer });
    if (order.status === "ملغي") return res.status(200).json({ ok: true, alreadyCancelled: true });
    if (order.status === "تم التوصيل") return res.status(400).json({ error: "لا يمكن إلغاء طلب تم توصيله" });

    const patch = { status: "ملغي", cancelledByCustomer: true, cancelledAt: new Date().toISOString() };
    const shipRef = order.shipmentId || order.shipmentTrackingNo;
    if (shipRef) {
      try {
        const result = await cancelBostaDelivery(shipRef);
        patch.shipmentCancelled = !!(result.enabled && result.ok);
        if (!patch.shipmentCancelled) patch.shipmentError = "العميل ألغى الطلب؛ راجع إلغاء الشحنة يدوياً من بوسطة.";
      } catch { patch.shipmentError = "العميل ألغى الطلب؛ تعذر إلغاء الشحنة تلقائياً."; }
    }
    await ref.update(patch);
    return res.status(200).json({ ok: true, depositPaid: !!order.depositPaid });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "تعذر إلغاء الطلب" });
  }
}
