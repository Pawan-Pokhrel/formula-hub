export function getSafeNextPath(nextPath) {
	if (!nextPath || typeof nextPath !== 'string') return '/dashboard';
	if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
		return '/dashboard';
	}
	const lower = nextPath.toLowerCase();
	if (lower === '/login' || lower.startsWith('/login?')) return '/dashboard';
	if (lower === '/register' || lower.startsWith('/register?')) {
		return '/dashboard';
	}
	return nextPath;
}

export function buildVerificationHref(
	email,
	{ sent = false, nextPath = null } = {}
) {
	const normalizedEmail = String(email || '').trim();
	if (!normalizedEmail) {
		return '/register';
	}

	const params = new URLSearchParams({
		verify: '1',
		email: normalizedEmail,
	});

	if (sent) {
		params.set('sent', '1');
	}

	if (nextPath) {
		params.set('next', getSafeNextPath(nextPath));
	}

	return `/register?${params.toString()}`;
}

export function getEmailNotVerifiedDetail(error) {
	const detail = error?.response?.data?.detail;
	if (detail && typeof detail === 'object' && detail.code === 'EMAIL_NOT_VERIFIED') {
		return detail;
	}
	if (typeof detail === 'string' && /email not verified/i.test(detail)) {
		return {
			code: 'EMAIL_NOT_VERIFIED',
			message: detail,
			email: null,
			resentCode: false,
		};
	}
	return null;
}
