// ============================================================
// تجربة إنشاء شحنة على سيرفر التكامل
//   node scripts/testShipment.js          ← معاينة بس
//   node scripts/testShipment.js --send   ← بيبعت فعلاً
//
// بيستخدم نفس المسار وشكل البيانات اللي في lib/mylerz.js:
//   POST https://integration.mylerz.net/api/Orders/AddOrders
// ============================================================

if (!process.execArgv.includes("--use-system-ca") && !process.env.DODO_CA_OK) {
  const { spawnSync } = require("child_process");
  const r = spawnSync(process.execPath, ["--use-system-ca", __filename, ...process.argv.slice(2)], {
    stdio: "inherit", env: { ...process.env, DODO_CA_OK: "1" },
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

const fs = require("fs"), path = require("path");
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const SEND = process.argv.includes("--send");
const BASE = (process.env.MYLERZ_API_BASE_URL || "https://integration.mylerz.net")
  .trim().replace(/\/+$/, "").replace(/\/api$/i, "");

if (!/integration\.mylerz\.net/i.test(BASE)) {
  console.log("⚠️  تنبيه: السيرفر مش integration.mylerz.net");
  console.log("   الحالي:", BASE);
  console.log("   المفروض: MYLERZ_API_BASE_URL=https://integration.mylerz.net\n");
}

const due = new Date();
due.setDate(due.getDate() + 1);
due.setHours(12, 0, 0, 0);

const summary = "ساوردو أبيض سادة x1, شيدر وزيتون x1";
const COD = 350;

// نفس اللي بيبنيه buildOrderDto في lib/mylerz.js
const order = {
  WarehouseName: process.env.MYLERZ_WAREHOUSE_NAME || undefined,
  PickupDueDate: due.toISOString().slice(0, 19),
  Package_Serial: 1,
  Reference: "TEST-" + Date.now().toString().slice(-6),
  Description: `Dodo Sourdough: ${summary}`,
  Total_Weight: 2,

  Service_Type: "DTD",          // Door to door
  Service: "ND",                // Next day
  Service_Category: "DELIVERY",

  Payment_Type: "COD",
  COD_Value: COD,               // ← الحقل الرسمي لمبلغ التحصيل
  Currency: "EGP",

  Customer_Name: "عميل تجريبي",
  Mobile_No: "01000000000",

  Street: "شارع فريد ندا",
  Building_No: "5",
  Floor_No: "2",
  Apartment_No: "4",
  Country: "Egypt",
  Neighborhood: "BANHA",        // بنها — كود مدينة مستقل
  Address_Category: "H",
  Special_Notes: "بنها - شارع فريد ندا - عمارة 5 - دور 2 - شقة 4",

  Pieces: [
    { PieceNo: 1, Weight: 2, ItemCategory: "food", SpecialNotes: summary },
  ],
};

(async () => {
  console.log("📦 الشحنة التجريبية:\n");
  console.log(JSON.stringify([order], null, 2));
  console.log("\n──────────────────────────────────");
  console.log("السيرفر  =", BASE);
  console.log("المسار   = /api/Orders/AddOrders");
  console.log("المخزن   =", order.WarehouseName || "(الافتراضي — مفيش اسم متحدد)");
  console.log("المنطقة  = BANHA");
  console.log("المبلغ   =", COD, "جنيه (COD_Value)");

  if (!SEND) {
    console.log("\n👀 معاينة بس — مفيش حاجة اتبعتت.");
    console.log("   للإرسال:  node scripts/testShipment.js --send");
    return;
  }

  const b = new URLSearchParams({
    grant_type: "password",
    username: process.env.MYLERZ_USERNAME,
    password: process.env.MYLERZ_PASSWORD,
  });
  const lr = await fetch(`${BASE}/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString(),
  });
  if (!lr.ok) { console.error("❌ فشل تسجيل الدخول:", lr.status); process.exit(1); }
  const token = (await lr.json()).access_token;
  console.log("\n✅ تسجيل الدخول نجح — ببعت...\n");

  const res = await fetch(`${BASE}/api/Orders/AddOrders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify([order]),
  });
  const txt = await res.text();

  console.log(`الرد (${res.status}):\n`);
  let j = null;
  try { j = JSON.parse(txt); console.log(JSON.stringify(j, null, 2).slice(0, 2500)); }
  catch { console.log(txt.slice(0, 1500)); }

  console.log("\n──────────────────────────────────");

  const v = j?.Value || {};
  const pkg = v.Packages?.[0];
  const err = j?.ErrorDescription || v.ErrorMessage || pkg?.ErrorMessage || v.ErrorCode;

  if (pkg?.BarCode) {
    console.log(`🎉 اتعملت! رقم التتبع: ${pkg.BarCode}`);
    console.log(`   كود أمر الاستلام: ${v.PickupOrderCode || "-"}`);
    console.log(`   الحالة: ${pkg.Status || "-"}`);
    console.log("\n   افتح mylerz.net → Packages وتأكد إن المبلغ 350 ظاهر صح، وبعدين الغيها.");
  } else if (err) {
    console.log("❌ مايلرز رفضت:", err);
    if (String(err).includes("Missing_Required_Field")) {
      console.log("   في حقل إجباري ناقص — ابعتلي الرد كامل فوق.");
    }
  } else {
    console.log("🟡 الرد مش واضح — ابعتهولي.");
  }
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
