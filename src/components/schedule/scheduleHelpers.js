const COUNTRY_CODE_MAP = {
	australia: 'aus',
	bahrain: 'bhr',
	belgium: 'bel',
	canada: 'can',
	china: 'chn',
	austria: 'aut',
	france: 'fra',
	germany: 'ger',
	hungary: 'hun',
	italy: 'ita',
	japan: 'jpn',
	mexico: 'mex',
	'mexico city': 'mex',
	monaco: 'mon',
	netherlands: 'ned',
	qatar: 'qat',
	russia: 'rus',
	saudi: 'sau',
	'saudi arabia': 'sau',
	singapore: 'sgp',
	spain: 'esp',
	uae: 'uae',
	'united arab emirates': 'uae',
	'abu dhabi': 'uae',
	'great britain': 'gbr',
	unitedkingdom: 'gbr',
	'united kingdom': 'gbr',
	uk: 'gbr',
	usa: 'usa',
	us: 'usa',
	'united states': 'usa',
	brazil: 'bra',
	azerbaijan: 'aze',
};

const TEAM_CODE_MAP = {
	mercedes: 'mer',
	'mercedes amg petronas': 'mer',
	'mercedes-amg petronas': 'mer',
	'petronas mercedes': 'mer',
	ferrari: 'fer',
	'scuderia ferrari': 'fer',
	'red bull': 'rbr',
	'red bull racing': 'rbr',
	'oracle red bull racing': 'rbr',
	mclaren: 'mcl',
	'mclaren f1 team': 'mcl',
	haas: 'haas',
	'haas f1 team': 'haas',
	'aston martin': 'ast',
	'aston martin aramco': 'ast',
	'aston martin aramco f1 team': 'ast',
	williams: 'wil',
	'williams racing': 'wil',
	'racing bulls': 'rb',
	'racing bulls f1 team': 'rb',
	'visa cash app rb': 'rb',
	'visa cash app rb f1 team': 'rb',
	'visa cash app racing bulls': 'rb',
	'visa cash app racing bulls f1 team': 'rb',
	vcarb: 'rb',
	'rb f1 team': 'rb',
	'alpha tauri': 'rb',
	alphatauri: 'rb',
	audi: 'aud',
	'audi f1': 'aud',
	cadillac: 'cad',
	'cadillac f1': 'cad',
	alpine: 'alp',
	'btwt alpine f1 team': 'alp',
	'bwt alpine f1 team': 'alp',
	renault: 'alp',
	sauber: 'sau',
	'kick sauber': 'sau',
	'stake f1 team kick sauber': 'sau',
	'alfa romeo': 'sau',
};

export function getCountryCode(country) {
	if (!country) return null;
	const normalized = String(country).trim().toLowerCase();
	if (COUNTRY_CODE_MAP[normalized]) return COUNTRY_CODE_MAP[normalized];
	const compact = normalized.replace(/\s+/g, '');
	if (COUNTRY_CODE_MAP[compact]) return COUNTRY_CODE_MAP[compact];
	return normalized.slice(0, 3);
}

export function getTrackImagePath(race) {
	const name = (race?.event || race?.race_name || '').trim();
	if (!name) return null;

	const firstTokenRaw = name.split(/\s+/)[0].toLowerCase();
	let token = firstTokenRaw.replace(/[^\p{L}\p{N}]/gu, '');
	if (!token) return null;

	// The circuit asset for Sao Paulo is stored as "são.png".
	if (token === 'sao' || token === 'saopaulo') token = 'são';

	return `/images/circuits/${token}.png`;
}

export function getDriverImagePath(driverCode) {
	if (!driverCode) return null;
	return `/images/drivers/${String(driverCode).toUpperCase()}.png`;
}

export function getTeamCode(teamName) {
	if (!teamName) return null;
	const normalized = String(teamName)
		.trim()
		.toLowerCase()
		.replace(/[&]/g, 'and')
		.replace(/[^a-z0-9\s-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (!normalized) return null;
	if (TEAM_CODE_MAP[normalized]) return TEAM_CODE_MAP[normalized];

	for (const [alias, code] of Object.entries(TEAM_CODE_MAP)) {
		if (normalized.includes(alias)) return code;
	}

	return null;
}

export function getTeamLogoPath(teamName) {
	const code = getTeamCode(teamName);
	if (!code) return null;
	return `/images/teams/${code}.png`;
}

export function parseRaceDateTime(dateValue, timeValue) {
	const candidates = [];

	if (dateValue) candidates.push(String(dateValue));
	if (timeValue && String(timeValue).includes('T'))
		candidates.push(String(timeValue));

	if (dateValue && timeValue && !String(timeValue).includes('T')) {
		const datePart =
			String(dateValue).includes('T') ?
				String(dateValue).split('T')[0]
			:	String(dateValue);
		const rawTime =
			String(timeValue).startsWith('T') ?
				String(timeValue).slice(1)
			:	String(timeValue);
		candidates.push(`${datePart}T${rawTime}`);
		if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(rawTime)) {
			candidates.push(`${datePart}T${rawTime}Z`);
		}
	}

	for (const candidate of candidates) {
		const parsed = new Date(candidate);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	return null;
}
