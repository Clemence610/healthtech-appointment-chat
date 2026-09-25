import { z } from "zod";

export const appointmentMessage = z.object({
  sessionId: z.string().min(1),
  channel: z.string().min(1),
  accountId: z.string().min(1),
  patientIdentity: z.string().min(1),
  messageId: z.string().min(1),
  text: z.string().min(1).max(500)
});
export type AppointmentMessage = z.infer<typeof appointmentMessage>;
