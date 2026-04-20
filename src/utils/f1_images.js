export const getDriverImage = (driverAbbr) => {
	if (!driverAbbr) return null;
	const up = driverAbbr.toUpperCase().substring(0, 3);
	return `/images/drivers/${up}.png`;
};

export const getCarImage = (teamName) => {
	if (!teamName) return null;
	const low = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
	
	if (low.includes('ferrari')) return '/images/cars/2026ferraricarright.png';
	if (low.includes('mercedes')) return '/images/cars/2026mercedescarright.png';
	if (low.includes('mclaren')) return '/images/cars/2026mclarencarright.png';
	if (low.includes('redbull')) return '/images/cars/2026redbullracingcarright.png';
	if (low.includes('aston')) return '/images/cars/2026astonmartincarright.png';
	if (low.includes('alpine')) return '/images/cars/2026alpinecarright.png';
	if (low.includes('williams')) return '/images/cars/2026williamscarright.png';
	if (low.includes('visa') || low.includes('racingbulls') || low.includes('alphatauri') || low.includes('rbf1team') || low === 'rb' || low === 'vcarb') return '/images/cars/2026racingbullscarright.png';
	if (low.includes('haas')) return '/images/cars/2026haasf1teamcarright.png';
	if (low.includes('audi') || low.includes('kick') || low.includes('sauber') || low.includes('alfa')) return '/images/cars/2026audicarright.png';
	if (low.includes('cadillac')) return '/images/cars/2026cadillaccarright.png';
	
	// fallback if team not found, although these cover 2024-2026 grid!
	return null;
};
