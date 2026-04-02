const DEFAULT_REVALIDATE_SECONDS = 300;

function normalizeCareerRow(row) {
	const code = String(row?.driver_code || '')
		.trim()
		.toUpperCase();
	return {
		driver_id: String(row?.driver_id || '').trim().toLowerCase(),
		driver_code: code || null,
		driver_name: row?.driver_name || 'Unknown Driver',
		date_of_birth: row?.date_of_birth || null,
		nationality: row?.nationality || null,
		world_championships: Number(row?.world_championships || 0),
		career_entries: Number(row?.career_entries || 0),
		career_starts: Number(row?.career_starts || 0),
		career_wins: Number(row?.career_wins || 0),
		career_podiums: Number(row?.career_podiums || 0),
		career_poles: Number(row?.career_poles || 0),
		career_fastest_laps: Number(row?.career_fastest_laps || 0),
		career_points: Number(row?.career_points || 0),
		last_synced_year:
			row?.last_synced_year == null ? null : Number(row.last_synced_year),
	};
}

export async function getDriverCareerStats({
	year,
	refresh,
	revalidateSeconds = DEFAULT_REVALIDATE_SECONDS,
} = {}) {
	const baseUrl = process.env.NEXT_PUBLIC_API_URL;
	if (!baseUrl) return [];

	const currentYear = new Date().getUTCFullYear();
	const yearToUse = Number(year || currentYear);
	const refreshFlag =
		typeof refresh === 'boolean' ? refresh : yearToUse === currentYear;
	const query = new URLSearchParams({
		year: String(yearToUse),
		refresh: refreshFlag ? 'true' : 'false',
	});

	try {
		const response = await fetch(
			`${baseUrl}/standings/drivers/career?${query.toString()}`,
			{
				next: { revalidate: revalidateSeconds },
			}
		);
		if (!response.ok) return [];

		const payload = await response.json();
		if (!payload?.success || !Array.isArray(payload?.data)) return [];
		return payload.data.map(normalizeCareerRow);
	} catch {
		return [];
	}
}

export function buildDriverCareerMap(rows) {
	const byCode = new Map();
	for (const row of Array.isArray(rows) ? rows : []) {
		const normalized = normalizeCareerRow(row);
		if (normalized.driver_code) {
			byCode.set(normalized.driver_code, normalized);
		}
	}
	return byCode;
}
