import api from './api';

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

export const getComparisonDataset = async (year, options = {}) => {
	const refresh = options.refresh ? '?refresh=true' : '';

	const normalizeDriverRows = (rows) =>
		(Array.isArray(rows) ? rows : []).map((row) => ({
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
				Number.isFinite(Number(row?.avg_finish)) ?
					Number(row.avg_finish)
				:	null,
		}));

	const normalizeConstructorRows = (rows) =>
		(Array.isArray(rows) ? rows : []).map((row) => ({
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
				Number.isFinite(Number(row?.avg_finish)) ?
					Number(row.avg_finish)
				:	null,
		}));

	const buildFallbackFromStandings = async () => {
		const [driversResult, constructorsResult] = await Promise.allSettled([
			getDriverStandings(year),
			getConstructorStandings(year),
		]);

		const driverRows =
			driversResult.status === 'fulfilled' ?
				normalizeDriverRows(driversResult.value)
			:	[];
		const constructorRows =
			constructorsResult.status === 'fulfilled' ?
				normalizeConstructorRows(constructorsResult.value)
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

	try {
		const response = await api.get(`/standings/comparison/${year}${refresh}`);
		if (!response.data.success) {
			return await buildFallbackFromStandings();
		}

		const payload = response.data.data || {};
		const drivers = normalizeDriverRows(payload.drivers);
		const constructors = normalizeConstructorRows(payload.constructors);

		if (drivers.length < 2 && constructors.length < 2) {
			return await buildFallbackFromStandings();
		}

		return {
			year: Number(payload.year || year),
			rounds: Number(payload.rounds || 0),
			drivers,
			constructors,
		};
	} catch {
		return await buildFallbackFromStandings();
	}
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
