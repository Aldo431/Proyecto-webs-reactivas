import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  price: z.number().int().positive(),
  image: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const cartItemsSchema = z.array(cartItemSchema);

export type CartItem = z.infer<typeof cartItemSchema>;
