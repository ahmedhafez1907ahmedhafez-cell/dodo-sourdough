import { adminDb, requireAdmin, ApiError } from "../../../../lib/firebaseAdmin";
import { isValidStatus, AWAITING_DEPOSIT } from "../../../../lib/orderStatus";
import { cancelBostaDelivery } from "../../../../lib/bosta";

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
    // وصل بالبديهة — مش منطقي تبدأ تحضّر أوردر لسه مدفعش. وبنمسح
    // أي خطأ شحن قديم لأنك بقيت متولّي الأوردر بنفسك.
    // ⚠️ الحالة دي مبتبعتش شحنة — الشحن بيحصل من زرار
    //    "تم استلام العربون" بس، عشان محصلش شحنتين لنفس الأوردر.
    const patch = { status };
    if (status === AWAITING_DEPOSIT) {
      patch.depositPaid = false;
    } else if (status === "ملغي") {
      // الإلغاء لا يعني أن العربون وصل، ولا نغيّر سجلّ دفع موجود.
      const existing = await adminDb.collection("orders").doc(id).get();
      patch.depositPaid = !!existing.data()?.depositPaid;
    } else {
      patch.depositPaid = true;
      patch.shipmentError = null;
    }

    const ref = adminDb.collection("orders").doc(id);

    // "ملغي" = الغي الشحنة من بوسطة كمان، عشان ميجيش مندوب
    // على طرد إنت لغيته، وميتحسبش عليك مشوار.
    let cancelNote = null;
    if (status === "ملغي") {
      const snap = await ref.get();
      const data = snap.exists ? snap.data() : {};
      const shipRef = data.shipmentId || data.shipmentTrackingNo;
      if (shipRef) {
        try {
          const r = await cancelBostaDelivery(shipRef);
          if (r.enabled && r.ok) {
            patch.shipmentCancelled = true;
            cancelNote = `اتلغت شحنة بوسطة ${data.shipmentTrackingNo || shipRef}`;
          } else {
            cancelNote = `الأوردر اتلغى، بس بوسطة رفضت إلغاء الشحنة ${data.shipmentTrackingNo || shipRef} — الغيها من الداشبورد`;
            patch.shipmentError = cancelNote;
          }
        } catch (e) {
          cancelNote = `الأوردر اتلغى، بس فشل إلغاء الشحنة: ${String(e.message || e).slice(0, 150)}`;
          patch.shipmentError = cancelNote;
        }
      }
    }

    await ref.update(patch);
    return res.status(200).json({ ok: true, depositPaid: patch.depositPaid, cancelNote });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
