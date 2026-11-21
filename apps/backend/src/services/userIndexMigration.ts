import { User } from "../models/User.ts";

export async function repairUserIndexes(): Promise<void> {
  const indexes = await User.collection.listIndexes().toArray();
  const legacyResetIndex = indexes.find(
    (index) =>
      index.name === "resetToken_1" &&
      index.unique === true &&
      index.partialFilterExpression === undefined,
  );
  if (legacyResetIndex?.name !== undefined) {
    await User.collection.dropIndex(legacyResetIndex.name);
  }
  await User.syncIndexes();
}
