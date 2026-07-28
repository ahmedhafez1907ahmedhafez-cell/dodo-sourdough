import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "../../components/AdminGuard";
import { useAdminAuth } from "../../lib/useAdminAuth";

// ============================================================
// ملحوظة: شلنا رفع الصور عن طريق Firebase Storage خالص، لأن Firebase
// بقى من أكتوبر 2024 بيطلب خطة الدفع (Blaze) عشان تفعّل Storage حتى لو
// مش هتستخدم فلوس فعلياً — وده سبب الـ CORS error اللي كان بيظهرلك.
// بدل كده: بتحط رابط الصورة مباشرة (URL). أسهل طريقتين مجانيتين:
//   1) ارفع الصورة لمجلد public/ في الريبو بتاعك على GitHub بنفس اسم
//      الملف، وبعد النشر حط هنا "/اسم-الملف.jpg" (يعني سلاش + الاسم).
//   2) أو ارفعها مجاناً على https://imgbb.com (من غير حساب حتى) وهياخد
//      لك رابط مباشر (Direct link) — الصقه هنا زي ما هو.
// ============================================================

const EMPTY = {
  name: "", nameAr: "", price: "", description: "", category: "",
  tag: "", catalog: "bread", isNew: false, isBestseller: false,
  mainImg: "", secondImg: "", hasExtras: false, isStarter: false, pricePerGram: "",
  video: "", emoji: "", localOnly: true,
};

function ProductsAdmin() {
  const { authedFetch } = useAdminAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (!res.ok) { setMsg("⚠️ فشل تحميل المنتجات: " + (data.error || res.status)); return; }
      setProducts(data.products || []);
    } catch (e) {
      setMsg("⚠️ فشل تحميل المنتجات: " + e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.mainImg.trim()) { setMsg("⚠️ لازم رابط صورة أساسية"); return; }
    setBusy(true);
    setMsg("");
    try {
      const payload = {
        ...form,
        price: form.isStarter ? 0 : Number(form.price),
        pricePerGram: form.isStarter ? Number(form.pricePerGram || 0) : undefined,
      };
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PATCH" : "POST";
      const res = await authedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "فشل الحفظ");
      }
      setMsg(editingId ? "✅ تم تعديل المنتج!" : "✅ تم إضافة المنتج!");
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name || "", nameAr: p.nameAr || "", price: p.price || "", description: p.description || "",
      category: p.category || "", tag: p.tag || "", catalog: p.catalog || "bread",
      isNew: !!p.isNew, isBestseller: !!p.isBestseller,
      mainImg: p.mainImg || "", secondImg: p.secondImg || "", hasExtras: !!p.hasExtras,
      isStarter: !!p.isStarter, pricePerGram: p.pricePerGram || "",
      video: p.video || "", emoji: p.emoji || "", localOnly: p.localOnly !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setMsg("");
  }

  async function removeProduct(id) {
    if (!confirm("متأكد إنك عايز تمسح المنتج ده؟")) return;
    await authedFetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl", padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2>{editingId ? "✏️ تعديل منتج" : "🍞 إضافة منتج جديد"}</h2>
        <Link href="/admin">الطلبات</Link>
        <Link href="/admin/content" style={{ marginRight: 12 }}>المحتوى</Link>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginBottom: 30 }}>
        <select value={form.catalog} onChange={(e) => setForm({ ...form, catalog: e.target.value, localOnly: e.target.value === "bread", isStarter: e.target.value === "tools" ? false : form.isStarter })}>
          <option value="bread">خبز وخميرة</option>
          <option value="tools">أدوات الساوردو</option>
        </select>
        <input placeholder="الاسم بالعربي" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
        <input placeholder="الاسم بالإنجليزي" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <textarea placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.isStarter}
            onChange={(e) => setForm({ ...form, isStarter: e.target.checked })}
            style={{ display: form.catalog === "tools" ? "none" : "inline-block" }}
          />
          <span style={{ display: form.catalog === "tools" ? "none" : "inline" }}>يتباع بالجرام (زي الخميرة)؟</span>
        </label>
        {form.isStarter && form.catalog !== "tools" ? (
          <input type="number" placeholder="السعر لكل جرام" value={form.pricePerGram} onChange={(e) => setForm({ ...form, pricePerGram: e.target.value })} />
        ) : (
          <input type="number" placeholder="السعر" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        )}

        <input placeholder="الفئة (مثلاً: stuffed أو basket)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input placeholder="Tag (مثلاً: Best Seller)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />

        <div>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4 }}>🖼️ رابط الصورة الأساسية *</label>
          <input placeholder="/basket-round-23.jpg أو رابط كامل من imgbb" value={form.mainImg} onChange={(e) => setForm({ ...form, mainImg: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4 }}>🖼️ رابط صورة تانية (اختياري)</label>
          <input placeholder="رابط الصورة الثانية" value={form.secondImg} onChange={(e) => setForm({ ...form, secondImg: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4 }}>🎬 رابط فيديو (اختياري — بيظهر في الجاليري/الريلز)</label>
          <input placeholder="/basket-demo.mp4 أو رابط فيديو مباشر" value={form.video} onChange={(e) => setForm({ ...form, video: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4 }}>😀 إيموجي بديل (لو الصورة اتعطلت)</label>
          <input placeholder="🧺" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        </div>
        {form.mainImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.mainImg} alt="معاينة" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} onError={(e) => (e.currentTarget.style.display = "none")} />
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.localOnly} onChange={(e) => setForm({ ...form, localOnly: e.target.checked })} />
          🚚 التوصيل بنها بس؟ (شيلها للأدوات والخميرة المجففة اللي بتتوصل لمحافظات تانية)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.hasExtras} onChange={(e) => setForm({ ...form, hasExtras: e.target.checked })} /> فيه إضافات اختيارية (جبنة/صوص...)؟
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.isNew} onChange={(e) => setForm({ ...form, isNew: e.target.checked })} /> جديد
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.isBestseller} onChange={(e) => setForm({ ...form, isBestseller: e.target.checked })} /> الأكثر طلباً
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={busy} style={{ flex: 1, padding: 12, borderRadius: 8, background: "#1b1410", color: "#fff", border: "none" }}>
            {busy ? "جاري الحفظ..." : editingId ? "💾 احفظ التعديلات" : "➕ أضف المنتج"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ padding: 12, borderRadius: 8, background: "#eee", color: "#333", border: "none" }}>
              إلغاء
            </button>
          )}
        </div>
        {msg && <p>{msg}</p>}
      </form>

      <h3>المنتجات الحالية ({products.length})</h3>
      {products.map((p) => (
        <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid #eee", padding: "8px 0" }}>
          {p.mainImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.mainImg} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }} onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          <div style={{ flex: 1 }}>{p.nameAr} — {p.isStarter ? `${p.pricePerGram} جنيه/جرام` : `${p.price} جنيه`}</div>
          <button onClick={() => startEdit(p)} style={{ color: "#1b1410", border: "none", background: "none", cursor: "pointer" }}>✏️</button>
          <button onClick={() => removeProduct(p.id)} style={{ color: "#e74c3c", border: "none", background: "none", cursor: "pointer" }}>🗑️</button>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <AdminGuard>
      <ProductsAdmin />
    </AdminGuard>
  );
}
