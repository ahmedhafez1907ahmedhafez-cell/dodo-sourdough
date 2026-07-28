import { useEffect } from "react";

// دخول الهيرو: العناصر بتتجمع في مكانها لما الصفحة تفتح
export function useHeroIntro() {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.add("intro-ready");
    }));
    const safety = setTimeout(() => document.body.classList.add("intro-ready"), 4000);
    return () => { cancelAnimationFrame(id); clearTimeout(safety); };
  }, []);
}

// أي عنصر عليه class="reveal" أو "scatter-card" هيتراقب ويظهر لما يدخل الشاشة.
// يتنادى بعد كل تحديث لقائمة المنتجات/الكروت (deps).
export function useCardReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in-view), .scatter-card:not(.in-view)");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach((el) => el.classList.add("in-view"));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in-view"); obs.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    els.forEach((el) => obs.observe(el));
    const safety = setTimeout(() => els.forEach((el) => el.classList.add("in-view")), 4000);
    return () => { obs.disconnect(); clearTimeout(safety); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// اتجاهات عشوائية لدخول كروت المنتجات (نفس فكرة الموقع القديم)
const SCATTER_DIRS = [
  { x: -150, y: -45, r: -9 }, { x: 160, y: 35, r: 8 }, { x: -95, y: 65, r: 6 },
  { x: 120, y: -75, r: -7 }, { x: -60, y: 90, r: 5 }, { x: 80, y: -90, r: -6 },
];
export function scatterStyle(idx) {
  const d = SCATTER_DIRS[idx % SCATTER_DIRS.length];
  const delay = Math.min(idx * 0.06, 0.5).toFixed(2);
  return { "--sx": d.x + "px", "--sy": d.y + "px", "--sr": d.r + "deg", "--sd": delay + "s" };
}
