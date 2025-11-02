import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(20, { message: "Username must be at most 20 characters long" }),
  email: z.email({ message: "Invalid email address" }),
  password_hash: z.string(),
  identities: z.array(
    z.object({
      provider: z.enum(["google", "microsoft", "apple"]),
      provider_id: z.string(),
      linked_at: z.coerce.date(),
    })
  ),
  isLoggedOut: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  optOutAi: z.boolean().default(false),
});

export type IUser = z.infer<typeof UserSchema>;
