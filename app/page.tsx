"use client";

import { useState, useEffect, useCallback } from "react";
import { useModal, useAccount, useClient, useWallet } from "@getpara/react-sdk";
import {
  createParaViemClient,
  createParaAccount,
} from "@getpara/viem-v2-integration";
import { baseSepolia } from "viem/chains";
import { http, formatUnits, createPublicClient } from "viem";
import { useLogout } from "@getpara/react-sdk";
import { USDC_ADDRESS, USDC_ABI } from "@/utils/contract";
import { SYMBOLS } from "@/utils/constants";
import { GameState } from "@/types/types";
import { publicClient } from "@/utils/viem";

export default function Home() {
  const { openModal } = useModal();
  const { isConnected } = useAccount();
  const { data: wallet } = useWallet();
  const para = useClient();
  const { logout } = useLogout();

  const [gameState, setGameState] = useState<GameState>("idle");
  const [slots, setSlots] = useState(["?", "?", "?"]);
  const [result, setResult] = useState<{
    win: boolean;
    prize: string;
    slots: string[];
  } | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!wallet?.address) return;

    try {
      const [usdcBal, ethBal] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "balanceOf",
          args: [wallet.address as `0x${string}`],
        }),
        publicClient.getBalance({ address: wallet.address as `0x${string}` }),
      ]);

      setUsdcBalance(formatUnits(usdcBal, 6));
      setEthBalance(formatUnits(ethBal, 18));
    } catch (err) {
      console.error("Failed to fetch balances:", err);
    }
  }, [wallet?.address]);

  useEffect(() => {
    if (isConnected && wallet?.address) {
      fetchBalances();
    }
  }, [isConnected, wallet?.address, fetchBalances]);

  const spinAnimation = useCallback(() => {
    const interval = setInterval(() => {
      setSlots([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
    }, 100);
    return interval;
  }, []);

  const handlePlay = async () => {
    if (!isConnected || !para) {
      openModal();
      return;
    }

    const usdcNum = parseFloat(usdcBalance || "0");
    const ethNum = parseFloat(ethBalance || "0");

    if (usdcNum < 0.005) {
      setError("Insufficient USDC balance. You need at least $0.005 to play.");
      return;
    }
    if (ethNum < 0.0001) {
      setError(
        "Insufficient ETH for gas. Please add some ETH for transaction fees."
      );
      return;
    }

    setError(null);
    setResult(null);
    setGameState("spinning");

    const spinInterval = spinAnimation();

    try {
      const response = await fetch("/api/premium");

      if (response.status === 402) {
        clearInterval(spinInterval);
        setGameState("payment_required");
        return;
      }

      clearInterval(spinInterval);
      const data = await response.json();
      setSlots(data.slots);
      setResult(data);
      setGameState("result");
    } catch (err) {
      clearInterval(spinInterval);
      setError("Something went wrong. Please try again.");
      setGameState("idle");
    }
  };

  const handlePayment = async () => {
    if (!para) return;

    setGameState("paying");
    const spinInterval = spinAnimation();

    try {
      const viemAccount = createParaAccount(para);
      const walletClient = createParaViemClient(para, {
        account: viemAccount,
        chain: baseSepolia,
        transport: http(),
      });

      const { wrapFetchWithPayment } = await import("x402-fetch");
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);

      const res = await fetchWithPayment("/api/premium", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      clearInterval(spinInterval);
      const data = await res.json();
      setSlots(data.slots);
      setResult(data);
      setGameState("result");
      fetchBalances();
    } catch (err: any) {
      clearInterval(spinInterval);
      setError(err.message || "Payment failed. Please try again.");
      setGameState("idle");
    }
  };

  const resetGame = () => {
    setGameState("idle");
    setSlots(["?", "?", "?"]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white font-mono text-black">
      {/* Navbar */}
      <nav className="border-b border-black px-6 py-4 flex justify-between items-center">
        <span className="text-lg font-bold">SLOT402</span>
        <div className="flex items-center gap-4">
          {isConnected && wallet?.address ? (
            <>
              <span className="text-sm">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
              <button
                onClick={() => logout()}
                className="text-sm border border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
              >
                logout
              </button>
            </>
          ) : (
            <button
              onClick={() => openModal()}
              className="text-sm border border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
            >
              connect wallet
            </button>
          )}
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-md mx-auto px-6 py-12">
        {/* Balance Info */}
        {isConnected && usdcBalance && ethBalance && (
          <div className="mb-8 text-sm border border-black p-4 text-black bg-gray-50">
            <div className="flex justify-between mb-1">
              <span className="text-black">USDC:</span>
              <span className="text-black font-medium">
                ${parseFloat(usdcBalance).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">ETH (gas):</span>
              <span className="text-black font-medium">
                {parseFloat(ethBalance).toFixed(6)}
              </span>
            </div>
            {parseFloat(usdcBalance) < 0.005 && (
              <p className="mt-2 text-xs text-red-600">
                ⚠ need at least $0.005 USDC
              </p>
            )}
            {parseFloat(ethBalance) < 0.0001 && (
              <p className="mt-2 text-xs text-red-600">
                ⚠ need ETH for gas fees
              </p>
            )}
          </div>
        )}

        {/* Slot Machine */}
        <div className="border border-black p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl mb-1">SPIN TO WIN</h1>
            <p className="text-xs text-gray-600">$0.005 per spin</p>
          </div>

          {/* Slots Display */}
          <div className="flex justify-center gap-2 mb-6">
            {slots.map((symbol, i) => (
              <div
                key={i}
                className="w-20 h-20 border border-black flex items-center justify-center text-4xl bg-gray-50"
              >
                {symbol}
              </div>
            ))}
          </div>

          {/* Result */}
          {gameState === "result" && result && (
            <div
              className={`text-center mb-6 p-4 ${
                result.win
                  ? "bg-green-50 border border-green-600"
                  : "bg-gray-50 border border-gray-300"
              }`}
            >
              <p className="text-lg font-bold">
                {result.win ? "🎉 WINNER!" : "TRY AGAIN"}
              </p>
              {result.win && <p className="text-sm">{result.prize}</p>}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center mb-6 p-4 bg-red-50 border border-red-600">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Payment Required */}
          {gameState === "payment_required" && (
            <div className="text-center mb-6 p-4 bg-yellow-50 border border-yellow-600">
              <p className="text-sm mb-3">payment required to spin</p>
              <button
                onClick={handlePayment}
                className="text-sm bg-black text-white px-6 py-2 hover:bg-gray-800 transition-colors"
              >
                pay $0.005 & spin
              </button>
            </div>
          )}

          {/* Action Button */}
          <div className="text-center">
            {gameState === "idle" && (
              <button
                onClick={handlePlay}
                className="text-sm bg-black text-white px-8 py-3 hover:bg-gray-800 transition-colors"
              >
                {isConnected ? "PLAY" : "CONNECT TO PLAY"}
              </button>
            )}

            {(gameState === "spinning" || gameState === "paying") && (
              <button
                disabled
                className="text-sm bg-gray-400 text-white px-8 py-3 cursor-not-allowed"
              >
                {gameState === "paying" ? "PROCESSING..." : "SPINNING..."}
              </button>
            )}

            {gameState === "result" && (
              <button
                onClick={resetGame}
                className="text-sm border border-black px-8 py-3 hover:bg-black hover:text-white transition-colors"
              >
                PLAY AGAIN
              </button>
            )}

            {gameState === "payment_required" && (
              <button
                onClick={resetGame}
                className="text-xs text-gray-500 mt-4 underline"
              >
                cancel
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          powered by Para & x402 protocol
        </p>
      </main>
    </div>
  );
}
