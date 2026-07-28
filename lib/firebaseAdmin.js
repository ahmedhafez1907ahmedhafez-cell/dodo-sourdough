// ⚠️ الملف ده يتستورد بس جوه pages/api/** — سيرفر فقط. لو استوردته في صفحة
// عادية أو component، هتسرب مفاتيح سرّية. استخدمه في API routes فقط.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return getApps()[0];
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const app = initAdmin();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

// مهم: Firestore بيستخدم افتراضياً بروتوكول gRPC، وده عنده نظام شهادات SSL
// خاص بيه مش بيحترم NODE_TLS_REJECT_UNAUTHORIZED. لو عندك أنتي فيروس بيعمل
// SSL inspection (زي Kaspersky/ESET) هتقابل خطأ UNABLE_TO_VERIFY_LEAF_SIGNATURE
// حتى لو ظبطت كل حاجة تانية صح. preferRest بيخلي Firestore يستخدم REST
// (HTTP عادي) بدل gRPC فيتفادى المشكلة دي تماماً.
//
// ملحوظة مهمة: في وضع التطوير (npm run dev)، Next.js بيعيد تحميل الملف ده
// كتير بسبب Fast Refresh، وFirestore بيرفض إنك تنادي settings() أكتر من
// مرة واحدة على نفس الاتصال (بيرمي error مش متوقع لو حصل). الـ flag على
// globalThis بيتأكد إنها تتنادى مرة واحدة بس مهما الملف اتحمّل تاني.
if (!globalThis.__dodoFirestoreConfigured) {
  adminDb.settings({ preferRest: true });
  globalThis.__dodoFirestoreConfigured = true;
}

// يتحقق إن الطلب جاي من مستخدم مسجل دخول وإنه أدمن فعلاً — يترفض غير كده.
// بيتنادى في أول أي API route خاص بالأدمن.
export async function requireAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new ApiError(401, "مفيش تسجيل دخول");
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (e) {
    console.error("verifyIdToken failed:", e.code || "", e.message || e);
    throw new ApiError(401, "الجلسة منتهية، سجل دخول تاني (شوف تفاصيل الخطأ في الترمينال)");
  }
  const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
  if (!adminDoc.exists) throw new ApiError(403, "الحساب ده مش أدمن");
  return decoded;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
