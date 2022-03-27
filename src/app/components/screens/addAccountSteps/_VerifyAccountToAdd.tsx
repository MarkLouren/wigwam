import {
  FC,
  memo,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  ChangeEvent,
} from "react";
import classNames from "clsx";
import { useAtomValue } from "jotai";
import useForceUpdate from "use-force-update";
import { ethers } from "ethers";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { useMaybeAtomValue } from "lib/atom-utils";

import { INITIAL_NETWORK } from "fixtures/networks";
import {
  AddHDAccountParams,
  SeedPharse,
  AccountSource,
  Network,
} from "core/types";
import {
  toNeuterExtendedKey,
  generatePreviewHDNodes,
  getSeedPhraseHDNode,
} from "core/common";
import { addAccounts, ClientProvider } from "core/client";

import {
  allNetworksAtom,
  hasSeedPhraseAtom,
  getNeuterExtendedKeyAtom,
} from "app/atoms";
import { useSteps } from "app/hooks/steps";
import { TippySingletonProvider } from "app/hooks";
import { AddAccountStep } from "app/nav";
import NetworkSelect from "app/components/elements/NetworkSelectPrimitive";
import HashPreview from "app/components/elements/HashPreview";
import AutoIcon from "app/components/elements/AutoIcon";
import Input from "app/components/elements/Input";
import Checkbox from "app/components/elements/Checkbox";
import Tooltip from "app/components/elements/Tooltip";
import TooltipIcon from "app/components/elements/TooltipIcon";
import PrettyAmount from "app/components/elements/PrettyAmount";
import AddAccountContinueButton from "app/components/blocks/AddAccountContinueButton";
import { ReactComponent as EditIcon } from "app/icons/edit.svg";

type VerifyAccountToAddProps = {
  initialSetup?: boolean;
};

const rootDerivationPath = "m/44'/60'/0'/0";

const VerifyAccountToAdd: FC<VerifyAccountToAddProps> = ({ initialSetup }) => {
  const hasSeedPhrase = useMaybeAtomValue(!initialSetup && hasSeedPhraseAtom);
  const rootNeuterExtendedKey = useMaybeAtomValue(
    hasSeedPhrase && getNeuterExtendedKeyAtom(rootDerivationPath)
  );
  const networks = useAtomValue(allNetworksAtom);
  const preparedNetworks = useMemo(
    () => networks.filter(({ type }) => type === "mainnet"),
    [networks]
  );

  const { stateRef, reset, navigateToStep } = useSteps();
  const seedPhrase: SeedPharse | undefined = stateRef.current.seedPhrase;

  const neuterExtendedKey = useMemo(() => {
    if (rootNeuterExtendedKey) {
      return toNeuterExtendedKey(
        ethers.utils.HDNode.fromExtendedKey(rootNeuterExtendedKey),
        rootDerivationPath
      );
    } else {
      return seedPhrase
        ? toNeuterExtendedKey(
            getSeedPhraseHDNode(seedPhrase),
            rootDerivationPath
          )
        : null;
    }
  }, [rootNeuterExtendedKey, seedPhrase]);

  useEffect(() => {
    if (!neuterExtendedKey) {
      reset();
    }
  }, [neuterExtendedKey, reset]);

  const [network, setNetwork] = useState(INITIAL_NETWORK);
  const provider = useMemo(
    () => new ClientProvider(network.chainId),
    [network]
  );

  const onNetworkChange = useCallback(
    (chainId: number) => {
      const netw = preparedNetworks.find(
        ({ chainId: chi }) => chi === chainId
      )!;
      setNetwork(netw);
    },
    [preparedNetworks]
  );

  const addresses = useMemo(
    () =>
      neuterExtendedKey
        ? generatePreviewHDNodes(neuterExtendedKey).map(
            ({ address }) => address
          )
        : null,
    [neuterExtendedKey]
  );

  console.log("addresses", addresses);
  // 0: "0x01FBEA0D9116298382Aa22006EE766034d921a74"
  // 1: "0x297c523E096b7472527b7272dE0F75963B1caFaF"
  // 2: "0xe30FC9Cd5219c20bE959Ee64F84915ee2EA975bf"
  // 3: "0x873E4198Ab874C539caBd0c03c14d21C1c942574"
  // 4: "0x8E6e772cAbd1c1e804916Ec806B2c6663AAc02b2"
  // 5: "0x9d817fff8A8e556B51AEaA33C6172B805d6e7b9F"
  // 6: "0x3072508824A98E3966e422AE88f8625EeBbE66b8"
  // 7: "0x6DBB362aC14f9A499735F0a44838E9C157F36688"
  // 8: "0x3001e61f2C1E61e47Ad8571417b1D307908f6f5b"

  const addressesToAddRef = useRef(new Set<string>());
  const addressesNamesRef = useRef(new Map<string, string>());
  const forceUpdate = useForceUpdate();

  const toggleAddress = useCallback(
    (address: string) => {
      const addressesToAdd = addressesToAddRef.current;
      if (addressesToAdd.has(address)) {
        addressesToAdd.delete(address);
      } else {
        addressesToAdd.add(address);
      }

      setThToggleChecked(addressesToAdd.size === addresses?.length);

      forceUpdate();
    },
    [addresses, forceUpdate]
  );

  const [thToggleChecked, setThToggleChecked] = useState(false);

  const toggleAllAddresses = useCallback(
    (remove = false) => {
      const addressesToAdd = addressesToAddRef.current;
      addresses!.forEach((address) => {
        if (remove) {
          if (addressesToAdd.has(address)) {
            addressesToAdd.delete(address);
          }
        } else {
          if (!addressesToAdd.has(address)) {
            addressesToAdd.add(address);
          }
        }
      });
      setThToggleChecked((prevState) => !prevState);
      forceUpdate();
    },
    [addresses, forceUpdate]
  );

  const changeWalletName = useCallback(
    (address: string, name: string) => {
      addressesNamesRef.current.set(address, name);
      const addressesToAdd = addressesToAddRef.current;
      if (!addressesToAdd.has(address)) {
        addressesToAdd.add(address);
      }
      forceUpdate();
    },
    [forceUpdate]
  );

  const canContinue = addressesToAddRef.current.size > 0;

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    try {
      const addressesToAdd = Array.from(addressesToAddRef.current);
      const addAccountsParams: AddHDAccountParams[] = addressesToAdd.map(
        (address) => {
          const hdIndex = addresses!.findIndex((a) => a === address);
          const addressName = addressesNamesRef.current.get(address);
          return {
            source: AccountSource.SeedPhrase,
            name: addressName ?? `Wallet ${hdIndex + 1}`,
            derivationPath: `${rootDerivationPath}/${hdIndex}`,
          };
        }
      );

      if (initialSetup) {
        Object.assign(stateRef.current, { addAccountsParams });
        navigateToStep(AddAccountStep.SetupPassword);
      } else {
        await addAccounts(addAccountsParams);
      }
    } catch (err) {
      console.error(err);
    }
  }, [canContinue, addresses, initialSetup, navigateToStep, stateRef]);

  if (!addresses) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col max-w-[45.25rem] mx-auto">
        <div className="flex mb-9">
          <h1 className="text-[2rem] font-bold mr-auto">Wallets to add</h1>
          <div className="flex items-center ml-auto">
            <Tooltip
              content={
                <>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit ut
                    aliquam, purus sit amet luctus venenatis, lectus magna
                    fringilla urna, porttitor rhoncus dolor purus non enim
                    praesent elementum facilisis leo
                  </p>
                  <p className="mt-2">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit ut
                    aliquam, purus sit amet luctus venenatis, lectus magna
                    fringilla urna, porttitor rhoncus
                  </p>
                </>
              }
              placement="left-start"
              size="large"
              className="mr-3"
            >
              <TooltipIcon />
            </Tooltip>
            <NetworkSelect
              networks={preparedNetworks}
              currentNetwork={network}
              onNetworkChange={onNetworkChange}
            />
          </div>
        </div>
        <table className="text-brand-light">
          <thead>
            <tr className="border-b border-brand-main/[.07]">
              <Th className="align-middle">
                <span className="flex align-center">
                  <CheckboxPrimitive.Root
                    checked={thToggleChecked}
                    onCheckedChange={(checked) => toggleAllAddresses(!checked)}
                  >
                    <Checkbox checked={thToggleChecked} />
                  </CheckboxPrimitive.Root>
                </span>
              </Th>
              <Th />
              <Th className="!pl-7 !text-brand-light align-middle">
                <Tooltip content="You can edit wallet's name">
                  <span className="flex align-center font-semibold">
                    Name
                    <EditIcon className="ml-0.5" />
                  </span>
                </Tooltip>
              </Th>
              <Th>Address</Th>
              <Th>Balance</Th>
            </tr>
          </thead>
          <tbody>
            <TippySingletonProvider>
              {addresses.map((address, i) => {
                const isAdded = addressesToAddRef.current.has(address);
                const addressName = addressesNamesRef.current.get(address);

                return (
                  <Account
                    key={address}
                    name={addressName ?? `Wallet ${i + 1}`}
                    address={address}
                    provider={provider}
                    network={network}
                    isAdded={isAdded}
                    onToggleAdd={() => toggleAddress(address)}
                    onChangeWalletName={(newName: string) =>
                      changeWalletName(address, newName)
                    }
                    className={i === addresses.length - 1 ? "!border-none" : ""}
                  />
                );
              })}
            </TippySingletonProvider>
          </tbody>
        </table>
      </div>
      <AddAccountContinueButton onContinue={handleContinue} />
    </>
  );
};

export default VerifyAccountToAdd;

type AccountProps = {
  name: string;
  address: string;
  provider: ethers.providers.Provider;
  network: Network;
  isAdded: boolean;
  onToggleAdd: () => void;
  onChangeWalletName: (name: string) => void;
  className?: string;
};

const Account = memo<AccountProps>(
  ({
    name,
    address,
    provider,
    network,
    isAdded,
    onToggleAdd,
    onChangeWalletName,
    className,
  }) => {
    const [balance, setBalance] = useState<ethers.BigNumber | null>(null);

    useEffect(() => {
      let mounted = true;

      provider
        .getBalance(address)
        .then((b) => mounted && setBalance(b))
        .catch(console.error);

      return () => {
        mounted = false;
      };
    }, [provider, address, setBalance]);

    const baseAsset = useMemo(
      () =>
        balance
          ? {
              symbol: network.nativeCurrency.symbol,
              name: network.nativeCurrency.name,
              balance,
            }
          : undefined,
      [network, balance]
    );

    return (
      <tr className={classNames("border-b border-brand-main/[.07]", className)}>
        <Td widthMaxContent className="pr-2">
          <span className="flex align-center">
            <CheckboxPrimitive.Root
              onCheckedChange={onToggleAdd}
              checked={isAdded}
            >
              <Checkbox checked={isAdded} />
            </CheckboxPrimitive.Root>
          </span>
        </Td>
        <Td widthMaxContent className="pl-2 pr-0">
          <AutoIcon
            seed={address}
            source="dicebear"
            type="personas"
            className={classNames("h-10 w-10", "rounded-[.625rem]")}
          />
        </Td>
        <Td widthMaxContent>
          <Input
            value={name}
            onChange={(evt: ChangeEvent<HTMLInputElement>) =>
              onChangeWalletName(evt.target.value)
            }
            theme="clean"
            inputClassName="!font-bold min-w-[16rem]"
          />
        </Td>
        <Td>
          <HashPreview hash={address} />
        </Td>
        <Td className="font-bold">
          <PrettyAmount
            amount={baseAsset ? ethers.utils.formatEther(baseAsset.balance) : 0}
            currency={
              baseAsset ? baseAsset.symbol : network.nativeCurrency.symbol
            }
            copiable={true}
            className="font-bold"
          />
        </Td>
      </tr>
    );
  }
);

type TableDate = {
  widthMaxContent?: boolean;
  className?: string;
};

const Th: FC<TableDate> = ({ className, children }) => (
  <th
    className={classNames(
      "py-1.5 px-3",
      "text-sm text-left text-brand-gray font-semibold",
      className
    )}
  >
    {children}
  </th>
);

const Td: FC<TableDate> = ({ widthMaxContent, className, children }) => (
  <td
    className={classNames(
      "py-2.5 px-3 text-base",
      widthMaxContent && "w-[1%] whitespace-nowrap",
      className
    )}
  >
    {children}
  </td>
);
