// ============================================================
// SplitText — الجملة بتتقسّم لحروف والحروف بتطلع واحد ورا التاني.
//
// الفكرة مأخوذة من React Bits (reactbits.dev/text-animations/split-text)
// بس متكتبة بـ CSS خالص من غير GSAP — عشان منضيفش مكتبة تقيلة على
// الموقع علشان أنيميشن واحد.
//
// بيحترم prefers-reduced-motion: لو المستخدم قافل الحركة من إعدادات
// جهازه، النص بيظهر على طول من غير أنيميشن.
//
// الاستخدام:
//   <SplitText text="خبز يستاهل الانتظار" className="hero-line" />
//   <SplitText text="..." as="h2" by="word" delay={0.2} stagger={0.05} />
// ============================================================

import { useEffect, useRef, useState } from "react";

// ⚠️ مهم: العربي كتابة متصلة — لو قسّمنا الكلمة لحروف في <span> منفصلة
// المتصفح بيفك الوصل وتطلع "خ ب ز" بدل "خبز". فالافتراضي عندنا التقسيم
// بالكلمة، والتقسيم بالحرف بيشتغل مع اللاتيني بس.
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export default function SplitText({
  text = "",
  as: Tag = "p",
  by = "auto",        // "auto" | "word" | "char"
  delay = 0,          // تأخير قبل ما يبدأ (ثانية)
  stagger = 0.035,    // الفرق بين كل حرف والتاني (ثانية)
  once = true,
  className = "",
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce || !("IntersectionObserver" in window)) { setShown(true); return; }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { setShown(true); if (once) obs.unobserve(en.target); }
          else if (!once) setShown(false);
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(el);

    // شبكة أمان: لو حصل أي حاجة غريبة، النص لازم يبان
    const safety = setTimeout(() => setShown(true), 3000);
    return () => { obs.disconnect(); clearTimeout(safety); };
  }, [once]);

  const str = String(text);
  const mode = by === "auto" ? (ARABIC.test(str) ? "word" : "char") : by;

  // بنقسّم لكلمات الأول عشان الكلمة ما تتكسرش على سطرين
  const words = str.split(" ");
  let i = 0;

  return (
    <Tag ref={ref} className={"split-text" + (shown ? " in" : "") + (className ? " " + className : "")} {...rest}>
      <span className="sr-only">{text}</span>
      {words.map((w, wi) => (
        <span className="st-word" key={wi} aria-hidden="true">
          {mode === "word" ? (
            <span className="st-unit" style={{ "--d": (delay + i++ * stagger).toFixed(3) + "s" }}>{w}</span>
          ) : (
            Array.from(w).map((ch, ci) => (
              <span className="st-unit" key={ci} style={{ "--d": (delay + i++ * stagger).toFixed(3) + "s" }}>{ch}</span>
            ))
          )}
          {wi < words.length - 1 && <span className="st-space"> </span>}
        </span>
      ))}
    </Tag>
  );
}
