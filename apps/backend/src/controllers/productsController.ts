import type { Request, RequestHandler } from "express";
import {
  createProductInputSchema,
  productListQuerySchema,
  updateProductInputSchema,
} from "@tiendadcc/utils";
import { UnauthorizedError } from "../errors.ts";
import {
  assertProductOwner,
  createProduct,
  deleteProduct,
  findPublicProduct,
  getProductImage,
  listProducts,
  listProductsBySeller,
  updateProduct,
} from "../services/productService.ts";

function requireUserId(request: Request): string {
  const id = request.user?.id;
  if (!id) {
    throw new UnauthorizedError();
  }
  return id;
}

function productIdParam(request: Request): string {
  const { id } = request.params;
  return typeof id === "string" ? id : "";
}

export const listProductsHandler: RequestHandler = async (
  request,
  response,
) => {
  const query = productListQuerySchema.parse(request.query);
  response.status(200).json(await listProducts(query));
};

export const listMyProductsHandler: RequestHandler = async (
  request,
  response,
) => {
  response
    .status(200)
    .json(await listProductsBySeller(requireUserId(request)));
};

export const getProductHandler: RequestHandler = async (request, response) => {
  response.status(200).json(await findPublicProduct(productIdParam(request)));
};

export const getProductImageHandler: RequestHandler = async (
  request,
  response,
) => {
  const image = await getProductImage(productIdParam(request));
  if (image.kind === "redirect") {
    response.redirect(302, image.location);
    return;
  }
  response
    .status(200)
    .set({
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    })
    .send(image.data);
};

export const createProductHandler: RequestHandler = async (
  request,
  response,
) => {
  const userId = requireUserId(request);
  // `seller` y `featured` no existen en el esquema: el cuerpo no puede fijarlos.
  const input = createProductInputSchema.parse(request.body);
  response.status(201).json(await createProduct(userId, input));
};

export const updateProductHandler: RequestHandler = async (
  request,
  response,
) => {
  const id = productIdParam(request);
  // Orden 401 → 404 → 403 → 400 (RF-10): la propiedad se verifica antes de
  // validar el cuerpo.
  await assertProductOwner(requireUserId(request), id);
  const input = updateProductInputSchema.parse(request.body);
  response.status(200).json(await updateProduct(id, input));
};

export const deleteProductHandler: RequestHandler = async (
  request,
  response,
) => {
  await deleteProduct(requireUserId(request), productIdParam(request));
  response.status(204).end();
};
