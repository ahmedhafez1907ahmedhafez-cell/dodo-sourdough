import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../lib/firebaseClient";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";

// ============================================================
// حسابات العملاء بقت على Firebase Auth (زي الأدمن بالظبط).
//
// قبل كده كانت في localStorage والباسورد نص صريح — يعني أي حد يفتح
// DevTools يشوف باسوردات كل اللي دخلوا على نفس الجهاز. دلوقتي الباسورد
// متشفّر على سيرفرات Google ومبيوصلش للمتصفح أصلاً.
//
// إيميل التفعيل بيتبعت من Firebase نفسه — مجاني ومش محتاج دومين خاص.
//
// المفضلة وسجل الطلبات لسه في localStorage (مربوطين بإيميل المستخدم)،
// وده كفاية لأنهم مش بيانات حساسة.
// ============================================================

const ShopContext = createContext(null);

function safeParse(json, fallback) {
  if (json === null || json === undefined) return fallback;
  try {
    const v = JSON.parse(json);
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

export function ShopProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [lightbox, setLightbox] = useState({ open: false, images: [], idx: 0 });
  const [favsTick, setFavsTick] = useState(0);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // ---- كود الدخول اللي بيتبعت على الإيميل ----
  // بين خطوة الباسورد وخطوة الكود، Firebase بيكون سجّل الدخول لحظياً عشان
  // نتأكد من الباسورد وناخد الـ idToken. الـ ref ده بيمنع الواجهة إنها
  // تعتبره داخل في اللحظة دي — العميل ميتحسبش داخل غير بعد الكود.
  const otpPendingRef = useRef(false);
  const [pendingLogin, setPendingLogin] = useState(null); // {uid, email, to, idToken}

  useEffect(() => {
    const parsedCart = safeParse(localStorage.getItem("ds_cart"), []);
    setCart(Array.isArray(parsedCart) ? parsedCart : []);

    // Firebase هو مصدر الحقيقة لحالة الدخول — بيفضل شغال حتى بعد
    // ما تقفل المتصفح وتفتحه تاني
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      // في نص خطوة الكود — متعتبروش داخل لسه
      if (otpPendingRef.current) { setReady(true); return; }
      if (fbUser) {
        setUser({
          email: fbUser.email,
          name: fbUser.displayName || "صاحب الذوق",
          avatar: localStorage.getItem("ds_avatar_" + fbUser.email) || "",
          emailVerified: fbUser.emailVerified,
          uid: fbUser.uid,
        });
      } else {
        setUser(null);
      }
      setReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => { if (ready) localStorage.setItem("ds_cart", JSON.stringify(cart)); }, [cart, ready]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  }

  function addToCart(item) {
    setCart((c) => {
      if (item.isStarter) return [...c, item];
      const ei = c.findIndex(
        (it) => it.id === item.id && !it.isStarter && JSON.stringify(it.extras || []) === JSON.stringify(item.extras || [])
      );
      if (ei > -1) {
        const copy = [...c];
        copy[ei] = { ...copy[ei], qty: copy[ei].qty + item.qty, totalPrice: copy[ei].unitPrice * (copy[ei].qty + item.qty) };
        return copy;
      }
      return [...c, item];
    });
    const fab = document.getElementById("cartFab");
    if (fab) { fab.classList.remove("flash"); void fab.offsetWidth; fab.classList.add("flash"); }
    showToast(`تم إضافة "${item.nameAr}" للسلة`);
  }
  function removeFromCart(idx) { setCart((c) => c.filter((_, i) => i !== idx)); }
  function changeQty(idx, d) {
    setCart((c) => {
      const copy = [...c];
      const it = copy[idx];
      if (!it || it.isStarter) return c;
      const qty = it.qty + d;
      if (qty <= 0) return copy.filter((_, i) => i !== idx);
      copy[idx] = { ...it, qty, totalPrice: it.unitPrice * qty };
      return copy;
    });
  }
  function clearCart() { setCart([]); }

  function openLightbox(images, idx = 0) { setLightbox({ open: true, images, idx }); }
  function closeLightbox() { setLightbox((l) => ({ ...l, open: false })); }
  function lbNext() { setLightbox((l) => ({ ...l, idx: (l.idx + 1) % l.images.length })); }
  function lbPrev() { setLightbox((l) => ({ ...l, idx: (l.idx - 1 + l.images.length) % l.images.length })); }
  function lbGo(i) { setLightbox((l) => ({ ...l, idx: i })); }

  // ---------- الحسابات: Firebase Auth ----------
  // رسائل Firebase إنجليزي وتقنية — بنترجمها لكلام مفهوم
  function friendlyAuthError(code) {
    const map = {
      "auth/email-already-in-use": "الإيميل ده مسجل قبل كده — سجل دخول بدل ما تعمل حساب",
      "auth/invalid-email": "الإيميل مش مظبوط",
      "auth/weak-password": "كلمة السر ضعيفة — خليها 8 حروف على الأقل",
      "auth/user-not-found": "مفيش حساب بالإيميل ده",
      "auth/wrong-password": "كلمة السر غلط",
      "auth/invalid-credential": "الإيميل أو كلمة السر غلط",
      "auth/too-many-requests": "حاولت كتير — استنى شوية وجرب تاني",
      "auth/network-request-failed": "مفيش نت — اتأكد من الاتصال",
      "auth/operation-not-allowed": "تسجيل الدخول بالإيميل مش مفعّل في Firebase",
    };
    return map[code] || "حصل خطأ، جرب تاني";
  }

  async function register(email, pass, name) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await fbUpdateProfile(cred.user, { displayName: name });
      // إيميل التفعيل — بيتبعت من Firebase ببلاش
      sendEmailVerification(cred.user).catch(() => {});
      setUser({
        email: cred.user.email, name, avatar: "",
        emailVerified: false, uid: cred.user.uid,
      });
      return { ok: true };
    } catch (e) {
      throw new Error(friendlyAuthError(e.code));
    }
  }

  // ---------- تسجيل الدخول على خطوتين ----------
  // 1) الإيميل + الباسورد → بنبعت كود على الإيميل
  // 2) الكود → بيدخل فعلاً
  //
  // بنسجّل الدخول لحظياً في الخطوة الأولى عشان ده الطريقة الوحيدة اللي
  // Firebase بيتأكد بيها من الباسورد، وبناخد منها idToken بيثبت للسيرفر
  // إن الباسورد صح — وبعدين بنخرج فوراً لحد ما الكود يتأكد.
  async function login(email, pass) {
    otpPendingRef.current = true;
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (e) {
      otpPendingRef.current = false;
      throw new Error(friendlyAuthError(e.code));
    }

    try {
      const idToken = await cred.user.getIdToken();
      const uid = cred.user.uid;

      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));

      // حساب أدمن — بيدخل من غير كود
      if (res.ok && data.adminSkip) {
        otpPendingRef.current = false;
        setUser({
          email: cred.user.email,
          name: cred.user.displayName || "صاحب الذوق",
          avatar: localStorage.getItem("ds_avatar_" + cred.user.email) || "",
          emailVerified: cred.user.emailVerified,
          uid,
        });
        return { ok: true };
      }

      if (!res.ok) throw new Error(data.error || "مقدرناش نبعت الكود، جرب تاني");

      // بنخرج لحد ما الكود يتأكد
      await signOut(auth).catch(() => {});
      setPendingLogin({ uid, email: cred.user.email, to: data.to, idToken });
      return { needsCode: true, to: data.to };
    } catch (e) {
      otpPendingRef.current = false;
      await signOut(auth).catch(() => {});
      setPendingLogin(null);
      throw e;
    }
  }

  /** الخطوة التانية: تأكيد الكود */
  async function verifyLoginCode(code) {
    if (!pendingLogin) throw new Error("ابدأ تسجيل الدخول من الأول");
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: pendingLogin.uid, code: String(code).trim() }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // الكود خلص أو المحاولات خلصت — نرجّعه لأول الطريق
      if (data.expired) { otpPendingRef.current = false; setPendingLogin(null); }
      throw new Error(data.error || "الكود غلط");
    }

    otpPendingRef.current = false;
    try {
      await signInWithCustomToken(auth, data.customToken);
    } catch (e) {
      throw new Error(friendlyAuthError(e.code));
    }
    setPendingLogin(null);
    return { ok: true };
  }

  /** إعادة إرسال الكود — بنستخدم نفس الـ idToken بتاع خطوة الباسورد */
  async function resendLoginCode() {
    if (!pendingLogin) throw new Error("ابدأ تسجيل الدخول من الأول");
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: pendingLogin.idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "مقدرناش نبعت الكود");
    return { ok: true, to: data.to };
  }

  /** رجوع من خطوة الكود لخطوة الباسورد */
  function cancelLoginCode() {
    otpPendingRef.current = false;
    setPendingLogin(null);
    signOut(auth).catch(() => {});
  }

  async function logout() {
    otpPendingRef.current = false;
    setPendingLogin(null);
    try { await signOut(auth); } catch {}
    setUser(null);
  }

  // إعادة إرسال إيميل التفعيل
  async function resendVerification() {
    if (!auth.currentUser) throw new Error("لازم تسجل دخول الأول");
    try {
      await sendEmailVerification(auth.currentUser);
      return { ok: true };
    } catch (e) {
      throw new Error(friendlyAuthError(e.code));
    }
  }

  // نسيت كلمة السر — Firebase بيبعت لينك إعادة التعيين
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true };
    } catch (e) {
      throw new Error(friendlyAuthError(e.code));
    }
  }

  async function updateProfile(patch) {
    if (!user || !auth.currentUser) return;

    // الاسم بيتحفظ في Firebase.
    // الصورة لأ — لأنها base64 وطولها آلاف الحروف، و photoURL بتاع Firebase
    // محدود بـ 2048 حرف وبيرمي خطأ. فبنحفظها محلياً مربوطة بالإيميل.
    if (patch.name !== undefined) {
      try {
        await fbUpdateProfile(auth.currentUser, { displayName: patch.name });
      } catch {}
    }
    if (patch.avatar !== undefined) {
      try {
        localStorage.setItem("ds_avatar_" + user.email, patch.avatar || "");
      } catch {
        showToast("الصورة كبيرة — جرب صورة أصغر");
        return;
      }
    }
    setUser((u) => ({ ...u, ...patch }));
  }

  // ---------- المفضلة وسجل الطلبات ----------
  // تسجيل الدخول متوقف حالياً، فالاتنين متخزنين على الجهاز نفسه من غير
  // ما يكونوا مربوطين بحساب. لما ترجع تفعّل تسجيل الدخول، غيّر المفاتيح
  // دي ترجع "ds_favs_" + user.email زي ما كانت.
  const FAVS_KEY = "ds_favs";
  const ORDERS_KEY = "ds_orders";

  function getFavs() {
    if (typeof window === "undefined") return [];
    return safeParse(localStorage.getItem(FAVS_KEY), []);
  }
  function toggleFav(pid) {
    const favs = getFavs();
    const idx = favs.indexOf(pid);
    const next = idx > -1 ? favs.filter((x) => x !== pid) : [...favs, pid];
    localStorage.setItem(FAVS_KEY, JSON.stringify(next));
    setFavsTick((t) => t + 1); // عشان كروت المنتجات تعيد الرسم
    showToast(idx > -1 ? "اتشال من المفضلة" : "اتضاف للمفضلة");
  }

  function getOrders() {
    if (typeof window === "undefined") return [];
    return safeParse(localStorage.getItem(ORDERS_KEY), []);
  }
  function saveOrderLocally(order) {
    const orders = getOrders();
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 50)));
  }

  function replaceOrderLocally(id, patch) {
    const orders = getOrders().map((o) => o.id === id ? { ...o, ...patch } : o);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 50)));
    return orders;
  }

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.totalPrice, 0), [cart]);

  const value = {
    cart, cartCount, cartTotal, cartOpen, setCartOpen,
    addToCart, removeFromCart, changeQty, clearCart,
    menuOpen, setMenuOpen,
    toast, showToast,
    lightbox, openLightbox, closeLightbox, lbNext, lbPrev, lbGo,
    favsTick,
    user, register, login, logout, updateProfile,
    pendingLogin, verifyLoginCode, resendLoginCode, cancelLoginCode,
    resendVerification, resetPassword,
    getFavs, toggleFav,
    getOrders, saveOrderLocally, replaceOrderLocally,
    ready,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}
