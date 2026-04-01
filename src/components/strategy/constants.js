export const COMPOUND_COLORS = {
	SOFT: '#FF3333',
	MEDIUM: '#FFC906',
	HARD: '#CCCCCC',
	INTERMEDIATE: '#39B54A',
	WET: '#0072C6',
	UNKNOWN: '#666666',
};

export const COMPOUND_SHORT = {
	SOFT: 'S',
	MEDIUM: 'M',
	HARD: 'H',
	INTERMEDIATE: 'I',
	WET: 'W',
	UNKNOWN: '?',
};

export const URGENCY_CONFIG = {
	PIT_NOW: {
		bg: 'from-red-600/30 to-red-900/30',
		border: 'border-red-500/60',
		text: 'text-red-400',
		pulse: true,
	},
	PIT_WINDOW: {
		bg: 'from-amber-600/25 to-amber-900/25',
		border: 'border-amber-500/50',
		text: 'text-amber-400',
		pulse: false,
	},
	STAY_OUT: {
		bg: 'from-emerald-600/20 to-emerald-900/20',
		border: 'border-emerald-500/40',
		text: 'text-emerald-400',
		pulse: false,
	},
};
