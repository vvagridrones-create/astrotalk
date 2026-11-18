export type WhatsAppBooking = {
  reference: string; name: string; phone: string; service: string; dob: string;
  birthTime: string; birthPlace: string; date: string; time: string; message?: string;
};

export function buildWhatsAppMessage(b: WhatsAppBooking): string {
  return [
    "Namaste,", "",
    "I would like to book an astrology consultation.", "",
    `Booking Reference: ${b.reference}`, "",
    `Name: ${b.name}`,
    `Phone: ${b.phone}`,
    `Service: ${b.service}`,
    `Date of Birth: ${b.dob}`,
    `Birth Time: ${b.birthTime}`,
    `Birth Place: ${b.birthPlace}`,
    `Appointment Date: ${b.date}`,
    `Appointment Time: ${b.time} (IST)`, "",
    `Additional Message: ${b.message?.trim() || "-"}`, "",
    "Please confirm my appointment.",
  ].join("\n");
}

export function whatsappUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}
