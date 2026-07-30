// ============================================================
// POST /api/auth/verify-code
// body: { uid, code }
//
// لو الكود صح بيرجع customToken، والمتصفح بيستخدمه في
// signInWithCustomToken فيبقى داخل فعلاً.
//
// مفيش خطر إن حد يبعت uid عشوائي: مفيش مستند كود أصلاً غير لو حد
// عدّى مرحلة الباسورد، والكود نفسه 6 أرقام بـ 5 محاولات بس.
// ============================================================

import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";
import { CODES_COLLECTION, MAX_ATTEMPTS, hashCode, safeEqual } from "../../../lib/loginCode";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, code } = req.body || {};
  if (!uid || !code) return res.status(400).json({ error: "اكتب الكود" });
  if (!/^\d{6}$/.test(String(code).trim())) return res.status(400).json({ error: "الكود لازم يكون 6 أرقام" });

  try {
    const ref = adminDb.collection(CODES_COLLECTION).doc(String(uid));
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(400).json({ error: "مفيش كود مطلوب — ابدأ تسجيل الدخول من الأول" });
    }

    const d = snap.data();

    if (Date.now() > (d.expiresAt || 0)) {
      await ref.delete().catch(() => {});
      return res.status(400).json({ error: "الكود انتهت صلاحيته — اطلب كود جديد", expired: true });
    }

    if ((d.attempts || 0) >= MAX_ATTEMPTS) {
      await ref.delete().catch(() => {});
      return res.status(429).json({ error: "حاولت كتير — اطلب كود جديد", expired: true });
    }

    if (!safeEqual(hashCode(code), d.hash || "")) {
      const left = MAX_ATTEMPTS - ((d.attempts || 0) + 1);
      await ref.update({ attempts: (d.attempts || 0) + 1 });
      return res.status(400).json({
        error: left > 0 ? `الكود غلط — فاضل ${left} محاولة` : "الكود غلط — اطلب كود جديد",
        expired: left <= 0,
      });
    }

    // صح — الكود بيتمسح فوراً عشان ميتستخدمش تاني
    await ref.delete().catch(() => {});
    const customToken = await adminAuth.createCustomToken(String(uid));
    return res.status(200).json({ ok: true, customToken });
  } catch (e) {
    console.error("[verify-code]", e.message || e);
    return res.status(500).json({ error: "حصل خطأ، جرب تاني" });
  }
}
