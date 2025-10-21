import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";

const blocxMainnet = defineChain({
  id: 86996,
  name: "BLOCX Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "BLOCX",
    symbol: "BLOCX",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.blocxscan.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "BLOCX Explorer",
      url: "https://blocxscan.com",
    },
  },
});

export const config = getDefaultConfig({
  appName: "FarmrSwap",
  projectId: "8X1df9Wbcqj6A7LWG71Ra5yLYj-1eL7y",
  chains: [blocxMainnet],
  transports: {
    [blocxMainnet.id]: http(),
  },
});

