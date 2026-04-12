import api from './api';

export const getHistory = async (token, limit = 25) => {
	const response = await api.get('/history/', {
		params: { limit },
		headers: { Authorization: `Bearer ${token}` },
	});
	return response.data;
};

export const logActivity = async (
	token,
	{ activity_type, title, subtitle, image_url, color_hex, reference_url }
) => {
	const response = await api.post(
		'/history/log',
		{ activity_type, title, subtitle, image_url, color_hex, reference_url },
		{
			headers: { Authorization: `Bearer ${token}` },
		}
	);
	return response.data;
};

export const deleteHistoryItem = async (token, itemId) => {
	await api.delete(`/history/${itemId}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
};

export const clearHistory = async (token) => {
	const response = await api.delete('/history/clear', {
		headers: { Authorization: `Bearer ${token}` },
	});
	return response.data;
};

const historyApi = {
	getHistory,
	logActivity,
	deleteHistoryItem,
	clearHistory,
};

export default historyApi;
