// ============================================================
// التحقق من الأسعار في السيرفر
//
// ⚠️ ليه الملف ده موجود:
// الأسعار كانت بتتاخد من المتصفح زي ما هي (i.totalPrice). يعني أي حد
// يفهم شوية يقدر يعدّل الطلب قبل ما يتبعت ويشتري رغيف بجنيه واحد.
// هنا بنعيد حساب كل حاجة من قاعدة البيانات ونتجاهل أي سعر جاي من العميل.
// ============================================================

// ⚠️ المصدر الوحيد لأسعار الإضافات — الواجهة بتقرا من هنا كمان
// (components/ProductCard.js بيعمل import للقائمة دي).
// متعرّفهاش في مكان تاني أبداً، وإلا السعر في الشاشة هيختلف عن السيرفر.
export const EXTRAS_LIST = [
  { id: "roumy", name: "جبنة رومي إضافية", price: 15 },
  { id: "mozz", name: "موزاريلا إضافية", price: 20 },
  { id: "jalap", name: "هالبينو إضافي", price: 10 },
  { id: "sauce", name: "صوص إضافي", price: 5 },
];

// نفس القائمة بس على شكل map عشان البحث السريع في السيرفر
export const EXTRAS = Object.fromEntries(
  EXTRAS_LIST.map((e) => [e.id, { name: e.name, price: e.price }])
);

export class PriceError extends Error {}

// بترجع { items, itemsTotal } بأسعار السيرفر
export async function recalcItems(adminDb, rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw new PriceError("السلة فاضية");
  }
  if (rawItems.length > 60) throw new PriceError("عدد المنتجات كبير جداً");

  // نجيب كل المنتجات المطلوبة مرة واحدة
  const ids = [...new Set(rawItems.map((i) => String(i.id || "")).filter(Boolean))];
  if (!ids.length) throw new PriceError("بيانات المنتجات ناقصة");

  const docs = await Promise.all(
    ids.map((id) => adminDb.collection("products").doc(id).get())
  );
  const byId = {};
  docs.forEach((d) => { if (d.exists) byId[d.id] = d.data(); });

  const items = [];
  let itemsTotal = 0;

  for (const raw of rawItems) {
    const p = byId[String(raw.id)];
    if (!p) throw new PriceError(`منتج مش موجود أو اتشال: ${raw.nameAr || raw.id}`);
    if (p.active === false) throw new PriceError(`منتج مش متاح دلوقتي: ${p.nameAr}`);

    let totalPrice, qty, extras = [], extrasPrice = 0, basePrice;

    if (p.isStarter) {
      // الخميرة بتتباع بالجرام — بنتأكد إن المبلغ مضاعف صحيح لسعر الجرام
      const perGram = Number(p.pricePerGram) || 0;
      if (perGram <= 0) throw new PriceError(`سعر الجرام مش متظبط: ${p.nameAr}`);
      const sent = Number(raw.totalPrice) || 0;
      const grams = Math.round(sent / perGram);
      if (grams < 1 || Math.abs(grams * perGram - sent) > 0.01) {
        throw new PriceError(`كمية غير صالحة: ${p.nameAr}`);
      }
      qty = 1;
      basePrice = grams * perGram;
      totalPrice = basePrice;
    } else {
      qty = Math.max(1, Math.min(99, parseInt(raw.qty, 10) || 1));
      basePrice = Number(p.price) || 0;
      if (basePrice <= 0) throw new PriceError(`سعر غير صالح: ${p.nameAr}`);

      // الإضافات مسموحة بس للمنتجات اللي عليها hasExtras
      if (p.hasExtras && Array.isArray(raw.extras)) {
        for (const ex of raw.extras) {
          const known = EXTRAS[ex?.id];
          if (!known) throw new PriceError("إضافة غير معروفة");
          extras.push({ id: ex.id, name: known.name, price: known.price });
          extrasPrice += known.price;
        }
      }
      totalPrice = (basePrice + extrasPrice) * qty;
    }

    items.push({
      id: String(raw.id),
      name: p.name || "",
      nameAr: p.nameAr || "",
      basePrice,
      extras,
      extrasPrice,
      unitPrice: p.isStarter ? totalPrice : basePrice + extrasPrice,
      totalPrice,
      qty,
      emoji: p.emoji || "🍞",
      priceNote: p.priceNote || "جنيه",
      isStarter: !!p.isStarter,
      catalog: p.catalog || "bread",          // مهم لتصنيف الشحنة عند شركة الشحن
      localOnly: p.localOnly !== undefined ? p.localOnly : p.catalog !== "tools",
    });

    itemsTotal += totalPrice;
  }

  return { items, itemsTotal };
}
