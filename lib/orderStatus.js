// المصدر الوحيد لحالات الطلب.
// الأدمن بيقرا منها القايمة، والـ API بيتحقق بيها.
// لو ضفت حالة جديدة هنا هتشتغل في الاتنين على طول.
export const ORDER_STATUSES = [
  "قيد التحضير",
  "جاري الشحن",
  "تم التوصيل",
  "ملغي",
];

export const DEFAULT_ORDER_STATUS = ORDER_STATUSES[0];

export function isValidStatus(s) {
  return ORDER_STATUSES.includes(s);
}
