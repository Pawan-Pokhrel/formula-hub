export const ROUGH_CONSTRUCTOR_ORDER_2026 = [
	'McLaren',
	'Mercedes',
	'Ferrari',
	'Red Bull Racing',
	'Williams',
	'Haas F1 Team',
	'Alpine',
	'Aston Martin',
	'Racing Bulls',
	'Audi',
	'Cadillac',
];

const CONSTRUCTOR_ORDER_CACHE_KEY = 'formulahub.constructor-rank-by-key.v1';

export function readConstructorRankCache() {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(CONSTRUCTOR_ORDER_CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		if (!parsed.rankByKey || typeof parsed.rankByKey !== 'object') return null;
		return parsed.rankByKey;
	} catch {
		return null;
	}
}

export function writeConstructorRankCache(rankByKey) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(
			CONSTRUCTOR_ORDER_CACHE_KEY,
			JSON.stringify({
				rankByKey,
				updatedAt: new Date().toISOString(),
			})
		);
	} catch {
		// Ignore persistence failures in private mode or restricted environments.
	}
}
