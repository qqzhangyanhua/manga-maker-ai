import { afterAll, afterEach, beforeEach } from "vitest";
import { beginTestTransaction, disconnectTestDatabase, rollbackTestTransaction } from "./harness";

beforeEach(async () => {
  await beginTestTransaction();
});

afterEach(async () => {
  await rollbackTestTransaction();
});

afterAll(async () => {
  await disconnectTestDatabase();
});
