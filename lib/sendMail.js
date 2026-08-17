// ============================================================
// "fetch failed" اللي كان بيظهر في الأدمن (إشعار الإيميل مبعتش) —
// ده مش خطأ في إعدادات Resend (لو كان كده كان هيقول "فشل إرسال
// الإيميل" برد فعلي من Resend). "fetch failed" معناه إن الاتصال
// نفسه اتقطع قبل ما يوصل، وده مشكلة معروفة في سيرفرات Vercel
// اللي بتفضل شغالة (warm) — الاتصال المفتوح مع resend.com بيتقفل
// من ناحيتهم من غير ما نعرف، وأول طلب على الاتصال القديم ده بيقع.
// الحل المعروف: نعيد المحاولة مرة واحدة على اتصال جديد.
// ============================================================
async function fetchWithRetry(url, opts, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, opts);
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 350 * (i + 1)));
    }
  }
  throw lastErr;
}

// إرسال إيميل بسيط عبر Resend (https://resend.com) — فيه باقة مجانية.
// سجل حساب، اعمل Domain verify (أو استخدم onboarding@resend.dev للتجربة بسرعة)،
// خد الـ API key وحطه في RESEND_API_KEY في متغيرات البيئة.
export async function sendOrderNotification(order) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  const from = process.env.ORDER_FROM_EMAIL || "orders@resend.dev";
  if (!apiKey || !to) {
    console.warn("[sendMail] RESEND_API_KEY أو ADMIN_NOTIFY_EMAIL مش متظبطين — تم تخطي الإيميل");
    return { skipped: true };
  }
  const itemsHtml = order.items
    .map((i) => `<li>${i.nameAr} × ${i.qty} — ${i.totalPrice} جنيه</li>`)
    .join("");
  const html = `
    <div style="font-family:sans-serif;direction:rtl;text-align:right">
      <h2>🍞 طلب جديد من دودو ساوردو</h2>
      <p><strong>الاسم:</strong> ${order.customerName}</p>
      <p><strong>الهاتف:</strong> ${order.customerPhone}</p>
      <p><strong>العنوان:</strong> ${[order.zone === "banha" ? "بنها" : order.province, order.area, order.street].filter(Boolean).join(" - ") || "—"}</p>
      <p><strong>العربون المطلوب:</strong> ${order.deposit ?? "—"} جنيه</p>
      <p><strong>سعر التوصيل:</strong> ${order.deliveryFee ?? "—"} جنيه</p>
      <ul>${itemsHtml}</ul>
      <p><strong>الإجمالي: ${order.total} جنيه</strong></p>
      <p style="color:#888;font-size:12px">رقم الطلب: ${order.id}</p>
    </div>
  `;
  const res = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `🍞 طلب جديد — ${order.customerName} — ${order.total} جنيه`,
      html,
    }),
  });
  if (!res.ok) {
    console.error("[sendMail] فشل إرسال الإيميل:", await res.text());
    return { skipped: false, ok: false };
  }
  return { skipped: false, ok: true };
}

// ============================================================
// إرسال كود تسجيل الدخول للعميل
// بيرجع {ok:true} أو بيرمي Error برسالة عربية مفهومة.
// ============================================================
export async function sendLoginCodeEmail(to, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey) throw new Error("خدمة الإيميل مش متظبطة (RESEND_API_KEY ناقص)");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: "كود تسجيل الدخول — دودو ساوردو", html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[sendLoginCode] Resend رفض:", res.status, body);

    // أشهر مشكلة: لسه بتستخدم onboarding@resend.dev — ده sandbox، Resend
    // بيسمح بيه لإيميلك إنت بس. عشان يوصل لأي عميل لازم توثّق دومين.
    if (/own email address|testing emails/i.test(body)) {
      throw new Error(
        "الإيميل ده مش هيوصله كود دلوقتي: Resend لسه في وضع التجربة وبيبعت " +
        "لإيميلك إنت بس. وثّق دومين في Resend وغيّر ORDER_FROM_EMAIL."
      );
    }
    if (/domain|from/i.test(body)) {
      throw new Error("إعدادات الإيميل مش مظبوطة — راجع ORDER_FROM_EMAIL في Resend");
    }
    throw new Error("مقدرناش نبعت الكود دلوقتي، جرب تاني");
  }
  return { ok: true };
}

// ملحوظة: لينك تفعيل الحساب وقت التسجيل بيتبعت من Firebase Auth مباشرة.
// كود تسجيل الدخول (اللي فوق) بيتبعت من Resend.
