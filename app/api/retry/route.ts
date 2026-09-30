import { NextRequest, NextResponse } from "next/server";
import { listTransactions } from "@/lib/repository";
import { authorizeManager } from "@/lib/domain";
import { publicError } from "@/lib/service";
import { syncSheet } from "@/lib/sheets";
import { deliverTelegram } from "@/lib/telegram";
import type { EmployeeId } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { actorId } = await request.json();
    authorizeManager(actorId as EmployeeId);
    const pending = (await listTransactions("svetlana")).filter(
      (t) =>
        t.sheetStatus === "pending" ||
        t.sheetStatus === "failed" ||
        t.telegramSubmissionStatus === "pending" ||
        t.telegramSubmissionStatus === "failed" ||
        t.telegramDecisionStatus === "failed",
    );
    for (const transaction of pending) {
      if (transaction.sheetStatus !== "sent")
        await Promise.allSettled([syncSheet(transaction)]);
      if (["pending", "failed"].includes(transaction.telegramSubmissionStatus))
        await Promise.allSettled([deliverTelegram(transaction, "submission")]);
      if (transaction.telegramDecisionStatus === "failed")
        await Promise.allSettled([deliverTelegram(transaction, "decision")]);
    }
    return NextResponse.json({ retried: pending.length });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 403 });
  }
}
