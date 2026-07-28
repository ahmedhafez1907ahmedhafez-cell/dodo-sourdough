import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useShop } from "../context/ShopContext";

export default function Profile() {
  const shop = useShop();
  const router = useRouter();
  const [nameInput, setNameInput] = useState("");
  const [favProducts, setFavProducts] = useState([]);

  useEffect(() => {
    if (!shop.ready) return;
    if (!shop.user) { router.replace("/auth"); return; }
    setNameInput(shop.user.name || "");
  }, [shop.ready, shop.user]); // eslint-disable-line

  useEffect(() => {
    if (!shop.user) return;
    fetch("/api/products").then((r) => r.json()).then((d) => {
      const favs = shop.getFavs();
      setFavProducts((d.products || []).filter((p) => favs.includes(p.id)));
    });
  }, [shop.user]); // eslint-disable-line

  if (!shop.user) return null;

  function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { shop.updateProfile({ avatar: ev.target.result }); shop.showToast("✅ تم تغيير الصورة!"); };
    reader.readAsDataURL(file);
  }

  function saveName() {
    if (!nameInput.trim()) return shop.showToast("⚠️ اكتب اسم");
    shop.updateProfile({ name: nameInput.trim() });
    shop.showToast("✅ تم حفظ الاسم!");
  }

  function removeFav(pid) {
    shop.toggleFav(pid);
    setFavProducts((f) => f.filter((p) => p.id !== pid));
  }

  const orders = shop.getOrders();

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shop.user.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='50' fill='%23d9cfc0'/%3E%3Ctext y='.9em' x='50%25' font-size='55' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E"}
            alt="صورة الحساب" className="profile-avatar"
            onClick={() => document.getElementById("avatarPicker").click()}
          />
          <input type="file" id="avatarPicker" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
          <div className="profile-avatar-label" onClick={() => document.getElementById("avatarPicker").click()}>📷 تغيير الصورة</div>
        </div>
        <div className="profile-name">{shop.user.name}</div>
        <div className="profile-edit-name">
          <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="اكتب اسمك الجديد" />
          <button onClick={saveName}>حفظ</button>
        </div>

        <hr className="section-divider" />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>⭐ المفضلة</div>
        {!favProducts.length && <p style={{ textAlign: "center", color: "#aaa", fontSize: 13 }}>لا توجد منتجات في المفضلة</p>}
        {favProducts.map((p) => (
          <div className="fav-item" key={p.id}>
            <div className="fav-item-emoji">{p.emoji || "🍞"}</div>
            <div className="fav-item-info">
              <div className="fav-item-name">{p.nameAr}</div>
              <div className="fav-item-price">{p.isStarter ? `${p.pricePerGram} جنيه/جرام` : `${p.price} جنيه`}</div>
            </div>
            <button className="fav-remove-btn" onClick={() => removeFav(p.id)}>✕</button>
          </div>
        ))}

        <hr className="section-divider" />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>📦 طلباتي السابقة</div>
        {!orders.length && <p style={{ textAlign: "center", color: "#aaa", fontSize: 13 }}>لا توجد طلبات سابقة</p>}
        {orders.map((o, i) => (
          <div className="order-item" key={i}>
            <div className="order-item-header"><span className="order-item-date">{o.date}</span><span className="order-item-status">{o.status}</span></div>
            <div className="order-item-products">{o.items}</div>
            <div className="order-item-total">الإجمالي: {o.total} جنيه</div>
          </div>
        ))}

        <hr className="section-divider" />
        <button className="logout-btn" onClick={() => { shop.logout(); router.push("/"); shop.showToast("👋 تم تسجيل الخروج"); }}>🚪 تسجيل الخروج</button>
      </div>
    </div>
  );
}
