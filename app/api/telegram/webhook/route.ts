import { NextRequest, NextResponse } from "next/server";
import {
  listTransactions,
  telegramLink,
  testTelegramLink,
} from "@/lib/repository";
import { publicError, submitExpense, submitSale } from "@/lib/service";
import { deliverTelegram, statusMessage } from "@/lib/telegram";
import { syncSheet } from "@/lib/sheets";

function fields(text: string) {
  return text.split("|").map((part) => part.trim());
}
function money(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Amount must be a number");
  return Math.round(amount * 100);
}
async function reply(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (
    !process.env.TELEGRAM_WEBHOOK_SECRET ||
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  )
    return NextResponse.json({ ok: false }, { status: 401 });
  const update = await request.json();
  const message = update.message;
  if (!message?.text || !message?.from?.id || !message?.chat?.id)
    return NextResponse.json({ ok: true });
  const userId = String(message.from.id);
  const chatId = String(message.chat.id);
  const text = String(message.text).trim();
  try {
    if (text.startsWith("/start")) {
      await reply(
        chatId,
        `Your Telegram user ID is ${userId}. Ask the manager to link it, then use /sale, /expense, or /status.`,
      );
      return NextResponse.json({ ok: true });
    }
    const link = await telegramLink(userId);
    const testLink = link ? null : await testTelegramLink(userId);
    if (!link && !testLink)
      throw new Error(
        "This Telegram user is not linked. Send /start and use the public test page or ask the manager to link your ID.",
      );
    const linkedEmployee =
      link?.employee_id ??
      (testLink?.test_role === "salesperson" ? "richard" : "kevin");
    if (text.startsWith("/status")) {
      await reply(
        chatId,
        statusMessage(
          (await listTransactions(linkedEmployee)).filter((t) =>
            link ? true : t.testRecord,
          ),
        ),
      );
      return NextResponse.json({ ok: true });
    }
    let transaction;
    if (text.startsWith("/sale ")) {
      const [
        reference,
        customer,
        project,
        amount,
        description,
        richard,
        anastasia,
        jeanClaude,
      ] = fields(text.slice(6));
      transaction = await submitSale(
        { actorId: linkedEmployee, source: "telegram", telegramChatId: chatId },
        {
          reference,
          customer,
          project,
          amountCents: money(amount),
          description,
          proposedSplit: {
            richard: Number(richard),
            anastasia: Number(anastasia),
            jeanClaude: Number(jeanClaude),
          },
          testRecord: reference?.startsWith("TST-"),
        },
      );
    } else if (text.startsWith("/expense ")) {
      const [reference, amount, category, allocation, description] = fields(
        text.slice(9),
      );
      transaction = await submitExpense(
        { actorId: linkedEmployee, source: "telegram", telegramChatId: chatId },
        {
          reference,
          amountCents: money(amount),
          category,
          proposedAllocation:
            allocation === "Company overhead" ? "OVERHEAD" : allocation,
          description,
          testRecord: reference?.startsWith("TST-"),
        },
      );
    } else
      throw new Error(
        "Unknown command. Use /sale, /expense, /status, or /start.",
      );
    await deliverTelegram(transaction, "submission");
    await Promise.allSettled([syncSheet(transaction)]);
  } catch (error) {
    await reply(chatId, publicError(error));
  }
  return NextResponse.json({ ok: true });
}
