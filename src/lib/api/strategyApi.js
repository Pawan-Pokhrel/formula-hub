import api from './api';

/**
 * Get available circuits for strategy simulation
 */
export async function getCircuits(year) {
	const { data } = await api.get(`/strategy/circuits/${year}`);
	return data;
}

/**
 * Run pit stop strategy simulation (original model-based)
 */
export async function runSimulation({
	year,
	roundNum,
	maxStops = 3,
	compounds = null,
}) {
	const params = new URLSearchParams();
	params.append('year', year);
	params.append('round_num', roundNum);
	params.append('max_stops', maxStops);
	if (compounds && compounds.length > 0) {
		params.append('compounds', compounds.join(','));
	}
	const { data } = await api.post(`/strategy/simulate?${params.toString()}`, null, { timeout: 120000 });
	return data;
}

/**
 * Load full lap-by-lap race data for replay simulation.
 * First call may take 30-60s (FastF1 loading), cached afterwards.
 */
export async function loadRaceData({ year, roundNum }) {
	const params = new URLSearchParams({ year, round_num: roundNum });
	const { data } = await api.post(`/strategy/race-data?${params.toString()}`, null, { timeout: 120000 });
	return data;
}

/**
 * Get heuristic strategy recommendation for a driver at a specific lap.
 */
export async function getRecommendation({
	year,
	roundNum,
	driver,
	lap,
	maxStops = 3,
}) {
	const params = new URLSearchParams({
		year,
		round_num: roundNum,
		driver,
		lap,
		max_stops: maxStops,
	});
	const { data } = await api.post(`/strategy/recommend?${params.toString()}`, null, { timeout: 120000 });
	return data;
}

/**
 * ML-powered strategy prediction for a driver at a specific lap.
 * Returns pit timing, compound recommendation, and confidence scores.
 */
export async function getMLPrediction({ year, roundNum, driver, lap }) {
	const params = new URLSearchParams({
		year,
		round_num: roundNum,
		driver,
		lap,
	});
	const { data } = await api.post(`/strategy/ml-predict?${params.toString()}`, null, { timeout: 120000 });
	return data;
}

/**
 * Get ML model training metadata.
 */
export async function getStrategyModelInfo() {
	const { data } = await api.get('/strategy/model-info');
	return data;
}
