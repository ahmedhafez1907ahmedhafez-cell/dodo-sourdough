// ============================================================
// سكريبت تحميل المنتجات القديمة دفعة واحدة — يشتغل مرة واحدة بس
// ============================================================
// طريقة التشغيل من مجلد المشروع:
//   node scripts/seedProducts.js
//   (أو: npm run seed:products)
//
// لو ظهر خطأ "unable to verify the first certificate" — غالباً الأنتي فيروس
// (Kaspersky/ESET/Avast...) بيعترض HTTPS. السكريبت بيعيد تشغيل نفسه تلقائياً
// بـ --use-system-ca عشان يستخدم شهادات ويندوز. لو فشل، شغّل يدوياً:
//   node --use-system-ca scripts/seedProducts.js
//
// السكريبت بيقرا .env.local بنفسه (من غير ما تحتاج تثبت أي حاجة إضافية)،
// وبيحط كل الـ 25 منتج القديمة (14 خبز + 11 أدوات) في قاعدة البيانات
// من غير صور (هتظهر بإيموجي مؤقتاً). بعد كده روح /admin/products وعدّل
// كل منتج تحب تحطله صورة حقيقية (زرار ✏️ جنب كل منتج في القايمة).
//
// ⚠️ لو شغلته أكتر من مرة هيضيف نسخ مكررة من المنتجات — شغله مرة واحدة بس.
// ============================================================

// Node 22+ بيستخدم شهاداته المدمجة مش شهادات ويندوز — الأنتي فيروس بيحط CA
// في ويندوز بس، فـ --use-system-ca بيحل "unable to verify the first certificate".
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

function loadEnvLocal() {
  const candidates = [
    path.join(__dirname, "..", ".env.local"),
    path.join(process.cwd(), ".env.local"),
  ];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) {
    console.error("❌ مش لاقي ملف .env.local. دورت في الأماكن دي:");
    candidates.forEach((p) => console.error("   - " + p));
    console.error("تأكد إن اسم الملف بالظبط \".env.local\" (مش \".env.local.txt\") وإنك شغّل الأمر من جوه مجلد dodo-admin-app.");
    process.exit(1);
  }
  console.log("📄 لقيت .env.local هنا:", envPath);
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
    console.error("❌ لقيت الملف بس مش لاقي فيه FIREBASE_ADMIN_PROJECT_ID — افتحه وتأكد القيم متملية صح.");
    process.exit(1);
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
// نفس الإصلاح المستخدم في lib/firebaseAdmin.js — من غيره الكتابة بتفشل بمشكلة
// الشهادة حتى لو الأنتي فيروس مقفول أو استخدمت --use-system-ca، لأن الاتصال
// الافتراضي (gRPC) عنده نظام شهادات منفصل عن Node مش بيستخدم أي من الحلين دول.
db.settings({ preferRest: true });

const now = new Date().toISOString();
const common = { mainImg: "", secondImg: "", video: "", hasExtras: false, active: true, createdAt: now };

const breadProducts = [
  { name: "Dates Sourdough", nameAr: "ساوردو بالبلح والسمسم", price: 280, category: "stuffed", tag: "Healthy", description: "خبز الساوردو المميز محشي بقطع البلح (العجوة) الطبيعية الغنية بالطاقة", emoji: "🌴", isNew: true, isBestseller: false },
  { name: "Mozzarella & Olives", nameAr: "موزاريلا وزيتون — أبيض", price: 350, category: "stuffed", tag: "Savory", description: "رغيف ساوردو أبيض محشو بالموزاريلا والزيتون", emoji: "🧀", isNew: false, isBestseller: true },
  { name: "Cheddar & Jalapeño", nameAr: "شيدر وجالابينو", price: 300, category: "stuffed", tag: "Savory", description: "رغيف ساوردو محشو بالشيدر والجالابينو", emoji: "🌶️", isNew: false, isBestseller: false },
  { name: "Cheddar & Olives (White)", nameAr: "شيدر وزيتون — أبيض", price: 300, category: "stuffed", tag: "Savory", description: "رغيف ساوردو أبيض محشو بالشيدر والزيتون", emoji: "🫒", isNew: false, isBestseller: true },
  { name: "Cheddar & Olives (Whole Wheat)", nameAr: "شيدر وزيتون — قمح كامل", price: 340, category: "stuffed", tag: "Savory", description: "رغيف ساوردو قمح كامل محشو بالشيدر والزيتون", emoji: "🌾", isNew: false, isBestseller: false },
  { name: "Cheddar & Olives + Pumpkin Seeds", nameAr: "شيدر وزيتون مع بذور يقطين", price: 360, category: "stuffed", tag: "⭐ Special", description: "رغيف ساوردو محشو بالشيدر والزيتون مع بذور يقطين", emoji: "🎃", isNew: true, isBestseller: true },
  { name: "Plain White", nameAr: "ساوردو أبيض سادة", price: 200, category: "plain", tag: "Plain", description: "رغيف ساوردو أبيض سادة، قشرة مقرمشة ومركز هش", emoji: "🍞", isNew: false, isBestseller: true },
  { name: "Whole Wheat Plain", nameAr: "قمح كامل سادة", price: 240, category: "plain", tag: "Plain", description: "رغيف ساوردو قمح كامل سادة — صحي ومغذي", emoji: "🌾", isNew: false, isBestseller: false },
  { name: "Whole Wheat + Seeds", nameAr: "قمح كامل مع بذور", price: 300, category: "plain", tag: "Seeds", description: "رغيف ساوردو قمح كامل مع بذور", emoji: "🌾", isNew: false, isBestseller: false },
  { name: "White Slice", nameAr: "شريحة أبيض سادة", price: 20, category: "slices", tag: "شرائح", description: "شريحة من رغيف أبيض سادة", emoji: "🍞", isNew: false, isBestseller: false },
  { name: "Whole Wheat Slice", nameAr: "شريحة قمح كامل", price: 25, category: "slices", tag: "شرائح", description: "شريحة من رغيف قمح كامل سادة", emoji: "🌾", isNew: false, isBestseller: false },
  { name: "Stuffed Slice", nameAr: "شريحة محشي", price: 30, category: "slices", tag: "شرائح", description: "شريحة من أي رغيف محشي", emoji: "🧀", isNew: false, isBestseller: false },
  { name: "Chocolate Sourdough", nameAr: "ساوردو شوكولاته", price: 300, category: "stuffed", tag: "New", description: "خبز الساوردو الغني بقطع الشوكولاتة الفاخرة", emoji: "🍫", isNew: true, isBestseller: false },
].map((p) => ({ ...p, catalog: "bread", localOnly: true, isStarter: false, pricePerGram: 0, ...common }));

// الخميرة (تتباع بالجرام) — نفس معاملة الخبز محلياً في بنها
const starterProducts = [
  { name: "Sourdough Starter (Fresh)", nameAr: "خميرة ساوردو طازجة", pricePerGram: 3, category: "starter", tag: "Starter", description: "خميرة ساوردو طبيعية حية طازجة", emoji: "🌿" },
  { name: "Sourdough Starter (Dried)", nameAr: "خميرة ساوردو مجففة", pricePerGram: 6, category: "starter", tag: "Starter", description: "خميرة ساوردو مجففة — أسهل في التخزين", emoji: "🌱" },
].map((p) => ({ ...p, catalog: "bread", localOnly: true, isStarter: true, price: 0, isNew: false, isBestseller: false, ...common }));

const toolsProducts = [
  { name: "Round Banneton Basket 23", nameAr: "باسكت دائري مقاس 23", price: 730, category: "basket", tag: "🧺 Premium Tools", description: "باسكت دائري لتخمير عجينة الساوردو، مقاس 23 سم، يحافظ على شكل الرغيف", emoji: "🧺", isBestseller: true },
  { name: "Round Banneton Basket 20", nameAr: "باسكت دائري مقاس 20", price: 700, category: "basket", tag: "🧺 Premium Tools", description: "باسكت دائري لتخمير عجينة الساوردو، مقاس 20 سم", emoji: "🧺" },
  { name: "Oval Banneton Basket 25", nameAr: "باسكت بيضاوي مقاس 25", price: 760, category: "basket", tag: "🧺 Premium Tools", description: "باسكت بيضاوي لتخمير عجينة الساوردو، مقاس 25 سم", emoji: "🧺" },
  { name: "Oval Banneton Basket 23", nameAr: "باسكت بيضاوي مقاس 23", price: 730, category: "basket", tag: "🧺 Premium Tools", description: "باسكت بيضاوي لتخمير عجينة الساوردو، مقاس 23 سم", emoji: "🧺" },
  { name: "Gray Proofing Cloth (Oval & Round)", nameAr: "مفرش رمادي — ينفع بيضاوي ومستدير", price: 220, category: "mat", tag: "🌾 For Sourdough Bakers", description: "مفرش تخمير رمادي، مناسب للباسكت البيضاوي والدائري", emoji: "🧵" },
  { name: "Oval Proofing Cloth", nameAr: "مفرش بيضاوي", price: 220, category: "mat", tag: "🌾 For Sourdough Bakers", description: "مفرش تخمير مخصص للباسكت البيضاوي", emoji: "🧵" },
  { name: "Round Proofing Cloth", nameAr: "مفرش دائري", price: 220, category: "mat", tag: "🌾 For Sourdough Bakers", description: "مفرش تخمير مخصص للباسكت الدائري", emoji: "🧵" },
  { name: "Stainless Dough Whisk (Wood Handle)", nameAr: "مضرب عجن ستانلس بيد خشب", price: 260, category: "tool", tag: "🔧 Premium Tools", description: "مضرب عجن ستانلس ستيل بيد خشب لخلط عجينة الساوردو بسهولة", emoji: "🥄" },
  { name: "Flour Duster", nameAr: "بدارة الدقيق", price: 220, category: "tool", tag: "🔧 Premium Tools", description: "بدارة لرش الدقيق بالتساوي على العجينة وسطح العمل", emoji: "🌬️" },
  { name: "Dough Spatula", nameAr: "سباتيولا لتقليب الخميرة", price: 100, category: "tool", tag: "🔧 Premium Tools", description: "سباتيولا مرنة لتقليب وكشط عجينة الخميرة", emoji: "🥢" },
  { name: "Light Roasting Pan (Cast Iron Alternative)", nameAr: "روستنج بان بديل خفيف للكاست أيرون", price: 2300, category: "tool", tag: "⭐ Best Seller", description: "روستنج بان خفيف الوزن كبديل عملي لأواني الكاست أيرون التقليدية، مثالي لخبيز الساوردو", emoji: "🍳", isNew: true, isBestseller: true },
].map((p) => ({
  isNew: false, isBestseller: false, ...p,
  catalog: "tools", localOnly: false, isStarter: false, pricePerGram: 0, ...common,
}));

async function run() {
  const all = [...breadProducts, ...starterProducts, ...toolsProducts];
  console.log(`جاري إضافة ${all.length} منتج...`);
  let ok = 0;
  for (const p of all) {
    try {
      await db.collection("products").add(p);
      ok++;
      console.log(`  ✅ ${p.nameAr}`);
    } catch (e) {
      console.error(`  ❌ ${p.nameAr}:`, e.message);
    }
  }
  console.log(`\nخلصنا! ${ok}/${all.length} منتج اتضافوا.`);
  console.log("روح /admin/products دلوقتي وحط رابط صورة لكل منتج من زرار ✏️.");
  process.exit(0);
}

run();
