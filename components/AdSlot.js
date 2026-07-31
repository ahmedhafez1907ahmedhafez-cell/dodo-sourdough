// ============================================================
// قسم المنتجات المرشّحة (روابط شراكة أمازون).
//
// • لو مفيش حاجة متظبطة في lib/ads.js → مش بيرسم حاجة خالص.
// • على الموبايل مخفي — الشاشة الصغيرة أضيق من إنها تستحمل
//   قسم زيادة بعد المنتجات من غير ما تزهّق العميل.
// • الأفلييت له أولوية على AdSense لو الاتنين متظبطين.
//
// ⚠️ rel="sponsored nofollow" مطلوب من جوجل لروابط العمولة،
//    و target="_blank" عشان العميل ميسبش سلته عندنا.
// ============================================================

import { useEffect } from "react";
import Script from "next/script";
import Icon from "./Icon";
import {
  AFFILIATE_PRODUCTS, amazonLink, ADSENSE_CLIENT, ADSENSE_SLOT,
  AD_DISCLOSURE, adsEnabled,
} from "../lib/ads";

export default function AdSlot({ desktopOnly = true }) {
  const useAdsense = !AFFILIATE_PRODUCTS.length && !!ADSENSE_CLIENT && !!ADSENSE_SLOT;

  useEffect(() => {
    if (!useAdsense) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* مانع إعلانات — عادي */ }
  }, [useAdsense]);

  if (!adsEnabled()) return null;

  return (
    <section className={"ad-slot" + (desktopOnly ? " ad-desktop-only" : "")}>
      {AFFILIATE_PRODUCTS.length > 0 ? (
        <>
          <div className="section-title">
            <span className="eyebrow">Also Useful</span>
            <h2>حاجات تفيدك في الخبيز</h2>
            <div className="title-line"></div>
            <p>أدوات إحنا بنستخدمها بس مش بنبيعها</p>
          </div>

          <div className="ad-products">
            {AFFILIATE_PRODUCTS.map((p) => (
              <a
                key={p.asin}
                href={amazonLink(p.asin)}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                className="ad-card reveal"
              >
                <div className="ad-card-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.title} loading="lazy" />
                </div>
                <div className="ad-card-body">
                  <h4>{p.title}</h4>
                  {p.note && <p>{p.note}</p>}
                  <span className="ad-card-cta">
                    شوفه على أمازون <Icon name="chevron" size={14} style={{ transform: "scaleX(-1)" }} />
                  </span>
                </div>
              </a>
            ))}
          </div>

          <p className="ad-disclosure">{AD_DISCLOSURE}</p>
        </>
      ) : (
        <>
          <p className="ad-disclosure" style={{ marginBottom: 14 }}>{AD_DISCLOSURE}</p>
          <Script
            id="adsense-lib"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={ADSENSE_SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      )}
    </section>
  );
}
