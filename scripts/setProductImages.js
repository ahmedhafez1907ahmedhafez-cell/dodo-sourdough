// ============================================================
// ربط صور المنتجات القديمة بالمنتجات في قاعدة البيانات — تشغيل:
//   node scripts/setProductImages.js
//   (أو: npm run set:images)
//
// السكريبت بيدور على كل منتج بالاسم العربي وبيحطله صوره من فولدر public
// (نفس أسامي الصور من الموقع القديم). آمن تشغله أكتر من مرة — بيحدّث بس
// الصور اللي ملفاتها موجودة فعلاً في public، ولو صورة لسه متنقلتش
// بيقولك اسمها عشان تضيفها وتشغله تاني.
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

// خريطة: الاسم العربي للمنتج ← صوره (نفس أسامي ملفات الموقع القديم)
const IMAGE_MAP = {
  "ساوردو بالبلح والسمسم":            { main: "dates-img1.jpg",     second: "dates-img2.jpg",     video: "dates.mp4" },
  "موزاريلا وزيتون — أبيض":           { main: "mozz-olives.jpg",    second: "mozz-olives2.jpg" },
  "شيدر وجالابينو":                   { main: "cheddar-jal.jpg",    second: "cheddar-jal2.png" },
  "شيدر وزيتون — أبيض":               { main: "cheddar-olives.jpg", second: "cheddar-olives2.jpg", video: "cheddar.mp4" },
  "شيدر وزيتون — قمح كامل":           { main: "cheddar-ww.jpg",     second: "cheddar-ww2.jpg" },
  "شيدر وزيتون مع بذور يقطين":        { main: "cheddar-seeds.jpg",  second: "cheddar-seeds2.jpg" },
  "ساوردو أبيض سادة":                 { main: "plain-white.jpg",    second: "plain-white2.jpg" },
  "قمح كامل سادة":                    { main: "ww-plain.jpg",       second: "ww-slices.jpg" },
  "قمح كامل مع بذور":                 { main: "seeds-ww.jpg",       second: "seeds-ww2.jpg" },
  "شريحة أبيض سادة":                  { main: "plain-white2.jpg",   second: "plain-white3.jpg" },
  "شريحة قمح كامل":                   { main: "ww-slices.jpg",      second: "ww-slices2.png" },
  "شريحة محشي":                       { main: "stuffed-slice.jpg",  second: "stuffed-slice2.jpg" },
  "خميرة ساوردو طازجة":               { main: "starter.jpg" },
  "خميرة ساوردو مجففة":               { main: "dried-starter.jpg",  video: "23.mp4" },
  "ساوردو شوكولاته":                  { main: "chocolate-img1.jpg", second: "chocolate-img3.jpg", video: "chocolate-video.mp4" },
  "باسكت دائري مقاس 23":              { main: "basket-round-23.jpg" },
  "باسكت دائري مقاس 20":              { main: "basket-round-20.jpg" },
  "باسكت بيضاوي مقاس 25":             { main: "basket-oval-25.jpg" },
  "باسكت بيضاوي مقاس 23":             { main: "basket-oval-23.jpg" },
  "مفرش رمادي — ينفع بيضاوي ومستدير": { main: "mat-gray.jpg" },
  "مفرش بيضاوي":                      { main: "mat-oval.jpg" },
  "مفرش دائري":                       { main: "mat-round.jpg" },
  "مضرب عجن ستانلس بيد خشب":          { main: "dough-whisk.jpg" },
  "بدارة الدقيق":                     { main: "flour-duster.jpg" },
  "سباتيولا لتقليب الخميرة":          { main: "dough-spatula.jpg" },
  "روستنج بان بديل خفيف للكاست أيرون": { main: "roasting-pan.jpg" },
};

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const inPublic = (f) => f && fs.existsSync(path.join(PUBLIC_DIR, f));

(async () => {
  const snap = await db.collection("products").get();
  const missingFiles = new Set();
  let updated = 0, noMap = [];

  for (const doc of snap.docs) {
    const p = doc.data();
    const map = IMAGE_MAP[(p.nameAr || "").trim()];
    if (!map) { noMap.push(p.nameAr); continue; }

    const update = {};
    if (map.main) inPublic(map.main) ? (update.mainImg = "/" + map.main) : missingFiles.add(map.main);
    if (map.second) inPublic(map.second) ? (update.secondImg = "/" + map.second) : missingFiles.add(map.second);
    if (map.video) inPublic(map.video) ? (update.video = "/" + map.video) : missingFiles.add(map.video);

    if (Object.keys(update).length) {
      await doc.ref.update(update);
      updated++;
      console.log(`✅ ${p.nameAr} ← ${Object.values(update).join(" ، ")}`);
    }
  }

  console.log(`\n🎉 اتحدّث ${updated} منتج`);
  if (noMap.length) {
    console.log("\nℹ️ منتجات مش في الخريطة (لو عايزلها صور، ضيفها من الأدمن أو قولي):");
    noMap.forEach((n) => console.log("   - " + n));
  }
  if (missingFiles.size) {
    console.log("\n⚠️ صور لسه مش موجودة في فولدر public — ابعتها/انقلها وشغّل السكريبت تاني:");
    [...missingFiles].forEach((f) => console.log("   - " + f));
  }
  process.exit(0);
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
