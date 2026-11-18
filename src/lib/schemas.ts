import { z } from "zod";

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email().optional().or(z.literal("")),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/),
  birthPlace: z.string().trim().min(2).max(120),
  gender: z.enum(["male", "female", "other"]).optional(),
  message: z.string().trim().max(1000).optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});
export type BookingInput = z.infer<typeof bookingSchema>;
