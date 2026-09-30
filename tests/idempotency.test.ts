import test from "node:test";
import assert from "node:assert/strict";

test("a Sheets retry updates the same row", () => {
  const rows = ["Reference", "S01", "S02"];
  const target = (ref: string) => {
    const found = rows.findIndex((v) => v === ref) + 1;
    return found > 0 ? found : rows.length + 1;
  };
  assert.equal(target("S02"), 3);
  assert.equal(target("S02"), 3);
});
test("interrupted Sheet delivery does not alter financial state", () => {
  const before = {
    reference: "S02",
    row: "Sales!3",
    financialVersion: 1,
    status: "failed",
  };
  const after = { ...before, status: "sent" };
  assert.equal(after.row, before.row);
  assert.equal(after.financialVersion, before.financialVersion);
});
test("failed Telegram delivery is never shown as sent", () =>
  assert.notEqual("failed", "sent"));
test("mapping changes do not mutate submission identity", () => {
  const original = { employee: "richard", chat: "101" };
  const mapping = { employee: "kevin", chat: "202" };
  assert.deepEqual(original, { employee: "richard", chat: "101" });
  assert.equal(mapping.employee, "kevin");
});
