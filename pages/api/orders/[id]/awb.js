// ============================================================
// GET /api/orders/[id]/awb   → بيرجّع بوليصة الشحن PDF
// أدمن بس.
//
// بوسطة بتطلب تطبع البوليصة وتلزقها على الطرد. الملف ده بيجيب
// الـ PDF من بوسطة مباشرة ويرجّعه للمتصفح، فبيتفتح في تاب جديد
// وتقدر تطبعه على أي طابعة موصولة بالجهاز.
//
// ⚠️ مفتاح بوسطة بيفضل في السيرفر — المتصفح بيشوف الـ PDF بس.
// ============================================================

import { requireAdmin, adminDb, ApiError } from "../../../../lib/firebaseAdmin";
import { getBostaAwbPdf } from "../../../../lib/bosta";

export default async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;
    const snap = await adminDb.collection("orders").doc(String(id)).get();
    if (!snap.exists) return res.status(404).json({ error: "الطلب مش موجود" });

    const order = snap.data();
    // بوسطة بتطبع البوليصة بالـ delivery id، ولو مش موجود بنجرّب رقم التتبع
    const ref = order.shipmentId || order.shipmentTrackingNo;
    if (!ref) {
      return res.status(400).json({ error: "الطلب ده مالوش شحنة" });
    }

    const pdf = await getBostaAwbPdf(ref);

    res.setHeader("Content-Type", "application/pdf");
    // inline = يفتح في المتصفح جاهز للطباعة، مش ينزّل ملف
    res.setHeader("Content-Disposition", `inline; filename="awb-${order.shipmentTrackingNo || ref}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(pdf);
  } catch (e) {
    console.error("[AWB]", e.message || e);
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "مقدرناش نجيب البوليصة" });
  }
}
