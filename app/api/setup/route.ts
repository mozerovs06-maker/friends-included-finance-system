import { NextRequest, NextResponse } from "next/server";
import { authorizeManager } from "@/lib/domain";
import { publicError } from "@/lib/service";
import { saveTelegramLink } from "@/lib/repository";
import type { EmployeeId } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    authorizeManager(body.actorId as EmployeeId);
    if (
      !process.env.MANAGER_SETUP_KEY ||
      body.setupKey !== process.env.MANAGER_SETUP_KEY
    )
      throw new Error("Manager setup key is incorrect");
    await saveTelegramLink(
      String(body.telegramUserId),
      body.employeeId as EmployeeId,
      String(body.telegramUserId),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 403 });
  }
}
