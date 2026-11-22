import type { RequestHandler } from "express";
import { verificationConfirmSchema, verificationRequestSchema } from "@tiendadcc/utils";
import {
  confirmStudentCode,
  requestStudentCode,
} from "../services/studentVerificationService.ts";

export const requestVerificationCode: RequestHandler = async (request, response) => {
  const input = verificationRequestSchema.parse(request.body);
  const result = await requestStudentCode(request.user?.id ?? "", input.email);
  response.status(202).json(result);
};

export const confirmVerificationCode: RequestHandler = async (request, response) => {
  const input = verificationConfirmSchema.parse(request.body);
  const result = await confirmStudentCode(request.user?.id ?? "", input.code);
  response.status(200).json(result);
};
