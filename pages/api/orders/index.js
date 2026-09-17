import { adminDb, requireAdmin, ApiError } from "../../../lib/firebaseAdmin";
import { getGovernorateShippingFee, extraKgFromGrams, isBanhaArea, BANHA_DELIVERY_NOTE, OTHER_GOVERNORATE, PACKAGING_FEE } from "../../../lib/deliveryRates";
import { sendOrderNotification } from "../../../lib/sendMail";
import { recalcItems, PriceError } from "../../../lib/pricing";
import { DEFAULT_ORDER_STATUS } from "../../../lib/orderStatus";
import { depositFor, remainderFor, DEPOSIT_WALLET } from "../../../lib/payment";
import { checkRateLimit } from "../../../lib/rateLimit";
import crypto from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") return await createOrder(req, res);
    if (req.method === "GET") return await listOrders(req, res);
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("/api/orders error:", e.code || "", e.message || e);
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}

// أي حد يقدر يعمل أوردر (عميل الموقع) — مفيش حاجة أدمن هنا
async function createOrder(req, res) {
  // حد أقصى 10 أوردرات كل 10 دقايق لكل IP — يمنع سبام الأوردرات
  const rl = checkRateLimit(req, "orders", { max: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    return res.status(429).json({ error: "طلبات كتير من نفس الجهاز — استنى شوية وجرب تاني" });
  }

  const b = req.body || {};
  const required = ["customerName", "customerPhone", "street", "zone", "items"];
  for (const f of required) {
    if (!b[f] || (Array.isArray(b[f]) && b[f].length === 0)) {
      return res.status(400).json({ error: `الحقل "${f}" مطلوب` });
    }
  }

  // ⚠️ الأسعار بتتحسب من قاعدة البيانات، مش من اللي العميل باعته.
  // من غير الخطوة دي أي حد يقدر يعدّل السعر قبل ما يبعت الطلب.
  let items, itemsTotal;
  try {
    ({ items, itemsTotal } = await recalcItems(adminDb, b.items));
  } catch (e) {
    if (e instanceof PriceError) return res.status(400).json({ error: e.message });
    throw e;
  }

  // منتجات زي الخبز والخميرة السائلة بتتوصل بنها بس — بنتأكد من ده في
  // السيرفر برضو (مش بس في الواجهة) عشان محدش يقدر يتحايل عليها.
  const hasLocalOnlyItem = items.some((i) => i.localOnly);
  if (hasLocalOnlyItem && b.zone !== "banha") {
    return res.status(400).json({ error: "في طلبك منتجات (خبز/خميرة سائلة) بتتوصل بنها بس" });
  }

  // وزن الخميرة السائلة في الأوردر (جرام) — المنتج الوحيد اللي وزنه
  // متسجل، وبيتحسب بيه "الكيلو الزيادة" في سعر التوصيل. باقي المنتجات
  // (خبز/أدوات) مالهاش وزن مسجل فبتعتبر دايماً جوّه الكيلو الأول الثابت.
  const totalStarterGrams = items.reduce((s, i) => s + (i.isStarter ? (i.grams || 0) : 0), 0);
  const extraKg = extraKgFromGrams(totalStarterGrams);

  let deliveryFee = null;
  let deliveryNote = "";
  if (b.zone === "banha") {
    if (!b.area) return res.status(400).json({ error: "اختار منطقتك في بنها" });
    if (!isBanhaArea(b.area)) return res.status(400).json({ error: "منطقة غير معروفة في بنها" });
    // بنها بنوصّلها بنفسنا وسعرها بيتحدد على واتساب
    deliveryFee = null;
    deliveryNote = BANHA_DELIVERY_NOTE;
  } else if (b.zone === "nationwide") {
    if (!b.province) return res.status(400).json({ error: "اختار المحافظة" });
    if (b.province === OTHER_GOVERNORATE) {
      deliveryFee = null;
      deliveryNote = "سعر التوصيل هنقولك عليه على رقم الهاتف اللي بعته";
    } else {
      deliveryFee = getGovernorateShippingFee(b.province, extraKg);
      if (deliveryFee === null) return res.status(400).json({ error: "محافظة غير معروفة" });
    }
  } else {
    return res.status(400).json({ error: "منطقة توصيل غير معروفة" });
  }

  // رسم التغليف: مبلغ ثابت بيتضاف مرة واحدة لكل أوردر (مش لكل منتج)
  const total = itemsTotal + (deliveryFee || 0) + PACKAGING_FEE;
  // العربون: نص المبلغ، بيتحسب في السيرفر عشان العميل ميقدرش يقلله
  const deposit = depositFor(total);

  // المفتاح يُحفظ في جهاز العميل فقط؛ قاعدة البيانات لا تحفظ إلا الهاش.
  const customerCancelToken = crypto.randomBytes(24).toString("hex");
  const customerCancelTokenHash = crypto.createHash("sha256").update(customerCancelToken).digest("hex");
  const orderRef = await adminDb.collection("orders").add({
    customerName: String(b.customerName).slice(0, 80),
    customerPhone: String(b.customerPhone).slice(0, 20),
    zone: b.zone,
    province: b.province || "",
    area: b.area || "",
    street: String(b.street).slice(0, 200),
    building: String(b.building || "").slice(0, 20),
    floor: String(b.floor || "").slice(0, 20),
    flat: String(b.flat || "").slice(0, 20),
    items,
    itemsTotal,
    deliveryFee,
    deliveryNote,
    packagingFee: PACKAGING_FEE,
    total,
    deposit,
    depositPaid: false,
    customerCancelTokenHash,
    status: DEFAULT_ORDER_STATUS,
    shipmentTrackingNo: null,
    createdAt: new Date().toISOString(),
  });

  // بنبني الأوردر من القيم المحسوبة في السيرفر — مش من الـ body
  const order = { ...b, id: orderRef.id, items, itemsTotal, deliveryFee, packagingFee: PACKAGING_FEE, total, deposit };

  // إشعار إيميل — مايفشلش الطلب لو الإيميل وقع
  // بنسجّل فشل الإيميل على الأوردر نفسه عشان يبان في الأدمن،
  // بدل ما يضيع في اللوج ومنعرفش ليه الإشعار مجاش.
  sendOrderNotification(order).catch((e) => {
    // بنسجّل السبب الحقيقي (cause) مش بس "fetch failed" — عشان لو
    // اتكرر تاني بعد الـ retry نعرف نشخّصه صح من الأدمن على طول
    const cause = e?.cause?.message || e?.cause?.code || "";
    const msg = String(cause ? `${e.message} (${cause})` : e.message || e).slice(0, 200);
    console.error("[order email]", msg);
    orderRef.update({ emailError: msg }).catch(() => {});
  });

  // ⚠️ الشحنة مش بتتعمل هنا خالص، ولا بأي API لأي شركة شحن.
  // الأوردر بيفضل "في انتظار العربون" لحد ما الأدمن يأكّد إن نص
  // المبلغ وصل من /api/orders/[id]/deposit (بيغيّر الحالة بس) — وبعد
  // كده الأدمن نفسه يسجّل الشحنة يدوي في تطبيق J&T.

  // كل الأوردرات دلوقتي بتعدي على نفس الشاشة: العربون + واتساب.
  // بنرجّع الأرقام للواجهة عشان تعرضها للعميل.
  return res.status(201).json({
    id: orderRef.id,
    total,
    deliveryFee,
    deliveryNote,
    packagingFee: PACKAGING_FEE,
    deposit,
    remainder: remainderFor(total),
    depositWallet: DEPOSIT_WALLET,
    status: DEFAULT_ORDER_STATUS,
    customerCancelToken,
  });
}

// أدمن بس — كل الطلبات
async function listOrders(req, res) {
  await requireAdmin(req);
  const snap = await adminDb.collection("orders").orderBy("createdAt", "desc").limit(200).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return res.status(200).json({ orders });
}
