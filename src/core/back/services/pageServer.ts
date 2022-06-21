import { Runtime } from "webextension-polyfill";
import { ethErrors } from "eth-rpc-errors";
import { liveQuery, Subscription } from "dexie";
import { livePromise } from "lib/system/livePromise";
import { storage } from "lib/ext/storage";
import { PorterServer, MessageContext } from "lib/ext/porter/server";

import { INITIAL_NETWORK } from "fixtures/networks";
import {
  PorterChannel,
  JsonRpcResponse,
  JsonRpcRequest,
  ActivitySource,
  Permission,
  CHAIN_ID,
  ACCOUNT_ADDRESS,
  ActivityType,
} from "core/types";
import * as repo from "core/repo";
import { JSONRPC, VIGVAM_FAVICON, VIGVAM_STATE } from "core/common/rpc";
import { getPageOrigin, wrapPermission } from "core/common/permissions";

import {
  $accountAddresses,
  $approvals,
  $walletStatus,
  approvalResolved,
  ensureInited,
  isUnlocked,
} from "../state";
import { handleRpc } from "../rpc";

type InternalStateType = "walletStatus" | "chainId" | "accountAddress";

export function startPageServer() {
  const pagePorter = new PorterServer<any>(PorterChannel.Page);

  pagePorter.onMessage(handlePageRequest);

  const permissionSubs = new Map<Runtime.Port, Subscription>();
  const internalStateSubs = new Map<
    Runtime.Port,
    (type: InternalStateType) => void
  >();

  pagePorter.onConnection(async (action, port) => {
    if (!port.sender?.url) return;

    const { origin } = new URL(port.sender.url);
    if (!origin) return;

    await ensureInited();

    if (action === "connect") {
      const permission = await repo.permissions.get(origin);
      notifyPermission(port, permission);

      const sub = liveQuery(() => repo.permissions.get(origin)).subscribe(
        (perm) => notifyPermission(port, perm)
      );

      permissionSubs.set(port, sub);

      internalStateSubs.set(port, async (type) => {
        const perm = await repo.permissions.get(origin).catch(() => undefined);

        switch (type) {
          case "walletStatus":
            notifyPermission(port, perm);
            resolveConnectionApproval(perm);
            break;

          case "chainId":
            if (!perm) notifyPermission(port);
            break;

          case "accountAddress":
            if (perm) notifyPermission(port, perm);
            break;
        }
      });
    } else {
      const permSub = permissionSubs.get(port);
      if (permSub) {
        permSub.unsubscribe();
        permissionSubs.delete(port);
      }

      internalStateSubs.delete(port);
    }
  });

  const handleInternalStateUpdated = (type: InternalStateType) => {
    for (const notify of internalStateSubs.values()) {
      notify(type);
    }
  };

  $walletStatus.watch(() => handleInternalStateUpdated("walletStatus"));
  subscribeInternalChainId(() => handleInternalStateUpdated("chainId"));
  subscribeAccountAddress(() => handleInternalStateUpdated("accountAddress"));

  const notifyPermission = async (port: Runtime.Port, perm?: Permission) => {
    let params;

    if (isUnlocked() && perm) {
      const internalAccountAddress = await loadAccountAddress();

      let accountAddress;

      if (perm.accountAddresses.includes(internalAccountAddress)) {
        accountAddress = internalAccountAddress;
      } else {
        const allAccountAddresses = $accountAddresses.getState();

        accountAddress =
          perm.accountAddresses.find((address) =>
            allAccountAddresses.includes(address)
          ) ?? null;
      }

      params = {
        chainId: perm.chainId,
        accountAddress: accountAddress?.toLowerCase(),
      };
    } else {
      params = {
        chainId: perm?.chainId ?? (await loadInternalChainId()),
        accountAddress: null,
      };
    }

    pagePorter.notify(port, {
      jsonrpc: JSONRPC,
      method: VIGVAM_STATE,
      params,
    });
  };
}

const faviconCache = new WeakMap<Runtime.Port, string>();

async function handlePageRequest(
  ctx: MessageContext<JsonRpcRequest, JsonRpcResponse>
) {
  console.debug("New page request", ctx);

  const { id, jsonrpc, method, params } = ctx.data;

  if (method === VIGVAM_FAVICON) {
    if (Array.isArray(params) && typeof params[0] === "string") {
      faviconCache.set(ctx.port, params[0]);
    }

    return;
  }

  try {
    await ensureInited();

    const senderUrl = ctx.port.sender?.url;
    if (!senderUrl) {
      throw ethErrors.rpc.resourceNotFound();
    }

    const source: ActivitySource = {
      type: "page",
      url: senderUrl,
      tabId: ctx.port.sender?.tab?.id,
      favIconUrl:
        faviconCache.get(ctx.port) || ctx.port.sender?.tab?.favIconUrl,
    };

    const chainId = await loadInternalChainId();

    handleRpc(source, chainId, method, (params as any[]) ?? [], (response) => {
      if ("error" in response) {
        // Send plain object, not an Error instance
        // Also remove error stack
        const { message, code, data } = response.error;
        response = {
          error: { message, code, data },
        };
      }

      ctx.reply({
        id,
        jsonrpc,
        ...response,
      });
    });
  } catch (err) {
    console.error(err);

    ctx.reply({
      id,
      jsonrpc,
      error: ethErrors.rpc.internal(),
    });
  }
}

async function resolveConnectionApproval(perm?: Permission) {
  if (!(isUnlocked() && perm)) return;

  try {
    for (const approval of $approvals.getState()) {
      if (
        approval.type === ActivityType.Connection &&
        getPageOrigin(approval.source) === perm.origin
      ) {
        const result = approval.returnSelectedAccount
          ? perm.accountAddresses
          : [wrapPermission(perm)];

        approval.rpcReply?.({ result });
        approvalResolved(approval.id);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

const loadInternalChainId = livePromise(
  () => storage.fetch<number>(CHAIN_ID).catch(() => INITIAL_NETWORK.chainId),
  subscribeInternalChainId
);

function subscribeInternalChainId(callback: (chainId: number) => void) {
  return storage.subscribe<number>(CHAIN_ID, ({ newValue }) =>
    callback(newValue ?? INITIAL_NETWORK.chainId)
  );
}

const loadAccountAddress = livePromise(
  () => storage.fetch<string>(ACCOUNT_ADDRESS).catch(getDefaultAccountAddress),
  subscribeAccountAddress
);

function subscribeAccountAddress(callback: (address: string) => void) {
  return storage.subscribe<string>(ACCOUNT_ADDRESS, ({ newValue }) =>
    callback(newValue ?? getDefaultAccountAddress())
  );
}

function getDefaultAccountAddress() {
  return $accountAddresses.getState()[0];
}
