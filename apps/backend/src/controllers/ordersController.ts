import type { Request, RequestHandler } from "express";
import { createOrderInputSchema } from "@tiendadcc/utils";
import { UnauthorizedError } from "../errors.ts";
import { createOrder, listOrders } from "../services/orderService.ts";

function requireUserId(request: Request): string {
  const id = request.user?.id;
  if (!id) {
    throw new UnauthorizedError();
  }
  return id;
}

// Crear pedido (spec 012, RF-2): el usuario sale de la sesión, nunca del
// cuerpo. 201 con el pedido público; ZodError burbujea a `errorHandler`.
export const createOrderHandler: RequestHandler = async (
  request,
  response,
) => {
  const input = createOrderInputSchema.parse(request.body);
  response.status(201).json(await createOrder(requireUserId(request), input));
};

// Listado del perfil (spec 012, RF-8, RF-9): solo los pedidos propios,
// del más reciente al más antiguo.
export const listOrdersHandler: RequestHandler = async (
  request,
  response,
) => {
  response.status(200).json(await listOrders(requireUserId(request)));
};
