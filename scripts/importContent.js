// ============================================================
// استيراد منشورات السوشيال ميديا لصفحة "المحتوى" — تشغيل:
//   npm run import:content
//
// بيقرأ اللينكات من scripts/content-items.json وبيضيفها في قاعدة البيانات.
// آمن تشغله أكتر من مرة — بيتخطى أي لينك موجود قبل كده (مفيش تكرار).
// شكل الملف:
// [
//   { "platform": "tiktok", "type": "video", "url": "https://...", "caption": "" },
//   ...
// ]
// المنصات: instagram | tiktok | facebook | youtube
// الأنواع:  فيسبوك: post/reel — يوتيوب: short — انستجرام: reel/post — تيك توك: video/photo
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

function loadEnvLocal() {
  const candidates = [path.join(__dirname, "..", ".env.local"), path.join(process.cwd(), ".env.local")];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) { console.error("❌ مش لاقي .env.local"); process.exit(1); }
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();
db.settings({ preferRest: true });

const PLATFORMS = ["instagram", "tiktok", "facebook", "youtube"];
const TYPES = {
  facebook: ["post", "reel"],
  youtube: ["short"],
  instagram: ["reel", "post"],
  tiktok: ["video", "photo"],
};

const itemsPath = path.join(__dirname, "content-items.json");
if (!fs.existsSync(itemsPath)) {
  console.error("❌ مش لاقي scripts/content-items.json");
  process.exit(1);
}
const items = JSON.parse(fs.readFileSync(itemsPath, "utf-8"));

(async () => {
  // اللينكات الموجودة قبل كده — عشان منكررش
  const snap = await db.collection("content").get();
  const existing = new Set(snap.docs.map((d) => (d.data().url || "").split("?")[0].replace(/\/$/, "")));

  let added = 0, skipped = 0, bad = 0;
  for (const it of items) {
    if (!PLATFORMS.includes(it.platform) || !/^https?:\/\//.test(it.url || "")) {
      console.log("⚠️ عنصر مش مفهوم، اتخطى:", JSON.stringify(it).slice(0, 80));
      bad++;
      continue;
    }
    const key = it.url.split("?")[0].replace(/\/$/, "");
    if (existing.has(key)) { skipped++; continue; }

    const allowed = TYPES[it.platform];
    const type = allowed.includes(it.type) ? it.type : allowed[0];
    await db.collection("content").add({
      platform: it.platform,
      type,
      url: it.url,
      caption: it.caption || "",
      createdAt: it.createdAt || new Date().toISOString(),
    });
    existing.add(key);
    added++;
    console.log(`✅ [${it.platform}/${type}] ${it.url.slice(0, 70)}`);
  }
  console.log(`\n🎉 اتضاف ${added} — اتخطى ${skipped} مكرر — ${bad} غلط`);
  process.exit(0);
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
