import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "../../components/AdminGuard";
import { useAdminAuth } from "../../lib/useAdminAuth";

const STATUSES = ["قيد التحضير", "جاري الشحن", "تم التوصيل", "ملغي"];

function OrdersDashboard() {
  const { authedFetch, logout, user, loading: authLoading } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    const res = await authedFetch("/api/orders");
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "فشل تحميل الطلبات");
      setOrders([]);
    } else {
      setOrders(data.orders || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeStatus(id, status) {
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x))); // optimistic
    const res = await authedFetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) load(); // رجّع الحالة الصح لو فشل
  }

  async function deleteOrder(id) {
    if (!confirm("متأكد إنك عايز تحذف الطلب ده نهائياً؟ الخطوة دي مش هترجع.")) return;
    const prev = orders;
    setOrders((o) => o.filter((x) => x.id !== id)); // optimistic
    const res = await authedFetch(`/api/orders/${id}`, { method: "DELETE" });
    if (!res.ok) setOrders(prev); // رجّعه لو فشل
  }

  return (
    <div style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl", padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>📦 الطلبات</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ border: "none", background: "none", color: "#1b7a3d", cursor: "pointer" }}>تحديث</button>
          <Link href="/admin/products">المنتجات</Link>
          <Link href="/admin/content">المحتوى</Link>
          <Link href="/admin/reviews">التعليقات</Link>
          <button onClick={logout} style={{ border: "none", background: "none", color: "#c1541f", cursor: "pointer" }}>خروج</button>
        </div>
      </div>
      {err && <p style={{ color: "#c1541f", marginBottom: 12 }}>⚠️ {err}</p>}
      {loading && <p>جاري التحميل...</p>}
      {!loading && !err && !orders.length && <p style={{ color: "#888" }}>مفيش طلبات لسه</p>}
      {orders.map((o) => (
        <div key={o.id} style={{ background: "#f7f3ec", borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{o.customerName}</strong>
            <span style={{ fontSize: 12, color: "#888" }}>{o.createdAt?.slice(0, 16).replace("T", " ")}</span>
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>{o.customerPhone} — {o.area}, {o.street}</div>
          <div style={{ fontSize: 13, margin: "6px 0" }}>
            {o.items?.map((it, i) => <span key={i}>{it.nameAr} ×{it.qty}{i < o.items.length - 1 ? "، " : ""}</span>)}
          </div>
          <div style={{ fontWeight: 700 }}>الإجمالي: {o.total} جنيه (توصيل {o.deliveryFee ?? "—"})</div>
          {o.mylerzTrackingNo && <div style={{ fontSize: 12, color: "#1b7a3d" }}>رقم شحنة مايلرز: {o.mylerzTrackingNo}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <select
              value={o.status}
              onChange={(e) => changeStatus(o.id, e.target.value)}
              style={{ padding: 6, borderRadius: 6 }}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => deleteOrder(o.id)}
              style={{ border: "none", background: "none", color: "#e74c3c", cursor: "pointer", fontSize: 18 }}
              title="حذف الطلب"
            >🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <AdminGuard>
      <OrdersDashboard />
    </AdminGuard>
  );
}
