import type { RequestHandler } from "express";

export const getAdminSession: RequestHandler = (_request, response) => {
  response.status(200).json({ role: "admin" });
};
