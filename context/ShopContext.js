import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

// ============================================================
// ملحوظة مهمة: نظام تسجيل الدخول بتاع العملاء هنا (مش الأدمن) لسه
// بسيط ومحفوظ في localStorage بالمتصفح، زي ما كان بالظبط في الموقع
// القديم — مفيش Firebase Auth هنا. ده قرار متعمّد عشان نفس السلوك
// البسيط اللي كان موجود (مفيش تحقق إيميل، مفيش سيرفر). لو حبيت تحوله
// لحسابات حقيقية Firebase Auth زي الأدمن بالظبط، قولي وهنعمله كخطوة تانية.
// المفضلة وبيانات البروفايل بتتخزن بنفس الطريقة القديمة (لكل إيميل مفتاح خاص).
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
  const [favPopupOpen, setFavPopupOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const parsedCart = safeParse(localStorage.getItem("ds_cart"), []);
    setCart(Array.isArray(parsedCart) ? parsedCart : []);
    setUser(safeParse(localStorage.getItem("ds_current"), null));
    setReady(true);
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
    showToast(`✅ تم إضافة "${item.nameAr}" للسلة!`);
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

  function getUsers() { return safeParse(localStorage.getItem("ds_users"), {}); }
  function saveUsers(u) { localStorage.setItem("ds_users", JSON.stringify(u)); }
  function setCurrentUser(u) { localStorage.setItem("ds_current", JSON.stringify(u)); setUser(u); }

  function register(email, pass, name) {
    const users = getUsers();
    if (users[email]) throw new Error("الإيميل ده مسجل قبل كده");
    users[email] = { pass, name, avatar: "" };
    saveUsers(users);
    setCurrentUser({ email, name, avatar: "" });
  }
  function login(email, pass) {
    const users = getUsers();
    if (!users[email] || users[email].pass !== pass) throw new Error("الإيميل أو كلمة السر غلط");
    setCurrentUser({ email, name: users[email].name, avatar: users[email].avatar || "" });
  }
  function logout() { localStorage.removeItem("ds_current"); setUser(null); }
  function updateProfile(patch) {
    if (!user) return;
    const next = { ...user, ...patch };
    setCurrentUser(next);
    const users = getUsers();
    if (users[user.email]) { users[user.email] = { ...users[user.email], ...patch }; saveUsers(users); }
  }

  function getFavs() {
    if (!user) return [];
    return safeParse(localStorage.getItem("ds_favs_" + user.email), []);
  }
  function toggleFav(pid) {
    if (!user) { setFavPopupOpen(true); return; }
    const favs = getFavs();
    const idx = favs.indexOf(pid);
    const next = idx > -1 ? favs.filter((x) => x !== pid) : [...favs, pid];
    localStorage.setItem("ds_favs_" + user.email, JSON.stringify(next));
    showToast(idx > -1 ? "تم الحذف من المفضلة" : "⭐ تمت الإضافة للمفضلة!");
    setUser((u) => ({ ...u })); // force re-render of consumers
  }

  function getOrders() {
    if (!user) return [];
    return safeParse(localStorage.getItem("ds_orders_" + user.email), []);
  }
  function saveOrderLocally(order) {
    if (!user) return;
    const orders = getOrders();
    orders.unshift(order);
    localStorage.setItem("ds_orders_" + user.email, JSON.stringify(orders));
  }

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.totalPrice, 0), [cart]);

  const value = {
    cart, cartCount, cartTotal, cartOpen, setCartOpen,
    addToCart, removeFromCart, changeQty, clearCart,
    menuOpen, setMenuOpen,
    toast, showToast,
    lightbox, openLightbox, closeLightbox, lbNext, lbPrev, lbGo,
    favPopupOpen, setFavPopupOpen,
    user, register, login, logout, updateProfile,
    getFavs, toggleFav,
    getOrders, saveOrderLocally,
    ready,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}
