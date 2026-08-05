import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useShop } from "../context/ShopContext";
import { getGovernorateFee, GOVERNORATE_NAMES, OTHER_GOVERNORATE, BANHA_DELIVERY_NOTE } from "../lib/deliveryRates";
import { AREA_NAMES } from "../lib/areaNames";
import { WHATSAPP_NUMBER } from "../lib/contact";
import { buildOrderWhatsAppUrl } from "../lib/orderMessage";
import { DEPOSIT_WALLET } from "../lib/payment";
import Icon from "./Icon";

export default function Layout({ children }) {
  const router = useRouter();
  const shop = useShop();
  const [socialOpen, setSocialOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("cart-open", shop.cartOpen);
  }, [shop.cartOpen]);

  // ⚠️ لازم <Link> حقيقي مش <div onClick>.
  // جوجل بيمشي على وسوم <a href> بس عشان يكتشف صفحات الموقع — الـ div
  // اللي بيعمل router.push شغال للمستخدم لكن الزاحف مبيشوفهوش، وده كان
  // سبب إن /reviews و /content مش متفهرسين. وكمان بيصلح التنقل بالكيبورد
  // وفتح الصفحة في تاب جديد بزرار الماوس الأوسط.
  const menuLink = (href, label, icon) => (
    <Link
      href={href}
      className={"menu-item" + (router.pathname === href ? " active" : "")}
      onClick={() => shop.setMenuOpen(false)}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <button className={"hamburger" + (shop.menuOpen ? " open" : "")} aria-label="القائمة" onClick={() => shop.setMenuOpen((v) => !v)}>
            <span></span><span></span><span></span>
          </button>
          <div className="topbar-logo" onClick={() => router.push("/")}>
            <img src="/logo.png" alt="دودو ساوردو" onError={(e) => (e.currentTarget.style.display = "none")} />
            <span>دودو ساوردو</span>
          </div>
        </div>
        <div className="topbar-right">
          <button className="cart-fab" id="cartFab" aria-label="سلة المشتريات" onClick={() => shop.setCartOpen(true)}>
            <Icon name="cart" size={18} />
            <span className="cart-count">{shop.cartCount}</span>
          </button>
        </div>
      </div>

      <div className={"side-menu-overlay" + (shop.menuOpen ? " open" : "")} onClick={() => shop.setMenuOpen(false)}></div>
      <div className={"side-menu" + (shop.menuOpen ? " open" : "")}>
        <div className="side-menu-header">
          <span>القائمة</span>
          <button className="side-menu-close" aria-label="إغلاق" onClick={() => shop.setMenuOpen(false)}>
            <Icon name="close" size={19} />
          </button>
        </div>
        {menuLink("/", "الرئيسية", <Icon name="home" size={21} />)}
        {menuLink("/reviews", "آراء العملاء", <Icon name="chat" size={21} />)}
        {menuLink("/content", "المحتوى", <Icon name="clipboard" size={21} />)}
        {menuLink("/profile", "طلباتي", <Icon name="bag" size={21} />)}
        <div
          className="menu-item"
          role="button"
          tabIndex={0}
          aria-expanded={socialOpen}
          onClick={() => setSocialOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSocialOpen((v) => !v); } }}
        >
          <Icon name="sparkle" size={21} />
          صفحاتنا
          <Icon name="chevron" size={15} style={{ marginRight: "auto", transform: socialOpen ? "rotate(90deg)" : "scaleX(-1)" }} />
        </div>
        <div className={"social-submenu" + (socialOpen ? " open" : "")}>
          <a href="https://www.tiktok.com/@dodo.sourdough" target="_blank" rel="noreferrer" className="social-link"><Icon name="music" size={19} /> تيك توك</a>
          <a href="https://www.facebook.com/profile.php?id=61574499401410" target="_blank" rel="noreferrer" className="social-link"><Icon name="facebook" size={19} /> فيسبوك</a>
          <a href="https://www.instagram.com/dodosourdogh" target="_blank" rel="noreferrer" className="social-link"><Icon name="camera" size={19} /> انستجرام</a>
          <a href="https://www.youtube.com/@DodoSourdough/videos" target="_blank" rel="noreferrer" className="social-link"><Icon name="play" size={19} /> يوتيوب</a>
        </div>

      </div>

      {children}

      <div className="whatsapp-float">
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="whatsapp-btn" aria-label="تواصل على واتساب">
          <svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
        </a>
        {/* الزرار ده مش للطلب — الطلب بيتعمل من السلة. بنقول كده صراحة
            عشان محدش يفتكره طريق تاني للطلب وييجي يطلب على واتساب. */}
        <div className="whatsapp-tooltip">
          <strong>محتاج مساعدة؟</strong>
          <span>كلّمنا هنا لو حصلت مشكلة أو في حاجة مستعجلة.<br />أما طلبك، اعمله من الموقع على طول.</span>
        </div>
      </div>
      <div className="assistant-name-label" aria-hidden="true">Dodo's assistant</div>
      <div className={"toast" + (shop.toast ? " show" : "")}>{shop.toast}</div>
      <div className={"cart-overlay" + (shop.cartOpen ? " open" : "")} onClick={() => shop.setCartOpen(false)}></div>

      <CartSidebar />
      <Lightbox />

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

const EMPTY_FORM = { name: "", phone: "", zone: "", area: "", province: "", street: "" };

function CartSidebar() {
  const shop = useShop();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  // بعد ما الأوردر ينجح: لو بنها، بنحتفظ بلينك الواتساب عشان نعرضه
  const [done, setDone] = useState(null);

  const forcedLocal = shop.cart.some((i) => i.localOnly);
  const zone = forcedLocal ? "banha" : form.zone;
  // بنها بنوصّلها بنفسنا وسعرها بيتحدد على واتساب، فمفيش رقم بيتعرض
  const govFee = zone === "nationwide" ? getGovernorateFee(form.province) : null;
  const deliveryFee = zone === "nationwide" ? govFee : null;
  // الحالات اللي سعر التوصيل فيها لسه متحددش
  const feeUnknown = zone === "banha" || (zone === "nationwide" && form.province === OTHER_GOVERNORATE);

  async function confirmOrder() {
    if (!form.name.trim()) return shop.showToast("من فضلك اكتب اسمك");
    if (!form.phone.trim()) return shop.showToast("من فضلك اكتب رقم هاتفك");
    if (!zone) return shop.showToast("اختار منطقة التوصيل");
    if (zone === "banha" && !form.area.trim()) return shop.showToast("اختار منطقتك في بنها");
    if (zone === "nationwide" && !form.province.trim()) return shop.showToast("اختار المحافظة");
    if (!form.street.trim()) return shop.showToast("من فضلك اكتب الشارع/العنوان بالتفصيل");
    if (!shop.cart.length) return shop.showToast("السلة فاضية");
    setBusy(true);

    // بنصوّر السلة قبل ما نفضيها — محتاجينها في رسالة الواتساب
    const snapshot = shop.cart;
    const snapForm = form;

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
      if (!res.ok) { shop.showToast(data.error || "حصل خطأ، جرب تاني"); return; }

      shop.saveOrderLocally({
        id: data.id,
        cancelToken: data.customerCancelToken,
        date: new Date().toLocaleDateString("ar-EG"),
        items: snapshot.map((i) => i.nameAr + " ×" + i.qty).join("، "),
        total: data.total,
        status: data.status,
      });
      shop.clearCart();
      setForm(EMPTY_FORM);
      shop.setCartOpen(false);

      // كل أوردر بيعدي على نفس الشاشة: العربون + واتساب.
      // الأوردر اتسجل عندنا بحالة "في انتظار العربون" ومش هيتشحن
      // غير لما الأدمن يشوف صورة التحويل ويأكّد.
      const url = buildOrderWhatsAppUrl({
        id: data.id,
        name: snapForm.name,
        phone: snapForm.phone,
        zone,
        province: snapForm.province,
        area: snapForm.area,
        street: snapForm.street,
        items: snapshot,
        deliveryFee: data.deliveryFee,
        total: data.total,
        deposit: data.deposit,
      });
      setDone({
        id: data.id,
        url,
        total: data.total,
        deposit: data.deposit,
        remainder: data.remainder,
        wallet: data.depositWallet || DEPOSIT_WALLET,
        note: data.deliveryNote,
      });
    } catch (e) {
      shop.showToast("حصل خطأ، جرب تاني");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {done && <OrderDonePopup done={done} onClose={() => { setDone(null); shop.showToast("الطلب لن يبدأ إلا بعد دفع العربون. حوّل العربون ثم ابعت الإيصال على واتساب."); }} />}

      <div className={"cart-sidebar" + (shop.cartOpen ? " open" : "")}>
        <div className="cart-header">
          <h3><Icon name="cart" size={19} /> سلة مشترياتك</h3>
          <button className="cart-close" aria-label="إغلاق السلة" onClick={() => shop.setCartOpen(false)}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="cart-items">
          {!shop.cart.length && (
            <div className="cart-empty"><div className="empty-icon"><Icon name="bag" size={40} /></div><p>السلة فاضية دلوقتي</p></div>
          )}
          {shop.cart.map((it, idx) => (
            <div className="cart-item" key={idx}>
              <div className="cart-item-thumb">
                {it.img ? <img src={it.img} alt="" /> : <Icon name="bread" size={26} />}
              </div>
              <div className="cart-item-info">
                <div className="cart-item-name">{it.name} — {it.nameAr}</div>
                {!!(it.extras && it.extras.length) && (
                  <div className="cart-item-extras">إضافات: {it.extras.map((e) => e.name).join("، ")}</div>
                )}
                <div className="cart-item-price">{it.totalPrice} {it.priceNote || "جنيه"}</div>
                {!it.isStarter && (
                  <div className="cart-item-qty">
                    <button className="qty-btn" aria-label="ناقص" onClick={() => shop.changeQty(idx, -1)}>−</button>
                    <span className="qty-num">{it.qty}</span>
                    <button className="qty-btn" aria-label="زائد" onClick={() => shop.changeQty(idx, 1)}>+</button>
                  </div>
                )}
              </div>
              <button className="remove-item" aria-label="شيل المنتج" onClick={() => shop.removeFromCart(idx)}>
                <Icon name="trash" size={17} />
              </button>
            </div>
          ))}
        </div>
        {!!shop.cart.length && (
          <div className="order-form-section">
            <h4><Icon name="clipboard" size={17} /> بيانات الطلب</h4>
            <div className="form-group">
              <label><Icon name="user" size={15} className="lbl-ico" />الاسم *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اكتب اسمك" />
            </div>
            <div className="form-group">
              <label><Icon name="phone" size={15} className="lbl-ico" />رقم الهاتف *</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" inputMode="tel" />
              <div className="form-hint">لازم يكون الرقم ده عليه واتساب — بنتواصل بيه لتأكيد الطلب أو سعر التوصيل</div>
            </div>

            {forcedLocal && (
              <div className="delivery-estimate" style={{ marginBottom: 11 }}>
                <div className="del-note">في طلبك منتجات (خبز/خميرة سائلة) بتتوصل لبنها بس، فالتوصيل هيكون بنها.</div>
              </div>
            )}

            {!forcedLocal && (
              <div className="form-group">
                <label><Icon name="truck" size={15} className="lbl-ico" />منطقة التوصيل *</label>
                <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value, area: "", province: "" })}>
                  <option value="">اختار منطقة التوصيل...</option>
                  <option value="banha">بنها ومحيطها</option>
                  <option value="nationwide">محافظة تانية (خارج بنها)</option>
                </select>
              </div>
            )}

            {zone === "banha" && (
              <div className="form-group">
                <label><Icon name="pin" size={15} className="lbl-ico" />المنطقة (بنها) *</label>
                <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                  <option value="">اختار منطقتك...</option>
                  {AREA_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                {form.area && (
                  <div className="delivery-estimate">
                    <div className="del-note">{BANHA_DELIVERY_NOTE} — بنتفق عليه بعد ما تبعتلنا.</div>
                  </div>
                )}
              </div>
            )}

            {zone === "nationwide" && (
              <div className="form-group">
                <label><Icon name="map" size={15} className="lbl-ico" />المحافظة *</label>
                <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                  <option value="">اختار المحافظة...</option>
                  {GOVERNORATE_NAMES.map((g) => <option key={g} value={g}>{g}</option>)}
                  <option value={OTHER_GOVERNORATE}>{OTHER_GOVERNORATE}</option>
                </select>
                {form.province && form.province !== OTHER_GOVERNORATE && (
                  <div className="delivery-estimate">
                    <div className="del-price">التوصيل لـ <strong>{form.province}</strong>: <strong>{govFee} جنيه</strong></div>
                  </div>
                )}
                {form.province === OTHER_GOVERNORATE && (
                  <div className="delivery-estimate">
                    <div className="del-note">هنقولك سعر التوصيل على رقم الهاتف اللي بعته — تأكد إنه معاه واتساب</div>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label><Icon name="home" size={15} className="lbl-ico" />الشارع / تفاصيل العنوان *</label>
              <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="اسم الشارع، رقم العمارة..." />
            </div>
            <div className="cart-total">
              <span className="cart-total-label">الإجمالي:</span>
              <span className="cart-total-price">{shop.cartTotal + (deliveryFee || 0)} جنيه{feeUnknown ? " + توصيل" : ""}</span>
            </div>
            <button className="checkout-btn" disabled={busy} onClick={confirmOrder}>
              {busy ? "جاري الإرسال..." : <><Icon name="check" size={18} /> تأكيد الطلب</>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// شاشة ما بعد الطلب: العربون + التحويل + واتساب.
// الأوردر اتسجل عندنا خلاص، بس مش هيتحضّر ولا يتشحن غير لما
// العربون يوصل ويتأكد من لوحة الأدمن.
function OrderDonePopup({ done, onClose }) {
  const [copied, setCopied] = useState(false);

  function copyWallet() {
    navigator.clipboard?.writeText(done.wallet).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
      () => {}
    );
  }

  return (
    <div className="done-popup open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="done-box">
        <div className="done-icon"><Icon name="checkCircle" size={32} /></div>
        <h3>طلبك اتسجل</h3>
        <p className="done-id">رقم الطلب: <strong>{done.id}</strong></p>

        <div className="dep-box">
          <span className="dep-label">المطلوب دفعه دلوقتي كعربون</span>
          <span className="dep-amount">{done.deposit} <em>جنيه</em></span>
          <span className="dep-rest">
            الإجمالي {done.total} جنيه — الباقي {done.remainder} جنيه بعد ما تستلم
          </span>
        </div>

        <ol className="dep-steps">
          <li>
            حوّل <strong>{done.deposit} جنيه</strong> على الرقم ده
            <button type="button" className="dep-wallet" onClick={copyWallet}>
              <span dir="ltr">{done.wallet}</span>
              <Icon name={copied ? "check" : "clipboard"} size={15} />
            </button>
            <span className="dep-hint">فودافون كاش أو إنستاباي</span>
          </li>
          <li>ابعتلنا <strong>صورة إيصال التحويل</strong> على واتساب من الزرار تحت</li>
          <li>أول ما نشوف التحويل بنأكّد طلبك ونبدأ نحضّره</li>
        </ol>

        {done.note && <p className="done-note">{done.note}</p>}

        <a href={done.url} target="_blank" rel="noreferrer" className="done-wa">
          <Icon name="chat" size={19} /> ابعت صورة التحويل على واتساب
        </a>
        <button className="done-close" onClick={onClose}>أقفل</button>
      </div>
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
      <button className="lightbox-close" aria-label="إغلاق" onClick={shop.closeLightbox}><Icon name="close" size={20} /></button>
      <div className="lightbox-img-wrap">
        <img id="lightboxImg" src={images[idx] || ""} alt="" />
      </div>
      {images.length > 1 && (
        <>
          <div className="lightbox-nav">
            <button onClick={shop.lbNext}>السابقة</button>
            <button onClick={shop.lbPrev}>التالية</button>
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
