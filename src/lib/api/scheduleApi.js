import api from './api';

export const getSchedule = async (year) => {
	const response = await api.get(`/schedule/${year}`);
	if (response.data.success) {
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
