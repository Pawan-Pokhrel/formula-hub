export function formatLap(sec) {
	if (!sec || sec <= 0) return '--:--.---';
	const m = Math.floor(sec / 60);
	const s = (sec % 60).toFixed(3);
	return `${m}:${s.padStart(6, '0')}`;
}

export function formatGap(sec) {
	if (sec === null || sec === undefined || sec === 0) return '\u2014';
	if (sec > 60) return '+1 LAP';
	return `+${sec.toFixed(1)}s`;
}
