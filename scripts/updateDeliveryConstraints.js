// ============================================================
// سكريبت تعديل قيود التوصيل للمنتجات
// ============================================================
// طريقة التشغيل من مجلد المشروع:
//   node scripts/updateDeliveryConstraints.js

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const candidates = [
    path.join(__dirname, "..", ".env.local"),
    path.join(process.cwd(), ".env.local"),
  ];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) {
    console.error("❌ مش لاقي ملف .env.local");
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
    console.error("❌ مش لاقي FIREBASE_ADMIN_PROJECT_ID");
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
db.settings({ preferRest: true });

async function updateDeliveryConstraints() {
  console.log("🔄 جاري تحديث قيود التوصيل للمنتجات...\n");

  const snap = await db.collection("products").get();
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`📦 عدد المنتجات الموجودة: ${products.length}\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    let newLocalOnly;
    let reason;

    // قواعد التوصيل الجديدة:
    // 1. الخميرة المجففة = nationwide (localOnly: false)
    // 2. الخميرة السائلة (طازجة) = بنها فقط (localOnly: true)
    // 3. الساوردو بكل أنواعه = بنها فقط (localOnly: true)
    // 4. الدقيق = كل المحافظات (localOnly: false)
    // 5. الأدوات = كل المحافظات (localOnly: false)

    const nameLower = (product.name || "").toLowerCase();
    const nameArLower = (product.nameAr || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    const catalog = (product.catalog || "").toLowerCase();

    // الدقيق - nationwide (يتحقق أولاً عشان يفوز على الساوردو)
    if (nameLower.includes("flour") || nameArLower.includes("دقيق") || nameArLower.includes("كانجارو") || nameLower.includes("kangaroo")) {
      newLocalOnly = false;
      reason = "دقيق - توصيل nationwide";
    }
    // الخميرة السائلة (طازجة) - بنها فقط
    else if (product.isStarter && (nameLower.includes("fresh") || nameArLower.includes("طازجة") || nameArLower.includes("سائلة"))) {
      newLocalOnly = true;
      reason = "خميرة سائلة (طازجة) - توصيل بنها فقط";
    }
    // الخميرة المجففة - nationwide
    else if (product.isStarter && (nameLower.includes("dried") || nameArLower.includes("مجففة"))) {
      newLocalOnly = false;
      reason = "خميرة مجففة - توصيل nationwide";
    }
    // الساوردو بكل أنواعه - بنها فقط
    else if (catalog === "bread" && !product.isStarter) {
      newLocalOnly = true;
      reason = "ساوردو - توصيل بنها فقط";
    }
    // الأدوات وكل المنتجات الباقية - nationwide
    else {
      newLocalOnly = false;
      reason = "أدوات/منتجات أخرى - توصيل nationwide";
    }

    // تحقق من التعديل المطلوب
    const currentLocalOnly = product.localOnly !== undefined ? product.localOnly : (catalog !== "tools");
    
    if (currentLocalOnly !== newLocalOnly) {
      console.log(`📝 تعديل: ${product.nameAr} (${product.name})`);
      console.log(`   من: localOnly = ${currentLocalOnly}`);
      console.log(`   إلى: localOnly = ${newLocalOnly}`);
      console.log(`   السبب: ${reason}\n`);

      await db.collection("products").doc(product.id).update({ localOnly: newLocalOnly });
      updatedCount++;
    } else {
      console.log(`⏭️  تخطي: ${product.nameAr} (${product.name}) - بالفعل ${newLocalOnly ? "local only" : "nationwide"}`);
      skippedCount++;
    }
  }

  console.log(`\n✅ انتهى التحديث!`);
  console.log(`📊 تم تعديل ${updatedCount} منتج`);
  console.log(`⏭️  تم تخطي ${skippedCount} منتج (لا يحتاج تعديل)`);
  
  process.exit(0);
}

updateDeliveryConstraints().catch(e => {
  console.error("❌ خطأ:", e);
  process.exit(1);
});