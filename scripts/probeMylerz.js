// ============================================================
// كشف المسار الصح لمايلرز + جلب المخازن (نقاط الاستلام)
//   node scripts/probeMylerz.js
//
// بيسجل دخول الأول، وبعدين بيجرب كل المسارات المحتملة على
// endpoints من نوع GET بس (مفيش أي شحنة بتتعمل — آمن تماماً).
// وبيقولك المسار اللي رجّع 200 وأسماء المخازن المسجلة عندك.
// ============================================================

if (!process.execArgv.includes("--use-system-ca") && !process.env.DODO_CA_OK) {
  const { spawnSync } = require("child_process");
  const r = spawnSync(process.execPath, ["--use-system-ca", __filename, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, DODO_CA_OK: "1" },
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ مفيش ملف .env.local");
  process.exit(1);
}
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const base = (env.MYLERZ_API_BASE_URL || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");
if (!base) { console.error("❌ MYLERZ_API_BASE_URL فاضي"); process.exit(1); }

// كل الاحتمالات للـ prefix اللي بيتحط قبل اسم الميثود
const PREFIXES = [
  "/api",
  "",
  "/MylerzIntegrationStaging/api",
  "/MylerzIntegration/api",
  "/api/v1",
  "/Integration/api",
];

// endpoints من نوع GET بس — مفيش أي تأثير جانبي
const PROBES = [
  { name: "GetWarehouses", suffix: "/Orders/GetWarehouses" },
  { name: "GetCityZoneList", suffix: "/Packages/GetCityZoneList" },
];

async function login() {
  const body = new URLSearchParams({
    grant_type: "password",
    username: env.MYLERZ_USERNAME || "",
    password: env.MYLERZ_PASSWORD || "",
  });
  const res = await fetch(`${base}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`فشل تسجيل الدخول (${res.status}): ${text.slice(0, 200)}`);
  if (/^\s*</.test(text)) {
    throw new Error(
      "السيرفر رجّع صفحة HTML مش JSON — يعني اللينك ده هو بوابة الموقع مش الـ API.\n" +
      `   اللينك الحالي: ${base}\n` +
      "   جرّب تضيف api. قبل الدومين، يعني:\n" +
      "   MYLERZ_API_BASE_URL=https://test.egypt.api.mylerz.com"
    );
  }
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error("الرد مش JSON مفهوم: " + text.slice(0, 200)); }
  if (!data.access_token) throw new Error("مفيش access_token في الرد: " + text.slice(0, 200));
  return data.access_token;
}

(async () => {
  console.log("🔗 السيرفر:", base);
  let token;
  try {
    token = await login();
    console.log("✅ تسجيل الدخول نجح\n");
  } catch (e) {
    console.error("❌", e.message);
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const winners = [];

  for (const probe of PROBES) {
    console.log(`── بجرب ${probe.name} ──`);
    for (const prefix of PREFIXES) {
      const url = `${base}${prefix}${probe.suffix}`;
      let line = `   ${String(prefix || "(بدون prefix)").padEnd(32)} `;
      try {
        const res = await fetch(url, { headers });
        const txt = await res.text();
        if (res.status === 404) {
          line += "404 مش موجود";
        } else if (res.ok) {
          line += "✅ 200 شغّال";
          winners.push({ probe: probe.name, prefix, url, body: txt });
        } else {
          line += `${res.status} — ${txt.slice(0, 90).replace(/\s+/g, " ")}`;
        }
      } catch (e) {
        line += "⚠️  " + (e.cause?.code || e.message);
      }
      console.log(line);
    }
    console.log("");
  }

  if (!winners.length) {
    console.log("😕 مفيش ولا مسار اشتغل — يبقى الحساب لسه مش مفعّل عليه الـ API،");
    console.log("   أو السيرفر ده مخصص لحاجة تانية. ابعت النتيجة دي لمايلرز.");
    return;
  }

  const best = winners[0];
  console.log("🎯 المسار الصح هو:", best.prefix || "(بدون prefix)");
  console.log("   يعني إنشاء الشحنة المفروض يكون على:");
  console.log(`   ${base}${best.prefix}/Orders/AddOrders\n`);
  if (best.prefix !== "/api") {
    console.log(`👉 حط السطر ده في .env.local:\n   MYLERZ_API_PREFIX=${best.prefix}\n`);
  }

  const wh = winners.find((w) => w.probe === "GetWarehouses");
  if (wh) {
    console.log("🏬 المخازن (نقاط الاستلام) المسجلة على حسابك:");
    try {
      const data = JSON.parse(wh.body);
      const list = Array.isArray(data.Value) ? data.Value : [data.Value].filter(Boolean);
      if (!list.length) {
        console.log("   (فاضية) — يبقى فعلاً محتاج مايلرز تسجّلك نقطة استلام / Address Book");
      } else {
        list.forEach((w, i) => {
          console.log(`   ${i + 1}. الاسم: "${w?.Name ?? "?"}"  |  المنطقة: ${w?.Zone?.Name ?? "-"}  |  العنوان: ${w?.Address ?? "-"}`);
        });
        console.log('\n   حط الاسم بالظبط زي ما هو في MYLERZ_WAREHOUSE_NAME');
      }
    } catch {
      console.log("   الرد مش JSON مفهوم:", wh.body.slice(0, 300));
    }
  }
})();
