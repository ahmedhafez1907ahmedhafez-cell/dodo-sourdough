import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../styles/globals.css";
import { ShopProvider } from "../context/ShopContext";
import Layout from "../components/Layout";
import WebMCPProvider from "../components/WebMCPProvider";

// ============================================================
// إحصائيات Vercel
//
// <Analytics />     → عدد الزوار، الصفحات الأكتر زيارة، جايين منين
//                     (فيسبوك/انستجرام/جوجل)، من أنهي محافظة، موبايل
//                     ولا كمبيوتر.
// <SpeedInsights /> → سرعة الموقع الحقيقية عند الزوار.
//
// مهم تعرف: الإحصائيات دي **مجهّلة** — بتقولك كام واحد دخل ومن فين،
// مش مين بالاسم. Vercel مش بيحط كوكيز ومش بيتتبع الأفراد. عشان تعرف
// عميل بعينه لازم يكون سجّل دخول (وده متوقف حالياً) أو من الأوردر
// نفسه في لوحة الأدمن.
//
// الاتنين مش بيشتغلوا على localhost — بيبعتوا بيانات على Vercel بس.
// ============================================================

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <>
        <Component {...pageProps} />
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  return (
    <ShopProvider>
      <WebMCPProvider />
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <Analytics />
      <SpeedInsights />
    </ShopProvider>
  );
}
