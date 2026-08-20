// ============================================================
// PATCH /api/orders/[id]/deposit   { paid: true | false }
// أدمن بس.
//
// ده المكان الوحيد اللي بتتعمل فيه الشحنة. الفكرة إن الأوردر
// ميتشحنش أبداً قبل ما تشوف صورة التحويل بعينك وتدوس الزرار.
//
// لما تأكّد العربون:
//   1) بنعلّم الأوردر إن العربون اتدفع وحالته تبقى "قيد التحضير"
//   2) بنبعت الشحنة لبوسطة — إلا لو:
//      • أوردر بنها و BOSTA_SKIP_BANHA=true (بتوصّله بنفسك)
//      • سعر التوصيل لسه متحددش ("محافظة تانية")
//
// ملحوظة: بوسطة خدمتها الأساسية "التوصيل في اليوم التالي" فمفيش
// اختيار سرعة زي ما كان بيحصل قبل كده.
// ============================================================

import { adminDb, requireAdmin, ApiError } from "../../../../lib/firebaseAdmin";
import { createBostaDelivery } from "../../../../lib/bosta";
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
    const order = { id: snap.id, ...snap.data() };

    // ---- تراجع عن التأكيد ----
    if (!paid) {
      await ref.update({ depositPaid: false, status: AWAITING_DEPOSIT });
      return res.status(200).json({ ok: true, depositPaid: false });
    }

    // ---- تأكيد العربون ----
    // لو العربون متأكد قبل كده والشحنة فشلت، الطلب ده بيبقى
    // "إعادة محاولة شحن" — بنكمّل عادي وننضّف الخطأ القديم.
    await ref.update({
      depositPaid: true,
      depositPaidAt: new Date().toISOString(),
      status: AFTER_DEPOSIT_STATUS,
      shipmentError: null,
    });

    // اتشحن قبل كده؟ منبعتش مرتين
    if (order.shipmentTrackingNo) {
      return res.status(200).json({ ok: true, depositPaid: true, alreadyShipped: true });
    }

    const skipBanha = String(process.env.BOSTA_SKIP_BANHA || "").toLowerCase() === "true";
    const skipReason =
      order.deliveryFee === null ? "سعر التوصيل لسه متحددش" :
      (skipBanha && order.zone === "banha") ? "أوردر بنها — بتوصّله بنفسك" : null;

    if (skipReason) {
      return res.status(200).json({ ok: true, depositPaid: true, skipped: skipReason });
    }

    try {
      const shipment = await createBostaDelivery(order);
      if (!shipment.enabled) {
        const msg = "تكامل بوسطة مش مفعّل على السيرفر (BOSTA_API_KEY)";
        await ref.update({ shipmentError: msg });
        return res.status(200).json({ ok: true, depositPaid: true, shipmentError: msg });
      }
      await ref.update({
        shipmentCourier: "bosta",
        shipmentTrackingNo: shipment.trackingNo || null,
        shipmentId: shipment.deliveryId || null,
        shipmentState: "Pickup requested",
        shipmentError: null,
        shippedAt: new Date().toISOString(),
      });
      return res.status(200).json({
        ok: true,
        depositPaid: true,
        trackingNo: shipment.trackingNo,
      });
    } catch (e) {
      const msg = String(e.message || e).slice(0, 300);
      console.error("[Bosta]", msg);
      await ref.update({ shipmentError: msg }).catch(() => {});
      // العربون اتأكد فعلاً — الشحن هو اللي فشل، فبنقول ده صراحة
      return res.status(200).json({ ok: true, depositPaid: true, shipmentError: msg });
    }
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
