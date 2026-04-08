'use client';

import {
	getSessionData,
	getYearSchedule,
	toggleTrackFavorite,
} from '@/lib/api/trackApi';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	FaCalendarAlt,
	FaChevronLeft,
	FaCloudRain,
	FaCrown,
	FaExchangeAlt,
	FaExclamationTriangle,
	FaFastBackward,
	FaFastForward,
	FaFlag,
	FaFlagCheckered,
	FaMapMarkerAlt,
	FaPause,
	FaPlay,
	FaRedo,
	FaSkullCrossbones,
	FaStar,
	FaStepBackward,
	FaStepForward,
	FaSun,
	FaTachometerAlt,
	FaTimes,
	FaTint,
	FaTrophy,
	FaWind,
	FaWrench,
} from 'react-icons/fa';

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

/** Format seconds → "MM:SS" */
function formatTime(sec) {
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format lap time seconds → "M:SS.sss" */
function formatLapTime(sec) {
	if (sec == null || sec <= 0) return '—';
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

/** Get best lap time for a driver up to a given lap */
function getBestLapTime(lapTimes, abbr, upToLap) {
	if (!lapTimes?.[abbr]) return null;
	let best = Infinity;
	for (let l = 1; l <= upToLap; l++) {
		const t = lapTimes[abbr][String(l)];
		if (t != null && t < best) best = t;
	}
	return best === Infinity ? null : best;
}

/** Get the last lap time for a driver */
function getLastLapTime(lapTimes, abbr, currentLap) {
	if (!lapTimes?.[abbr]) return null;
	// Try current lap first, then previous
	for (let l = currentLap; l >= Math.max(1, currentLap - 1); l--) {
		const t = lapTimes[abbr][String(l)];
		if (t != null) return t;
	}
	return null;
}

/**
 * Compute the gap between a driver and the driver ahead in the race order.
 * Uses cumulative lap times to approximate gaps.
 */
function computeGapToAhead(lapTimes, board, driverIdx, currentLap) {
	if (!lapTimes || driverIdx <= 0 || !board) return null;
	const driver = board[driverIdx];
	const ahead = board[driverIdx - 1];
	if (!driver || !ahead || !driver.active || !ahead.active) return null;

	const driverTimes = lapTimes[driver.abbr];
	const aheadTimes = lapTimes[ahead.abbr];
	if (!driverTimes || !aheadTimes) return null;

	// Sum lap times up to current lap for both drivers
	let driverTotal = 0,
		aheadTotal = 0;
	let validLaps = 0;
	for (let l = 1; l <= currentLap; l++) {
		const dt = driverTimes[String(l)];
		const at = aheadTimes[String(l)];
		if (dt != null && at != null) {
			driverTotal += dt;
			aheadTotal += at;
			validLaps++;
		}
	}
	if (validLaps === 0) return null;
	const gap = driverTotal - aheadTotal;
	return gap;
}

/**
 * Pre-compute race insights/events for the entire race.
 * Returns an array of events sorted by time.
 */
function precomputeRaceInsights(data) {
	const events = [];
	const {
		drivers,
		race_positions,
		lap_times,
		fastest_lap,
		pit_stops,
		flags,
		info,
		lap_starts,
	} = data;
	const totalLaps = info?.total_laps ?? 0;

	// 1. Formation lap / Race start
	events.push({
		type: 'race_start',
		lap: 0,
		time_sec: 0,
		icon: 'flag',
		color: 'green',
		title: 'LIGHTS OUT',
		detail: 'Race Start — Formation lap complete',
	});

	// 2. Overtakes — detect position changes between laps
	if (race_positions) {
		const abbrs = Object.keys(race_positions);
		for (let lap = 2; lap <= totalLaps; lap++) {
			for (const abbr of abbrs) {
				const prevPos = race_positions[abbr]?.[String(lap - 1)];
				const currPos = race_positions[abbr]?.[String(lap)];
				if (prevPos != null && currPos != null && currPos < prevPos) {
					// Driver gained positions — who did they overtake?
					const overtaken = abbrs.filter((other) => {
						const otherPrev = race_positions[other]?.[String(lap - 1)];
						const otherCurr = race_positions[other]?.[String(lap)];
						return (
							otherPrev != null &&
							otherCurr != null &&
							otherCurr > otherPrev &&
							otherPrev < prevPos &&
							otherCurr >= currPos
						);
					});
					const posGain = prevPos - currPos;
					const t = lap_starts?.[lap] ?? lap * 90;
					events.push({
						type: 'overtake',
						lap,
						time_sec: t,
						icon: 'exchange',
						color: drivers[abbr]?.color || '#fff',
						title: `${abbr} OVERTAKE`,
						detail: `P${prevPos} → P${currPos}${overtaken.length ? ` (passed ${overtaken.join(', ')})` : ''}`,
						abbr,
					});
				}
			}
		}
	}

	// 3. Fastest laps — per-lap fastest
	if (lap_times) {
		const abbrs = Object.keys(lap_times);
		let overallBest = Infinity;
		let overallBestAbbr = null;
		for (let lap = 1; lap <= totalLaps; lap++) {
			let lapBestTime = Infinity;
			let lapBestAbbr = null;
			for (const abbr of abbrs) {
				const t = lap_times[abbr]?.[String(lap)];
				if (t != null && t < lapBestTime) {
					lapBestTime = t;
					lapBestAbbr = abbr;
				}
			}
			if (lapBestAbbr && lapBestTime < overallBest) {
				overallBest = lapBestTime;
				overallBestAbbr = lapBestAbbr;
				const tSec = lap_starts?.[lap] ?? lap * 90;
				events.push({
					type: 'fastest_lap',
					lap,
					time_sec: tSec,
					icon: 'tachometer',
					color: '#a855f7',
					title: `${lapBestAbbr} FASTEST LAP`,
					detail: `${formatLapTime(lapBestTime)} on Lap ${lap}`,
					abbr: lapBestAbbr,
				});
			}
		}
	}

	// 4. Pit stops
	if (pit_stops) {
		for (const ps of pit_stops) {
			events.push({
				type: 'pit_stop',
				lap: ps.lap,
				time_sec: ps.time_sec,
				icon: 'wrench',
				color: '#f59e0b',
				title: `${ps.abbr} PIT STOP`,
				detail: `Lap ${ps.lap}${ps.duration_sec ? ` — ${ps.duration_sec.toFixed(1)}s` : ''}`,
				abbr: ps.abbr,
			});
		}
	}

	// 5. SC / VSC / Red flags from flag events
	if (flags) {
		for (const f of flags) {
			if (['SC', 'VSC', 'Red'].includes(f.type)) {
				const lap = getCurrentLap(lap_starts || [], f.start_sec);
				const labelMap = {
					SC: 'SAFETY CAR',
					VSC: 'VIRTUAL SAFETY CAR',
					Red: 'RED FLAG',
				};
				const colorMap = { SC: '#fbbf24', VSC: '#f59e0b', Red: '#ef4444' };
				events.push({
					type: 'hazard',
					lap,
					time_sec: f.start_sec,
					icon: f.type === 'Red' ? 'times' : 'exclamation',
					color: colorMap[f.type] || '#fbbf24',
					title: labelMap[f.type] || f.type,
					detail: f.message || `Lap ${lap}`,
				});
			}
		}
	}

	// 6. DNF/DSQ milestones
	for (const [abbr, drvInfo] of Object.entries(drivers)) {
		if (drvInfo.status === 'DNF' || drvInfo.status === 'DSQ') {
			const t = drvInfo.retired_at_sec ?? 0;
			const lap = drvInfo.laps_completed ?? getCurrentLap(lap_starts || [], t);
			events.push({
				type: 'retirement',
				lap,
				time_sec: t,
				icon: 'skull',
				color: '#ef4444',
				title: `${abbr} ${drvInfo.status}`,
				detail: `${drvInfo.status_detail || 'Retired'} — Lap ${lap}`,
				abbr,
			});
		}
	}

	// 7. Major race milestones
	if (totalLaps > 0) {
		// Pit window (usually lap ~15-20 for a standard race)
		const pitWindowLap = Math.max(8, Math.round(totalLaps * 0.25));
		const pitWindowT = lap_starts?.[pitWindowLap] ?? pitWindowLap * 90;
		events.push({
			type: 'milestone',
			lap: pitWindowLap,
			time_sec: pitWindowT,
			icon: 'wrench',
			color: '#64748b',
			title: 'PIT WINDOW OPENS',
			detail: `Typical first stop window — Lap ${pitWindowLap}`,
		});

		// Half distance
		const halfLap = Math.floor(totalLaps / 2);
		if (halfLap > 0) {
			const halfT = lap_starts?.[halfLap] ?? halfLap * 90;
			events.push({
				type: 'milestone',
				lap: halfLap,
				time_sec: halfT,
				icon: 'flag',
				color: '#64748b',
				title: 'HALF DISTANCE',
				detail: `Lap ${halfLap} of ${totalLaps}`,
			});
		}

		// 10 laps to go
		const tenToGo = totalLaps - 10;
		if (tenToGo > 0) {
			const tenT = lap_starts?.[tenToGo] ?? tenToGo * 90;
			events.push({
				type: 'milestone',
				lap: tenToGo,
				time_sec: tenT,
				icon: 'flag',
				color: '#f97316',
				title: '10 LAPS TO GO',
				detail: `Lap ${tenToGo} — Sprint to the finish`,
			});
		}

		// 5 laps to go
		const fiveToGo = totalLaps - 5;
		if (fiveToGo > 0) {
			const fiveT = lap_starts?.[fiveToGo] ?? fiveToGo * 90;
			events.push({
				type: 'milestone',
				lap: fiveToGo,
				time_sec: fiveT,
				icon: 'flag',
				color: '#ef4444',
				title: '5 LAPS TO GO',
				detail: `Lap ${fiveToGo} — Final stint`,
			});
		}

		// Last lap
		const lastLapT = lap_starts?.[totalLaps] ?? totalLaps * 90;
		events.push({
			type: 'milestone',
			lap: totalLaps,
			time_sec: lastLapT,
			icon: 'checkered',
			color: '#22c55e',
			title: 'FINAL LAP',
			detail: `Lap ${totalLaps} — Last lap of the race`,
		});
	}

	// Sort by time
	events.sort((a, b) => a.time_sec - b.time_sec);
	return events;
}

/** Binary-search the lap_starts array for the current lap number. */
function getCurrentLap(lapStarts, timeSec) {
	if (!lapStarts || lapStarts.length === 0) return 0;
	let lo = 0,
		hi = lapStarts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (lapStarts[mid] <= timeSec) lo = mid;
		else hi = mid - 1;
	}
	return Math.max(1, lo);
}

/** Year range for the selector */
const YEAR_OPTIONS = [];
for (let y = new Date().getFullYear(); y >= 2018; y--) YEAR_OPTIONS.push(y);

/** Inline flag image component using actual PNG flags */
function CountryFlag({ country, size = 20, className = '' }) {
	const code = getCountryCode(country);

	if (country == 'United Kingdom')
		return (
			<Image
				src={`/images/flags/gbr.png`}
				alt={country || 'flag'}
				width={size}
				height={Math.round(size * 0.67)}
				className={`inline-block rounded-[3px] object-cover ${className}`}
				style={{ width: size, height: Math.round(size * 0.67) }}
				unoptimized
			/>
		);

	if (!code)
		return (
			<FaFlagCheckered
				className={`text-gray-500 ${className}`}
				style={{ width: size, height: size }}
			/>
		);

	return (
		<Image
			src={`/images/flags/${code}.png`}
			alt={country || 'flag'}
			width={size}
			height={Math.round(size * 0.67)}
			className={`inline-block rounded-[3px] object-cover ${className}`}
			style={{ width: size, height: Math.round(size * 0.67) }}
			unoptimized
		/>
	);
}

/** Country name → short code for flag PNG filenames (e.g., aus.png, uae.png) */
const COUNTRY_CODES = {
	Australia: 'aus',
	Bahrain: 'bhr',
	'Saudi Arabia': 'sau',
	Japan: 'jpn',
	China: 'chn',
	USA: 'usa',
	'United States': 'usa',
	Italy: 'ita',
	Monaco: 'mon',
	Canada: 'can',
	Spain: 'esp',
	Austria: 'aut',
	'Great Britain': 'gbr',
	UK: 'gbr',
	Hungary: 'hun',
	Belgium: 'bel',
	Netherlands: 'ned',
	Singapore: 'sgp',
	Mexico: 'mex',
	Brazil: 'bra',
	'United Arab Emirates': 'uae',
	UAE: 'uae',
	'Abu Dhabi': 'uae',
	Azerbaijan: 'aze',
	France: 'fra',
	Germany: 'ger',
	Portugal: 'por',
	Russia: 'rus',
	Turkey: 'tur',
	Qatar: 'qat',
	'Las Vegas': 'usa',
	Miami: 'usa',
};
function getCountryCode(country) {
	if (!country) return null;
	if (COUNTRY_CODES[country]) return COUNTRY_CODES[country];
	for (const [k, v] of Object.entries(COUNTRY_CODES)) {
		if (
			country.toLowerCase().includes(k.toLowerCase()) ||
			k.toLowerCase().includes(country.toLowerCase())
		)
			return v;
	}
	return null;
}

/* ================================================================== */
/*  Track-position computation (precomputed once on data load)         */
/* ================================================================== */

/** Cumulative arc-length [0…1] along the track outline. */
function buildTrackArcLength(trackX, trackY) {
	const n = trackX.length;
	const cum = new Float32Array(n);
	for (let i = 1; i < n; i++) {
		const dx = trackX[i] - trackX[i - 1];
		const dy = trackY[i] - trackY[i - 1];
		cum[i] = cum[i - 1] + Math.sqrt(dx * dx + dy * dy);
	}
	const total = cum[n - 1] || 1;
	for (let i = 0; i < n; i++) cum[i] /= total;
	return cum;
}

/** Nearest-point track parameter (0–1) with strided search. */
function getTrackParameter(px, py, trackX, trackY, arcLen, stride = 3) {
	let minDist = Infinity;
	let best = 0;
	for (let i = 0; i < trackX.length; i += stride) {
		const dx = px - trackX[i];
		const dy = py - trackY[i];
		const d = dx * dx + dy * dy;
		if (d < minDist) {
			minDist = d;
			best = arcLen[i];
		}
	}
	return best;
}

/**
 * Pre-compute race-position boards at every 1 Hz sample.
 *
 * PRIMARY: uses `data.race_positions` from the backend (FastF1's actual
 *          Position column per lap) for an authoritative leaderboard.
 * FALLBACK: heuristic laps + track-parameter scoring.
 *
 * Returns boards[sampleIdx] = [{abbr, position, laps, active, status}, …]
 */
function precomputeRacePositions(data) {
	const { track, drivers, positions, info, lap_starts } = data;
	const rp = data.race_positions; // { abbr: { "1": pos, "2": pos, … } }
	const trackX = track.x;
	const trackY = track.y;

	const maxSamples = Math.max(
		...Object.values(positions).map((p) => p.x?.length || 0),
		1
	);
	const driverCount = Object.keys(drivers).length;

	// Pre-compute retirement sample index for DNF/DSQ drivers
	const retiredAtSample = {};
	for (const [abbr, drvInfo] of Object.entries(drivers)) {
		if (drvInfo.retired_at_sec != null) {
			retiredAtSample[abbr] = Math.floor(
				drvInfo.retired_at_sec * (info.sample_rate || 1)
			);
		}
	}

	// Helper: determine which lap we're on from lap_starts
	const getLap = (timeSec) => {
		if (!lap_starts || lap_starts.length === 0) return 1;
		let lo = 0,
			hi = lap_starts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (lap_starts[mid] <= timeSec) lo = mid;
			else hi = mid - 1;
		}
		return Math.max(1, lo);
	};

	const boards = new Array(maxSamples);

	for (let s = 0; s < maxSamples; s++) {
		const board = [];
		const timeSec = s / (info.sample_rate || 1);
		const currentLap = getLap(timeSec);

		for (const abbr of Object.keys(drivers)) {
			const drvInfo = drivers[abbr];

			// DNS drivers: always at bottom, inactive
			if (drvInfo.status === 'DNS') {
				board.push({
					abbr,
					laps: 0,
					score: -9999,
					active: false,
					status: 'DNS',
				});
				continue;
			}

			// Check retirement — time-dependent so DNF appears only after the driver actually retires
			const isRetired = abbr in retiredAtSample && s > retiredAtSample[abbr];

			// Determine position from backend race_positions data
			let officialPos = null;
			if (rp && rp[abbr]) {
				// Walk backwards from currentLap to find latest position
				for (let l = currentLap; l >= 1; l--) {
					const p = rp[abbr][String(l)];
					if (p != null) {
						officialPos = p;
						break;
					}
				}
				// If no data yet (before first lap), use grid position
				if (officialPos == null) {
					officialPos = drvInfo.grid_position || driverCount;
				}
			}

			// Once retired, snap to finish_position if available
			if (isRetired && drvInfo.finish_position) {
				officialPos = drvInfo.finish_position;
			}

			const hasPos = positions[abbr]?.x && s < positions[abbr].x.length;

			// Dynamic status: DNF/DSQ only shows AFTER the driver actually retires
			const finalStatus = drvInfo.status || '';
			const isDNFType = finalStatus === 'DNF' || finalStatus === 'DSQ';
			const dynamicStatus =
				isDNFType ?
					isRetired ? finalStatus
					:	'' // still racing → no DNF badge
				:	finalStatus; // 'Finished' or ''

			board.push({
				abbr,
				laps: currentLap,
				score: officialPos != null ? driverCount - officialPos + 1000 : 0,
				active: !isRetired && hasPos,
				status: dynamicStatus,
				officialPos,
			});
		}

		// Sort: active by officialPos (lower = better), inactive at bottom
		board.sort((a, b) => {
			if (!a.active && !b.active) {
				const aFp = drivers[a.abbr]?.finish_position ?? 99;
				const bFp = drivers[b.abbr]?.finish_position ?? 99;
				return aFp - bFp;
			}
			if (!a.active) return 1;
			if (!b.active) return -1;
			// Use officialPos directly for sorting
			const aP = a.officialPos ?? 99;
			const bP = b.officialPos ?? 99;
			return aP - bP;
		});
		board.forEach((e, i) => {
			e.position = i + 1;
		});
		boards[s] = board;
	}
	return boards;
}

/* ================================================================== */
/*  Flag / hazard rendering — F1 broadcast style                       */
/* ================================================================== */

const FLAG_COLORS = {
	Yellow: {
		fill: '#fbbf24',
		border: '#d97706',
		text: '#000',
		label: 'YELLOW',
		glow: 'rgba(251,191,36,0.6)',
	},
	DoubleYellow: {
		fill: '#f59e0b',
		border: '#b45309',
		text: '#000',
		label: 'DBL YELLOW',
		glow: 'rgba(245,158,11,0.65)',
	},
	Red: {
		fill: '#ef4444',
		border: '#b91c1c',
		text: '#fff',
		label: 'RED FLAG',
		glow: 'rgba(239,68,68,0.7)',
	},
	SC: {
		fill: '#fbbf24',
		border: '#d97706',
		text: '#000',
		label: 'SAFETY CAR',
		glow: 'rgba(251,191,36,0.5)',
	},
	VSC: {
		fill: '#fbbf24',
		border: '#d97706',
		text: '#000',
		label: 'VSC',
		glow: 'rgba(251,191,36,0.45)',
	},
};

/** Get active flags at a given time in seconds. */
function getActiveFlags(flags, timeSec) {
	if (!flags || flags.length === 0) return [];
	return flags.filter(
		(f) => timeSec >= f.start_sec && (f.end_sec == null || timeSec <= f.end_sec)
	);
}

/**
 * Draw F1-broadcast-style flag zones on the track.
 * Affected sections get a thick colored overlay that pulses,
 * similar to how Yellow zones appear in official F1 broadcasts.
 */
function drawFlagZones(ctx, w, h, trackX, trackY, activeFlags) {
	if (!activeFlags || activeFlags.length === 0) return;

	const n = trackX.length;
	if (n < 2) return;

	const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);

	for (const flag of activeFlags) {
		const cfg = FLAG_COLORS[flag.type];
		if (!cfg) continue;

		const startFrac = flag.sector_start ?? 0;
		const endFrac = flag.sector_end ?? 1;

		const iStart = Math.max(0, Math.floor(startFrac * (n - 1)));
		const iEnd = Math.min(Math.ceil(endFrac * (n - 1)), n - 1);

		if (iStart >= iEnd) continue;

		ctx.save();

		// 1) Wide glow channel — the F1 "danger zone" highlight
		ctx.beginPath();
		ctx.moveTo(trackX[iStart] * w, (1 - trackY[iStart]) * h);
		for (let i = iStart + 1; i <= iEnd; i++) {
			ctx.lineTo(trackX[i] * w, (1 - trackY[i]) * h);
		}
		ctx.strokeStyle = cfg.glow;
		ctx.lineWidth = 28 * pulse;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.globalAlpha = pulse * 0.7;
		ctx.shadowColor = cfg.fill;
		ctx.shadowBlur = 20;
		ctx.stroke();

		// 2) Solid coloured overlay — narrower, full opacity
		ctx.globalAlpha = 0.85;
		ctx.shadowBlur = 0;
		ctx.strokeStyle = cfg.fill;
		ctx.lineWidth = 16;
		ctx.stroke();

		// 3) Bright core line
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 2;
		ctx.globalAlpha = 0.25 * pulse;
		ctx.stroke();

		ctx.restore();

		// Label pill near the midpoint of the flagged section
		const midIdx = Math.floor((iStart + iEnd) / 2);
		const lx = trackX[midIdx] * w;
		const ly = (1 - trackY[midIdx]) * h;

		ctx.save();
		ctx.font = 'bold 10px Inter, system-ui, sans-serif';
		const labelText = flag.sector ? `${cfg.label}  S${flag.sector}` : cfg.label;
		const tw = ctx.measureText(labelText).width;
		const pillW = tw + 16;
		const pillH = 18;
		const px = lx - pillW / 2;
		const py = ly - 32 - pillH;

		// Pill background
		ctx.fillStyle = cfg.fill;
		ctx.shadowColor = cfg.fill;
		ctx.shadowBlur = 12;
		ctx.beginPath();
		if (ctx.roundRect) ctx.roundRect(px, py, pillW, pillH, 4);
		else ctx.rect(px, py, pillW, pillH);
		ctx.fill();

		// Border
		ctx.shadowBlur = 0;
		ctx.strokeStyle = cfg.border;
		ctx.lineWidth = 1;
		ctx.stroke();

		// Text
		ctx.fillStyle = cfg.text;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(labelText, lx, py + pillH / 2);
		ctx.restore();
	}
}

/**
 * Draw DNF markers on the track where drivers retired.
 * Shows a small X with the driver abbreviation.
 */
function drawDNFMarkers(ctx, w, h, data, timeSec) {
	const { drivers, positions, info } = data;
	const sr = info.sample_rate || 1;

	for (const [abbr, drvInfo] of Object.entries(drivers)) {
		if (drvInfo.status !== 'DNF' && drvInfo.status !== 'DSQ') continue;
		if (drvInfo.retired_at_sec == null) continue;
		// Only show marker after the driver has retired
		if (timeSec < drvInfo.retired_at_sec) continue;

		const pos = positions[abbr];
		if (!pos?.x) continue;

		const idx = Math.min(
			Math.floor(drvInfo.retired_at_sec * sr),
			pos.x.length - 1
		);
		const px = pos.x[idx] * w;
		const py = (1 - pos.y[idx]) * h;
		const color = drvInfo.color || '#ff4444';

		ctx.save();
		ctx.globalAlpha = 0.7;

		// Red X marker
		const sz = 6;
		ctx.strokeStyle = '#ef4444';
		ctx.lineWidth = 2.5;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(px - sz, py - sz);
		ctx.lineTo(px + sz, py + sz);
		ctx.moveTo(px + sz, py - sz);
		ctx.lineTo(px - sz, py + sz);
		ctx.stroke();

		// Small label
		ctx.font = 'bold 8px Inter, system-ui, sans-serif';
		ctx.fillStyle = '#ef4444';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText(abbr, px, py - sz - 3);

		ctx.restore();
	}
}

/* ================================================================== */
/*  Canvas drawing helpers                                              */
/* ================================================================== */

function drawTrack(ctx, w, h, trackX, trackY) {
	if (trackX.length < 2) return;

	ctx.beginPath();
	ctx.moveTo(trackX[0] * w, (1 - trackY[0]) * h);
	for (let i = 1; i < trackX.length; i++)
		ctx.lineTo(trackX[i] * w, (1 - trackY[i]) * h);
	ctx.closePath();

	ctx.strokeStyle = '#1a1a1a';
	ctx.lineWidth = 18;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke();

	ctx.strokeStyle = '#2a2a2a';
	ctx.lineWidth = 14;
	ctx.stroke();

	ctx.strokeStyle = 'rgba(255,255,255,0.06)';
	ctx.lineWidth = 1;
	ctx.setLineDash([6, 8]);
	ctx.stroke();
	ctx.setLineDash([]);

	// Start / finish line
	const sx = trackX[0] * w;
	const sy = (1 - trackY[0]) * h;
	ctx.save();
	ctx.fillStyle = '#dc2626';
	ctx.shadowColor = '#dc2626';
	ctx.shadowBlur = 10;
	ctx.fillRect(sx - 2, sy - 16, 4, 32);
	ctx.restore();
}

function drawDrivers(
	ctx,
	w,
	h,
	data,
	t,
	selectedDriver,
	currentBoard,
	driverImages
) {
	const sr = data.info.sample_rate || 1;
	const drivers = data.drivers;
	const positions = data.positions;

	const posMap = {};
	if (currentBoard) for (const e of currentBoard) posMap[e.abbr] = e;
	const leaderAbbr = currentBoard?.[0]?.abbr;

	const hasSelection = !!selectedDriver;

	const ordered = Object.keys(drivers)
		.slice()
		.sort((a, b) => {
			if (a === selectedDriver) return 1;
			if (b === selectedDriver) return -1;
			if (a === leaderAbbr) return 1;
			if (b === leaderAbbr) return -1;
			return 0;
		});

	for (const abbr of ordered) {
		const info = drivers[abbr];
		const pos = positions[abbr];
		if (!pos?.x || pos.x.length < 2) continue;

		// Skip DNS drivers entirely
		if (info.status === 'DNS') continue;

		const idx = t * sr;
		const i = Math.floor(idx);
		const frac = idx - i;
		if (i >= pos.x.length - 1) continue;

		// Check if this driver has retired
		const isRetired = info.retired_at_sec != null && t > info.retired_at_sec;
		if (isRetired) continue; // DNF drivers hidden after retirement (marked by X)

		const px = (pos.x[i] + (pos.x[i + 1] - pos.x[i]) * frac) * w;
		const py = (1 - (pos.y[i] + (pos.y[i + 1] - pos.y[i]) * frac)) * h;
		const color = info.color || '#ffffff';

		const isLeader = abbr === leaderAbbr;
		const isSelected = abbr === selectedDriver;
		const dimmed = hasSelection && !isSelected;

		const dotR =
			isSelected ? 8
			: isLeader ? 7
			: 5;
		const glowBlur =
			isSelected ? 24
			: isLeader ? 16
			: 10;

		ctx.save();
		ctx.globalAlpha = dimmed ? 0.3 : 1.0;

		// Leader gold outer ring
		if (isLeader) {
			ctx.save();
			ctx.shadowColor = '#fbbf24';
			ctx.shadowBlur = 18;
			ctx.beginPath();
			ctx.arc(px, py, dotR + 4, 0, Math.PI * 2);
			ctx.strokeStyle = '#fbbf24';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();
		}

		// Glow + dot
		ctx.save();
		ctx.shadowColor = color;
		ctx.shadowBlur = glowBlur;
		ctx.beginPath();
		ctx.arc(px, py, dotR, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.restore();

		// White border
		ctx.beginPath();
		ctx.arc(px, py, dotR, 0, Math.PI * 2);
		ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.5)';
		ctx.lineWidth = isSelected ? 2.5 : 1.5;
		ctx.stroke();

		// Selected driver: circular headshot above marker
		let headshotDrawn = false;
		if (isSelected) {
			const img = driverImages?.[abbr];
			if (img?.complete && img.naturalWidth > 0) {
				headshotDrawn = true;
				const imgR = 15;
				const imgCx = px;
				const imgCy = py - dotR - imgR - 8;

				ctx.save();
				ctx.beginPath();
				ctx.arc(imgCx, imgCy, imgR + 2, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.shadowColor = color;
				ctx.shadowBlur = 14;
				ctx.fill();
				ctx.restore();

				ctx.save();
				ctx.beginPath();
				ctx.arc(imgCx, imgCy, imgR, 0, Math.PI * 2);
				ctx.clip();
				ctx.drawImage(img, imgCx - imgR, imgCy - imgR, imgR * 2, imgR * 2);
				ctx.restore();

				ctx.beginPath();
				ctx.arc(imgCx, imgCy, imgR + 1, 0, Math.PI * 2);
				ctx.strokeStyle = color;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		}

		// F1-style label pill
		const pe = posMap[abbr];
		const posLabel = pe ? `P${pe.position} ${abbr}` : abbr;

		ctx.font = `bold ${isSelected ? 10 : 9}px Inter, system-ui, sans-serif`;
		const tw = ctx.measureText(posLabel).width;
		const pillW = tw + 12;
		const pillH = isSelected ? 17 : 15;
		const pillX = px - pillW / 2;

		const pillY =
			headshotDrawn ?
				py - dotR - 15 * 2 - 8 - pillH - 6
			:	py - dotR - pillH - 6;

		const pillColor = isLeader ? '#fbbf24' : color;
		ctx.fillStyle = pillColor;
		ctx.beginPath();
		if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 3);
		else ctx.rect(pillX, pillY, pillW, pillH);
		ctx.fill();

		ctx.strokeStyle = 'rgba(0,0,0,0.3)';
		ctx.lineWidth = 0.5;
		ctx.stroke();

		ctx.fillStyle = isLeader ? '#000' : '#fff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(posLabel, px, pillY + pillH / 2);

		ctx.restore(); // globalAlpha
	}
}

/* ================================================================== */
/*  Page Component                                                      */
/* ================================================================== */

const ROW_H = 40; // Compact F1 broadcast-style tower rows
const SPEEDS = [1, 2, 5, 10, 20, 50];

export default function TrackPage() {
	const searchParams = useSearchParams();
	const initialDeepLinkYear = Number(searchParams.get('year'));
	const initialDeepLinkRound = Number(searchParams.get('round'));
	const hasInitialDeepLink =
		Number.isInteger(initialDeepLinkYear) &&
		initialDeepLinkYear >= 2018 &&
		Number.isInteger(initialDeepLinkRound) &&
		initialDeepLinkRound > 0;

	/* ── Selection state ── */
	const [selectedYear, setSelectedYear] = useState(
		hasInitialDeepLink ?
			String(initialDeepLinkYear)
		:	String(new Date().getFullYear())
	);
	const [schedule, setSchedule] = useState([]);
	const [scheduleLoading, setScheduleLoading] = useState(false);
	const [selectedRace, setSelectedRace] = useState(null);

	/* ── Visualization state ── */
	const [sessionData, setSessionData] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(5);
	const [displayTime, setDisplayTime] = useState(0);
	const [selectedDriver, setSelectedDriver] = useState(null);
	const [currentBoard, setCurrentBoard] = useState(null);
	const [lapInput, setLapInput] = useState('');
	const [genStatus, setGenStatus] = useState(null);
	const [activeFlags, setActiveFlags] = useState([]);
	const [controlsVisible, setControlsVisible] = useState(true);

	/* ── refs ── */
	const canvasRef = useRef(null);
	const controlsTimerRef = useRef(null);
	const animRef = useRef(null);
	const timeRef = useRef(0);
	const playRef = useRef(false);
	const deepLinkSelectionRef = useRef(
		hasInitialDeepLink ?
			{ year: initialDeepLinkYear, round: initialDeepLinkRound }
		:	null
	);
	const speedRef = useRef(5);
	const dataRef = useRef(null);
	const lastUiRef = useRef(0);
	const driverImagesRef = useRef({});
	const racePositionsRef = useRef(null);
	const selectedDriverRef = useRef(null);
	const boardRef = useRef(null);
	const activeFlagsRef = useRef([]);

	/* sync refs */
	useEffect(() => {
		playRef.current = isPlaying;
		if (!isPlaying) {
			const frameId = window.requestAnimationFrame(() => {
				setControlsVisible(true);
			});
			return () => window.cancelAnimationFrame(frameId);
		}
	}, [isPlaying]);
	useEffect(() => {
		speedRef.current = speed;
	}, [speed]);
	useEffect(() => {
		dataRef.current = sessionData;
	}, [sessionData]);
	useEffect(() => {
		selectedDriverRef.current = selectedDriver;
	}, [selectedDriver]);

	/* ── Pre-compute race positions ── */
	const racePositions = useMemo(() => {
		if (!sessionData) return null;
		return precomputeRacePositions(sessionData);
	}, [sessionData]);

	useEffect(() => {
		racePositionsRef.current = racePositions;
	}, [racePositions]);

	/* ── Pre-compute race insights/events ── */
	const raceInsights = useMemo(() => {
		if (!sessionData) return [];
		return precomputeRaceInsights(sessionData);
	}, [sessionData]);

	/* ── Current weather at playback time ── */
	const currentWeather = useMemo(() => {
		if (!sessionData?.weather || sessionData.weather.length === 0) return null;
		const w = sessionData.weather;
		let best = w[0];
		for (let i = 1; i < w.length; i++) {
			if (w[i].time_sec <= displayTime) best = w[i];
			else break;
		}
		return best;
	}, [sessionData, displayTime]);

	/* ── Insights visible up to current time ── */
	const visibleInsights = useMemo(() => {
		if (!raceInsights) return [];
		return raceInsights.filter((e) => e.time_sec <= displayTime);
	}, [raceInsights, displayTime]);

	/* ── Pre-load headshot images ── */
	useEffect(() => {
		if (!sessionData) return;
		const imgs = {};
		for (const abbr of Object.keys(sessionData.drivers)) {
			const img = new window.Image();
			img.crossOrigin = 'anonymous';
			img.src = `/images/drivers/${abbr}.png`;
			imgs[abbr] = img;
		}
		driverImagesRef.current = imgs;
	}, [sessionData]);

	/* ── Fetch schedule when year changes ── */
	useEffect(() => {
		if (!selectedYear) {
			const timerId = setTimeout(() => {
				setSchedule([]);
			}, 0);
			return () => clearTimeout(timerId);
		}
		const resetTimerId = setTimeout(() => {
			setScheduleLoading(true);
			setSchedule([]);
			setSelectedRace(null);
			setSessionData(null);
			setGenStatus(null);
		}, 0);

		const controller = new AbortController();

		getYearSchedule(parseInt(selectedYear))
			.then((list) => {
				if (!controller.signal.aborted) {
					setSchedule(list || []);
				}
			})
			.catch((err) => {
				if (err.name !== 'AbortError') console.error(err);
			})
			.finally(() => {
				if (!controller.signal.aborted) setScheduleLoading(false);
			});

		return () => {
			clearTimeout(resetTimerId);
			controller.abort();
		};
	}, [selectedYear]);

	useEffect(() => {
		const deepLink = deepLinkSelectionRef.current;
		if (!deepLink || scheduleLoading) return;
		if (Number(selectedYear) !== deepLink.year) return;

		const race = schedule.find((item) => item.round === deepLink.round);
		if (!race) return;

		setSelectedRace({ year: deepLink.year, round: deepLink.round });
		deepLinkSelectionRef.current = null;
	}, [schedule, scheduleLoading, selectedYear]);

	/* ── Fetch session data when a race is selected ── */
	useEffect(() => {
		if (!selectedRace) return;
		const { year, round } = selectedRace;
		const controller = new AbortController();

		const resetTimerId = setTimeout(() => {
			setSessionData(null);
			setSelectedDriver(null);
			setCurrentBoard(null);
			setGenStatus(null);
			setIsPlaying(false);
			timeRef.current = 0;
			setDisplayTime(0);
		}, 0);

		getSessionData(year, round, {
			signal: controller.signal,
			onStatus: (s) => setGenStatus(s),
		})
			.then((d) => {
				if (!controller.signal.aborted) {
					setSessionData(d);
					setGenStatus(null);
					// Mark this race as cached in the schedule
					setSchedule((prev) =>
						prev.map((r) =>
							r.year === year && r.round === round ?
								{ ...r, has_data: true, status: 'ready' }
							:	r
						)
					);
				}
			})
			.catch((err) => {
				if (err.name !== 'AbortError') {
					console.error(err);
					setGenStatus({ status: 'error', message: err.message });
				}
			});

		return () => {
			clearTimeout(resetTimerId);
			controller.abort();
		};
	}, [selectedRace]);

	/* ── Canvas animation loop ── */
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !sessionData) return;

		const ctx = canvas.getContext('2d');
		let prevTs = null;

		const frame = (ts) => {
			if (prevTs === null) prevTs = ts;
			const delta = (ts - prevTs) / 1000;
			prevTs = ts;

			const d = dataRef.current;
			if (!d) {
				animRef.current = requestAnimationFrame(frame);
				return;
			}

			if (playRef.current) {
				timeRef.current += delta * speedRef.current;
				if (timeRef.current >= d.info.duration_sec) {
					timeRef.current = d.info.duration_sec;
					setIsPlaying(false);
				}
			}

			const now = performance.now();
			if (now - lastUiRef.current > 250) {
				lastUiRef.current = now;
				setDisplayTime(timeRef.current);

				const rp = racePositionsRef.current;
				if (rp) {
					const sr = d.info.sample_rate || 1;
					const sIdx = Math.min(
						Math.floor(timeRef.current * sr),
						rp.length - 1
					);
					const board = rp[Math.max(0, sIdx)];
					boardRef.current = board;
					setCurrentBoard(board);
				}

				// Compute active flags at current time
				activeFlagsRef.current = getActiveFlags(d.flags, timeRef.current);
				setActiveFlags(activeFlagsRef.current);
			}

			const dpr = window.devicePixelRatio || 1;
			const cw = canvas.clientWidth;
			const ch = canvas.clientHeight;
			if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
				canvas.width = cw * dpr;
				canvas.height = ch * dpr;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			}

			ctx.clearRect(0, 0, cw, ch);
			ctx.fillStyle = '#0a0a0a';
			ctx.fillRect(0, 0, cw, ch);

			drawTrack(ctx, cw, ch, d.track.x, d.track.y);
			drawFlagZones(ctx, cw, ch, d.track.x, d.track.y, activeFlagsRef.current);
			drawDNFMarkers(ctx, cw, ch, d, timeRef.current);
			drawDrivers(
				ctx,
				cw,
				ch,
				d,
				timeRef.current,
				selectedDriverRef.current,
				boardRef.current,
				driverImagesRef.current
			);

			animRef.current = requestAnimationFrame(frame);
		};

		animRef.current = requestAnimationFrame(frame);
		return () => {
			if (animRef.current) cancelAnimationFrame(animRef.current);
		};
	}, [sessionData]);

	/* ── Keyboard shortcuts ── */
	useEffect(() => {
		const onKey = (e) => {
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
			if (e.code === 'Space') {
				e.preventDefault();
				setIsPlaying((p) => !p);
			}
			if (e.code === 'ArrowRight') {
				timeRef.current = Math.min(
					timeRef.current + 5,
					dataRef.current?.info?.duration_sec ?? Infinity
				);
				setDisplayTime(timeRef.current);
			}
			if (e.code === 'ArrowLeft') {
				timeRef.current = Math.max(0, timeRef.current - 5);
				setDisplayTime(timeRef.current);
			}
			if (e.code === 'Escape') {
				if (selectedDriver) setSelectedDriver(null);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [selectedDriver]);

	/* ── Handlers ── */
	const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

	const handleSeek = useCallback((e) => {
		const t = parseFloat(e.target.value);
		timeRef.current = t;
		setDisplayTime(t);
	}, []);

	const handleRestart = useCallback(() => {
		timeRef.current = 0;
		setDisplayTime(0);
		setIsPlaying(true);
	}, []);

	const jumpToLap = useCallback((lap) => {
		const d = dataRef.current;
		if (!d?.lap_starts) return;
		const clamped = Math.max(1, Math.min(lap, d.lap_starts.length - 1));
		timeRef.current = d.lap_starts[clamped] || 0;
		setDisplayTime(timeRef.current);
	}, []);

	const handleDriverClick = useCallback((abbr) => {
		setSelectedDriver((prev) => (prev === abbr ? null : abbr));
	}, []);

	const handleSelectRace = useCallback((race) => {
		if (!race.is_past) return;
		setSelectedRace({ year: race.year, round: race.round });
	}, []);

	const handleBackToList = useCallback(() => {
		setSelectedRace(null);
		setSessionData(null);
		setGenStatus(null);
		setIsPlaying(false);
		timeRef.current = 0;
		setDisplayTime(0);
	}, []);

	const handleToggleFavorite = useCallback(async (event, race) => {
		event.stopPropagation();
		try {
			const result = await toggleTrackFavorite(race.year, race.round);
			setSchedule((prev) =>
				prev.map((item) =>
					item.year === race.year && item.round === race.round ?
						{ ...item, is_favorite: result.is_favorite }
					:	item
				)
			);
		} catch (error) {
			console.error(error);
		}
	}, []);

	/* ── Derived values ── */
	const lapNum =
		sessionData ? getCurrentLap(sessionData.lap_starts, displayTime) : 0;
	const totalLaps = sessionData?.info?.total_laps ?? 0;
	const maxTime = sessionData?.info?.duration_sec ?? 0;
	const driverCount = sessionData ? Object.keys(sessionData.drivers).length : 0;
	const dnfCount =
		sessionData ?
			Object.values(sessionData.drivers).filter(
				(d) => d.status === 'DNF' || d.status === 'DSQ'
			).length
		:	0;
	const dnsCount =
		sessionData ?
			Object.values(sessionData.drivers).filter((d) => d.status === 'DNS')
				.length
		:	0;

	const posMap = useMemo(() => {
		const m = {};
		if (currentBoard) for (const e of currentBoard) m[e.abbr] = e;
		return m;
	}, [currentBoard]);

	const isVisualizing = !!selectedRace;

	/* ============================= RENDER ============================= */
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-16 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-linear-to-b from-black/90 via-black/80 to-black/90 z-0" />

			<div className="relative z-10 max-w-[1440px] mx-auto pb-12">
				{/* ────── Header ────── */}
				<div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
					<div className="flex items-center gap-4 animate-fade-in">
						<div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
							<FaFlagCheckered className="text-red-500 text-xl" />
						</div>
						<div>
							<h1 className="text-3xl font-bold uppercase tracking-wider leading-none">
								Live Track
							</h1>
							<p className="text-xs text-gray-500 tracking-wide mt-0.5">
								Race Replay & Telemetry Visualizer
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{isVisualizing && (
							<button
								onClick={handleBackToList}
								className="flex items-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl px-4 py-2.5 transition-all duration-200 text-sm"
							>
								<FaChevronLeft className="text-[10px]" />
								Back to Races
							</button>
						)}

						<select
							value={selectedYear}
							onChange={(e) => setSelectedYear(e.target.value)}
							className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 text-white rounded-xl px-5 py-2.5 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/25 transition-all cursor-pointer"
						>
							<option
								value=""
								className="bg-[#111] text-white"
							>
								Select Season
							</option>
							{YEAR_OPTIONS.map((y) => (
								<option
									key={y}
									value={y}
									className="bg-[#111] text-white"
								>
									{y} Season
								</option>
							))}
						</select>
					</div>
				</div>

				{/* ────── Content ────── */}
				{!selectedYear ?
					/* ── No year selected ── */
					<div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
						<div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
							<FaCalendarAlt className="text-3xl text-gray-600" />
						</div>
						<h2 className="text-xl font-bold text-gray-300 mb-2">
							Select a Season
						</h2>
						<p className="text-gray-500 max-w-sm text-sm leading-relaxed">
							Choose a year from the dropdown above to browse race replays with
							full telemetry visualization.
						</p>
					</div>
				: scheduleLoading ?
					/* ── Loading schedule ── */
					<div className="h-[60vh] rounded-2xl border border-white/10 bg-white/4 p-4 animate-fade-in">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									key={i}
									className="h-[130px] rounded-xl bg-white/6 border border-white/10 animate-pulse"
								/>
							))}
						</div>
					</div>
				: !isVisualizing ?
					/* ── Race list for selected year ── */
					<div className="animate-fade-in">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-lg font-bold text-white">
									{selectedYear} Season
								</h2>
								<p className="text-gray-500 text-xs mt-0.5">
									{schedule.filter((r) => r.is_past).length} completed
									{schedule.filter((r) => r.has_data).length > 0 &&
										` · ${schedule.filter((r) => r.has_data).length} cached`}
									{' · '}Select a race to explore
								</p>
							</div>
							<div className="flex items-center gap-3 text-[10px] text-gray-500">
								<span className="flex items-center gap-1.5">
									<span className="w-2 h-2 rounded-full bg-green-500/60" />{' '}
									Cached
								</span>
								<span className="flex items-center gap-1.5">
									<span className="w-2 h-2 rounded-full bg-white/20" />{' '}
									Available
								</span>
								<span className="flex items-center gap-1.5">
									<span className="w-2 h-2 rounded-full bg-white/5" /> Upcoming
								</span>
							</div>
						</div>

						{schedule.length === 0 ?
							<div className="flex flex-col items-center justify-center h-64 text-center">
								<FaFlagCheckered className="text-3xl text-gray-700 mb-4" />
								<p className="text-gray-500 text-sm">
									No races found for {selectedYear}
								</p>
							</div>
						:	<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
								{schedule.map((race, raceIdx) => {
									const isPast = race.is_past;
									const hasData = race.has_data;
									const isFavorite = race.is_favorite;
									const cc = getCountryCode(race.country);

									return (
										<button
											key={`${race.year}_${race.round}`}
											onClick={() => handleSelectRace(race)}
											disabled={!isPast}
											style={{ animationDelay: `${raceIdx * 30}ms` }}
											className={`animate-fade-in text-left rounded-xl border transition-all duration-300 group relative overflow-hidden h-[130px] bg-black/90 backdrop-blur-3xl backdrop-brightness-90
												${
													isPast ?
														hasData ?
															'bg-linear-to-r from-white/4 to-white/2 border-white/10 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5 cursor-pointer'
														:	'bg-linear-to-r from-white/4 to-white/2 border-white/10 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5 cursor-pointer'
													:	'bg-linear-to-r from-white/4 to-white/2 border-white/10 hover:border-red-500 hover:shadow-lg hover:shadow-green-500/5 cursor-pointer'
												}`}
										>
											{/* Flag image — right side, fading into left */}
											{(cc || race.country === 'United Kingdom') && (
												<div className="absolute inset-y-0 right-0 w-[60%] pointer-events-none overflow-hidden rounded-r-xl">
													<Image
														src={`/images/flags/${cc || 'gbr'}.png`}
														alt={race.country}
														fill
														sizes="300px"
														className="object-cover object-center opacity-[0.12] group-hover:opacity-[0.45] transition-all duration-500 scale-105 group-hover:scale-110 brightness-75 group-hover:brightness-110"
														onError={(e) => {
															e.target.style.display = 'none';
														}}
													/>
													{/* Fade gradient: left edge dissolves into card bg */}
													<div className="absolute inset-0 bg-linear-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
												</div>
											)}

											{/* Thin left accent bar */}
											<div
												className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300
												${
													isPast ?
														hasData ? 'bg-green-500/50 group-hover:bg-green-400'
														:	'bg-white/10 group-hover:bg-red-500'
													:	'bg-white/5'
												}`}
											/>

											{/* Card content */}
											<div className="relative z-10 p-4 pl-5 h-full flex flex-col justify-between">
												<div>
													<div className="flex items-center justify-between mb-2">
														<span className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
															<CountryFlag
																country={race.country}
																size={18}
															/>
															<span>
																R{String(race.round).padStart(2, '0')}
															</span>
														</span>
														<div className="flex items-center gap-2">
															{isFavorite && (
																<span className="text-[9px] font-bold bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/20">
																	Favorite
																</span>
															)}
															{hasData ?
																<span className="text-[9px] font-bold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 group-hover:brightness-200 transition-all ">
																	Ready
																</span>
															: isPast ?
																<span className="text-[9px] font-bold bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10 group-hover:bg-red-500/15 group-hover:text-red-400 group-hover:border-red-500/20 transition-all group-hover:brightness-200 ">
																	Generate
																</span>
															:	<span className="text-[9px] text-gray-600 px-2 py-0.5 group-hover:brightness-200 transition-all ">
																	Upcoming
																</span>
															}
														</div>
													</div>
													<h3
														className={`font-bold text-[13px] leading-tight ${isPast ? 'text-white/90 group-hover:text-white' : 'text-gray-600'} transition-colors`}
													>
														{race.event}
													</h3>
												</div>

												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3 text-[10px] text-gray-500">
														<span className="flex items-center gap-1">
															<FaMapMarkerAlt className="text-[8px] text-gray-600" />
															{race.country}
														</span>
														<span className="text-gray-700">•</span>
														<span>{race.date}</span>
													</div>
													<div className="flex items-center gap-2">
														{race.track_data_id && (
															<span className="text-[9px] text-cyan-300/80 font-mono">
																ID {race.track_data_id}
															</span>
														)}
														{isPast && (
															<button
																type="button"
																onClick={(event) =>
																	handleToggleFavorite(event, race)
																}
																className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] transition-all ${
																	isFavorite ?
																		'border-yellow-500/30 bg-yellow-500/12 text-yellow-300'
																	:	'border-white/10 bg-black/35 text-gray-400 hover:text-white'
																}`}
															>
																<FaStar className="text-[8px]" />
																Save
															</button>
														)}
													</div>
												</div>
											</div>
										</button>
									);
								})}
							</div>
						}
					</div>
				: genStatus || !sessionData ?
					/* ── Loading / generating state ── */
					<div className="animate-fade-in">
						{selectedRace && (
							<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/6 px-6 py-4 mb-6 flex items-center gap-4">
								<div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-600/20 flex items-center justify-center shrink-0">
									<FaFlagCheckered className="text-red-500/80 text-sm" />
								</div>
								<div>
									<span className="font-bold text-white text-sm">
										{schedule.find((r) => r.round === selectedRace.round)
											?.event || `Round ${selectedRace.round}`}
									</span>
									<span className="text-gray-600 ml-3 text-sm">
										{selectedRace.year}
									</span>
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-0">
							{/* Skeleton tower (left) */}
							<div className="bg-[#111]/90 border-r border-white/6 xl:rounded-l-2xl overflow-hidden">
								<div className="px-3 py-2.5 border-b border-white/6 flex items-center justify-between">
									<div className="h-3 w-20 bg-white/4 rounded animate-pulse" />
									<div className="h-3 w-14 bg-white/4 rounded animate-pulse" />
								</div>
								<div className="p-1">
									{Array.from({ length: 12 }).map((_, i) => (
										<div
											key={i}
											className="flex items-center gap-2 px-2 h-10"
											style={{ opacity: 1 - i * 0.06 }}
										>
											<div className="w-5 h-4 bg-white/4 rounded animate-pulse" />
											<div className="w-[3px] h-4 bg-white/6 rounded-full animate-pulse" />
											<div className="h-3 w-8 bg-white/4 rounded animate-pulse" />
											<div className="flex-1" />
											<div className="h-3 w-10 bg-white/4 rounded animate-pulse" />
										</div>
									))}
								</div>
							</div>
							{/* Skeleton canvas (right) */}
							<div className="bg-white/3 backdrop-blur-xl xl:rounded-r-2xl border border-white/6 border-l-0 shadow-2xl overflow-hidden">
								<div
									style={{ aspectRatio: '16 / 9' }}
									className="w-full bg-white/2 flex flex-col items-center justify-center gap-5 relative overflow-hidden"
								>
									<div className="absolute inset-0 animate-shimmer bg-size-[200%_100%] bg-linear-to-r from-transparent via-white/3 to-transparent" />

									{genStatus?.status === 'error' ?
										<>
											<div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
												<FaTimes className="text-red-500 text-xl" />
											</div>
											<div className="text-center">
												<p className="text-red-400 text-sm font-semibold mb-1">
													Generation failed
												</p>
												<p className="text-gray-500 text-xs max-w-xs leading-relaxed">
													{genStatus.message}
												</p>
											</div>
											<button
												onClick={() => setSelectedRace({ ...selectedRace })}
												className="text-xs bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-600/20"
											>
												Try again
											</button>
										</>
									:	<>
											<div className="w-24 h-3 rounded-full bg-white/8 overflow-hidden">
												<div className="h-full w-1/2 bg-red-500/70 animate-pulse" />
											</div>
											<div className="text-center">
												<p className="text-gray-200 font-semibold text-sm mb-1">
													{genStatus?.status === 'generating' ?
														'Generating telemetry data'
													:	'Loading track data'}
												</p>
												<p className="text-gray-500 text-xs max-w-sm leading-relaxed">
													{genStatus?.status === 'generating' ?
														'Extracting lap-by-lap telemetry from FastF1. This may take 1–2 minutes on first load.'
													:	'Preparing visualization…'}
												</p>
											</div>
											<div className="flex gap-1 mt-1">
												{[0, 1, 2, 3, 4].map((i) => (
													<div
														key={i}
														className="w-1 h-1 rounded-full bg-red-500/60"
														style={{
															animation: `pulse 1.6s ease-in-out ${i * 0.15}s infinite`,
														}}
													/>
												))}
											</div>
										</>
									}
								</div>
							</div>
						</div>
					</div>
				: sessionData ?
					/* ── Full visualization ── */
					<div className="animate-fade-in">
						{/* Session info banner */}
						<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/6 px-6 py-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 overflow-hidden">
									<CountryFlag
										country={sessionData.info.country}
										size={28}
									/>
								</div>
								<div>
									<h2 className="font-bold text-white text-[15px] leading-tight">
										{sessionData.info.event}
									</h2>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-xs text-gray-500">
											{sessionData.info.circuit}
										</span>
										<span className="text-gray-700 text-[10px]">•</span>
										<span className="text-xs text-gray-600">
											{sessionData.info.country}
										</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-3 text-xs">
								<span className="bg-white/5 rounded-lg px-3 py-1.5 text-gray-300 font-medium border border-white/6">
									{totalLaps} Laps
								</span>
								{dnfCount > 0 && (
									<span className="bg-red-500/10 rounded-lg px-3 py-1.5 text-red-400 font-medium border border-red-500/15">
										{dnfCount} DNF
									</span>
								)}
								{dnsCount > 0 && (
									<span className="bg-gray-500/10 rounded-lg px-3 py-1.5 text-gray-500 font-medium border border-gray-500/15">
										{dnsCount} DNS
									</span>
								)}
								<span className="text-gray-600 font-mono text-[11px]">
									{sessionData.info.date}
								</span>
							</div>
						</div>

						{/* Flag / hazard status banner */}
						{activeFlags.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
								{activeFlags.map((f, i) => {
									const colorMap = {
										Yellow:
											'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
										DoubleYellow:
											'bg-amber-500/15 text-amber-300 border-amber-500/25',
										Red: 'bg-red-600/15 text-red-300 border-red-500/25',
										SC: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20',
										VSC: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/15',
									};
									const iconMap = {
										Yellow: <FaExclamationTriangle className="text-[10px]" />,
										DoubleYellow: (
											<FaExclamationTriangle className="text-[10px]" />
										),
										Red: <FaTimes className="text-[10px]" />,
										SC: <FaExclamationTriangle className="text-[10px]" />,
										VSC: <FaExclamationTriangle className="text-[10px]" />,
									};
									const labelMap = {
										Yellow: 'YELLOW',
										DoubleYellow: 'DOUBLE YELLOW',
										Red: 'RED FLAG',
										SC: 'SAFETY CAR',
										VSC: 'VIRTUAL SC',
									};
									return (
										<div
											key={i}
											className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold backdrop-blur-md ${colorMap[f.type] || 'bg-white/5 text-white border-white/10'}`}
										>
											{iconMap[f.type]}
											<span>{labelMap[f.type] || f.type}</span>
											{f.scope === 'Sector' && f.sector && (
												<span className="text-[10px] opacity-60 font-medium">
													S{f.sector}
												</span>
											)}
										</div>
									);
								})}
							</div>
						)}

						{/* F1 Broadcast Layout: Tower | Canvas | Overlays */}
						<div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-0 rounded-2xl overflow-hidden shadow-2xl border border-white/6">
							{/* ===== LEFT: F1-Style Driver Tower ===== */}
							<div className="bg-[#0d0d0d] xl:border-r border-white/8 flex flex-col overflow-hidden">
								{/* Tower Header */}
								<div className="px-3 py-2.5 border-b border-white/8 bg-[#111] shrink-0">
									<div className="flex items-center justify-between">
										<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
											Race Order
										</h3>
										<div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/6">
											<span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">
												Lap
											</span>
											<span className="text-[12px] font-bold text-white tabular-nums">
												{lapNum}
											</span>
											<span className="text-[9px] text-gray-600">
												/ {totalLaps}
											</span>
										</div>
									</div>
									{sessionData?.fastest_lap?.abbr &&
										lapNum >= (sessionData.fastest_lap.lap || 0) && (
											<div className="mt-1.5">
												<span className="text-[8px] font-bold bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-500/20 inline-flex items-center gap-1">
													<FaTachometerAlt className="text-[6px]" />
													FL: {sessionData.fastest_lap.abbr}{' '}
													{formatLapTime(sessionData.fastest_lap.time)}
												</span>
											</div>
										)}
								</div>

								{/* Driver Rows */}
								<div
									className="flex-1 overflow-y-auto relative"
									style={{ minHeight: Math.min(driverCount * ROW_H, 600) }}
								>
									{Object.entries(sessionData.drivers).map(([abbr, info]) => {
										const pe = posMap[abbr];
										const pos = pe?.position ?? driverCount;
										const isLeader = pos === 1;
										const isSel = abbr === selectedDriver;
										const isActive = pe?.active !== false;
										const drvStatus = pe?.status || '';
										const isDNF = drvStatus === 'DNF';
										const isDNS = drvStatus === 'DNS';
										const isDSQ = drvStatus === 'DSQ';
										const isRetired = isDNF || isDNS || isDSQ;

										const lastLap = getLastLapTime(
											sessionData.lap_times,
											abbr,
											lapNum
										);
										const isFastestOverall =
											sessionData?.fastest_lap?.abbr === abbr &&
											lapNum >= (sessionData.fastest_lap.lap || 0);

										const driverIdx =
											currentBoard?.findIndex((e) => e.abbr === abbr) ?? -1;
										const gap = computeGapToAhead(
											sessionData.lap_times,
											currentBoard,
											driverIdx,
											lapNum
										);

										return (
											<div
												key={abbr}
												className="absolute left-0 right-0 transition-[top] duration-500 ease-out cursor-pointer"
												style={{
													top: `${(pos - 1) * ROW_H}px`,
													height: `${ROW_H}px`,
												}}
												onClick={() => handleDriverClick(abbr)}
											>
												<div
													className={`flex items-center h-full mx-1 px-1.5 rounded-lg transition-all duration-200
														${isSel ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'}
														${
															isDNS ? 'opacity-15'
															: isRetired ? 'opacity-25'
															: !isActive ? 'opacity-40'
															: ''
														}`}
												>
													{/* Position */}
													<div
														className={`w-6 text-center shrink-0 text-[11px] font-black tabular-nums ${isLeader ? 'text-yellow-400' : 'text-gray-500'}`}
													>
														{isDNS ?
															<span className="text-[7px] text-gray-600">
																DNS
															</span>
														: isDSQ ?
															<span className="text-[7px] text-red-500">
																DSQ
															</span>
														: isDNF ?
															<FaSkullCrossbones className="text-red-500/60 text-[8px] mx-auto" />
														: isLeader ?
															<FaCrown className="text-yellow-400 text-[10px] mx-auto" />
														:	pos}
													</div>

													{/* Team color bar */}
													<div
														className="w-[3px] h-5 rounded-full shrink-0 mx-1"
														style={{
															backgroundColor: isRetired ? '#444' : info.color,
														}}
													/>

													{/* Driver info */}
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-1">
															<span
																className={`text-[11px] font-bold leading-none ${
																	isSel ? 'text-white'
																	: isRetired ? 'text-gray-600 line-through'
																	: 'text-gray-200'
																}`}
															>
																{abbr}
															</span>
															{isFastestOverall && (
																<div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
															)}
															{isDNF && (
																<span className="text-[6px] font-bold text-red-400/70">
																	DNF
																</span>
															)}
														</div>
														{!isRetired && lastLap != null && lapNum > 0 && (
															<span
																className={`text-[8px] font-mono leading-none mt-0.5 block ${isFastestOverall ? 'text-purple-400' : 'text-gray-500'}`}
															>
																{formatLapTime(lastLap)}
															</span>
														)}
													</div>

													{/* Interval */}
													<div className="shrink-0 text-right">
														{isLeader && !isRetired ?
															<span className="text-[8px] font-bold text-yellow-400/80 leading-none tracking-wider">
																INT
															</span>
														: !isLeader && !isRetired && gap != null ?
															<span className="text-[9px] font-mono text-gray-400 leading-none tabular-nums">
																+{gap > 0 ? gap.toFixed(1) : '0.0'}
															</span>
														: isRetired && isDNF && info.laps_completed ?
															<span className="text-[7px] font-mono text-red-500/50 leading-none">
																L{info.laps_completed}
															</span>
														:	null}
													</div>

													{isSel && (
														<div
															className="w-1 h-1 rounded-full ml-1 shrink-0"
															style={{
																backgroundColor: info.color,
																boxShadow: `0 0 6px ${info.color}`,
															}}
														/>
													)}
												</div>
											</div>
										);
									})}
								</div>

								{/* Tower Footer: Selected driver detail */}
								{selectedDriver && sessionData.drivers[selectedDriver] && (
									<div className="px-3 py-2 border-t border-white/8 bg-[#111] shrink-0">
										<div className="flex items-center gap-2">
											<div
												className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 border"
												style={{
													borderColor:
														sessionData.drivers[selectedDriver].color,
												}}
											>
												<Image
													src={`/images/drivers/${selectedDriver}.png`}
													alt={selectedDriver}
													fill
													sizes="24px"
													className="object-cover"
													onError={(e) => {
														e.target.style.display = 'none';
													}}
												/>
											</div>
											<div className="flex-1 min-w-0">
												<span className="text-[10px] font-bold text-white">
													{selectedDriver}
												</span>
												<span className="text-[8px] text-gray-500 ml-1">
													{sessionData.drivers[selectedDriver].team}
												</span>
											</div>
											<button
												onClick={() => setSelectedDriver(null)}
												className="text-gray-600 hover:text-white transition-colors"
											>
												<FaTimes className="text-[8px]" />
											</button>
										</div>
										{(() => {
											const bestLap = getBestLapTime(
												sessionData.lap_times,
												selectedDriver,
												lapNum
											);
											const lastLapSel = getLastLapTime(
												sessionData.lap_times,
												selectedDriver,
												lapNum
											);
											return bestLap || lastLapSel ?
													<div className="flex items-center gap-3 mt-1 text-[8px] text-gray-400">
														{lastLapSel != null && (
															<span>
																Last:{' '}
																<span className="text-gray-300 font-mono">
																	{formatLapTime(lastLapSel)}
																</span>
															</span>
														)}
														{bestLap != null && (
															<span>
																Best:{' '}
																<span className="text-green-400 font-mono">
																	{formatLapTime(bestLap)}
																</span>
															</span>
														)}
													</div>
												:	null;
										})()}
									</div>
								)}
							</div>

							{/* ===== RIGHT: Canvas + Overlays ===== */}
							<div className="relative bg-[#0a0a0a] overflow-visible">
								{/* Canvas container */}
								<div
									style={{ aspectRatio: '16 / 9' }}
									className={`w-full relative group ${!controlsVisible ? 'cursor-none' : ''}`}
									onMouseMove={() => {
										setControlsVisible(true);
										clearTimeout(controlsTimerRef.current);
										if (playRef.current) {
											controlsTimerRef.current = setTimeout(
												() => setControlsVisible(false),
												3000
											);
										}
									}}
									onMouseLeave={() => {
										clearTimeout(controlsTimerRef.current);
										if (playRef.current) setControlsVisible(false);
									}}
								>
									<canvas
										ref={canvasRef}
										style={{ display: 'block', width: '100%', height: '100%' }}
									/>

									{/* Weather overlay — top left of canvas */}
									{currentWeather && (
										<div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/8 text-[9px]">
											{(
												currentWeather.rainfall &&
												parseFloat(currentWeather.rainfall) > 0
											) ?
												<FaCloudRain className="text-blue-400 text-[8px]" />
											:	<FaSun className="text-yellow-400 text-[8px]" />}
											{currentWeather.air_temp != null && (
												<span className="text-gray-200 font-medium">
													{currentWeather.air_temp}°C
												</span>
											)}
											{currentWeather.track_temp != null && (
												<span className="text-gray-500">
													Trk {currentWeather.track_temp}°C
												</span>
											)}
											{currentWeather.humidity != null && (
												<span className="text-gray-500 flex items-center gap-0.5">
													<FaTint className="text-blue-400/60 text-[6px]" />
													{currentWeather.humidity}%
												</span>
											)}
											{currentWeather.wind_speed != null && (
												<span className="text-gray-500 flex items-center gap-0.5">
													<FaWind className="text-cyan-400/60 text-[6px]" />
													{currentWeather.wind_speed}km/h
												</span>
											)}
											{currentWeather.rainfall &&
												parseFloat(currentWeather.rainfall) > 0 && (
													<span className="text-blue-300 font-bold flex items-center gap-0.5">
														<FaCloudRain className="text-[6px]" />
														Rain
													</span>
												)}
										</div>
									)}

									{/* Race Insights overlay — top right of canvas */}
									{visibleInsights.length > 0 && (
										<div className="absolute top-3 right-3 z-20 w-64 max-h-[45%] overflow-y-auto bg-black/50 backdrop-blur-md rounded-xl border border-white/8 shadow-2xl">
											<div className="px-3 py-2 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/70 backdrop-blur-md z-10 rounded-t-xl">
												<h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
													<FaFlag className="text-[7px] text-red-500" />
													Insights
												</h4>
												<span className="text-[8px] text-gray-600 font-mono">
													{visibleInsights.length}
												</span>
											</div>
											<div className="py-1">
												{[...visibleInsights]
													.reverse()
													.slice(0, 20)
													.map((evt, i) => {
														const iconMap = {
															flag: <FaFlagCheckered className="text-[7px]" />,
															exchange: (
																<FaExchangeAlt className="text-[7px]" />
															),
															tachometer: (
																<FaTachometerAlt className="text-[7px]" />
															),
															wrench: <FaWrench className="text-[7px]" />,
															exclamation: (
																<FaExclamationTriangle className="text-[7px]" />
															),
															times: <FaTimes className="text-[7px]" />,
															skull: (
																<FaSkullCrossbones className="text-[7px]" />
															),
															checkered: (
																<FaFlagCheckered className="text-[7px]" />
															),
															trophy: <FaTrophy className="text-[7px]" />,
														};
														const typeColorMap = {
															race_start: 'border-green-500/20',
															overtake: 'border-blue-500/15',
															fastest_lap: 'border-purple-500/20',
															pit_stop: 'border-amber-500/15',
															hazard: 'border-red-500/20',
															retirement: 'border-red-500/15',
															milestone: 'border-white/8',
														};
														return (
															<div
																key={`${evt.type}-${evt.time_sec}-${i}`}
																className={`mx-1.5 mb-0.5 px-2 py-1.5 rounded-md border bg-white/3 transition-all ${typeColorMap[evt.type] || 'border-white/6'}`}
															>
																<div className="flex items-center gap-1.5">
																	<div
																		className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
																		style={{
																			backgroundColor:
																				(evt.color || '#666') + '15',
																			color: evt.color || '#999',
																		}}
																	>
																		{iconMap[evt.icon] || (
																			<FaFlag className="text-[7px]" />
																		)}
																	</div>
																	<div className="flex-1 min-w-0">
																		<div className="flex items-center gap-1">
																			<span
																				className="text-[8px] font-bold leading-none"
																				style={{ color: evt.color || '#ccc' }}
																			>
																				{evt.title}
																			</span>
																			<span className="text-[7px] text-gray-600 font-mono">
																				L{evt.lap}
																			</span>
																		</div>
																		<p className="text-[7px] text-gray-500 leading-tight truncate">
																			{evt.detail}
																		</p>
																	</div>
																</div>
															</div>
														);
													})}
											</div>
										</div>
									)}

									{/* Playback Controls overlay — bottom of canvas */}
									<div
										className={`absolute bottom-0 left-0 right-0 z-20 bg-linear-to-t from-black/80 via-black/40 to-transparent pt-10 pb-3 px-4 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
										style={{ cursor: 'default' }}
									>
										{/* Timeline */}
										<div className="flex items-center gap-2 mb-2">
											<span className="text-[10px] font-mono text-gray-400 w-12 text-right shrink-0 tabular-nums">
												{formatTime(displayTime)}
											</span>
											<div className="relative flex-1">
												<input
													type="range"
													min={0}
													max={maxTime}
													step={0.5}
													value={displayTime}
													onChange={handleSeek}
													className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/10
														[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/40
														[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
													style={{
														background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${maxTime > 0 ? (displayTime / maxTime) * 100 : 0}%, rgba(255,255,255,0.1) ${maxTime > 0 ? (displayTime / maxTime) * 100 : 0}%, rgba(255,255,255,0.1) 100%)`,
													}}
												/>
											</div>
											<span className="text-[10px] font-mono text-gray-600 w-12 shrink-0 tabular-nums">
												{formatTime(maxTime)}
											</span>
										</div>

										{/* Transport + Lap + Speed */}
										<div className="flex items-center justify-between">
											{/* Transport controls */}
											<div className="flex items-center gap-0.5">
												<button
													onClick={handleRestart}
													className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
													title="Restart"
												>
													<FaRedo className="text-[9px]" />
												</button>
												<button
													onClick={() => {
														timeRef.current = Math.max(0, timeRef.current - 5);
														setDisplayTime(timeRef.current);
													}}
													className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
													title="Rewind 5s (←)"
												>
													<FaFastBackward className="text-[8px]" />
												</button>
												<button
													onClick={togglePlay}
													className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 active:scale-95 rounded-full transition-all shadow-lg shadow-red-600/30 mx-1"
													title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
												>
													{isPlaying ?
														<FaPause className="text-xs text-white" />
													:	<FaPlay className="text-xs text-white ml-0.5" />}
												</button>
												<button
													onClick={() => {
														timeRef.current = Math.min(
															timeRef.current + 5,
															dataRef.current?.info?.duration_sec ?? Infinity
														);
														setDisplayTime(timeRef.current);
													}}
													className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
													title="Forward 5s (→)"
												>
													<FaFastForward className="text-[8px]" />
												</button>
											</div>

											{/* Lap navigation */}
											<div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/8">
												<button
													onClick={() => jumpToLap(lapNum - 1)}
													disabled={lapNum <= 1}
													className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-white transition-all disabled:opacity-20"
												>
													<FaStepBackward className="text-[8px]" />
												</button>
												<div className="flex items-center gap-1 px-1">
													<span className="text-[8px] text-gray-600 uppercase tracking-wider font-medium">
														Lap
													</span>
													<input
														type="number"
														min={1}
														max={totalLaps}
														value={lapInput || lapNum}
														onChange={(e) => setLapInput(e.target.value)}
														onBlur={() => {
															const v = parseInt(lapInput);
															if (v >= 1 && v <= totalLaps) jumpToLap(v);
															setLapInput('');
														}}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																const v = parseInt(lapInput);
																if (v >= 1 && v <= totalLaps) jumpToLap(v);
																setLapInput('');
																e.target.blur();
															}
														}}
														className="w-8 bg-transparent text-center text-white font-bold text-[11px] focus:outline-none focus:bg-white/6 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
													/>
													<span className="text-gray-600 text-[11px] font-medium">
														/ {totalLaps}
													</span>
												</div>
												<button
													onClick={() => jumpToLap(lapNum + 1)}
													disabled={lapNum >= totalLaps}
													className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-white transition-all disabled:opacity-20"
												>
													<FaStepForward className="text-[8px]" />
												</button>
											</div>

											{/* Speed selector */}
											<div className="flex items-center bg-white/5 rounded-lg border border-white/8 overflow-hidden">
												{SPEEDS.map((s) => (
													<button
														key={s}
														onClick={() => setSpeed(s)}
														className={`px-2 py-1 text-[10px] font-bold transition-all ${speed === s ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
													>
														{s}×
													</button>
												))}
											</div>
										</div>

										{/* Keyboard hints */}
										<div className="flex items-center justify-center gap-4 mt-1.5 text-[8px] text-gray-600/50 select-none">
											<span>
												<kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-600 font-mono text-[7px]">
													Space
												</kbd>{' '}
												Play
											</span>
											<span>
												<kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-600 font-mono text-[7px]">
													← →
												</kbd>{' '}
												±5s
											</span>
											<span>
												<kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-600 font-mono text-[7px]">
													Esc
												</kbd>{' '}
												Deselect
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				:	null}
			</div>
		</div>
	);
}
