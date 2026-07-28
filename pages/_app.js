import { useRouter } from "next/router";
import "../styles/globals.css";
import { ShopProvider } from "../context/ShopContext";
import Layout from "../components/Layout";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith("/admin");

  if (isAdmin) {
    return <Component {...pageProps} />;
  }

  return (
    <ShopProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ShopProvider>
  );
}
