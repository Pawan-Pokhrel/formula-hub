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
