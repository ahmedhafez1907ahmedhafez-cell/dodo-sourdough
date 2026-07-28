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
      <p><strong>العنوان:</strong> ${order.address}, ${order.area}</p>
      <p><strong>سعر التوصيل:</strong> ${order.deliveryFee ?? "—"} جنيه</p>
      <ul>${itemsHtml}</ul>
      <p><strong>الإجمالي: ${order.total} جنيه</strong></p>
      <p style="color:#888;font-size:12px">رقم الطلب: ${order.id}</p>
    </div>
  `;
  const res = await fetch("https://api.resend.com/emails", {
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
