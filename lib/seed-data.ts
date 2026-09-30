import type { Transaction } from "./types";

const now = "2026-09-26T07:12:00.000Z";
const base = {
  id: "",
  source: "website" as const,
  originalTelegramChatId: null,
  submittedAt: now,
  testRecord: false,
  customer: null,
  project: null,
  category: null,
  proposedAllocation: null,
  finalAllocation: null,
  allocationChanged: null,
  proposedSplit: null,
  approvedSplit: null,
  commissionPoolCents: 0,
  commissionRichardCents: 0,
  commissionAnastasiaCents: 0,
  commissionJeanClaudeCents: 0,
  splitChanged: null,
  approvedBy: null,
  approvedAt: null,
  sheetStatus: "pending" as const,
  sheetRowId: null,
  telegramSubmissionStatus: "not_linked" as const,
  telegramDecisionStatus: "not_linked" as const,
  deliveryError: null,
  deliveryAttempts: 0,
  lastDeliveryAttemptAt: null,
};
const split = (r: number, a: number, j: number) => ({
  richard: r,
  anastasia: a,
  jeanClaude: j,
});
const sale = (
  reference: string,
  by: Transaction["submittedByEmployeeId"],
  customer: string,
  project: "A" | "B",
  description: string,
  amountCents: number,
  proposed: ReturnType<typeof split>,
  approved?: ReturnType<typeof split>,
): Transaction => {
  const pool = approved ? Math.round(amountCents * 0.1) : 0;
  const amounts = approved
    ? [
        Math.round((pool * approved.richard) / 100),
        Math.round((pool * approved.anastasia) / 100),
        Math.round((pool * approved.jeanClaude) / 100),
      ]
    : [0, 0, 0];
  amounts[0] += pool - amounts.reduce((s, v) => s + v, 0);
  return {
    ...base,
    id: reference,
    reference,
    type: "sale",
    submittedByEmployeeId: by,
    description,
    amountCents,
    status: approved ? "approved" : "pending_approval",
    customer,
    project,
    proposedSplit: proposed,
    approvedSplit: approved ?? null,
    commissionPoolCents: pool,
    commissionRichardCents: amounts[0],
    commissionAnastasiaCents: amounts[1],
    commissionJeanClaudeCents: amounts[2],
    splitChanged: approved
      ? JSON.stringify(proposed) !== JSON.stringify(approved)
      : null,
    approvedBy: approved ? "svetlana" : null,
    approvedAt: approved ? now : null,
  };
};
const expense = (
  reference: string,
  description: string,
  category: Transaction["category"],
  amountCents: number,
  proposal: Transaction["proposedAllocation"],
  final?: Transaction["finalAllocation"],
): Transaction => ({
  ...base,
  id: reference,
  reference,
  type: "expense",
  submittedByEmployeeId: "kevin",
  description,
  amountCents,
  status: final
    ? final === "OVERHEAD"
      ? "allocated_automatically"
      : "approved"
    : "awaiting_allocation",
  category,
  proposedAllocation: proposal,
  finalAllocation: final ?? null,
  allocationChanged: final ? proposal !== final : null,
  approvedBy: final && final !== "OVERHEAD" ? "svetlana" : null,
  approvedAt: final && final !== "OVERHEAD" ? now : null,
});

export const homeworkSeed: Transaction[] = [
  sale(
    "S01",
    "richard",
    "Olivia Rose",
    "A",
    "One proud uncle and an emotional grandmother",
    100000,
    split(50, 30, 20),
    split(50, 30, 20),
  ),
  sale(
    "S02",
    "anastasia",
    "Daniel King",
    "B",
    "University friends, dancing, and the stripping performance",
    200000,
    split(0, 50, 50),
    split(20, 40, 40),
  ),
  sale(
    "S03",
    "jean-claude",
    "Emma Stonebridge",
    "A",
    "Premium relatives, including an uncle presented as a surgeon",
    150000,
    split(40, 40, 20),
    split(20, 30, 50),
  ),
  sale(
    "S04",
    "richard",
    "Lucas Green",
    "B",
    "Small group of loud university friends",
    80000,
    split(25, 25, 50),
    split(25, 25, 50),
  ),
  sale(
    "S05",
    "richard",
    "Mia Brooks",
    "B",
    "Extra guests and an embarrassing speech",
    60000,
    split(100, 0, 0),
  ),
  expense(
    "E01",
    "Rented suit and fake pearl necklace for the relatives",
    "Materials",
    12000,
    "A",
    "A",
  ),
  expense(
    "E02",
    "Taxi for the grandmother; Kevin selected the wrong project",
    "Travel",
    8000,
    "B",
    "A",
  ),
  expense(
    "E03",
    "Monthly company website subscription",
    "Other",
    10000,
    "OVERHEAD",
    "OVERHEAD",
  ),
  expense(
    "E04",
    "Replacement costumes after an enthusiastic dance performance",
    "Materials",
    25000,
    "B",
    "B",
  ),
  expense(
    "E05",
    "Minibus for university friends; Kevin selected the wrong project again",
    "Travel",
    9000,
    "A",
    "B",
  ),
  expense(
    "E06",
    "Company telephone subscription",
    "Other",
    6000,
    "OVERHEAD",
    "OVERHEAD",
  ),
  expense(
    "E07",
    "Emergency replacement clothing; project allocation still needs checking",
    "Materials",
    14000,
    "A",
  ),
];
