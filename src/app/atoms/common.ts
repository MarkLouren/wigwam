import { atomFamily } from "jotai/utils";
import { dequal } from "dequal/lite";
import {
  atomWithStorage,
  atomWithRepoQuery,
  atomWithAutoReset,
} from "lib/atom-utils";
import { INITIAL_NETWORK } from "fixtures/networks";

import * as Repo from "core/repo";
import { getAccounts, onAccountsUpdated } from "core/client";
import {
  CHAIN_ID,
  ACCOUNT_ADDRESS,
  SENT_ANALYTIC_NETWORKS,
  ONBOARDING_POPUP,
} from "core/types";
import { getRpcUrlKey } from "core/common/network";

import { testNetworksAtom } from "./settings";

export const chainIdAtom = atomWithStorage<number>(
  CHAIN_ID,
  INITIAL_NETWORK.chainId,
);

export const accountAddressAtom = atomWithStorage<string | null>(
  ACCOUNT_ADDRESS,
  null,
);

export const allAccountsAtom = atomWithAutoReset(getAccounts, {
  onMount: onAccountsUpdated,
  resetDelay: 5_000,
});

export const tokensWithoutBalanceAtom = atomWithStorage<boolean>(
  "without_balance",
  true,
);

export const currenciesRateAtom = atomWithStorage<Record<string, number>>(
  "currencies_rate",
  { USD: 1 },
);

export const selectedCurrencyAtom = atomWithStorage(
  "preferred_currency",
  "USD",
);

export const getNetworkAtom = atomFamily((chainId: number) =>
  atomWithRepoQuery((query) => {
    return query(() => Repo.networks.get(chainId));
  }),
);

export const getRpcUrlAtom = atomFamily((chainId: number) =>
  atomWithStorage<string | null>(getRpcUrlKey(chainId), null),
);

export const allNetworksAtom = atomWithRepoQuery((query, get) =>
  query(async () => {
    const testnetsEnabled = await get(testNetworksAtom);

    return Repo.networks
      .where("type")
      .anyOf(["mainnet", "unknown", ...(testnetsEnabled ? ["testnet"] : [])])
      .toArray();
  }),
);

export const getContactsAtom = atomFamily(
  (params: Repo.QueryContactsParams) =>
    atomWithRepoQuery((query) => query(() => Repo.queryContacts(params))),
  dequal,
);

export const sentAnalyticNetworksAtom = atomWithStorage<number[]>(
  SENT_ANALYTIC_NETWORKS,
  [],
);

export const onboardingPopupAtom = atomWithStorage<boolean>(
  ONBOARDING_POPUP,
  true,
);
