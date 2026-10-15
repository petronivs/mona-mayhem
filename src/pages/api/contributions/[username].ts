import type { APIRoute } from 'astro';
import { ContributionError, contributionService } from '../../../lib/contributions';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
	try {
		const data = await contributionService.get(params.username);
		return new Response(JSON.stringify(data), { status: 200, headers });
	} catch (error) {
		const status = error instanceof ContributionError ? error.status : 500;
		const code = error instanceof ContributionError ? error.code : 'INTERNAL_ERROR';
		const message = error instanceof ContributionError ? error.message : 'Could not load contribution data.';
		if (status >= 500) {
			console.error('[contributions] Request failed.', { status, code });
		}
		return new Response(JSON.stringify({ error: message, code }), { status, headers });
	}
};
