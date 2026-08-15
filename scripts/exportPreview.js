// ============================================================
// تصدير نسخة "بورتفوليو" من الموقع — ملف HTML واحد يبعته على واتساب
//
// الاستخدام: لما تقعد تكلم عميل محتمل عايز يعمل موقع، وعايز توريه
// شغلك (موقع الساوردو) لكن نتّه بتحجب فيرسيل. تبعتله الملف ده على
// واتساب، هو بيفتحه بدبل كليك وبيلاقي نفس تصميم الموقع بالظبط —
// الكوفر المخرم واللوجو والأنيميشن والكروت والسلة والفلاتر — شغالين
// عادي من غير نت خالص، لأن كل حاجة (الصور والخطوط والستايل) متحطوطة
// جوّه الملف نفسه.
//
// التشغيل:   npm run preview
// المخرج:    previews/dodo-sourdough-preview.html
//
// ⚠️ لازم يتشغّل من جهاز عنده إنترنت (بيسحب المنتجات والصور من
//    الموقع الحي)، لكن الملف الناتج بيشتغل بعد كده من غير نت.
//
// ⚠️ قرار تصميم مقصود: النسخة دي بتعرض تجربة السلة والطلب كاملة
//    عشان توري جودة الشغل، لكن رقم محفظة العربون الحقيقي متبيّنش —
//    عشان الملف ده هيتبعت لغرباء (عملاء محتملين لعمل مواقع)، مش
//    لعملاء بيشتروا خبز فعلاً. لو حد فضولي دوس "تأكيد الطلب" في
//    العرض، منستحقش نوريه رقم محفظتك الحقيقي أو نخليه يحس إنه طلب
//    حقيقي. لو عايز تفعّله كامل بعدين، قولّي.
// ============================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "previews");
const PUBLIC_DIR = path.join(ROOT, "public");

const SITE = process.env.PREVIEW_SITE || "https://dodo-sourdough.vercel.app";
const WHATSAPP_NUMBER = "201060596724";
const MAX_INLINE_BYTES = 700 * 1024;

// ---------- ثوابت الموقع (نفس القيم من lib/*) ----------

const DEPOSIT_RATIO = 0.5;
const depositFor = (t) => Math.ceil((Number(t) || 0) * DEPOSIT_RATIO);
const remainderFor = (t) => Math.round(((Number(t) || 0) - depositFor(t)) * 100) / 100;

const VAT = 0.14;
const MYLERZ_ZONES = {
  cairoGiza: { label: "القاهرة والجيزة", first2kg: 75 },
  alex: { label: "الإسكندرية", first2kg: 80 },
  delta: { label: "الدلتا", first2kg: 85 },
  canal: { label: "مدن القناة", first2kg: 90 },
  upperEgypt: { label: "الصعيد والبحر الأحمر", first2kg: 105 },
  beyond: { label: "مناطق بعيدة", first2kg: 150 },
};
const GOVERNORATE_TO_ZONE = {
  "القليوبية": "delta", "الدقهلية": "delta", "الشرقية": "delta", "الغربية": "delta",
  "المنوفية": "delta", "البحيرة": "delta", "كفر الشيخ": "delta", "دمياط": "delta",
  "الإسكندرية": "alex", "القاهرة": "cairoGiza", "الجيزة": "cairoGiza",
  "بورسعيد": "canal", "الإسماعيلية": "canal", "السويس": "canal",
  "الفيوم": "upperEgypt", "بني سويف": "upperEgypt", "المنيا": "upperEgypt", "أسيوط": "upperEgypt",
  "سوهاج": "upperEgypt", "قنا": "upperEgypt", "الأقصر": "upperEgypt", "أسوان": "upperEgypt",
  "البحر الأحمر": "upperEgypt", "مطروح": "upperEgypt",
  "شمال سيناء": "beyond", "جنوب سيناء": "beyond", "الوادي الجديد": "beyond",
};
const zoneFee = (z) => Math.round(MYLERZ_ZONES[z].first2kg * (1 + VAT) * 100) / 100;
const GOVERNORATE_RATES = Object.fromEntries(
  Object.entries(GOVERNORATE_TO_ZONE).map(([g, z]) => [g, zoneFee(z)])
);
const GOVERNORATE_NAMES = Object.keys(GOVERNORATE_TO_ZONE);
const OTHER_GOVERNORATE = "محافظة تانية";
const BANHA_DELIVERY_NOTE = "توصيل بنها بنتفق عليه على واتساب — أرخص من الشحن العادي";
const AREA_NAMES = [
  "الفلل","شارع الموقف","الاهرام","اتريب","كوبري الفحص","عند علوم","منشية بنها","وسط البلد",
  "عند المحطة","الشدية","آخر الفحص","العاصمي","عزبة الزراعة","عزبة السوق","كفر الجزار","بطا",
  "مساكن الرملة","ورورة","عزبة المتيني","مساكن بطا","مساكن طابا","عزبة الخليل","عزبة السلام",
  "الرملة","كفر سعد","عزبة ابو جرف","عزبة ابو فرج","دملو","ميت السباع","اجهور الرمل","عزبة زكي",
  "عرب الرمل","كفر الاربعين","كفر بطا","بقيرة","جمجرة","سندنهور","ميت راضي","كفر سيم",
  "منشية دملو","نقباس","اسنيت","ميت الحوفيين","الشموت","كفر العرب","كفر فرسيس","فرسيس",
  "طحلة","شبلنجة","بتمدة","كفر علي","دجوي","بلتان","مرصفا","كفر منصور","طوخ","مشتهر",
  "كفر سندنهور","كفر شكر","تصفا","كفر تصفا","قويسنا","ميت برة","مسجد الخضر","اسطنها",
  "ميت عاصم","امياي","العمار","منشية العمار","كفر مويس","المنشية الكبرى","المنشية الصغرى",
  "ساحل دجوي","طنط الجزيرة","جزيرة بلي","دندنا","ميت كنانة","قها","كفر الجمال","قلما",
  "شبين القناطر","شبين الكوم","بركة السبع","قليوب","ميت العطار","كفر طحلة","مجول",
];
const EXTRAS_LIST = [
  { id: "roumy", name: "جبنة رومي إضافية", price: 15 },
  { id: "mozz", name: "موزاريلا إضافية", price: 20 },
  { id: "jalap", name: "هالبينو إضافي", price: 10 },
  { id: "sauce", name: "صوص إضافي", price: 5 },
];

// أيقونات SVG (نفس مسارات components/Icon.js) بدل الإيموجي
const ICON_PATHS = {
  cart: "M7 18a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 18zm10 0a2 2 0 1 0 .001 4.001A2 2 0 0 0 17 18zM6.2 6h14.6l-1.9 8.3a2 2 0 0 1-2 1.7H9.3a2 2 0 0 1-2-1.6L5.1 3.6A1 1 0 0 0 4.1 3H2",
  bag: "M6 8V7a6 6 0 1 1 12 0v1h2.2a1 1 0 0 1 1 1.1l-1.2 11a2 2 0 0 1-2 1.9H6a2 2 0 0 1-2-1.8L2.8 9.1A1 1 0 0 1 3.8 8H6zm2 0h8V7a4 4 0 0 0-8 0v1z",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  phone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm3.5 17h3",
  home: "M3 11 12 3l9 8M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5",
  pin: "M12 22s7-6.2 7-11.4A7 7 0 0 0 5 10.6C5 15.8 12 22 12 22z M12 12.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z",
  map: "m9 3-6 3v15l6-3 6 3 6-3V3l-6 3-6-3zm0 0v15m6-12v15",
  truck: "M3 6h11v10H3zM14 9h4l3 3.2V16h-7zM7 16a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 16zm10 0a2 2 0 1 0 .001 4.001A2 2 0 0 0 17 16z",
  clipboard: "M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 11h6M9 15h4",
  check: "m4.5 12.5 5 5 10-11",
  checkCircle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9 3 3 5-6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5h.01M11.2 11.5h1v5.5m-1 0h2",
  close: "m6 6 12 12M18 6 6 18",
  heart: "M12 20.5S3.5 15 3.5 9.4A4.4 4.4 0 0 1 12 7.5a4.4 4.4 0 0 1 8.5 1.9c0 5.6-8.5 11.1-8.5 11.1z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4.5V12l3.5 2",
  plus: "M12 5v14M5 12h14",
  chevron: "m9 5 7 7-7 7",
  bread: "M4 10.5C4 7.5 7.6 6 12 6s8 1.5 8 4.5c0 1.2-.7 1.9-1.5 2.2v4.8a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5v-4.8C4.7 12.4 4 11.7 4 10.5z",
  basket: "M3 10h18l-1.6 8.4a2 2 0 0 1-2 1.6H6.6a2 2 0 0 1-2-1.6L3 10zm5 0 2-6m6 6-2-6M9 13.5v3m6-3v3",
  leaf: "M20 4C10 4 4 8.5 4 15c0 2 .7 3.6 1.7 4.8C8 14 12 11.5 16 10.5c-3.4 1.9-6.7 4.8-8.4 9.7 1 .5 2.1.8 3.4.8 6 0 9-5.5 9-17z",
  chat: "M20 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3v4l5-4h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z",
  sparkle: "M12 3.5 13.6 9l5.4 1.6L13.6 12 12 17.5 10.4 12 5 10.6 10.4 9 12 3.5zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z",
  music: "M9 18V6l11-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm11-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
  camera: "M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zm8 3.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z",
  play: "M8 5.5v13l11-6.5-11-6.5z",
  facebook: "M14 8.5V7a1.5 1.5 0 0 1 1.5-1.5H17V3h-2.2A3.8 3.8 0 0 0 11 6.8v1.7H9V11h2v10h3V11h2.2l.4-2.5H14z",
};
const ICON_FILLED = new Set(["play", "facebook", "heart", "leaf", "bread", "bag"]);

// نوتس الخميرة الجاهزة (نفس lib/productNotes.js) — للـ hasNotes/parseNotes بس؛
// النص الفعلي بييجي من حقل notes بتاع كل منتج زي ما هو محفوظ في القاعدة.

// ---------- أدوات مساعدة ----------

const log = (...a) => console.log(...a);

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
};
function mimeOf(url) {
  const ext = path.extname(String(url).split("?")[0]).toLowerCase();
  return MIME[ext] || "image/jpeg";
}

function firstUrl(raw) {
  if (!raw) return null;
  const one = String(raw).trim().split(/\s+/)[0];
  if (!one) return null;
  if (one.startsWith("http") || one.startsWith("/")) return one;
  if (one.includes("ibb.co") || one.includes("imgbb")) return "https://i.ibb.co/" + one;
  return one;
}

const cache = new Map();
async function inline(url) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  let out = url;
  try {
    let buf;
    if (url.startsWith("/")) {
      const p = path.join(PUBLIC_DIR, url.slice(1));
      if (fs.existsSync(p)) buf = fs.readFileSync(p);
    } else if (url.startsWith("http")) {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    }
    if (buf && buf.length <= MAX_INLINE_BYTES) {
      out = `data:${mimeOf(url)};base64,${buf.toString("base64")}`;
    } else if (buf) {
      log(`   · صورة كبيرة (${Math.round(buf.length / 1024)}KB)، سايبها لينك: ${url.slice(0, 60)}`);
    }
  } catch (e) {
    log(`   · فشل تحميل: ${url.slice(0, 60)} — ${e.message}`);
  }
  cache.set(url, out);
  return out;
}

async function fontsCss() {
  const href =
    "https://fonts.googleapis.com/css2" +
    "?family=Tajawal:wght@400;500;700;800" +
    "&family=Aref+Ruqaa:wght@400;700" +
    "&family=Dancing+Script:wght@600;700" +
    "&display=swap";
  try {
    const res = await fetch(href, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    let css = await res.text();
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [])];
    log(`   · ${urls.length} ملف خط`);
    for (const u of urls) {
      const r = await fetch(u);
      if (!r.ok) continue;
      const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
      css = css.split(u).join(`data:font/woff2;base64,${b64}`);
    }
    return css;
  } catch (e) {
    log(`   · تعذر تضمين الخطوط (${e.message}) — هيستخدم خط النظام`);
    return "";
  }
}

// ---------- بناء الصفحة ----------

function pageHtml({ css, fonts, products, assets, generatedAt }) {
  const data = JSON.stringify({
    products, WHATSAPP_NUMBER, DEPOSIT_RATIO, GOVERNORATE_RATES, GOVERNORATE_NAMES,
    OTHER_GOVERNORATE, BANHA_DELIVERY_NOTE, AREA_NAMES, EXTRAS_LIST,
    ICON_PATHS, ICON_FILLED: [...ICON_FILLED],
  }).replace(/<\/script/gi, "<\\/script");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>دودو ساوردو</title>
<link rel="icon" href="${assets.logo512 || ""}">
<style>
${fonts}
${css}

/* ===== شريط "نسخة عرض" — بس لهدف عرض الشغل، مش ملف بيع حقيقي ===== */
.demo-ribbon{position:fixed;top:0;left:0;right:0;z-index:5000;background:var(--clay-900);
  color:var(--ochre-soft);text-align:center;padding:8px 14px;font-size:12.5px;font-weight:600;}
.topbar{top:32px;}
.preorder-notice{margin-top:92px;}
@media(max-width:600px){.demo-ribbon{font-size:11px;padding:7px 10px;}}
</style>
</head>
<body>

<div class="demo-ribbon">نسخة عرض لتوضيح تصميم الموقع — دودو ساوردو (شغل ${"Ahmed"})</div>

<div class="topbar">
  <div class="topbar-left">
    <button class="hamburger" id="hamburger" aria-label="القائمة"><span></span><span></span><span></span></button>
    <div class="topbar-logo" id="logoHome">
      ${assets.logoSmall ? `<img src="${assets.logoSmall}" alt="دودو ساوردو">` : ""}
      <span>دودو ساوردو</span>
    </div>
  </div>
  <div class="topbar-right">
    <button class="cart-fab" id="cartFab" aria-label="سلة المشتريات">
      <svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS.cart}"/></svg>
      <span class="cart-count" id="cartCount">0</span>
    </button>
  </div>
</div>

<div class="side-menu-overlay" id="menuOverlay"></div>
<div class="side-menu" id="sideMenu">
  <div class="side-menu-header">
    <span>القائمة</span>
    <button class="side-menu-close" id="menuClose" aria-label="إغلاق">${svgIcon("close", 19)}</button>
  </div>
  <a class="menu-item active" href="#" data-nav="home">${svgIcon("home", 21)}الرئيسية</a>
  <a class="menu-item" href="#" data-nav="demo">${svgIcon("chat", 21)}آراء العملاء</a>
  <a class="menu-item" href="#" data-nav="demo">${svgIcon("clipboard", 21)}المحتوى</a>
  <a class="menu-item" href="#" data-nav="demo">${svgIcon("bag", 21)}طلباتي</a>
  <div class="menu-item" id="socialToggle" role="button" tabindex="0">
    ${svgIcon("sparkle", 21)}صفحاتنا
    <span class="ico" style="margin-right:auto" id="socialChevron">${svgIcon("chevron", 15)}</span>
  </div>
  <div class="social-submenu" id="socialSubmenu">
    <a class="social-link" href="https://www.tiktok.com/@dodo.sourdough" target="_blank" rel="noreferrer">${svgIcon("music", 19)}تيك توك</a>
    <a class="social-link" href="https://www.facebook.com/profile.php?id=61574499401410" target="_blank" rel="noreferrer">${svgIcon("facebook", 19)}فيسبوك</a>
    <a class="social-link" href="https://www.instagram.com/dodosourdogh" target="_blank" rel="noreferrer">${svgIcon("camera", 19)}انستجرام</a>
    <a class="social-link" href="https://www.youtube.com/@DodoSourdough/videos" target="_blank" rel="noreferrer">${svgIcon("play", 19)}يوتيوب</a>
  </div>
</div>

<div class="preorder-notice">${svgIcon("clock", 15)} جميع الطلبات بالحجز المسبق — All orders are by pre-order only</div>

<section class="hero">
  <div class="hero-top"><div class="hero-cover">${assets.cover ? `<img src="${assets.cover}" alt="خبز ساوردو طازج من فرن دودو">` : ""}</div></div>
  <div class="hero-mark">${assets.logoClear ? `<img src="${assets.logoClear}" alt="دودو ساوردو" class="hero-logo hero-intro" style="--hy:18px;--hs:.9;--hd:.06s">` : ""}</div>
  <h1 class="hero-line" id="heroLine">خبز يستاهل الانتظار</h1>
  <div class="hero-btns hero-intro" style="--hy:26px;--hd:.75s">
    <a href="#products" class="btn-primary">اطلب دلوقتي ${svgIcon("chevron", 17, "transform:scaleX(-1)")}</a>
    <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noreferrer" class="btn-secondary">تواصل معنا</a>
  </div>
</section>

<section class="features-section">
  <div class="section-title"><span class="eyebrow">Why Dodo</span><h2>ليه دودو ساوردو؟</h2><div class="title-line"></div><p>خبزنا مش بس خبز، ده تجربة حقيقية</p></div>
  <div class="features-grid">
    <div class="feature-card reveal"><div class="feature-icon">${svgIcon("leaf", 26)}</div><h4>طبيعي 100%</h4><p>بدون إضافات صناعية أو حافظات</p></div>
    <div class="feature-card reveal" style="transition-delay:.08s"><div class="feature-icon">${svgIcon("clock", 26)}</div><h4>تخمير طويل</h4><p>أكثر من 24 ساعة لأفضل طعم</p></div>
    <div class="feature-card reveal" style="transition-delay:.16s"><div class="feature-icon">${svgIcon("home", 26)}</div><h4>صناعة بيتية</h4><p>مصنوع بحب في البيت</p></div>
    <div class="feature-card reveal" style="transition-delay:.24s"><div class="feature-icon">${svgIcon("truck", 26)}</div><h4>توصيل سريع</h4><p>نوصلك بعد التأكيد</p></div>
  </div>
</section>

<section id="products">
  <div class="catalog-hero-strip">
    <div class="catalog-switch-badges" id="badges"></div>
    <div class="catalog-tabs" id="catalogTabs"></div>
    <p class="catalog-nudge">دوس على القسم اللي عايزه</p>
  </div>
  <div class="section-title" id="sectionTitle"></div>
  <div class="filter-section" id="filters"></div>
  <div class="products-section"><div class="products-grid" id="grid"></div></div>
</section>

<div class="whatsapp-float">
  <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noreferrer" class="whatsapp-btn" aria-label="تواصل على واتساب">
    <svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
  </a>
  <div class="whatsapp-tooltip"><strong>محتاج مساعدة؟</strong><span>كلّمنا هنا لو حصلت مشكلة أو في حاجة مستعجلة.<br>أما طلبك، اعمله من الموقع على طول.</span></div>
</div>
<div class="assistant-name-label" aria-hidden="true">Dodo's assistant</div>
<div class="toast" id="toast"></div>

<div class="cart-overlay" id="cartOverlay"></div>
<div class="cart-sidebar" id="cartSidebar">
  <div class="cart-header">
    <h3>${svgIcon("cart", 19)} سلة مشترياتك</h3>
    <button class="cart-close" id="cartClose" aria-label="إغلاق السلة">${svgIcon("close", 18)}</button>
  </div>
  <div class="cart-items" id="cartItems"></div>
  <div id="orderFormWrap"></div>
</div>

<div class="lightbox" id="lightbox">
  <button class="lightbox-close" id="lbClose" aria-label="إغلاق">${svgIcon("close", 20)}</button>
  <div class="lightbox-img-wrap"><img id="lightboxImg" alt=""></div>
  <div class="lightbox-nav" id="lbNav" style="display:none">
    <button id="lbPrevBtn">السابقة</button><button id="lbNextBtn">التالية</button>
  </div>
  <div class="lightbox-dots" id="lbDots"></div>
</div>

<div id="notesRoot"></div>
<div id="doneRoot"></div>

<footer>
  ${assets.logoSmall ? `<img src="${assets.logoSmall}" alt="logo" class="footer-logo">` : ""}
  <h3>دودو ساوردو</h3>
  <p>Dodo Sourdough — طازج يومياً، مصنوع بعناية</p>
  <hr class="footer-divider">
  <p class="footer-copy">© 2025 دودو ساوردو — جميع الحقوق محفوظة · نسخة عرض غير رسمية بتاريخ ${generatedAt}</p>
</footer>

<script>
window.__DATA__ = ${data};
</script>
<script>
${clientJs()}
</script>
</body>
</html>`;
}

function svgIcon(name, size, extraStyle) {
  return `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" style="flex-shrink:0${extraStyle ? ";" + extraStyle : ""}" fill="${ICON_FILLED.has(name) ? "currentColor" : "none"}" stroke="${ICON_FILLED.has(name) ? "none" : "currentColor"}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS[name]}"/></svg>`;
}

// ---------- الجافاسكريبت جوّه الملف الناتج (نفس منطق React، بس عادي) ----------
function clientJs() {
  return `
(function(){
"use strict";
var D = window.__DATA__;
var PRODUCTS = D.products;

function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function icon(name,size,style){
  var d = D.ICON_PATHS[name]; if(!d) return "";
  var filled = D.ICON_FILLED.indexOf(name) > -1;
  return '<svg class="ico" viewBox="0 0 24 24" width="'+(size||20)+'" height="'+(size||20)+'" style="flex-shrink:0'+(style?';'+style:'')+'" fill="'+(filled?'currentColor':'none')+'" stroke="'+(filled?'none':'currentColor')+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg>';
}
function toast(msg){
  var el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function(){ el.classList.remove('show'); }, 2600);
}

// ---------- الحالة ----------
// بعض المتصفحات بتمنع localStorage على ملفات file:// (خصوصاً فايرفوكس) —
// فبنجرب، ولو اتمنع بنكمل عادي بذاكرة مؤقتة من غير ما نكسر الصفحة كلها.
var storageOk = true;
function safeGetFavs(){
  try { return new Set(JSON.parse(localStorage.getItem('dodoDemoFavs') || '[]')); }
  catch (e) { storageOk = false; return new Set(); }
}
function saveFavs(){
  if (!storageOk) return;
  try { localStorage.setItem('dodoDemoFavs', JSON.stringify([...favs])); }
  catch (e) { storageOk = false; }
}
var favs = safeGetFavs();
var cart = [];
var catalog = 'tools', filter = 'all';
var lb = { open:false, images:[], idx:0 };

// ---------- القوائم والفلاتر ----------
var CATALOG_META = {
  tools: { eyebrow:"Our Tools", title:"أدوات الساوردو", sub:"كل اللي محتاجه لخبيز ساوردو احترافي في البيت",
    badges:["أدوات مختارة","الأكثر طلباً","لخبّازي الساوردو"],
    filters:[["all","الكل"],["basket","باسكت"],["mat","مفارش"],["tool","أدوات أخرى"],["price-low","الأقل سعراً"],["price-high","الأعلى سعراً"]] },
  bread: { eyebrow:"Our Menu", title:"الخبز والخميرة", sub:"ساوردو طازج ومحشي وخميرة حية",
    badges:["مكونات طبيعية 100%","طازج يومياً","صنع بالحب"],
    filters:[["all","الكل"],["sourdough","الأكثر طلباً"],["stuffed","محشوة"],["plain","سادة"],["slices","شرائح"],["starter","خميرة"],["newest","الأحدث"],["price-low","الأقل سعراً"],["price-high","الأعلى سعراً"]] },
};
var FAV_META = { eyebrow:"Your Favorites", title:"المفضلة", sub:"المنتجات اللي عجبتك وحبيت ترجعلها", badges:["اختيارك","محفوظة على جهازك"], filters:[["all","الكل"]] };

var SCATTER = [{x:-150,y:-45,r:-9},{x:160,y:35,r:8},{x:-95,y:65,r:6},{x:120,y:-75,r:-7},{x:-60,y:90,r:5},{x:80,y:-90,r:-6}];
function scatterStyle(idx){
  var d = SCATTER[idx % SCATTER.length], delay = Math.min(idx*0.06,0.5).toFixed(2);
  return '--sx:'+d.x+'px;--sy:'+d.y+'px;--sr:'+d.r+'deg;--sd:'+delay+'s';
}

function visibleList(){
  if (catalog === 'favorites') return PRODUCTS.filter(function(p){ return favs.has(p.id) && p.active !== false; });
  var items = PRODUCTS.filter(function(p){ return (p.catalog||'bread') === catalog && p.active !== false; });
  if (filter === 'price-low') items = items.slice().sort(function(a,b){return a.price-b.price;});
  else if (filter === 'price-high') items = items.slice().sort(function(a,b){return b.price-a.price;});
  else if (filter === 'sourdough') items = items.filter(function(p){return p.isBestseller;});
  else if (filter === 'newest') items = items.filter(function(p){return p.isNew;});
  else if (filter !== 'all') items = items.filter(function(p){return p.category===filter;});
  return items;
}

function hasNotes(p){ return !!(p && typeof p.notes === 'string' && p.notes.trim()); }
function parseNotes(text){
  return String(text||'').split(/\\n\\s*\\n/).map(function(b){return b.trim();}).filter(Boolean).map(function(block){
    var lines = block.split('\\n').map(function(l){return l.trim();}).filter(Boolean);
    var first = lines[0] || '';
    var isHeading = lines.length > 1 && first.length <= 40 && !/[.،:]$/.test(first);
    return isHeading ? { title:first, lines: lines.slice(1) } : { title:null, lines: lines };
  });
}

function productCard(p, idx){
  var sale = !p.isStarter && Number(p.oldPrice) > Number(p.price);
  var isFav = favs.has(p.id);
  var badgeTop = p.tag ? 42 : 12;
  var badges = '';
  if (p.tag) badges += '<div class="product-badge-tag">'+esc(p.tag)+'</div>';
  if (sale) badges += '<div class="product-badge-sale" style="top:'+badgeTop+'px">عرض</div>';
  var nextTop = badgeTop + (sale?32:0);
  if (p.isBestseller) badges += '<div style="position:absolute;top:'+nextTop+'px;right:12px;background:#a8442a;color:#fbf6ee;padding:4px 11px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.3px;z-index:5">الأكثر طلباً</div>';
  var nextTop2 = nextTop + (p.isBestseller?32:0);
  if (p.isNew) badges += '<div style="position:absolute;top:'+nextTop2+'px;right:12px;background:#5c7a3f;color:#fbf6ee;padding:4px 11px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.3px;z-index:5">جديد</div>';

  var img = p._img
    ? '<img class="img-main" src="'+p._img+'" alt="'+esc(p.nameAr)+'">'
    : '<div class="img-emoji-bg">'+icon('bread',44)+'</div>';
  var second = p._img2 ? '<img class="img-second" src="'+p._img2+'" alt=""><div class="img-split-line"></div>' : '';
  var zoomBtn = p._img ? '<button class="img-zoom-btn" data-zoom="'+p.id+'">تكبير</button>' : '';

  var sizeClass = p.isBestseller ? 'pc-tall' : (idx % 5 === 2 ? 'pc-short' : '');

  var footer;
  if (p.isStarter) {
    footer = '<div class="gram-counter"><div class="gram-counter-label">اختار عدد الجرامات:</div>'+
      '<div class="gram-row"><button class="gram-btn" data-gram-minus="'+p.id+'">−</button>'+
      '<div class="gram-display"><div class="gram-price-big" id="gp-'+p.id+'">'+((p.pricePerGram||0)*1)+' جنيه</div>'+
      '<div class="gram-unit-small" id="gu-'+p.id+'">جرام واحد</div></div>'+
      '<button class="gram-btn" data-gram-plus="'+p.id+'">+</button></div>'+
      '<button class="add-to-cart-btn starter-add-btn" data-add-starter="'+p.id+'">'+icon('plus',16)+' أضف للسلة</button></div>';
  } else {
    footer = '<div class="product-qty-row"><span class="product-qty-label">الكمية:</span>'+
      '<button class="pqty-btn" data-qty-minus="'+p.id+'">−</button>'+
      '<span class="pqty-num" id="qn-'+p.id+'">1</span>'+
      '<button class="pqty-btn" data-qty-plus="'+p.id+'">+</button>'+
      '<span class="pqty-total" id="qt-'+p.id+'">'+p.price+' '+(p.priceNote||'جنيه')+'</span></div>';
  }

  var priceBlock = p.isStarter
    ? '<div class="price" style="font-size:12px;line-height:1.5">السعر: '+p.pricePerGram+' جنيه / جرام</div>'
    : '<div class="price">'+(sale ? '<span class="price-old">'+p.oldPrice+' '+(p.priceNote||'جنيه')+'</span>' : '')+p.price+' <span>'+(p.priceNote||'جنيه')+'</span></div>';
  var addBtn = !p.isStarter ? '<button class="add-to-cart-btn" data-add="'+p.id+'">'+icon('plus',16)+' أضف للسلة</button>' : '';

  var extras = '';
  if (p.hasExtras) {
    extras = '<div class="extras-section"><h4 style="font-size:12px;font-weight:700;margin-bottom:7px">إضافات (اختياري):</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">' +
      D.EXTRAS_LIST.map(function(ex){
        return '<label style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--brown-mid);cursor:pointer"><input type="checkbox" data-extra="'+p.id+'" value="'+ex.id+'"> '+esc(ex.name)+' (+'+ex.price+')</label>';
      }).join('') + '</div></div>';
  }

  return '<div class="product-card scatter-card '+sizeClass+'" style="'+scatterStyle(idx)+'" data-card="'+p.id+'">'+
    '<div class="product-img-wrapper" data-lightbox-open="'+p.id+'">'+img+second+
      '<button class="fav-btn'+(isFav?' on':'')+'" data-fav="'+p.id+'" aria-label="مفضلة">'+icon('heart',17)+'</button>'+
      zoomBtn+badges+
    '</div>'+
    '<div class="product-info"><h3>'+esc(p.name)+'</h3><p class="ar-name">'+esc(p.nameAr)+'</p>'+
      (p.description ? '<p class="desc">'+esc(p.description)+'</p>' : '')+
      (hasNotes(p) ? '<button type="button" class="notes-btn" data-notes="'+p.id+'">'+icon('info',15)+'إزاي أستخدمه؟</button>' : '')+
      extras + footer +
      '<div class="product-footer">'+priceBlock+addBtn+'</div>'+
    '</div></div>';
}

function chips(el, items, active, onPick){
  el.innerHTML = '';
  items.forEach(function(it){
    var b = document.createElement('button');
    b.className = 'filter-btn' + (it[0]===active ? ' active':'');
    b.type='button'; b.textContent = it[1];
    b.onclick = onPick.bind(null, it[0]);
    el.appendChild(b);
  });
}

function render(){
  var favCount = PRODUCTS.filter(function(p){return favs.has(p.id) && p.active!==false;}).length;
  if (catalog === 'favorites' && favCount === 0) catalog = 'tools';

  var tabsEl = document.getElementById('catalogTabs');
  var toolsActive = catalog==='tools', breadActive = catalog==='bread', favActive = catalog==='favorites';
  tabsEl.innerHTML =
    '<button type="button" class="catalog-tab reveal in-view'+(toolsActive?' active':'')+'" data-tab="tools"><div class="ctab-icon">'+icon('basket',28)+'</div><div class="ctab-title">أدوات الساوردو</div><div class="ctab-sub">باسكت، مفارش، وأدوات الخبز الاحترافية</div><div class="ctab-pointer"></div></button>'+
    '<button type="button" class="catalog-tab reveal in-view'+(breadActive?' active':'')+'" style="transition-delay:.12s" data-tab="bread"><div class="ctab-icon">'+icon('bread',28)+'</div><div class="ctab-title">الخبز والخميرة</div><div class="ctab-sub">ساوردو طازج ومحشي وخميرة حية</div><div class="ctab-pointer"></div></button>'+
    (favCount>0 ? '<button type="button" class="catalog-tab reveal in-view'+(favActive?' active':'')+'" style="transition-delay:.24s" data-tab="favorites"><div class="ctab-icon">'+icon('heart',28)+'</div><div class="ctab-title">المفضلة <span class="ctab-count">'+favCount+'</span></div><div class="ctab-sub">المنتجات اللي عجبتك وحبيت ترجعلها</div><div class="ctab-pointer"></div></button>' : '');
  tabsEl.querySelectorAll('[data-tab]').forEach(function(b){
    b.onclick = function(){ catalog = b.dataset.tab; filter = 'all'; render(); };
  });

  var meta = catalog === 'favorites' ? FAV_META : CATALOG_META[catalog];
  document.getElementById('badges').innerHTML = meta.badges.map(function(b){return '<span class="csw-badge">'+esc(b)+'</span>';}).join('');
  document.getElementById('sectionTitle').innerHTML = '<span class="eyebrow">'+meta.eyebrow+'</span><h2>'+meta.title+'</h2><div class="title-line"></div><p>'+meta.sub+'</p>';
  chips(document.getElementById('filters'), meta.filters, filter, function(k){ filter = k; render(); });

  var list = visibleList();
  var grid = document.getElementById('grid');
  grid.innerHTML = list.length ? list.map(productCard).join('') : '<div class="no-products">لا توجد منتجات في القسم ده</div>';

  requestAnimationFrame(function(){
    grid.querySelectorAll('.scatter-card').forEach(function(el){ observeReveal(el); });
  });
  wireCardEvents();
  updateCartUI();
}

// ---------- الأنيميشن (نفس lib/useMotion.js) ----------
var revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
  entries.forEach(function(en){ if (en.isIntersecting) { en.target.classList.add('in-view'); revealObserver.unobserve(en.target); } });
}, { threshold:0.1, rootMargin:'0px 0px -50px 0px' }) : null;
function observeReveal(el){
  if (!revealObserver) { el.classList.add('in-view'); return; }
  revealObserver.observe(el);
  setTimeout(function(){ el.classList.add('in-view'); }, 4000);
}
document.querySelectorAll('.reveal').forEach(observeReveal);
requestAnimationFrame(function(){ requestAnimationFrame(function(){ document.body.classList.add('intro-ready'); }); });

// ---------- تفاعلات الكروت ----------
var qtyState = {}, gramState = {}, extrasState = {};
function wireCardEvents(){
  document.querySelectorAll('[data-fav]').forEach(function(b){
    b.onclick = function(e){
      e.stopPropagation();
      var id = b.dataset.fav;
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      saveFavs(); render();
    };
  });
  document.querySelectorAll('[data-lightbox-open]').forEach(function(w){
    w.onclick = function(e){
      if (e.target.closest('[data-fav]') || e.target.closest('[data-zoom]')) return;
      openLightboxFor(w.dataset.lightboxOpen);
    };
  });
  document.querySelectorAll('[data-zoom]').forEach(function(b){
    b.onclick = function(e){ e.stopPropagation(); openLightboxFor(b.dataset.zoom); };
  });
  document.querySelectorAll('[data-notes]').forEach(function(b){
    b.onclick = function(){ openNotes(b.dataset.notes); };
  });
  document.querySelectorAll('[data-qty-plus]').forEach(function(b){
    b.onclick = function(){ var id=b.dataset.qtyPlus; qtyState[id]=(qtyState[id]||1)+1; syncQty(id); };
  });
  document.querySelectorAll('[data-qty-minus]').forEach(function(b){
    b.onclick = function(){ var id=b.dataset.qtyMinus; qtyState[id]=Math.max(1,(qtyState[id]||1)-1); syncQty(id); };
  });
  document.querySelectorAll('[data-gram-plus]').forEach(function(b){
    b.onclick = function(){ var id=b.dataset.gramPlus; gramState[id]=(gramState[id]||1)+1; syncGram(id); };
  });
  document.querySelectorAll('[data-gram-minus]').forEach(function(b){
    b.onclick = function(){ var id=b.dataset.gramMinus; gramState[id]=Math.max(1,(gramState[id]||1)-1); syncGram(id); };
  });
  document.querySelectorAll('[data-extra]').forEach(function(cb){
    cb.onchange = function(){
      var id = cb.dataset.extra;
      extrasState[id] = extrasState[id] || [];
      var ex = D.EXTRAS_LIST.find(function(x){return x.id===cb.value;});
      if (cb.checked) extrasState[id].push(ex); else extrasState[id] = extrasState[id].filter(function(x){return x.id!==ex.id;});
    };
  });
  document.querySelectorAll('[data-add]').forEach(function(b){
    b.onclick = function(){ addToCart(b.dataset.add); };
  });
  document.querySelectorAll('[data-add-starter]').forEach(function(b){
    b.onclick = function(){ addStarterToCart(b.dataset.addStarter); };
  });
}
function syncQty(id){
  var n = qtyState[id] || 1;
  var p = PRODUCTS.find(function(x){return x.id===id;});
  document.getElementById('qn-'+id).textContent = n;
  document.getElementById('qt-'+id).textContent = (p.price*n) + ' ' + (p.priceNote||'جنيه');
}
function syncGram(id){
  var n = gramState[id] || 1;
  var p = PRODUCTS.find(function(x){return x.id===id;});
  document.getElementById('gp-'+id).textContent = ((p.pricePerGram||0)*n) + ' جنيه';
  document.getElementById('gu-'+id).textContent = n===1 ? 'جرام واحد' : n+' جرام';
}

function addToCart(id){
  var p = PRODUCTS.find(function(x){return x.id===id;});
  if (!p) return;
  var qty = qtyState[id] || 1;
  var extras = extrasState[id] || [];
  var extrasPrice = extras.reduce(function(s,e){return s+e.price;},0);
  var unitPrice = p.price + extrasPrice;
  cart.push({ id:p.id, name:p.name, nameAr:p.nameAr, basePrice:p.price, extras:extras, extrasPrice:extrasPrice,
    unitPrice:unitPrice, totalPrice:unitPrice*qty, qty:qty, img:p._img||null, priceNote:p.priceNote||'جنيه',
    isStarter:false, localOnly: p.localOnly !== undefined ? p.localOnly : p.catalog !== 'tools' });
  qtyState[id]=1; extrasState[id]=[];
  document.querySelectorAll('[data-extra="'+id+'"]').forEach(function(cb){cb.checked=false;});
  syncQty(id);
  toast('اتضاف للسلة');
  updateCartUI();
}
function addStarterToCart(id){
  var p = PRODUCTS.find(function(x){return x.id===id;});
  if (!p) return;
  var grams = gramState[id] || 1;
  var total = (p.pricePerGram||0) * grams;
  cart.push({ id:p.id, name:p.name, nameAr:p.nameAr+' ('+grams+' جرام)', basePrice:total, extras:[], extrasPrice:0,
    totalPrice:total, unitPrice:total, qty:1, img:p._img||null, priceNote:'جنيه', isStarter:true,
    localOnly: p.localOnly !== undefined ? p.localOnly : p.catalog !== 'tools' });
  gramState[id]=1; syncGram(id);
  toast('اتضاف للسلة');
  updateCartUI();
}

// ---------- الليتباكس ----------
function openLightboxFor(id){
  var p = PRODUCTS.find(function(x){return x.id===id;});
  if (!p) return;
  var imgs = [p._img, p._img2].filter(Boolean);
  if (!imgs.length) return;
  lb = { open:true, images:imgs, idx:0 };
  renderLightbox();
}
function renderLightbox(){
  var el = document.getElementById('lightbox');
  el.classList.toggle('open', lb.open);
  if (!lb.open) return;
  document.getElementById('lightboxImg').src = lb.images[lb.idx];
  document.getElementById('lbNav').style.display = lb.images.length>1 ? 'flex' : 'none';
  document.getElementById('lbDots').innerHTML = lb.images.length>1
    ? lb.images.map(function(_,i){return '<div class="lb-dot'+(i===lb.idx?' active':'')+'" data-lbdot="'+i+'"></div>';}).join('')
    : '';
  document.querySelectorAll('[data-lbdot]').forEach(function(d){
    d.onclick = function(){ lb.idx = +d.dataset.lbdot; renderLightbox(); };
  });
}
document.getElementById('lbClose').onclick = function(){ lb.open=false; renderLightbox(); };
document.getElementById('lbPrevBtn').onclick = function(){ lb.idx = (lb.idx+1)%lb.images.length; renderLightbox(); };
document.getElementById('lbNextBtn').onclick = function(){ lb.idx = (lb.idx-1+lb.images.length)%lb.images.length; renderLightbox(); };
document.getElementById('lightbox').addEventListener('click', function(e){ if (e.target.id==='lightbox') { lb.open=false; renderLightbox(); } });
document.addEventListener('keydown', function(e){
  if (!lb.open) return;
  if (e.key==='Escape') { lb.open=false; renderLightbox(); }
  if (e.key==='ArrowLeft') document.getElementById('lbPrevBtn').click();
  if (e.key==='ArrowRight') document.getElementById('lbNextBtn').click();
});

// ---------- نافذة "طريقة الاستخدام" ----------
function openNotes(id){
  var p = PRODUCTS.find(function(x){return x.id===id;});
  if (!p || !hasNotes(p)) return;
  var blocks = parseNotes(p.notes);
  var html = '<div class="notes-overlay" role="dialog" aria-modal="true" id="notesOverlay"><div class="notes-box">'+
    '<div class="notes-head"><div><span class="notes-eyebrow">طريقة الاستخدام</span><h3>'+esc(p.nameAr||p.name)+'</h3></div>'+
    '<button class="notes-close" id="notesCloseBtn">'+icon('close',18)+'</button></div>'+
    '<div class="notes-body">'+blocks.map(function(b){
      return '<div class="notes-block">'+(b.title?'<h4>'+esc(b.title)+'</h4>':'')+b.lines.map(function(l){return '<p>'+esc(l)+'</p>';}).join('')+'</div>';
    }).join('')+'</div>'+
    '<button class="notes-done" id="notesDoneBtn">تمام، فهمت</button>'+
  '</div></div>';
  document.getElementById('notesRoot').innerHTML = html;
  document.body.style.overflow = 'hidden';
  function close(){ document.getElementById('notesRoot').innerHTML=''; document.body.style.overflow=''; }
  document.getElementById('notesCloseBtn').onclick = close;
  document.getElementById('notesDoneBtn').onclick = close;
  document.getElementById('notesOverlay').onclick = function(e){ if (e.target.id==='notesOverlay') close(); };
}

// ---------- القائمة الجانبية والسلة ----------
document.getElementById('hamburger').onclick = function(){
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('sideMenu').classList.toggle('open');
  document.getElementById('menuOverlay').classList.toggle('open');
};
function closeMenu(){
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('sideMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('open');
}
document.getElementById('menuClose').onclick = closeMenu;
document.getElementById('menuOverlay').onclick = closeMenu;
document.getElementById('logoHome').onclick = function(){ window.scrollTo({top:0,behavior:'smooth'}); closeMenu(); };
document.querySelectorAll('[data-nav="demo"]').forEach(function(a){
  a.addEventListener('click', function(e){ e.preventDefault(); closeMenu(); toast('الصفحة دي مش في نسخة العرض — دي بس لعرض تصميم الهوم بيدج'); });
});
document.querySelector('[data-nav="home"]').addEventListener('click', function(e){ e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'}); closeMenu(); });
document.getElementById('socialToggle').onclick = function(){
  var sub = document.getElementById('socialSubmenu');
  var open = sub.classList.toggle('open');
  document.getElementById('socialChevron').style.transform = open ? 'rotate(90deg)' : 'scaleX(-1)';
};

var cartOpen = false;
function setCartOpen(v){
  cartOpen = v;
  document.getElementById('cartSidebar').classList.toggle('open', v);
  document.getElementById('cartOverlay').classList.toggle('open', v);
  document.body.classList.toggle('cart-open', v);
}
document.getElementById('cartFab').onclick = function(){ setCartOpen(true); };
document.getElementById('cartClose').onclick = function(){ setCartOpen(false); };
document.getElementById('cartOverlay').onclick = function(){ setCartOpen(false); };

var orderForm = { name:'', phone:'', zone:'', area:'', province:'', street:'' };

function cartTotal(){ return cart.reduce(function(s,i){return s+i.totalPrice;},0); }

function updateCartUI(){
  document.getElementById('cartCount').textContent = cart.reduce(function(s,i){return s+(i.isStarter?1:i.qty);},0);
  var itemsEl = document.getElementById('cartItems');
  if (!cart.length) {
    itemsEl.innerHTML = '<div class="cart-empty"><div class="empty-icon">'+icon('bag',40)+'</div><p>السلة فاضية دلوقتي</p></div>';
  } else {
    itemsEl.innerHTML = cart.map(function(it, idx){
      return '<div class="cart-item"><div class="cart-item-thumb">'+(it.img?'<img src="'+it.img+'" alt="">':icon('bread',26))+'</div>'+
        '<div class="cart-item-info"><div class="cart-item-name">'+esc(it.name)+' — '+esc(it.nameAr)+'</div>'+
        (it.extras&&it.extras.length ? '<div class="cart-item-extras">إضافات: '+it.extras.map(function(e){return e.name;}).join('، ')+'</div>' : '')+
        '<div class="cart-item-price">'+it.totalPrice+' '+(it.priceNote||'جنيه')+'</div>'+
        (!it.isStarter ? '<div class="cart-item-qty"><button class="qty-btn" data-cqty-minus="'+idx+'">−</button><span class="qty-num">'+it.qty+'</span><button class="qty-btn" data-cqty-plus="'+idx+'">+</button></div>' : '')+
        '</div><button class="remove-item" data-cremove="'+idx+'">'+icon('trash',17)+'</button></div>';
    }).join('');
  }
  document.querySelectorAll('[data-cremove]').forEach(function(b){ b.onclick=function(){ cart.splice(+b.dataset.cremove,1); updateCartUI(); }; });
  document.querySelectorAll('[data-cqty-plus]').forEach(function(b){ b.onclick=function(){ var i=+b.dataset.cqtyPlus; cart[i].qty++; cart[i].totalPrice=cart[i].unitPrice*cart[i].qty; updateCartUI(); }; });
  document.querySelectorAll('[data-cqty-minus]').forEach(function(b){ b.onclick=function(){ var i=+b.dataset.cqtyMinus; if(cart[i].qty>1){cart[i].qty--; cart[i].totalPrice=cart[i].unitPrice*cart[i].qty; updateCartUI();} }; });
  renderOrderForm();
}

function renderOrderForm(){
  var wrap = document.getElementById('orderFormWrap');
  if (!cart.length) { wrap.innerHTML=''; return; }
  var forcedLocal = cart.some(function(i){return i.localOnly;});
  var zone = forcedLocal ? 'banha' : orderForm.zone;
  var govFee = zone==='nationwide' ? (D.GOVERNORATE_RATES[orderForm.province]||null) : null;
  var deliveryFee = zone==='nationwide' ? govFee : null;
  var feeUnknown = zone==='banha' || (zone==='nationwide' && orderForm.province===D.OTHER_GOVERNORATE);

  var html = '<div class="order-form-section"><h4>'+icon('clipboard',17)+' بيانات الطلب</h4>'+
    '<div class="form-group"><label>'+icon('user',15,'')+'الاسم *</label><input id="ofName" placeholder="اكتب اسمك" value="'+esc(orderForm.name)+'"></div>'+
    '<div class="form-group"><label>'+icon('phone',15,'')+'رقم الهاتف *</label><input id="ofPhone" placeholder="01xxxxxxxxx" value="'+esc(orderForm.phone)+'">'+
      '<div class="form-hint">لازم يكون الرقم ده عليه واتساب — بنتواصل بيه لتأكيد الطلب أو سعر التوصيل</div></div>';

  if (forcedLocal) {
    html += '<div class="delivery-estimate" style="margin-bottom:11px"><div class="del-note">في طلبك منتجات (خبز/خميرة سائلة) بتتوصل لبنها بس، فالتوصيل هيكون بنها.</div></div>';
  } else {
    html += '<div class="form-group"><label>'+icon('truck',15,'')+'منطقة التوصيل *</label><select id="ofZone">'+
      '<option value="">اختار منطقة التوصيل...</option>'+
      '<option value="banha"'+(orderForm.zone==='banha'?' selected':'')+'>بنها ومحيطها</option>'+
      '<option value="nationwide"'+(orderForm.zone==='nationwide'?' selected':'')+'>محافظة تانية (خارج بنها)</option></select></div>';
  }

  if (zone==='banha') {
    html += '<div class="form-group"><label>'+icon('pin',15,'')+'المنطقة (بنها) *</label><select id="ofArea"><option value="">اختار منطقتك...</option>'+
      D.AREA_NAMES.map(function(a){return '<option'+(orderForm.area===a?' selected':'')+'>'+esc(a)+'</option>';}).join('')+'</select>'+
      (orderForm.area ? '<div class="delivery-estimate"><div class="del-note">'+D.BANHA_DELIVERY_NOTE+' — بنتفق عليه بعد ما تبعتلنا.</div></div>' : '')+'</div>';
  }
  if (zone==='nationwide') {
    html += '<div class="form-group"><label>'+icon('map',15,'')+'المحافظة *</label><select id="ofProvince"><option value="">اختار المحافظة...</option>'+
      D.GOVERNORATE_NAMES.map(function(g){return '<option'+(orderForm.province===g?' selected':'')+'>'+esc(g)+'</option>';}).join('')+
      '<option value="'+D.OTHER_GOVERNORATE+'"'+(orderForm.province===D.OTHER_GOVERNORATE?' selected':'')+'>'+D.OTHER_GOVERNORATE+'</option></select>'+
      (orderForm.province && orderForm.province!==D.OTHER_GOVERNORATE ? '<div class="delivery-estimate"><div class="del-price">التوصيل لـ <strong>'+esc(orderForm.province)+'</strong>: <strong>'+govFee+' جنيه</strong></div></div>' : '')+
      (orderForm.province===D.OTHER_GOVERNORATE ? '<div class="delivery-estimate"><div class="del-note">هنقولك سعر التوصيل على رقم الهاتف اللي بعته — تأكد إنه معاه واتساب</div></div>' : '')+
      '</div>';
  }

  html += '<div class="form-group"><label>'+icon('home',15,'')+'الشارع / تفاصيل العنوان *</label><input id="ofStreet" placeholder="اسم الشارع، رقم العمارة..." value="'+esc(orderForm.street)+'"></div>'+
    '<div class="cart-total"><span class="cart-total-label">الإجمالي:</span><span class="cart-total-price">'+(cartTotal()+(deliveryFee||0))+' جنيه'+(feeUnknown?' + توصيل':'')+'</span></div>'+
    '<button class="checkout-btn" id="checkoutBtn">'+icon('check',18)+' تأكيد الطلب</button></div>';

  wrap.innerHTML = html;

  var nameEl=document.getElementById('ofName'), phoneEl=document.getElementById('ofPhone'), streetEl=document.getElementById('ofStreet');
  if (nameEl) nameEl.oninput = function(){ orderForm.name = nameEl.value; };
  if (phoneEl) phoneEl.oninput = function(){ orderForm.phone = phoneEl.value; };
  if (streetEl) streetEl.oninput = function(){ orderForm.street = streetEl.value; };
  var zoneEl=document.getElementById('ofZone');
  if (zoneEl) zoneEl.onchange = function(){ orderForm.zone=zoneEl.value; orderForm.area=''; orderForm.province=''; renderOrderForm(); };
  var areaEl=document.getElementById('ofArea');
  if (areaEl) areaEl.onchange = function(){ orderForm.area=areaEl.value; renderOrderForm(); };
  var provEl=document.getElementById('ofProvince');
  if (provEl) provEl.onchange = function(){ orderForm.province=provEl.value; renderOrderForm(); };
  document.getElementById('checkoutBtn').onclick = confirmOrder;
}

function money(n){ return String(Math.round((Number(n)||0)*100)/100); }
function depositFor(t){ return Math.ceil((Number(t)||0)*D.DEPOSIT_RATIO); }
function remainderFor(t){ return Math.round(((Number(t)||0)-depositFor(t))*100)/100; }

function confirmOrder(){
  if (!orderForm.name.trim()) return toast('من فضلك اكتب اسمك');
  if (!orderForm.phone.trim()) return toast('من فضلك اكتب رقم هاتفك');
  var forcedLocal = cart.some(function(i){return i.localOnly;});
  var zone = forcedLocal ? 'banha' : orderForm.zone;
  if (!zone) return toast('اختار منطقة التوصيل');
  if (zone==='banha' && !orderForm.area.trim()) return toast('اختار منطقتك في بنها');
  if (zone==='nationwide' && !orderForm.province.trim()) return toast('اختار المحافظة');
  if (!orderForm.street.trim()) return toast('من فضلك اكتب الشارع/العنوان بالتفصيل');
  if (!cart.length) return toast('السلة فاضية');

  var govFee = zone==='nationwide' ? (D.GOVERNORATE_RATES[orderForm.province]||null) : null;
  var deliveryFee = zone==='nationwide' ? govFee : null;
  var total = cartTotal() + (deliveryFee||0);
  var deposit = depositFor(total), remainder = remainderFor(total);
  var id = 'PRVW-' + Date.now().toString(36).toUpperCase();

  var place = zone==='banha' ? 'بنها' : (orderForm.province||'');
  var lines = ['[نسخة عرض تصميم — مش طلب حقيقي] طلب تجريبي من موقع دودو ساوردو','',
    'رقم الطلب: '+id, 'الاسم: '+orderForm.name, 'التليفون: '+orderForm.phone,
    'العنوان: '+[place, orderForm.area, orderForm.street].filter(Boolean).join(' — '), '', 'الطلب:'];
  cart.forEach(function(it){
    var qty = it.isStarter ? '' : ' ×'+(it.qty||1);
    lines.push('• '+(it.nameAr||it.name)+qty+' — '+money(it.totalPrice)+' '+(it.priceNote||'جنيه'));
    if (it.extras && it.extras.length) lines.push('   إضافات: '+it.extras.map(function(e){return e.name;}).join('، '));
  });
  lines.push('');
  if (deliveryFee!=null) lines.push('التوصيل: '+money(deliveryFee)+' جنيه');
  lines.push('الإجمالي: '+money(total)+' جنيه');
  var waUrl = 'https://wa.me/'+D.WHATSAPP_NUMBER+'?text='+encodeURIComponent(lines.join('\\n'));

  cart = []; orderForm = { name:'', phone:'', zone:'', area:'', province:'', street:'' };
  setCartOpen(false);
  updateCartUI();
  showDonePopup({ id:id, total:total, deposit:deposit, remainder:remainder, url:waUrl });
}

function showDonePopup(done){
  var html = '<div class="done-popup open" id="donePopupEl"><div class="done-box">'+
    '<div class="done-icon">'+icon('checkCircle',32)+'</div><h3>طلبك اتسجل</h3>'+
    '<p class="done-id">رقم الطلب: <strong>'+done.id+'</strong></p>'+
    '<div class="dep-box"><span class="dep-label">المطلوب دفعه دلوقتي كعربون</span>'+
    '<span class="dep-amount">'+done.deposit+' <em>جنيه</em></span>'+
    '<span class="dep-rest">الإجمالي '+done.total+' جنيه — الباقي '+done.remainder+' جنيه بعد ما تستلم</span></div>'+
    '<ol class="dep-steps"><li>حوّل <strong>'+done.deposit+' جنيه</strong> على رقم المحفظة'+
    '<div class="dep-wallet" style="cursor:default"><span dir="ltr">01••••••98</span></div>'+
    '<span class="dep-hint">(نسخة عرض — رقم المحفظة الحقيقي بيظهر في الموقع الشغال بس)</span></li>'+
    '<li>ابعتلنا صورة إيصال التحويل على واتساب من الزرار تحت</li>'+
    '<li>أول ما نشوف التحويل بنأكّد طلبك ونبدأ نحضّره</li></ol>'+
    '<a href="'+done.url+'" target="_blank" rel="noreferrer" class="done-wa">'+icon('chat',19)+' ابعت على واتساب (تجريبي)</a>'+
    '<button class="done-close" id="doneCloseBtn">أقفل</button></div></div>';
  document.getElementById('doneRoot').innerHTML = html;
  document.getElementById('doneCloseBtn').onclick = function(){ document.getElementById('doneRoot').innerHTML=''; };
  document.getElementById('donePopupEl').onclick = function(e){ if (e.target.id==='donePopupEl') document.getElementById('doneRoot').innerHTML=''; };
}

render();
})();
`;
}

// ---------- التشغيل ----------

async function main() {
  log("\n▸ نسخة البورتفوليو — دودو ساوردو\n");

  log("1. بجيب المنتجات من " + SITE);
  const res = await fetch(SITE + "/api/products");
  if (!res.ok) throw new Error("فشل جلب المنتجات — HTTP " + res.status);
  const products = ((await res.json()).products || []).filter((p) => p.active !== false);
  log(`   · ${products.length} منتج`);

  log("2. بحمّل صور المنتجات");
  for (const p of products) {
    p._img = await inline(firstUrl(p.mainImg));
    p._img2 = await inline(firstUrl(p.secondImg));
  }

  log("3. بحمّل صور الهوية (اللوجو والكوفر)");
  const assets = {
    logoClear: await inline("/logo-clear.png"),
    logoSmall: await inline("/logo.png"),
    logo512: await inline("/logo_512x512.png"),
    cover: await inline("/cover-bread.jpg"),
  };

  log("4. بحمّل الخطوط");
  const fonts = await fontsCss();

  log("5. ببني الصفحة");
  const css = fs.readFileSync(path.join(ROOT, "styles", "globals.css"), "utf8");
  const generatedAt = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  const html = pageHtml({ css, fonts, products, assets, generatedAt });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, "dodo-sourdough-preview.html");
  fs.writeFileSync(out, html, "utf8");

  const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
  log(`\n✓ خلص — ${mb} ميجا`);
  log(`  ${out}\n`);
  log("  ابعته زي ما هو على واتساب. اللي بيستلمه بيدوس عليه وبيفتح بأي متصفح، من غير نت.\n");
}

main().catch((e) => {
  console.error("\n✗ وقف: " + e.message + "\n");
  process.exit(1);
});
