// ============================================================
// POST /api/auth/send-code
// body: { idToken }
//
// الـ idToken ده بيتاخد من Firebase بعد ما العميل يدخل الإيميل والباسورد
// صح. يعني وجوده هنا معناه إن الباسورد اتأكد منه بالفعل — محدش يقدر
// يطلب كود لإيميل مش بتاعه من غير ما يعرف الباسورد.
//
// بيرجع:
//   { sent:true, to:"a***@gmail.com" }   → اكتب الكود
//   { adminSkip:true }                    → حساب أدمن، مفيش كود
// ============================================================

import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";
import { sendLoginCodeEmail } from "../../../lib/sendMail";
import {
  CODES_COLLECTION, CODE_TTL_MS, RESEND_COOLDOWN_MS, MAX_SENDS_PER_HOUR,
  generateCode, hashCode, codeEmailHtml,
} from "../../../lib/loginCode";

// a***@gmail.com — عشان نطمّن العميل على الإيميل من غير ما نعرضه كامل
function maskEmail(email) {
  const [u, d] = String(email).split("@");
  if (!d) return email;
  const head = u.slice(0, 1);
  return `${head}${"*".repeat(Math.max(2, u.length - 1))}@${d}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const idToken = (req.body || {}).idToken;
  if (!idToken) return res.status(400).json({ error: "بيانات ناقصة" });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "الجلسة مش صالحة، جرب تسجل دخول تاني" });
  }

  const uid = decoded.uid;
  const email = decoded.email;
  if (!email) return res.status(400).json({ error: "الحساب ده مالوش إيميل" });

  try {
    // الأدمن بيدخل من غير كود — ده لوحة تحكمك إنت مش حساب عميل
    const adminDoc = await adminDb.collection("admins").doc(uid).get();
    if (adminDoc.exists) return res.status(200).json({ adminSkip: true });

    const ref = adminDb.collection(CODES_COLLECTION).doc(uid);
    const snap = await ref.get();
    const now = Date.now();
    const prev = snap.exists ? snap.data() : null;

    // مينفعش يطلب كود ورا التاني على طول
    if (prev?.sentAt && now - prev.sentAt < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - prev.sentAt)) / 1000);
      return res.status(429).json({ error: `استنى ${wait} ثانية وبعدين اطلب كود جديد`, retryAfter: wait });
    }

    // 5 أكواد في الساعة بحد أقصى
    let windowStart = prev?.windowStart || now;
    let sends = prev?.sends || 0;
    if (now - windowStart > 60 * 60 * 1000) { windowStart = now; sends = 0; }
    if (sends >= MAX_SENDS_PER_HOUR) {
      return res.status(429).json({ error: "طلبت أكواد كتير — استنى ساعة وجرب تاني" });
    }

    const code = generateCode();

    // بنبعت الإيميل الأول: لو فشل، مش هنسجّل كود ملوش لازمة
    await sendLoginCodeEmail(email, codeEmailHtml(code, decoded.name || ""));

    await ref.set({
      email,
      hash: hashCode(code),
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      sentAt: now,
      windowStart,
      sends: sends + 1,
    });

    return res.status(200).json({ sent: true, to: maskEmail(email), ttlMinutes: CODE_TTL_MS / 60000 });
  } catch (e) {
    console.error("[send-code]", e.message || e);
    return res.status(500).json({ error: e.message || "حصل خطأ، جرب تاني" });
  }
}
