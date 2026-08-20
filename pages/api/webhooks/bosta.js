// ============================================================
// POST /api/webhooks/bosta
//
// بوسطة بتنادي اللينك ده كل ما حالة الشحنة تتغيّر، فالأدمن بيتحدّث
// لوحده من غير ما تفتح داشبورد بوسطة تشوف وصلت ولا لأ.
//
// إعداده في بوسطة: الإعدادات ← ربط التطبيقات ← "إضافة رابط الـ Webhook"
//   • رابط Webhook      https://dodo-sourdough.vercel.app/api/webhooks/bosta
//   • اسم مفتاح التوثيق  x-webhook-secret        (نفس BOSTA_WEBHOOK_HEADER)
//   • مفتاح التوثيق      <سر عشوائي طويل>        (نفس BOSTA_WEBHOOK_SECRET)
//
// ⚠️ اللينك ده مفتوح على النت، فأي حد يقدر يناديه. عشان كده بنتحقق
//    من السر المشترك قبل ما نلمس أي أوردر. من غير السر ده أي حد
//    كان هيقدر يعلّم أوردراتك "اتسلّمت".
//
// بنسجّل كمان deliveredAt عشان نقدر نقيس مدة التوصيل الحقيقية
// بالأرقام بدل الانطباع — ده كان أهم سبب في سيبنا شركة الشحن القديمة.
// ============================================================

import crypto from "crypto";
import { adminDb } from "../../../lib/firebaseAdmin";
import { BOSTA_DELIVERED, BOSTA_RETURNED } from "../../../lib/bosta";

const DEFAULT_HEADER = "x-webhook-secret";

function secretOk(req) {
  const expected = String(process.env.BOSTA_WEBHOOK_SECRET || "");
  // من غير سر متظبّط، بنقفل الباب — مش بنسيبه مفتوح
  if (!expected) return false;

  const headerName = String(process.env.BOSTA_WEBHOOK_HEADER || DEFAULT_HEADER).toLowerCase();
  const got = String(req.headers[headerName] || "");

  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** بوسطة بتبعت الحالة بأكتر من شكل حسب نوع الحدث — بنطلعها من أي واحد */
function readState(body) {
  return (
    body?.state?.value ||
    body?.state ||
    body?.deliveryState ||
    body?.status?.value ||
    body?.status ||
    null
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!secretOk(req)) {
    console.warn("[Bosta webhook] رفض — سر مش مظبوط");
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const body = req.body || {};
    const state = readState(body);
    const trackingNo = body.trackingNumber || body.tracking_number || null;
    const businessRef = body.businessReference || body.business_reference || null;

    if (!state) return res.status(200).json({ ok: true, ignored: "مفيش حالة في الرسالة" });

    // بندوّر على الأوردر بالمرجع بتاعنا الأول (أدق)، وبعدين برقم التتبع
    let ref = null;
    if (businessRef) {
      const direct = adminDb.collection("orders").doc(String(businessRef));
      if ((await direct.get()).exists) ref = direct;
    }
    if (!ref && trackingNo) {
      const q = await adminDb
        .collection("orders")
        .where("shipmentTrackingNo", "==", String(trackingNo))
        .limit(1)
        .get();
      if (!q.empty) ref = q.docs[0].ref;
    }

    if (!ref) {
      // مش خطأ — ممكن تكون شحنة اتعملت من داشبورد بوسطة يدوي.
      // بنرجّع 200 عشان بوسطة متفضلش تعيد المحاولة على الفاضي.
      console.warn("[Bosta webhook] مالقيناش أوردر لـ", businessRef || trackingNo);
      return res.status(200).json({ ok: true, ignored: "مفيش أوردر مطابق" });
    }

    const patch = {
      shipmentState: String(state),
      shipmentStateAt: new Date().toISOString(),
    };

    if (String(state) === BOSTA_DELIVERED) {
      patch.status = "تم التوصيل";
      patch.deliveredAt = new Date().toISOString();
    } else if (String(state) === BOSTA_RETURNED) {
      // مش بنغيّر حالة الأوردر لوحدنا هنا — بنحطها قدام عينك في
      // الأدمن وإنت تقرر، لأن الرجيع محتاج تصرّف منك مش تعليم آلي.
      patch.shipmentError = "الشحنة رجعت من العميل — محتاجة تصرّف";
    }

    await ref.update(patch);
    return res.status(200).json({ ok: true, state: String(state) });
  } catch (e) {
    console.error("[Bosta webhook]", e.message || e);
    // 200 عشان بوسطة متعلّقش في إعادة المحاولة — اللوج فيه السبب
    return res.status(200).json({ ok: false, error: String(e.message || e).slice(0, 200) });
  }
}
