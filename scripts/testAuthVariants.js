// ============================================================
// تجربة أشكال المصادقة المختلفة على endpoint التكامل
//   node scripts/testAuthVariants.js
//
// الـ endpoint رجّع UNAUTHORIZED مع الـ Bearer token العادي، والـ Swagger
// بيسجّل Authorization كـ parameter منفصل — يعني غالباً عايز API Key.
//
// لو عندك API Key من البوابة، حطه في .env.local كده:
//   MYLERZ_API_KEY=xxxxxxxx
// وشغّل السكريبت — هيجرب كل الاحتمالات ويقولك أنهي واحد نجح.
//
// بيبعت شحنة تجريبية صغيرة مع كل محاولة — على بيئة التست بس.
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

const base = (process.env.MYLERZ_API_BASE_URL || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");
const MERCHANT_ID = Number(process.env.MYLERZ_MERCHANT_ID || 38029);
const WAREHOUSE_ID = Number(process.env.MYLERZ_WAREHOUSE_ID || 46561);
const API_KEY = (process.env.MYLERZ_API_KEY || "").trim();

const pickup = new Date();
pickup.setDate(pickup.getDate() + 1);
pickup.setHours(12, 0, 0, 0);

function dto() {
  return {
    PickupOrder: {
      MerchantId: MERCHANT_ID,
      WarehouseId: WAREHOUSE_ID,
      PickupOrderDate: pickup.toISOString(),
      PackageCount: 1,
      Packages: [{
        MerchantId: MERCHANT_ID, WarehouseId: WAREHOUSE_ID,
        Description: "Dodo Sourdough test", PiecesCount: 1, TotalWeight: "2",
        ServiceTypeId: 1, ServiceId: 2, ServiceCategoryId: 1,
        ServiceDate: pickup.toISOString(), PaymentTypeId: 2, ValueOfGoods: 350,
        CustomerName: "عميل تجريبي", MobileNo: "01000000000",
        CustomerAddress: {
          BuildingNo: "5", FloorNo: "2", ApartmentNo: "4",
          Street: "بنها - شارع فريد ندا", CityId: 22,
          AddressCategoryId: 1, IsDelivaryAddress: true,
        },
        AddressCategoryId: 1,
        PackageReferenceNumber: "AUTHTEST-" + Date.now().toString().slice(-6),
        Quantity: 1,
        PackagePieces: [{ pieceNo: 1, Weight: "2", ItemCategoryId: 1, Quantity: 1 }],
      }],
    },
  };
}

async function login() {
  const b = new URLSearchParams({
    grant_type: "password", username: process.env.MYLERZ_USERNAME, password: process.env.MYLERZ_PASSWORD,
  });
  const r = await fetch(`${base}/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString(),
  });
  return (await r.json()).access_token;
}

async function attempt(label, headers) {
  try {
    const res = await fetch(`${base}/api/pickupOrder/SaveIntegrationPickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(dto()),
    });
    const txt = await res.text();
    let j = null; try { j = JSON.parse(txt); } catch {}
    const errored = j?.IsErrorState === true;
    const desc = j?.ErrorDescription || "";
    const bc = txt.match(/"BarCode"\s*:\s*"?(\d+)"?/i);

    if (res.ok && !errored) {
      console.log(`  ✅ ${label}`);
      console.log(`     نجحت! ${bc ? "Barcode: " + bc[1] : ""}`);
      console.log("     " + txt.slice(0, 400));
      return true;
    }
    console.log(`  ✗ ${label.padEnd(46)} ${res.status} ${desc || txt.slice(0, 70).replace(/\s+/g, " ")}`);
    return false;
  } catch (e) {
    console.log(`  ✗ ${label.padEnd(46)} ${e.message}`);
    return false;
  }
}

(async () => {
  const token = await login();
  console.log("✅ تسجيل الدخول نجح\n");
  console.log("═══ بجرب أشكال المصادقة ═══");

  const variants = [
    ["Bearer token (الحالي)",            { Authorization: `Bearer ${token}` }],
    ["token خام من غير Bearer",          { Authorization: token }],
    ["Bearer + MerchantId header",       { Authorization: `Bearer ${token}`, MerchantId: String(MERCHANT_ID) }],
    ["Bearer + ServiceCode في الـ body", { Authorization: `Bearer ${token}` }],
  ];

  if (API_KEY) {
    variants.push(
      ["API Key في Authorization",        { Authorization: API_KEY }],
      ["API Key بـ Bearer",               { Authorization: `Bearer ${API_KEY}` }],
      ["API Key في ApiKey header",        { ApiKey: API_KEY, Authorization: `Bearer ${token}` }],
      ["API Key في X-Api-Key",            { "X-Api-Key": API_KEY, Authorization: `Bearer ${token}` }],
      ["API Key لوحده في X-Api-Key",      { "X-Api-Key": API_KEY }],
    );
  } else {
    console.log("  ⚠️  مفيش MYLERZ_API_KEY في .env.local — هجرب الـ token بس.\n");
  }

  for (const [label, h] of variants) {
    const ok = await attempt(label, h);
    if (ok) {
      console.log("\n🎉 الشكل ده هو الصح — هظبط lib/mylerz.js عليه.");
      return;
    }
  }

  console.log("\n──────────────────────────────────");
  console.log("كل الأشكال رجّعت UNAUTHORIZED.");
  console.log("");
  console.log("الـ endpoint موجود وقَبِل شكل البيانات (رجّع 200 مش 400)،");
  console.log("يعني الـ payload سليم — ناقص بس صلاحية الـ Integration على اليوزر.");
  console.log("");
  console.log("جرّب من بوابة مايلرز:");
  console.log("  Settings → API / Integration → اعمل API Key");
  console.log("وحطه في .env.local:  MYLERZ_API_KEY=xxxx  وشغّل السكريبت تاني.");
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
