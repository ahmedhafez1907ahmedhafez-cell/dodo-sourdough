import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "../../components/AdminGuard";
import { useAdminAuth } from "../../lib/useAdminAuth";

function ReviewsDashboard() {
  const { authedFetch, user, loading: authLoading } = useAdminAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reviews");
    const data = await res.json();
    setReviews(data.reviews || []);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteReview(id) {
    if (!confirm("متأكد إنك عايز تحذف التعليق ده نهائياً؟")) return;
    const prev = reviews;
    setReviews((r) => r.filter((x) => x.id !== id)); // optimistic
    const res = await authedFetch(`/api/reviews?id=${id}`, { method: "DELETE" });
    if (!res.ok) setReviews(prev);
  }

  return (
    <div className="adm" style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl", padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>💬 التعليقات</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ border: "none", background: "none", color: "#1b7a3d", cursor: "pointer" }}>تحديث</button>
          <Link href="/admin">الطلبات</Link>
          <Link href="/admin/products">المنتجات</Link>
          <Link href="/admin/content">المحتوى</Link>
        </div>
      </div>
      {loading && <p>جاري التحميل...</p>}
      {!loading && !reviews.length && <p style={{ color: "#888" }}>مفيش تعليقات</p>}
      {reviews.map((rev) => (
        <div key={rev.id} style={{ background: "#f7f3ec", borderRadius: 10, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <strong>{rev.name}</strong> <span style={{ fontSize: 12 }}>{"⭐".repeat(rev.stars || 5)}</span>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#555" }}>{rev.text}</p>
            <span style={{ fontSize: 11, color: "#999" }}>{(rev.createdAt || "").slice(0, 16).replace("T", " ")}</span>
          </div>
          <button
            onClick={() => deleteReview(rev.id)}
            title="حذف التعليق"
            style={{ border: "none", background: "none", color: "#e74c3c", cursor: "pointer", fontSize: 18, alignSelf: "flex-start" }}
          >🗑️</button>
        </div>
      ))}
    </div>
  );
}

export default function AdminReviews() {
  return (
    <AdminGuard>
      <ReviewsDashboard />
    </AdminGuard>
  );
}
