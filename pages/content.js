import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useCardReveal } from "../lib/useMotion";
import { CONTENT_TYPES } from "../lib/contentTypes";

const PLATFORMS = [
  { key: "instagram", label: "📸 انستجرام", color: "#dc2743" },
  { key: "tiktok", label: "🎵 تيك توك", color: "#111" },
  { key: "facebook", label: "📘 فيسبوك", color: "#1877F2" },
  { key: "youtube", label: "▶️ يوتيوب", color: "#FF0000" },
];

const PROFILE_LINKS = {
  instagram: "https://www.instagram.com/dodosourdogh",
  tiktok: "https://www.tiktok.com/@dodo.sourdough",
  facebook: "https://www.facebook.com/profile.php?id=61574499401410",
  youtube: "https://www.youtube.com/@DodoSourdough/videos",
};

function getYoutubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
    else id = u.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export default function Content() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("instagram");
  const [subtype, setSubtype] = useState("all");

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(
    () => items.filter((i) => i.platform === platform && (subtype === "all" || i.type === subtype)),
    [items, platform, subtype]
  );

  useCardReveal([list, loading, platform, subtype]);

  function selectPlatform(p) { setPlatform(p); setSubtype("all"); }

  // بعد ما تتحمل السكريبتات (instagram/tiktok/facebook) نقولهم يعيدوا معالجة
  // أي بطاقات جديدة ظهرت (لما نغيّر منصة أو نوع، أو أول تحميل)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
      if (window.FB?.XFBML?.parse) window.FB.XFBML.parse();
      if (window.tiktokEmbed?.lib?.render) window.tiktokEmbed.lib.render();
    }, 600);
    return () => clearTimeout(t);
  }, [list]);

  return (
    <div className="gallery-page">
      {/* سكريبتات الـ embed بتاعة كل منصة — من غيرهم البوستات مبتظهرش خالص */}
      <div id="fb-root"></div>
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => window.instgrm?.Embeds?.process()}
      />
      <Script
        src="https://www.tiktok.com/embed.js"
        strategy="lazyOnload"
      />
      <Script
        src="https://connect.facebook.net/ar_AR/sdk.js#xfbml=1&version=v19.0"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        onLoad={() => window.FB?.XFBML?.parse()}
      />
      <div className="section-title">
        <span className="eyebrow">Content</span>
        <h2>المحتوى 📱</h2>
        <div className="title-line"></div>
        <p>آخر منشوراتنا من كل صفحاتنا في مكان واحد</p>
      </div>

      <div className="filter-section" style={{ background: "transparent", border: "none" }}>
        {PLATFORMS.map((p) => (
          <button key={p.key} className={"filter-btn" + (platform === p.key ? " active" : "")} onClick={() => selectPlatform(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {CONTENT_TYPES[platform]?.length > 1 && (
        <div className="filter-section" style={{ background: "transparent", border: "none", paddingTop: 0 }}>
          <button className={"filter-btn" + (subtype === "all" ? " active" : "")} onClick={() => setSubtype("all")}>الكل</button>
          {CONTENT_TYPES[platform].map((t) => (
            <button key={t.key} className={"filter-btn" + (subtype === t.key ? " active" : "")} onClick={() => setSubtype(t.key)}>{t.label}</button>
          ))}
        </div>
      )}

      <div className="gallery-page-wrap" style={{ maxWidth: 640 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <a href={PROFILE_LINKS[platform]} target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: "inline-flex" }}>
            شوف كل حاجة على {PLATFORMS.find((p) => p.key === platform)?.label} ↗
          </a>
        </div>

        {loading && <p style={{ color: "#ccc", textAlign: "center" }}>جاري التحميل...</p>}
        {!loading && !list.length && (
          <p style={{ color: "rgba(245,240,232,0.7)", textAlign: "center" }}>لسه مفيش منشورات مضافة من الصفحة دي.</p>
        )}

        <div style={{ display: "grid", gap: 24 }}>
          {list.map((it, idx) => (
            <div key={it.id} className="reveal" style={{ transitionDelay: Math.min(idx * 0.08, 0.5) + "s", background: "#fff", borderRadius: 16, overflow: "hidden", padding: platform === "youtube" ? 0 : 8 }}>
              {it.caption && <p style={{ padding: "10px 14px 0", fontSize: 13, color: "#555" }}>{it.caption}</p>}
              <EmbedCard platform={it.platform} url={it.url} />
              <div style={{ padding: "10px 14px" }}>
                <a href={it.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
                  ❤️ لايك / كومنت على المنشور الأصلي ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmbedCard({ platform, url }) {
  if (platform === "youtube") {
    const embedUrl = getYoutubeEmbedUrl(url);
    if (!embedUrl) return <p style={{ padding: 14, fontSize: 13 }}>رابط يوتيوب مش مفهوم</p>;
    return (
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
        <iframe
          src={embedUrl}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }
  if (platform === "instagram") {
    return (
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ margin: "0 auto", maxWidth: 540, width: "100%", minHeight: 200 }}
      >
        <a href={url} target="_blank" rel="noreferrer">عرض المنشور على انستجرام</a>
      </blockquote>
    );
  }
  if (platform === "tiktok") {
    const idMatch = url.match(/\/video\/(\d+)/);
    return (
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={idMatch ? idMatch[1] : ""}
        style={{ margin: "0 auto", maxWidth: 605, width: "100%", minHeight: 200 }}
      >
        <a href={url} target="_blank" rel="noreferrer">عرض الفيديو على تيك توك</a>
      </blockquote>
    );
  }
  if (platform === "facebook") {
    return (
      <div
        className="fb-post"
        data-href={url}
        data-width="500"
        style={{ margin: "0 auto", minHeight: 200 }}
      >
        <a href={url} target="_blank" rel="noreferrer">عرض المنشور على فيسبوك</a>
      </div>
    );
  }
  return null;
}