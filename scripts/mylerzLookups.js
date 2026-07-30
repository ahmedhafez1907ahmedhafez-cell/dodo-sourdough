// ============================================================
// جلب جداول الترميز والمخزن من مايلرز
//   node scripts/mylerzLookups.js
//
// الـ API الجديد بيشتغل بالأرقام (IDs) مش بالنصوص، فلازم نجيب:
//   - المخزن بتاعك (WarehouseId)  ← أهم رقم
//   - أنواع الخدمة والدفع والفئات
//   - المدن والمناطق (عشان عناوين العملاء)
// بيحفظ كل حاجة في scripts/mylerz-lookups.json
// كله GET — مفيش أي شحنة بتتعمل.
// ============================================================

if (!process.execArgv.includes("--use-system-ca") && !process.env.DODO_CA_OK) {
  const { spawnSync } = require("child_process");
  const r = spawnSync(process.execPath, ["--use-system-ca", __filename, ...process.argv.slice(2)], {
    stdio: "inherit", env: { ...process.env, DODO_CA_OK: "1" },
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

const fs = require("fs"), path = require("path");
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const base = (env.MYLERZ_API_BASE_URL || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");
// بيتقرا من الـ API نفسه — عشان يشتغل مع أي حساب (تست أو حقيقي)
let MERCHANT_ID = Number(env.MYLERZ_MERCHANT_ID || 0) || null;

async function login() {
  const b = new URLSearchParams({ grant_type: "password", username: env.MYLERZ_USERNAME, password: env.MYLERZ_PASSWORD });
  const r = await fetch(`${base}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString() });
  if (!r.ok) throw new Error("login " + r.status);
  return (await r.json()).access_token;
}

const out = {};

async function get(label, url, H) {
  try {
    const r = await fetch(base + url, { headers: H });
    const t = await r.text();
    if (!r.ok) { console.log(`  ✗ ${label.padEnd(26)} ${r.status}  ${t.slice(0, 110).replace(/\s+/g, " ")}`); return null; }
    let j; try { j = JSON.parse(t); } catch { console.log(`  ✗ ${label.padEnd(26)} رد مش JSON`); return null; }
    const arr = Array.isArray(j) ? j : (Array.isArray(j.Value) ? j.Value : null);
    console.log(`  ✓ ${label.padEnd(26)} ${arr ? arr.length + " عنصر" : "object"}`);
    out[label] = j;
    return j;
  } catch (e) { console.log(`  ✗ ${label.padEnd(26)} ${e.message}`); return null; }
}

async function post(label, url, body, H) {
  try {
    const r = await fetch(base + url, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) { console.log(`  ✗ ${label.padEnd(26)} ${r.status}  ${t.slice(0, 140).replace(/\s+/g, " ")}`); return null; }
    let j; try { j = JSON.parse(t); } catch { return null; }
    const arr = Array.isArray(j) ? j : (Array.isArray(j.Value) ? j.Value : null);
    console.log(`  ✓ ${label.padEnd(26)} ${arr ? arr.length + " عنصر" : "object"}`);
    out[label] = j;
    return j;
  } catch (e) { console.log(`  ✗ ${label.padEnd(26)} ${e.message}`); return null; }
}

function show(label, items, nameKeys = ["Name", "EnName", "NameEn", "Text", "ArName"], idKeys = ["Id", "ID", "Value", "Code"]) {
  if (!items) return;
  const arr = Array.isArray(items) ? items : items.Value;
  if (!Array.isArray(arr) || !arr.length) return;
  console.log(`\n── ${label} ──`);
  arr.slice(0, 25).forEach((o) => {
    if (o === null || typeof o !== "object") { console.log("   " + o); return; }
    const id = idKeys.map((k) => o[k]).find((v) => v !== undefined);
    const nm = nameKeys.map((k) => o[k]).find((v) => v !== undefined);
    console.log(`   ${String(id).padEnd(8)} ${nm ?? JSON.stringify(o).slice(0, 90)}`);
  });
  if (arr.length > 25) console.log(`   … و${arr.length - 25} كمان`);
}

(async () => {
  const token = await login();
  const H = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  // نجيب الـ MerchantId من الحساب نفسه — أضمن من إننا نكتبه بإيدينا
  try {
    const r = await fetch(base + "/api/Account/GetUserDetails", { headers: H });
    const d = await r.json();
    if (d?.MerchantMember_merID) MERCHANT_ID = d.MerchantMember_merID;
    console.log(`✅ ${d?.MerchantName ?? "?"} | MerchantId = ${MERCHANT_ID} | السيرفر: ${base}\n`);
  } catch {
    console.log("✅ تسجيل الدخول نجح | MerchantId =", MERCHANT_ID, "\n");
  }
  if (!MERCHANT_ID) { console.error("❌ معرفتش أجيب الـ MerchantId"); process.exit(1); }

  console.log("═══ المخزن بتاعك ═══");
  const wh1 = await get("warehouse_byMerchantId", `/api/merchant/GetWarehouseByMerchantId/${MERCHANT_ID}`, H);
  // الـ endpoint ده عايز مصفوفة أرقام في الـ body مش object
  const wh2 = await post("warehouse_list", "/api/merchant/GetMerchantWarhouses", [MERCHANT_ID], H);
  await post("pickup_locations", "/api/merchant/GetMerchantPickupLocations", { MerchantIds: [MERCHANT_ID] }, H);

  console.log("\n═══ جداول الترميز ═══");
  await get("serviceTypes", "/api/loockup/GetAllServiceType", H);
  await get("packageService", "/api/loockup/GetPackageService", H);
  await get("serviceCategory", "/api/loockup/GetServiceCategory", H);
  await get("paymentTypes", "/api/loockup/GetAllPaymentType", H);
  await get("productCategory", "/api/loockup/GetAllProductCategory", H);
  await get("addressCategory", "/api/loockup/GetAllAddressCategory", H);
  await get("packageTypes", "/api/loockup/GetPackageType", H);
  await get("cities", "/api/loockup/GetAllCities", H);
  await get("zones", "/api/loockup/GetAllZones", H);

  // ---- عرض مقروء ----
  show("أنواع الخدمة (ServiceTypeId)", out.serviceTypes);
  show("الخدمة (ServiceId)", out.packageService);
  show("فئة الخدمة (ServiceCategoryId)", out.serviceCategory);
  show("طرق الدفع (PaymentTypeId)", out.paymentTypes);
  show("فئة المنتج (ItemCategoryId)", out.productCategory);
  show("فئة العنوان (AddressCategoryId)", out.addressCategory);
  show("المدن (CityId)", out.cities);

  // المخزن — أهم حاجة
  console.log("\n══════════════════════════════════");
  const whData = wh1 || wh2;
  const list = Array.isArray(whData) ? whData : whData?.Value;
  if (Array.isArray(list) && list.length) {
    console.log("🏬 المخازن (نقاط الاستلام) بتاعتك:");
    list.forEach((w) => {
      console.log(`   WarehouseId = ${w.Id ?? w.WarehouseId}   الاسم: "${w.Name}"   ZoneId: ${w.ZoneId ?? "-"}`);
    });
    console.log("\n👉 حط الرقم ده في .env.local:");
    console.log(`   MYLERZ_WAREHOUSE_ID=${list[0].Id ?? list[0].WarehouseId}`);
  } else {
    console.log("🏬 مفيش مخازن راجعة — يبقى دي فعلاً اللي لازم مايلرز يسجّلهالك");
    console.log("   (نقطة الاستلام / Pickup Location اللي المندوب هيجي ياخد منها)");
  }

  const p = path.join(__dirname, "mylerz-lookups.json");
  fs.writeFileSync(p, JSON.stringify(out, null, 2), "utf8");
  console.log("\n💾 كل البيانات اتحفظت في scripts/mylerz-lookups.json");
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
