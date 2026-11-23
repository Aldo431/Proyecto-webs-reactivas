import mongoose from "mongoose";

export async function connectToDatabase(
  uri: string,
  databaseName?: string,
): Promise<void> {
  await mongoose.connect(uri, databaseName ? { dbName: databaseName } : {});
}
