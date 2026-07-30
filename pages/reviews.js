import { useEffect, useState } from "react";
import { useCardReveal } from "../lib/useMotion";
import { useShop } from "../context/ShopContext";
import Icon from "../components/Icon";

export default function Reviews() {
  const shop = useShop();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [stars, setStars] = useState(5);
  const [busy, setBusy] = useState(false);

  // مفاتيح حذف تعليقاتي — متخزنة في متصفح صاحب التعليق بس
  const [myKeys, setMyKeys] = useState({});
  useEffect(() => {
    try { setMyKeys(JSON.parse(localStorage.getItem("ds_my_review_keys") || "{}")); } catch {}
  }, []);

  function load() {
    setLoading(true);
    fetch("/api/reviews").then((r) => r.json()).then((d) => setReviews(d.reviews || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);
  useCardReveal([reviews, loading]);

  async function deleteMyReview(id) {
    if (!confirm("متأكد إنك عايز تحذف تعليقك؟")) return;
    try {
      const res = await fetch("/api/reviews?id=" + id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deleteKey: myKeys[id] }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const copy = { ...myKeys };
      delete copy[id];
      setMyKeys(copy);
      localStorage.setItem("ds_my_review_keys", JSON.stringify(copy));
      shop.showToast("اتحذف تعليقك");
      load();
    } catch (e) {
      shop.showToast(e.message);
    }
  }

  async function submit() {
    if (!name.trim()) return shop.showToast("اكتب اسمك");
    if (text.trim().length < 10) return shop.showToast("اكتب رأيك (10 أحرف على الأقل)!");
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text, stars }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      // نخزن مفتاح الحذف عشان صاحب التعليق يقدر يحذفه بعدين
      if (d.id && d.deleteKey) {
        const copy = { ...myKeys, [d.id]: d.deleteKey };
        setMyKeys(copy);
        localStorage.setItem("ds_my_review_keys", JSON.stringify(copy));
      }
      setModalOpen(false);
      setName(""); setText(""); setStars(5);
      shop.showToast("شكراً على تعليقك! تم النشر");
      load();
    } catch (e) {
      shop.showToast(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reviews-page">
      <div className="section-title"><span className="eyebrow">Testimonials</span><h2>آراء عملائنا</h2><div className="title-line"></div><p>كلام حقيقي من ناس جربوا دودو ساوردو</p></div>

      <div className="reviews-grid">
        {loading && <p style={{ textAlign: "center", color: "#aaa" }}>جاري التحميل...</p>}
        {!loading && !reviews.length && <p style={{ textAlign: "center", color: "#aaa" }}>لسه مفيش تعليقات، كن أول واحد يكتب!</p>}
        {reviews.map((rev, i) => (
          <div className="review-card reveal" style={{ transitionDelay: Math.min(i * 0.06, 0.4) + "s", position: "relative" }} key={rev.id}>
            {myKeys[rev.id] && (
              <button
                onClick={() => deleteMyReview(rev.id)}
                title="احذف تعليقك"
                style={{ position: "absolute", top: 10, left: 10, border: "none", background: "none", cursor: "pointer", fontSize: 16, opacity: 0.7 }}
              ><Icon name="trash" size={15} /></button>
            )}
            <div className="review-quote">&rdquo;</div>
            <p className="review-text">{rev.text}</p>
            <div className="review-author">
              <div className="review-avatar">{(rev.name || "?").charAt(0)}</div>
              <div>
                <div className="review-name">{rev.name}</div>
                <div className="review-stars">{Array.from({ length: rev.stars || 5 }, (_, i) => <Icon key={i} name="star" size={15} />)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="write-review-btn" onClick={() => setModalOpen(true)}><Icon name="edit" size={17} /> اكتب تعليقك</button>

      {modalOpen && (
        <div className="review-modal open" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="review-modal-inner">
            <button className="review-modal-close" onClick={() => setModalOpen(false)}><Icon name="close" size={17} /></button>
            <div className="review-modal-content">
              <h3>شاركنا رأيك</h3>
              <div className="review-form-group"><label><Icon name="user" size={15} className="lbl-ico" />اسمك *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" /></div>
              <div className="review-form-group">
                <label><Icon name="star" size={15} className="lbl-ico" />تقييمك</label>
                <div className="star-select">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= stars ? "active" : ""} onClick={() => setStars(n)}><Icon name="star" size={22} /></span>
                  ))}
                </div>
              </div>
              <div className="review-form-group"><label><Icon name="chat" size={15} className="lbl-ico" />رأيك *</label><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب تجربتك مع دودو ساوردو..." /></div>
              <button className="submit-review-btn" disabled={busy} onClick={submit}>{busy ? "جاري الإرسال..." : "أرسل تعليقك"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
