// Formato chileno largo para la fecha y hora del pedido (spec 012, RF-8),
// p. ej. "17 de noviembre de 2026, 22:41". Función pura para testear.
const ORDER_DATE_FORMAT = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "long",
  timeStyle: "short",
});

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return ORDER_DATE_FORMAT.format(date);
}
