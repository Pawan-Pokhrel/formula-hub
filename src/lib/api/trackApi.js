import api from './api';

const TRACK_SCHEDULE_CACHE_TTL_MS = 60 * 1000;
const trackScheduleCache = new Map();

function getCachedTrackSchedule(year) {
	const key = String(year);
	const entry = trackScheduleCache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.ts > TRACK_SCHEDULE_CACHE_TTL_MS) {
		trackScheduleCache.delete(key);
		return null;
	}
	return entry.data;
}

function setCachedTrackSchedule(year, data) {
	trackScheduleCache.set(String(year), { ts: Date.now(), data });
}

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
export const getYearSchedule = async (year, { forceRefresh = false } = {}) => {
	if (!forceRefresh) {
		const cached = getCachedTrackSchedule(year);
		if (cached) return cached;
	}

	const response = await api.get(`/track/schedule/${year}`);
	if (Array.isArray(response.data?.data)) {
		setCachedTrackSchedule(year, response.data.data);
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

export const toggleTrackFavorite = async (year, round) => {
	const res = await api.post(`/track/session/${year}/${round}/favorite`);
	return res.data?.data || {};
};

/**
 * Get runtime overtake probabilities for a specific race state.
 */
export const getOvertakeProbabilities = async (
	year,
	round,
	{ lap, timeSec, topN = 12, signal } = {}
) => {
	if (!lap || lap < 1) {
		throw new Error('lap must be >= 1');
	}

	const res = await api.get(
		`/track/session/${year}/${round}/overtake-probabilities`,
		{
			params: {
				lap,
				top_n: topN,
				time_sec: typeof timeSec === 'number' ? timeSec : undefined,
			},
			signal,
		}
	);

	if (res.data?.success) {
		return res.data.data;
	}

	throw new Error(
		res.data?.message || 'Failed to fetch overtake probabilities'
	);
};

/**
 * Get all saved (favorited) races for a given year.
 * Reuses the year schedule endpoint and filters for is_favorite items.
 */
export const getSavedRaces = async (year) => {
	const schedule = await getYearSchedule(year);
	return schedule.filter((race) => race.is_favorite === true);
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
