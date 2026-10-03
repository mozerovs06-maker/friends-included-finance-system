import { employee } from "./employees";
import { telegramLinkForEmployee, testTelegramLink } from "./repository";
import type { EmployeeId } from "./types";

type TestLink = Awaited<ReturnType<typeof testTelegramLink>>;
type RecipientDependencies = {
  employeeChat: (employeeId: EmployeeId) => Promise<string | null>;
  testLink: (userId: string) => Promise<TestLink>;
};

const defaultDependencies: RecipientDependencies = {
  employeeChat: telegramLinkForEmployee,
  testLink: testTelegramLink,
};

export async function resolveWebsiteRecipient(
  actorId: EmployeeId,
  options: { testRecord: boolean; telegramUserId?: unknown },
  dependencies: RecipientDependencies = defaultDependencies,
) {
  if (!options.testRecord) return dependencies.employeeChat(actorId);

  const userId = String(options.telegramUserId ?? "").trim();
  if (!/^\d{4,20}$/.test(userId))
    throw new Error("Link a valid Telegram user ID before the website test");
  const link = await dependencies.testLink(userId);
  if (!link) throw new Error("This Telegram test account is not linked");

  const requiredRole =
    employee(actorId)?.role === "expense_reporter"
      ? "expense_reporter"
      : "salesperson";
  if (link.test_role !== requiredRole)
    throw new Error(
      `Link the ${requiredRole.replace("_", " ")} test role first`,
    );
  return link.current_chat_id;
}
