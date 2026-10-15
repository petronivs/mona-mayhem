import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContributionService, normalizeContributions, normalizeUsername } from './contributions';

function fixture() {
	return {
		schema: 'v2',
		from: '2024-02-25',
		to: '2024-03-02',
		range_days: 7,
		total_contributions: 21,
		weeks: [{
			index: 0,
			first_day: '2024-02-25',
			contribution_days: Array.from({ length: 7 }, (_, weekday) => ({
				weekday,
				count: weekday,
				level: Math.min(weekday, 4),
			})),
		}],
	};
}

function jsonResponse(data: unknown = fixture()) {
	return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('username validation', () => {
	it.each(['OctoCat', 'a', 'a-b', 'a'.repeat(39), '123'])('accepts %s and normalizes casing', (username) => {
		expect(normalizeUsername(username)).toBe(username.toLowerCase());
	});

	it.each([undefined, '', 'a'.repeat(40), '-abc', 'abc-', 'a--b', 'a_b', 'a.b', 'a/b', 'a b', ' abc', 'abc\n', 'é', 'https://github.com'])('rejects invalid username %s', (username) => {
		expect(() => normalizeUsername(username)).toThrowError(expect.objectContaining({
			status: 400, code: 'INVALID_USERNAME',
		}));
	});
});

describe('process-local cache', () => {
	it('reuses successful data across username casing without another request', async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse());
		const service = createContributionService({ fetch: fetcher });
		const first = await service.get('OctoCat');
		expect(await service.get('octocat')).toEqual(first);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('expires cached data at exactly five minutes with no stale fallback', async () => {
		let now = 0;
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse());
		const service = createContributionService({ fetch: fetcher, now: () => now });
		await service.get('octocat');
		now = 299_999;
		await service.get('octocat');
		expect(fetcher).toHaveBeenCalledTimes(1);
		now = 300_000;
		fetcher.mockResolvedValueOnce(new Response(null, { status: 503 }));
		await expect(service.get('octocat')).rejects.toMatchObject({ status: 503 });
		await service.get('octocat');
		expect(fetcher).toHaveBeenCalledTimes(3);
	});

	it('starts the TTL when fetching succeeds, not when it starts', async () => {
		let now = 0;
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
			now = 8_000;
			return jsonResponse();
		});
		const service = createContributionService({ fetch: fetcher, now: () => now });
		await service.get('octocat');
		now = 300_000;
		await service.get('octocat');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('coalesces concurrent requests for the same case-normalized user', async () => {
		let release!: () => void;
		const gate = new Promise<void>(resolve => { release = resolve; });
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
			await gate;
			return jsonResponse();
		});
		const service = createContributionService({ fetch: fetcher });
		const first = service.get('OctoCat');
		const second = service.get('octocat');
		expect(fetcher).toHaveBeenCalledTimes(1);
		release();
		expect(await first).toEqual(await second);
	});

	it.each([404, 503])('does not cache HTTP %s failures and cleans up shared pending requests', async (status) => {
		const fetcher = vi.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(null, { status }))
			.mockImplementation(async () => jsonResponse());
		const service = createContributionService({ fetch: fetcher });
		const failed = await Promise.allSettled([service.get('octocat'), service.get('OctoCat')]);
		expect(failed.map(result => result.status)).toEqual(['rejected', 'rejected']);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await service.get('octocat');
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('evicts the least-recently-used settled entry at the 500-user limit', async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse());
		const service = createContributionService({ fetch: fetcher });
		for (let i = 0; i < 500; i++) await service.get(`user-${i}`);
		await service.get('user-0');
		await service.get('new-user');
		expect(fetcher).toHaveBeenCalledTimes(501);
		await service.get('user-0');
		expect(fetcher).toHaveBeenCalledTimes(501);
		await service.get('user-1');
		expect(fetcher).toHaveBeenCalledTimes(502);
	});

	it('cleans up expired entries before evicting fresh entries', async () => {
		let now = 0;
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse());
		const service = createContributionService({ fetch: fetcher, now: () => now });
		await service.get('old-user');
		now = 200_000;
		for (let i = 0; i < 499; i++) await service.get(`user-${i}`);
		await service.get('old-user');
		now = 300_000;
		await service.get('new-user');
		await service.get('user-0');
		expect(fetcher).toHaveBeenCalledTimes(501);
	});

	it('bounds pending and cached entries together without evicting in-flight users', async () => {
		let release!: () => void;
		const gate = new Promise<void>(resolve => { release = resolve; });
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
			await gate;
			return jsonResponse();
		});
		const service = createContributionService({ fetch: fetcher });
		const pending = Array.from({ length: 500 }, (_, i) => service.get(`user-${i}`));
		const duplicate = service.get('USER-0');
		const rejected = expect(service.get('new-user')).rejects.toMatchObject({
			status: 503, code: 'SERVICE_BUSY',
		});
		release();
		await rejected;
		await Promise.all([...pending, duplicate]);
		expect(fetcher).toHaveBeenCalledTimes(500);
		await service.get('new-user');
		expect(fetcher).toHaveBeenCalledTimes(501);
	});

	it('does not share cache entries between service instances', async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse());
		await createContributionService({ fetch: fetcher }).get('octocat');
		await createContributionService({ fetch: fetcher }).get('octocat');
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});

describe('contribution normalization', () => {
	it('normalizes a leap-day range into chronological typed days', () => {
		const data = fixture();
		data.weeks[0]!.contribution_days.reverse();
		expect(normalizeContributions('octocat', data)).toEqual({
			username: 'octocat',
			totalContributions: 21,
			from: '2024-02-25',
			to: '2024-03-02',
			days: Array.from({ length: 7 }, (_, index) => ({
				date: ['2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02'][index],
				count: index,
				level: Math.min(index, 4),
			})),
		});
	});

	it('accepts partial final weeks and zero contributions', () => {
		const data = fixture();
		data.to = '2024-02-29';
		data.range_days = 5;
		data.total_contributions = 0;
		data.weeks[0]!.contribution_days = data.weeks[0]!.contribution_days.slice(0, 5).map(day => ({
			...day, count: 0, level: 0,
		}));
		const result = normalizeContributions('octocat', data);
		expect(result.totalContributions).toBe(0);
		expect(result.days).toHaveLength(5);
		expect(result.days.at(-1)?.date).toBe('2024-02-29');
	});

	it.each([
		null, [], 'HTML', {},
		{ ...fixture(), schema: 'v3' },
		{ ...fixture(), from: '2024-02-30' },
		{ ...fixture(), from: '2024-2-25' },
		{ ...fixture(), to: '2024-02-24' },
		{ ...fixture(), range_days: 8 },
		{ ...fixture(), total_contributions: 22 },
		{ ...fixture(), total_contributions: -1 },
		{ ...fixture(), weeks: [] },
	])('rejects malformed payload %#', (data) => {
		expect(() => normalizeContributions('octocat', data)).toThrowError(expect.objectContaining({
			status: 502, code: 'INVALID_UPSTREAM_DATA',
		}));
	});

	it.each([
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.first_day = '2024-02-26'; },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days.pop(); },
		(data: ReturnType<typeof fixture>) => { data.weeks.push(data.weeks[0]!); },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days[0]!.weekday = 7; },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days[0]!.weekday = 0.5; },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days[0]!.count = -1; },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days[0]!.count = 0.5; },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days[0]!.count = Number.MAX_SAFE_INTEGER + 1; },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days[0]!.level = 5; },
		(data: ReturnType<typeof fixture>) => { data.weeks[0]!.contribution_days[0]!.level = -1; },
	])('rejects invalid weeks/days %#', (mutate) => {
		const data = fixture();
		mutate(data);
		expect(() => normalizeContributions('octocat', data)).toThrowError(expect.objectContaining({
			status: 502, code: 'INVALID_UPSTREAM_DATA',
		}));
	});
});

describe('upstream transport', () => {
	it('fetches only the normalized GitHub URL with JSON requested and redirects disabled', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse());
		const service = createContributionService({ fetch: fetcher });
		expect(await service.get('OctoCat')).toEqual(normalizeContributions('octocat', fixture()));
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher).toHaveBeenCalledWith('https://github.com/octocat.contribs', expect.objectContaining({
			headers: { Accept: 'application/json' }, redirect: 'manual', signal: expect.any(AbortSignal),
		}));
	});

	it('rejects invalid usernames without fetching', async () => {
		const fetcher = vi.fn<typeof fetch>();
		await expect(createContributionService({ fetch: fetcher }).get('../bad')).rejects.toMatchObject({
			status: 400, code: 'INVALID_USERNAME',
		});
		expect(fetcher).not.toHaveBeenCalled();
	});

	it.each([
		[404, 404, 'USER_NOT_FOUND'],
		[429, 503, 'UPSTREAM_UNAVAILABLE'],
		[500, 503, 'UPSTREAM_UNAVAILABLE'],
		[503, 503, 'UPSTREAM_UNAVAILABLE'],
		[403, 502, 'UPSTREAM_ERROR'],
		[401, 502, 'UPSTREAM_ERROR'],
		[302, 502, 'UPSTREAM_ERROR'],
	])('maps upstream HTTP %s', async (upstream, status, code) => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('not exposed', { status: upstream }));
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({ status, code });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it.each([new Headers({ 'retry-after': '60' }), new Headers({ 'x-ratelimit-remaining': '0' })])('recognizes HTTP 403 throttling from headers %j', async (headers) => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403, headers }));
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({
			status: 503, code: 'UPSTREAM_UNAVAILABLE',
		});
	});

	it('maps network failures without exposing their messages', async () => {
		const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private network details'));
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({
			status: 502, code: 'UPSTREAM_ERROR', message: 'Could not fetch GitHub contributions.',
		});
	});

	it.each([
		new Response('<html>bad</html>', { headers: { 'Content-Type': 'text/html' } }),
		new Response('{}', { headers: { 'Content-Type': 'application/json' } }),
		new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
		new Response(JSON.stringify(fixture())),
	])('rejects unexpected content or schema %#', async (response) => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({
			status: 502, code: 'INVALID_UPSTREAM_DATA',
		});
	});

	it('aborts an unresponsive upstream at the ten-second deadline', async () => {
		vi.useFakeTimers();
		const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
		const outcome = createContributionService({ fetch: fetcher }).get('octocat').catch((error: unknown) => error);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(await outcome).toMatchObject({ status: 504, code: 'UPSTREAM_TIMEOUT' });
		expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('keeps the deadline active while reading a slow body and cancels it', async () => {
		vi.useFakeTimers();
		const cancel = vi.fn();
		const body = new ReadableStream<Uint8Array>({ cancel });
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, {
			headers: { 'Content-Type': 'application/json' },
		}));
		const outcome = createContributionService({ fetch: fetcher }).get('octocat').catch((error: unknown) => error);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(await outcome).toMatchObject({ status: 504, code: 'UPSTREAM_TIMEOUT' });
		expect(cancel).toHaveBeenCalledOnce();
		expect(vi.getTimerCount()).toBe(0);
	});

	it.each([undefined, '1', String(1024 * 1024 + 1)])('rejects bodies over 1 MiB regardless of Content-Length %s', async (length) => {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (length !== undefined) headers['Content-Length'] = length;
		const response = new Response('x'.repeat(1024 * 1024 + 1), { headers });
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({
			status: 502, code: 'INVALID_UPSTREAM_DATA',
		});
	});

	it('maps stream failures to upstream errors', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const response = new Response(new ReadableStream({
			start(controller) { controller.error(new Error('body connection failed')); },
		}), { headers: { 'Content-Type': 'application/json' } });
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({
			status: 502, code: 'UPSTREAM_ERROR',
		});
		expect(log).toHaveBeenCalled();
	});

	it('rejects invalid UTF-8 as an upstream-format error', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([0xff]), {
			headers: { 'Content-Type': 'application/json' },
		}));
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({
			status: 502, code: 'INVALID_UPSTREAM_DATA',
		});
	});

	it('counts bytes across multiple chunks and cancels oversized streams', async () => {
		const cancel = vi.fn();
		const response = new Response(new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(600_000).fill(32));
				controller.enqueue(new Uint8Array(600_000).fill(32));
			},
			cancel,
		}), { headers: { 'Content-Type': 'application/json' } });
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
		await expect(createContributionService({ fetch: fetcher }).get('octocat')).rejects.toMatchObject({
			status: 502, code: 'INVALID_UPSTREAM_DATA',
		});
		expect(cancel).toHaveBeenCalledOnce();
	});

	it('accepts a valid JSON body at exactly the 1 MiB limit', async () => {
		const text = JSON.stringify(fixture());
		const response = new Response(text.padEnd(1024 * 1024), {
			headers: { 'Content-Type': 'application/json' },
		});
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
		expect(await createContributionService({ fetch: fetcher }).get('octocat')).toEqual(normalizeContributions('octocat', fixture()));
	});
});
