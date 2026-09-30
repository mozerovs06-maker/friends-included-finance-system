import { NextRequest, NextResponse } from "next/server";
import { listTransactions } from "@/lib/repository";
import { publicError, submitExpense, submitSale } from "@/lib/service";
import { deliverTelegram } from "@/lib/telegram";
import { syncSheet } from "@/lib/sheets";
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
    const context = {
      actorId: body.actorId as EmployeeId,
      source: "website" as const,
    };
    const transaction =
      body.type === "sale"
        ? await submitSale(context, body)
        : await submitExpense(context, body);
    await Promise.allSettled([
      syncSheet(transaction),
      deliverTelegram(transaction, "submission"),
    ]);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 400 });
  }
}
