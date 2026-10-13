import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";
import type { PublicUser } from "@tiendadcc/utils";

export interface UserFields {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  toPublicJSON(): PublicUser;
}

export type UserModel = Model<UserFields, object, UserMethods>;

export type UserDocument = HydratedDocument<UserFields, UserMethods>;

const userSchema = new Schema<UserFields, UserModel, UserMethods>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio."],
      trim: true,
      minlength: [1, "El nombre es obligatorio."],
      maxlength: [80, "El nombre no puede superar los 80 caracteres."],
    },
    email: {
      type: String,
      required: [true, "El correo electrónico es obligatorio."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

userSchema.methods.toPublicJSON = function (): PublicUser {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
  };
};

export const User = model<UserFields, UserModel>("User", userSchema);
