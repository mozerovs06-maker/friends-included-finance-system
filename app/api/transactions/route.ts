import { NextRequest, NextResponse } from "next/server";
import { listTransactions } from "@/lib/repository";
import { publicError, submitExpense, submitSale } from "@/lib/service";
import { deliverTelegram } from "@/lib/telegram";
import { syncSheet } from "@/lib/sheets";
import { resolveWebsiteRecipient } from "@/lib/recipients";
import type { EmployeeId } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const actorId = request.nextUrl.searchParams.get("actor") as EmployeeId;
    return NextResponse.json(await listTransactions(actorId));
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorId = body.actorId as EmployeeId;
    const testRecord = String(body.reference ?? "")
      .toUpperCase()
      .startsWith("TST-");
    const telegramChatId = await resolveWebsiteRecipient(actorId, {
      testRecord,
      telegramUserId: body.telegramUserId,
    });
    const context = {
      actorId,
      source: "website" as const,
      telegramChatId,
    };
    const input = { ...body, testRecord };
    const transaction =
      body.type === "sale"
        ? await submitSale(context, input)
        : await submitExpense(context, input);
    await Promise.allSettled([
      syncSheet(transaction),
      deliverTelegram(transaction, "submission"),
    ]);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 400 });
  }
}
