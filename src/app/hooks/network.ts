import { KeepPrevious, useLazyAtomValue } from "lib/atom-utils";

import { allNetworksAtom, getNetworkAtom } from "app/atoms";

import { useChainId } from "./chainId";

export function useLazyAllNetworks() {
  return useLazyAtomValue(allNetworksAtom);
}

export function useLazyNetwork(previous = true) {
  const chainId = useChainId();
  const networkAtom = getNetworkAtom(chainId);

  return useLazyAtomValue(
    networkAtom,
    previous ? KeepPrevious.Always : KeepPrevious.Off
  );
}

export function useNativeCurrency() {
  return useLazyNetwork(false)?.nativeCurrency;
}
