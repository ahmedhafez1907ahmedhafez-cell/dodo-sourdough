import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useCardReveal } from "../lib/useMotion";
import { CONTENT_TYPES } from "../lib/contentTypes";
import Icon from "../components/Icon";

const PLATFORMS = [
  { key: "instagram", label: "انستجرام", icon: "camera", color: "#dc2743" },
  { key: "tiktok", label: "تيك توك", icon: "music", color: "#111" },
  { key: "facebook", label: "فيسبوك", icon: "facebook", color: "#1877F2" },
  { key: "youtube", label: "يوتيوب", icon: "play", color: "#FF0000" },
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

  // انستجرام بس هو اللي محتاج سكريبت SDK يعالج البوستات بعد ما تتحمل.
  // فيسبوك وتيك توك اتحولوا لـ iframe مباشر (شوف EmbedCard) عشان الـ SDK
  // بتاعهم مكنش بيشتغل صح على الدومين الحقيقي (فيسبوك محتاج App ID، وتيك توك
  // كان بيقع لو المنشور نوعه "photo" مش "video").
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
    }, 600);
    return () => clearTimeout(t);
  }, [list]);

  return (
    <div className="gallery-page">
      {/* سكريبت الـ embed بتاع انستجرام بس — من غيره بوستاته مبتظهرش */}
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => window.instgrm?.Embeds?.process()}
      />
      <div className="section-title">
        <span className="eyebrow">Content</span>
        <h2>المحتوى</h2>
        <div className="title-line"></div>
        <p>آخر منشوراتنا من كل صفحاتنا في مكان واحد</p>
      </div>

      <div className="filter-section" style={{ background: "transparent", border: "none" }}>
        {PLATFORMS.map((p) => (
          <button key={p.key} className={"filter-btn" + (platform === p.key ? " active" : "")} onClick={() => selectPlatform(p.key)}>
            <Icon name={p.icon} size={16} /> {p.label}
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
                  <Icon name="heart" size={15} /> لايك / كومنت على المنشور الأصلي ↗
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
    // منشورات "photo" (سلايد شو) مالهاش embed رسمي من تيك توك — بيبان ليها
    // اللينك بس. أما فيديو عادي (/video/ID) فبيتعرض بـ iframe مباشر.
    const idMatch = url.match(/\/video\/(\d+)/);
    const videoId = idMatch ? idMatch[1] : null;
    if (!videoId) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
            عرض المنشور على تيك توك ↗
          </a>
        </div>
      );
    }
    return (
      <div style={{ position: "relative", paddingBottom: "177%", height: 0, maxWidth: 340, margin: "0 auto" }}>
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          allow="encrypted-media"
          allowFullScreen
          title="TikTok video"
        />
      </div>
    );
  }
  if (platform === "facebook") {
    // فيسبوك: iframe مباشر لبلاجن الفيديو/البوست — من غير SDK JS خالص، لأن
    // XFBML مكنش بيرندر أي حاجة على الدومين الحقيقي (محتاج App ID مسجل).
    const encodedUrl = encodeURIComponent(url);
    const isVideoLike = /\/(reel|videos|watch)\b/i.test(url);
    const plugin = isVideoLike ? "video.php" : "post.php";
    return (
      <div style={{ position: "relative", paddingBottom: isVideoLike ? "177%" : "125%", height: 0, maxWidth: 500, margin: "0 auto" }}>
        <iframe
          src={`https://www.facebook.com/plugins/${plugin}?href=${encodedUrl}&show_text=false&width=500`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          scrolling="no"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          title="Facebook post"
        />
      </div>
    );
  }
  return null;
}