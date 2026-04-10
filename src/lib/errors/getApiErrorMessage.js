export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
	const detail = error?.response?.data?.detail;

	if (typeof detail === 'string' && detail.trim()) {
		return detail;
	}

	if (Array.isArray(detail)) {
		const joined = detail
			.map((entry) => {
				if (typeof entry === 'string') return entry;
				if (!entry || typeof entry !== 'object') return '';

				const location =
					Array.isArray(entry.loc) ? entry.loc.map(String).join('.') : '';
				const message =
					typeof entry.msg === 'string' ? entry.msg : JSON.stringify(entry);

				return location ? `${location}: ${message}` : message;
			})
			.filter(Boolean)
			.join('; ');

		if (joined) return joined;
	}

	if (detail && typeof detail === 'object') {
		if (typeof detail.message === 'string' && detail.message.trim()) {
			return detail.message;
		}
		if (typeof detail.msg === 'string' && detail.msg.trim()) {
			return detail.msg;
		}
		return JSON.stringify(detail);
	}

	const dataMessage = error?.response?.data?.message;
	if (typeof dataMessage === 'string' && dataMessage.trim()) {
		return dataMessage;
	}

	if (typeof error?.message === 'string' && error.message.trim()) {
		return error.message;
	}

	return fallback;
}
