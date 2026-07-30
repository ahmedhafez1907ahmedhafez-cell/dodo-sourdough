// ============================================================
// البحث عن سيرفر التكامل المنفصل
//   node scripts/findIntegrationServer.js
//
// الفكرة: التوثيق الرسمي (Mylerz API V1.3) بيشاور على سيرفر
// مختلف تماماً عن اللي إحنا بنجرب عليه:
//
//   التوثيق  →  41.33.122.61:8888/MylerzIntegrationStaging
//   إحنا     →  api.mylerz.net   (ده سيرفر البوابة)
//
// يمكن التكامل ليه تطبيق منفصل بصلاحيات مختلفة، وده يفسر
// ليه البوابة بتعمل شحنات وإحنا بناخد UNAUTHORIZED.
//
// جربنا من المتصفح بس CORS منع النتيجة. من Node مفيش المنع ده.
// كله تسجيل دخول بس — مفيش شحنات بتتعمل.
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

const U = env.MYLERZ_USERNAME, P = env.MYLERZ_PASSWORD;
if (!U || !P) { console.error("❌ اليوزر أو الباسورد ناقص في .env.local"); process.exit(1); }

const HOSTS = [
  // اللي في التوثيق بالحرف
  "http://41.33.122.61:8888/MylerzIntegrationStaging",
  "http://41.33.122.61:8888/MylerzIntegration",
  // احتمالات لنسخة الإنتاج من نفس التطبيق
  "https://integration.mylerz.net",
  "https://integration.mylerz.com",
  "https://apiintegration.mylerz.net",
  "https://integrationapi.mylerz.net",
  "https://api.mylerz.net/MylerzIntegration",
  "https://egypt.api.mylerz.com",
  "https://api.mylerz.com",
  // اللي إحنا شغالين عليه (للمقارنة)
  "https://api.mylerz.net",
];

async function tryHost(h) {
  const body = new URLSearchParams({ grant_type: "password", username: U, password: P });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(h + "/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: ctrl.signal,
    });
    const t = await r.text();
    if (t.includes("access_token")) return { ok: true, status: r.status, note: "🎉 رجّع توكن!" };
    return { ok: false, status: r.status, note: t.slice(0, 90).replace(/\s+/g, " ") };
  } catch (e) {
    return { ok: false, status: "-", note: e.name === "AbortError" ? "مهلة انتهت (مفيش رد)" : (e.cause?.code || e.message) };
  } finally { clearTimeout(timer); }
}

(async () => {
  console.log("🔎 بدوّر على سيرفر التكامل — تسجيل دخول بس، مفيش شحنات\n");
  const wins = [];
  for (const h of HOSTS) {
    const r = await tryHost(h);
    console.log(`${r.ok ? "✅" : "✗ "} ${h.padEnd(50)} ${String(r.status).padEnd(5)} ${r.note}`);
    if (r.ok) wins.push(h);
  }

  console.log("\n──────────────────────────────────");
  if (!wins.length) {
    console.log("مفيش سيرفر تكامل منفصل رد.");
    console.log("يبقى api.mylerz.net هو السيرفر الوحيد، والمشكلة صلاحيات على الحساب فعلاً.");
    return;
  }
  const other = wins.filter((w) => !w.startsWith("https://api.mylerz.net"));
  if (other.length) {
    console.log("🎯 في سيرفر تاني قَبِل تسجيل الدخول:");
    other.forEach((w) => console.log("   " + w));
    console.log("\nجرّب تحطه في .env.local وتعيد اختبار الشحنة:");
    console.log(`   MYLERZ_API_BASE_URL=${other[0]}`);
    console.log("   node scripts/testShipment.js --send");
  } else {
    console.log("api.mylerz.net بس هو اللي رد — مفيش سيرفر تكامل منفصل.");
  }
})();
