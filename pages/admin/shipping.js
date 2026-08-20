// ============================================================
// صفحة التجهيز للشحن — /admin/shipping
//
// حاجتين في صفحة واحدة:
//   1) ملصقات: كل طلب في ملصق تقصه وتلزقه على الطرد
//   2) كشف اليوم: ورقة واحدة فيها كل الطلبات، تمضيها مع المندوب
//
// ⚠️ الصفحة دي مستقلة تماماً عن أي شركة شحن — بتشتغل مع بوسطة
//    و J&T وأي حد. لو غيّرت الشركة بكرة، الصفحة دي متتغيرش.
//
// الطباعة: كل حاجة غير المحتوى بتختفي في @media print (شوف globals.css)
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "../../components/AdminGuard";
import { useAdminAuth } from "../../lib/useAdminAuth";
import { AWAITING_DEPOSIT } from "../../lib/orderStatus";

/** العنوان كامل في سطر واحد مقروء */
function fullAddress(o) {
  const place = o.zone === "banha" ? "بنها" : o.province;
  const extra = [
    o.building && `عمارة ${o.building}`,
    o.floor && `دور ${o.floor}`,
    o.flat && `شقة ${o.flat}`,
  ].filter(Boolean).join(" - ");
  return [place, o.area, o.street, extra].filter(Boolean).join(" — ");
}

function itemsSummary(o) {
  return (o.items || [])
    .map((i) => `${i.nameAr || i.name || "منتج"}${i.isStarter ? "" : ` ×${i.qty || 1}`}`)
    .join("، ");
}

function ShippingSheets() {
  const { authedFetch } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("labels"); // labels | manifest
  const [scope, setScope] = useState("ready"); // ready | today | all
  const [picked, setPicked] = useState(() => new Set());

  useEffect(() => {
    (async () => {
      const res = await authedFetch("/api/orders");
      const data = await res.json().catch(() => ({}));
      setOrders(res.ok ? (data.orders || []) : []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // الطلبات الجاهزة للشحن: العربون اتأكد ولسه ماتسلمتش ولا اتلغت
  const candidates = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return orders.filter((o) => {
      if (o.status === "ملغي" || o.status === "تم التوصيل") return false;
      if (scope === "all") return true;
      if (scope === "today") return (o.createdAt || "").slice(0, 10) === todayStr;
      return o.depositPaid && o.status !== AWAITING_DEPOSIT;
    });
  }, [orders, scope]);

  // أول ما القايمة تتغير، بنحدد الكل — أسرع حاجة في الاستخدام اليومي
  useEffect(() => { setPicked(new Set(candidates.map((o) => o.id))); }, [candidates]);

  const selected = candidates.filter((o) => picked.has(o.id));
  const totalDue = selected.reduce((s, o) => s + (Number(o.total) || 0) - (Number(o.deposit) || 0), 0);

  function toggle(id) {
    setPicked((s) => {
      const c = new Set(s);
      if (c.has(id)) c.delete(id); else c.add(id);
      return c;
    });
  }

  return (
    <div className="adm ship-page" style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl", padding: 20, maxWidth: 1000, margin: "0 auto" }}>

      <div className="ship-ui">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h2>تجهيز الشحن</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/admin">الطلبات</Link>
            <Link href="/admin/products">المنتجات</Link>
          </div>
        </div>

        <div className="ship-controls">
          <div className="ship-seg">
            <button className={view === "labels" ? "on" : ""} onClick={() => setView("labels")}>ملصقات</button>
            <button className={view === "manifest" ? "on" : ""} onClick={() => setView("manifest")}>كشف اليوم</button>
          </div>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="ready">الجاهزة للشحن (العربون اتأكد)</option>
            <option value="today">طلبات النهاردة</option>
            <option value="all">كل الطلبات المفتوحة</option>
          </select>
          <button className="ship-print" onClick={() => window.print()} disabled={!selected.length}>
            اطبع ({selected.length})
          </button>
        </div>

        {loading && <p>جاري التحميل...</p>}
        {!loading && !candidates.length && <p style={{ color: "#888" }}>مفيش طلبات في القايمة دي</p>}

        {!!candidates.length && (
          <div className="ship-pick">
            {candidates.map((o) => (
              <label key={o.id}>
                <input type="checkbox" checked={picked.has(o.id)} onChange={() => toggle(o.id)} />
                <span>{o.customerName}</span>
                <em>{o.zone === "banha" ? "بنها" : o.province}</em>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ---------- اللي بيتطبع ---------- */}
      {view === "labels" ? (
        <div className="labels-sheet">
          {selected.map((o) => (
            <div className="ship-label" key={o.id}>
              <div className="lbl-brand">دودو ساوردو <span>Dodo Sourdough</span></div>
              <div className="lbl-name">{o.customerName}</div>
              <div className="lbl-phone" dir="ltr">{o.customerPhone}</div>
              <div className="lbl-addr">{fullAddress(o)}</div>
              <div className="lbl-foot">
                <span>طلب {String(o.id).slice(0, 6)}</span>
                <span className="lbl-due">
                  {Number(o.total) - Number(o.deposit || 0) > 0
                    ? `المطلوب: ${Math.round((Number(o.total) - Number(o.deposit || 0)) * 100) / 100} ج`
                    : "مدفوع بالكامل"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="manifest-sheet">
          <div className="mf-head">
            <div>
              <h3>كشف تسليم شحنات</h3>
              <p>دودو ساوردو — {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <div className="mf-count">{selected.length} شحنة</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th><th>الاسم</th><th>التليفون</th><th>العنوان</th><th>المطلوب</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((o, i) => (
                <tr key={o.id}>
                  <td>{i + 1}</td>
                  <td>{o.customerName}</td>
                  <td dir="ltr">{o.customerPhone}</td>
                  <td className="mf-addr">{fullAddress(o)}</td>
                  <td>{Math.round((Number(o.total) - Number(o.deposit || 0)) * 100) / 100}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mf-total">إجمالي المطلوب تحصيله: <strong>{Math.round(totalDue * 100) / 100} جنيه</strong></div>

          <div className="mf-sign">
            <div><span>اسم المندوب</span><i></i></div>
            <div><span>التوقيع</span><i></i></div>
            <div><span>التاريخ والساعة</span><i></i></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AdminGuard>
      <ShippingSheets />
    </AdminGuard>
  );
}
