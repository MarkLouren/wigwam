import { FC, useCallback } from "react";
import { useSetAtom } from "jotai";
import classNames from "clsx";

import { AccountNFT } from "core/types";

import { chainIdAtom } from "app/atoms";
import { useChainId, useAutoRefreshNftMetadata } from "app/hooks";
import { openInTab } from "app/helpers";
import { Page } from "app/nav";
import { prepareNFTLabel } from "app/utils";

import { ReactComponent as InfoRoundIcon } from "app/icons/info-round.svg";
import { ReactComponent as SendIcon } from "app/icons/send-small.svg";
import SecondaryModal, {
  SecondaryModalProps,
} from "app/components/elements/SecondaryModal";
import Button from "app/components/elements/Button";

import NftOverview from "../nft/NftOverview";

type NFTOverviewPopupProps = Pick<
  SecondaryModalProps,
  "open" | "onOpenChange"
> & {
  token: AccountNFT | null;
};

const NFTOverviewPopup: FC<NFTOverviewPopupProps> = ({ token, ...rest }) => {
  const chainId = useChainId();
  const setInternalChainId = useSetAtom(chainIdAtom);

  useAutoRefreshNftMetadata(token ?? undefined);

  const openLink = useCallback(
    (to: Record<string, unknown>) => {
      setInternalChainId(chainId);
      openInTab(to);
    },
    [setInternalChainId, chainId],
  );
  const tokenInfo = token
    ? prepareNFTLabel(token?.tokenId, token?.name)
    : undefined;

  return (
    <SecondaryModal {...rest} small>
      <div className={classNames("w-full h-[20rem]", "mt-4 mb-2")}>
        {token && (
          <NftOverview key={getNftOverviewKey(token)} token={token} small />
        )}
      </div>

      {tokenInfo && (
        <h3
          className={classNames(
            "line-clamp-2 break-words mt-2",
            "text-sm text-center font-bold",
            "w-full mb-4",
            !tokenInfo.name ? "text-brand-main" : "",
          )}
        >
          <span
            className={classNames(
              tokenInfo.name &&
                tokenInfo.name.length > 13 &&
                !tokenInfo.name.slice(0, 13).includes(" ") &&
                "break-all",
            )}
          >
            {tokenInfo.name}
          </span>
          {tokenInfo.name && tokenInfo.id ? " " : ""}
          {tokenInfo.id ? (
            <span
              className={classNames(
                "text-brand-main",
                tokenInfo.id.length > 11 ? "break-all" : "break-words",
              )}
            >
              {tokenInfo.id}
            </span>
          ) : (
            ""
          )}
        </h3>
      )}

      <div
        className={classNames(
          "w-full pt-4",
          "border-t border-brand-main/[.07]",
          "grid grid-cols-2 gap-2",
        )}
      >
        <Button
          theme="secondary"
          className="grow !py-2 !min-w-[8rem]"
          onClick={() =>
            token && openLink({ page: Page.Default, token: token.tokenSlug })
          }
        >
          <InfoRoundIcon className="w-6 h-auto mr-2" />
          Info
        </Button>

        <Button
          theme="secondary"
          className="grow !py-2 !min-w-[8rem]"
          onClick={() =>
            token && openLink({ page: Page.Transfer, token: token.tokenSlug })
          }
        >
          <SendIcon className="w-6 h-auto mr-2" />
          Transfer
        </Button>
      </div>
    </SecondaryModal>
  );
};

export default NFTOverviewPopup;

function getNftOverviewKey(token: AccountNFT) {
  return `${token.contentType}_${token.thumbnailUrl}_${token.contentUrl}`;
}
