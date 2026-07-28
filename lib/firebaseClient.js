// إعداد Firebase لجانب المتصفح (Client). القيم دي مش سرّية أصلاً — أمان
// البيانات بيتحدد بقواعد Firestore (firestore.rules) مش بإخفاء المفاتيح دي.
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ملحوظة: مفيش Firebase Storage هنا عمداً — بيطلب خطة الدفع (Blaze) حتى
// لو مش هتستخدم فلوس فعلياً. صور المنتجات بقت روابط عادية (URL) بدل كده،
// شوف pages/admin/products.js.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
