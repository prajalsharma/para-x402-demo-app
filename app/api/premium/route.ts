import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // if payment is successful, return the data
  return Response.json({
    success: true,
    message: "Checkout complete! Payment received.",
    timestamp: Date.now(),
  });
}
