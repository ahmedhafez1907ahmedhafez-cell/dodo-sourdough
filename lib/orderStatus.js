// المصدر الوحيد لحالات الطلب.
// الأدمن بيقرا منها القايمة، والـ API بيتحقق بيها.
// لو ضفت حالة جديدة هنا هتشتغل في الاتنين على طول.

export const AWAITING_DEPOSIT = "في انتظار العربون";
export const AFTER_DEPOSIT_STATUS = "قيد التحضير";

export const ORDER_STATUSES = [
  AWAITING_DEPOSIT,
  AFTER_DEPOSIT_STATUS,
  "جاري الشحن",
  "تم التوصيل",
  "ملغي",
];

// أي أوردر جديد بيبدأ منتظر العربون، ومش بيروح لشركة الشحن
// غير لما الأدمن يأكّد إن الفلوس وصلت.
export const DEFAULT_ORDER_STATUS = AWAITING_DEPOSIT;

export function isValidStatus(s) {
  return ORDER_STATUSES.includes(s);
}
