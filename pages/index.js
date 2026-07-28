import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import { useHeroIntro, useCardReveal, scatterStyle } from "../lib/useMotion";
import { WHATSAPP_NUMBER } from "../lib/contact";

const CATALOG_META = {
  tools: {
    eyebrow: "Our Tools", title: "أدوات الساوردو 🧺", sub: "كل اللي محتاجه لخبيز ساوردو احترافي في البيت",
    badges: ["🧺 Premium Tools", "⭐ Best Seller", "🌾 For Sourdough Bakers"],
    filters: [
      { key: "all", label: "🧺 الكل" }, { key: "basket", label: "🧺 باسكت" },
      { key: "mat", label: "🧵 مفارش" }, { key: "tool", label: "🔧 أدوات أخرى" },
      { key: "price-low", label: "💰 الأقل سعراً" }, { key: "price-high", label: "💎 الأعلى سعراً" },
    ],
  },
  bread: {
    eyebrow: "Our Menu", title: "الخبز والخميرة 🍞", sub: "ساوردو طازج ومحشي وخميرة حية",
    badges: ["🌿 مكونات طبيعية 100%", "🍞 طازج يومياً", "✋ صنع بالحب"],
    filters: [
      { key: "all", label: "🍞 الكل" }, { key: "sourdough", label: "⭐ الأكثر طلباً" },
      { key: "stuffed", label: "🧀 محشوة" }, { key: "plain", label: "🍞 سادة" },
      { key: "slices", label: "🔪 شرائح" }, { key: "starter", label: "🌾 خميرة" },
      { key: "newest", label: "✨ الأحدث" },
      { key: "price-low", label: "💰 الأقل سعراً" }, { key: "price-high", label: "💎 الأعلى سعراً" },
    ],
  },
};

export default function Home() {
  useHeroIntro();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState("tools");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setAllProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => setFilter("all"), [catalog]);

  const list = useMemo(() => {
    let items = allProducts.filter((p) => (p.catalog || "bread") === catalog && p.active !== false);
    if (filter === "price-low") items = [...items].sort((a, b) => a.price - b.price);
    else if (filter === "price-high") items = [...items].sort((a, b) => b.price - a.price);
    else if (filter === "sourdough") items = items.filter((p) => p.isBestseller);
    else if (filter === "newest") items = items.filter((p) => p.isNew);
    else if (filter !== "all") items = items.filter((p) => p.category === filter);
    return items;
  }, [allProducts, catalog, filter]);

  useCardReveal([list, loading]);

  const meta = CATALOG_META[catalog];

  return (
    <div>
      <div className="preorder-notice">🕐 جميع الطلبات بالحجز المسبق — All orders are by pre-order only</div>

      <section className="hero">
        <div className="hero-bg-word">SOURDOUGH</div>
        <div className="hero-shape hshape1"></div>
        <div className="hero-shape hshape2"></div>
        <div className="hero-content">
          <img
            src="/logo.png" alt="دودو ساوردو" className="hero-logo hero-intro"
            style={{ "--hy": "-120px", "--hr": "-10deg", "--hd": ".05s" }}
            onError={(e) => { e.currentTarget.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍞</text></svg>"; }}
          />
          <span className="eyebrow hero-intro" style={{ "--hx": "-90px", "--hd": ".2s" }}>Dodo Sourdough</span>
          <div className="hero-badges">
            <span className="badge hero-intro" style={{ "--hx": "-60px", "--hy": "30px", "--hd": ".3s" }}>🌿 مكونات طبيعية 100%</span>
            <span className="badge hero-intro" style={{ "--hx": "40px", "--hy": "40px", "--hd": ".36s" }}>🍞 طازج يومياً</span>
            <span className="badge hero-intro" style={{ "--hx": "-30px", "--hy": "-40px", "--hd": ".42s" }}>✋ صنع بالحب</span>
            <span className="badge hero-intro" style={{ "--hx": "70px", "--hy": "-20px", "--hd": ".48s" }}>🚀 توصيل للبيت</span>
          </div>
          <div className="hero-btns hero-intro" style={{ "--hy": "70px", "--hd": ".55s" }}>
            <a href="#products" className="btn-primary">🛒 اطلب دلوقتي</a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="btn-secondary">تواصل معنا</a>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-title"><span className="eyebrow">Why Dodo</span><h2>ليه دودو ساوردو؟ 🤔</h2><div className="title-line"></div><p>خبزنا مش بس خبز، ده تجربة حقيقية</p></div>
        <div className="features-grid">
          {[
            ["🌿", "طبيعي 100%", "بدون إضافات صناعية أو حافظات"],
            ["⏰", "تخمير طويل", "أكثر من 24 ساعة لأفضل طعم"],
            ["🏠", "صناعة بيتية", "مصنوع بحب في البيت"],
            ["🚀", "توصيل سريع", "نوصلك بعد التأكيد"],
          ].map(([icon, h, p], i) => (
            <div className="feature-card reveal" style={{ transitionDelay: i * 0.08 + "s" }} key={h}>
              <div className="feature-icon">{icon}</div><h4>{h}</h4><p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="products">
        <div className="catalog-hero-strip">
          <div className="catalog-switch-badges">
            {meta.badges.map((b) => <span className="csw-badge" key={b}>{b}</span>)}
          </div>
          <div className="catalog-tabs">
            <div className={"catalog-tab reveal" + (catalog === "tools" ? " active" : "")} onClick={() => setCatalog("tools")}>
              <div className="ctab-icon">🧺</div>
              <div className="ctab-title">أدوات الساوردو</div>
              <div className="ctab-sub">باسكت، مفارش، وأدوات الخبز الاحترافية</div>
              <div className="ctab-pointer"></div>
            </div>
            <div className={"catalog-tab reveal" + (catalog === "bread" ? " active" : "")} style={{ transitionDelay: ".12s" }} onClick={() => setCatalog("bread")}>
              <div className="ctab-icon">🍞</div>
              <div className="ctab-title">الخبز والخميرة</div>
              <div className="ctab-sub">ساوردو طازج ومحشي وخميرة حية</div>
              <div className="ctab-pointer"></div>
            </div>
          </div>
          <p className="catalog-nudge">👆 دوس على القسم اللي عايزه — الأدوات أو الخبز — مش هيظهروا مع بعض في نفس الوقت</p>
        </div>

        <div className="section-title"><span className="eyebrow">{meta.eyebrow}</span><h2>{meta.title}</h2><div className="title-line"></div><p>{meta.sub}</p></div>

        <div className="filter-section">
          {meta.filters.map((f) => (
            <button key={f.key} className={"filter-btn" + (filter === f.key ? " active" : "")} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>

        <div className="products-section">
          <div className="products-grid">
            {loading && <div className="no-products">جاري تحميل المنتجات...</div>}
            {!loading && !list.length && <div className="no-products">🔍 لا توجد منتجات حالياً</div>}
            {list.map((p, idx) => {
              const sizeClass = p.isBestseller ? "pc-tall" : (idx % 5 === 2 ? "pc-short" : "");
              return <ProductCard key={p.id} product={p} style={scatterStyle(idx)} sizeClass={sizeClass} />;
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: "50px 20px", background: "var(--cream-dark)", textAlign: "center" }}>
        <div className="section-title"><span className="eyebrow">Get in Touch</span><h2>تواصل معنا 💬</h2><div className="title-line"></div><p>احنا هنا دايماً!</p></div>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#25D366", color: "white", padding: "16px 35px", borderRadius: 32, textDecoration: "none", fontSize: 18, fontWeight: 800, marginTop: 10 }}>
          ابعتلنا على واتساب
        </a>
      </section>
    </div>
  );
}
