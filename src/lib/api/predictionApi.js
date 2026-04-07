import api from './api';

/**
 * Fetch model metadata (drivers, teams, circuits, compounds).
 */
export const getPredictionMetadata = async () => {
	const response = await api.get('/prediction/metadata');
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(
		response.data.message || 'Failed to fetch prediction metadata'
	);
};

/**
 * Submit a prediction request and return the result.
 */
export const predictLapTime = async (inputs) => {
	const response = await api.post('/prediction/predict', inputs);
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(response.data.message || 'Prediction failed');
};

/**
 * Simulate a historical race lap-by-lap and predict the next lap.
 */
export const simulateRacePredictions = async ({
	year,
	round,
	start_lap = 4,
	end_lap,
	drivers,
	circuit,
}) => {
	const payload = {
		year,
		round,
		start_lap,
	};

	if (end_lap != null && end_lap !== '') payload.end_lap = end_lap;
	if (drivers?.length) payload.drivers = drivers;
	if (circuit) payload.circuit = circuit;

	const response = await api.post('/prediction/simulate-race', payload, { timeout: 120000 });
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(response.data.message || 'Replay simulation failed');
};
