import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useShop } from "../context/ShopContext";
import { getDeliveryFee, getGovernorateFee, GOVERNORATE_NAMES, OTHER_GOVERNORATE } from "../lib/deliveryRates";
import { AREA_NAMES } from "../lib/areaNames";
import { WHATSAPP_NUMBER } from "../lib/contact";

export default function Layout({ children }) {
  const router = useRouter();
  const shop = useShop();
  const [scrollVisible, setScrollVisible] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cart-open", shop.cartOpen);
  }, [shop.cartOpen]);

  const menuLink = (href, label, icon) => (
    <div
      className={"menu-item" + (router.pathname === href ? " active" : "")}
      onClick={() => { shop.setMenuOpen(false); router.push(href); }}
    >
      {icon}
      {label}
    </div>
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <button className={"hamburger" + (shop.menuOpen ? " open" : "")} onClick={() => shop.setMenuOpen((v) => !v)}>
            <span></span><span></span><span></span>
          </button>
          <div className="topbar-logo" onClick={() => router.push("/")}>
            <img src="/logo.png" alt="دودو ساوردو" onError={(e) => (e.currentTarget.style.display = "none")} />
            <span>دودو ساوردو</span>
          </div>
        </div>
        <div className="topbar-right">
          <button className="cart-fab" id="cartFab" onClick={() => shop.setCartOpen(true)}>
            🛒 <span className="cart-count">{shop.cartCount}</span>
          </button>
        </div>
      </div>

      <div className={"side-menu-overlay" + (shop.menuOpen ? " open" : "")} onClick={() => shop.setMenuOpen(false)}></div>
      <div className={"side-menu" + (shop.menuOpen ? " open" : "")}>
        <div className="side-menu-header">
          <span>القائمة</span>
          <button className="side-menu-close" onClick={() => shop.setMenuOpen(false)}>✕</button>
        </div>
        {menuLink("/", "الرئيسية", <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>)}
        {menuLink("/reviews", "آراء العملاء", <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>)}
        {menuLink("/content", "المحتوى", <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"/></svg>)}
        <div className="menu-item" onClick={() => setSocialOpen((v) => !v)}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
          صفحاتنا
          <span style={{ marginRight: "auto", fontSize: 12 }}>{socialOpen ? "▾" : "›"}</span>
        </div>
        <div className={"social-submenu" + (socialOpen ? " open" : "")}>
          <a href="https://www.tiktok.com/@dodo.sourdough" target="_blank" rel="noreferrer" className="social-link">🎵 تيك توك</a>
          <a href="https://www.facebook.com/profile.php?id=61574499401410" target="_blank" rel="noreferrer" className="social-link">📘 فيسبوك</a>
          <a href="https://www.instagram.com/dodosourdogh" target="_blank" rel="noreferrer" className="social-link">📸 انستجرام</a>
          <a href="https://www.youtube.com/@DodoSourdough/videos" target="_blank" rel="noreferrer" className="social-link">▶️ يوتيوب</a>
        </div>
        <div className="menu-item-auth" onClick={() => { shop.setMenuOpen(false); router.push(shop.user ? "/profile" : "/auth"); }}>
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>{shop.user ? shop.user.name || "حسابي" : "تسجيل الدخول"}</span>
        </div>
      </div>

      {children}

      <div className="whatsapp-float">
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="whatsapp-btn">
          <svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
        </a>
        <div className="whatsapp-tooltip">واتساب</div>
      </div>
      <button className={"scroll-top" + (scrollVisible ? " visible" : "")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
      <div className={"toast" + (shop.toast ? " show" : "")}>{shop.toast}</div>
      <div className={"cart-overlay" + (shop.cartOpen ? " open" : "")} onClick={() => shop.setCartOpen(false)}></div>

      <CartSidebar />
      <Lightbox />
      <FavPopup />

      <footer>
        <img src="/logo.png" alt="logo" className="footer-logo" onError={(e) => (e.currentTarget.style.display = "none")} />
        <h3>دودو ساوردو</h3>
        <p>Dodo Sourdough — طازج يومياً، مصنوع بعناية</p>
        <hr className="footer-divider" />
        <p className="footer-copy">© 2025 دودو ساوردو — جميع الحقوق محفوظة</p>
      </footer>
    </>
  );
}

function CartSidebar() {
  const shop = useShop();
  const [form, setForm] = useState({ name: "", phone: "", zone: "", area: "", province: "", street: "" });
  const [busy, setBusy] = useState(false);

  const forcedLocal = shop.cart.some((i) => i.localOnly);
  const zone = forcedLocal ? "banha" : form.zone;
  const banhaFee = zone === "banha" ? getDeliveryFee(form.area) : null;
  const govFee = zone === "nationwide" ? getGovernorateFee(form.province) : null;
  const deliveryFee = zone === "banha" ? banhaFee : zone === "nationwide" ? govFee : null;

  async function confirmOrder() {
    if (!form.name.trim()) return shop.showToast("⚠️ من فضلك اكتب اسمك!");
    if (!form.phone.trim()) return shop.showToast("⚠️ من فضلك اكتب رقم هاتفك!");
    if (!zone) return shop.showToast("⚠️ اختار منطقة التوصيل!");
    if (zone === "banha" && !form.area.trim()) return shop.showToast("⚠️ اختار منطقتك في بنها!");
    if (zone === "nationwide" && !form.province.trim()) return shop.showToast("⚠️ اختار المحافظة!");
    if (!form.street.trim()) return shop.showToast("⚠️ من فضلك اكتب الشارع/العنوان بالتفصيل!");
    if (!shop.cart.length) return shop.showToast("⚠️ السلة فاضية!");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          customerPhone: form.phone,
          zone,
          area: zone === "banha" ? form.area : "",
          province: zone === "nationwide" ? form.province : "",
          street: form.street,
          items: shop.cart,
        }),
      });
      const data = await res.json();
      if (!res.ok) { shop.showToast("❌ " + data.error); return; }
      shop.saveOrderLocally({
        id: data.id,
        date: new Date().toLocaleDateString("ar-EG"),
        items: shop.cart.map((i) => i.nameAr + " ×" + i.qty).join("، "),
        total: data.total,
        status: "قيد التحضير",
      });
      shop.clearCart();
      setForm({ name: "", phone: "", zone: "", area: "", province: "", street: "" });
      shop.setCartOpen(false);
      shop.showToast(data.deliveryNote ? "🎉 تم إرسال طلبك! " + data.deliveryNote : "🎉 تم إرسال طلبك! هنتواصل معك قريباً لتأكيد الميعاد");
    } catch (e) {
      shop.showToast("❌ حصل خطأ، جرب تاني");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={"cart-sidebar" + (shop.cartOpen ? " open" : "")}>
      <div className="cart-header">
        <h3>🛒 سلة مشترياتك</h3>
        <button className="cart-close" onClick={() => shop.setCartOpen(false)}>✕</button>
      </div>
      <div className="cart-items">
        {!shop.cart.length && (
          <div className="cart-empty"><div className="empty-icon">🛒</div><p>السلة فاضية دلوقتي</p></div>
        )}
        {shop.cart.map((it, idx) => (
          <div className="cart-item" key={idx}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>{it.emoji}</div>
            <div className="cart-item-info">
              <div className="cart-item-name">{it.name} — {it.nameAr}</div>
              {!!(it.extras && it.extras.length) && (
                <div className="cart-item-extras">إضافات: {it.extras.map((e) => e.name).join("، ")}</div>
              )}
              <div className="cart-item-price">{it.totalPrice} {it.priceNote || "جنيه"}</div>
              {!it.isStarter && (
                <div className="cart-item-qty">
                  <button className="qty-btn" onClick={() => shop.changeQty(idx, -1)}>−</button>
                  <span className="qty-num">{it.qty}</span>
                  <button className="qty-btn" onClick={() => shop.changeQty(idx, 1)}>+</button>
                </div>
              )}
            </div>
            <button className="remove-item" onClick={() => shop.removeFromCart(idx)}>🗑️</button>
          </div>
        ))}
      </div>
      {!!shop.cart.length && (
        <div className="order-form-section">
          <h4>📋 بيانات الطلب</h4>
          <div className="form-group">
            <label>👤 الاسم *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اكتب اسمك" />
          </div>
          <div className="form-group">
            <label>📱 رقم الهاتف *</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>لازم يكون الرقم ده عليه واتساب — بنتواصل بيه لو محتجنا نأكد سعر التوصيل أو تفاصيل الطلب</div>
          </div>

          {forcedLocal && (
            <div className="delivery-estimate" style={{ marginBottom: 11 }}>
              <div className="del-note">🍞 في طلبك منتجات (خبز/خميرة سائلة) بتتوصل لبنها بس، فالتوصيل هيكون بنها.</div>
            </div>
          )}

          {!forcedLocal && (
            <div className="form-group">
              <label>🚚 منطقة التوصيل *</label>
              <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value, area: "", province: "" })}>
                <option value="">اختار منطقة التوصيل...</option>
                <option value="banha">بنها ومحيطها</option>
                <option value="nationwide">محافظة تانية (خارج بنها)</option>
              </select>
            </div>
          )}

          {zone === "banha" && (
            <div className="form-group">
              <label>📍 المنطقة (بنها) *</label>
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                <option value="">اختار منطقتك...</option>
                {AREA_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {form.area && (
                <div className="delivery-estimate">
                  <div className="del-price">🚚 التوصيل لـ <strong>{form.area}</strong>: <strong>{banhaFee} جنيه</strong></div>
                </div>
              )}
            </div>
          )}

          {zone === "nationwide" && (
            <div className="form-group">
              <label>🗺️ المحافظة *</label>
              <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">اختار المحافظة...</option>
                {GOVERNORATE_NAMES.map((g) => <option key={g} value={g}>{g}</option>)}
                <option value={OTHER_GOVERNORATE}>{OTHER_GOVERNORATE}</option>
              </select>
              {form.province && form.province !== OTHER_GOVERNORATE && (
                <div className="delivery-estimate">
                  <div className="del-price">🚚 التوصيل لـ <strong>{form.province}</strong>: <strong>{govFee} جنيه</strong></div>
                </div>
              )}
              {form.province === OTHER_GOVERNORATE && (
                <div className="delivery-estimate">
                  <div className="del-note">هنقولك سعر التوصيل على رقم الهاتف اللي بعته — تأكد إنه معاه واتساب 🙏</div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>🏠 الشارع / تفاصيل العنوان *</label>
            <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="اسم الشارع، رقم العمارة..." />
          </div>
          <div className="cart-total">
            <span className="cart-total-label">الإجمالي:</span>
            <span className="cart-total-price">{shop.cartTotal + (deliveryFee || 0)} جنيه{zone === "nationwide" && form.province === OTHER_GOVERNORATE ? " + توصيل" : ""}</span>
          </div>
          <button className="checkout-btn" disabled={busy} onClick={confirmOrder}>
            {busy ? "جاري الإرسال..." : "✅ تأكيد الطلب"}
          </button>
        </div>
      )}
    </div>
  );
}

function Lightbox() {
  const shop = useShop();
  const { open, images, idx } = shop.lightbox;
  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "ArrowLeft") shop.lbNext();
      if (e.key === "ArrowRight") shop.lbPrev();
      if (e.key === "Escape") shop.closeLightbox();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line

  if (!open) return null;
  return (
    <div className="lightbox open" onClick={(e) => e.target === e.currentTarget && shop.closeLightbox()}>
      <button className="lightbox-close" onClick={shop.closeLightbox}>✕</button>
      <div className="lightbox-img-wrap">
        <img id="lightboxImg" src={images[idx] || ""} alt="" />
      </div>
      {images.length > 1 && (
        <>
          <div className="lightbox-nav">
            <button onClick={shop.lbNext}>‹ السابقة</button>
            <button onClick={shop.lbPrev}>التالية ›</button>
          </div>
          <div className="lightbox-dots">
            {images.map((_, i) => (
              <div key={i} className={"lb-dot" + (i === idx ? " active" : "")} onClick={() => shop.lbGo(i)}></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FavPopup() {
  const shop = useShop();
  const router = useRouter();
  if (!shop.favPopupOpen) return null;
  return (
    <div className="fav-popup open" onClick={(e) => e.target === e.currentTarget && shop.setFavPopupOpen(false)}>
      <div className="fav-popup-box">
        <p>⭐ مش هتعرف تضيف المنتج للمفضلة الا لو كنت عامل تسجيل دخول</p>
        <button className="fav-popup-login" onClick={() => { shop.setFavPopupOpen(false); router.push("/auth"); }}>تسجيل الدخول</button>
        <button className="fav-popup-close" onClick={() => shop.setFavPopupOpen(false)}>إلغاء</button>
      </div>
    </div>
  );
}
