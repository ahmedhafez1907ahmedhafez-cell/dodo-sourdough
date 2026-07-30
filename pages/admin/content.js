import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "../../components/AdminGuard";
import { useAdminAuth } from "../../lib/useAdminAuth";
import { CONTENT_TYPES } from "../../lib/contentTypes";

const PLATFORMS = [
  { key: "instagram", label: "📸 انستجرام" },
  { key: "tiktok", label: "🎵 تيك توك" },
  { key: "facebook", label: "📘 فيسبوك" },
  { key: "youtube", label: "▶️ يوتيوب" },
];

function ContentAdmin() {
  const { authedFetch, logout, user, loading: authLoading } = useAdminAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("instagram");
  const [type, setType] = useState(CONTENT_TYPES.instagram[0].key);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/content");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }
  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user]); // eslint-disable-line

  async function submit(e) {
    e.preventDefault();
    if (!url.trim()) { setMsg("⚠️ الصق رابط المنشور الأول"); return; }
    setBusy(true);
    setMsg("");
    try {
      const res = await authedFetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, type, url: url.trim(), caption: caption.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      setMsg("✅ اتضاف!");
      setUrl(""); setCaption("");
      load();
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("تحذف المنشور ده من الموقع؟")) return;
    await authedFetch(`/api/content/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="adm" style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl", padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2>📱 المحتوى</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin">الطلبات</Link>
          <Link href="/admin/products">المنتجات</Link>
          <button onClick={logout} style={{ border: "none", background: "none", color: "#c1541f", cursor: "pointer" }}>خروج</button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.8 }}>
        كل ما تنشر بوست/ريل/فيديو على أي صفحة من صفحاتك، الصق اللينك بتاعه هنا
        وهيظهر في صفحة "المحتوى" على الموقع. اللايك والكومنت بيروحوا للمنشور
        الأصلي على المنصة نفسها — الموقع بس بيعرضه.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginBottom: 30 }}>
        <select value={platform} onChange={(e) => { setPlatform(e.target.value); setType(CONTENT_TYPES[e.target.value][0].key); }}>
          {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {CONTENT_TYPES[platform].map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <input placeholder="الصق رابط المنشور هنا" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input placeholder="وصف قصير (اختياري)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <button disabled={busy} style={{ padding: 12, borderRadius: 8, background: "#1b1410", color: "#fff", border: "none" }}>
          {busy ? "جاري الحفظ..." : "➕ أضف المنشور"}
        </button>
        {msg && <p>{msg}</p>}
      </form>

      <h3>المنشورات الحالية ({items.length})</h3>
      {loading && <p>جاري التحميل...</p>}
      {items.map((it) => (
        <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid #eee", padding: "8px 0" }}>
          <span>{PLATFORMS.find((p) => p.key === it.platform)?.label || it.platform}</span>
          <span style={{ fontSize: 11, color: "#888" }}>{CONTENT_TYPES[it.platform]?.find((t) => t.key === it.type)?.label || ""}</span>
          <a href={it.url} target="_blank" rel="noreferrer" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{it.url}</a>
          <button onClick={() => removeItem(it.id)} style={{ color: "#e74c3c", border: "none", background: "none", cursor: "pointer" }}>🗑️</button>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <AdminGuard>
      <ContentAdmin />
    </AdminGuard>
  );
}
