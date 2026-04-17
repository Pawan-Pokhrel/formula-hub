'use client';

const AVATAR_CACHE_NAME = 'formulahub-avatar-cache-v1';

function canUseAvatarCache() {
	return (
		typeof window !== 'undefined' &&
		typeof window.fetch === 'function' &&
		'caches' in window
	);
}

function isDirectAvatarSource(src) {
	return src.startsWith('data:') || src.startsWith('blob:');
}

function toAbsoluteAvatarUrl(src) {
	if (typeof window === 'undefined' || !src) return null;
	try {
		return new URL(src, window.location.href).toString();
	} catch {
		return null;
	}
}

function getFetchOptions(url, signal) {
	const isSameOrigin =
		typeof window !== 'undefined' && url.startsWith(window.location.origin);
	return {
		cache: 'force-cache',
		credentials: isSameOrigin ? 'same-origin' : 'omit',
		mode: 'cors',
		signal,
	};
}

export async function primeAvatarCache(src, { signal } = {}) {
	if (!src || isDirectAvatarSource(src) || !canUseAvatarCache()) {
		return null;
	}

	const absoluteUrl = toAbsoluteAvatarUrl(src);
	if (!absoluteUrl) {
		return null;
	}

	try {
		const cache = await window.caches.open(AVATAR_CACHE_NAME);
		const cachedResponse = await cache.match(absoluteUrl);
		if (cachedResponse?.ok) {
			return cachedResponse;
		}

		const response = await fetch(absoluteUrl, getFetchOptions(absoluteUrl, signal));
		if (!response.ok || response.type === 'opaque') {
			return null;
		}

		await cache.put(absoluteUrl, response.clone());
		return response;
	} catch {
		return null;
	}
}

export async function getCachedAvatarObjectUrl(src, { signal } = {}) {
	const response = await primeAvatarCache(src, { signal });
	if (!response) {
		return null;
	}

	try {
		const blob = await response.blob();
		if (!blob.size || signal?.aborted) {
			return null;
		}
		return URL.createObjectURL(blob);
	} catch {
		return null;
	}
}
