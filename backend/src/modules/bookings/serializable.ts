import { db } from "../../common/lib/prisma-client";
import { Prisma } from "../../generated/prisma/client";

const MAX_SERIALIZATION_ATTEMPTS = 3;

// Thrown when the authoritative in-transaction recheck finds the slot gone —
// distinct from a transient write conflict, so the retry loop knows not to
// retry it (the slot really is taken; retrying won't change that).
export class SlotUnavailableError extends Error {}

// Runs `fn` inside a Serializable transaction, retrying on P2034 ("Transaction
// failed due to a write conflict") — Postgres's signal that two overlapping
// transactions raced and one has to lose. Without this, the availability
// recheck and the booking insert are two separate statements with a gap
// between them, and two near-simultaneous submissions for the same slot can
// both pass the recheck before either commits.
export async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_SERIALIZATION_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (err) {
      const isWriteConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (isWriteConflict && attempt < MAX_SERIALIZATION_ATTEMPTS - 1) continue;
      throw err;
    }
  }
  throw new Error("unreachable");
}
