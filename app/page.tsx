"use client";

import { useModal, useAccount, useWallet } from "@getpara/react-sdk";

export default function ConnectButton() {
  const { openModal } = useModal();
  const { data: wallet } = useWallet();
  const { isConnected } = useAccount();

  return (
    <button onClick={() => openModal()}>
      {isConnected
        ? `Connected: ${wallet?.address?.slice(
            0,
            6
          )}...${wallet?.address?.slice(-4)}`
        : "Connect Wallet"}
    </button>
  );
}
