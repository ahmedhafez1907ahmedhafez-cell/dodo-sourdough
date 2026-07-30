// ============================================================
// اكتشاف مسارات مايلرز الحقيقية
//   node scripts/discoverMylerz.js
//
// بيعمل 3 حاجات بالترتيب:
//   1) بيدوّر على Swagger / Help page — دي بتديك قايمة الـ routes الحقيقية
//      من السيرفر نفسه، فمفيش تخمين خالص.
//   2) لو ملقاش، بيجرب كل تركيبات (prefix × controller × action).
//   3) بيفرّق بين 404 (المسار مش موجود) و401 (موجود بس الصلاحية ناقصة)
//      — الفرق ده هو اللي بيقولنا المشكلة فين بالظبط.
//
// كله GET — مفيش أي شحنة بتتعمل.
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
if (!fs.existsSync(envPath)) { console.error("❌ مفيش ملف .env.local"); process.exit(1); }
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const base = (env.MYLERZ_API_BASE_URL || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");
if (!base) { console.error("❌ MYLERZ_API_BASE_URL فاضي"); process.exit(1); }

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
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error("مفيش access_token");
  return data.access_token;
}

async function hit(url, token) {
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" },
    });
    const txt = await res.text();
    return { status: res.status, body: txt, ct: res.headers.get("content-type") || "" };
  } catch (e) {
    return { status: 0, body: e.cause?.code || e.message, ct: "" };
  }
}

(async () => {
  console.log("🔗 السيرفر:", base, "\n");
  let token;
  try { token = await login(); console.log("✅ تسجيل الدخول نجح — التوكن سليم\n"); }
  catch (e) { console.error("❌", e.message); process.exit(1); }

  // ---------- 1) Swagger / Help ----------
  console.log("═══ 1) بدوّر على توثيق ذاتي من السيرفر (Swagger / Help) ═══");
  const DOCS = [
    "/swagger/v1/swagger.json", "/swagger/docs/v1", "/swagger/v1/swagger.yaml",
    "/swagger", "/swagger/index.html", "/swagger/ui/index",
    "/Help", "/help", "/api/Help", "/Help/Api",
    "/$metadata", "/api/$metadata", "/openapi.json", "/api-docs",
  ];
  let found = null;
  for (const d of DOCS) {
    const r = await hit(base + d, token);
    if (r.status === 200 && r.body.length > 40) {
      console.log(`   ✅ ${d}  →  200 (${r.ct.split(";")[0]}, ${r.body.length} حرف)`);
      if (!found) found = { path: d, ...r };
    } else if (r.status !== 404 && r.status !== 0) {
      console.log(`   •  ${d}  →  ${r.status}`);
    }
  }

  if (found) {
    console.log(`\n🎉 لقيت توثيق على: ${base}${found.path}`);
    // نحاول نطلّع الـ routes من الـ swagger json
    try {
      const j = JSON.parse(found.body);
      const paths = Object.keys(j.paths || {});
      if (paths.length) {
        console.log(`\n📋 المسارات الحقيقية (${paths.length}):`);
        paths.forEach((p) => {
          const methods = Object.keys(j.paths[p]).join(",").toUpperCase();
          console.log(`   ${methods.padEnd(12)} ${p}`);
        });
        const add = paths.find((p) => /addorder/i.test(p));
        const wh = paths.find((p) => /warehouse/i.test(p));
        console.log("");
        if (add) console.log(`👉 إنشاء الشحنة: ${add}`);
        if (wh) console.log(`👉 المخازن:      ${wh}`);
        return;
      }
    } catch {
      // مش JSON — يبقى صفحة HTML، نطلّع منها أي مسارات ظاهرة
      const hits = [...new Set((found.body.match(/\/api\/[A-Za-z0-9_\/{}-]+/g) || []))];
      if (hits.length) {
        console.log("\n📋 مسارات ظهرت في الصفحة:");
        hits.slice(0, 60).forEach((h) => console.log("   " + h));
        return;
      }
      console.log("   (صفحة HTML من غير مسارات واضحة — افتحها بنفسك في المتصفح)");
    }
  } else {
    console.log("   مفيش توثيق ذاتي متاح.\n");
  }

  // ---------- 2) تجريب التركيبات ----------
  console.log("═══ 2) بجرب تركيبات الـ controller / action ═══");
  const PREFIXES = ["/api", "", "/api/v1", "/v1/api", "/MylerzIntegration/api", "/MylerzIntegrationStaging/api"];
  const COMBOS = [
    ["Orders", "GetWarehouses"], ["Order", "GetWarehouses"],
    ["Orders", "Warehouses"],    ["Warehouse", "GetAll"],
    ["Warehouses", ""],          ["Merchant", "GetWarehouses"],
    ["Packages", "GetCityZoneList"], ["Package", "GetCityZoneList"],
    ["Packages", "CityZoneList"],    ["Lookup", "GetCityZoneList"],
    ["Lookups", "CityZone"],         ["City", "GetAll"],
  ];

  const notFound = [];
  const interesting = [];
  for (const pre of PREFIXES) {
    for (const [ctrl, act] of COMBOS) {
      const url = `${base}${pre}/${ctrl}${act ? "/" + act : ""}`;
      const r = await hit(url, token);
      if (r.status === 404 || r.status === 0) { notFound.push(url); continue; }
      interesting.push({ url, ...r });
      const flag = r.status === 200 ? "✅" : r.status === 401 || r.status === 403 ? "🔒" : "•";
      console.log(`   ${flag} ${r.status}  ${url}`);
      if (r.status === 200) console.log(`        ${r.body.slice(0, 160).replace(/\s+/g, " ")}`);
    }
  }

  console.log(`\n   (${notFound.length} تركيبة رجّعت 404 — متسكتش عليها)`);

  // ---------- 3) الخلاصة ----------
  console.log("\n═══ 3) الخلاصة ═══");
  const ok = interesting.filter((x) => x.status === 200);
  const authed = interesting.filter((x) => x.status === 401 || x.status === 403);

  if (ok.length) {
    console.log("🎯 في مسارات شغّالة فعلاً:");
    ok.forEach((x) => console.log("   " + x.url));
    console.log("\n   خد الـ prefix من اللينك ده وحطه في MYLERZ_API_PREFIX");
  } else if (authed.length) {
    console.log("🔒 المسارات موجودة بس الحساب مالوش صلاحية عليها (401/403).");
    console.log("   يعني الـ API شغّال والمسار صح — ناقص بس تفعيل صلاحية على اليوزر.");
    authed.forEach((x) => console.log("   " + x.url));
  } else {
    console.log("كل التركيبات 404. الرد بتاع السيرفر شكله ASP.NET Web API،");
    console.log("يعني السيرفر موجود وشغّال بس مفيش controller بالأسماء دي عليه.");
    console.log("\nالمفروض تطلب من مايلرز حاجة واحدة بس:");
    console.log("  «ابعتلي الـ base URL الكامل لبيئة الـ test + مثال واحد لـ AddOrders»");
    console.log("لأن التوثيق اللي معاك (v1.3) بيشاور على سيرفر قديم:");
    console.log("  http://41.33.122.61:8888/MylerzIntegrationStaging/api");
    console.log("والسيرفر الجديد test.egypt.api.mylerz.com شكله بترتيب مسارات مختلف.");
  }
})();
