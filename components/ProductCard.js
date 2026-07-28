import { useState } from "react";
import { useShop } from "../context/ShopContext";

export const EXTRAS = [
  { id: "roumy", name: "جبنة رومي إضافية", price: 15 },
  { id: "mozz", name: "موزاريلا إضافية", price: 20 },
  { id: "jalap", name: "هالبينو إضافي", price: 10 },
  { id: "sauce", name: "صوص إضافي", price: 5 },
];

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
        qty: 1, emoji: p.emoji || "🌿", priceNote: "جنيه", isStarter: true, localOnly,
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
      emoji: p.emoji || "🍞", priceNote: p.priceNote || "جنيه", localOnly,
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
          <div className="img-emoji-bg">{p.emoji || "🍞"}</div>
        )}
        {secondImg && imgOk && (
          <>
            <img className="img-second" src={secondImg} alt="" />
            <div className="img-split-line"></div>
          </>
        )}
        <button className="fav-btn" onClick={(e) => { e.stopPropagation(); shop.toggleFav(p.id); }}>
          {isFav ? "⭐" : "☆"}
        </button>
        {images.length > 0 && (
          <button className="img-zoom-btn" onClick={(e) => { e.stopPropagation(); shop.openLightbox(images, 0); }}>🔍 عرض</button>
        )}
        {p.tag && <div className="product-badge-tag">{p.tag}</div>}
        {p.isBestseller && (
          <div style={{ position: "absolute", top: 42, right: 12, background: "#e74c3c", color: "white", padding: "3px 9px", borderRadius: 11, fontSize: 10, fontWeight: 700, zIndex: 5 }}>⭐ الأكثر طلباُ</div>
        )}
        {p.isNew && (
          <div style={{ position: "absolute", top: p.isBestseller ? 72 : 42, right: 12, background: "#27ae60", color: "white", padding: "3px 9px", borderRadius: 11, fontSize: 10, fontWeight: 700, zIndex: 5 }}>✨ جديد</div>
        )}
      </div>
      <div className="product-info">
        <h3>{p.name}</h3>
        <p className="ar-name">{p.nameAr}</p>
        {p.description && <p className="desc">{p.description}</p>}

        {p.hasExtras && (
          <div className="extras-section">
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 7 }}>🍴 إضافات (اختياري):</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {EXTRAS.map((ex) => (
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
          <div className="price">{p.price} <span>{p.priceNote || "جنيه"}</span></div>
          <button className="add-to-cart-btn" onClick={handleAdd}>+ أضف للسلة</button>
        </div>
      </div>
    </div>
  );
}