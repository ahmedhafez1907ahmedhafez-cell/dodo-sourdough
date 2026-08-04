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
  name: "", nameAr: "", price: "", oldPrice: "", description: "", category: "",
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
  const [uploading, setUploading] = useState("");

  // ------------------------------------------------------------
  // أداة العروض الجماعية — بتشتغل باتجاهين:
  //   mode="sale"   → تعمل خصم % على كذا منتج مرة واحدة
  //   mode="cancel" → ترجّع السعر الأصلي وتشيل العرض عن كذا منتج
  //
  // إزاي بنعرف إن المنتج عليه عرض؟ لما بنعمل الخصم بنحفظ السعر
  // القديم في oldPrice. فأي منتج oldPrice بتاعه أكبر من price =
  // عليه عرض شغال. والإلغاء ببساطة بيرجّع price = oldPrice ويصفّر
  // oldPrice، فالكارت بتاعه في الموقع بيرجع عادي من غير بادج "عرض".
  // ------------------------------------------------------------
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState("sale"); // "sale" | "cancel"
  const [bulkPercent, setBulkPercent] = useState("");
  const [bulkSelected, setBulkSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  const isCancel = bulkMode === "cancel";
  const hasSale = (p) => !p.isStarter && Number(p.oldPrice) > Number(p.price);

  // الخميرة (بالجرام) مش داخلة في العروض الجماعية.
  // وفي وضع الإلغاء بنعرض المنتجات اللي عليها عرض بس.
  const bulkEligible = products.filter((p) => (isCancel ? hasSale(p) : !p.isStarter));

  function switchBulkMode(mode) {
    setBulkMode(mode);
    setBulkSelected(new Set());
    setBulkMsg("");
  }
  function toggleBulkOne(id) {
    setBulkSelected((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  }
  function bulkSelectAll() {
    setBulkSelected(new Set(bulkEligible.map((p) => p.id)));
  }
  function bulkSelectCatalog(catalog) {
    setBulkSelected(new Set(bulkEligible.filter((p) => p.catalog === catalog).map((p) => p.id)));
  }
  function bulkClearSelection() {
    setBulkSelected(new Set());
  }
  function newPriceFor(p) {
    if (isCancel) return Number(p.oldPrice) || p.price;
    const pct = Number(bulkPercent);
    if (!pct || pct <= 0) return p.price;
    // بنقرب لأقرب نص جنيه عشان أسعار زي 67.5 تفضل مظبوطة
    return Math.round(p.price * (100 - pct) / 100 * 2) / 2;
  }

  async function applyBulk() {
    if (!isCancel) {
      const pct = Number(bulkPercent);
      if (!pct || pct <= 0 || pct >= 100) { setBulkMsg("⚠️ اكتب نسبة خصم صح (بين 1 و99)"); return; }
    }
    if (!bulkSelected.size) { setBulkMsg("⚠️ اختار منتج واحد على الأقل"); return; }
    setBulkBusy(true);
    setBulkMsg("");
    let ok = 0, fail = 0;
    for (const id of bulkSelected) {
      const p = products.find((x) => x.id === id);
      if (!p) continue;
      // العرض: بنحفظ السعر الحالي في oldPrice وننزّل price
      // الإلغاء: بنرجّع price للسعر القديم ونصفّر oldPrice
      const patch = isCancel
        ? { price: Number(p.oldPrice) || p.price, oldPrice: null }
        : { oldPrice: p.price, price: newPriceFor(p) };
      try {
        const res = await authedFetch(`/api/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setBulkBusy(false);
    setBulkMsg(
      (isCancel ? `✅ اتلغى العرض عن ${ok} منتج` : `✅ اتعمل عرض ${bulkPercent}% على ${ok} منتج`) +
      (fail ? ` (فشل ${fail})` : "")
    );
    setBulkSelected(new Set());
    load();
  }

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

  async function uploadImage(file, field) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setMsg("⚠️ ارفع صورة JPG أو PNG أو WebP"); return; }
    if (file.size > 3 * 1024 * 1024) { setMsg("⚠️ حجم الصورة لازم يكون أقل من 3 ميجابايت"); return; }
    setUploading(field); setMsg("");
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const res = await authedFetch("/api/uploads/product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, filename: file.name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل رفع الصورة");
      setForm((current) => ({ ...current, [field]: data.url }));
      setMsg("✅ تم رفع الصورة");
    } catch (e) { setMsg("❌ " + e.message); } finally { setUploading(""); }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.mainImg.trim()) { setMsg("⚠️ لازم ترفع صورة أساسية"); return; }
    setBusy(true);
    setMsg("");
    try {
      const payload = {
        ...form,
        price: form.isStarter ? 0 : Number(form.price),
        oldPrice: !form.isStarter && form.oldPrice !== "" ? Number(form.oldPrice) : null,
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
      name: p.name || "", nameAr: p.nameAr || "", price: p.price || "", oldPrice: p.oldPrice || "", description: p.description || "",
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
    <div className="adm" style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl", padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2>{editingId ? "✏️ تعديل منتج" : "🍞 إضافة منتج جديد"}</h2>
        <Link href="/admin">الطلبات</Link>
        <Link href="/admin/content" style={{ marginRight: 12 }}>المحتوى</Link>
      </div>

      <button
        type="button"
        onClick={() => { setBulkOpen((o) => !o); setBulkMsg(""); }}
        style={{ width: "100%", padding: 12, borderRadius: 8, background: bulkOpen ? "#e74c3c" : "#1b1410", color: "#fff", border: "none", fontWeight: 700, marginBottom: 16, cursor: "pointer" }}
      >
        {bulkOpen ? "✖️ قفل أداة العروض" : "🔥 عروض جماعية — اعمل أو الغِ عرض على كذا منتج"}
      </button>

      {bulkOpen && (
        <div style={{ border: `2px solid ${isCancel ? "#2c7a4b" : "#e74c3c"}`, borderRadius: 10, padding: 14, marginBottom: 24, background: isCancel ? "#f3fbf5" : "#fff5f5" }}>

          {/* اختيار الاتجاه: عرض جديد ولا إلغاء عرض قايم */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => switchBulkMode("sale")}
              style={{ flex: 1, padding: 10, borderRadius: 8, cursor: "pointer", fontWeight: 700,
                border: isCancel ? "1px solid #ccc" : "2px solid #e74c3c",
                background: isCancel ? "#fff" : "#e74c3c", color: isCancel ? "#555" : "#fff" }}
            >
              اعمل عرض
            </button>
            <button
              type="button"
              onClick={() => switchBulkMode("cancel")}
              style={{ flex: 1, padding: 10, borderRadius: 8, cursor: "pointer", fontWeight: 700,
                border: isCancel ? "2px solid #2c7a4b" : "1px solid #ccc",
                background: isCancel ? "#2c7a4b" : "#fff", color: isCancel ? "#fff" : "#555" }}
            >
              الغِ العرض
            </button>
          </div>

          {isCancel ? (
            <p style={{ fontSize: 13.5, color: "#555", lineHeight: 1.8, marginBottom: 10 }}>
              اختار المنتجات اللي عايز تشيل العرض عنها — السعر هيرجع زي ما كان قبل الخصم،
              وعلامة «عرض» هتختفي من الموقع.
              {!bulkEligible.length && <strong style={{ display: "block", marginTop: 6, color: "#2c7a4b" }}>مفيش أي منتج عليه عرض دلوقتي.</strong>}
            </p>
          ) : (
            <>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>خصم كام %؟</label>
              <input
                type="number"
                placeholder="مثلاً 20"
                value={bulkPercent}
                onChange={(e) => setBulkPercent(e.target.value)}
                style={{ width: 120, marginBottom: 10 }}
              />
            </>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button type="button" onClick={bulkSelectAll} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>تحديد الكل</button>
            <button type="button" onClick={() => bulkSelectCatalog("tools")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>تحديد الأدوات</button>
            <button type="button" onClick={() => bulkSelectCatalog("bread")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>تحديد الخبز والخميرة</button>
            <button type="button" onClick={bulkClearSelection} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>إلغاء التحديد</button>
          </div>

          <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, background: "#fff", marginBottom: 10 }}>
            {!bulkEligible.length && (
              <p style={{ padding: 14, textAlign: "center", color: "#999", fontSize: 13 }}>
                {isCancel ? "مفيش منتجات عليها عروض" : "مفيش منتجات"}
              </p>
            )}
            {bulkEligible.map((p) => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderBottom: "1px solid #f2f2f2", cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={bulkSelected.has(p.id)} onChange={() => toggleBulkOne(p.id)} />
                <span style={{ flex: 1 }}>{p.nameAr}</span>
                <span style={{ color: "#999", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                  {isCancel && <span style={{ textDecoration: "line-through", color: "#b54a4a" }}>{p.oldPrice} جنيه</span>}
                  <span>{p.price} جنيه</span>
                </span>
                {bulkSelected.has(p.id) && (isCancel || bulkPercent !== "") && (
                  <span style={{ color: isCancel ? "#2c7a4b" : "#e74c3c", fontWeight: 700 }}>← {newPriceFor(p)} جنيه</span>
                )}
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={bulkBusy || !bulkSelected.size}
            onClick={applyBulk}
            style={{ width: "100%", padding: 12, borderRadius: 8, background: isCancel ? "#2c7a4b" : "#e74c3c", color: "#fff", border: "none", fontWeight: 700, cursor: bulkSelected.size ? "pointer" : "default", opacity: bulkSelected.size ? 1 : .55 }}
          >
            {bulkBusy
              ? "جاري التطبيق..."
              : isCancel
                ? `الغِ العرض عن ${bulkSelected.size} منتج`
                : `🔥 طبّق العرض على ${bulkSelected.size} منتج`}
          </button>
          {bulkMsg && <p style={{ marginTop: 8 }}>{bulkMsg}</p>}
        </div>
      )}

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
          <>
            <input type="number" placeholder="السعر الحالي" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4 }}>
                🔥 السعر قبل الخصم (اختياري — سيبه فاضي لو مفيش عرض)
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  placeholder="مثلاً 760 (السعر القديم قبل الخصم)"
                  value={form.oldPrice}
                  onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                  style={{ flex: 1 }}
                />
                {form.oldPrice !== "" && (
                  <button type="button" onClick={() => setForm({ ...form, oldPrice: "" })} style={{ padding: "8px 12px", borderRadius: 8, background: "#eee", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                    ❌ شيل العرض
                  </button>
                )}
              </div>
            </div>
          </>
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
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4 }}>😀 إيموجي بديل (لو الصورة اتعطلت)</label>
          <input placeholder="🧺" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        </div>
        <div style={{ display: "grid", gap: 8, padding: 10, border: "1px dashed #c9a86a", borderRadius: 8 }}>
          <strong style={{ fontSize: 13 }}>ارفع الصور من جهازك (بدلاً من روابط imgbb)</strong>
          <label>الصورة الأساسية <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e.target.files?.[0], "mainImg")} disabled={!!uploading} /></label>
          <label>صورة ثانية <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e.target.files?.[0], "secondImg")} disabled={!!uploading} /></label>
          {uploading && <small>جاري رفع الصورة…</small>}
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
          <div style={{ flex: 1 }}>
            {p.nameAr} —{" "}
            {p.isStarter ? (
              `${p.pricePerGram} جنيه/جرام`
            ) : p.oldPrice && Number(p.oldPrice) > Number(p.price) ? (
              <>
                <span style={{ textDecoration: "line-through", color: "#e74c3c" }}>{p.oldPrice}</span>{" "}
                <b>{p.price} جنيه 🔥</b>
              </>
            ) : (
              `${p.price} جنيه`
            )}
          </div>
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
