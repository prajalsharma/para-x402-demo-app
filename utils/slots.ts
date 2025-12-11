import { SYMBOLS } from "./constants";

export function generateSlots(): string[] {
  return [
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  ];
}

export function checkWin(slots: string[]): { win: boolean; prize: string } {
  if (slots[0] === slots[1] && slots[1] === slots[2]) {
    if (slots[0] === "7️⃣") return { win: true, prize: "JACKPOT! 777!" };
    if (slots[0] === "💎") return { win: true, prize: "DIAMOND WIN!" };
    return { win: true, prize: "THREE OF A KIND!" };
  }
  if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
    return { win: true, prize: "TWO MATCH!" };
  }
  return { win: false, prize: "" };
}
