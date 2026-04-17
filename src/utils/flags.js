import React from 'react';
import SafeImage from '@/components/common/SafeImage';

export const getCountryCode = (name) => {
	if (!name) return null;
	const lower = name.toLowerCase();
	
	if (lower.includes('bahrain')) return 'bh';
	if (lower.includes('saudi')) return 'sa';
	if (lower.includes('australia')) return 'au';
	if (lower.includes('japan')) return 'jp';
	if (lower.includes('china') || lower.includes('chinese')) return 'cn';
	if (lower.includes('miami')) return 'us';
	if (lower.includes('emilia') || lower.includes('imola')) return 'it';
	if (lower.includes('monaco')) return 'mc';
	if (lower.includes('canada') || lower.includes('montreal')) return 'ca';
	if (lower.includes('spain') || lower.includes('spanish')) return 'es';
	if (lower.includes('austria')) return 'at';
	if (lower.includes('britain') || lower.includes('british') || lower.includes('silverstone')) return 'gb';
	if (lower.includes('hungar')) return 'hu';
	if (lower.includes('belgium') || lower.includes('belgian')) return 'be';
	if (lower.includes('netherlands') || lower.includes('dutch') || lower.includes('zandvoort')) return 'nl';
	if (lower.includes('italy') || lower.includes('italian') || lower.includes('monza')) return 'it';
	if (lower.includes('azerbaijan') || lower.includes('baku')) return 'az';
	if (lower.includes('singapore')) return 'sg';
	if (lower.includes('austin') || lower.includes('united states') || lower.includes('usa')) return 'us';
	if (lower.includes('mexico')) return 'mx';
	if (lower.includes('brazil') || lower.includes('são paulo')) return 'br';
	if (lower.includes('las vegas')) return 'us';
	if (lower.includes('qatar')) return 'qa';
	if (lower.includes('abu dhabi') || lower.includes('uae')) return 'ae';
	
	// Fallback mappings for old races
	if (lower.includes('france') || lower.includes('french')) return 'fr';
	if (lower.includes('germany') || lower.includes('german')) return 'de';
	if (lower.includes('malaysia')) return 'my';
	if (lower.includes('korea')) return 'kr';
	if (lower.includes('india')) return 'in';
	if (lower.includes('russia')) return 'ru';
	if (lower.includes('turkey')) return 'tr';
	if (lower.includes('portugal')) return 'pt';
	
	return null;
};

export const getCountryFlag = (name) => {
	const code = getCountryCode(name);
	if (code) {
		return (
			<SafeImage
				src={`https://flagcdn.com/w40/${code}.png`}
				unoptimized
				width={20}
				height={14}
				alt={`${name} flag`}
				className="w-5 h-[14px] rounded-[2px] object-cover border border-white/20 shadow-sm"
			/>
		);
	}
	return <span className="text-sm grayscale opacity-50">🏁</span>;
};
