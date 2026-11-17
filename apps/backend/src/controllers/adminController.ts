import type { Request, RequestHandler } from "express";
import {
  adminProductQuerySchema,
  adminReviewQuerySchema,
  adminUserQuerySchema,
  setFeaturedInputSchema,
  setRoleInputSchema,
} from "@tiendadcc/utils";
import { UnauthorizedError } from "../errors.ts";
import {
  adminDeleteProduct,
  adminDeleteReview,
  assertUserExists,
  listAdminProducts,
  listAdminReviews,
  listAdminUsers,
  setProductFeatured,
  setUserRole,
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

export const listAdminUsersHandler: RequestHandler = async (
  request,
  response,
) => {
  const query = adminUserQuerySchema.parse(request.query);
  response.status(200).json(await listAdminUsers(query));
};

export const setUserRoleHandler: RequestHandler = async (
  request,
  response,
) => {
  const actingUserId = request.user?.id;
  if (!actingUserId) {
    throw new UnauthorizedError();
  }
  const id = idParam(request);
  // Orden 404 -> 400 -> 403: existencia, luego cuerpo, luego la regla de no
  // cambiar el propio rol (que vive en el servicio).
  await assertUserExists(id);
  const input = setRoleInputSchema.parse(request.body);
  response
    .status(200)
    .json(await setUserRole(actingUserId, id, input.role));
};

export const listAdminReviewsHandler: RequestHandler = async (
  request,
  response,
) => {
  const query = adminReviewQuerySchema.parse(request.query);
  response.status(200).json(await listAdminReviews(query));
};

export const deleteAdminReviewHandler: RequestHandler = async (
  request,
  response,
) => {
  await adminDeleteReview(idParam(request));
  response.status(204).end();
};
