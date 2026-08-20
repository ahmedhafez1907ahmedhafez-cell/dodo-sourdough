import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "../../components/AdminGuard";
import { useAdminAuth } from "../../lib/useAdminAuth";

import { ORDER_STATUSES as STATUSES, AWAITING_DEPOSIT } from "../../lib/orderStatus";
import Icon from "../../components/Icon";

// wa.me عايز الرقم بكود الدولة من غير + أو صفر في الأول (زي "20106...").
// أرقام العملاء متخزنة "01xxxxxxxxx" فبنبدّل الصفر بـ 20. من غير نص —
// كده هو اللي بيكتب الرسالة بنفسه لما الشات يفتح.
function waChatLink(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("20") ? digits : digits.startsWith("0") ? "20" + digits.slice(1) : "20" + digits;
  return `https://wa.me/${withCountry}`;
}

// من امتى الأوردر مستني؟ — ده الفرق الحقيقي بين طلب لسه دقايق (عادي)
// وطلب واقف من ساعات كتير (محتاج متابعة). "قفل شاشة العربون" وحدها
// مش مؤشر قوي — أي حد بيعمل أوردر بيشوف الشاشة دي وبيقفلها فوراً
// عشان يكمل، سواء هيدفع أو لأ.
function hoursSince(iso) {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}
function depositAgeClass(hrs) {
  if (hrs >= 24) return "overdue";
  if (hrs >= 3) return "stale";
  return "";
}
function ageLabel(hrs) {
  if (hrs >= 48) return `من ${Math.floor(hrs / 24)} يوم`;
  if (hrs >= 24) return "من يوم تقريباً";
  if (hrs >= 1) return `من ${Math.floor(hrs)} ساعة`;
  return "دلوقتي";
}

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
    // تغيير الحالة معناه إن العربون وصل (السيرفر بيعمل نفس الحاجة)
    setOrders((o) => o.map((x) => (x.id === id
      ? { ...x, status, depositPaid: status === AWAITING_DEPOSIT ? false : status === "ملغي" ? x.depositPaid : true, shipmentError: status === AWAITING_DEPOSIT ? x.shipmentError : null }
      : x))); // optimistic
    const res = await authedFetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { load(); return; } // رجّع الحالة الصح لو فشل
    if (data.cancelNote) alert(data.cancelNote);
  }

  // تأكيد العربون — ده اللي بيبعت الشحنة لبوسطة. مفيش أوردر
  // بيتشحن قبل ما تدوس هنا.
  const [depBusy, setDepBusy] = useState(null);
  async function setDeposit(id, paid) {
    // أوردرات بنها بنوصّلها بنفسنا، فمش بتروح لبوسطة — الرسالة
    // لازم تقول ده صح عشان متتلخبطش.
    const o = orders.find((x) => x.id === id);
    const localBanha = o?.zone === "banha";
    const msg = localBanha
      ? "متأكد إن العربون وصل؟ الطلب ده بنها — هيتعلّم كمدفوع بس مش هيروح لبوسطة."
      : "متأكد إن العربون وصل؟ الطلب هيتبعت لبوسطة على طول.";
    if (paid && !confirm(msg)) return;
    setDepBusy(id);
    const res = await authedFetch(`/api/orders/${id}/deposit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    const data = await res.json().catch(() => ({}));
    setDepBusy(null);
    if (!res.ok) { alert(data.error || "فشل التأكيد"); return; }
    if (data.shipmentError) {
      alert("العربون اتأكد، بس الشحنة فشلت:\n" + data.shipmentError);
    }
    else if (data.skipped) alert("العربون اتأكد. الشحنة اتخطت: " + data.skipped);
    else if (data.trackingNo) {
      // الشحنة اتعملت — بنفتح البوليصة على طول عشان تطبعها وتلزقها
      alert(`تمام — الشحنة اتعملت\nرقم التتبع: ${data.trackingNo}\n\nهنفتحلك البوليصة دلوقتي عشان تطبعها.`);
      printAwb(id);
    }
    load();
  }

  // بوليصة الشحن — بتتفتح في تاب جديد وبتطبع لوحدها.
  // بوسطة بتطلب تلزقها على الطرد.
  async function printAwb(id) {
    const res = await authedFetch(`/api/orders/${id}/awb`);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "مقدرناش نجيب البوليصة");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    // بنستنى الـ PDF يتحمّل الأول وبعدين نفتح شاشة الطباعة
    if (w) w.addEventListener("load", () => { try { w.print(); } catch {} });
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function deleteOrder(id) {
    if (!confirm("متأكد إنك عايز تحذف الطلب ده نهائياً؟ الخطوة دي مش هترجع.")) return;
    const prev = orders;
    setOrders((o) => o.filter((x) => x.id !== id)); // optimistic
    const res = await authedFetch(`/api/orders/${id}`, { method: "DELETE" });
    if (!res.ok) setOrders(prev); // رجّعه لو فشل
  }

  return (
    <div className="adm" style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl", padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>📦 الطلبات</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ border: "none", background: "none", color: "#1b7a3d", cursor: "pointer" }}>تحديث</button>
          <Link href="/admin/shipping">تجهيز الشحن</Link>
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
        <div key={o.id} style={{ background: o.cancelledByCustomer ? "#fff0f0" : "#f7f3ec", border: o.cancelledByCustomer ? "1px solid #e38a8a" : "1px solid transparent", borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{o.customerName}</strong>
            <span style={{ fontSize: 12, color: "#888" }}>{o.createdAt?.slice(0, 16).replace("T", " ")}</span>
          </div>
          {/* بنوضّح نوع التوصيل الأول: بنها بنوصّلها بنفسنا، وبرّه ببوسطة.
              وبنعرض المحافظة قبل باقي العنوان عشان تبان بسرعة. */}
          <div style={{ fontSize: 12, fontWeight: 700, margin: "3px 0",
            color: o.zone === "banha" ? "#2c7a4b" : "#8a4a28" }}>
            {o.zone === "banha" ? "بنها ومحيطها — توصيل بنفسنا" : "خارج بنها — شحن بوسطة"}
          </div>
          <div style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span>{o.customerPhone} — {[o.zone === "banha" ? o.area : o.province, o.zone === "banha" ? null : o.area, o.street].filter(Boolean).join("، ")}</span>
            {/* بيفتح شات واتساب مع صاحب الأوردر من غير أي رسالة جاهزة —
                إنت اللي بتكتب. بيشتغل على أي أوردر عنده رقم تليفون. */}
            {waChatLink(o.customerPhone) && (
              <a
                href={waChatLink(o.customerPhone)}
                target="_blank"
                rel="noreferrer"
                title="كلّم العميل على واتساب"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#25d366", color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
              >
                <Icon name="chat" size={13} /> واتساب
              </a>
            )}
          </div>
          <div style={{ fontSize: 13, margin: "6px 0" }}>
            {o.items?.map((it, i) => <span key={i}>{it.nameAr} ×{it.qty}{i < o.items.length - 1 ? "، " : ""}</span>)}
          </div>
          <div style={{ fontWeight: 700 }}>
            الإجمالي: {o.total} جنيه{" "}
            <span style={{ fontWeight: 400, fontSize: 13, color: "#777" }}>
              (توصيل {o.zone === "banha" ? "بيتحدد على واتساب" : (o.deliveryFee ?? "لسه متحددش")})
            </span>
          </div>
          {o.cancelledByCustomer && <div style={{ color: "#b42318", fontWeight: 800, marginTop: 8 }}>⚠️ العميل ألغى الطلب بنفسه</div>}

          {/* الكارت بيختفي خالص أول ما العربون يتأكد أو الأوردر يتحرك
              لحالة أبعد — مفيش لازمة لزرار على أوردر خلاص اتحصّل. */}
          {!o.depositPaid && o.status === AWAITING_DEPOSIT && (() => {
            const hrs = hoursSince(o.createdAt);
            const ageCls = depositAgeClass(hrs);
            return (
              <div className={"adm-dep" + (ageCls ? " " + ageCls : "")}>
                <Icon name="clock" size={17} />
                <span className="adm-dep-txt">
                  في انتظار عربون {o.deposit ?? Math.ceil((o.total || 0) / 2)} جنيه
                  {ageCls && <> — {ageLabel(hrs)}</>}
                </span>
                {/* شاف شاشة تعليمات الدفع وقفلها — معلومة إضافية بس،
                    مش تحذير. معظم الطلبات بتاخدها لأن الشاشة دي بتفتح
                    لوحدها بعد كل طلب جديد. */}
                {o.depositPromptClosed && <span className="adm-dep-seen">شاف تعليمات الدفع</span>}
                <button className="adm-dep-yes" disabled={depBusy === o.id}
                  onClick={() => setDeposit(o.id, true)}>
                  {depBusy === o.id ? "..." : "تم استلام العربون"}
                </button>
              </div>
            );
          })()}

          {o.shipmentTrackingNo && (
            <div className="adm-ship ok">
              شحنة بوسطة: {o.shipmentTrackingNo}
              <button className="adm-awb" onClick={() => printAwb(o.id)}>اطبع البوليصة</button>
            </div>
          )}
          {/* الشحنة فشلت والعربون متأكد؟ يبقى محتاج إعادة محاولة —
              من غير الزرار ده الأوردر بيفضل واقف من غير شحنة. */}
          {o.shipmentError && (
            <div className="adm-ship err">
              فشل الشحن: {o.shipmentError}
              {!o.shipmentTrackingNo && o.depositPaid && (
                <button className="adm-retry" disabled={depBusy === o.id}
                  onClick={() => setDeposit(o.id, true)}>
                  {depBusy === o.id ? "..." : "أعد محاولة الشحن"}
                </button>
              )}
            </div>
          )}
          {o.emailError && <div className="adm-ship err">إشعار الإيميل مبعتش: {o.emailError}</div>}
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
