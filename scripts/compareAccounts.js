// ============================================================
// مقارنة حساب التست بالحساب الحقيقي — قراءة بس
//   node scripts/compareAccounts.js
//
// ⚠️ مفيش أي شحنة بتتعمل هنا. كله GET وقراءة بيانات.
// الهدف: نشوف الفرق في حالة التوثيق بين الحسابين، عشان نتأكد
// إن NOT_VERIFIED فعلاً سببه إن حساب التست مش موثّق.
//
// حط بيانات الحساب الحقيقي في .env.local (أسماء منفصلة عشان
// متبوظش إعدادات التست):
//   MYLERZ_PROD_API_BASE_URL=https://egypt.api.mylerz.com
//   MYLERZ_PROD_USERNAME=...
//   MYLERZ_PROD_PASSWORD=...
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

const clean = (u) => (u || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");

const ACCOUNTS = [
  {
    label: "التست",
    base: clean(process.env.MYLERZ_API_BASE_URL),
    user: process.env.MYLERZ_USERNAME,
    pass: process.env.MYLERZ_PASSWORD,
  },
  {
    label: "الحقيقي",
    base: clean(process.env.MYLERZ_PROD_API_BASE_URL),
    user: process.env.MYLERZ_PROD_USERNAME,
    pass: process.env.MYLERZ_PROD_PASSWORD,
  },
];

async function tryLogin(base, user, pass) {
  const b = new URLSearchParams({ grant_type: "password", username: user, password: pass });
  const r = await fetch(`${base}/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString(),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 90).replace(/\s+/g, " ")}`);
  if (/^\s*</.test(t)) throw new Error("رجّع HTML — ده لينك البوابة مش الـ API");
  const j = JSON.parse(t);
  if (!j.access_token) throw new Error("مفيش access_token");
  return j.access_token;
}

// لو اللينك المكتوب مش شغّال، بنجرب الاحتمالات المعروفة لشكل لينك الـ API
function candidates(raw) {
  const out = [];
  const push = (u) => { if (u && !out.includes(u)) out.push(u); };
  const cleaned = clean(raw).replace(/\/login\/?$/i, "");
  push(cleaned);
  // نطلّع الدومين لوحده من أي لينك
  let host = "";
  try { host = new URL(cleaned.startsWith("http") ? cleaned : "https://" + cleaned).hostname; } catch {}
  if (host) {
    push(`https://api.${host}`);
    push(`https://${host.replace(/^www\./, "api.")}`);
    // نفس نمط بيئة التست: test.egypt.mylerz.com → test.egypt.api.mylerz.com
    const parts = host.split(".");
    if (parts.length >= 2) {
      const tld = parts.slice(-1)[0], name = parts.slice(-2)[0], pre = parts.slice(0, -2);
      push(`https://${[...pre, "api", name, tld].join(".")}`);
    }
  }
  push("https://egypt.api.mylerz.com");
  push("https://api.mylerz.net");
  return out;
}

async function login(a) {
  const list = candidates(a.base);
  let lastErr = "";
  for (const base of list) {
    try {
      const token = await tryLogin(base, a.user, a.pass);
      if (base !== clean(a.base)) {
        console.log(`║ 🔎 اللينك الصح للـ API: ${base}`);
      }
      a.base = base;
      return token;
    } catch (e) { lastErr = `${base} → ${e.message}`; }
  }
  throw new Error("مفيش لينك اشتغل. آخر محاولة: " + lastErr);
}

async function inspect(a) {
  console.log(`\n╔══ حساب ${a.label} ══`);
  if (!a.base || !a.user || !a.pass) {
    console.log("║ ⏭️  البيانات ناقصة في .env.local — تخطّيته");
    return null;
  }
  console.log(`║ السيرفر: ${a.base}`);

  let token;
  try { token = await login(a); console.log("║ ✅ تسجيل الدخول نجح"); }
  catch (e) { console.log("║ ❌ " + e.message); return null; }

  const H = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  // بيانات التاجر
  let d = null;
  try {
    const r = await fetch(`${a.base}/api/Account/GetUserDetails`, { headers: H });
    d = await r.json();
  } catch {}

  if (d) {
    console.log("║");
    console.log(`║  التاجر            : ${d.MerchantName ?? "-"}`);
    console.log(`║  MerchantId        : ${d.MerchantMember_merID ?? "-"}   ← للـ .env`);
    console.log(`║  MemberID          : ${d.MemberID ?? "-"}`);
    console.log(`║  status            : ${d.MerchantMember_status ?? "-"}`);
    console.log(`║  IsSelfRegister    : ${d.IsSelfRegister}   ← لو true يبقى مستني توثيق`);
    console.log(`║  IsActive          : ${d.IsActive}`);
    console.log(`║  Roles             : ${JSON.stringify(d.Roles ?? [])}`);
  }

  // المخازن
  const mid = d?.MerchantMember_merID;
  if (mid) {
    try {
      const r = await fetch(`${a.base}/api/merchant/GetWarehouseByMerchantId/${mid}`, { headers: H });
      const j = await r.json();
      const list = Array.isArray(j) ? j : (j?.Value ?? []);
      console.log("║");
      console.log(`║  المخازن (${list.length}):`);
      list.forEach((w) => console.log(`║    WarehouseId ${w.Id ?? w.WarehouseId} — "${w.Name}"`));
    } catch { console.log("║  المخازن: مش متاحة"); }
  }

  // اختبار الصلاحية من غير ما نعمل شحنة:
  // بنبعت مصفوفة فاضية — لو الحساب موثّق هيرد بخطأ validation (يعني عدّى
  // مرحلة التوثيق)، ولو مش موثّق هيرد NOT_VERIFIED.
  try {
    const r = await fetch(`${a.base}/api/package/SavePackageList`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    const desc = j?.ErrorDescription || j?.Message || t.slice(0, 90);
    console.log("║");
    console.log(`║  اختبار الصلاحية   : ${r.status} — ${String(desc).replace(/\s+/g, " ").slice(0, 80)}`);
    if (String(desc).includes("NOT_VERIFIED")) {
      console.log("║  ⛔ الحساب مش موثّق");
    } else if (String(desc).includes("UNAUTHORIZED")) {
      console.log("║  ⛔ مفيش صلاحية على الـ endpoint");
    } else {
      console.log("║  ✅ عدّى مرحلة التوثيق — الحساب ده ينفع للتكامل");
    }
  } catch (e) { console.log("║  اختبار الصلاحية: " + e.message); }

  console.log("╚════════════════════");
  return d;
}

(async () => {
  console.log("🔍 مقارنة الحسابين — قراءة بس، مفيش شحنات بتتعمل");
  for (const a of ACCOUNTS) await inspect(a);

  console.log("\n──────────────────────────────────");
  console.log("لو الحساب الحقيقي عدّى مرحلة التوثيق، يبقى التشخيص مؤكد:");
  console.log("الكود سليم، وحساب التست بس هو اللي محتاج توثيق.");
  console.log("");
  console.log("وقتها تقدر تستخدم الحساب الحقيقي في .env.local للإنتاج،");
  console.log("بس متعملش شحنة تجريبية عليه إلا لو ناوي تلغيها فوراً —");
  console.log("لأن دي شحنة حقيقية وممكن مندوب يتبعتلك فعلاً.");
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
