import { createContext } from 'astro/middleware';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContributionError, type ContributionData } from '../src/lib/contributions';
import { GET, prerender } from '../src/pages/api/contributions/[username]';

const { get } = vi.hoisted(() => ({ get: vi.fn<(username: string | undefined) => Promise<ContributionData>>() }));

vi.mock('../src/lib/contributions', async (importOriginal) => {
	const original = await importOriginal<typeof import('../src/lib/contributions')>();
	return { ...original, contributionService: { get } };
});

function context(username: string | undefined = 'octocat') {
	return createContext({
		request: new Request('http://localhost/api/contributions/octocat'),
		params: { username },
		defaultLocale: 'en',
	});
}

beforeEach(() => {
	get.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('contribution route', () => {
	it('stays a runtime endpoint', () => {
		expect(prerender).toBe(false);
	});

	it('returns the normalized JSON contract without browser caching', async () => {
		const data: ContributionData = {
			username: 'octocat',
			totalContributions: 0,
			from: '2024-02-25',
			to: '2024-02-25',
			days: [{ date: '2024-02-25', count: 0, level: 0 }],
		};
		get.mockResolvedValue(data);
		const response = await GET(context('OctoCat'));
		expect(get).toHaveBeenCalledWith('OctoCat');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/json');
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual(data);
	});

	it.each([
		new ContributionError(400, 'INVALID_USERNAME', 'Enter a valid GitHub username.'),
		new ContributionError(404, 'USER_NOT_FOUND', 'GitHub user not found.'),
		new ContributionError(503, 'UPSTREAM_UNAVAILABLE', 'GitHub is temporarily unavailable.'),
		new ContributionError(502, 'UPSTREAM_ERROR', 'Could not fetch GitHub contributions.'),
		new ContributionError(502, 'INVALID_UPSTREAM_DATA', 'GitHub returned unexpected contribution data.'),
		new ContributionError(504, 'UPSTREAM_TIMEOUT', 'GitHub took too long to respond.'),
		new ContributionError(503, 'SERVICE_BUSY', 'Contribution service is busy.'),
	])('maps domain error $code', async (error) => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		get.mockRejectedValue(error);
		const response = await GET(context());
		expect(response.status).toBe(error.status);
		expect(response.headers.get('content-type')).toBe('application/json');
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ error: error.message, code: error.code });
		if (error.status >= 500) {
			expect(log).toHaveBeenCalledWith('[contributions] Request failed.', {
				status: error.status, code: error.code,
			});
		} else {
			expect(log).not.toHaveBeenCalled();
		}
	});

	it('logs unexpected failures without leaking internal error messages', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		get.mockRejectedValue(new Error('internal secret'));
		const response = await GET(context());
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: 'Could not load contribution data.', code: 'INTERNAL_ERROR',
		});
		expect(log).toHaveBeenCalledWith('[contributions] Request failed.', {
			status: 500, code: 'INTERNAL_ERROR',
		});
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('passes a missing username to validation', async () => {
		get.mockRejectedValue(new ContributionError(400, 'INVALID_USERNAME', 'Enter a valid GitHub username.'));
		const missing = context();
		delete missing.params.username;
		expect((await GET(missing)).status).toBe(400);
		expect(get).toHaveBeenCalledWith(undefined);
	});
});
