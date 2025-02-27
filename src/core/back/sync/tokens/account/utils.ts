import { IndexableTypeArray } from "dexie";

import * as repo from "core/repo";
import { AccountToken, TokenType } from "core/types";
import { NATIVE_TOKEN_SLUG, createAccountTokenKey } from "core/common/tokens";

export async function prepareAccountTokensSync<T extends AccountToken>(
  chainId: number,
  accountAddress: string,
  tokenType: TokenType,
) {
  const existingAccTokens = (await repo.accountTokens
    .where("[chainId+tokenType+accountAddress]")
    .equals([chainId, tokenType, accountAddress])
    .toArray()) as T[];

  const existingTokensMap = new Map(
    existingAccTokens
      .filter((t) => t.tokenSlug !== NATIVE_TOKEN_SLUG)
      .map((t) => [t.tokenSlug, t]),
  );

  const accTokens: AccountToken[] = [];
  const dbKeys: IndexableTypeArray = [];

  const addToken = (token: T) => {
    accTokens.push(token);

    dbKeys.push(
      createAccountTokenKey({
        chainId,
        accountAddress,
        tokenSlug: token.tokenSlug,
      }),
    );

    existingTokensMap.delete(token.tokenSlug);
  };

  const releaseToRepo = () => repo.accountTokens.bulkPut(accTokens, dbKeys);

  return {
    existingAccTokens,
    existingTokensMap,
    addToken,
    accTokens,
    releaseToRepo,
  };
}
