// ============================================================
// فحص سيرفر التكامل integration.mylerz.net
//   node scripts/probeIntegration.js
//
// ده السيرفر اللي التوثيق الرسمي (Mylerz API V1.3) بيوصّفه.
// المتوقع إنه بيستخدم الشكل القديم:
//   /api/Orders/AddOrders  مع Service_Type:"DTD" و COD_Value
// مش الشكل الجديد بتاع البوابة.
//
// كله GET وقراءة — مفيش شحنات بتتعمل.
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

const BASE = "https://integration.mylerz.net";

async function login() {
  const b = new URLSearchParams({
    grant_type: "password", username: env.MYLERZ_USERNAME, password: env.MYLERZ_PASSWORD,
  });
  const r = await fetch(BASE + "/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString(),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`login ${r.status}: ${t.slice(0, 150)}`);
  const j = JSON.parse(t);
  return j;
}

(async () => {
  console.log("🔗", BASE, "\n");
  const auth = await login();
  console.log("✅ تسجيل الدخول نجح");
  console.log("   اليوزر:", auth.userName || "-");
  console.log("   صلاحية التوكن:", Math.round((auth.expires_in || 0) / 86400), "يوم\n");
  const T = auth.access_token;
  const H = { Authorization: `Bearer ${T}`, Accept: "application/json" };

  // ---- ١) هل فيه Swagger؟ ----
  console.log("═══ توثيق ذاتي ═══");
  for (const d of ["/swagger/docs/v1", "/swagger", "/Help"]) {
    try {
      const r = await fetch(BASE + d, { headers: H });
      const t = await r.text();
      if (r.ok && t.length > 40) {
        console.log(`  ✅ ${d}  (${t.length} حرف)`);
        try {
          const j = JSON.parse(t);
          const paths = Object.keys(j.paths || {});
          if (paths.length) {
            console.log(`\n  📋 المسارات (${paths.length}):`);
            paths.forEach((p) => {
              const ms = Object.keys(j.paths[p]).join(",").toUpperCase();
              console.log(`     ${ms.padEnd(10)} ${p}`);
            });
          }
        } catch {}
      } else console.log(`  ✗  ${d}  ${r.status}`);
    } catch (e) { console.log(`  ✗  ${d}  ${e.message}`); }
  }

  // ---- ٢) الـ endpoints بتاعة التوثيق القديم ----
  console.log("\n═══ endpoints التوثيق (V1.3) ═══");
  const GETS = [
    "/api/Orders/GetWarehouses",
    "/api/Packages/GetCityZoneList",
  ];
  for (const p of GETS) {
    try {
      const r = await fetch(BASE + p, { headers: H });
      const t = await r.text();
      const flag = r.ok ? "✅" : (r.status === 404 ? "✗ " : "🟡");
      console.log(`  ${flag} ${p.padEnd(38)} ${r.status}  ${t.slice(0, 120).replace(/\s+/g, " ")}`);
    } catch (e) { console.log(`  ✗  ${p.padEnd(38)} ${e.message}`); }
  }

  // ---- ٣) AddOrders — بنبعت مصفوفة فاضية (مش هيتعمل أي شحنة) ----
  console.log("\n═══ AddOrders (مصفوفة فاضية — آمن) ═══");
  for (const p of ["/api/Orders/AddOrders", "/api/Orders/AddOrder"]) {
    try {
      const r = await fetch(BASE + p, {
        method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: "[]",
      });
      const t = await r.text();
      const flag = r.ok ? "✅" : (r.status === 404 ? "✗ " : "🟡");
      console.log(`  ${flag} ${p.padEnd(30)} ${r.status}  ${t.slice(0, 200).replace(/\s+/g, " ")}`);
    } catch (e) { console.log(`  ✗  ${p.padEnd(30)} ${e.message}`); }
  }

  console.log("\n──────────────────────────────────");
  console.log("لو AddOrders رجّع حاجة غير 404، يبقى ده هو السيرفر الصح");
  console.log("وهنرجع لشكل البيانات القديم بتاع الـ PDF.");
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
