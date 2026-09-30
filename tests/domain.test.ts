import test from "node:test";
import assert from "node:assert/strict";
import {
  authorizeManager,
  authorizeSubmission,
  commission,
  expenseInputSchema,
  financials,
  saleInputSchema,
  splitSchema,
} from "../lib/domain";
import { homeworkSeed } from "../lib/seed-data";

test("invalid commission percentages are rejected", () =>
  assert.throws(() =>
    splitSchema.parse({ richard: 60, anastasia: 30, jeanClaude: 20 }),
  ));
test("zero, negative, and missing amounts are rejected", () => {
  for (const amountCents of [0, -1])
    assert.throws(() =>
      saleInputSchema.parse({
        reference: "S99",
        amountCents,
        customer: "C",
        project: "A",
        description: "D",
        proposedSplit: { richard: 100, anastasia: 0, jeanClaude: 0 },
      }),
    );
  assert.throws(() => expenseInputSchema.parse({ reference: "E99" }));
});
test("role enforcement denies forbidden actions", () => {
  assert.throws(() => authorizeManager("richard"));
  assert.throws(() => authorizeSubmission("kevin", "sale"));
  assert.throws(() => authorizeSubmission("anastasia", "expense"));
});
test("exact homework totals reconcile", () => {
  const f = financials(homeworkSeed);
  assert.equal(f.income, 530000);
  assert.equal(f.commissions, 53000);
  assert.equal(f.expenseTotal, 84000);
  assert.equal(f.result, 393000);
  assert.deepEqual(f.team, {
    richard: 14000,
    anastasia: 17500,
    jeanClaude: 21500,
  });
  assert.deepEqual(
    f.projects.map((p) => p.result),
    [205000, 218000],
  );
  assert.equal(
    f.projects.reduce((s, p) => s + p.result, 0) - f.overhead - f.awaiting,
    f.result,
  );
});
test("S05 and E07 remain pending", () => {
  assert.equal(
    homeworkSeed.find((t) => t.reference === "S05")?.status,
    "pending_approval",
  );
  assert.equal(
    homeworkSeed.find((t) => t.reference === "E07")?.status,
    "awaiting_allocation",
  );
});
test("commission rounding uses largest share and stable tie order", () => {
  assert.deepEqual(
    commission(101, { richard: 0, anastasia: 1, jeanClaude: 99 }),
    { pool: 10, richard: 0, anastasia: 0, jeanClaude: 10 },
  );
  assert.deepEqual(
    commission(101, { richard: 50, anastasia: 50, jeanClaude: 0 }),
    { pool: 10, richard: 5, anastasia: 5, jeanClaude: 0 },
  );
});
test("test records never alter assessed totals", () =>
  assert.deepEqual(
    financials([
      ...homeworkSeed,
      {
        ...homeworkSeed[0],
        id: "t",
        reference: "TST-1",
        testRecord: true,
        amountCents: 999999,
      },
    ]),
    financials(homeworkSeed),
  ));
