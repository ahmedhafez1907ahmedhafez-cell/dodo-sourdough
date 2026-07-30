// ============================================================
// تكامل مايلرز (Mylerz) — سيرفر فقط، متتستدعاش من المتصفح أبداً
//
// ✅ السيرفر الصح: https://integration.mylerz.net
//
// رحلة طويلة وصلتنا هنا — للتوثيق:
//   • api.mylerz.net       = سيرفر البوابة. بيرفض إنشاء الشحنات بـ
//                            UNAUTHORIZED لأنه مخصص للواجهة مش للتكامل.
//   • integration.mylerz.net = سيرفر التكامل. ده اللي التوثيق الرسمي
//                            (Mylerz API V1.3) بيوصّفه، وهو اللي بيشتغل.
//   • التوكن هنا صالح 365 يوم (مقابل أسبوعين على سيرفر البوابة).
//
// الـ API ده بيستخدم **أكواد نصية** مش أرقام:
//   Service_Type:"DTD"  Payment_Type:"COD"  Neighborhood:"QLYB"
// عكس سيرفر البوابة اللي بيستخدم ServiceTypeId:1 وهكذا.
//
// المتغيرات في .env.local:
//   MYLERZ_API_BASE_URL   https://integration.mylerz.net
//   MYLERZ_USERNAME       اليوزر
//   MYLERZ_PASSWORD       الباسورد
//   MYLERZ_WAREHOUSE_NAME اسم نقطة الاستلام زي ما هي عندهم بالظبط
//   MYLERZ_ENABLED        true
// ============================================================

const DEFAULT_BASE = "https://integration.mylerz.net";

function baseUrl() {
  const b = (process.env.MYLERZ_API_BASE_URL || DEFAULT_BASE).trim()
    .replace(/\/+$/, "").replace(/\/api$/i, "");
  return b || DEFAULT_BASE;
}

export function isMylerzEnabled() {
  const v = (process.env.MYLERZ_ENABLED || "").trim().toLowerCase();
  return (v === "true" || v === "1") && !!baseUrl();
}

// ---- أكواد الخدمة (من التوثيق الرسمي، جدول Lookup Lists) ----
const SERVICE_TYPE_DTD = "DTD";        // Door to door
const SERVICE_NEXT_DAY = "ND";         // Next day
const SERVICE_CAT_DELIVERY = "DELIVERY";
const PAYMENT_COD = "COD";
const PAYMENT_PREPAID = "PP";
const ADDRESS_CAT_HOME = "H";
const ITEM_CAT_FOOD = "food";

// ---- المحافظة ← كود المنطقة عند مايلرز ----
// ⚠️ الأكواد دي مأخوذة حرفياً من /api/packages/GetCityZoneList (مش تخمين).
// لو مايلرز غيّروا حاجة، شغّل `node scripts/mylerzZones.js` وهو هيقولك.
//
// المفاتيح هنا مكتوبة بنفس إملاء lib/deliveryRates.js. وبنطبّع النص قبل
// المقارنة عشان اختلافات الهمزة والألف المقصورة متكسرش الربط — مايلرز
// مثلاً كاتبين "الاسكندرية" من غير همزة و"بنى سويف" بألف مقصورة.
const NEIGHBORHOOD_CODE = {
  "القليوبية": "QLYB",
  "الدقهلية": "DAKH",
  "الشرقية": "SHRK",
  "الغربية": "GHRB",
  "المنوفية": "MONF",
  "البحيرة": "BEHR",
  "كفر الشيخ": "SHKH",
  "دمياط": "DAMT",
  "الإسكندرية": "ALX",
  "القاهرة": "CA",
  "الجيزة": "Giza",
  "بورسعيد": "PORS",
  "الإسماعيلية": "ISML",
  "السويس": "SUEZ",
  "الفيوم": "FAYM",
  "بني سويف": "BENS",
  "المنيا": "MNYA",
  "أسيوط": "ASYT",
  "سوهاج": "SOHG",
  "قنا": "QENA",
  "الأقصر": "LUXR",
  "أسوان": "ASWN",
  "البحر الأحمر": "REDS",
  "مطروح": "MTRH",
  "شمال سيناء": "NSNA",
  "جنوب سيناء": "SSINA",
  "الوادي الجديد": "WADI",
};

// بنها عندها كود مدينة مستقل (٨ مناطق) — أدق من إننا نبعتها كقليوبية
const BANHA_CODE = "BANHA";

// بيوحّد شكل الحروف اللي بتتكتب بأكثر من صورة
function normalizeAr(s) {
  return String(s || "")
    .trim()
    .replace(/[إأآا]/g, "ا")   // كل أشكال الألف
    .replace(/[ىي]/g, "ي")     // الياء والألف المقصورة
    .replace(/ة/g, "ه")        // التاء المربوطة
    .replace(/\s+/g, " ");
}

const CODE_BY_NORMALIZED = Object.fromEntries(
  Object.entries(NEIGHBORHOOD_CODE).map(([k, v]) => [normalizeAr(k), v])
);

function neighborhoodFor(order) {
  if (order.zone === "banha") return BANHA_CODE;
  return CODE_BY_NORMALIZED[normalizeAr(order.province)] || "";
}

// ---- التوكن ----
let tokenCache = { token: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const body = new URLSearchParams({
    grant_type: "password",
    username: process.env.MYLERZ_USERNAME || "",
    password: process.env.MYLERZ_PASSWORD || "",
  });

  const res = await fetch(`${baseUrl()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mylerz login failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("Mylerz login: مفيش access_token في الرد");

  const ttlMs = (Number(data.expires_in) || 3600) * 1000;
  // بنجدده قبل انتهاءه بيوم للأمان
  tokenCache = { token: data.access_token, expiresAt: Date.now() + ttlMs - 24 * 60 * 60 * 1000 };
  return tokenCache.token;
}

// ---- تنظيف رقم الموبايل: 11 رقم يبدأ بـ 01 ----
function normalizePhone(raw) {
  let p = String(raw || "").replace(/\D/g, "");
  if (p.startsWith("20")) p = "0" + p.slice(2);
  if (p.length === 10 && p.startsWith("1")) p = "0" + p;
  return p;
}

// ---- بناء الأوردر بشكل التوثيق الرسمي (OrderDTO) ----
export function buildOrderDto(order) {
  const pickup = new Date();
  pickup.setDate(pickup.getDate() + 1);
  pickup.setHours(12, 0, 0, 0);

  const items = order.items || [];
  const summary = items
    .map((i) => `${i.nameAr || i.name || "منتج"} x${i.qty || 1}`)
    .join(", ")
    .slice(0, 200);

  const fullAddress = [
    order.zone === "banha" ? `بنها - ${order.area || ""}` : order.province || "",
    order.street || "",
    order.building ? `عمارة ${order.building}` : "",
    order.floor ? `دور ${order.floor}` : "",
    order.flat ? `شقة ${order.flat}` : "",
  ].filter(Boolean).join(" - ");

  const weight = Number(order.weightKg) || 2;

  return {
    WarehouseName: process.env.MYLERZ_WAREHOUSE_NAME || undefined,
    PickupDueDate: pickup.toISOString().slice(0, 19),
    Package_Serial: 1,
    Reference: String(order.id || ""),
    Description: `Dodo Sourdough: ${summary}`.slice(0, 250),
    Total_Weight: weight,

    Service_Type: SERVICE_TYPE_DTD,
    Service: SERVICE_NEXT_DAY,
    Service_Category: SERVICE_CAT_DELIVERY,

    Payment_Type: order.isPaidOnline ? PAYMENT_PREPAID : PAYMENT_COD,
    // ✅ الحقل ده موجود صراحة هنا — مش زي سيرفر البوابة اللي مكانش فيه
    COD_Value: order.isPaidOnline ? 0 : (Number(order.total) || 0),
    Currency: "EGP",

    Customer_Name: order.customerName || "",
    Mobile_No: normalizePhone(order.customerPhone),
    Mobile_No2: order.customerPhone2 ? normalizePhone(order.customerPhone2) : undefined,

    Street: order.street || fullAddress,
    Building_No: order.building || undefined,
    Floor_No: order.floor || undefined,
    Apartment_No: order.flat || undefined,
    Country: "Egypt",
    Neighborhood: neighborhoodFor(order) || undefined,
    Address_Category: ADDRESS_CAT_HOME,
    Special_Notes: fullAddress.slice(0, 200),

    Pieces: [
      {
        PieceNo: 1,
        Weight: weight,
        ItemCategory: ITEM_CAT_FOOD,
        SpecialNotes: summary.slice(0, 100),
      },
    ],
  };
}

// ---- إنشاء شحنة ----
export async function createMylerzShipment(order) {
  if (!isMylerzEnabled()) return { enabled: false };

  const token = await getToken();
  const dto = buildOrderDto(order);

  const res = await fetch(`${baseUrl()}/api/Orders/AddOrders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify([dto]),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Mylerz AddOrders failed (${res.status}): ${text.slice(0, 400)}`);
  }

  let data;
  try { data = JSON.parse(text); } catch { data = {}; }

  if (data.IsErrorState) {
    throw new Error(`Mylerz: ${data.ErrorDescription || "خطأ غير معروف"}`);
  }

  const v = data.Value || {};
  const pkg = v.Packages?.[0] || null;

  if (pkg?.ErrorMessage || v.ErrorMessage) {
    throw new Error(`Mylerz: ${pkg?.ErrorMessage || v.ErrorMessage}`);
  }

  return {
    enabled: true,
    trackingNo: pkg?.BarCode ? String(pkg.BarCode) : null,
    pickupOrderCode: v.PickupOrderCode || null,
    status: pkg?.Status || null,
    raw: data,
  };
}

// ---- تتبع شحنة ----
export async function getMylerzPackageStatus(trackingNo) {
  if (!isMylerzEnabled()) return null;
  const token = await getToken();
  const res = await fetch(
    `${baseUrl()}/api/packages/GetPackageStatus?AWB=${encodeURIComponent(trackingNo)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.Value?.Status || null;
}

// ---- المخازن (نقاط الاستلام) ----
export async function getMylerzWarehouses() {
  if (!isMylerzEnabled()) return [];
  const token = await getToken();
  const res = await fetch(`${baseUrl()}/api/Orders/GetWarehouses`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const v = data?.Value;
  return Array.isArray(v) ? v : [v].filter(Boolean);
}

// ---- إلغاء شحنة ----
export async function cancelMylerzPackage(trackingNo) {
  if (!isMylerzEnabled()) return { enabled: false };
  const token = await getToken();
  const res = await fetch(`${baseUrl()}/api/packages/CancelPackage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify([{ Barcode: String(trackingNo), ReferenceNumber: "" }]),
  });
  const t = await res.text();
  return { enabled: true, ok: res.ok, response: t.slice(0, 300) };
}
