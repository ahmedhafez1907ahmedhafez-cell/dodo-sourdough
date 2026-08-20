// ============================================================
// سكريبت لمرة واحدة: بينقل بيانات الشحن القديمة لأسماء الحقول الجديدة
//
//   mylerzTrackingNo  →  shipmentTrackingNo
//   mylerzError       →  shipmentError
//   mylerzCancelled   →  shipmentCancelled
//
// ليه؟ عشان نشيل اسم "مايلرز" من الكود خالص من غير ما نفقد تاريخ
// الأوردرات القديمة من لوحة الأدمن. الأسماء الجديدة عامة، فلو
// غيّرنا شركة الشحن تاني بكرة مش هنعيد التمرين ده.
//
// التشغيل:  node --use-system-ca scripts/migrateShipmentFields.js
// آمن إنك تشغّله أكتر من مرة — بيعدّي على اللي اتنقل خلاص.
// ============================================================

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function main() {
  const snap = await db.collection("orders").get();
  let moved = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const hasOld =
      d.mylerzTrackingNo !== undefined ||
      d.mylerzError !== undefined ||
      d.mylerzCancelled !== undefined ||
      d.mylerzPickupCode !== undefined ||
      d.mylerzService !== undefined;

    if (!hasOld) { skipped++; continue; }

    const patch = {
      mylerzTrackingNo: FieldValue.delete(),
      mylerzError: FieldValue.delete(),
      mylerzCancelled: FieldValue.delete(),
      mylerzPickupCode: FieldValue.delete(),
      mylerzService: FieldValue.delete(),
    };

    // منمسحش قيمة جديدة موجودة بقيمة قديمة
    if (d.mylerzTrackingNo && !d.shipmentTrackingNo) {
      patch.shipmentTrackingNo = d.mylerzTrackingNo;
      patch.shipmentCourier = "mylerz"; // توثيق إن الشحنة دي كانت بمايلرز
    }
    if (d.mylerzError && !d.shipmentError) patch.shipmentError = d.mylerzError;
    if (d.mylerzCancelled !== undefined && d.shipmentCancelled === undefined) {
      patch.shipmentCancelled = d.mylerzCancelled;
    }

    await doc.ref.update(patch);
    moved++;
    console.log(`✔ ${doc.id}`);
  }

  console.log(`\nخلص: اتنقل ${moved} أوردر، ${skipped} مكانش محتاج نقل.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("فشل:", e.message || e);
  process.exit(1);
});
