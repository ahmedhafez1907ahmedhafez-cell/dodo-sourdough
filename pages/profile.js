// ============================================================
// صفحة «طلباتي» — من غير تسجيل دخول.
//
// تسجيل الدخول اتشال من الموقع مؤقتاً (الكود بتاعه لسه موجود في
// context/ShopContext.js و pages/api/auth لما ترجع تفعّله)، فالمفضلة
// وسجل الطلبات بقوا متخزنين على الجهاز نفسه — مربوطين بالمتصفح
// مش بحساب. يعني لو العميل غيّر جهاز أو مسح بيانات المتصفح هيضيعوا،
// وده مقبول لأنهم مش بيانات حساسة والأوردر نفسه محفوظ عندك في الأدمن.
// ============================================================

import { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext";
import Icon from "../components/Icon";

export default function MyOrders() {
  const shop = useShop();
  const [favProducts, setFavProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!shop.ready) return;
    const localOrders = shop.getOrders();
    setOrders(localOrders);
    Promise.all(localOrders.filter((o) => o.cancelToken).map(async (o) => {
      const res = await fetch(`/api/orders/${o.id}/customer?token=${encodeURIComponent(o.cancelToken)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return { id: o.id, status: data.status, depositPaid: data.depositPaid };
    })).then((updates) => {
      const valid = updates.filter(Boolean);
      if (!valid.length) return;
      const byId = Object.fromEntries(valid.map((u) => [u.id, u]));
      const next = localOrders.map((o) => byId[o.id] ? { ...o, ...byId[o.id] } : o);
      valid.forEach((u) => shop.replaceOrderLocally(u.id, u));
      setOrders(next);
    }).catch(() => {});
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        const favs = shop.getFavs();
        setFavProducts((d.products || []).filter((p) => favs.includes(p.id)));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.ready]);

  function removeFav(pid) {
    shop.toggleFav(pid);
    setFavProducts((f) => f.filter((p) => p.id !== pid));
  }

  async function cancelOrder(order) {
    if (!order.cancelToken) { shop.showToast("الطلب ده قديم ومش متاح إلغاؤه من الموقع؛ كلمنا على واتساب"); return; }
    if (!confirm("متأكد إنك عايز تلغي الطلب؟")) return;
    const res = await fetch(`/api/orders/${order.id}/customer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: order.cancelToken }) });
    const data = await res.json();
    if (!res.ok) { shop.showToast(data.error || "تعذر إلغاء الطلب"); return; }
    const patch = { status: "ملغي", cancelledByCustomer: true };
    shop.replaceOrderLocally(order.id, patch);
    setOrders((current) => current.map((o) => o.id === order.id ? { ...o, ...patch } : o));
    shop.showToast("تم إلغاء الطلب");
    if (order.depositPaid) window.open(`https://wa.me/201006461698?text=${encodeURIComponent(`ألغيت طلبي رقم ${order.id}، وكنت دفعت العربون. محتاج استرداده.`)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="section-title" style={{ padding: 0, marginBottom: 6 }}>
          <span className="eyebrow">Your Stuff</span>
          <h2>طلباتي</h2>
          <div className="title-line"></div>
        </div>

        <hr className="section-divider" />
        <div className="mine-head" id="favorites"><Icon name="heart" size={16} className="lbl-ico" />المفضلة</div>
        {!favProducts.length && <p className="mine-empty">لسه مضفتش حاجة للمفضلة</p>}
        {favProducts.map((p) => (
          <div className="fav-item" key={p.id}>
            <div className="fav-item-emoji"><Icon name="bread" size={24} /></div>
            <div className="fav-item-info">
              <div className="fav-item-name">{p.nameAr}</div>
              <div className="fav-item-price">{p.isStarter ? `${p.pricePerGram} جنيه/جرام` : `${p.price} جنيه`}</div>
            </div>
            <button className="fav-remove-btn" aria-label="شيل من المفضلة" onClick={() => removeFav(p.id)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}

        <hr className="section-divider" />
        <div className="mine-head"><Icon name="bag" size={16} className="lbl-ico" />طلباتي السابقة</div>
        {!orders.length && <p className="mine-empty">لسه مفيش طلبات</p>}
        {orders.map((o, i) => (
          <div className="order-item" key={i}>
            <div className="order-item-header">
              <span className="order-item-date">{o.date}</span>
              <span className="order-item-status">{o.status}</span>
            </div>
            <div className="order-item-products">{o.items}</div>
            <div className="order-item-total">الإجمالي: {o.total} جنيه</div>
            {o.status !== "ملغي" && o.status !== "تم التوصيل" && <button className="order-cancel-btn" onClick={() => cancelOrder(o)}>إلغاء الطلب</button>}
          </div>
        ))}

        {!!orders.length && (
          <p className="mine-note">
            الطلبات دي محفوظة على الجهاز ده — لو عايز تسأل عن طلب، ابعتلنا رقمه على واتساب.
          </p>
        )}
      </div>
    </div>
  );
}
