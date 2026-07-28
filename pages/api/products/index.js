import { adminDb, requireAdmin, ApiError } from "../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return await listProducts(req, res);
    if (req.method === "POST") return await addProduct(req, res);
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("/api/products error:", e.code || "", e.message || e);
    const status = e instanceof ApiError ? e.status : 500;
    return res.status(status).json({ error: e.message || "خطأ غير متوقع" });
  }
}

// عام — كل الزوار يقدروا يشوفوا المنتجات
async function listProducts(req, res) {
  const snap = await adminDb.collection("products").orderBy("createdAt", "desc").get();
  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return res.status(200).json({ products });
}

// أدمن بس — إضافة منتج جديد من غير ما يلمس الكود خالص
async function addProduct(req, res) {
  await requireAdmin(req);
  const b = req.body || {};
  const required = ["name", "nameAr", "description", "mainImg", "catalog"];
  for (const f of required) {
    if (b[f] === undefined || b[f] === null || b[f] === "") {
      return res.status(400).json({ error: `الحقل "${f}" مطلوب` });
    }
  }
  if (!b.isStarter && (b.price === undefined || b.price === null || b.price === "")) {
    return res.status(400).json({ error: 'الحقل "price" مطلوب' });
  }
  const docRef = await adminDb.collection("products").add({
    name: b.name,
    nameAr: b.nameAr,
    description: b.description,
    price: b.isStarter ? 0 : Number(b.price),
    category: b.category || "",
    catalog: b.catalog, // "tools" أو "bread"
    tag: b.tag || "",
    mainImg: b.mainImg, // رابط الصورة (مباشر — مفيش Firebase Storage)
    secondImg: b.secondImg || "", // اختياري
    video: b.video || "", // اختياري — لقسم الريلز/الجاليري
    emoji: b.emoji || "", // بيظهر بدل الصورة لو الرابط بايظ
    isNew: !!b.isNew,
    isBestseller: !!b.isBestseller,
    hasExtras: !!b.hasExtras,
    isStarter: !!b.isStarter,
    pricePerGram: b.isStarter ? Number(b.pricePerGram || 0) : null,
    localOnly: b.localOnly !== undefined ? !!b.localOnly : b.catalog !== "tools",
    active: true,
    createdAt: new Date().toISOString(),
  });
  return res.status(201).json({ id: docRef.id });
}
