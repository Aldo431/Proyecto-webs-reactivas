import { NextFunction, Request, Response } from "express";
import logger from "./logger";

const requestLogger = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  logger.info("Method:", request.method);
  logger.info("Path:  ", request.path);
  logger.info("Body:  ", request.body);
  logger.info("---");
  next();
};

const unknownEndpoint = (request: Request, response: Response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

const errorHandler = (
  error: { name: string; message: string },
  request: Request,
  response: Response,
  next: NextFunction
) => {
  logger.error(error.message);

  if (error.name === "CastError") {
    response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    response.status(400).json({ error: error.message });
  }
  // TODO (P2): username o email repetido (E11000)
  else if (error.code === 11000) {
    const [field, value] = Object.entries(error.keyValue ?? {})[0] ?? [];
    response.status(400).json({
      error: `${field} "${value}" is already in use`
    });
  // TODO (P4): token expirado (TokenExpiredError)
  else if (error.name === "TokenExpiredError") {
    response.status(401).json({ error: "token expired" });
  }
};

// TODO (P4): verificar el JWT de la cookie `token` y el header `X-CSRF-Token`,
// y guardar el id del usuario en `req.userId`.
export const withUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req;
    const token = authReq.cookies?.token;
    if (!token) {
      res.status(401).json({ error: "token missing" });
      return;
    }else {
      const decodedToken = jwt.verify(token, config.JWT_SECRET);
      const csrfToken = req.headers["x-csrf-token"];
      if (typeof decodedToken === "object" && decodedToken.id && decodedToken.csrf == csrfToken) {
        authReq.userId = decodedToken.id;
        next();
        return;
      } else {
        res.status(401).json({ error: "invalid token" });
        return;
      }
    }
  } catch (error) {
    res.status(401).json({ error: "invalid token" });
  }
};

// TODO (P5): withOptionalUser

export default { requestLogger, unknownEndpoint, errorHandler };
