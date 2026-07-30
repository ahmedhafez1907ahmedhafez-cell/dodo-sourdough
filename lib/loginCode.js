// ============================================================
// كود الدخول اللي بيتبعت على الإيميل (One-Time Password)
//
// الفكرة: بعد ما العميل يكتب الإيميل والباسورد صح، بنبعتله رقم من 6
// أرقام على إيميله، وميدخلش غير لما يكتبه. يعني حتى لو حد عرف الباسورد
// مش هيقدر يدخل من غير ما يفتح الإيميل.
//
// أمان:
//  • الكود متخزن مشفّر (SHA-256) — حتى لو حد شاف قاعدة البيانات مش
//    هيعرف الرقم نفسه.
//  • بيقع بعد 10 دقايق.
//  • 5 محاولات غلط بس، وبعدين الكود بيتلغي خالص.
//  • مينفعش تطلب كود جديد قبل 45 ثانية، وبحد أقصى 5 أكواد في الساعة.
// ============================================================

import crypto from "crypto";

export const CODE_TTL_MS = 10 * 60 * 1000;      // الكود صالح 10 دقايق
export const RESEND_COOLDOWN_MS = 45 * 1000;    // أقل وقت بين كودين
export const MAX_SENDS_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;

export const CODES_COLLECTION = "emailCodes";

/** رقم من 6 خانات، عشوائي بشكل آمن (مش Math.random) */
export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(code) {
  return crypto.createHash("sha256").update(String(code).trim()).digest("hex");
}

/** مقارنة بتاخد نفس الوقت دايماً — عشان محدش يخمّن الكود من سرعة الرد */
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** شكل الإيميل اللي العميل بيستلمه */
export function codeEmailHtml(code, name) {
  const hello = name ? `أهلاً ${name}،` : "أهلاً،";
  return `
<div style="background:#fbf6ee;padding:32px 16px;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right">
  <div style="max-width:460px;margin:0 auto;background:#fff;border:1px solid #e8d8c2;border-radius:18px;padding:30px 26px">
    <p style="margin:0 0 6px;color:#b9532a;font-size:13px;letter-spacing:.5px">دودو ساوردو</p>
    <h1 style="margin:0 0 14px;font-size:21px;color:#2a1810">كود تسجيل الدخول</h1>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.9;color:#7a6355">
      ${hello} ده الكود بتاعك عشان تكمّل تسجيل الدخول:
    </p>
    <div style="background:#fbf6ee;border:1px dashed #e0a05a;border-radius:14px;padding:18px;text-align:center;margin-bottom:18px">
      <span style="font-size:34px;font-weight:bold;letter-spacing:10px;color:#2a1810;font-family:monospace">${code}</span>
    </div>
    <p style="margin:0 0 6px;font-size:13px;line-height:1.9;color:#7a6355">
      الكود صالح لمدة <strong>10 دقايق</strong> بس.
    </p>
    <p style="margin:0;font-size:12.5px;line-height:1.9;color:#a08d80">
      لو مش إنت اللي طلبت الكود ده، تجاهل الرسالة — ومحدش يقدر يدخل حسابك من غيره.
    </p>
  </div>
  <p style="max-width:460px;margin:14px auto 0;font-size:11.5px;color:#a08d80;text-align:center">
    دودو ساوردو — Dodo Sourdough
  </p>
</div>`;
}
