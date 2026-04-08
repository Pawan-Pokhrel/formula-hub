import { getDriverImagePath } from '@/components/schedule/scheduleHelpers';

const DRIVER_IMAGE_2026_MAP = {
	ALB: '/images/drivers/2026williamsalealb01right.png',
	ALO: '/images/drivers/2026astonmartinferalo01right.png',
	ANT: '/images/drivers/2026mercedesandant01right.png',
	BEA: '/images/drivers/2026haasf1teamolibea01right.png',
	BOR: '/images/drivers/2026audigabbor01right.png',
	BOT: '/images/drivers/2026cadillacvalbot01right.png',
	COL: '/images/drivers/2026alpinefracol01right.png',
	GAS: '/images/drivers/2026alpinepiegas01right.png',
	HAD: '/images/drivers/2026redbullracingisahad01right.png',
	HAM: '/images/drivers/2026ferrarilewham01right.png',
	HUL: '/images/drivers/2026audinichul01right.png',
	LAW: '/images/drivers/2026racingbullslialaw01right.png',
	LEC: '/images/drivers/2026ferrarichalec01right.png',
	LIN: '/images/drivers/2026racingbullsarvlin01right.png',
	NOR: '/images/drivers/2026mclarenlannor01right.png',
	OCO: '/images/drivers/2026haasf1teamestoco01right.png',
	PER: '/images/drivers/2026cadillacserper01right.png',
	PIA: '/images/drivers/2026mclarenoscpia01right.png',
	RUS: '/images/drivers/2026mercedesgeorus01right.png',
	SAI: '/images/drivers/2026williamscarsai01right.png',
	STR: '/images/drivers/2026astonmartinlanstr01right.png',
	VER: '/images/drivers/2026redbullracingmaxver01right.png',
};

function _normalizeRaw(value) {
	return String(value || '').trim();
}

const RETIRED_PATTERN = /\b(dnf|dns|dsq|ret|retired|disqualified)\b/i;

const RACE_POINTS_BY_POSITION = {
	1: 25,
	2: 18,
	3: 15,
	4: 12,
	5: 10,
	6: 8,
	7: 6,
	8: 4,
	9: 2,
	10: 1,
};

function _formatSeconds(secondsStr) {
	const sec = Number(secondsStr);
	if (!Number.isFinite(sec)) return null;
	return `${sec.toFixed(3)} s`;
}

export function getTelemetryDriverImage(driverCode, seasonYear) {
	const code = String(driverCode || '').toUpperCase();
	if (!code) return null;
	const parsedYear = Number(seasonYear);
	const use2026Pack = Number.isFinite(parsedYear) && parsedYear === 2026;
	if (use2026Pack) {
		return DRIVER_IMAGE_2026_MAP[code] || getDriverImagePath(code);
	}
	return getDriverImagePath(code);
}

export function isRetiredStatus(value) {
	const raw = _normalizeRaw(value);
	if (!raw) return false;
	return RETIRED_PATTERN.test(raw);
}

export function normalizeRetiredStatus(value) {
	const raw = _normalizeRaw(value);
	if (!raw) return 'RETIRED';
	const normalized = raw.toUpperCase();
	if (normalized.includes('DISQUALIFIED')) return 'DSQ';
	if (normalized.includes('RETIRED')) return 'RETIRED';
	if (normalized.includes('RET')) return 'RET';
	if (normalized.includes('DNF')) return 'DNF';
	if (normalized.includes('DNS')) return 'DNS';
	if (normalized.includes('DSQ')) return 'DSQ';
	return normalized;
}

export function getRacePointsByPosition(position) {
	const pos = Number(position);
	if (!Number.isInteger(pos)) return 0;
	return RACE_POINTS_BY_POSITION[pos] || 0;
}

export function toTeamTint(colorHex, alpha = 0.2) {
	const raw = _normalizeRaw(colorHex).replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
		return `rgba(255, 255, 255, ${alpha})`;
	}
	const r = parseInt(raw.slice(0, 2), 16);
	const g = parseInt(raw.slice(2, 4), 16);
	const b = parseInt(raw.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function _normalizeHexColor(colorHex) {
	const raw = _normalizeRaw(colorHex);
	if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
	return '#6B7280';
}

export function getTeamCardBackground(colorHex) {
	const teamHex = _normalizeHexColor(colorHex);
	return `linear-gradient(120deg, ${teamHex}CC 0%, ${teamHex}B8 58%, rgba(8,8,10,0.92) 100%)`;
}

export function getTelemetryCardTexturePattern() {
	return 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.20) 1px, transparent 1.3px), linear-gradient(110deg, rgba(255,255,255,0.08) 0%, transparent 28%, transparent 72%, rgba(255,255,255,0.08) 100%), repeating-linear-gradient(100deg, transparent 0px, transparent 18px, rgba(255,255,255,0.07) 18px, rgba(255,255,255,0.07) 21px, transparent 21px, transparent 62px)';
}

export function getTelemetryMetric(row, sessionType = 'race') {
	const statusRaw = row?.time || row?.status;
	const retired = isRetiredStatus(statusRaw);
	if (retired) {
		return {
			retired: true,
			primaryLabel: 'Status',
			primaryValue: normalizeRetiredStatus(statusRaw),
			secondaryLabel: null,
			secondaryValue: null,
		};
	}

	const normalizedType = String(sessionType || 'race').toLowerCase();

	if (normalizedType === 'practice') {
		return {
			retired: false,
			primaryLabel: 'Fastest Lap',
			primaryValue: row?.best_lap || row?.time || '-',
			secondaryLabel: 'Gap To Leader',
			secondaryValue: formatGapToLeader(row?.gap_to_best || row?.time),
		};
	}

	if (normalizedType === 'qualifying') {
		const fastest =
			row?.q3 || row?.q2 || row?.q1 || row?.best_lap || row?.time || '-';
		return {
			retired: false,
			primaryLabel: 'Fastest Lap',
			primaryValue: fastest,
			secondaryLabel: 'Gap To Pole',
			secondaryValue: formatGapToLeader(row?.gap_to_pole || row?.time),
		};
	}

	if (Number(row?.position) === 1) {
		return {
			retired: false,
			primaryLabel: 'Race Time',
			primaryValue: formatLeaderDuration(statusRaw),
			secondaryLabel: null,
			secondaryValue: null,
		};
	}

	return {
		retired: false,
		primaryLabel: 'Gap To Leader',
		primaryValue: formatGapToLeader(
			statusRaw || row?.gap_to_best || row?.gap_to_pole
		),
		secondaryLabel: null,
		secondaryValue: null,
	};
}

export function formatLeaderDuration(rawTime) {
	const raw = _normalizeRaw(rawTime);
	if (!raw) return 'Race time unavailable';

	if (raw.startsWith('+') || /lap/i.test(raw)) return raw;

	const hms = raw.match(/^(\d+):(\d{1,2}):(\d{2}(?:\.\d+)?)$/);
	if (hms) {
		const hours = Number(hms[1]);
		const minutes = Number(hms[2]);
		const secText = _formatSeconds(hms[3]) || `${hms[3]}s`;
		return `${hours}h ${minutes}m ${secText}`;
	}

	const ms = raw.match(/^(\d+):(\d{2}(?:\.\d+)?)$/);
	if (ms) {
		const totalMinutes = Number(ms[1]);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		const secText = _formatSeconds(ms[2]) || `${ms[2]}s`;
		return `${hours}h ${minutes}m ${secText}`;
	}

	return raw;
}

export function formatGapToLeader(rawGap) {
	const raw = _normalizeRaw(rawGap);
	if (!raw) return '-';

	if (/dns|dnf|dsq|retired/i.test(raw)) return raw.toUpperCase();

	const lapGap = raw.match(/\+?\s*(\d+)\s*lap(s)?/i);
	if (lapGap) {
		const laps = Number(lapGap[1]);
		return `+${laps} ${laps === 1 ? 'lap' : 'laps'}`;
	}

	const secOnly = raw.match(/^\+?\s*(\d+(?:\.\d+)?)$/);
	if (secOnly) {
		return `+${Number(secOnly[1]).toFixed(3)} s`;
	}

	const secWithSuffix = raw.match(/^\+?\s*(\d+(?:\.\d+)?)\s*s$/i);
	if (secWithSuffix) {
		return `+${Number(secWithSuffix[1]).toFixed(3)} s`;
	}

	if (raw.startsWith('+')) return raw;
	return `+${raw}`;
}
