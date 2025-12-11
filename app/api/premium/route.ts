import { NextRequest } from "next/server";
import { generateSlots, checkWin } from "@/utils/slots";

export async function GET(req: NextRequest) {
  const slots = generateSlots();
  const { win, prize } = checkWin(slots);

  return Response.json({
    slots,
    win,
    prize,
    timestamp: Date.now(),
  });
}
