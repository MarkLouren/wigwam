import { Network } from "core/types";

export const BSC: Network[] = [
  // Mainnet
  {
    chainId: 56,
    type: "mainnet",
    rpcUrls: [
      "https://bsc-dataseed1.binance.org",
      "https://rpc.ankr.com/bsc",
      "https://binance.llamarpc.com",
      "https://bsc-dataseed.bnbchain.org",
      "https://1rpc.io/bnb",
      "https://endpoints.omniatech.io/v1/bsc/mainnet/public",
      "https://bsc-rpc.gateway.pokt.network",
      "https://bsc.publicnode.com",
      "https://bsc.drpc.org",
      "https://bsc.meowrpc.com",
      "https://bsc-dataseed.binance.org",
      "https://bsc-dataseed2.binance.org",
      "https://bsc-dataseed3.binance.org",
      "https://bsc-dataseed4.binance.org",
      "https://bsc-dataseed1.defibit.io",
      "https://bsc-dataseed2.defibit.io",
      "https://bsc-dataseed3.defibit.io",
      "https://bsc-dataseed4.defibit.io",
      "https://bsc-dataseed1.ninicoin.io",
      "https://bsc-dataseed2.ninicoin.io",
      "https://bsc-dataseed3.ninicoin.io",
      "https://bsc-dataseed4.ninicoin.io",
    ],
    chainTag: "bsc",
    name: "BNB Smart Chain",
    nativeCurrency: {
      symbol: "BNB",
      name: "Binance Native Token",
      decimals: 18,
    },
    explorerUrls: ["https://bscscan.com"],
    explorerApiUrl: "https://api.bscscan.com/api",
    faucetUrls: [],
    infoUrl: "https://www.binance.org",
  },

  // Testnets
  {
    chainId: 97,
    type: "testnet",
    rpcUrls: [
      "https://endpoints.omniatech.io/v1/bsc/testnet/public",
      "https://bsc-testnet.publicnode.com",
      "https://data-seed-prebsc-1-s1.binance.org:8545",
      "https://data-seed-prebsc-1-s3.binance.org:8545",
      "https://data-seed-prebsc-1-s2.binance.org:8545",
      "https://data-seed-prebsc-2-s2.binance.org:8545",
      "https://data-seed-prebsc-2-s3.binance.org:8545",
      "https://data-seed-prebsc-2-s1.binance.org:8545",
    ],
    chainTag: "bsc",
    name: "BNB Smart Testnet",
    nativeCurrency: {
      symbol: "tBNB",
      name: "Binance Native Token",
      decimals: 18,
    },
    explorerUrls: ["https://testnet.bscscan.com"],
    explorerApiUrl: "https://api-testnet.bscscan.com/api",
    faucetUrls: ["https://testnet.binance.org/faucet-smart"],
    infoUrl: "https://testnet.binance.org/",
  },
];
