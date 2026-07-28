// ============================================================
// تجربة الاتصال بمايلرز — شغّله من فولدر المشروع بالأمر:
//   node scripts/testMylerz.js
// بيقرأ MYLERZ_API_BASE_URL واليوزر والباسورد من .env.local
// وبيحاول يسجل دخول بس (مش بيعمل أي شحنة) — عشان تتأكد إن البيانات صح.
// ============================================================

// الأنتي فيروس (Kaspersky/ESET/Avast...) بيعترض HTTPS وبيسبب خطأ
// UNABLE_TO_VERIFY_LEAF_SIGNATURE — بنعيد التشغيل بشهادات ويندوز
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

// قراءة .env.local يدوياً
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ مفيش ملف .env.local — اعمله الأول");
  process.exit(1);
}
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const base = (env.MYLERZ_API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

if (!base) {
  console.error("❌ MYLERZ_API_BASE_URL فاضي في .env.local");
  console.error("   انسخ اللينك من إيميل مايلرز: كليك يمين على 'Mylerz Integration API' → Copy link");
  process.exit(1);
}
if (!env.MYLERZ_USERNAME || !env.MYLERZ_PASSWORD) {
  console.error("❌ MYLERZ_USERNAME أو MYLERZ_PASSWORD فاضيين في .env.local");
  process.exit(1);
}

console.log("🔄 بجرب أسجل دخول على:", base);

const body = new URLSearchParams({
  grant_type: "password",
  username: env.MYLERZ_USERNAME,
  password: env.MYLERZ_PASSWORD,
});

fetch(`${base}/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: body.toString(),
})
  .then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      console.error(`❌ فشل تسجيل الدخول (${res.status}):`, text.slice(0, 300));
      console.error("   اتأكد إن اللينك واليوزر والباسورد صح — أو اسأل مايلرز");
      process.exit(1);
    }
    let data;
    try { data = JSON.parse(text); } catch {
      console.error("❌ الرد مش JSON — غالباً اللينك ده مش لينك الـ API:", text.slice(0, 200));
      process.exit(1);
    }
    if (data.access_token) {
      console.log("✅ تمام! تسجيل الدخول نجح — اليوزر:", data.userName || env.MYLERZ_USERNAME);
      console.log("   التوكن صالح لمدة:", Math.round((data.expires_in || 0) / 86400), "يوم");
      console.log("   دلوقتي غيّر MYLERZ_ENABLED=true واعمل أوردر تجربة من الموقع 🎉");
    } else {
      console.error("❌ مفيش access_token في الرد:", text.slice(0, 200));
    }
  })
  .catch((e) => {
    console.error("❌ معرفش أوصل للسيرفر:", e.cause?.code || e.message);
    console.error("   اتأكد من اللينك ومن اتصال النت");
    process.exit(1);
  });
