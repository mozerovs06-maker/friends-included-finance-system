export const employeeIds = [
  "svetlana",
  "richard",
  "anastasia",
  "jean-claude",
  "kevin",
] as const;
export type EmployeeId = (typeof employeeIds)[number];
export type Role = "manager" | "salesperson" | "expense_reporter";
export type Project = "A" | "B";
export type Allocation = Project | "OVERHEAD";
export type DeliveryStatus = "pending" | "sent" | "failed" | "not_linked";
export type TransactionStatus =
  | "pending_approval"
  | "awaiting_allocation"
  | "approved"
  | "allocated_automatically";

export type Employee = {
  id: EmployeeId;
  name: string;
  role: Role;
  active: boolean;
};
export type Split = { richard: number; anastasia: number; jeanClaude: number };

export type Transaction = {
  id: string;
  reference: string;
  type: "sale" | "expense";
  source: "website" | "telegram";
  submittedByEmployeeId: EmployeeId;
  originalTelegramChatId: string | null;
  submittedAt: string;
  description: string;
  amountCents: number;
  status: TransactionStatus;
  testRecord: boolean;
  customer: string | null;
  project: Project | null;
  category: "Materials" | "Travel" | "Other" | null;
  proposedAllocation: Allocation | null;
  finalAllocation: Allocation | null;
  allocationChanged: boolean | null;
  proposedSplit: Split | null;
  approvedSplit: Split | null;
  commissionPoolCents: number;
  commissionRichardCents: number;
  commissionAnastasiaCents: number;
  commissionJeanClaudeCents: number;
  splitChanged: boolean | null;
  approvedBy: EmployeeId | null;
  approvedAt: string | null;
  sheetStatus: DeliveryStatus;
  sheetRowId: string | null;
  telegramSubmissionStatus: DeliveryStatus;
  telegramDecisionStatus: DeliveryStatus;
  deliveryError: string | null;
  deliveryAttempts: number;
  lastDeliveryAttemptAt: string | null;
};
