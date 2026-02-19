import api from './api';

export const getDriverStandings = async (year) => {
	const response = await api.get(`/standings/drivers/${year}`);
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(response.data.message || 'Failed to fetch driver standings');
};

export const getConstructorStandings = async (year) => {
	const response = await api.get(`/standings/constructors/${year}`);
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(
		response.data.message || 'Failed to fetch constructor standings'
	);
};
