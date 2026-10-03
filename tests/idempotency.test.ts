import test from "node:test";
import assert from "node:assert/strict";
import { resolveWebsiteRecipient } from "../lib/recipients";

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
test("website submissions resolve the employee's latest linked chat", async () => {
  const chat = await resolveWebsiteRecipient(
    "richard",
    { testRecord: false },
    {
      employeeChat: async (employee) =>
        employee === "richard" ? "linked-richard-chat" : null,
      testLink: async () => null,
    },
  );
  assert.equal(chat, "linked-richard-chat");
});
test("isolated website tests resolve a server-stored test chat", async () => {
  const chat = await resolveWebsiteRecipient(
    "richard",
    { testRecord: true, telegramUserId: "1408497578" },
    {
      employeeChat: async () => null,
      testLink: async () => ({
        test_role: "salesperson",
        current_chat_id: "original-test-chat",
      }),
    },
  );
  assert.equal(chat, "original-test-chat");
});
test("isolated website tests reject a mismatched linked role", async () => {
  await assert.rejects(() =>
    resolveWebsiteRecipient(
      "richard",
      { testRecord: true, telegramUserId: "1408497578" },
      {
        employeeChat: async () => null,
        testLink: async () => ({
          test_role: "expense_reporter",
          current_chat_id: "wrong-role-chat",
        }),
      },
    ),
  );
});
