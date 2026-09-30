import { NextRequest, NextResponse } from "next/server";
import { saveTestTelegramLink } from "@/lib/repository";
import { publicError } from "@/lib/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!/^\d{4,20}$/.test(String(body.telegramUserId)))
      throw new Error("Enter a valid numeric Telegram user ID");
    if (!["salesperson", "expense_reporter"].includes(body.role))
      throw new Error("Invalid test role");
    await saveTestTelegramLink(String(body.telegramUserId), body.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 400 });
  }
}
