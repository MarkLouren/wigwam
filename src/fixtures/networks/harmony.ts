import { Network } from "core/types";

export const HARMONY: Network[] = [
  // Mainnet
  {
    chainId: 1666600000,
    type: "mainnet",
    rpcUrls: [
      "https://api.harmony.one",
      "https://harmony-mainnet.chainstacklabs.com",
      "https://rpc.ankr.com/harmony",
      "https://harmony-0-rpc.gateway.pokt.network",
      "https://api.fuzz.fi",
      "https://rpc.hermesdefi.io",
      "https://api.s0.t.hmny.io",
      "https://a.api.s0.t.hmny.io",
    ],
    chainTag: "harmony",
    name: "Harmony One",
    nativeCurrency: {
      symbol: "ONE",
      name: "ONE",
      decimals: 18,
    },
    explorerUrls: ["https://explorer.harmony.one"],
    faucetUrls: [],
    infoUrl: "https://www.harmony.one/",
  },

  // Testnets
  {
    chainId: 1666700000,
    type: "testnet",
    rpcUrls: ["https://api.s0.b.hmny.io"],
    chainTag: "harmony",
    name: "Harmony Testnet Shard 0",
    nativeCurrency: {
      symbol: "ONE",
      name: "ONE",
      decimals: 18,
    },
    explorerUrls: ["https://explorer.pops.one"],
    faucetUrls: ["https://faucet.pops.one"],
    infoUrl: "https://www.harmony.one/",
  },
];
