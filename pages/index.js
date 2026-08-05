import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import Icon from "../components/Icon";
import SplitText from "../components/SplitText";
import AdSlot from "../components/AdSlot";
import { useHeroIntro, useCardReveal, scatterStyle } from "../lib/useMotion";
import { WHATSAPP_NUMBER } from "../lib/contact";
import { useShop } from "../context/ShopContext";

const CATALOG_META = {
  tools: {
    eyebrow: "Our Tools", title: "أدوات الساوردو", sub: "كل اللي محتاجه لخبيز ساوردو احترافي في البيت",
    badges: ["أدوات مختارة", "الأكثر طلباً", "لخبّازي الساوردو"],
    filters: [
      { key: "all", label: "الكل" }, { key: "basket", label: "باسكت" },
      { key: "mat", label: "مفارش" }, { key: "tool", label: "أدوات أخرى" },
      { key: "price-low", label: "الأقل سعراً" }, { key: "price-high", label: "الأعلى سعراً" },
    ],
  },
  bread: {
    eyebrow: "Our Menu", title: "الخبز والخميرة", sub: "ساوردو طازج ومحشي وخميرة حية",
    badges: ["مكونات طبيعية 100%", "طازج يومياً", "صنع بالحب"],
    filters: [
      { key: "all", label: "الكل" }, { key: "sourdough", label: "الأكثر طلباً" },
      { key: "stuffed", label: "محشوة" }, { key: "plain", label: "سادة" },
      { key: "slices", label: "شرائح" }, { key: "starter", label: "خميرة" },
      { key: "newest", label: "الأحدث" },
      { key: "banha-only", label: "بنها فقط" }, { key: "nationwide", label: "كل المحافظات" },
      { key: "price-low", label: "الأقل سعراً" }, { key: "price-high", label: "الأعلى سعراً" },
    ],
  },
};

const FEATURES = [
  ["leaf", "طبيعي 100%", "بدون إضافات صناعية أو حافظات"],
  ["clock", "تخمير طويل", "أكثر من 24 ساعة لأفضل طعم"],
  ["home", "صناعة بيتية", "مصنوع بحب في البيت"],
  ["truck", "توصيل سريع", "نوصلك بعد التأكيد"],
];

export default function Home({ markdownContent, isMarkdown }) {
  // Return markdown if requested
  if (isMarkdown) {
    return (
      <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', padding: '20px' }}>
        {markdownContent}
      </div>
    );
  }

  const shop = useShop();
  useHeroIntro();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState("tools");
  const [filter, setFilter] = useState("all");
  const [favProducts, setFavProducts] = useState([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        setAllProducts(d.products || []);
        const favs = shop.getFavs();
        setFavProducts((d.products || []).filter((p) => favs.includes(p.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Update favorites when favsTick changes (when user toggles favorites)
  useEffect(() => {
    const favs = shop.getFavs();
    setFavProducts(allProducts.filter((p) => favs.includes(p.id)));
  }, [shop.favsTick]);

  function removeFav(pid) {
    shop.toggleFav(pid);
  }

  useEffect(() => setFilter("all"), [catalog]);

  const list = useMemo(() => {
    let items = allProducts.filter((p) => (p.catalog || "bread") === catalog && p.active !== false);
    if (filter === "price-low") items = [...items].sort((a, b) => a.price - b.price);
    else if (filter === "price-high") items = [...items].sort((a, b) => b.price - a.price);
    else if (filter === "sourdough") items = items.filter((p) => p.isBestseller);
    else if (filter === "newest") items = items.filter((p) => p.isNew);
    else if (filter === "banha-only") items = items.filter((p) => p.localOnly === true);
    else if (filter === "nationwide") items = items.filter((p) => p.localOnly === false);
    else if (filter !== "all") items = items.filter((p) => p.category === filter);
    return items;
  }, [allProducts, catalog, filter]);

  useCardReveal([list, loading]);

  const meta = CATALOG_META[catalog];

  function goToProducts(e) {
    e.preventDefault();
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <div className="preorder-notice">
        <Icon name="clock" size={15} /> جميع الطلبات بالحجز المسبق — All orders are by pre-order only
      </div>

      <section className="hero">
        <div className="hero-top">
          <div className="hero-cover">
            <img src="/cover-bread.jpg" alt="خبز ساوردو طازج من فرن دودو" />
          </div>
        </div>

        <div className="hero-mark">
          <img
            src="/logo-clear.png" alt="دودو ساوردو" className="hero-logo hero-intro"
            style={{ "--hy": "18px", "--hs": ".9", "--hd": ".06s" }}
            onError={(e) => { e.currentTarget.src = "/logo.png"; }}
          />
        </div>

        <SplitText className="hero-line" text="خبز يستاهل الانتظار" delay={0.4} stagger={0.14} />

        <div className="hero-btns hero-intro" style={{ "--hy": "26px", "--hd": ".75s" }}>
          <a href="#products" onClick={goToProducts} className="btn-primary">
            اطلب دلوقتي <Icon name="chevron" size={17} style={{ transform: "scaleX(-1)" }} />
          </a>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="btn-secondary">
            تواصل معنا
          </a>
        </div>
      </section>

      <section className="features-section">
        <div className="section-title"><span className="eyebrow">Why Dodo</span><h2>ليه دودو ساوردو؟</h2><div className="title-line"></div><p>خبزنا مش بس خبز، ده تجربة حقيقية</p></div>
        <div className="features-grid">
          {FEATURES.map(([ico, h, p], i) => (
            <div className="feature-card reveal" style={{ transitionDelay: i * 0.08 + "s" }} key={h}>
              <div className="feature-icon"><Icon name={ico} size={26} /></div><h4>{h}</h4><p>{p}</p>
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
            <button
              type="button"
              className={"catalog-tab reveal" + (catalog === "tools" ? " active" : "")}
              onClick={() => setCatalog("tools")}
              aria-pressed={catalog === "tools"}
            >
              <div className="ctab-icon"><Icon name="basket" size={28} /></div>
              <div className="ctab-title">أدوات الساوردو</div>
              <div className="ctab-sub">باسكت، مفارش، وأدوات الخبز الاحترافية</div>
              <div className="ctab-pointer"></div>
            </button>
            <button
              type="button"
              className={"catalog-tab reveal" + (catalog === "bread" ? " active" : "")}
              style={{ transitionDelay: ".12s" }}
              onClick={() => setCatalog("bread")}
              aria-pressed={catalog === "bread"}
            >
              <div className="ctab-icon"><Icon name="bread" size={28} /></div>
              <div className="ctab-title">الخبز والخميرة</div>
              <div className="ctab-sub">ساوردو طازج ومحشي وخميرة حية</div>
              <div className="ctab-pointer"></div>
            </button>
          </div>
          <p className="catalog-nudge">دوس على القسم اللي عايزه — الأدوات أو الخبز</p>

          {/* المفضلة — شريط أفقي تحت التابين مباشرة.
              شكل مختلف عن كروت المنتجات عشان ما يتلخبطش معاها:
              كروت صغيرة أفقية بتتسحب على الموبايل. */}
          {favProducts.length > 0 && (
            <div className="fav-strip">
              <div className="fav-strip-head">
                <Icon name="heart" size={16} />
                <span>مفضلتك</span>
                <em>{favProducts.length}</em>
              </div>
              <div className="fav-strip-rail">
                {favProducts.map((p) => (
                  <div className="fav-chip" key={p.id}>
                    <div className="fav-chip-img">
                      {p.mainImg
                        ? <img src={p.mainImg} alt="" loading="lazy" />
                        : <Icon name="bread" size={20} />}
                    </div>
                    <div className="fav-chip-txt">
                      <span className="fav-chip-name">{p.nameAr}</span>
                      <span className="fav-chip-price">
                        {p.isStarter ? `${p.pricePerGram} جنيه/جرام` : `${p.price} جنيه`}
                      </span>
                    </div>
                    <button
                      className="fav-chip-x"
                      aria-label={`شيل ${p.nameAr} من المفضلة`}
                      onClick={() => removeFav(p.id)}
                    ><Icon name="close" size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            {!loading && !list.length && <div className="no-products">لا توجد منتجات في القسم ده</div>}
            {list.map((p, idx) => {
              const sizeClass = p.isBestseller ? "pc-tall" : (idx % 5 === 2 ? "pc-short" : "");
              return <ProductCard key={p.id} product={p} style={scatterStyle(idx)} sizeClass={sizeClass} />;
            })}
          </div>
        </div>
      </section>

      {/* قسم "تواصل معنا" اتشال — زرار الواتساب العايم تحت على الشمال
          بيعمل نفس الحاجة، ومكانه هنا بقى للإعلان. */}
      <AdSlot />
    </div>
  );
}
