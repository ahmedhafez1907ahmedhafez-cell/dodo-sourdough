import { useState } from "react";
import { useShop } from "../context/ShopContext";
import Icon from "./Icon";

// الأسعار جاية من lib/pricing.js — نفس المصدر اللي السيرفر بيتحقق بيه،
// عشان مستحيل يحصل اختلاف بين اللي العميل شايفه واللي بيتحسب فعلاً
export { EXTRAS_LIST as EXTRAS } from "../lib/pricing";
import { EXTRAS_LIST } from "../lib/pricing";

function normalizeImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return url;
  // لو URL ناقص (زي iTDwV/xxx.jpg)، حاول تكمله
  if (url.includes("ibb.co") || url.includes("imgbb")) {
    if (!url.startsWith("https://")) return "https://i.ibb.co/" + url;
  }
  return url;
}

export default function ProductCard({ product: p, style, sizeClass = "" }) {
  const shop = useShop();
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(1);
  const [checkedExtras, setCheckedExtras] = useState([]);
  const [imgOk, setImgOk] = useState(true);
  
  const mainImg = normalizeImageUrl(p.mainImg);
  const secondImg = normalizeImageUrl(p.secondImg);
  const images = secondImg ? [mainImg, secondImg] : (mainImg ? [mainImg] : []);
  const isFav = shop.getFavs().includes(p.id);
  const hasSale = !p.isStarter && Number(p.oldPrice) > Number(p.price);

  function toggleExtra(ex) {
    setCheckedExtras((c) => (c.find((x) => x.id === ex.id) ? c.filter((x) => x.id !== ex.id) : [...c, ex]));
  }

  function handleAdd() {
    const localOnly = p.localOnly !== undefined ? p.localOnly : p.catalog !== "tools";
    if (p.isStarter) {
      const total = (p.pricePerGram || 0) * grams;
      shop.addToCart({
        id: p.id, name: p.name, nameAr: `${p.nameAr} (${grams} جرام)`,
        basePrice: total, extras: [], extrasPrice: 0, totalPrice: total, unitPrice: total,
        qty: 1, img: mainImg || null, priceNote: "جنيه", isStarter: true, localOnly,
      });
      setGrams(1);
      return;
    }
    const extrasPrice = checkedExtras.reduce((s, e) => s + e.price, 0);
    const unitPrice = p.price + extrasPrice;
    shop.addToCart({
      id: p.id, name: p.name, nameAr: p.nameAr,
      basePrice: p.price, extras: checkedExtras, extrasPrice,
      totalPrice: unitPrice * qty, unitPrice, qty,
      img: mainImg || null, priceNote: p.priceNote || "جنيه", localOnly,
    });
    setQty(1);
    setCheckedExtras([]);
  }

  return (
    <div className={`product-card scatter-card ${sizeClass}`} style={style}>
      <div className="product-img-wrapper" onClick={() => images.length && shop.openLightbox(images, 0)}>
        {mainImg && imgOk ? (
          <img className="img-main" src={mainImg} alt={p.nameAr} onError={() => setImgOk(false)} />
        ) : (
          <div className="img-emoji-bg"><Icon name="bread" size={44} /></div>
        )}
        {secondImg && imgOk && (
          <>
            <img className="img-second" src={secondImg} alt="" />
            <div className="img-split-line"></div>
          </>
        )}
        <button
          className={"fav-btn" + (isFav ? " on" : "")}
          aria-label={isFav ? "شيل من المفضلة" : "ضيف للمفضلة"}
          aria-pressed={isFav}
          onClick={(e) => { e.stopPropagation(); shop.toggleFav(p.id); }}
        >
          <Icon name="heart" size={17} />
        </button>
        {images.length > 0 && (
          <button className="img-zoom-btn" onClick={(e) => { e.stopPropagation(); shop.openLightbox(images, 0); }}>تكبير</button>
        )}
        {p.tag && <div className="product-badge-tag">{p.tag}</div>}
        {hasSale && (
          <div className="product-badge-sale" style={{ top: p.tag ? 42 : 12 }}>عرض</div>
        )}
        {p.isBestseller && (
          <div style={{ position: "absolute", top: (p.tag ? 42 : 12) + (hasSale ? 32 : 0), right: 12, background: "#a8442a", color: "#fbf6ee", padding: "4px 11px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, letterSpacing: ".3px", zIndex: 5 }}>الأكثر طلباً</div>
        )}
        {p.isNew && (
          <div style={{ position: "absolute", top: (p.tag ? 42 : 12) + (hasSale ? 32 : 0) + (p.isBestseller ? 32 : 0), right: 12, background: "#5c7a3f", color: "#fbf6ee", padding: "4px 11px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, letterSpacing: ".3px", zIndex: 5 }}>جديد</div>
        )}
      </div>
      <div className="product-info">
        <h3>{p.name}</h3>
        <p className="ar-name">{p.nameAr}</p>
        {p.description && <p className="desc">{p.description}</p>}

        {p.hasExtras && (
          <div className="extras-section">
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 7 }}>إضافات (اختياري):</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {EXTRAS_LIST.map((ex) => (
                <label key={ex.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--brown-mid)", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!checkedExtras.find((x) => x.id === ex.id)} onChange={() => toggleExtra(ex)} />
                  {ex.name} (+{ex.price})
                </label>
              ))}
            </div>
          </div>
        )}

        {p.isStarter ? (
          <div className="gram-counter">
            <div className="gram-counter-label">اختار عدد الجرامات:</div>
            <div className="gram-row">
              <button className="gram-btn" onClick={() => setGrams((g) => Math.max(1, g - 1))}>−</button>
              <div className="gram-display">
                <div className="gram-price-big">{(p.pricePerGram || 0) * grams} جنيه</div>
                <div className="gram-unit-small">{grams === 1 ? "جرام واحد" : grams + " جرام"}</div>
              </div>
              <button className="gram-btn" onClick={() => setGrams((g) => g + 1)}>+</button>
            </div>
          </div>
        ) : (
          <div className="product-qty-row">
            <span className="product-qty-label">الكمية:</span>
            <button className="pqty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="pqty-num">{qty}</span>
            <button className="pqty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
            <span className="pqty-total">{p.price * qty} {p.priceNote || "جنيه"}</span>
          </div>
        )}

        <div className="product-footer">
          {p.isStarter ? (
            <div className="price" style={{ fontSize: 12, lineHeight: 1.5 }}>السعر: {p.pricePerGram} جنيه / جرام</div>
          ) : (
            <div className="price">
              {hasSale && <span className="price-old">{p.oldPrice} {p.priceNote || "جنيه"}</span>}
              {p.price} <span>{p.priceNote || "جنيه"}</span>
            </div>
          )}
          <button className="add-to-cart-btn" onClick={handleAdd}><Icon name="plus" size={16} /> أضف للسلة</button>
        </div>
      </div>
    </div>
  );
}
