import express from "express";
import User from "../models/user";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import config from "../utils/config";
import crypto from "node:crypto";
import { withUser } from "../utils/middleware";
const router = express.Router();
const TOKEN_LIFETIME_SECONDS = 60 * 60;
const DUMMY_HASH = "$2b$10$XaOQIOfXg1FdfHMRXDeQyebA6gh8vsSirzz.TGxmQqHAgr2DYNDB.";

// TODO (P3): login con el JWT en una cookie httpOnly y el token CSRF en un header.
router.post("/", async (request, response) => {
  const { username, password } = request.body;
  const user = await User.findOne({ username });
  const passwordCorrect = await bcrypt.compare(
    password ?? "",
    user?.passwordHash ?? DUMMY_HASH
  );
  if (!user || !passwordCorrect) {
    return response.status(401).json({ error: "invalid username or password" });
  }
  const csrf = crypto.randomUUID();
  const token = jwt.sign(
    { id: user._id, username: user.username, csrf },
    config.JWT_SECRET,
    { expiresIn: TOKEN_LIFETIME_SECONDS }
  );
  response.setHeader("X-CSRF-Token", csrf);
  response.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_LIFETIME_SECONDS * 1000,
  });
  return response.status(200).json({ username: user.username });
});

// TODO (P4): usuario de la sesión actual (protegido con withUser).
router.get("/me", async (request, response) => {
  response.status(501).json({ error: "not implemented" });
});

// TODO (P4): cerrar sesión.
router.post("/logout", async (request, response) => {
  response.status(501).json({ error: "not implemented" });
});

export default router;
