import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

interface CacheItem<T = any> {
	data: T;
	timestamp: number;
}

interface CustomRequestConfig<T = any> extends InternalAxiosRequestConfig {
	cachedData?: T;
}

const cache = new Map<string, CacheItem>();
const CACHE_DURATION = 5000;

export const api = axios.create({
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json',
	},
});

api.interceptors.request.use(async <T>(config: CustomRequestConfig<T>) => {
	const cacheKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
	const cachedResponse = cache.get(cacheKey);

	if (cachedResponse) {
		const now = Date.now();
		if (now - cachedResponse.timestamp < CACHE_DURATION) {
			return Promise.resolve({
				...config,
				data: cachedResponse.data,
			});
		} else {
			cache.delete(cacheKey);
		}
	}

	return config;
});

api.interceptors.response.use(
	(response: AxiosResponse) => {
		const cacheKey = `${response.config.method}-${response.config.url}-${JSON.stringify(response.config.params)}`;

		cache.set(cacheKey, {
			data: response.data,
			timestamp: Date.now(),
		});

		return response;
	},
	(error) => {
		if (axios.isCancel(error)) {
			return Promise.resolve({
				data: error.message,
			});
		}
		return Promise.reject(error);
	},
);
