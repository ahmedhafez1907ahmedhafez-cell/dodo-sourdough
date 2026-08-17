// ============================================================
// POST /api/orders/[id]/deposit-seen   { token }
//
// بتتنادى من المتصفح لما العميل يقفل شاشة "تعليمات العربون" (الپوپ أپ
// اللي بتظهر فوراً بعد ما يأكّد الطلب) من غير ما يدفع. مش بتغيّر حالة
// الأوردر ولا بتمنع حاجة — بس بتسجّل إنه شاف رقم المحفظة والخطوات
// وقفل الشاشة، عشان تبان علامة صغيرة جنب الأوردر في الأدمن.
//
// نفس أسلوب التحقق المستخدم في customer.js: بنقارن هاش التوكن، مش
// التوكن نفسه، وبنستخدم timingSafeEqual عشان مفيش تسريب توقيت.
// ============================================================

import crypto from "crypto";
import { adminDb, ApiError } from "../../../../lib/firebaseAdmin";

function validToken(order, token) {
  const expected = order.customerCancelTokenHash || "";
  const actual = crypto.createHash("sha256").update(String(token || "")).digest("hex");
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
    const ref = adminDb.collection("orders").doc(String(req.query.id));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "الطلب غير موجود" });
    const order = snap.data();
    if (!validToken(order, req.body?.token)) return res.status(403).json({ error: "لا يمكن التحقق من هذا الطلب" });

    // مفيش داعي نعلّم تاني لو العربون اتأكد بالفعل — العلامة دي
    // مفيدة بس وهو لسه مستني
    if (!order.depositPaid) {
      await ref.update({ depositPromptClosed: true, depositPromptClosedAt: new Date().toISOString() });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    // مش مهم يفشل بصمت — الميزة دي معلومة إضافية بس، مش جزء أساسي من تدفق الطلب
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}
