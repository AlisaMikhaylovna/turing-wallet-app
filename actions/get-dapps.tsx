import { addDApp, getAllDApps } from '@/utils/sqlite';
import { api } from '@/lib/axios';

interface DAppResponse {
	total_count: number;
	dapp_list: {
		name: string;
		description: string;
		icon: string;
		url: string;
		if_need_tbc_address: boolean;
	}[];
}

export async function fetchDApps(): Promise<DAppResponse> {
	const response = await api.get('https://turingwallet.xyz/multy/sig/dapp/list');
	return response.data;
}

export async function initDApps(): Promise<void> {
	try {
		const response = await fetchDApps();

		for (const dapp of response.dapp_list) {
			const id =
				Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

			await addDApp({
				id,
				name: dapp.name,
				description: dapp.description,
				icon: dapp.icon,
				url: dapp.url,
				if_need_tbc_address: dapp.if_need_tbc_address,
			});
		}
	} catch (error) {
		throw new Error('Failed to init dapps');
	}
}

export async function syncDApps(): Promise<void> {
	try {
		const response = await fetchDApps();

		const existingDApps = await getAllDApps();
		const existingNames = new Set(existingDApps.map((dapp) => dapp.name));

		for (const dapp of response.dapp_list) {
			if (!existingNames.has(dapp.name)) {
				const id =
					Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

				await addDApp({
					id,
					name: dapp.name,
					description: dapp.description,
					icon: dapp.icon,
					url: dapp.url,
					if_need_tbc_address: dapp.if_need_tbc_address,
				});
			}
		}
	} catch (error) {
		throw new Error('Failed to sync dapps');
	}
}
