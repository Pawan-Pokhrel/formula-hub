export const FAVORITE_DRIVER_LIMIT = 4;
export const FAVORITE_TEAM_LIMIT = 2;
export const DASHBOARD_PREFS_STORAGE_KEY =
	'formulahub.dashboard.preferences.v1';

export function normalizeWidgetOrder(order, validWidgetIds) {
	const source = Array.isArray(order) ? order : [];
	const uniqueValid = source.filter(
		(id, idx) => validWidgetIds.includes(id) && source.indexOf(id) === idx
	);
	const missing = validWidgetIds.filter((id) => !uniqueValid.includes(id));
	return [...uniqueValid, ...missing];
}

export function normalizeHiddenWidgets(hiddenWidgets, validWidgetIds) {
	const source = Array.isArray(hiddenWidgets) ? hiddenWidgets : [];
	return source.filter(
		(id, idx) => validWidgetIds.includes(id) && source.indexOf(id) === idx
	);
}

export function normalizeDashboardPreferences(
	raw,
	validWidgetIds,
	defaultOrder
) {
	const safe = raw || {};

	const favoriteDrivers =
		Array.isArray(safe.favoriteDrivers) ?
			safe.favoriteDrivers.slice(0, FAVORITE_DRIVER_LIMIT)
		:	[];
	const favoriteTeams =
		Array.isArray(safe.favoriteTeams) ?
			safe.favoriteTeams.slice(0, FAVORITE_TEAM_LIMIT)
		:	[];

	const widgetOrder = normalizeWidgetOrder(
		safe.widgetOrder || defaultOrder,
		validWidgetIds
	);
	const hiddenWidgets = normalizeHiddenWidgets(
		safe.hiddenWidgets,
		validWidgetIds
	);

	return {
		favoriteDrivers,
		favoriteTeams,
		widgetOrder,
		hiddenWidgets,
	};
}

export function getDefaultDashboardPreferences(defaultOrder) {
	return {
		favoriteDrivers: [],
		favoriteTeams: [],
		widgetOrder: [...defaultOrder],
		hiddenWidgets: [],
	};
}

export function readLocalDashboardPreferences(validWidgetIds, defaultOrder) {
	if (typeof window === 'undefined') {
		return getDefaultDashboardPreferences(defaultOrder);
	}

	try {
		const raw = localStorage.getItem(DASHBOARD_PREFS_STORAGE_KEY);
		if (!raw) {
			return getDefaultDashboardPreferences(defaultOrder);
		}
		const parsed = JSON.parse(raw);
		return normalizeDashboardPreferences(parsed, validWidgetIds, defaultOrder);
	} catch {
		return getDefaultDashboardPreferences(defaultOrder);
	}
}

export function writeLocalDashboardPreferences(preferences) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(
		DASHBOARD_PREFS_STORAGE_KEY,
		JSON.stringify(preferences)
	);
}

export function clearLocalDashboardPreferences() {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(DASHBOARD_PREFS_STORAGE_KEY);
}
