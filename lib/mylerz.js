// ============================================================
// تكامل مايلرز (Mylerz) — سيرفر فقط، متتستدعاش من المتصفح أبداً
// مبني على توثيق Mylerz API V1.3 الرسمي:
//   1) تسجيل دخول: POST {BASE}/token  (grant_type=password + يوزر وباسورد)
//      بيرجع access_token صالح لمدة أسبوعين تقريباً — بنخزنه مؤقتاً هنا
//   2) إنشاء شحنة: POST {BASE}/api/Orders/AddOrders  (Array of OrderDTO)
//      بيرجع BarCode = رقم تتبع الشحنة (AWB)
//
// المتغيرات المطلوبة في .env.local:
//   MYLERZ_API_BASE_URL   رابط الـ API (من إيميل مايلرز — لينك "Mylerz Integration API")
//   MYLERZ_USERNAME       نفس يوزر البوابة اللي بعتوهولك
//   MYLERZ_PASSWORD       نفس الباسورد
//   MYLERZ_WAREHOUSE_NAME اسم المخزن/نقطة الاستلام المسجلة عندهم (اختياري)
//   MYLERZ_ENABLED        true عشان يشتغل — false يسيب الأوردر يتسجل عادي من غير شحنة
// ============================================================

function baseUrl() {
  // بنشيل أي / زيادة في الآخر، وكمان لو اللينك المنسوخ من الإيميل منتهي بـ /api
  // بنشيلها — عشان التوكن بيتجاب من {BASE}/token مش {BASE}/api/token
  return (process.env.MYLERZ_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
}

export function isMylerzEnabled() {
  // بنقبل true أو True أو TRUE أو 1
  const v = (process.env.MYLERZ_ENABLED || "").trim().toLowerCase();
  return (v === "true" || v === "1") && !!baseUrl();
}

// ---- التوكن: بنجيبه مرة وبنعيد استخدامه لحد قبل انتهاءه بساعة ----
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
  if (!data.access_token) throw new Error("Mylerz login: no access_token in response");

  const ttlMs = (Number(data.expires_in) || 3600) * 1000;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + ttlMs - 60 * 60 * 1000 };
  return tokenCache.token;
}

// ---- خريطة المحافظات ← أسماء مناطق مايلرز الرسمية (من قايمة الـ city_zone بتاعتهم) ----
// دي بتخلي الشحنة تتوجه للفرع الصح أوتوماتيك. المحافظات اللي مش في القايمة
// (زي القاهرة والجيزة لأنهم متقسمين أحياء) بنسيبها فاضية ومايلرز بيحددها
// من العنوان المكتوب.
const NEIGHBORHOOD_MAP = {
  "القليوبية": "Qalyubia",
  "الإسكندرية": "Alexandria",
  "الدقهلية": "Dakahlia",
  "الشرقية": "Sharqia",
  "الغربية": "Gharbia",
  "المنوفية": "Monufia",
  "البحيرة": "Beheira",
  "كفر الشيخ": "Kafr El Sheikh",
  "دمياط": "Damietta",
  "بورسعيد": "Port Said",
  "الإسماعيلية": "Ismailia",
  "السويس": "Suez",
  "الفيوم": "Faiyum",
  "بني سويف": "Beni Suef",
  "المنيا": "Minya",
  "أسيوط": "Asyut",
  "سوهاج": "Sohag",
  "قنا": "Qena",
  "الأقصر": "Luxor",
  "أسوان": "Aswan",
};

function mylerzNeighborhood(order) {
  // أوردرات بنها = القليوبية
  if (order.zone === "banha") return "Qalyubia";
  return NEIGHBORHOOD_MAP[order.province] || "";
}

// ---- تنظيف رقم الموبايل: مايلرز عايزينه 11 رقم يبدأ بـ 01 ----
function normalizePhone(raw) {
  let p = String(raw || "").replace(/\D/g, ""); // شيل أي حاجة مش رقم
  if (p.startsWith("20")) p = "0" + p.slice(2); // +2010... → 010...
  if (p.length === 10 && p.startsWith("1")) p = "0" + p; // 10xxxxxxxx → 010...
  return p;
}

// ---- إنشاء شحنة لأوردر من الموقع ----
// بترجع { enabled:false } لو التكامل مقفول — من غير ما ترمي خطأ،
// عشان الأوردر نفسه ميقعش لو مايلرز واقعة أو مش متفعلة.
export async function createMylerzShipment(order) {
  if (!isMylerzEnabled()) return { enabled: false };

  const token = await getToken();

  // بكرة الساعة 12 الظهر كميعاد استلام افتراضي
  const pickup = new Date();
  pickup.setDate(pickup.getDate() + 1);
  pickup.setHours(12, 0, 0, 0);

  const itemsSummary = (order.items || [])
    .map((i) => `${i.nameAr || i.name || "منتج"} x${i.qty || 1}`)
    .join(", ")
    .slice(0, 200);

  // العنوان الكامل في الملاحظات عشان المندوب يوصل حتى لو الـ zone codes مش متظبطة
  const fullAddress = [
    order.zone === "banha" ? `بنها - ${order.area || ""}` : order.province || "",
    order.street || "",
    order.building ? `عمارة ${order.building}` : "",
    order.floor ? `دور ${order.floor}` : "",
    order.flat ? `شقة ${order.flat}` : "",
  ].filter(Boolean).join(" - ");

  const orderDto = {
    WarehouseName: process.env.MYLERZ_WAREHOUSE_NAME || undefined,
    PickupDueDate: pickup.toISOString().slice(0, 19),
    Package_Serial: 1,
    Reference: order.id, // رقم الأوردر عندنا — بيربط شحنة مايلرز بالأوردر
    Description: `Dodo Sourdough: ${itemsSummary}`,
    Total_Weight: 2,
    Service_Type: "DTD", // Door to door
    Service: "ND", // Next day
    Service_Category: "DELIVERY",
    Payment_Type: "COD", // الدفع عند الاستلام
    COD_Value: Number(order.total) || 0, // المندوب يحصّل الإجمالي كله (منتجات + توصيل)
    Customer_Name: order.customerName,
    Mobile_No: normalizePhone(order.customerPhone),
    Street: order.street || "",
    Building_No: order.building || undefined,
    Floor_No: order.floor || undefined,
    Apartment_No: order.flat || undefined,
    Country: "Egypt",
    Neighborhood: mylerzNeighborhood(order) || undefined,
    Address_Category: "H",
    Special_Notes: fullAddress,
    Currency: "EGP",
    Pieces: [{ PieceNo: 1, Weight: 2, SpecialNotes: itemsSummary.slice(0, 100) }],
  };

  const res = await fetch(`${baseUrl()}/api/Orders/AddOrders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify([orderDto]),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mylerz AddOrders failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  if (data.IsErrorState) {
    throw new Error(`Mylerz error: ${data.ErrorDescription || "unknown"}`);
  }

  const pkg = data.Value?.Packages?.[0];
  if (pkg?.ErrorMessage) {
    throw new Error(`Mylerz package error: ${pkg.ErrorMessage}`);
  }

  return {
    enabled: true,
    trackingNo: pkg?.BarCode ? String(pkg.BarCode) : null,
    pickupOrderCode: data.Value?.PickupOrderCode || null,
    status: pkg?.Status || null,
  };
}

// ---- تتبع شحنة برقم التتبع (مستخدمة اختيارياً من لوحة الأدمن) ----
export async function getMylerzPackageStatus(trackingNo) {
  if (!isMylerzEnabled()) return null;
  const token = await getToken();
  const res = await fetch(
    `${baseUrl()}/api/Packages/GetPackageStatus?AWB=${encodeURIComponent(trackingNo)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.Value?.Status || null;
}
