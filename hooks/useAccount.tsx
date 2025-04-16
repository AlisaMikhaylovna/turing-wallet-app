import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Account, AccountType, Addresses, Balance, StoredUtxo } from '@/types';

const STORAGE_KEY = 'wallet_storage';

interface AccountState {
	accounts: { [address: string]: Account };
	currentAccount: string;
	passKey: string;
	salt: string;
}

interface AccountStore extends AccountState {
	addAccount: (data: Account) => Promise<void>;
	removeAccount: (address: string) => Promise<void>;
	setCurrentAccount: (address: string) => Promise<void>;
	getCurrentAccount: () => Account | null;
	getAccountsCount: () => number;
	getAllAccounts: () => Account[];
	getAllAccountAddresses: () => string[];
	accountExists: (address: string) => boolean;

	getCurrentAccountAddress: () => string;
	getCurrentAccountName: () => string | null;
	getCurrentAccountBalance: () => Balance | null;
	getCurrentAccountTbcPubKey: () => string | null;
	getCurrentAccountUtxos: (address: string) => StoredUtxo[] | null;
	getCurrentAccountType: () => AccountType;
	getCurrentTbcAddress: () => string | null;
	getCurrentTaprootAddress: () => string | null;
	getCurrentTaprootLegacyAddress: () => string | null;
	getCurrentLegacyAddress: () => string | null;
	getAddresses: () => Addresses;
	isTaprootAccount: () => boolean;
	isTaprootLegacyAccount: () => boolean;
	isTbcAccount: () => boolean;
	isLegacyAccount: () => boolean;
	canSwitchToTaproot: () => boolean;
	canSwitchToTaprootLegacy: () => boolean;
	canSwitchToTbc: () => boolean;
	canSwitchToLegacy: () => boolean;

	updateCurrentAccountName: (name: string) => Promise<void>;
	updateCurrentAccountTbcBalance: (tbcBalance: number) => Promise<void>;
	updateCurrentAccountBtcBalance: (btcBalance: number) => Promise<void>;
	updateCurrentAccountBalance: (balance: Balance) => Promise<void>;
	updateCurrentAccountUtxos: (utxos: StoredUtxo[], address: string) => Promise<void>;

	switchToTaproot: () => Promise<void>;
	switchToTaprootLegacy: () => Promise<void>;
	switchToTBC: () => Promise<void>;
	switchToLegacy: () => Promise<void>;

	setPassKeyAndSalt: (passKey: string, salt: string) => Promise<void>;
	getSalt: () => string;
	getPassKey: () => string;
	getEncryptedKeys: () => string | null;

	clear: () => Promise<void>;

	removeCurrentAccount: () => Promise<void>;
	switchAccount: (address: string) => Promise<void>;
}

export const useAccount = create(
	persist<AccountStore>(
		(set, get) => ({
			accounts: {},
			currentAccount: '',
			passKey: '',
			salt: '',
			accountTypeChangeCounter: 0,

			addAccount: async (data: Account) => {
				const currentAccounts = get().accounts;
				if (Object.keys(currentAccounts).length >= 50) {
					throw new Error('You can only have up to 50 accounts.');
				}

				const addressToCheck =
					data.type === AccountType.TAPROOT
						? data.addresses.taprootAddress
						: data.type === AccountType.TAPROOT_LEGACY
							? data.addresses.taprootLegacyAddress
							: data.type === AccountType.LEGACY
								? data.addresses.legacyAddress
								: data.addresses.tbcAddress;

				if (!addressToCheck) {
					throw new Error('Incorrect address');
				}

				if (currentAccounts[addressToCheck]) {
					throw new Error('Account already exists');
				}

				const addresses: Addresses = {
					tbcAddress: data.addresses.tbcAddress || '',
					taprootAddress: data.addresses.taprootAddress || '',
					taprootLegacyAddress: data.addresses.taprootLegacyAddress || '',
					legacyAddress: data.addresses.legacyAddress || '',
				};

				const accountData: Account = {
					...data,
					addresses,
				};

				set({
					accounts: {
						...currentAccounts,
						[addressToCheck]: accountData,
					},
					currentAccount: addressToCheck,
				});
			},

			removeAccount: async (address: string) => {
				const { [address]: _, ...rest } = get().accounts;
				set({ accounts: rest });

				if (get().currentAccount === address) {
					const remainingAddresses = Object.keys(rest);
					if (remainingAddresses.length > 0) {
						set({ currentAccount: remainingAddresses[0] });
					} else {
						set({ currentAccount: '' });
					}
				}
			},

			setCurrentAccount: async (address: string) => {
				if (!get().accounts[address]) {
					throw new Error('Account does not exist');
				}
				set({ currentAccount: address });
			},

			getCurrentAccount: () => {
				const currentAccount = get().currentAccount;
				return currentAccount ? get().accounts[currentAccount] : null;
			},

			getAccountsCount: () => {
				return Object.keys(get().accounts).length;
			},

			getAllAccounts: () => {
				return Object.values(get().accounts);
			},

			getAllAccountAddresses: () => {
				return Object.keys(get().accounts);
			},

			accountExists: (address: string) => {
				return !!get().accounts[address];
			},

			getCurrentAccountAddress: () => {
				return get().currentAccount;
			},

			getCurrentAccountName: () => {
				const account = get().getCurrentAccount();
				return account ? account.accountName : null;
			},

			getCurrentAccountBalance: () => {
				const account = get().getCurrentAccount();
				return account ? account.balance : null;
			},

			getCurrentAccountTbcPubKey: () => {
				const account = get().getCurrentAccount();
				return account ? account.pubKey.tbcPubKey : null;
			},

			getCurrentAccountUtxos: (address: string) => {
				const account = get().getCurrentAccount();
				if (!account) return null;

				if (address) {
					return account.paymentUtxos.filter((utxo) => utxo.address === address && !utxo.isSpented);
				}

				const currentAddress = get().getCurrentAccountAddress();
				return account.paymentUtxos.filter(
					(utxo) => utxo.address === currentAddress && !utxo.isSpented,
				);
			},

			getCurrentAccountType: () => {
				const account = get().getCurrentAccount();
				return account ? account.type : AccountType.TBC;
			},

			getCurrentTbcAddress: () => {
				const account = get().getCurrentAccount();
				return account ? account.addresses.tbcAddress : null;
			},

			getCurrentTaprootAddress: () => {
				const account = get().getCurrentAccount();
				return account ? account.addresses.taprootAddress : null;
			},

			getCurrentTaprootLegacyAddress: () => {
				const account = get().getCurrentAccount();
				return account ? account.addresses.taprootLegacyAddress : null;
			},

			getAddresses: () => {
				const account = get().getCurrentAccount();
				return account
					? account.addresses
					: { tbcAddress: '', taprootAddress: '', taprootLegacyAddress: '', legacyAddress: '' };
			},

			isTaprootAccount: () => {
				return get().getCurrentAccountType() === AccountType.TAPROOT;
			},

			isTaprootLegacyAccount: () => {
				return get().getCurrentAccountType() === AccountType.TAPROOT_LEGACY;
			},

			isTbcAccount: () => {
				return get().getCurrentAccountType() === AccountType.TBC;
			},

			canSwitchToTaproot: () => {
				const account = get().getCurrentAccount();
				return !!account?.addresses.taprootAddress;
			},

			canSwitchToTaprootLegacy: () => {
				const account = get().getCurrentAccount();
				return !!account?.addresses.taprootLegacyAddress;
			},

			canSwitchToTbc: () => {
				const account = get().getCurrentAccount();
				return !!account?.addresses.tbcAddress;
			},

			updateCurrentAccountName: async (name: string) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const updatedAccount = {
						...currentAccount,
						accountName: name,
					};

					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			updateCurrentAccountTbcBalance: async (tbcBalance: number) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const updatedAccount = {
						...currentAccount,
						balance: {
							...currentAccount.balance,
							tbc: tbcBalance,
						},
					};

					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			updateCurrentAccountBtcBalance: async (btcBalance: number) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const updatedAccount = {
						...currentAccount,
						balance: {
							...currentAccount.balance,
							btc: btcBalance,
						},
					};

					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			updateCurrentAccountBalance: async (balance: Balance) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const updatedAccount = {
						...currentAccount,
						balance,
					};

					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			updateCurrentAccountUtxos: async (utxos: StoredUtxo[], address: string) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const existingUtxos = currentAccount.paymentUtxos.filter(
						(utxo) => utxo.address !== address,
					);

					const updatedAccount = {
						...currentAccount,
						paymentUtxos: [...existingUtxos, ...utxos],
					};

					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			switchToTaproot: async () => {
				const account = get().getCurrentAccount();
				if (!account || !account.addresses.taprootAddress) {
					throw new Error('Account cannot be switched to Taproot');
				}

				const { [get().currentAccount]: currentAccount, ...otherAccounts } = get().accounts;
				const updatedAccount = { ...currentAccount, type: AccountType.TAPROOT };

				set({
					accounts: {
						...otherAccounts,
						[account.addresses.taprootAddress]: updatedAccount,
					},
					currentAccount: account.addresses.taprootAddress,
				});
			},

			switchToTaprootLegacy: async () => {
				const account = get().getCurrentAccount();
				if (!account || !account.addresses.taprootLegacyAddress) {
					throw new Error('Account cannot be switched to Taproot Legacy');
				}

				const { [get().currentAccount]: currentAccount, ...otherAccounts } = get().accounts;
				const updatedAccount = { ...currentAccount, type: AccountType.TAPROOT_LEGACY };

				set({
					accounts: {
						...otherAccounts,
						[account.addresses.taprootLegacyAddress]: updatedAccount,
					},
					currentAccount: account.addresses.taprootLegacyAddress,
				});
			},

			switchToTBC: async () => {
				const account = get().getCurrentAccount();
				if (!account || !account.addresses.tbcAddress) {
					throw new Error('Account cannot be switched to TBC');
				}

				const { [get().currentAccount]: currentAccount, ...otherAccounts } = get().accounts;
				const updatedAccount = { ...currentAccount, type: AccountType.TBC };

				set({
					accounts: {
						...otherAccounts,
						[account.addresses.tbcAddress]: updatedAccount,
					},
					currentAccount: account.addresses.tbcAddress,
				});
			},

			setPassKeyAndSalt: async (passKey: string, salt: string) => {
				set({ passKey, salt });
			},

			getSalt: () => get().salt,

			getPassKey: () => get().passKey,

			getEncryptedKeys: () => {
				const currentAccount = get().getCurrentAccount();
				return currentAccount?.encryptedKeys || null;
			},

			clear: async () => {
				set({
					accounts: {},
					currentAccount: '',
					passKey: '',
					salt: '',
				});
			},

			removeCurrentAccount: async () => {
				const currentAddress = get().currentAccount;
				const { [currentAddress]: _, ...rest } = get().accounts;

				set({
					accounts: rest,
					currentAccount: Object.keys(rest)[0] || '',
					...(Object.keys(rest).length === 0
						? {
								passKey: '',
								salt: '',
							}
						: {}),
				});
			},

			switchAccount: async (address: string) => {
				if (!get().accounts[address]) {
					throw new Error('Account does not exist');
				}
				set({ currentAccount: address });
			},

			getCurrentLegacyAddress: () => {
				const account = get().getCurrentAccount();
				return account ? account.addresses.legacyAddress : null;
			},

			isLegacyAccount: () => {
				return get().getCurrentAccountType() === AccountType.LEGACY;
			},

			canSwitchToLegacy: () => {
				const account = get().getCurrentAccount();
				return !!account?.addresses.legacyAddress;
			},

			switchToLegacy: async () => {
				const account = get().getCurrentAccount();
				if (!account || !account.addresses.legacyAddress) {
					throw new Error('Account cannot be switched to Legacy');
				}

				const { [get().currentAccount]: currentAccount, ...otherAccounts } = get().accounts;
				const updatedAccount = { ...currentAccount, type: AccountType.LEGACY };

				set({
					accounts: {
						...otherAccounts,
						[account.addresses.legacyAddress]: updatedAccount,
					},
					currentAccount: account.addresses.legacyAddress,
				});
			},
		}),
		{
			name: STORAGE_KEY,
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
