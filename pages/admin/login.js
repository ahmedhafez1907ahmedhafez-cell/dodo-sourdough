import { useState } from "react";
import { useRouter } from "next/router";
import { useAdminAuth } from "../../lib/useAdminAuth";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, pass);
      router.push("/admin");
    } catch (e) {
      setErr("الإيميل أو الباسورد غلط");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: "80px auto", fontFamily: "Tajawal, sans-serif", direction: "rtl" }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>تسجيل دخول الأدمن</h2>
      <form onSubmit={submit}>
        <input
          type="email" placeholder="الإيميل" value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <input
          type="password" placeholder="كلمة السر" value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        {err && <p style={{ color: "red", fontSize: 13 }}>{err}</p>}
        <button disabled={busy} style={{ width: "100%", padding: 12, borderRadius: 8, background: "#1b1410", color: "#fff", border: "none" }}>
          {busy ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
      <p style={{ fontSize: 12, color: "#888", marginTop: 14 }}>
        الحساب بيتعمل من Firebase Console (Authentication) — شوف SETUP.md.
      </p>
    </div>
  );
}
