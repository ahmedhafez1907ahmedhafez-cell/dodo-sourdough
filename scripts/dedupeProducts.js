// ============================================================
// سكريبت يمسح المنتجات المكررة (لو شغلت seedProducts.js أكتر من مرة)
// ============================================================
// طريقة التشغيل من مجلد المشروع:
//   node scripts/dedupeProducts.js
//   (أو: npm run dedupe:products)
//
// بيجمع المنتجات اللي ليها نفس الاسم العربي + نفس السعر، ويسيب نسخة
// واحدة بس من كل مجموعة (بيفضّل النسخة اللي ليها صورة حقيقية لو موجودة)،
// ويمسح الباقي. تجربة أمان: بيوريك الخطة الأول وبيستنى تأكيد قبل ما يمسح
// أي حاجة فعلياً.
// ============================================================

if (!process.execArgv.includes("--use-system-ca") && !process.env.DODO_SEED_CA_OK) {
  const { spawnSync } = require("child_process");
  const r = spawnSync(process.execPath, ["--use-system-ca", __filename, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, DODO_SEED_CA_OK: "1" },
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

const fs = require("fs");
const path = require("path");
const readline = require("readline");

function loadEnvLocal() {
  const candidates = [path.join(__dirname, "..", ".env.local"), path.join(process.cwd(), ".env.local")];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) {
    console.error("❌ مش لاقي ملف .env.local.");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
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

const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
});
const db = getFirestore();
db.settings({ preferRest: true });

function scoreProduct(p) {
  // الأعلى سكور = الأحق بالبقاء: عنده صورة حقيقية أفضل من غير صورة
  let score = 0;
  if (p.mainImg) score += 10;
  if (p.secondImg) score += 1;
  if (p.video) score += 1;
  return score;
}

async function main() {
  const snap = await db.collection("products").get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`إجمالي المنتجات الحالية: ${all.length}`);

  const groups = new Map();
  for (const p of all) {
    const key = `${(p.nameAr || "").trim()}|${p.price}|${p.pricePerGram || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const toDelete = [];
  let dupGroups = 0;
  for (const [key, items] of groups) {
    if (items.length <= 1) continue;
    dupGroups++;
    items.sort((a, b) => scoreProduct(b) - scoreProduct(a)); // الأفضل الأول
    const keep = items[0];
    const remove = items.slice(1);
    console.log(`\n🔁 "${keep.nameAr}" — ${items.length} نسخة، هيتفضل ID: ${keep.id}${keep.mainImg ? " (عنده صورة)" : ""}`);
    remove.forEach((p) => toDelete.push(p));
  }

  if (!toDelete.length) {
    console.log("\n✅ مفيش تكرار خالص، كله تمام.");
    process.exit(0);
  }

  console.log(`\n📊 هيتمسح ${toDelete.length} منتج مكرر من ${dupGroups} مجموعة، وهيفضل ${all.length - toDelete.length} منتج.`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) => rl.question("\nمتأكد إنك عايز تمسحهم؟ (اكتب yes وادوس Enter): ", res));
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("❌ اتلغى، مفيش حاجة اتمسحت.");
    process.exit(0);
  }

  let done = 0;
  for (const p of toDelete) {
    await db.collection("products").doc(p.id).delete();
    done++;
    process.stdout.write(`\r🗑️ اتمسح ${done}/${toDelete.length}`);
  }
  console.log(`\n\n✅ خلاص! المنتجات دلوقتي: ${all.length - toDelete.length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ حصل خطأ:", e.message);
  process.exit(1);
});
