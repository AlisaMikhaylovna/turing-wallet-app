import * as SQLite from 'expo-sqlite';

export interface Collection {
	id: string;
	name: string;
	supply: number;
	creator: string;
	icon: string;
	isDeleted: boolean;
}

export interface NFT {
	id: string;
	collection_id: string;
	collection_index: number;
	name: string;
	symbol: string;
	description: string;
	attributes: string;
	transfer_times: number;
	icon: string;
	collection_name: string;
	isDeleted: boolean;
}

export interface FT {
	id: string;
	name: string;
	decimal: number;
	amount: number;
	symbol: string;
	isDeleted: boolean;
	icon?: string;
	is_pin?: boolean;
}

export interface TransactionHistory {
	id: string;
	send_address: string;
	receive_address: string;
	fee: number;
	timestamp: number;
	type: string;
	balance_change: number;
}

export interface NFTHistory {
	id: string;
	send_address: string;
	receive_address: string;
	timestamp: number;
	contract_id: string;
}

export interface FTHistory {
	id: string;
	send_address: string;
	receive_address: string;
	fee: number;
	timestamp: number;
	contract_id: string;
	balance_change: number;
}

export interface MultiSig {
	multiSig_address: string;
	pubKeys: string[];
	isDeleted: boolean;
}

export interface FTPublic {
	id: string;
	name: string;
	symbol: string;
	decimal: number;
	supply: number;
	holds_count: number;
	is_pin?: boolean;
	icon?: string;
	price?: number;
}

export interface DApp {
	id: string;
	name: string;
	url: string;
	icon: string;
	description: string;
	if_need_tbc_address: boolean;
}

export const initDatabase = async (db: SQLite.SQLiteDatabase) => {
	try {
		await db.execAsync(`
			PRAGMA journal_mode = WAL;
			CREATE TABLE IF NOT EXISTS Collection (
				id TEXT PRIMARY KEY,
				name TEXT,
				supply INTEGER,
				creator TEXT,
				icon TEXT,
				isDeleted INTEGER DEFAULT 0,
				user_address TEXT
			);
			CREATE INDEX IF NOT EXISTS idx_collection_user ON Collection(user_address, isDeleted);

			CREATE TABLE IF NOT EXISTS NFT (
				id TEXT PRIMARY KEY,
				collection_id TEXT,
				collection_index INTEGER,
				name TEXT,
				symbol TEXT,
				description TEXT,
				attributes TEXT,
				transfer_times INTEGER DEFAULT 0,
				icon TEXT,
				collection_name TEXT,
				isDeleted INTEGER DEFAULT 0,
				user_address TEXT
			);
			CREATE INDEX IF NOT EXISTS idx_nft_collection ON NFT(collection_id, isDeleted);
			CREATE INDEX IF NOT EXISTS idx_nft_user ON NFT(user_address, isDeleted);

			CREATE TABLE IF NOT EXISTS FT (
				id TEXT,
				name TEXT,
				decimal INTEGER,
				amount INTEGER,
				symbol TEXT,
				isDeleted INTEGER DEFAULT 0,
				user_address TEXT,
				is_pin INTEGER DEFAULT 0,
				icon TEXT,
				PRIMARY KEY (id, user_address)
			);
			CREATE INDEX IF NOT EXISTS idx_ft_user ON FT(user_address, isDeleted);
			CREATE INDEX IF NOT EXISTS idx_ft_name ON FT(name, user_address, isDeleted);
			CREATE INDEX IF NOT EXISTS idx_ft_pin ON FT(is_pin, user_address);

			CREATE TABLE IF NOT EXISTS TransactionHistory (
				id TEXT,
				send_address TEXT,
				receive_address TEXT,
				fee REAL,
				timestamp INTEGER,
				type TEXT,
				balance_change REAL,
				user_address TEXT,
				account_type TEXT,
				PRIMARY KEY (id, user_address)
			);
			CREATE INDEX IF NOT EXISTS idx_tx_user_type ON TransactionHistory(user_address, account_type, timestamp DESC);
			CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON TransactionHistory(timestamp DESC);

			CREATE TABLE IF NOT EXISTS NFT_History (
				id TEXT,
				send_address TEXT,
				receive_address TEXT,
				timestamp INTEGER,
				contract_id TEXT,
				user_address TEXT,
				PRIMARY KEY (id, user_address)
			);
			CREATE INDEX IF NOT EXISTS idx_nft_history_contract ON NFT_History(contract_id, user_address, timestamp DESC);
			CREATE INDEX IF NOT EXISTS idx_nft_history_user ON NFT_History(user_address, timestamp DESC);

			CREATE TABLE IF NOT EXISTS FT_History (
				id TEXT,
				send_address TEXT,
				receive_address TEXT,
				fee REAL,
				timestamp INTEGER,
				contract_id TEXT,
				balance_change INTEGER,
				user_address TEXT,
				PRIMARY KEY (id, user_address)
			);
			CREATE INDEX IF NOT EXISTS idx_ft_history_contract ON FT_History(contract_id, user_address, timestamp DESC);
			CREATE INDEX IF NOT EXISTS idx_ft_history_user ON FT_History(user_address, timestamp DESC);

			CREATE TABLE IF NOT EXISTS MultiSig (
				multiSig_address TEXT,
				pubKeys TEXT,
				isDeleted INTEGER DEFAULT 0,
				user_address TEXT,
				PRIMARY KEY (multiSig_address, user_address)
			);
			CREATE INDEX IF NOT EXISTS idx_multisig_user ON MultiSig(user_address, isDeleted);

			CREATE TABLE IF NOT EXISTS FT_Public (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				symbol TEXT NOT NULL,
				decimal INTEGER NOT NULL,
				supply REAL NOT NULL,
				holds_count INTEGER NOT NULL,
				is_pin INTEGER DEFAULT 0,
				icon TEXT,
				price REAL
			);
			CREATE INDEX IF NOT EXISTS idx_ft_public_pin ON FT_Public(is_pin);

			CREATE TABLE IF NOT EXISTS AddressBook (
				address TEXT PRIMARY KEY
			);

			CREATE TABLE IF NOT EXISTS DApp (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				url TEXT NOT NULL,
				icon TEXT NOT NULL,
				description TEXT NOT NULL,
				if_need_tbc_address INTEGER DEFAULT 0
			);
		`);
	} catch (error) {
		throw new Error('Error initializing database');
	}
};

export async function addCollection(collection: Collection, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`INSERT OR REPLACE INTO Collection (id, name, supply, creator, icon, user_address, isDeleted)
		 VALUES (?, ?, ?, ?, ?, ?, 0)`,
		[
			collection.id,
			collection.name,
			collection.supply,
			collection.creator,
			collection.icon,
			userAddress,
		],
	);
}

export async function getCollection(id: string): Promise<Collection | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const result = await db.getFirstAsync<Collection>('SELECT * FROM Collection WHERE id = ?', [id]);
	if (!result) return null;
	return {
		id: result.id,
		name: result.name,
		supply: result.supply,
		creator: result.creator,
		icon: result.icon,
		isDeleted: Boolean(result.isDeleted),
	};
}

export async function getAllCollections(userAddress: string): Promise<Collection[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync<Collection>(
		'SELECT * FROM Collection WHERE user_address = ? AND isDeleted = 0',
		[userAddress],
	);
}

export async function addNFT(nft: NFT, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`INSERT OR REPLACE INTO NFT (
			id, collection_id, collection_index, name, symbol,
			description, attributes, transfer_times, icon,
			collection_name, isDeleted, user_address
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
		[
			nft.id,
			nft.collection_id,
			nft.collection_index,
			nft.name,
			nft.symbol,
			nft.description,
			nft.attributes,
			nft.transfer_times,
			nft.icon,
			nft.collection_name,
			userAddress,
		],
	);
}

export async function getNFTsByCollection(
	collectionId: string,
	userAddress: string,
): Promise<NFT[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync(
		'SELECT * FROM NFT WHERE collection_id = ? AND user_address = ? AND isDeleted = 0',
		[collectionId, userAddress],
	);
}

export async function getNFTWithCollection(
	nftId: string,
): Promise<{ nft: NFT; collection: Collection } | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const result:
		| (NFT & {
				collection_name: string;
				collection_supply: number;
				collection_creator: string;
				collection_icon: string;
		  })
		| null = await db.getFirstAsync(
		`
		SELECT 
			NFT.*,
			Collection.name as collection_name,
			Collection.supply,
			Collection.creator,
			Collection.icon as collection_icon
		FROM NFT 
		JOIN Collection ON NFT.collection_id = Collection.id 
		WHERE NFT.id = ? AND NFT.isDeleted = 0 AND Collection.isDeleted = 0
	`,
		[nftId],
	);

	if (!result) return null;

	return {
		nft: {
			id: result.id,
			collection_id: result.collection_id,
			collection_index: result.collection_index,
			name: result.name,
			symbol: result.symbol,
			description: result.description,
			attributes: result.attributes,
			transfer_times: result.transfer_times,
			icon: result.icon,
			collection_name: result.collection_name,
			isDeleted: result.isDeleted,
		},
		collection: {
			id: result.collection_id,
			name: result.collection_name,
			supply: result.collection_supply,
			creator: result.collection_creator,
			icon: result.collection_icon,
			isDeleted: result.isDeleted,
		},
	};
}

export async function removeNFT(nftId: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('DELETE FROM NFT WHERE id = ?;', [nftId]);
}

export async function updateNFTTransferTimes(nftId: string, transferTimes: number): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE NFT SET transfer_times = ? WHERE id = ?;', [transferTimes, nftId]);
}

export async function getNFT(id: string): Promise<NFT | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const result = await db.getFirstAsync<NFT>('SELECT * FROM NFT WHERE id = ?', [id]);
	if (!result) return null;
	return {
		id: result.id,
		collection_id: result.collection_id,
		collection_index: result.collection_index,
		name: result.name,
		symbol: result.symbol,
		description: result.description,
		attributes: result.attributes,
		transfer_times: result.transfer_times,
		icon: result.icon,
		collection_name: result.collection_name,
		isDeleted: Boolean(result.isDeleted),
	};
}

export async function upsertFT(ft: FT, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');

	const existingFT = await db.getFirstAsync<{ is_pin: number }>(
		'SELECT is_pin FROM FT WHERE id = ? AND user_address = ?',
		[ft.id, userAddress],
	);

	const isPinned = existingFT ? Boolean(existingFT.is_pin) : false;

	await db.runAsync(
		`INSERT OR REPLACE INTO FT (id, name, decimal, amount, symbol, isDeleted, user_address, is_pin, icon)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			ft.id,
			ft.name,
			ft.decimal,
			ft.amount,
			ft.symbol,
			ft.isDeleted ? 1 : 0,
			userAddress,
			isPinned ? 1 : 0,
			ft.icon || null,
		],
	);
}

export async function getFT(id: string, userAddress: string): Promise<FT | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getFirstAsync('SELECT * FROM FT WHERE id = ? AND user_address = ?', [
		id,
		userAddress,
	]);
}

export async function transferFT(id: string, amount: number, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');

	const currentFT = await db.getFirstAsync<{ amount: number }>(
		'SELECT amount FROM FT WHERE id = ? AND user_address = ?',
		[id, userAddress],
	);

	if (!currentFT) {
		throw new Error('FT not found');
	}

	const newAmount = currentFT.amount + amount;

	if (newAmount < 0) {
		throw new Error('Insufficient balance');
	}
	await db.runAsync('UPDATE FT SET amount = ? WHERE id = ? AND user_address = ?', [
		newAmount,
		id,
		userAddress,
	]);
}

export async function softDeleteCollection(id: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE Collection SET isDeleted = 1 WHERE id = ?;', [id]);
	await db.runAsync('UPDATE NFT SET isDeleted = 1 WHERE collection_id = ?;', [id]);
}

export async function softDeleteNFT(id: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE NFT SET isDeleted = 1 WHERE id = ?;', [id]);
}

export async function softDeleteFT(id: string, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE FT SET isDeleted = 1 WHERE id = ? AND user_address = ?;', [
		id,
		userAddress,
	]);
}

export async function addTransactionHistory(
	history: TransactionHistory,
	userAddress: string,
	accountType: 'tbc' | 'taproot' | 'legacy',
): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`INSERT OR REPLACE INTO TransactionHistory (
			id,
			send_address,
			receive_address,
			fee,
			timestamp,
			type,
			balance_change,
			user_address,
			account_type
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			history.id,
			history.send_address,
			history.receive_address,
			history.fee,
			history.timestamp,
			history.type,
			history.balance_change,
			userAddress,
			accountType,
		],
	);
}

export async function getTransactionHistoryByType(
	type: string,
	userAddress: string,
	accountType: 'tbc' | 'taproot' | 'taproot_legacy' | 'legacy',
): Promise<TransactionHistory[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync(
		'SELECT * FROM TransactionHistory WHERE type = ? AND user_address = ? AND account_type = ? ORDER BY timestamp DESC',
		[type, userAddress, accountType],
	);
}

export async function addNFTHistory(history: NFTHistory, user_address: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`INSERT INTO NFT_History (id, send_address, receive_address, timestamp, contract_id, user_address) 
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[
			history.id,
			history.send_address,
			history.receive_address,
			history.timestamp,
			history.contract_id,
			user_address,
		],
	);
}

export async function getNFTHistoryByContractId(
	contractId: string,
	userAddress: string,
): Promise<NFTHistory[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync<NFTHistory>(
		'SELECT * FROM NFT_History WHERE contract_id = ? AND user_address = ? ORDER BY timestamp DESC',
		[contractId, userAddress],
	);
}

export async function addFTHistory(history: FTHistory, user_address: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`INSERT INTO FT_History (id, send_address, receive_address, fee, timestamp, contract_id, balance_change, user_address) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			history.id,
			history.send_address,
			history.receive_address,
			history.fee,
			history.timestamp,
			history.contract_id,
			history.balance_change,
			user_address,
		],
	);
}

export async function getFTHistoryByContractId(
	contractId: string,
	userAddress: string,
): Promise<FTHistory[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync<FTHistory>(
		'SELECT * FROM FT_History WHERE contract_id = ? AND user_address = ? ORDER BY timestamp DESC',
		[contractId, userAddress],
	);
}

export async function getTransactionHistoryById(
	id: string,
	userAddress: string,
): Promise<TransactionHistory | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getFirstAsync(
		'SELECT * FROM TransactionHistory WHERE id = ? AND user_address = ?',
		[id, userAddress],
	);
}

export async function getNFTHistoryById(
	id: string,
	userAddress: string,
): Promise<NFTHistory | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getFirstAsync('SELECT * FROM NFT_History WHERE id = ? AND user_address = ?', [
		id,
		userAddress,
	]);
}

export async function getFTHistoryById(id: string, userAddress: string): Promise<FTHistory | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getFirstAsync('SELECT * FROM FT_History WHERE id = ? AND user_address = ?', [
		id,
		userAddress,
	]);
}

export async function addMultiSig(multiSig: MultiSig, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	if (multiSig.pubKeys.length < 3 || multiSig.pubKeys.length > 10) {
		throw new Error('Public keys count must be between 3 and 10');
	}

	await db.runAsync(
		`INSERT OR REPLACE INTO MultiSig (
			multiSig_address, pubKeys, isDeleted, user_address
		) VALUES (?, ?, 0, ?);`,
		[multiSig.multiSig_address, JSON.stringify(multiSig.pubKeys), userAddress],
	);
}

export async function softDeleteMultiSig(
	multiSigAddress: string,
	userAddress: string,
): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		'UPDATE MultiSig SET isDeleted = 1 WHERE multiSig_address = ? AND user_address = ?;',
		[multiSigAddress, userAddress],
	);
}

export async function getActiveMultiSigs(userAddress: string) {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const multiSigs = await db.getAllAsync<{ multiSig_address: string; pubKeys: string }>(
		'SELECT multiSig_address, pubKeys FROM MultiSig WHERE user_address = ? AND isDeleted = 0',
		[userAddress],
	);
	return multiSigs.map((row) => ({
		multiSig_address: row.multiSig_address,
		pubKeys: JSON.parse(row.pubKeys) as string[],
	}));
}

export async function getAllMultiSigs(userAddress: string) {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const multiSigs = await db.getAllAsync<{ multiSig_address: string; pubKeys: string }>(
		'SELECT multiSig_address, pubKeys FROM MultiSig WHERE user_address = ?',
		[userAddress],
	);
	return multiSigs.map((row) => ({
		multiSig_address: row.multiSig_address,
		pubKeys: JSON.parse(row.pubKeys) as string[],
	}));
}

export async function getMultiSigPubKeys(multiSigAddress: string): Promise<string[] | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const result = await db.getFirstAsync<{ pubKeys: string }>(
		'SELECT pubKeys FROM MultiSig WHERE multiSig_address = ?',
		[multiSigAddress],
	);
	if (!result) {
		return null;
	}
	try {
		return JSON.parse(result.pubKeys) as string[];
	} catch {
		throw new Error('Invalid pubKeys format');
	}
}

export async function getTransactionHistoryCount(
	userAddress: string,
	accountType: 'tbc' | 'taproot' | 'taproot_legacy' | 'legacy',
): Promise<number> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	try {
		const result = await db.getAllAsync<{ count: number }>(
			'SELECT COUNT(*) as count FROM TransactionHistory WHERE user_address = ? AND account_type = ?',
			[userAddress, accountType],
		);
		if (result && result.length > 0) {
			return result[0].count;
		}
		return 0;
	} catch (error) {
		return 0;
	}
}

export async function getCollectionCount(userAddress: string): Promise<number> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	try {
		const tableCheck = await db.getAllAsync(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='Collection'",
		);

		if (tableCheck.length === 0) {
			return 0;
		}

		const result = await db.getAllAsync<{ count: number }>(
			'SELECT COUNT(*) as count FROM Collection WHERE user_address = ? AND isDeleted = 0',
			[userAddress],
		);
		if (result && result.length > 0) {
			const count = result[0].count;
			return count;
		}
		return 0;
	} catch (error) {
		return 0;
	}
}

export async function getNFTCount(userAddress: string): Promise<number> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	try {
		const result = await db.getAllAsync<{ count: number }>(
			'SELECT COUNT(*) as count FROM NFT WHERE user_address = ? AND isDeleted = 0',
			[userAddress],
		);
		if (result && result.length > 0) {
			return result[0].count;
		}
		return 0;
	} catch (error) {
		return 0;
	}
}

export async function removeFT(id: string, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('DELETE FROM FT WHERE id = ? AND user_address = ?;', [id, userAddress]);
}

export async function getActiveNFTs(userAddress: string): Promise<NFT[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync('SELECT * FROM NFT WHERE user_address = ? AND isDeleted = 0', [
		userAddress,
	]);
}

export async function getAllNFTs(userAddress: string): Promise<NFT[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync('SELECT * FROM NFT WHERE user_address = ?', [userAddress]);
}

export async function getActiveFTs(userAddress: string): Promise<FT[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const results = await db.getAllAsync<FT>(
		`SELECT id, name, decimal, amount, symbol, isDeleted, is_pin, icon
		 FROM FT 
		 WHERE user_address = ? AND isDeleted = 0
		 ORDER BY is_pin DESC, name ASC`,
		[userAddress],
	);
	return results.map((ft) => ({
		...ft,
		isDeleted: Boolean(ft.isDeleted),
		is_pin: Boolean(ft.is_pin),
	}));
}

export async function getAllFTs(userAddress: string): Promise<FT[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getAllAsync('SELECT * FROM FT WHERE user_address = ?', [userAddress]);
}

export async function addFTPublic(ft: FTPublic): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');

	const existingFT = await db.getFirstAsync<{ is_pin: number }>(
		'SELECT is_pin FROM FT_Public WHERE id = ?',
		[ft.id],
	);

	const isPinned = existingFT ? Boolean(existingFT.is_pin) : false;

	await db.runAsync(
		`INSERT OR REPLACE INTO FT_Public (id, name, symbol, decimal, supply, holds_count, is_pin, icon, price)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			ft.id,
			ft.name,
			ft.symbol,
			ft.decimal,
			ft.supply,
			ft.holds_count,
			isPinned ? 1 : 0,
			ft.icon || null,
			ft.price || null,
		],
	);
}

export async function removeFTPublic(id: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('DELETE FROM FT_Public WHERE id = ?;', [id]);
}

export async function getAllFTPublics(): Promise<FTPublic[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const results = await db.getAllAsync<FTPublic>(
		`SELECT id, name, symbol, decimal, supply, holds_count, is_pin, icon, price
		 FROM FT_Public
		 ORDER BY is_pin DESC, name ASC`,
	);
	return results.map((ft) => ({
		...ft,
		is_pin: Boolean(ft.is_pin),
	}));
}

export async function deleteAccountData(address: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(`DELETE FROM TransactionHistory WHERE user_address = ?`, [address]);

	await db.runAsync(
		`DELETE FROM NFT_History 
		 WHERE contract_id IN (SELECT id FROM NFT WHERE user_address = ?)`,
		[address],
	);

	await db.runAsync(
		`DELETE FROM FT_History 
		 WHERE contract_id IN (SELECT id FROM FT WHERE user_address = ?)`,
		[address],
	);

	await db.runAsync(`DELETE FROM NFT WHERE user_address = ?`, [address]);

	await db.runAsync(`DELETE FROM FT WHERE user_address = ?`, [address]);

	await db.runAsync(`DELETE FROM Collection WHERE user_address = ?`, [address]);

	await db.runAsync(`DELETE FROM MultiSig WHERE user_address = ?`, [address]);
}

export async function getAllMultiSigAddresses(userAddress: string): Promise<string[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const multiSigs = await db.getAllAsync<MultiSig>(
		'SELECT multiSig_address FROM MultiSig WHERE user_address = ? AND isDeleted = 0',
		[userAddress],
	);
	return multiSigs.map((row) => row.multiSig_address);
}

export async function restoreFT(id: string, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE FT SET isDeleted = 0 WHERE id = ? AND user_address = ?;', [
		id,
		userAddress,
	]);
}

export async function getFTPublic(id: string): Promise<FTPublic | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getFirstAsync('SELECT * FROM FT_Public WHERE id = ?', [id]);
}

export async function updateFTPublicHoldsCount(id: string, holdsCount: number): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE FT_Public SET holds_count = ? WHERE id = ?', [holdsCount, id]);
}

export async function updateFTHistory(history: FTHistory, user_address: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`UPDATE FT_History SET 
		 send_address = ?, 
		 receive_address = ?, 
		 fee = ?, 
		 timestamp = ?, 
		 balance_change = ? 
		 WHERE id = ? AND user_address = ?`,
		[
			history.send_address,
			history.receive_address,
			history.fee,
			history.timestamp,
			history.balance_change,
			history.id,
			user_address,
		],
	);
}

export async function updateTransactionHistory(
	history: TransactionHistory,
	userAddress: string,
): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`UPDATE TransactionHistory SET 
		 send_address = ?, 
		 receive_address = ?, 
		 fee = ?, 
		 timestamp = ?, 
		 type = ?,
		 balance_change = ? 
		 WHERE id = ? AND user_address = ?`,
		[
			history.send_address,
			history.receive_address,
			history.fee,
			history.timestamp,
			history.type,
			history.balance_change,
			history.id,
			userAddress,
		],
	);
}

export async function addAddressToBook(address: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('INSERT OR REPLACE INTO AddressBook (address) VALUES (?)', [address]);
}

export async function getAllAddressesFromBook(): Promise<string[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const results = await db.getAllAsync<{ address: string }>('SELECT address FROM AddressBook');
	return results.map((item) => item.address);
}

export async function removeAddressFromBook(address: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('DELETE FROM AddressBook WHERE address = ?', [address]);
}

export async function restoreMultiSig(multiSigAddress: string, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		'UPDATE MultiSig SET isDeleted = 0 WHERE multiSig_address = ? AND user_address = ?;',
		[multiSigAddress, userAddress],
	);
}

export async function getMultiSigByAddress(
	multiSigAddress: string,
	userAddress: string,
): Promise<{ multiSig_address: string; isDeleted: number } | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getFirstAsync<{ multiSig_address: string; isDeleted: number }>(
		'SELECT multiSig_address, isDeleted FROM MultiSig WHERE multiSig_address = ? AND user_address = ?',
		[multiSigAddress, userAddress],
	);
}

export async function restoreCollection(id: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE Collection SET isDeleted = 0 WHERE id = ?;', [id]);
	await db.runAsync('UPDATE NFT SET isDeleted = 0 WHERE collection_id = ?;', [id]);
}

export async function restoreNFT(id: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE NFT SET isDeleted = 0 WHERE id = ?;', [id]);
}

export async function updateNFTHistory(history: NFTHistory, user_address: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`UPDATE NFT_History SET 
		 send_address = ?, 
		 receive_address = ?, 
		 timestamp = ?, 
		 contract_id = ? 
		 WHERE id = ? AND user_address = ?`,
		[
			history.send_address,
			history.receive_address,
			history.timestamp,
			history.contract_id,
			history.id,
			user_address,
		],
	);
}

export async function updateNFTUserAddress(nftId: string, userAddress: string): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE NFT SET user_address = ? WHERE id = ?;', [userAddress, nftId]);
}

export async function clearAllData(): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.execAsync(`
		DELETE FROM TransactionHistory;
		DELETE FROM NFT_History;
		DELETE FROM FT_History;
		DELETE FROM NFT;
		DELETE FROM FT;
		DELETE FROM Collection;
		DELETE FROM MultiSig;
		DELETE FROM FT_Public;
		DELETE FROM AddressBook;
		DELETE FROM DApp;
	`);
}

export async function getAllDApps(): Promise<DApp[]> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	const results = await db.getAllAsync<DApp>('SELECT * FROM DApp');
	return results.map((dapp) => ({
		...dapp,
		if_need_tbc_address: Boolean(dapp.if_need_tbc_address),
	}));
}

export async function addDApp(dapp: DApp): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync(
		`INSERT INTO DApp (id, name, url, icon, description, if_need_tbc_address)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[dapp.id, dapp.name, dapp.url, dapp.icon, dapp.description, dapp.if_need_tbc_address ? 1 : 0],
	);
}

export async function getDAppByName(name: string): Promise<DApp | null> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	return await db.getFirstAsync<DApp>('SELECT * FROM DApp WHERE name = ?', [name]);
}

export async function toggleFTPin(
	id: string,
	userAddress: string,
	isPinned: boolean,
): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE FT SET is_pin = ? WHERE id = ? AND user_address = ?', [
		isPinned ? 1 : 0,
		id,
		userAddress,
	]);
}

export async function toggleFTPublicPin(id: string, isPinned: boolean): Promise<void> {
	const db = await SQLite.openDatabaseAsync('wallet.db');
	await db.runAsync('UPDATE FT_Public SET is_pin = ? WHERE id = ?', [isPinned ? 1 : 0, id]);
}
