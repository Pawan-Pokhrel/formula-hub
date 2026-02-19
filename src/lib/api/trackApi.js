import api from './api';

/**
 * Get list of sessions that already have generated track data.
 */
export const getTrackSessions = async () => {
	const response = await api.get('/track/sessions');
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(response.data.message || 'Failed to fetch track sessions');
};

/**
 * Get the full race schedule for a year,
 * annotated with has_data / is_past / status for each round.
 */
export const getYearSchedule = async (year) => {
	const response = await api.get(`/track/schedule/${year}`);
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(response.data.message || 'Failed to fetch schedule');
};

/**
 * Get full track + position data for a specific session.
 *
 * If the data is not yet generated, the backend returns HTTP 202 with
 * `{ data: { status: "generating" } }`. In that case this function
 * polls until the data is ready or an error occurs.
 *
 * @param {Function} onStatus - Optional callback(statusObj) while generating.
 */
export const getSessionData = async (
	year,
	round,
	{ onStatus, signal } = {}
) => {
	// First request — may return 200 (ready) or 202 (generating)
	const res = await api.get(`/track/session/${year}/${round}`, { signal });

	if (res.status === 200 && res.data?.track) {
		return res.data; // ready
	}

	// 202 or json with status "generating" — poll until ready
	if (onStatus) onStatus(res.data?.data || { status: 'generating' });

	return pollUntilReady(year, round, { onStatus, signal });
};

/**
 * Explicitly trigger generation for a session.
 */
export const triggerGeneration = async (year, round) => {
	const res = await api.post(`/track/session/${year}/${round}/generate`);
	return res.data?.data || { status: 'generating' };
};

/**
 * Check generation status without triggering generation.
 */
export const getGenerationStatus = async (year, round) => {
	const res = await api.get(`/track/session/${year}/${round}/status`);
	return res.data?.data || {};
};

/* ── Internal polling helper ─────────────────────────────────── */

async function pollUntilReady(
	year,
	round,
	{ onStatus, signal, interval = 3000, maxAttempts = 120 } = {}
) {
	for (let i = 0; i < maxAttempts; i++) {
		if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

		await new Promise((r) => setTimeout(r, interval));

		const statusRes = await api.get(`/track/session/${year}/${round}/status`, {
			signal,
		});
		const status = statusRes.data?.data;

		if (onStatus) onStatus(status);

		if (status?.status === 'ready') {
			// Data is ready — fetch the full payload
			const dataRes = await api.get(`/track/session/${year}/${round}`, {
				signal,
			});
			if (dataRes.status === 200 && dataRes.data?.track) {
				return dataRes.data;
			}
		}

		if (status?.status === 'error') {
			throw new Error(status.message || 'Track data generation failed');
		}
	}

	throw new Error('Track data generation timed out');
}
