export const getCountryFlag = (name) => {
	if (!name) return '';
	const lower = name.toLowerCase();
	
	if (lower.includes('bahrain')) return '🇧🇭';
	if (lower.includes('saudi')) return '🇸🇦';
	if (lower.includes('australia')) return '🇦🇺';
	if (lower.includes('japan')) return '🇯🇵';
	if (lower.includes('china') || lower.includes('chinese')) return '🇨🇳';
	if (lower.includes('miami')) return '🇺🇸';
	if (lower.includes('emilia') || lower.includes('imola')) return '🇮🇹';
	if (lower.includes('monaco')) return '🇲🇨';
	if (lower.includes('canada') || lower.includes('montreal')) return '🇨🇦';
	if (lower.includes('spain') || lower.includes('spanish')) return '🇪🇸';
	if (lower.includes('austria')) return '🇦🇹';
	if (lower.includes('britain') || lower.includes('british') || lower.includes('silverstone')) return '🇬🇧';
	if (lower.includes('hungar')) return '🇭🇺';
	if (lower.includes('belgium') || lower.includes('belgian')) return '🇧🇪';
	if (lower.includes('netherlands') || lower.includes('dutch')) return '🇳🇱';
	if (lower.includes('italy') || lower.includes('italian') || lower.includes('monza')) return '🇮🇹';
	if (lower.includes('azerbaijan') || lower.includes('baku')) return '🇦🇿';
	if (lower.includes('singapore')) return '🇸🇬';
	if (lower.includes('austin') || lower.includes('united states') || lower.includes('usa')) return '🇺🇸';
	if (lower.includes('mexico')) return '🇲🇽';
	if (lower.includes('brazil') || lower.includes('são paulo')) return '🇧🇷';
	if (lower.includes('las vegas')) return '🇺🇸';
	if (lower.includes('qatar')) return '🇶🇦';
	if (lower.includes('abu dhabi')) return '🇦🇪';
	
	// Fallback mappings for old races
	if (lower.includes('france') || lower.includes('french')) return '🇫🇷';
	if (lower.includes('germany') || lower.includes('german')) return '🇩🇪';
	if (lower.includes('malaysia')) return '🇲🇾';
	if (lower.includes('korea')) return '🇰🇷';
	if (lower.includes('india')) return '🇮🇳';
	if (lower.includes('russia')) return '🇷🇺';
	if (lower.includes('turkey')) return '🇹🇷';
	
	return '🏁';
};
