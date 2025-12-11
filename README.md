# Para x402 Slot Machine

A Next.js application demonstrating integration of Para social wallets with the x402 payment protocol for micropayments on Base Sepolia.

## Overview

This project showcases how to build a pay-per-use application using Para's embedded wallet SDK and Coinbase's x402 payment protocol. Users can authenticate via social logins (Google, Twitter, Discord, etc.) or connect external wallets, then make USDC micropayments to play a slot machine game.

## Features

- Social login authentication (Google, Twitter, Apple, Discord, Facebook, Farcaster, Telegram)
- Email and phone number authentication
- External wallet support (MetaMask, WalletConnect)
- x402 protocol for HTTP-native payments
- USDC micropayments on Base Sepolia
- Automatic payment handling with x402-fetch

## Prerequisites

- Node.js 18+
- Bun, npm, yarn, or pnpm
- Para API Key (get one at https://developer.getpara.com)
- WalletConnect Project ID (get one at https://cloud.walletconnect.com)

## Installation

```bash
git clone https://github.com/prajalsharma/para-x402-demo-app/
cd client
bun install
```

## Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_PARA_CLIENT=your_para_api_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PARA_CLIENT` | Your Para API key from the developer dashboard |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID for external wallet connections |

## Running the Application

```bash
bun dev
```

Open http://localhost:3000 in your browser.

## Project Structure

```
client/
├── app/
│   ├── api/premium/route.ts    # Protected API endpoint
│   ├── layout.tsx              # Root layout with Providers
│   ├── page.tsx                # Main slot machine UI
│   └── globals.css
├── context/
│   └── providers.tsx           # Para and React Query providers
├── middleware.ts               # x402 payment middleware
├── utils/
│   ├── viem.ts                 # Viem public client setup
│   ├── contract.ts             # USDC contract ABI
│   ├── slots.ts                # Slot machine logic
│   └── constants.ts            # Game constants
└── types/
    └── types.ts
```

## Integrating Para in Your Next.js Project

### Step 1: Install Dependencies

```bash
bun add @getpara/react-sdk @tanstack/react-query graz @cosmjs/cosmwasm-stargate @cosmjs/launchpad @cosmjs/proto-signing @cosmjs/stargate @cosmjs/tendermint-rpc @leapwallet/cosmos-social-login-capsule-provider long starknet wagmi viem @farcaster/mini-app-solana @farcaster/miniapp-sdk @farcaster/miniapp-wagmi-connector @solana-mobile/wallet-adapter-mobile @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-walletconnect @solana/web3.js --save-exact
```

### Step 2: Create the Providers Context

Create `context/providers.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParaProvider } from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { baseSepolia } from "viem/chains";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: process.env.NEXT_PUBLIC_PARA_CLIENT!,
        }}
        config={{
          appName: "Your App Name",
        }}
        externalWalletConfig={{
          wallets: ["METAMASK"],
          includeWalletVerification: true,
          evmConnector: {
            config: {
              chains: [baseSepolia],
            },
          },
          walletConnect: {
            projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
          },
        }}
        paraModalConfig={{
          disableEmailLogin: false,
          disablePhoneLogin: false,
          authLayout: ["AUTH:FULL"],
          oAuthMethods: ["GOOGLE", "TWITTER", "APPLE", "DISCORD", "FACEBOOK", "FARCASTER", "TELEGRAM"],
          onRampTestMode: true,
          recoverySecretStepEnabled: true,
          twoFactorAuthEnabled: false,
        }}
      >
        {children}
      </ParaProvider>
    </QueryClientProvider>
  );
}
```

### Step 3: Wrap Your App with Providers

Update `app/layout.tsx`:

```tsx
import { Providers } from "../context/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 4: Use Para Hooks in Components

```tsx
"use client";

import { useModal, useAccount, useClient, useWallet, useLogout } from "@getpara/react-sdk";
import { createParaViemClient, createParaAccount } from "@getpara/viem-v2-integration";
import { baseSepolia } from "viem/chains";
import { http } from "viem";

export default function MyComponent() {
  const { openModal } = useModal();
  const { isConnected } = useAccount();
  const { data: wallet } = useWallet();
  const para = useClient();
  const { logout } = useLogout();

  const handleConnect = () => {
    openModal();
  };

  const signTransaction = async () => {
    if (!para) return;
    
    const viemAccount = createParaAccount(para);
    const walletClient = createParaViemClient(para, {
      account: viemAccount,
      chain: baseSepolia,
      transport: http(),
    });

    // Use walletClient for transactions
  };

  return (
    <div>
      {isConnected ? (
        <>
          <p>Connected: {wallet?.address}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

## x402 Payment Flow

### Middleware Setup

The x402 middleware intercepts requests to protected routes and handles payment verification:

```ts
// middleware.ts
import { paymentMiddleware } from "x402-next";

const SELLERS_WALLET = "0xYourWalletAddress";

export const middleware = paymentMiddleware(
  SELLERS_WALLET,
  {
    "/api/premium": {
      price: "$0.005",
      network: "base-sepolia",
      config: {
        description: "Description of the protected resource",
      },
    },
  },
  { url: "https://x402.org/facilitator" }
);

export const config = {
  matcher: ["/api/:path*"],
  runtime: "nodejs",
};
```

### Client-Side Payment Handling

```tsx
import { wrapFetchWithPayment } from "x402-fetch";
import { createParaViemClient, createParaAccount } from "@getpara/viem-v2-integration";

const handlePayment = async () => {
  const viemAccount = createParaAccount(para);
  const walletClient = createParaViemClient(para, {
    account: viemAccount,
    chain: baseSepolia,
    transport: http(),
  });

  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);
  
  // This automatically handles 402 responses and signs payments
  const response = await fetchWithPayment("/api/premium");
  const data = await response.json();
};
```

### Flow Diagram

1. Client makes request to protected endpoint
2. Middleware returns 402 Payment Required with payment details
3. Client wraps fetch with `wrapFetchWithPayment`
4. x402-fetch automatically signs and submits payment
5. Middleware verifies payment via facilitator
6. Protected resource is returned

## Para Configuration Options

### OAuth Methods

Available social login providers:

```ts
oAuthMethods: ["GOOGLE", "TWITTER", "APPLE", "DISCORD", "FACEBOOK", "FARCASTER", "TELEGRAM"]
```

### External Wallets

Supported external wallets:

```ts
wallets: ["METAMASK", "COINBASE", "RAINBOW", "WALLET_CONNECT"]
```

### Chain Configuration

Configure supported EVM chains:

```ts
evmConnector: {
  config: {
    chains: [baseSepolia, mainnet, polygon],
  },
},
```

## Testing

The application uses Base Sepolia testnet. Get test USDC and ETH from:

- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- USDC can be obtained through testnet bridges or faucets

