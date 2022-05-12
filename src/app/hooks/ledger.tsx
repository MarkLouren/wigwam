import { useCallback, useRef } from "react";
import Transport from "@ledgerhq/hw-transport";
import retry from "async-retry";

import type LedgerEthType from "@ledgerhq/hw-app-eth";
import type { getExtendedKey as getExtendedKeyType } from "lib/ledger";

import { withHumanDelay } from "app/utils";
import { LoadingHandler, useDialog } from "app/hooks/dialog";

import LargeSpinner from "app/components/elements/LargeSpinner";

export type LedgerHandler = (
  params: {
    ledgerEth: LedgerEthType;
    getExtendedKey: typeof getExtendedKeyType;
  },
  onClose: (callback: () => void) => void
) => Promise<any>;

export function useLedger() {
  const { waitLoading } = useDialog();

  const transportRef = useRef<Transport>();

  const loadingHandler = useCallback<
    LoadingHandler<LedgerHandler, "loading" | "connectApp">
  >(
    ({ params: ledgerHandler, onClose, setState }) =>
      withHumanDelay(async () => {
        try {
          let closed = false;
          onClose(() => (closed = true));

          const [{ default: LedgerEth }, { LedgerTransport, getExtendedKey }] =
            await Promise.all([
              import("@ledgerhq/hw-app-eth"),
              import("lib/ledger"),
            ]);

          return await retry(
            async () => {
              if (closed) return false;

              await transportRef.current?.close();
              transportRef.current = await LedgerTransport.create();

              onClose(() => transportRef.current?.close());

              const { name: currentApp } = await getAppInfo(
                transportRef.current
              );
              if (closed) return false;

              if (currentApp !== "Ethereum") {
                if (currentApp !== "BOLOS") {
                  await disconnectFromConnectedApp(transportRef.current);
                  await timeout(500);
                  if (closed) return false;
                }

                setState("connectApp");
                await connectToEthereumApp(transportRef.current);
                await timeout(500);
                if (closed) return false;
                setState("loading");
              }

              const ledgerEth = new LedgerEth(transportRef.current);

              await ledgerHandler({ ledgerEth, getExtendedKey }, onClose);

              if (closed) return false;

              return true;
            },
            { retries: 5, maxTimeout: 2_000 }
          );
        } catch (err: any) {
          const msg = err?.message ?? "Unknown error";

          if (msg === "user closed popup") return false;

          throw new Error(msg);
        }
      }),
    []
  );

  const withLedgerAction = useCallback(
    async (handler: LedgerHandler) => {
      const answer = await waitLoading({
        title: "Loading...",
        headerClassName: "mb-3",
        content: (state: "loading" | "connectApp") => (
          <>
            <span className="mb-5">
              Please proceed connecting to the ledger.
            </span>
            {state === "loading" && <LargeSpinner />}
            {state === "connectApp" && "Please connect to Ethereum app"}
          </>
        ),
        loadingHandler,
        handlerParams: handler,
        state: "loading",
      });

      return answer;
    },
    [loadingHandler]
  );

  return withLedgerAction;
}

const getAppInfo = async (
  transport: Transport
): Promise<{
  name: string;
  version: string;
  flags: number | Buffer;
}> => {
  const r = await transport.send(0xb0, 0x01, 0x00, 0x00);
  let i = 0;
  const format = r[i++];

  if (format !== 1) {
    throw new Error("getAppAndVersion: format not supported");
  }

  const nameLength = r[i++];
  const name = r.slice(i, (i += nameLength)).toString("ascii");
  const versionLength = r[i++];
  const version = r.slice(i, (i += versionLength)).toString("ascii");
  const flagLength = r[i++];
  const flags = r.slice(i, (i += flagLength));
  return {
    name,
    version,
    flags,
  };
};

const connectToEthereumApp = async (transport: Transport): Promise<void> => {
  await transport.send(
    0xe0,
    0xd8,
    0x00,
    0x00,
    Buffer.from("Ethereum", "ascii")
  );
};

const disconnectFromConnectedApp = async (
  transport: Transport
): Promise<void> => {
  await transport.send(0xb0, 0xa7, 0x00, 0x00);
};

const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
