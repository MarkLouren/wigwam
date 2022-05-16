import BigNumber from "bignumber.js";
import memoize from "mem";

import { Account, AccountAsset, TokenStatus, TokenType } from "core/types";
import {
  createAccountTokenKey,
  getNativeTokenLogoUrl,
  NATIVE_TOKEN_SLUG,
} from "core/common/tokens";
import { getNetwork } from "core/common/network";
import * as repo from "core/repo";

import { getDebankUserChainBalance } from "../debank";
import { getCoinGeckoNativeTokenPrice } from "../coinGecko";
import { getBalanceFromChain } from "../chain";

export const syncNativeTokens = memoize(
  async (chainId: number, _buster: string, accounts: Account | Account[]) => {
    if (!Array.isArray(accounts)) {
      accounts = [accounts];
    }

    const dbKeys = accounts.map((acc) =>
      createAccountTokenKey({
        chainId,
        accountAddress: acc.address,
        tokenSlug: NATIVE_TOKEN_SLUG,
      })
    );

    const [
      { nativeCurrency, chainTag },
      existingTokens,
      balances,
      portfolios,
      cgPrice,
    ] = await Promise.all([
      getNetwork(chainId),
      repo.accountTokens.bulkGet(dbKeys),
      Promise.all(
        accounts.map((acc) =>
          getBalanceFromChain(chainId, NATIVE_TOKEN_SLUG, acc.address)
        )
      ),
      Promise.all(
        accounts.map((acc) => getDebankUserChainBalance(chainId, acc.address))
      ),
      getCoinGeckoNativeTokenPrice(chainId),
    ]);

    const priceUSD = cgPrice?.usd?.toString();
    const priceUSDChange = cgPrice?.usd_24h_change?.toString();

    await repo.accountTokens.bulkPut(
      accounts.map((acc, i) => {
        const existing = existingTokens[i] as AccountAsset;
        const balance = balances[i];
        const portfolioUSD =
          existing?.portfolioUSD === "-1" && !portfolios[i]
            ? "0"
            : portfolios[i] ?? existing?.portfolioUSD;

        if (existing) {
          if (!balance) {
            return {
              ...existing,
              priceUSD,
              priceUSDChange,
              portfolioUSD,
            };
          }

          const rawBalance = balance.toString();
          const balanceUSD = priceUSD
            ? new BigNumber(rawBalance)
                .div(10 ** nativeCurrency.decimals)
                .times(priceUSD)
                .toNumber()
            : existing.balanceUSD;

          return {
            ...existing,
            rawBalance,
            balanceUSD,
            priceUSD,
            priceUSDChange,
            portfolioUSD,
          };
        } else {
          const rawBalance = balance?.toString() ?? "0";
          const balanceUSD =
            balance && priceUSD
              ? new BigNumber(rawBalance)
                  .div(10 ** nativeCurrency.decimals)
                  .times(priceUSD)
                  .toNumber()
              : 0;

          return {
            chainId,
            accountAddress: acc.address,
            tokenType: TokenType.Asset,
            status: TokenStatus.Native,
            tokenSlug: NATIVE_TOKEN_SLUG,
            decimals: nativeCurrency.decimals,
            name: nativeCurrency.name,
            symbol: nativeCurrency.symbol,
            logoUrl: getNativeTokenLogoUrl(chainTag),
            rawBalance,
            balanceUSD,
            priceUSD,
            priceUSDChange,
            portfolioUSD,
          };
        }
      }),
      dbKeys
    );
  },
  {
    cacheKey: ([chainId, buster]) => `${chainId}${buster}`,
    maxAge: 20_000, // 20 sec
  }
);
