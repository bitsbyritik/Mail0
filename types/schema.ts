import { z } from "zod";

export const sendMailSchema = z.object({
  to: z.string().email(),
  subject: z.string().optional().default(""),
  message: z.string().optional().default(""),
});
