import api from './api';

const SCHEDULE_CACHE_TTL_MS = 60 * 1000;
const scheduleCache = new Map();

function getCachedSchedule(year) {
	const key = String(year);
	const entry = scheduleCache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.ts > SCHEDULE_CACHE_TTL_MS) {
		scheduleCache.delete(key);
		return null;
	}
	return entry.data;
}

function setCachedSchedule(year, data) {
	scheduleCache.set(String(year), { ts: Date.now(), data });
}

function normalizeNumber(value, fallback = null) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return parsed;
}

function normalizeTelemetryRow(row, index = 0) {
	const position = normalizeNumber(row?.position, null);
	const lapCount = normalizeNumber(row?.lap_count ?? row?.laps, null);

	return {
		position: position ?? index + 1,
		driver_name: row?.driver_name || row?.driver || 'Unknown Driver',
		driver_code: row?.driver_code || row?.abbreviation || null,
		team_name: row?.team_name || row?.team || 'Unknown Team',
		team_color: row?.team_color || null,
		grid_position: normalizeNumber(row?.grid_position ?? row?.grid, null),
		status: row?.status || null,
		best_lap: row?.best_lap || null,
		time: row?.time || row?.result || null,
		q1: row?.q1 || null,
		q2: row?.q2 || null,
		q3: row?.q3 || null,
		gap_to_best: row?.gap_to_best || row?.gap || null,
		gap_to_pole: row?.gap_to_pole || null,
		lap_count: lapCount,
	};
}

function sortRowsByPosition(rows) {
	return rows.slice().sort((a, b) => {
		const pa =
			Number.isFinite(a.position) ? a.position : Number.MAX_SAFE_INTEGER;
		const pb =
			Number.isFinite(b.position) ? b.position : Number.MAX_SAFE_INTEGER;
		if (pa === pb) return a.driver_name.localeCompare(b.driver_name);
		return pa - pb;
	});
}

function buildDriverBands(rows) {
	const ordered = sortRowsByPosition(rows);
	const top3 = ordered.filter((row) => row.position >= 1 && row.position <= 3);
	const p4p10 = ordered.filter(
		(row) => row.position >= 4 && row.position <= 10
	);
	const p11p22 = ordered.filter(
		(row) => row.position >= 11 && row.position <= 22
	);

	return {
		top3: {
			start_position: 1,
			end_position: 3,
			count: top3.length,
			rows: top3,
		},
		p4_p10: {
			start_position: 4,
			end_position: 10,
			count: p4p10.length,
			rows: p4p10,
		},
		p11_p22: {
			start_position: 11,
			end_position: 22,
			count: p11p22.length,
			rows: p11p22,
		},
		total_rows: ordered.length,
	};
}

function buildTelemetryFromWeekendBrief(brief) {
	if (!brief || typeof brief !== 'object') return null;

	const rawRows =
		Array.isArray(brief?.session_results?.rows) ?
			brief.session_results.rows
		:	[];
	const rows = sortRowsByPosition(
		rawRows.map((row, index) => normalizeTelemetryRow(row, index))
	);
	const podium = rows.filter((row) => row.position >= 1 && row.position <= 3);
	const startingGridRaw =
		Array.isArray(brief?.starting_grid) ? brief.starting_grid : [];
	const startingGrid = sortRowsByPosition(
		startingGridRaw.map((row, index) => normalizeTelemetryRow(row, index))
	);

	const sessions =
		Array.isArray(brief?.sessions) ?
			brief.sessions.map((session) => ({
				name: session?.name || 'Session',
				session_type: session?.session_type || 'session',
				start_utc: session?.start_utc || null,
				status: session?.status || null,
			}))
		:	[];

	const selectedSession = brief?.last_completed_session || null;
	const event = brief?.event;

	return {
		generated_at: brief?.generated_at || new Date().toISOString(),
		source: 'legacy_weekend_brief',
		source_label: 'Weekend session',
		is_race_week: Boolean(brief?.is_race_week),
		event:
			event ?
				{
					year: normalizeNumber(event.year, new Date().getFullYear()),
					round: normalizeNumber(event.round, 0),
					event: event.event || 'Race Weekend',
					country: event.country || 'Unknown',
					location: event.location || 'Unknown',
					race_date_utc: event.race_date_utc || null,
				}
			:	null,
		sessions,
		session:
			selectedSession ?
				{
					name:
						selectedSession.name ||
						brief?.session_results?.session_name ||
						'Latest Session',
					session_type:
						selectedSession.session_type ||
						brief?.session_results?.session_type ||
						'session',
					start_utc: selectedSession.start_utc || null,
					status: selectedSession.status || 'completed',
				}
			:	null,
		rows,
		podium,
		starting_grid: startingGrid,
		driver_bands: buildDriverBands(rows),
	};
}

function buildTelemetryFromLastRace(lastRace) {
	if (!lastRace || typeof lastRace !== 'object') return null;

	const podiumRows =
		Array.isArray(lastRace?.podium) ?
			sortRowsByPosition(
				lastRace.podium.map((row, index) => normalizeTelemetryRow(row, index))
			)
		:	[];

	return {
		generated_at: new Date().toISOString(),
		source: 'legacy_last_race',
		source_label: 'Latest race podium',
		is_race_week: false,
		event: {
			year: new Date(lastRace?.date || Date.now()).getUTCFullYear(),
			round: normalizeNumber(lastRace?.round, 0),
			event: lastRace?.race_name || 'Latest Race',
			country: lastRace?.circuit?.country || 'Unknown',
			location: lastRace?.circuit?.location || 'Unknown',
			race_date_utc: lastRace?.date || null,
		},
		sessions: [],
		session: {
			name: 'Race',
			session_type: 'race',
			start_utc: lastRace?.date || null,
			status: 'completed',
		},
		rows: podiumRows,
		podium: podiumRows,
		starting_grid: [],
		driver_bands: buildDriverBands(podiumRows),
	};
}

export const getSchedule = async (year, { forceRefresh = false } = {}) => {
	if (!forceRefresh) {
		const cached = getCachedSchedule(year);
		if (cached) return cached;
	}

	const response = await api.get(`/schedule/${year}`);
	if (Array.isArray(response.data?.data)) {
		setCachedSchedule(year, response.data.data);
		return response.data.data;
	}
	throw new Error(response.data.message || 'Failed to fetch schedule');
};

export const getNextRace = async () => {
	const response = await api.get('/schedule/current/next');
	if (response.data.success) {
		return response.data.data;
	}
	return null; // No next race found
};

export const getLastRace = async () => {
	const response = await api.get('/schedule/current/last');
	if (response.data.success) {
		return response.data.data;
	}
	return null; // No last race found
};

export const getCurrentWeekendBrief = async () => {
	const response = await api.get('/schedule/current/weekend-brief');
	if (response.data.success) {
		return response.data.data;
	}
	return null;
};

export const getCurrentTelemetrySnapshot = async () => {
	try {
		const response = await api.get('/schedule/current/telemetry');
		if (response.data.success) {
			return response.data.data;
		}
		return null;
	} catch (error) {
		const status = Number(error?.response?.status || 0);
		if (status !== 404) {
			throw error;
		}

		try {
			const weekendResponse = await api.get('/schedule/current/weekend-brief');
			if (weekendResponse.data.success) {
				const mapped = buildTelemetryFromWeekendBrief(
					weekendResponse.data.data
				);
				if (mapped?.driver_bands?.total_rows > 0) return mapped;
			}
		} catch {
			// Continue to legacy fallback.
		}

		try {
			const lastRaceResponse = await api.get('/schedule/current/last');
			if (lastRaceResponse.data.success) {
				const mapped = buildTelemetryFromLastRace(lastRaceResponse.data.data);
				if (mapped) return mapped;
			}
		} catch {
			// No compatible fallback route available.
		}

		throw new Error(
			'Telemetry endpoint is unavailable on the active backend instance. Please restart or update the backend server.'
		);
	}
};

export const getTelemetryHistoryEvents = async (year, limit = 24) => {
	const response = await api.get('/schedule/telemetry/history', {
		params: { year, limit },
	});
	if (response.data.success) {
		return Array.isArray(response.data.data) ? response.data.data : [];
	}
	return [];
};

export const getTelemetrySessionSnapshot = async ({ year, round, session }) => {
	const response = await api.get('/schedule/telemetry/session', {
		params: {
			year,
			round,
			session: session || undefined,
		},
	});
	if (response.data.success) {
		return response.data.data;
	}
	return null;
};

export const getLatestF1News = async (limit = 8) => {
	const response = await api.get('/schedule/news/latest', {
		params: { limit },
	});
	if (response.data.success) {
		return response.data.data;
	}
	return [];
};
