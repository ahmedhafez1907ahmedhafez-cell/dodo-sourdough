// ============================================================
// PATCH /api/orders/[id]/deposit   { paid: true | false }
// أدمن بس.
//
// ده المكان الوحيد اللي بتتعمل فيه شحنة مايلرز. الفكرة إن الأوردر
// ميتشحنش أبداً قبل ما تشوف صورة التحويل بعينك وتدوس الزرار.
//
// لما تأكّد العربون:
//   1) بنعلّم الأوردر إن العربون اتدفع وحالته تبقى "قيد التحضير"
//   2) بنبعت الشحنة لمايلرز — إلا لو:
//      • أوردر بنها و MYLERZ_SKIP_BANHA=true (بتوصّله بنفسك)
//      • سعر التوصيل لسه متحددش ("محافظة تانية")
//
// سرعة الشحن: أول 3 شحنات في اليوم بتروح "نفس اليوم" (SD)
// واللي بعدهم "اليوم التالي" (ND) — زي ما اتفقنا.
// ============================================================

import { adminDb, requireAdmin, ApiError } from "../../../../lib/firebaseAdmin";
import { createMylerzShipment } from "../../../../lib/mylerz";
import { AFTER_DEPOSIT_STATUS, AWAITING_DEPOSIT } from "../../../../lib/orderStatus";

const SAME_DAY_QUOTA = 3;

/** كام شحنة اتبعتت لمايلرز النهاردة؟ */
async function shipmentsToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const snap = await adminDb
    .collection("orders")
    .where("shippedAt", ">=", start.toISOString())
    .get();
  return snap.size;
}

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
      mylerzError: null,
    });

    // اتشحن قبل كده؟ منبعتش مرتين
    if (order.mylerzTrackingNo) {
      return res.status(200).json({ ok: true, depositPaid: true, alreadyShipped: true });
    }

    const skipBanha = String(process.env.MYLERZ_SKIP_BANHA || "").toLowerCase() === "true";
    const skipReason =
      order.deliveryFee === null ? "سعر التوصيل لسه متحددش" :
      (skipBanha && order.zone === "banha") ? "أوردر بنها — بتوصّله بنفسك" : null;

    if (skipReason) {
      return res.status(200).json({ ok: true, depositPaid: true, skipped: skipReason });
    }

    // أول 3 شحنات في اليوم = نفس اليوم
    let sameDay = false;
    try { sameDay = (await shipmentsToday()) < SAME_DAY_QUOTA; } catch { /* لو فشل العد، ND أأمن */ }

    try {
      const mylerz = await createMylerzShipment({ ...order, sameDay });
      if (!mylerz.enabled) {
        const msg = "تكامل مايلرز مش مفعّل على السيرفر (MYLERZ_ENABLED)";
        await ref.update({ mylerzError: msg });
        return res.status(200).json({ ok: true, depositPaid: true, mylerzError: msg });
      }
      await ref.update({
        mylerzTrackingNo: mylerz.trackingNo || null,
        mylerzPickupCode: mylerz.pickupOrderCode || null,
        mylerzService: sameDay ? "SD" : "ND",
        mylerzError: null,
        shippedAt: new Date().toISOString(),
      });
      return res.status(200).json({
        ok: true, depositPaid: true,
        trackingNo: mylerz.trackingNo, service: sameDay ? "نفس اليوم" : "اليوم التالي",
      });
    } catch (e) {
      const msg = String(e.message || e).slice(0, 300);
      console.error("[Mylerz]", msg);
      await ref.update({ mylerzError: msg }).catch(() => {});
      // العربون اتأكد فعلاً — الشحن هو اللي فشل، فبنقول ده صراحة
      return res.status(200).json({ ok: true, depositPaid: true, mylerzError: msg });
    }
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
