import { useState } from "react";
import { useRouter } from "next/router";
import { useShop } from "../context/ShopContext";

const NAME_POOL = ["خبازة متميزة", "صاحبة الذوق", "عاشقة الساوردو", "محبة الخبز الطازج", "ذواقة الطعم الأصيل", "عاشقة الصحة", "بطلة المطبخ", "فنانة الطعم"];

export default function Auth() {
  const shop = useShop();
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showNamePicker, setShowNamePicker] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const rules = { r1: pass.length >= 8, r2: /[A-Z]/.test(pass), r3: (pass.match(/\d/g) || []).length >= 2 };
  const passValid = rules.r1 && rules.r2 && rules.r3;

  function doLogin() {
    setError("");
    if (!email.trim() || !pass) return setError("⚠️ ادخل الإيميل وكلمة السر");
    try { shop.login(email.trim(), pass); router.push("/profile"); shop.showToast("✅ أهلاً بيك!"); }
    catch (e) { setError("⚠️ " + e.message); }
  }

  function startRegister() {
    setError("");
    if (!email.trim() || !pass) return setError("⚠️ ادخل الإيميل وكلمة السر");
    if (!passValid) return setError("⚠️ كلمة السر لازم تحقق الشروط");
    setShowNamePicker(true);
  }

  function finishRegister(chosenName) {
    const finalName = chosenName || NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
    try {
      shop.register(email.trim(), pass, finalName);
      router.push("/profile");
      shop.showToast("🎉 أهلاً بيك يا " + finalName + "!");
    } catch (e) {
      setError("⚠️ " + e.message);
      setShowNamePicker(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
        <h2>{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h2>

        {mode === "login" ? (
          <>
            <div className="auth-form-group"><label>📧 الإيميل</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" /></div>
            <div className="auth-form-group"><label>🔒 كلمة السر</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="كلمة السر" /></div>
            {error && <p style={{ color: "#e74c3c", fontSize: 13 }}>{error}</p>}
            <button className="auth-btn" onClick={doLogin}>دخول</button>
            <div className="auth-toggle">مش عندك حساب؟ <span onClick={() => { setMode("register"); setError(""); }}>سجل دلوقتي</span></div>
          </>
        ) : !showNamePicker ? (
          <>
            <div className="auth-form-group"><label>📧 الإيميل</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" /></div>
            <div className="auth-form-group">
              <label>🔒 كلمة السر</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="اختار كلمة سر قوية" />
              <div style={{ marginTop: 8 }}>
                <div className={"pass-rule " + (rules.r1 ? "ok" : "fail")}>{rules.r1 ? "✓" : "✗"} 8 أحرف على الأقل</div>
                <div className={"pass-rule " + (rules.r2 ? "ok" : "fail")}>{rules.r2 ? "✓" : "✗"} حرف كبير (Capital) واحد على الأقل</div>
                <div className={"pass-rule " + (rules.r3 ? "ok" : "fail")}>{rules.r3 ? "✓" : "✗"} رقمين على الأقل</div>
              </div>
            </div>
            {error && <p style={{ color: "#e74c3c", fontSize: 13 }}>{error}</p>}
            <button className="auth-btn" onClick={startRegister}>إنشاء حساب</button>
            <div className="auth-toggle">عندك حساب؟ <span onClick={() => { setMode("login"); setError(""); }}>سجل دخول</span></div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>اختار اسمك في الموقع:</div>
            <div className="name-suggestions">
              {[...NAME_POOL].sort(() => Math.random() - 0.5).slice(0, 4).map((n) => (
                <button key={n} type="button" className={"name-sug-btn" + (name === n ? " selected" : "")} onClick={() => setName(n)}>{n}</button>
              ))}
            </div>
            <div className="auth-form-group" style={{ marginTop: 8 }}>
              <label>أو اكتب اسمك</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك هنا" />
            </div>
            {error && <p style={{ color: "#e74c3c", fontSize: 13 }}>{error}</p>}
            <button className="auth-btn" onClick={() => finishRegister(name)}>ابدأ! 🍞</button>
            <button className="skip-btn" onClick={() => finishRegister(null)}>تخطى — الموقع هيختارلك اسم</button>
          </>
        )}
      </div>
    </div>
  );
}
