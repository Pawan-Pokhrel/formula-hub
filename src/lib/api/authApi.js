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
		const { data } = await api.post('/auth/logout');
		return data;
	},

	me: async (token = null) => {
		const config =
			token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
		const { data } = await api.get('/auth/me', config);
		return data;
	},

	updateProfile: async (payload) => {
		const { data } = await api.put('/auth/profile', payload);
		return data;
	},

	uploadAvatar: async (file) => {
		const formData = new FormData();
		formData.append('file', file);
		const { data } = await api.post('/auth/avatar/upload', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return data;
	},

	requestEmailChange: async (payload) => {
		const { data } = await api.post('/auth/email-change/request', payload);
		return data;
	},

	verifyEmailChange: async (payload) => {
		const { data } = await api.post('/auth/email-change/verify', payload);
		return data;
	},

	changePassword: async (payload) => {
		const { data } = await api.post('/auth/change-password', payload);
		return data;
	},
};

export default authApi;
