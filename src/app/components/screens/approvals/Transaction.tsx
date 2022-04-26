import {
  FC,
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import classNames from "clsx";
import { useAtomValue } from "jotai";
import { ethers } from "ethers";
import useForceUpdate from "use-force-update";
import * as Tabs from "@radix-ui/react-tabs";
import { createOrganicThrottle } from "lib/system/organicThrottle";

import { TransactionApproval } from "core/types";
import { allAccountsAtom } from "app/atoms";
import { approveItem } from "core/client";

import { useOnBlock, useProvider } from "app/hooks";
import WalletCard from "app/components/elements/WalletCard";
import NumberInput from "app/components/elements/NumberInput";
import LongTextField from "app/components/elements/LongTextField";
import NetworkPreview from "app/components/elements/NetworkPreview";

import ApprovalLayout from "./Layout";
import ScrollAreaContainer from "app/components/elements/ScrollAreaContainer";
import { withHumanDelay } from "app/utils";

const TAB_VALUES = ["summary", "fee", "data", "raw", "error"] as const;

const TAB_NAMES: Record<TabValue, ReactNode> = {
  summary: "Summary",
  fee: "Fee",
  data: "Data",
  raw: "Raw",
  error: "Error",
};

type TabValue = typeof TAB_VALUES[number];

type ApproveTransactionProps = {
  approval: TransactionApproval;
};

const ApproveTransaction: FC<ApproveTransactionProps> = ({ approval }) => {
  const allAccounts = useAtomValue(allAccountsAtom);
  const account = useMemo(
    () => allAccounts.find((acc) => acc.address === approval.accountAddress)!,
    [approval, allAccounts]
  );

  const provider = useProvider();

  const forceUpdate = useForceUpdate();

  const [tabValue, setTabValue] = useState<TabValue>("summary");
  const [lastError, setLastError] = useState<any>(null);
  const [approving, setApproving] = useState(false);

  const preparedTxRef = useRef<ethers.utils.UnsignedTransaction>();
  const preparedTx = preparedTxRef.current;

  const withThrottle = useMemo(createOrganicThrottle, []);

  const estimateTx = useCallback(
    () =>
      withThrottle(async () => {
        try {
          let { txParams } = approval;

          if ("gas" in txParams) {
            const { gas, ...rest } = txParams;
            txParams = { ...rest, gasLimit: gas };
          }

          const tx = await provider
            .getUncheckedSigner(account.address)
            .populateTransaction({
              ...txParams,
              type: bnify(txParams?.type)?.toNumber(),
              chainId: bnify(txParams?.chainId)?.toNumber(),
            });
          delete tx.from;

          preparedTxRef.current = {
            ...tx,
            nonce: bnify(tx.nonce)?.toNumber(),
          };

          forceUpdate();
        } catch (err) {
          console.error(err);
          setLastError(err);
        }
      }),
    [
      withThrottle,
      forceUpdate,
      provider,
      account.address,
      approval,
      setLastError,
    ]
  );

  useEffect(() => {
    estimateTx();
  }, [estimateTx]);

  useOnBlock(() => estimateTx());

  useEffect(() => {
    setTabValue(lastError ? "error" : "summary");
  }, [setTabValue, lastError]);

  useEffect(() => {
    if (preparedTx) console.info({ preparedTx });
  }, [preparedTx]);

  const handleApprove = useCallback(
    async (approved: boolean) => {
      setLastError(null);
      setApproving(true);

      try {
        await withHumanDelay(async () => {
          let rawTx: string | undefined;

          if (approved) {
            if (!preparedTx) return;

            rawTx = ethers.utils.serializeTransaction(preparedTx);
          }

          await approveItem(approval.id, { approved, rawTx });
        });
      } catch (err) {
        console.error(err);
        setLastError(err);
        setApproving(false);
      }
    },
    [approval, setLastError, setApproving, preparedTx]
  );

  const loading = approving || (!preparedTx && !lastError);

  return (
    <ApprovalLayout
      approveText={lastError ? "Retry" : "Approve"}
      onApprove={handleApprove}
      loading={loading}
    >
      <ScrollAreaContainer
        className="w-full box-content -mr-5 pr-5"
        viewPortClassName="viewportBlock"
      >
        <NetworkPreview className="mb-4" />

        <WalletCard account={account} className="!w-full" />

        <Tabs.Root
          defaultValue="summary"
          orientation="horizontal"
          value={tabValue}
          onValueChange={(v) => setTabValue(v as TabValue)}
          className="mt-6 w-full"
        >
          <Tabs.List
            aria-label="Approve tabs"
            className={classNames("flex items-center")}
          >
            {TAB_VALUES.map((value, i, arr) => {
              if (value === "error" && !lastError) return null;

              const active = value === tabValue;
              const last = i === arr.length - 1;

              return (
                <Tabs.Trigger
                  key={value}
                  value={value}
                  className={classNames(
                    "font-semibold text-sm",
                    "px-4 py-2",
                    !last && "mr-1",
                    active && "bg-white/10 rounded-md"
                  )}
                >
                  {TAB_NAMES[value]}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          <Tabs.Content value="summary">
            <div className="w-full p-4"></div>
          </Tabs.Content>

          <Tabs.Content value="fee">
            {preparedTx ? <TxFee tx={preparedTx} /> : <Loading />}
          </Tabs.Content>

          <Tabs.Content value="data">
            {preparedTx ? <TxData tx={preparedTx} /> : <Loading />}
          </Tabs.Content>

          <Tabs.Content value="raw">
            {preparedTx ? <TxSign tx={preparedTx} /> : <Loading />}
          </Tabs.Content>

          <Tabs.Content value="error">
            {lastError && (
              <LongTextField
                readOnly
                value={lastError?.message || "Unknown error."}
              />
            )}
          </Tabs.Content>
        </Tabs.Root>
      </ScrollAreaContainer>
    </ApprovalLayout>
  );
};

export default ApproveTransaction;

type TxFeeProps = {
  tx: ethers.utils.UnsignedTransaction;
};

const TxFee = memo<TxFeeProps>(({ tx }) => {
  return (
    <div className="w-full p-4">
      <NumberInput
        label="Gas Limit"
        placeholder="0"
        thousandSeparator
        decimalScale={0}
        defaultValue={formatUnits(tx.gasLimit)}
        className="w-full mb-4"
      />

      {tx.maxPriorityFeePerGas ? (
        <>
          <NumberInput
            label="Max priority fee"
            placeholder="0.00"
            thousandSeparator
            decimalScale={9}
            defaultValue={formatUnits(tx.maxPriorityFeePerGas, "gwei")}
            className="w-full mb-4"
          />

          <NumberInput
            label="Max fee"
            placeholder="0.00"
            thousandSeparator
            decimalScale={9}
            defaultValue={formatUnits(tx.maxFeePerGas, "gwei")}
            className="w-full mb-4"
          />
        </>
      ) : (
        <>
          <NumberInput
            label="Gas Price"
            placeholder="0.00"
            thousandSeparator
            decimalScale={9}
            defaultValue={formatUnits(tx.gasPrice, "gwei")}
            className="w-full mb-4"
          />
        </>
      )}
    </div>
  );
});

type TxDataProps = {
  tx: ethers.utils.UnsignedTransaction;
};

const TxData = memo<TxDataProps>(({ tx }) => {
  return (
    <div className="w-full p-4">
      <LongTextField
        label="Data"
        readOnly
        value={ethers.utils.hexlify(tx.data ?? "0x00")}
        textareaClassName="!h-36"
      />
    </div>
  );
});

type TxSignProps = {
  tx: ethers.utils.UnsignedTransaction;
};

const TxSign = memo<TxSignProps>(({ tx }) => {
  const rawTx = useMemo(() => ethers.utils.serializeTransaction(tx), [tx]);

  return (
    <div className="w-full p-4">
      <LongTextField
        label="Raw transaction"
        readOnly
        value={rawTx}
        textareaClassName="!h-48"
      />
    </div>
  );
});

const Loading: FC = () => (
  <div
    className={classNames(
      "h-full flex items-center justify-center",
      "text-white text-lg text-semibold"
    )}
  >
    Loading...
  </div>
);

function bnify(v?: ethers.BigNumberish) {
  return v !== undefined ? ethers.BigNumber.from(v) : undefined;
}

function formatUnits(v?: ethers.BigNumberish, unit: ethers.BigNumberish = 0) {
  if (v === undefined) return v;
  return ethers.utils.formatUnits(v, unit);
}
