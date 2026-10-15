export interface ContributionData {
	username: string;
	totalContributions: number;
	from: string;
	to: string;
	days: Array<{
		date: string;
		count: number;
		level: 0 | 1 | 2 | 3 | 4;
	}>;
}

export type ContributionErrorCode =
	| 'INVALID_USERNAME'
	| 'USER_NOT_FOUND'
	| 'UPSTREAM_UNAVAILABLE'
	| 'UPSTREAM_ERROR'
	| 'INVALID_UPSTREAM_DATA'
	| 'UPSTREAM_TIMEOUT'
	| 'SERVICE_BUSY';

export class ContributionError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: ContributionErrorCode,
		message: string,
	) {
		super(message);
		this.name = 'ContributionError';
	}
}

export function normalizeUsername(username: string | undefined): string {
	if (
		!username
		|| !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)
		|| username.includes('--')
	) {
		throw new ContributionError(400, 'INVALID_USERNAME', 'Enter a valid GitHub username.');
	}
	return username.toLowerCase();
}

function invalidData(): never {
	throw new ContributionError(502, 'INVALID_UPSTREAM_DATA', 'GitHub returned unexpected contribution data.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isLevel(value: unknown): value is ContributionData['days'][number]['level'] {
	return isCount(value) && value <= 4;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateTimestamp(value: unknown): number {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return invalidData();
	}
	const timestamp = Date.parse(`${value}T00:00:00.000Z`);
	if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
		return invalidData();
	}
	return timestamp;
}

export function normalizeContributions(username: string, input: unknown): ContributionData {
	if (
		!isRecord(input) || input.schema !== 'v2'
		|| typeof input.from !== 'string' || typeof input.to !== 'string'
		|| !isCount(input.range_days) || !isCount(input.total_contributions)
		|| !Array.isArray(input.weeks)
	) {
		return invalidData();
	}
	const from = dateTimestamp(input.from);
	const to = dateTimestamp(input.to);
	if (to < from || input.range_days !== (to - from) / DAY_MS + 1) {
		return invalidData();
	}

	const dates = new Set<string>();
	const days: ContributionData['days'] = [];
	let total = 0;
	for (const week of input.weeks) {
		if (!isRecord(week) || !Array.isArray(week.contribution_days)) {
			return invalidData();
		}
		const firstDay = dateTimestamp(week.first_day);
		if (new Date(firstDay).getUTCDay() !== 0 || week.contribution_days.length === 0) {
			return invalidData();
		}
		for (const day of week.contribution_days) {
			if (
				!isRecord(day) || !isCount(day.weekday) || day.weekday > 6
				|| !isCount(day.count) || !isLevel(day.level)
			) {
				return invalidData();
			}
			const timestamp = firstDay + day.weekday * DAY_MS;
			const date = new Date(timestamp).toISOString().slice(0, 10);
			if (timestamp < from || timestamp > to || dates.has(date)) {
				return invalidData();
			}
			dates.add(date);
			days.push({ date, count: day.count, level: day.level });
			total += day.count;
		}
	}
	if (days.length !== input.range_days || !Number.isSafeInteger(total) || total !== input.total_contributions) {
		return invalidData();
	}
	days.sort((left, right) => left.date.localeCompare(right.date));
	return {
		username,
		totalContributions: total,
		from: input.from,
		to: input.to,
		days,
	};
}

interface ServiceOptions {
	fetch?: typeof fetch;
	now?: () => number;
}

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 1024 * 1024;

async function upstreamCall<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof ContributionError) {
			throw error;
		}
		throw new ContributionError(502, 'UPSTREAM_ERROR', 'Could not fetch GitHub contributions.');
	}
}

async function fetchContributions(username: string, fetcher: typeof fetch): Promise<ContributionData> {
	const controller = new AbortController();
	const timeoutError = new ContributionError(504, 'UPSTREAM_TIMEOUT', 'GitHub took too long to respond.');
	const started = Date.now();
	let rejectAborted: (reason: unknown) => void;
	const aborted = new Promise<never>((_, reject) => { rejectAborted = reject; });
	const onAbort = () => rejectAborted(controller.signal.reason);
	controller.signal.addEventListener('abort', onAbort, { once: true });
	const timer = setTimeout(() => controller.abort(timeoutError), TIMEOUT_MS);
	let response: Response | undefined;

	try {
		response = await Promise.race([
			upstreamCall(() => fetcher(`https://github.com/${username}.contribs`, {
				headers: { Accept: 'application/json' },
				redirect: 'manual',
				signal: controller.signal,
			})),
			aborted,
		]);
		if (response.status === 404) {
			throw new ContributionError(404, 'USER_NOT_FOUND', 'GitHub user not found.');
		}
		const throttled = response.status === 429 || (
			response.status === 403 && (
				response.headers.has('retry-after') || response.headers.get('x-ratelimit-remaining') === '0'
			)
		);
		if (throttled || response.status >= 500) {
			throw new ContributionError(503, 'UPSTREAM_UNAVAILABLE', 'GitHub is temporarily unavailable. Try again later.');
		}
		if (!response.ok || response.status !== 200) {
			throw new ContributionError(502, 'UPSTREAM_ERROR', 'Could not fetch GitHub contributions.');
		}
		if (
			response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
			|| Number(response.headers.get('content-length')) > MAX_BODY_BYTES
			|| !response.body
		) {
			return invalidData();
		}
		const reader = response.body.getReader();
		const decoder = new TextDecoder('utf-8', { fatal: true });
		const decode = (value?: Uint8Array, stream = false) => {
			try {
				return decoder.decode(value, { stream });
			} catch (error) {
				if (error instanceof TypeError) {
					return invalidData();
				}
				throw error;
			}
		};
		let bytes = 0;
		let text = '';
		let complete = false;
		try {
			while (true) {
				const chunk = await Promise.race([upstreamCall(() => reader.read()), aborted]);
				if (chunk.done) {
					complete = true;
					break;
				}
				bytes += chunk.value.byteLength;
				if (bytes > MAX_BODY_BYTES) {
					return invalidData();
				}
				text += decode(chunk.value, true);
			}
			text += decode();
		} finally {
			if (!complete) {
				void reader.cancel().catch(() => {
					console.error('[contributions] Could not cancel the upstream body.');
				});
			}
			reader.releaseLock();
		}
		let payload: unknown;
		try {
			payload = JSON.parse(text);
		} catch (error) {
			if (error instanceof SyntaxError) {
				return invalidData();
			}
			throw error;
		}
		const data = normalizeContributions(username, payload);
		if (Date.now() - started >= TIMEOUT_MS) {
			throw timeoutError;
		}
		return data;
	} catch (error) {
		if (error instanceof ContributionError) {
			throw error;
		}
		if (controller.signal.aborted) {
			throw timeoutError;
		}
		throw error;
	} finally {
		clearTimeout(timer);
		controller.signal.removeEventListener('abort', onAbort);
		controller.abort();
		if (response?.body && !response.bodyUsed && !response.body.locked) {
			void response.body.cancel().catch(() => {
				console.error('[contributions] Could not cancel the upstream response.');
			});
		}
	}
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_USERS = 500;

type CacheEntry =
	| { state: 'pending'; promise: Promise<ContributionData> }
	| { state: 'ready'; data: ContributionData; expires: number };

export function createContributionService(options: ServiceOptions = {}) {
	const fetcher = options.fetch ?? fetch;
	const now = options.now ?? Date.now;
	const cache = new Map<string, CacheEntry>();
	return {
		async get(username: string | undefined): Promise<ContributionData> {
			const key = normalizeUsername(username);
			const time = now();
			for (const [user, entry] of cache) {
				if (entry.state === 'ready' && entry.expires <= time) {
					cache.delete(user);
				}
			}
			const existing = cache.get(key);
			if (existing?.state === 'pending') {
				return existing.promise;
			}
			if (existing?.state === 'ready') {
				cache.delete(key);
				cache.set(key, existing);
				return existing.data;
			}
			if (cache.size >= MAX_CACHE_USERS) {
				const evictable = [...cache].find(([, entry]) => entry.state === 'ready');
				if (!evictable) {
					throw new ContributionError(503, 'SERVICE_BUSY', 'Contribution service is busy. Try again later.');
				}
				cache.delete(evictable[0]);
			}
			const promise = fetchContributions(key, fetcher).then(
				data => {
					cache.delete(key);
					cache.set(key, { state: 'ready', data, expires: now() + CACHE_TTL_MS });
					return data;
				},
				error => {
					cache.delete(key);
					throw error;
				},
			);
			cache.set(key, { state: 'pending', promise });
			return promise;
		},
	};
}

export const contributionService = createContributionService();
