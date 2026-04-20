import api from './api';

const authApi = {
	register: async (payload) => {
		const { data } = await api.post('/auth/register', payload);
		return data;
	},

	verifyEmail: async (payload) => {
		const { data } = await api.post('/auth/verify-email', payload);
		return data;
	},

	resendCode: async (payload) => {
		const { data } = await api.post('/auth/resend-code', payload);
		return data;
	},

	googleAuth: async (credential) => {
		const { data } = await api.post('/auth/google', { credential });
		return data;
	},

	login: async (payload) => {
		const { data } = await api.post('/auth/login', payload);
		return data;
	},

	logout: async () => {
		const { data } = await api.post('/users/me/logout');
		return data;
	},

	me: async (token = null) => {
		const config =
			token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
		const { data } = await api.get('/users/me', config);
		return data;
	},

	updateProfile: async (payload) => {
		const { data } = await api.patch('/users/me', payload);
		return data;
	},

	uploadAvatar: async (file) => {
		const formData = new FormData();
		formData.append('file', file);
		const { data } = await api.post('/users/me/avatar', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return data;
	},

	requestEmailChange: async (payload) => {
		const { data } = await api.post('/users/me/email-change/request', payload);
		return data;
	},

	verifyEmailChange: async (payload) => {
		const { data } = await api.post('/users/me/email-change/verify', payload);
		return data;
	},

	changePassword: async (payload) => {
		const { data } = await api.post('/users/me/change-password', payload);
		return data;
	},

	forgotPassword: async (payload) => {
		const { data } = await api.post('/auth/forgot-password/request', payload);
		return data;
	},

	resetPassword: async (payload) => {
		const { data } = await api.post('/auth/forgot-password/reset', payload);
		return data;
	},
};

export default authApi;
