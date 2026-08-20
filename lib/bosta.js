// ============================================================
// تكامل بوسطة (Bosta) — سيرفر فقط، متتستدعاش من المتصفح أبداً
//
// ليه بوسطة؟ شركة الشحن القديمة كانت بطيئة (الطرد بيقعد ٢-٣ أيام، والاستلام
// بييجي بعد يوم من التسجيل). بوسطة بتوعد بالتوصيل في اليوم التالي،
// وعندها API رسمي + SDK بـ Node، والأهم إن مفتاح الـ API بيتولّد
// self-service من الداشبورد من غير تعاقد ولا توثيق شركة.
//
// التوثيق: https://docs.bosta.co   —   SDK: github.com/bostaapp/bosta-nodejs
//
// المتغيرات في .env.local (القيم بيحطها أحمد بنفسه — متتكتبش في أي شات):
//   BOSTA_API_KEY          مفتاح الـ API من: الإعدادات ← ربط التطبيقات
//   BOSTA_API_BASE_URL     اختياري (افتراضي https://app.bosta.co)
//                          للتجربة: https://stg-app.bosta.co
//   BOSTA_SKIP_BANHA       true = أوردرات بنها متروحش لبوسطة (بتوصّلها بنفسك)
//   BOSTA_WEBHOOK_HEADER   اسم هيدر التوثيق اللي بوسطة هتبعته
//   BOSTA_WEBHOOK_SECRET   قيمة السر المشترك
// ============================================================

const DEFAULT_BASE = "https://app.bosta.co";

function baseUrl() {
  const raw = (process.env.BOSTA_API_BASE_URL || "").trim().replace(/\/+$/, "");
  return raw || DEFAULT_BASE;
}

function apiKey() {
  return (process.env.BOSTA_API_KEY || "").trim();
}

export function isBostaEnabled() {
  return !!apiKey();
}

// ---- أنواع الشحنات (من SDK بوسطة الرسمي) ----
export const DELIVERY_TYPE_SEND = 10; // Package Delivery / Forward

// ---- الحالات اللي بتهمنا من بوسطة ----
export const BOSTA_DELIVERED = "Delivered";
export const BOSTA_TERMINATED = "Terminated";
export const BOSTA_CANCELED = "Canceled";
export const BOSTA_RETURNED = "Returned to business";

// ============================================================
// نداء الـ API
// بوسطة بتستخدم الهيدر Authorization بالمفتاح **من غير** كلمة Bearer.
// ============================================================
async function api(method, path, body) {
  const key = apiKey();
  if (!key) throw new Error("تكامل بوسطة مش مفعّل — BOSTA_API_KEY مش موجود على السيرفر");

  let res;
  try {
    res = await fetch(`${baseUrl()}/api/v0/${path}`, {
      method,
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
        "X-Requested-By": "dodo-sourdough",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    // زي مشكلة الإيميل اللي عدت علينا: الأصل الحقيقي بيبقى في cause
    const cause = e?.cause?.message || e?.cause?.code || "";
    throw new Error(`مقدرناش نوصل لبوسطة: ${e.message}${cause ? ` (${cause})` : ""}`);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* مش JSON */ }

  if (!res.ok) {
    const msg = data?.message || data?.error || text.slice(0, 300) || `HTTP ${res.status}`;
    throw new Error(`بوسطة (${res.status}): ${msg}`);
  }

  // بوسطة بترجّع {success, message, data} — وأحياناً data.data
  return data?.data !== undefined ? data.data : data;
}

// ============================================================
// المحافظات: بنجيب قايمة المدن من بوسطة نفسها بدل ما نحفظ أكواد
// ثابتة في الكود. لو بوسطة ضافت محافظة أو غيّرت كود، ده بيمشي لوحده.
// الكاش بيعيش ساعة في ذاكرة السيرفر.
// ============================================================
let citiesCache = { list: null, at: 0 };
const CITIES_TTL_MS = 60 * 60 * 1000;

// بيوحّد شكل الحروف العربية اللي بتتكتب بأكثر من صورة
// (الهمزة، الألف المقصورة، التاء المربوطة) عشان المطابقة متكسرش
function normalizeAr(s) {
  return String(s || "")
    .trim()
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// أسماء إنجليزية احتياطية — لو بوسطة رجّعت الاسم إنجليزي بس
const EN_ALIASES = {
  "القاهرة": ["cairo"],
  "الجيزة": ["giza"],
  "القليوبية": ["qalyubia", "qaliobia", "qalyoubia", "kalyoubia"],
  "الإسكندرية": ["alexandria"],
  "الدقهلية": ["dakahlia"],
  "الشرقية": ["sharkia", "sharqia"],
  "الغربية": ["gharbia"],
  "المنوفية": ["monufia", "menofia"],
  "البحيرة": ["beheira", "behera"],
  "كفر الشيخ": ["kafr elsheikh", "kafr el sheikh", "kafrelsheikh"],
  "دمياط": ["damietta"],
  "بورسعيد": ["port said", "portsaid"],
  "الإسماعيلية": ["ismailia"],
  "السويس": ["suez"],
  "الفيوم": ["fayoum", "faiyum"],
  "بني سويف": ["beni suef", "bani suef"],
  "المنيا": ["minya", "menia"],
  "أسيوط": ["assiut", "asyut"],
  "سوهاج": ["sohag"],
  "قنا": ["qena"],
  "الأقصر": ["luxor"],
  "أسوان": ["aswan"],
  "البحر الأحمر": ["red sea"],
  "مطروح": ["marsa matrouh", "matrouh", "matrah"],
  "شمال سيناء": ["north sinai"],
  "جنوب سيناء": ["south sinai"],
  "الوادي الجديد": ["new valley"],
};

async function getCities() {
  if (citiesCache.list && Date.now() - citiesCache.at < CITIES_TTL_MS) {
    return citiesCache.list;
  }
  const raw = await api("get", "cities");
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.list) ? raw.list : [];
  if (list.length) citiesCache = { list, at: Date.now() };
  return list;
}

/**
 * بيحوّل اسم محافظة عربي (زي اللي في lib/deliveryRates.js) لكود المدينة
 * عند بوسطة. بيرمي Error برسالة واضحة لو ملقاش — أحسن من إنه يبعت
 * شحنة بمدينة غلط ونكتشف بعدين.
 */
export async function resolveCityCode(provinceAr) {
  const wanted = normalizeAr(provinceAr);
  if (!wanted) throw new Error("مفيش محافظة في الأوردر");

  const cities = await getCities();
  if (!cities.length) throw new Error("بوسطة مرجعتش قايمة المحافظات");

  const aliases = (EN_ALIASES[String(provinceAr).trim()] || []).map(normalizeAr);

  const hit = cities.find((c) => {
    const names = [c?.nameAr, c?.name, c?.arabicName, c?.englishName]
      .filter(Boolean)
      .map(normalizeAr);
    return names.some((n) => n === wanted || aliases.includes(n));
  });

  if (!hit) {
    throw new Error(`مالقيناش محافظة "${provinceAr}" في قايمة بوسطة — راجع الاسم`);
  }
  // بوسطة بتقبل الكود (زي EG-01) في dropOffAddress.city
  return hit.code || hit._id;
}

// ---- تنظيف رقم الموبايل: 11 رقم يبدأ بـ 01 ----
function normalizePhone(raw) {
  let p = String(raw || "").replace(/\D/g, "");
  if (p.startsWith("20")) p = "0" + p.slice(2);
  if (p.length === 10 && p.startsWith("1")) p = "0" + p;
  return p;
}

function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "عميل", lastName: "دودو" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// ============================================================
// بناء جسم الشحنة
// ============================================================
export async function buildDeliveryPayload(order) {
  const items = order.items || [];
  const summary = items
    .map((i) => `${i.nameAr || i.name || "منتج"} x${i.qty || 1}`)
    .join(", ")
    .slice(0, 200);

  const itemsCount = items.reduce((n, i) => n + (Number(i.qty) || 1), 0) || 1;
  const { firstName, lastName } = splitName(order.customerName);

  const city = await resolveCityCode(order.province);

  const secondLine = [
    order.zone === "banha" && order.area ? `بنها - ${order.area}` : "",
    order.building ? `عمارة ${order.building}` : "",
    order.floor ? `دور ${order.floor}` : "",
    order.flat ? `شقة ${order.flat}` : "",
  ].filter(Boolean).join(" - ");

  return {
    type: DELIVERY_TYPE_SEND,
    specs: {
      size: "SMALL",
      packageDetails: {
        itemsCount,
        description: `Dodo Sourdough: ${summary}`.slice(0, 250),
      },
    },
    // العميل بيدفع ٥٠٪ عربون قبل الشحن والباقي تحويل بعد الاستلام،
    // يعني المندوب مبياخدش فلوس خالص → التحصيل صفر.
    cod: 0,
    dropOffAddress: {
      city,
      zone: order.area || undefined,
      district: order.area || undefined,
      firstLine: String(order.street || "").slice(0, 200) || "-",
      secondLine: secondLine || undefined,
      buildingNumber: order.building || undefined,
      floor: order.floor || undefined,
      apartment: order.flat || undefined,
    },
    businessReference: String(order.id || ""),
    receiver: {
      firstName,
      lastName,
      phone: normalizePhone(order.customerPhone),
      ...(order.customerEmail ? { email: order.customerEmail } : {}),
    },
    notes: summary.slice(0, 200) || undefined,
  };
}

// ---- إنشاء شحنة ----
export async function createBostaDelivery(order) {
  if (!isBostaEnabled()) return { enabled: false };

  const payload = await buildDeliveryPayload(order);
  const data = await api("post", "deliveries", payload);

  const trackingNo = data?.trackingNumber || data?.tracking_number || null;
  const deliveryId = data?._id || data?.id || null;

  if (!trackingNo && !deliveryId) {
    throw new Error("بوسطة قبلت الطلب بس مرجعتش رقم تتبع");
  }

  return { enabled: true, trackingNo, deliveryId, raw: data };
}

// ---- تتبع شحنة ----
export async function trackBostaDelivery(trackingNo) {
  if (!isBostaEnabled()) return null;
  try {
    return await api("get", `deliveries/${encodeURIComponent(trackingNo)}/tracking`);
  } catch {
    return null;
  }
}

// ---- حالة شحنة ----
export async function getBostaDelivery(trackingNo) {
  if (!isBostaEnabled()) return null;
  try {
    return await api("get", `deliveries/${encodeURIComponent(trackingNo)}`);
  } catch {
    return null;
  }
}

// ---- إلغاء شحنة ----
export async function cancelBostaDelivery(deliveryId) {
  if (!isBostaEnabled()) return { enabled: false };
  try {
    await api("delete", `deliveries/${encodeURIComponent(deliveryId)}`);
    return { enabled: true, ok: true };
  } catch (e) {
    return { enabled: true, ok: false, response: String(e.message || e).slice(0, 300) };
  }
}

// ============================================================
// بوليصة الشحن (AWB)
// بوسطة بترجّع إما رابط للـ PDF أو الملف نفسه base64 — بندعم الاتنين
// وبنرجّع Buffer جاهز للطباعة زي ما كان بيحصل قبل كده بالظبط.
// ============================================================
export async function getBostaAwbPdf(deliveryId) {
  if (!isBostaEnabled()) throw new Error("تكامل بوسطة مش مفعّل");

  const data = await api("get", `deliveries/awb/${encodeURIComponent(deliveryId)}`);

  const value =
    typeof data === "string" ? data : data?.data || data?.url || data?.awb || data?.pdf || null;

  if (!value) throw new Error("بوسطة رجّعت بوليصة فاضية");

  // حالة ١: رابط للملف
  if (/^https?:\/\//i.test(value)) {
    const res = await fetch(value);
    if (!res.ok) throw new Error(`مقدرناش ننزّل البوليصة (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  // حالة ٢: base64 (مع أو من غير data: prefix)
  const b64 = String(value).replace(/^data:application\/pdf;base64,/, "");
  const buf = Buffer.from(b64, "base64");
  if (!buf.length) throw new Error("البوليصة اللي رجعت مش ملف صالح");
  return buf;
}
