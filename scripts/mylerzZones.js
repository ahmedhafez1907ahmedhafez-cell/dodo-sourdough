// ============================================================
// جلب أكواد المحافظات والمناطق من سيرفر التكامل
//   node scripts/mylerzZones.js
//
// بيطبع كل المدن بأكوادها، وبيقارنها بالخريطة اللي في lib/mylerz.js
// ويقولك لو في محافظة كودها غلط أو ناقصة.
// كله قراءة — مفيش شحنات.
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
const BASE = (env.MYLERZ_API_BASE_URL || "https://integration.mylerz.net").replace(/\/+$/, "");

// نفس الخريطة اللي في lib/mylerz.js
const OURS = {
  "القليوبية":"QLYB","القاهرة":"CA","الجيزة":"GZ","الإسكندرية":"ALX","الدقهلية":"DK",
  "الشرقية":"SHR","الغربية":"GH","المنوفية":"MNF","البحيرة":"BHR","كفر الشيخ":"KFS",
  "دمياط":"DMT","بورسعيد":"PS","الإسماعيلية":"ISM","السويس":"SUZ","الفيوم":"FYM",
  "بني سويف":"BNS","المنيا":"MN","أسيوط":"AST","سوهاج":"SHG","قنا":"QN",
  "الأقصر":"LXR","أسوان":"ASW","مطروح":"MTR","البحر الأحمر":"RS","شمال سيناء":"NS",
  "جنوب سيناء":"SS","الوادي الجديد":"WG",
};

(async () => {
  const b = new URLSearchParams({
    grant_type: "password", username: env.MYLERZ_USERNAME, password: env.MYLERZ_PASSWORD,
  });
  const lr = await fetch(BASE + "/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString(),
  });
  const token = (await lr.json()).access_token;
  console.log("✅ تسجيل الدخول نجح —", BASE, "\n");

  const H = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  // المخازن
  const wr = await fetch(BASE + "/api/Orders/GetWarehouses", { headers: H });
  const wj = await wr.json();
  const whs = Array.isArray(wj.Value) ? wj.Value : [];
  console.log("🏬 نقاط الاستلام:");
  whs.forEach((w) => {
    console.log(`   الاسم: "${w.Name}"   المنطقة: ${w.Zone?.EnName || "-"} (${w.Zone?.Code || "-"})`);
  });
  if (whs[0]) {
    console.log(`\n👉 في .env.local حط الاسم بالظبط كده (خد بالك من المسافات):`);
    console.log(`   MYLERZ_WAREHOUSE_NAME=${whs[0].Name}`);
  }

  // المدن والمناطق
  const cr = await fetch(BASE + "/api/packages/GetCityZoneList", { headers: H });
  const cj = await cr.json();
  const cities = Array.isArray(cj.Value) ? cj.Value : [];

  console.log(`\n🗺️  المدن (${cities.length}):\n`);
  const byAr = {};
  cities.forEach((c) => {
    byAr[c.ArName] = c.Code;
    console.log(`   ${String(c.Code).padEnd(8)} ${String(c.ArName || "").padEnd(18)} ${c.EnName || ""}   (${(c.Zones || []).length} منطقة)`);
  });

  // مقارنة
  console.log("\n═══ مقارنة بالخريطة اللي في الكود ═══");
  let problems = 0;
  for (const [ar, code] of Object.entries(OURS)) {
    const real = byAr[ar];
    if (!real) { console.log(`   ⚠️  "${ar}" مش موجودة عند مايلرز بالاسم ده`); problems++; }
    else if (real !== code) { console.log(`   ❌ "${ar}" عندنا ${code} — الصح ${real}`); problems++; }
  }
  const missing = Object.keys(byAr).filter((a) => !(a in OURS));
  if (missing.length) {
    console.log(`   ℹ️  محافظات عند مايلرز مش في خريطتنا: ${missing.join("، ")}`);
  }
  if (!problems) console.log("   ✅ كل الأكواد مطابقة");
  else console.log(`\n   عدّل NEIGHBORHOOD_CODE في lib/mylerz.js بالأكواد الصح فوق`);

  // مناطق القليوبية (عشان بنها)
  const q = cities.find((c) => c.ArName === "القليوبية" || c.Code === "QLYB");
  if (q) {
    console.log(`\n📍 مناطق ${q.ArName} (${q.Code}):`);
    (q.Zones || []).slice(0, 30).forEach((z) => {
      console.log(`   ${String(z.Code).padEnd(14)} ${z.ArName || ""}  ${z.EnName || ""}`);
    });
  }

  fs.writeFileSync(path.join(__dirname, "mylerz-zones.json"), JSON.stringify(cj, null, 2), "utf8");
  console.log("\n💾 اتحفظت في scripts/mylerz-zones.json");
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
