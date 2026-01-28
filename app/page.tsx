"use client";

import { useState, useEffect, useCallback } from "react";
import { useModal, useAccount, useClient, useWallet } from "@getpara/react-sdk";
import {
  createParaViemClient,
  createParaAccount,
} from "@getpara/viem-v2-integration";
import { baseSepolia } from "viem/chains";
import { http, formatUnits } from "viem";
import { useLogout } from "@getpara/react-sdk";
import { USDC_ADDRESS, USDC_ABI } from "@/utils/contract";
import { publicClient } from "@/utils/viem";

const FOOD_ITEMS = [
  { id: 1, emoji: "🍎", name: "Apple", price: 0.001 },
  { id: 2, emoji: "🍌", name: "Banana", price: 0.001 },
  { id: 3, emoji: "🍕", name: "Pizza", price: 0.002 },
  { id: 4, emoji: "🧃", name: "Juice", price: 0.001 },
  { id: 5, emoji: "🍩", name: "Donut", price: 0.001 },
  { id: 6, emoji: "🍔", name: "Burger", price: 0.002 },
  { id: 7, emoji: "🍿", name: "Popcorn", price: 0.001 },
  { id: 8, emoji: "🍫", name: "Chocolate", price: 0.001 },
  { id: 9, emoji: "🥤", name: "Soda", price: 0.001 },
  { id: 10, emoji: "🍦", name: "Ice Cream", price: 0.001 },
  { id: 11, emoji: "🌮", name: "Taco", price: 0.002 },
  { id: 12, emoji: "🍪", name: "Cookie", price: 0.001 },
];

type CartItem = typeof FOOD_ITEMS[number];

export default function Home() {
  const { openModal } = useModal();
  const { isConnected } = useAccount();
  const { data: wallet } = useWallet();
  const para = useClient();
  const { logout } = useLogout();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!wallet?.address) return;

    try {
      const usdcBal = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [wallet.address as `0x${string}`],
      });

      setUsdcBalance(formatUnits(usdcBal, 6));
    } catch (err) {
      console.error("Failed to fetch balances:", err);
    }
  }, [wallet?.address]);

  useEffect(() => {
    if (isConnected && wallet?.address) {
      fetchBalances();
    }
  }, [isConnected, wallet?.address, fetchBalances]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
    setError(null);
    setSuccess(null);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  const handlePayment = async () => {
    if (!isConnected || !para) {
      openModal();
      return;
    }

    if (cart.length === 0) {
      setError("Add items to your cart first!");
      return;
    }

    const usdcNum = parseFloat(usdcBalance || "0");
    if (usdcNum < totalPrice) {
      setError(`Insufficient USDC. You need at least $${totalPrice.toFixed(3)}`);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsPaying(true);

    try {
      const viemAccount = createParaAccount(para);
      const walletClient = createParaViemClient(para, {
        account: viemAccount,
        chain: baseSepolia,
        transport: http(),
      });

      const { wrapFetchWithPayment } = await import("x402-fetch");
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const res = await fetchWithPayment("/api/premium", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(`🎉 Checkout complete! Enjoy your ${cart.map(i => i.emoji).join(" ")}`);
        setCart([]);
        fetchBalances();
      } else {
        throw new Error(data.message || "Payment failed");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      if (err.name === "AbortError") {
        setError("Payment timed out. Please try again.");
      } else if (err.message?.includes("signing")) {
        setError("Wallet signing failed. Please ensure you're using a Para embedded wallet, not an external wallet like MetaMask.");
      } else {
        setError(err.message || "Payment failed. Please try again.");
      }
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-600">x402 Shop</h1>
          <p className="text-gray-500 text-sm">x402 + Para Wallet Demo</p>
        </div>

        {/* Wallet Connection */}
        {isConnected && wallet?.address ? (
          <div 
            onClick={() => openModal()}
            className="mb-6 border-2 border-green-500 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-green-50 transition-colors"
          >
            <div>
              <span className="text-green-600 text-sm font-medium block">Connected</span>
              <span className="text-gray-700 font-mono text-sm">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
              {usdcBalance && (
                <span className="text-gray-500 text-xs block mt-1">
                  Balance: ${parseFloat(usdcBalance).toFixed(4)} USDC
                </span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="bg-red-50 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => openModal()}
            className="mb-6 w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            Connect Wallet
          </button>
        )}

        {/* Food Grid */}
        <div className="grid grid-cols-6 gap-2 mb-6">
          {FOOD_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center text-3xl hover:bg-gray-100 hover:scale-105 transition-all active:scale-95 shadow-sm"
              title={`${item.name} - $${item.price}`}
            >
              {item.emoji}
            </button>
          ))}
        </div>

        {/* Cart */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🛒</span>
            <span className="font-semibold text-gray-800">Cart ({cart.length})</span>
            {cart.length > 0 && (
              <span className="ml-auto text-purple-600 font-medium">
                ${totalPrice.toFixed(3)}
              </span>
            )}
          </div>
          
          {cart.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              Click on items to add them to cart
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cart.map((item, index) => (
                <button
                  key={index}
                  onClick={() => removeFromCart(index)}
                  className="bg-white rounded-lg p-2 text-2xl shadow-sm hover:bg-red-50 hover:scale-105 transition-all"
                  title="Click to remove"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm text-center">
            {success}
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={isPaying || cart.length === 0}
          className={`w-full py-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all ${
            isPaying || cart.length === 0
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl"
          }`}
        >
          {isPaying ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <span className="text-xl">💳</span>
              Pay with USDC
            </>
          )}
        </button>
      </div>
    </div>
  );
}
