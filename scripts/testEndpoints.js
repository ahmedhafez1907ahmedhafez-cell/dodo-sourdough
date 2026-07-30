// ============================================================
// تجربة الـ endpoints البديلة لإنشاء شحنة
//   node scripts/testEndpoints.js
//
// SaveIntegrationPickup رجّع UNAUTHORIZED — ده endpoint محجوز لحسابات
// التكامل. لكن البوابة نفسها بتعمل شحنات بنفس اليوزر ده، يعني في
// endpoint تاني شغّال بالتوكن العادي. السكريبت بيجربهم كلهم.
//
// كله على بيئة التست.
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
const MID = Number(process.env.MYLERZ_MERCHANT_ID || 38029);
const WID = Number(process.env.MYLERZ_WAREHOUSE_ID || 46561);

const due = new Date(); due.setDate(due.getDate() + 1); due.setHours(12, 0, 0, 0);
const ref = () => "T" + Date.now().toString().slice(-8);

function pkg() {
  return {
    MerchantId: MID, WarehouseId: WID,
    Description: "Dodo Sourdough test", PiecesCount: 1, TotalWeight: "2",
    SpecialNotes: "test",
    ServiceTypeId: 1, ServiceId: 2, ServiceCategoryId: 1,
    ServiceDate: due.toISOString(), PaymentTypeId: 2, ValueOfGoods: 350,
    CustomerName: "عميل تجريبي", MobileNo: "01000000000",
    CustomerAddress: {
      BuildingNo: "5", FloorNo: "2", ApartmentNo: "4",
      Street: "بنها - شارع فريد ندا", CityId: 22,
      AddressCategoryId: 1, IsDelivaryAddress: true,
    },
    AddressCategoryId: 1,
    PackageReferenceNumber: ref(),
    Quantity: 1,
    PackagePieces: [{ pieceNo: 1, Weight: "2", ItemCategoryId: 1, Quantity: 1 }],
  };
}

function pickupWrap() {
  return {
    PickupOrder: {
      MerchantId: MID, WarehouseId: WID,
      PickupOrderDate: due.toISOString(), PackageCount: 1,
      Packages: [pkg()],
    },
  };
}

const CANDIDATES = [
  ["package/SavePackageList",                     { MerchantId: MID, Packages: [pkg()] }],
  ["package/SavePackageList (مصفوفة مباشرة)",     [pkg()]],
  ["package/SaveIntegrationPackages",             { MerchantId: MID, Packages: [pkg()] }],
  ["pickupOrder/SavePickupOrder",                 pickupWrap()],
  ["pickupOrder/SavePickupOrder (مسطّح)",         { MerchantId: MID, WarehouseId: WID, PickupOrderDate: due.toISOString(), PackageCount: 1, Packages: [pkg()] }],
  ["pickupOrder/GenerateBarCodeandSavePickupOrder", pickupWrap()],
  ["pickupOrder/SaveIntegrationPickup",           pickupWrap()],
];

async function login() {
  const b = new URLSearchParams({
    grant_type: "password", username: process.env.MYLERZ_USERNAME, password: process.env.MYLERZ_PASSWORD,
  });
  const r = await fetch(`${base}/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString(),
  });
  return (await r.json()).access_token;
}

(async () => {
  const token = await login();
  const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  console.log("✅ تسجيل الدخول نجح | MerchantId", MID, "| WarehouseId", WID, "\n");
  console.log("═══ بجرب endpoints إنشاء الشحنة ═══\n");

  const wins = [];
  for (const [label, body] of CANDIDATES) {
    const ep = "/api/" + label.split(" ")[0];
    try {
      const res = await fetch(base + ep, { method: "POST", headers: H, body: JSON.stringify(body) });
      const txt = await res.text();
      let j = null; try { j = JSON.parse(txt); } catch {}
      const errored = j?.IsErrorState === true;
      const desc = j?.ErrorDescription || j?.Message || "";
      const bc = txt.match(/"BarCode"\s*:\s*"?(\d{6,})"?/i);

      if (res.ok && !errored) {
        console.log(`✅ ${label}`);
        if (bc) console.log(`   🎉 Barcode: ${bc[1]}`);
        console.log("   " + txt.slice(0, 500).replace(/\s+/g, " "));
        wins.push({ label, ep, txt });
      } else if (res.status === 400 || (j?.Errors)) {
        // 400 = وصلنا للـ endpoint وهو بيراجع البيانات — ده تقدّم!
        console.log(`🟡 ${label}`);
        console.log(`   ${res.status} — بيقبل الطلب بس عايز بيانات مظبوطة:`);
        console.log("   " + txt.slice(0, 380).replace(/\s+/g, " "));
        wins.push({ label, ep, txt, needsFix: true });
      } else {
        console.log(`✗  ${label.padEnd(46)} ${res.status} ${desc || txt.slice(0, 60).replace(/\s+/g, " ")}`);
      }
    } catch (e) {
      console.log(`✗  ${label.padEnd(46)} ${e.message}`);
    }
    console.log("");
  }

  console.log("══════════════════════════════════");
  const real = wins.filter((w) => !w.needsFix);
  if (real.length) {
    console.log("🎯 الـ endpoint ده شغّال بالتوكن العادي:");
    real.forEach((w) => console.log("   " + w.ep));
    console.log("\nهظبط lib/mylerz.js عليه.");
  } else if (wins.length) {
    console.log("🟡 في endpoints قبلت الطلب ورجّعت 400 (يعني الصلاحية تمام،");
    console.log("   بس البيانات عايزة تظبيط). دي أخبار كويسة — الرد فوق");
    console.log("   بيقول الحقول الناقصة بالاسم. ابعتهولي.");
  } else {
    console.log("كل الـ endpoints رفضت. يبقى فعلاً محتاجين مايلرز يفعّلوا");
    console.log("صلاحية الـ Integration على اليوزر ده.");
  }
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
