import api from './api';

function toNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDriverRows(rows, year) {
	return (Array.isArray(rows) ? rows : []).map((row) => ({
		year: Number(row?.year || year),
		position: Number(row?.position || 0),
		driver_name: row?.driver_name || 'Unknown Driver',
		driver_code: row?.driver_code || '',
		team_name: row?.team_name || 'Unknown Team',
		points: Number(row?.points || 0),
		wins: Number(row?.wins || 0),
		gap_to_leader: Number(row?.gap_to_leader || 0),
		podiums: Number(row?.podiums || 0),
		poles: Number(row?.poles || 0),
		top10_finishes: Number(row?.top10_finishes || 0),
		dnf_count: Number(row?.dnf_count || 0),
		avg_finish:
			Number.isFinite(Number(row?.avg_finish)) ? Number(row.avg_finish) : null,
	}));
}

function normalizeConstructorRows(rows, year) {
	return (Array.isArray(rows) ? rows : []).map((row) => ({
		year: Number(row?.year || year),
		position: Number(row?.position || 0),
		team_name: row?.team_name || 'Unknown Team',
		points: Number(row?.points || 0),
		wins: Number(row?.wins || 0),
		gap_to_leader: Number(row?.gap_to_leader || 0),
		podiums: Number(row?.podiums || 0),
		poles: Number(row?.poles || 0),
		top10_finishes: Number(row?.top10_finishes || 0),
		dnf_count: Number(row?.dnf_count || 0),
		avg_finish:
			Number.isFinite(Number(row?.avg_finish)) ? Number(row.avg_finish) : null,
	}));
}

function normalizeDriverComparisonRows(rows, year) {
	return (Array.isArray(rows) ? rows : []).map((row) => ({
		year: Number(row?.year || year),
		round: toNullableNumber(row?.round),
		race_name: row?.race_name || null,
		position: toNumber(row?.position, 0),
		driver_name: row?.driver_name || 'Unknown Driver',
		driver_code: row?.driver_code || '',
		team_name: row?.team_name || 'Unknown Team',
		points: toNumber(row?.points, 0),
		wins: toNumber(row?.wins, 0),
		gap_to_leader: toNumber(row?.gap_to_leader, 0),
		podiums: toNumber(row?.podiums, 0),
		poles: toNumber(row?.poles, 0),
		top10_finishes: toNumber(row?.top10_finishes, 0),
		dnf_count: toNumber(row?.dnf_count, 0),
		avg_finish: toNullableNumber(row?.avg_finish),
		races_entered: toNumber(row?.races_entered, 0),
		grid_position: toNullableNumber(row?.grid_position),
		status: row?.status || null,
		laps: toNullableNumber(row?.laps),
		driver_id: row?.driver_id || null,
		nationality: row?.nationality || null,
		worldChampionships: toNumber(row?.world_championships, 0),
		careerEntries: toNumber(row?.career_entries, 0),
		careerStarts: toNumber(row?.career_starts, 0),
		careerWins: toNumber(row?.career_wins, 0),
		careerPodiums: toNumber(row?.career_podiums, 0),
		careerPoles: toNumber(row?.career_poles, 0),
		careerFastestLaps: toNumber(row?.career_fastest_laps, 0),
		careerPoints: toNumber(row?.career_points, 0),
		lastSyncedYear: toNullableNumber(row?.last_synced_year),
	}));
}

function normalizeConstructorComparisonRows(rows, year) {
	return (Array.isArray(rows) ? rows : []).map((row) => ({
		year: Number(row?.year || year),
		round: toNullableNumber(row?.round),
		race_name: row?.race_name || null,
		position: toNumber(row?.position, 0),
		team_name: row?.team_name || 'Unknown Team',
		points: toNumber(row?.points, 0),
		wins: toNumber(row?.wins, 0),
		gap_to_leader: toNumber(row?.gap_to_leader, 0),
		podiums: toNumber(row?.podiums, 0),
		poles: toNumber(row?.poles, 0),
		top10_finishes: toNumber(row?.top10_finishes, 0),
		dnf_count: toNumber(row?.dnf_count, 0),
		avg_finish: toNullableNumber(row?.avg_finish),
		races_entered: toNumber(row?.races_entered, 0),
		constructor_id: row?.constructor_id || null,
		nationality: row?.nationality || null,
		worldChampionships: toNumber(row?.world_championships, 0),
		careerEntries: toNumber(row?.career_entries, 0),
		careerStarts: toNumber(row?.career_starts, 0),
		careerWins: toNumber(row?.career_wins, 0),
		careerPodiums: toNumber(row?.career_podiums, 0),
		careerPoles: toNumber(row?.career_poles, 0),
		careerFastestLaps: toNumber(row?.career_fastest_laps, 0),
		careerPoints: toNumber(row?.career_points, 0),
		lastSyncedYear: toNullableNumber(row?.last_synced_year),
	}));
}

export const getDriverStandings = async (year, options = {}) => {
	const refresh = options.refresh ? '?refresh=true' : '';
	const response = await api.get(`/standings/drivers/${year}${refresh}`);
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(response.data.message || 'Failed to fetch driver standings');
};

export const getConstructorStandings = async (year, options = {}) => {
	const refresh = options.refresh ? '?refresh=true' : '';
	const response = await api.get(`/standings/constructors/${year}${refresh}`);
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(
		response.data.message || 'Failed to fetch constructor standings'
	);
};

export const getDriverComparison = async (year, options = {}) => {
	const params = {};
	if (options.left) params.left = options.left;
	if (options.right) params.right = options.right;
	if (options.scope) params.scope = options.scope;
	if (options.round != null) params.round = options.round;
	if (options.refresh) params.refresh = true;

	try {
		const response = await api.get('/standings/drivers/compare', { params });
		if (!response.data.success) {
			throw new Error(
				response.data.message || 'Failed to fetch driver comparison'
			);
		}

		const payload = response.data.data || {};
		return {
			year: Number(payload.year || year),
			scope: payload.scope || options.scope || 'season',
			round: toNullableNumber(payload.round),
			rounds: toNullableNumber(payload.rounds),
			race_name: payload.race_name || null,
			drivers: normalizeDriverComparisonRows(payload.drivers, year),
		};
	} catch (error) {
		throw new Error(
			error.response?.data?.detail ||
				error.response?.data?.message ||
				'Failed to fetch driver comparison'
		);
	}
};

export const getConstructorComparison = async (year, options = {}) => {
	const params = {};
	if (options.left) params.left = options.left;
	if (options.right) params.right = options.right;
	if (options.scope) params.scope = options.scope;
	if (options.round != null) params.round = options.round;
	if (options.refresh) params.refresh = true;

	try {
		const response = await api.get('/standings/constructors/compare', {
			params,
		});
		if (!response.data.success) {
			throw new Error(
				response.data.message || 'Failed to fetch constructor comparison'
			);
		}

		const payload = response.data.data || {};
		return {
			year: Number(payload.year || year),
			scope: payload.scope || options.scope || 'season',
			round: toNullableNumber(payload.round),
			rounds: toNullableNumber(payload.rounds),
			race_name: payload.race_name || null,
			constructors: normalizeConstructorComparisonRows(
				payload.constructors,
				year
			),
		};
	} catch (error) {
		throw new Error(
			error.response?.data?.detail ||
				error.response?.data?.message ||
				'Failed to fetch constructor comparison'
		);
	}
};

export const getComparisonDataset = async (year, options = {}) => {
	const buildFallbackFromStandings = async () => {
		const [driversResult, constructorsResult] = await Promise.allSettled([
			getDriverStandings(year, { refresh: options.refresh }),
			getConstructorStandings(year, { refresh: options.refresh }),
		]);

		const driverRows =
			driversResult.status === 'fulfilled' ?
				normalizeDriverRows(driversResult.value, year)
			:	[];
		const constructorRows =
			constructorsResult.status === 'fulfilled' ?
				normalizeConstructorRows(constructorsResult.value, year)
			:	[];

		if (driverRows.length < 2 && constructorRows.length < 2) {
			throw new Error(
				'Not enough standings data to run this comparison for the selected season.'
			);
		}

		const leaderPoints = Number(driverRows[0]?.points || 0);
		const constructorLeaderPoints = Number(constructorRows[0]?.points || 0);

		return {
			year,
			rounds: 0,
			drivers: driverRows.map((row) => ({
				...row,
				gap_to_leader: Math.max(0, leaderPoints - Number(row.points || 0)),
			})),
			constructors: constructorRows.map((row) => ({
				...row,
				gap_to_leader: Math.max(
					0,
					constructorLeaderPoints - Number(row.points || 0)
				),
			})),
		};
	};

	return await buildFallbackFromStandings();
};

export const getDriverCareerStats = async () => {
	try {
		const response = await api.get('/standings/drivers/career');
		if (response.data.success) {
			return response.data.data;
		}
		throw new Error(
			response.data.message || 'Failed to fetch driver career stats'
		);
	} catch (error) {
		throw new Error(
			error.response?.data?.message || 'Failed to fetch driver career stats'
		);
	}
};

export const getConstructorCareerStats = async () => {
	try {
		const response = await api.get('/standings/constructors/career');
		if (response.data.success) {
			return response.data.data;
		}
		throw new Error(
			response.data.message || 'Failed to fetch constructor career stats'
		);
	} catch (error) {
		throw new Error(
			error.response?.data?.message ||
				'Failed to fetch constructor career stats'
		);
	}
};
