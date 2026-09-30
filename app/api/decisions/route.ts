import { NextRequest, NextResponse } from "next/server";
import { allocateExpense, approveSale, publicError } from "@/lib/service";
import { syncSheet } from "@/lib/sheets";
import { deliverTelegram } from "@/lib/telegram";
import type { EmployeeId } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = body.actorId as EmployeeId;
    const transaction =
      body.type === "sale"
        ? await approveSale(actor, body.reference, body.split)
        : await allocateExpense(actor, body.reference, body.allocation);
    await Promise.allSettled([
      syncSheet(transaction),
      deliverTelegram(transaction, "decision"),
    ]);
    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 400 });
  }
}
