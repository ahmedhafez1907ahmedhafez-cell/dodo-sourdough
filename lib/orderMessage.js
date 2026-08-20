// ============================================================
// رسالة الواتساب اللي بتتبعت لأوردرات بنها.
//
// أوردرات بنها بتتوصل محلياً (مش عن طريق شركة الشحن)، فبعد ما الأوردر
// يتسجل في الأدمن العميل بيتحوّل على واتساب برسالة جاهزة فيها كل
// التفاصيل — يدوس إرسال بس ويبقى التواصل ابتدى.
//
// الملف ده بيتستخدم في الواجهة (المتصفح) — متحطش فيه أي أسرار.
// ============================================================

import { WHATSAPP_NUMBER } from "./contact";

function money(n) {
  const v = Number(n) || 0;
  // بنشيل الأصفار الزيادة: 85.50 → 85.5 و 85.00 → 85
  return String(Math.round(v * 100) / 100);
}

/**
 * بيبني نص الرسالة.
 * @param {object} o
 * @param {string} o.id          رقم الأوردر
 * @param {string} o.name        اسم العميل
 * @param {string} o.phone       تليفون العميل
 * @param {string} o.area        منطقة بنها
 * @param {string} o.street      تفاصيل العنوان
 * @param {Array}  o.items       عناصر السلة ({nameAr,name,qty,totalPrice,extras,priceNote})
 * @param {number} o.deliveryFee سعر التوصيل (ممكن يكون null)
 * @param {number} o.total       الإجمالي
 */
export function buildOrderMessage(o) {
  const L = [];
  L.push("طلب جديد من موقع دودو ساوردو");
  L.push("");
  L.push(`رقم الطلب: ${o.id}`);
  L.push(`الاسم: ${o.name}`);
  L.push(`التليفون: ${o.phone}`);
  // ⚠️ الموقع بقى بيشحن لكل المحافظات، فمينفعش نكتب "بنها" ثابتة.
  // بنركّب العنوان من المحافظة/بنها + المنطقة + الشارع.
  const place = o.zone === "banha" ? "بنها" : (o.province || "");
  L.push(`العنوان: ${[place, o.area, o.street].filter(Boolean).join(" — ")}`);
  L.push("");
  L.push("الطلب:");

  (o.items || []).forEach((it) => {
    const title = it.nameAr || it.name || "منتج";
    const qty = it.isStarter ? "" : ` ×${it.qty || 1}`;
    L.push(`• ${title}${qty} — ${money(it.totalPrice)} ${it.priceNote || "جنيه"}`);
    if (it.extras && it.extras.length) {
      L.push(`   إضافات: ${it.extras.map((e) => e.name).join("، ")}`);
    }
  });

  L.push("");
  if (o.deliveryFee != null) L.push(`التوصيل: ${money(o.deliveryFee)} جنيه`);
  L.push(`الإجمالي: ${money(o.total)} جنيه`);

  if (o.deposit) {
    L.push("");
    L.push(`العربون المطلوب: ${money(o.deposit)} جنيه`);
    L.push("مرفق صورة التحويل 👇");
  }

  return L.join("\n");
}

/** لينك واتساب جاهز للفتح */
export function buildOrderWhatsAppUrl(o) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage(o))}`;
}
