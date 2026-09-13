import { z } from "zod";

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  image: z.string().min(1),
  description: z.string().min(1),
});

export const productListSchema = z.object({
  products: z.array(productSchema),
});

export type Product = z.infer<typeof productSchema>;

export function parseProducts(data: unknown): Product[] {
  return productListSchema.parse(data).products;
}