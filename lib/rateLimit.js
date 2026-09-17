// ============================================================
// Rate limiting بسيط لكل IP — بيمنع حد إنه يضرب /api/orders أو
// /api/reviews آلاف المرات في الثانية (spam / DoS بدائي).
//
// ⚠️ الحد ده في الميموري بس (مش Firestore) — يعني على Vercel كل
// instance ليه عداده الخاص، ولو السيرفر عمل restart العداد بيتصفر.
// ده مقبول هنا لأنه دفاع "أول خط" بسيط زي ما اتطلب، مش حماية كاملة
// ضد بوتات موزّعة. لو حبيت حماية أقوى فعلاً، محتاجين طبقة زي
// Firebase App Check أو Vercel WAF/Rate Limiting قدام الـ API.
// ============================================================

const buckets = new Map();

// بننضّف الـ buckets القديمة كل شوية عشان الميموري ما تكبرش على الفاضي
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > CLEANUP_INTERVAL_MS) buckets.delete(key);
  }
}

/** أول IP حقيقي من x-forwarded-for (اللي بيضيفه Vercel)، وإلا remoteAddress */
export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

/**
 * بيرجع { ok:true } لو مسموح، أو { ok:false, retryAfter } لو تعدّى الحد.
 * key: زي "orders" أو "reviews" عشان كل endpoint يكون ليه عداده الخاص.
 */
export function checkRateLimit(req, key, { max, windowMs }) {
  const now = Date.now();
  cleanup(now);
  const ip = getClientIp(req);
  const bucketKey = `${key}:${ip}`;
  let bucket = buckets.get(bucketKey);

  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(bucketKey, bucket);
  }

  bucket.count += 1;
  if (bucket.count > max) {
    const retryAfter = Math.ceil((windowMs - (now - bucket.windowStart)) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  return { ok: true };
}
