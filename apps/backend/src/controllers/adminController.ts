import type { Request, RequestHandler } from "express";
import {
  adminProductQuerySchema,
  setFeaturedInputSchema,
} from "@tiendadcc/utils";
import {
  adminDeleteProduct,
  listAdminProducts,
  setProductFeatured,
} from "../services/adminService.ts";
import { assertProductExists } from "../services/reviewService.ts";

export const getAdminSession: RequestHandler = (_request, response) => {
  response.status(200).json({ role: "admin" });
};

function idParam(request: Request): string {
  const { id } = request.params;
  return typeof id === "string" ? id : "";
}

export const listAdminProductsHandler: RequestHandler = async (
  request,
  response,
) => {
  const query = adminProductQuerySchema.parse(request.query);
  response.status(200).json(await listAdminProducts(query));
};

export const setProductFeaturedHandler: RequestHandler = async (
  request,
  response,
) => {
  const id = idParam(request);
  // Orden 404 -> 400 (convenciones de 013): se comprueba que el producto
  // exista antes de validar el cuerpo.
  await assertProductExists(id);
  const input = setFeaturedInputSchema.parse(request.body);
  response.status(200).json(await setProductFeatured(id, input.featured));
};

export const deleteAdminProductHandler: RequestHandler = async (
  request,
  response,
) => {
  await adminDeleteProduct(idParam(request));
  response.status(204).end();
};
