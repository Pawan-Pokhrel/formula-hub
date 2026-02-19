import api from './api';

/**
 * Get list of available race sessions with track data.
 */
export const getTrackSessions = async () => {
	const response = await api.get('/track/sessions');
	if (response.data.success) {
		return response.data.data;
	}
	throw new Error(response.data.message || 'Failed to fetch track sessions');
};

/**
 * Get full track + position data for a specific session.
 * Returns raw session data (large payload).
 */
export const getSessionData = async (year, round) => {
	const response = await api.get(`/track/session/${year}/${round}`);
	return response.data;
};
