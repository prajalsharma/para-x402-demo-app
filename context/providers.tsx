"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParaProvider } from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { baseSepolia } from "viem/chains";

const queryClient = new QueryClient();

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: process.env.NEXT_PUBLIC_PARA_CLIENT! ,
        }}
        config={{
          appName: "x402 demo",
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
