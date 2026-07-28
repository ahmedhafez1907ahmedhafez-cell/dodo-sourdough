import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAdminAuth } from "../lib/useAdminAuth";

// لف أي صفحة أدمن بالكومبوننت ده — هيرجع اللي مش مسجل دخول لصفحة اللوجين.
// (ملحوظة: ده UX guard بس — الحماية الحقيقية في requireAdmin() جوه الـ API routes)
export default function AdminGuard({ children }) {
  const { user, loading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/admin/login");
  }, [loading, user, router]);

  if (loading || !user) return <p style={{ textAlign: "center", marginTop: 60 }}>جاري التحقق...</p>;
  return children;
}
