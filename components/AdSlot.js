// ============================================================
// مكان الإعلان في الصفحة.
//
// • لو مفيش إعلان متظبط في lib/ads.js → مش بيرسم حاجة خالص.
// • على الموبايل مخفي (desktopOnly) — الشاشة الصغيرة أضيق من إنها
//   تستحمل إعلان جنب المنتجات من غير ما تزنق العميل.
// • الأفلييت له أولوية على AdSense لو الاتنين متظبطين.
// ============================================================

import { useEffect } from "react";
import Script from "next/script";
import {
  AFFILIATE_BANNERS, ADSENSE_CLIENT, ADSENSE_SLOT, AD_DISCLOSURE, adsEnabled,
} from "../lib/ads";

export default function AdSlot({ desktopOnly = true }) {
  const useAdsense = !AFFILIATE_BANNERS.length && !!ADSENSE_CLIENT && !!ADSENSE_SLOT;

  // AdSense محتاج نقوله إن في وحدة إعلانية جديدة اتحطت في الصفحة
  useEffect(() => {
    if (!useAdsense) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* مانع إعلانات — عادي */ }
  }, [useAdsense]);

  if (!adsEnabled()) return null;

  return (
    <section className={"ad-slot" + (desktopOnly ? " ad-desktop-only" : "")}>
      <p className="ad-disclosure">{AD_DISCLOSURE}</p>

      {AFFILIATE_BANNERS.length > 0 ? (
        <div className="ad-banners">
          {AFFILIATE_BANNERS.map((b, i) => (
            <a
              key={i}
              href={b.href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="ad-banner"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.img} alt={b.alt || "إعلان"} loading="lazy" />
            </a>
          ))}
        </div>
      ) : (
        <>
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
