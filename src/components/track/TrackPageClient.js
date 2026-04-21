'use client';

import { getTelemetryDriverImage } from '@/components/telemetry/telemetryUiUtils';
import { logActivity } from '@/lib/api/historyApi';
import {
  getOvertakeModelMetadata,
  getOvertakeProbabilities,
  getSessionData,
  getYearSchedule,
  toggleTrackFavorite,
} from '@/lib/api/trackApi';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCalendarAlt,
  FaChevronDown,
  FaChevronLeft,
  FaCloudRain,
  FaCompress,
  FaCrown,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaExpand,
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
  FaStopwatch,
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
function CustomOvertakeDropdown({
	label,
	value,
	options,
	onChange,
	placeholder,
	disabled,
}) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const selectedOption = options.find((o) => o.abbr === value);

	return (
		<div
			className="relative w-full"
			ref={dropdownRef}
		>
			<div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-1.5">
				{label}
			</div>
			<button
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={`flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-left transition-colors hover:border-red-500/50 hover:bg-black/60 focus:bg-white/5 disabled:opacity-50`}
			>
				{selectedOption ?
					<div className="flex items-center gap-3">
						<div className="relative h-6 w-6 overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-sm">
							<Image
								src={`/images/drivers/${selectedOption.abbr}.png`}
								alt={selectedOption.abbr}
								fill
								className="object-cover object-top"
								onError={() => setImgSrc('/images/default.png')}
							/>
						</div>
						<div className="flex flex-col">
							<span className="text-sm font-bold text-white leading-none">
								{selectedOption.abbr}
							</span>
							<span className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase">
								{selectedOption.currentPosition ?
									`P${selectedOption.currentPosition}`
								:	`G${selectedOption.gridPosition}`}
							</span>
						</div>
					</div>
				:	<span className="text-sm text-gray-500 py-1">{placeholder}</span>}
				<FaChevronDown
					className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
					size={12}
				/>
			</button>

			{isOpen && (
				<div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#121215] shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-3xl styled-scrollbar">
					{options.map((option) => (
						<button
							key={option.abbr}
							onClick={() => {
								onChange(option.abbr);
								setIsOpen(false);
							}}
							className="flex w-full items-center gap-3 border-b border-white/5 py-2.5 px-3 text-left transition hover:bg-red-600/20 active:bg-red-600/40"
						>
							<div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/20 bg-white/10">
								<Image
									src={`/images/drivers/${option.abbr}.png`}
									alt={option.abbr}
									fill
									className="object-cover object-top"
									onError={(e) => {
										e.currentTarget.style.display = 'none';
									}}
								/>
							</div>
							<div className="flex flex-col">
								<span className="text-sm font-bold text-white leading-none">
									{option.abbr}
								</span>
								<span className="text-[10px] font-mono text-gray-400 mt-0.5">
									{option.currentPosition ?
										`P${option.currentPosition}`
									:	`G${option.gridPosition}`}
								</span>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
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

function formatGapValue(
	sec,
	{ showPlus = true, fallback = '—', zeroFloor = 0.0005 } = {}
) {
	if (sec == null || !Number.isFinite(Number(sec))) return fallback;
	const numeric = Math.abs(Number(sec)) < zeroFloor ? 0 : Number(sec);
	if (numeric === 0) return `${showPlus ? '+' : ''}0.000`;
	const sign =
		numeric > 0 ?
			showPlus ? '+'
			:	''
		:	'-';
	return `${sign}${Math.abs(numeric).toFixed(3)}`;
}

function formatProbability(prob) {
	if (prob == null || !Number.isFinite(Number(prob))) return '—';
	return `${(Number(prob) * 100).toFixed(1)}%`;
}

const CAUTION_CROWN_TYPES = new Set(['Yellow', 'DoubleYellow', 'SC', 'VSC']);

function shouldShowLeaderCrown(flags) {
	return (
		Array.isArray(flags) &&
		flags.some((flag) => CAUTION_CROWN_TYPES.has(flag?.type))
	);
}

function isRaceOrderEntryActive(entry) {
	if (!entry) return false;
	const status = String(entry.status || '').toUpperCase();
	return entry.active !== false && !['DNF', 'DNS', 'DSQ'].includes(status);
}

function isDriverSelectableForOvertake(entry) {
	return isRaceOrderEntryActive(entry);
}

function getCompletedLapCount(currentLap, isPreRaceState) {
	if (isPreRaceState) return 0;
	return Math.max(0, Number(currentLap || 0) - 1);
}

function getVisibleFastestLap(sessionData, playbackSecond) {
	if (!sessionData?.events) return null;

	let best = null;
	for (const evt of sessionData.events) {
		if (evt.time_sec > playbackSecond) continue;
		if (evt.type === 'fastest_lap') {
			const abbr = evt.title.split(' ')[0];
			best = { abbr, lap: evt.lap, time: evt.detail };
		}
	}
	return best;
}

function getDriverSortPosition(info, fallback) {
	const grid = Number(info?.grid_position);
	if (Number.isFinite(grid) && grid > 0) return grid;
	return fallback;
}

function buildGridBoard(drivers) {
	const entries = Object.entries(drivers || {});
	const driverCount = entries.length;

	return entries
		.map(([abbr, info], index) => ({
			abbr,
			position: getDriverSortPosition(info, driverCount + index + 1),
			officialPos: getDriverSortPosition(info, driverCount + index + 1),
			gridPosition: getDriverSortPosition(info, driverCount + index + 1),
			gapAhead: null,
			gapLeader: null,
			progressLaps: 0,
			laps: 0,
			active: info?.status !== 'DNS',
			status: info?.status === 'DNS' ? 'DNS' : '',
		}))
		.sort((a, b) => a.position - b.position)
		.map((entry, index) => ({
			...entry,
			position: index + 1,
		}));
}

function getTimingSampleIndex(timeSec, maxIndex) {
	if (!Number.isFinite(timeSec) || maxIndex <= 0) return 0;
	return Math.max(0, Math.min(Math.floor(timeSec), maxIndex));
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
				const lapStart = lap_starts?.[lap] ?? lap * 90;
				const tSec = lap_starts?.[lap + 1] ?? lapStart + lapBestTime;
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

function DriverPicker({
	label,
	helper,
	value,
	options,
	isOpen,
	onToggle,
	onSelect,
	placeholder,
}) {
	const selectedOption =
		options.find((option) => option.abbr === value) || null;

	return (
		<div className="relative">
			<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-1.5">
				{label}
			</span>
			{helper && <p className="mb-2 text-[11px] text-gray-500">{helper}</p>}
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-left text-white transition-all hover:border-white/20"
			>
				{selectedOption ?
					<>
						<div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-black/50 shrink-0">
							<Image
								src={
									getTelemetryDriverImage(selectedOption.abbr, 2026) ||
									`/images/drivers/${selectedOption.abbr}.png`
								}
								alt={selectedOption.abbr}
								fill
								sizes="44px"
								className="object-cover object-top"
							/>
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<span className="text-sm font-bold text-white">
									{selectedOption.abbr}
								</span>
								<span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-gray-300">
									G{selectedOption.gridPosition}
								</span>
								{selectedOption.currentPosition && (
									<span className="text-[10px] font-medium text-gray-400">
										P{selectedOption.currentPosition}
									</span>
								)}
							</div>
							<p className="truncate text-[11px] text-gray-500">
								{selectedOption.info?.team || 'Current runner'}
							</p>
						</div>
					</>
				:	<div className="flex-1">
						<div className="text-sm font-semibold text-gray-200">
							{placeholder}
						</div>
						<p className="text-[11px] text-gray-500">
							Choose from active drivers only.
						</p>
					</div>
				}
				<FaChevronDown
					className={`shrink-0 text-[12px] text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
				/>
			</button>

			{isOpen && (
				<div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0d]/95 p-2 shadow-2xl backdrop-blur-xl">
					{options.map((option) => {
						const isSelected = option.abbr === value;
						return (
							<button
								key={`${label}-${option.abbr}`}
								type="button"
								onClick={() => onSelect(option.abbr)}
								className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all ${
									isSelected ?
										'bg-red-500/12 ring-1 ring-red-500/20'
									:	'hover:bg-white/6'
								}`}
							>
								<div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/50 shrink-0">
									<Image
										src={
											getTelemetryDriverImage(option.abbr, 2026) ||
											`/images/drivers/${option.abbr}.png`
										}
										alt={option.abbr}
										fill
										sizes="48px"
										className="object-cover object-top"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-bold text-white">
											{option.abbr}
										</span>
										<span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-gray-300">
											G{option.gridPosition}
										</span>
										{option.currentPosition && (
											<span className="text-[10px] font-medium text-gray-400">
												P{option.currentPosition}
											</span>
										)}
									</div>
									<p className="truncate text-[11px] text-gray-500">
										{option.info?.team || 'Current runner'}
									</p>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
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
	const { drivers, info, lap_starts } = data;
	const rp = data.race_positions;
	const secondLevel = data.second_level_timing || {};
	const driverCount = Object.keys(drivers).length;
	const durationSec = Math.max(0, Math.round(info?.duration_sec || 0));
	const maxSamples = Math.max(
		durationSec + 1,
		...Object.values(secondLevel).map((entry) => entry?.position?.length || 0),
		1
	);
	const gridBoard = buildGridBoard(drivers);

	const retiredAtSecond = {};
	for (const [abbr, drvInfo] of Object.entries(drivers)) {
		if (drvInfo.retired_at_sec != null) {
			retiredAtSecond[abbr] = Math.floor(Number(drvInfo.retired_at_sec));
		}
	}

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
		if (s === 0) {
			boards[s] = gridBoard.map((entry) => ({ ...entry }));
			continue;
		}

		const board = [];
		const timeSec = s;
		const currentLap = getLap(timeSec);

		for (const abbr of Object.keys(drivers)) {
			const drvInfo = drivers[abbr];
			const timingRow = secondLevel[abbr] || {};
			const timingIndex = getTimingSampleIndex(
				timeSec,
				Math.max(
					(timingRow.position?.length || 1) - 1,
					(timingRow.gap_ahead?.length || 1) - 1,
					(timingRow.gap_leader?.length || 1) - 1,
					(timingRow.progress_laps?.length || 1) - 1
				)
			);

			if (drvInfo.status === 'DNS') {
				board.push({
					abbr,
					position: driverCount,
					officialPos: driverCount,
					gridPosition: getDriverSortPosition(drvInfo, driverCount),
					laps: 0,
					progressLaps: 0,
					gapAhead: null,
					gapLeader: null,
					active: false,
					status: 'DNS',
				});
				continue;
			}

			const isRetired =
				abbr in retiredAtSecond && timeSec > retiredAtSecond[abbr];
			const secondLevelPos = Number(timingRow.position?.[timingIndex]);
			const gapAhead = Number(timingRow.gap_ahead?.[timingIndex]);
			const gapLeader = Number(timingRow.gap_leader?.[timingIndex]);
			const progressLaps = Number(timingRow.progress_laps?.[timingIndex]);

			let officialPos = null;
			if (Number.isFinite(secondLevelPos) && secondLevelPos > 0) {
				officialPos = secondLevelPos;
			} else if (rp && rp[abbr]) {
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
			} else {
				officialPos = drvInfo.grid_position || driverCount;
			}

			if (isRetired && drvInfo.finish_position) {
				officialPos = drvInfo.finish_position;
			}

			const finalStatus = drvInfo.status || '';
			const isDNFType = finalStatus === 'DNF' || finalStatus === 'DSQ';
			const dynamicStatus =
				isDNFType ?
					isRetired ? finalStatus
					:	''
				:	finalStatus;

			board.push({
				abbr,
				laps:
					Number.isFinite(progressLaps) ?
						Math.max(1, Math.floor(progressLaps))
					:	currentLap,
				progressLaps: Number.isFinite(progressLaps) ? progressLaps : currentLap,
				active: !isRetired,
				status: dynamicStatus,
				officialPos,
				gridPosition: getDriverSortPosition(
					drvInfo,
					officialPos || driverCount
				),
				gapAhead: Number.isFinite(gapAhead) ? gapAhead : null,
				gapLeader: Number.isFinite(gapLeader) ? gapLeader : null,
			});
		}

		board.sort((a, b) => {
			if (a.status === 'DNS' && b.status !== 'DNS') return 1;
			if (b.status === 'DNS' && a.status !== 'DNS') return -1;
			if (!a.active && !b.active) {
				const aFp = drivers[a.abbr]?.finish_position ?? 99;
				const bFp = drivers[b.abbr]?.finish_position ?? 99;
				return aFp - bFp;
			}
			if (!a.active) return 1;
			if (!b.active) return -1;
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

function drawLeaderCrownBadge(ctx, px, py, dotR, canvasWidth) {
	const placeOnRight = px < canvasWidth - 34;
	const badgeX = placeOnRight ? px + dotR + 14 : px - dotR - 14;
	const badgeY = py;

	ctx.save();
	ctx.beginPath();
	ctx.arc(badgeX, badgeY, 9, 0, Math.PI * 2);
	ctx.fillStyle = 'rgba(5, 5, 5, 0.86)';
	ctx.fill();
	ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
	ctx.lineWidth = 1.25;
	ctx.stroke();

	ctx.translate(badgeX, badgeY + 0.5);
	ctx.beginPath();
	ctx.moveTo(-5.5, 3.5);
	ctx.lineTo(-4.5, -2.5);
	ctx.lineTo(-1.5, 0.2);
	ctx.lineTo(0, -4.5);
	ctx.lineTo(1.5, 0.2);
	ctx.lineTo(4.5, -2.5);
	ctx.lineTo(5.5, 3.5);
	ctx.closePath();
	ctx.fillStyle = '#fbbf24';
	ctx.shadowColor = '#fbbf24';
	ctx.shadowBlur = 10;
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(-5.8, 4.3);
	ctx.lineTo(5.8, 4.3);
	ctx.strokeStyle = '#f59e0b';
	ctx.lineWidth = 1.4;
	ctx.stroke();
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
	driverImages,
	showLeaderCrown,
	activeBattle
) {
	const sr = data.info.sample_rate || 1;
	const drivers = data.drivers;
	const positions = data.positions;

	const posMap = {};
	if (currentBoard) for (const e of currentBoard) posMap[e.abbr] = e;
	const leaderAbbr = currentBoard?.[0]?.abbr;

	const hasSelection = !!selectedDriver;
	const battleDriverSet =
		activeBattle ?
			new Set([activeBattle.attacker, activeBattle.target])
		:	new Set();
	const renderedCoords = {};

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
		const isBattleDriver = battleDriverSet.has(abbr);

		const dotR =
			isSelected ? 8
			: isBattleDriver ? 7
			: isLeader ? 7
			: 5;
		const glowBlur =
			isSelected ? 24
			: isBattleDriver ? 18
			: isLeader ? 16
			: 10;

		ctx.save();
		ctx.globalAlpha = dimmed ? 0.72 : 1.0;

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

		if (isBattleDriver) {
			const pulse = 0.8 + Math.sin(t * 8) * 0.18;
			ctx.save();
			ctx.beginPath();
			ctx.arc(px, py, dotR + 5 + pulse, 0, Math.PI * 2);
			ctx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
			ctx.lineWidth = 2;
			ctx.shadowColor = 'rgba(251, 113, 133, 0.75)';
			ctx.shadowBlur = 16;
			ctx.stroke();
			ctx.restore();
		}

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

		if (isLeader && showLeaderCrown) {
			drawLeaderCrownBadge(ctx, px, py, dotR, w);
		}

		if (isBattleDriver) {
			renderedCoords[abbr] = { px, py };
		}

		ctx.restore(); // globalAlpha
	}

	if (activeBattle) {
		const attackerCoords = renderedCoords[activeBattle.attacker];
		const targetCoords = renderedCoords[activeBattle.target];
		if (attackerCoords && targetCoords) {
			const midX = (attackerCoords.px + targetCoords.px) / 2;
			const midY = (attackerCoords.py + targetCoords.py) / 2 - 22;
			const label = `BATTLE P${activeBattle.position}`;

			ctx.save();
			ctx.beginPath();
			ctx.moveTo(targetCoords.px, targetCoords.py);
			ctx.lineTo(attackerCoords.px, attackerCoords.py);
			ctx.strokeStyle = 'rgba(251, 113, 133, 0.8)';
			ctx.lineWidth = 2;
			ctx.setLineDash([6, 5]);
			ctx.shadowColor = 'rgba(251, 113, 133, 0.7)';
			ctx.shadowBlur = 14;
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.font = 'bold 10px Inter, system-ui, sans-serif';
			const labelWidth = ctx.measureText(label).width + 16;
			const labelX = Math.max(
				8,
				Math.min(w - labelWidth - 8, midX - labelWidth / 2)
			);
			const labelY = Math.max(10, midY);

			ctx.beginPath();
			if (ctx.roundRect) ctx.roundRect(labelX, labelY, labelWidth, 18, 6);
			else ctx.rect(labelX, labelY, labelWidth, 18);
			ctx.fillStyle = 'rgba(10, 10, 12, 0.9)';
			ctx.fill();
			ctx.strokeStyle = 'rgba(251, 113, 133, 0.7)';
			ctx.lineWidth = 1.2;
			ctx.stroke();

			ctx.fillStyle = '#fda4af';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(label, labelX + labelWidth / 2, labelY + 9);
			ctx.restore();
		}
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

	const { token, isAuthenticated } = useAuth();

	/* ── Selection state ── */
	const [selectedYear, setSelectedYear] = useState(
		hasInitialDeepLink ?
			String(initialDeepLinkYear)
		:	String(Math.min(new Date().getFullYear(), 2026))
	);
	const [schedule, setSchedule] = useState([]);
	const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
	const [scheduleError, setScheduleError] = useState('');

	const [selectedRace, setSelectedRace] = useState(null);

	/* ── Visualization state ── */
	const [sessionData, setSessionData] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(5);
	const [displayTime, setDisplayTime] = useState(0);
	const [selectedDriver, setSelectedDriver] = useState(null);
	const [lapInput, setLapInput] = useState('');
	const [genStatus, setGenStatus] = useState(null);
	const [controlsVisible, setControlsVisible] = useState(true);
	const [showTimingTower, setShowTimingTower] = useState(true);
	const [showRaceInsights, setShowRaceInsights] = useState(true);
	const [isReplayFullscreen, setIsReplayFullscreen] = useState(false);
	const [overtakeMeta, setOvertakeMeta] = useState(null);
	const [overtakeData, setOvertakeData] = useState(null);
	const [overtakeLoading, setOvertakeLoading] = useState(false);
	const [overtakeError, setOvertakeError] = useState('');
	const [overtakeAttacker, setOvertakeAttacker] = useState('');
	const [overtakeTarget, setOvertakeTarget] = useState('');
	const [openDriverPicker, setOpenDriverPicker] = useState(null);
	const [showBattleHUD, setShowBattleHUD] = useState(true);
	const [battleHUDPos, setBattleHUDPos] = useState({ x: 50, y: 12 }); // % percentage coordinates
	const [isDraggingHUD, setIsDraggingHUD] = useState(false);
	const dragHUDOffset = useRef({ x: 0, y: 0 });

	/* ── refs ── */
	const canvasRef = useRef(null);
	const replayShellRef = useRef(null);
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
	const activeBattleRef = useRef(null);

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
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsReplayFullscreen(
				document.fullscreenElement === replayShellRef.current
			);
		};
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () =>
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, []);

	/* ── Pre-compute race positions ── */
	const racePositions = useMemo(() => {
		if (!sessionData) return null;
		return precomputeRacePositions(sessionData);
	}, [sessionData]);

	useEffect(() => {
		racePositionsRef.current = racePositions;
	}, [racePositions]);

	const playbackSecond = useMemo(
		() =>
			getTimingSampleIndex(
				displayTime,
				Math.max(0, Math.round(sessionData?.info?.duration_sec || 0))
			),
		[displayTime, sessionData]
	);

	const currentBoard = useMemo(() => {
		if (!sessionData || !racePositions?.length) return null;
		const boardIndex = getTimingSampleIndex(
			playbackSecond,
			racePositions.length - 1
		);
		return racePositions[boardIndex] || null;
	}, [playbackSecond, racePositions, sessionData]);

	const activeFlags = useMemo(() => {
		if (!sessionData) return [];
		return getActiveFlags(sessionData.flags, playbackSecond);
	}, [playbackSecond, sessionData]);

	useEffect(() => {
		boardRef.current = currentBoard;
		activeFlagsRef.current = activeFlags;
	}, [activeFlags, currentBoard]);

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

	useEffect(() => {
		if (!sessionData) return;
		const controller = new AbortController();

		getOvertakeModelMetadata({ signal: controller.signal })
			.then((meta) => {
				if (!controller.signal.aborted) {
					setOvertakeMeta(meta);
					setOvertakeError('');
				}
			})
			.catch((err) => {
				if (err.name === 'AbortError' || err.name === 'CanceledError') return;
				console.error(err);
				setOvertakeMeta(null);
				setOvertakeError(
					err?.response?.data?.detail ||
						err.message ||
						'Unable to load overtake model metadata.'
				);
			});

		return () => controller.abort();
	}, [sessionData]);

	/* ── Fetch schedule when year changes ── */
	useEffect(() => {
		if (!selectedYear) {
			setSchedule([]);
			setScheduleError('');
			return;
		}

		// In industrial approach, we clear previous state but keep a separate loading indicator
		// to avoid flickering "No races found" messages.
		setSchedule([]);
		setSelectedRace(null);
		setSessionData(null);
		setGenStatus(null);
		setIsPlaying(false);
		setIsLoadingSchedule(true);
		setScheduleError('');

		const controller = new AbortController();

		getYearSchedule(parseInt(selectedYear), { signal: controller.signal })
			.then((list) => {
				if (!controller.signal.aborted) {
					setSchedule(list || []);
				}
			})
			.catch((err) => {
				if (err.name === 'AbortError' || err.name === 'CanceledError') return;
				console.error('Schedule fetch error:', err);
				setScheduleError(err.message || 'Failed to load season schedule.');
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsLoadingSchedule(false);
				}
			});

		return () => {
			controller.abort();
		};
	}, [selectedYear]);

	useEffect(() => {
		const deepLink = deepLinkSelectionRef.current;
		if (!deepLink) return;
		if (Number(selectedYear) !== deepLink.year) return;

		const race = schedule.find((item) => item.round === deepLink.round);
		if (!race) return;

		setSelectedRace({ year: deepLink.year, round: deepLink.round });
		deepLinkSelectionRef.current = null;
	}, [schedule, selectedYear]);

	/* ── Fetch session data when a race is selected ── */
	useEffect(() => {
		if (!selectedRace) return;
		const { year, round } = selectedRace;
		const controller = new AbortController();

		setSessionData(null);
		setSelectedDriver(null);
		setGenStatus(null);
		setOvertakeData(null);
		setOvertakeError('');
		setOvertakeAttacker('');
		setOvertakeTarget('');
		setIsPlaying(false);
		timeRef.current = 0;
		setDisplayTime(0);

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

					if (isAuthenticated && token) {
						logActivity(token, {
							activity_type: 'Simulation',
							title: `Track Visualizer: Round ${round}`,
							subtitle: `${year} · ${d.circuit_info?.name || 'Grand Prix'}`,
							image_url: '/images/cars/2026mclarencarright.png',
							color_hex: '#FF8000',
							reference_url: `/track?year=${year}&round=${round}`,
						}).catch(console.error);
					}
				}
			})
			.catch((err) => {
				if (err.name === 'AbortError' || err.name === 'CanceledError') return;
				if (err?.response?.status === 401 || err?.response?.status === 403) {
					setGenStatus({
						status: 'error',
						message: 'Please sign in to load this track session.',
					});
					return;
				}
				console.error(err);
				setGenStatus({ status: 'error', message: err.message });
			});

		return () => {
			controller.abort();
		};
	}, [selectedRace, isAuthenticated, token]);

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
				driverImagesRef.current,
				shouldShowLeaderCrown(activeFlagsRef.current),
				activeBattleRef.current
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

	const toggleReplayFullscreen = useCallback(async () => {
		const shell = replayShellRef.current;
		if (!shell) return;

		try {
			if (document.fullscreenElement === shell) {
				await document.exitFullscreen();
			} else {
				await shell.requestFullscreen();
			}
			setControlsVisible(true);
		} catch (error) {
			console.error('Unable to toggle fullscreen replay.', error);
		}
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

	/* ── Draggable HUD logic ── */
	const handleHUDMouseDown = useCallback((e) => {
		if (e.button !== 0) return; // Only left click
		const rect = e.currentTarget.getBoundingClientRect();
		dragHUDOffset.current = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
		setIsDraggingHUD(true);
	}, []);

	useEffect(() => {
		if (!isDraggingHUD) return;

		const handleMouseMove = (e) => {
			const container = replayShellRef.current;
			if (!container) return;

			const rect = container.getBoundingClientRect();
			let x =
				((e.clientX - rect.left - dragHUDOffset.current.x + rect.width * 0) /
					rect.width) *
				100;
			let y =
				((e.clientY - rect.top - dragHUDOffset.current.y) / rect.height) * 100;

			// Clamp bounds
			x = Math.max(5, Math.min(95, x));
			y = Math.max(5, Math.min(95, y));

			setBattleHUDPos({ x, y });
		};

		const handleMouseUp = () => setIsDraggingHUD(false);

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDraggingHUD]);

	/* ── Derived values ── */
	const lapNum =
		sessionData ? getCurrentLap(sessionData.lap_starts, playbackSecond) : 0;
	const isPreRaceState = playbackSecond === 0;
	const completedLaps = getCompletedLapCount(lapNum, isPreRaceState);
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
	const showLeaderCrown = shouldShowLeaderCrown(activeFlags);
	const visibleFastestLap = useMemo(
		() => getVisibleFastestLap(sessionData, playbackSecond),
		[playbackSecond, sessionData]
	);
	const isNeutralizedRaceState =
		!isPreRaceState &&
		activeFlags.some((flag) =>
			['Yellow', 'DoubleYellow', 'SC', 'VSC', 'Red'].includes(flag.type)
		);

	const adjacentBattles = useMemo(() => {
		if (!currentBoard?.length || completedLaps < 1 || isNeutralizedRaceState)
			return [];
		const pairs = [];

		for (let idx = 1; idx < currentBoard.length; idx++) {
			const attacker = currentBoard[idx];
			const target = currentBoard[idx - 1];
			if (
				!isRaceOrderEntryActive(attacker) ||
				!isRaceOrderEntryActive(target)
			) {
				continue;
			}

			const gap =
				attacker.gapAhead ??
				computeGapToAhead(sessionData?.lap_times, currentBoard, idx, lapNum);
			if (gap == null || !Number.isFinite(Number(gap))) continue;

			pairs.push({
				attacker: attacker.abbr,
				target: target.abbr,
				attackerPosition: attacker.position,
				targetPosition: target.position,
				position: target.position,
				gap: Number(gap),
				intensity: Number(gap) <= 0.3 ? 'intense' : 'tracking',
			});
		}

		return pairs.sort((a, b) => a.gap - b.gap);
	}, [
		completedLaps,
		currentBoard,
		isNeutralizedRaceState,
		lapNum,
		sessionData,
	]);

	const activeBattle = useMemo(
		() => adjacentBattles.find((pair) => pair.gap <= 1.2) || null,
		[adjacentBattles]
	);

	useEffect(() => {
		activeBattleRef.current = activeBattle;
	}, [activeBattle]);

	const battleDrivers = useMemo(() => {
		if (!activeBattle) return new Set();
		return new Set([activeBattle.attacker, activeBattle.target]);
	}, [activeBattle]);

	const activeRaceDriverCodes = useMemo(() => {
		const codes = new Set();
		for (const entry of currentBoard || []) {
			if (isRaceOrderEntryActive(entry)) codes.add(entry.abbr);
		}
		return codes;
	}, [currentBoard]);

	const gridDriverOptions = useMemo(() => {
		if (!sessionData?.drivers) return [];
		return Object.entries(sessionData.drivers)
			.map(([abbr, info], index) => ({
				abbr,
				info,
				gridPosition: getDriverSortPosition(info, driverCount + index + 1),
				currentPosition: posMap[abbr]?.position ?? null,
			}))
			.sort((a, b) => a.gridPosition - b.gridPosition);
	}, [driverCount, posMap, sessionData]);

	const activeGridDriverOptions = useMemo(
		() =>
			gridDriverOptions.filter((driver) =>
				activeRaceDriverCodes.has(driver.abbr)
			),
		[activeRaceDriverCodes, gridDriverOptions]
	);

	const effectiveOvertakeAttacker = overtakeAttacker || '';
	const effectiveOvertakeTarget = overtakeTarget || '';

	useEffect(() => {
		if (!overtakeAttacker && !overtakeTarget) return;

		const attackerEntry = currentBoard?.find(
			(entry) => entry.abbr === overtakeAttacker
		);
		const targetEntry = currentBoard?.find(
			(entry) => entry.abbr === overtakeTarget
		);
		const selectionStillValid =
			(!overtakeAttacker || isDriverSelectableForOvertake(attackerEntry)) &&
			(!overtakeTarget || isDriverSelectableForOvertake(targetEntry)) &&
			(!overtakeAttacker ||
				!overtakeTarget ||
				attackerEntry?.position > targetEntry?.position);

		if (!selectionStillValid) {
			queueMicrotask(() => {
				setOvertakeAttacker('');
				setOvertakeTarget('');
			});
		}
	}, [currentBoard, overtakeAttacker, overtakeTarget]);

	useEffect(() => {
		if (!sessionData || !selectedRace) {
			queueMicrotask(() => {
				setOvertakeLoading(false);
				setOvertakeData(null);
			});
			return;
		}

		let fetchAttacker = effectiveOvertakeAttacker || undefined;
		let fetchTarget = effectiveOvertakeTarget || undefined;

		// Industrial rule: Backend rejects partial pairs (422 XOR check).
		// Either specify both different drivers or specify neither to get 'Top N' defaults.
		if (fetchAttacker && fetchTarget && fetchAttacker === fetchTarget) {
			queueMicrotask(() => {
				setOvertakeError(
					'Choose two different drivers for the overtake simulation.'
				);
			});
			fetchAttacker = undefined;
			fetchTarget = undefined;
		} else if (!!fetchAttacker !== !!fetchTarget) {
			// Partial selection: wait until both are picked before sending manual overrides to API
			fetchAttacker = undefined;
			fetchTarget = undefined;
		}

		const controller = new AbortController();
		queueMicrotask(() => {
			if (!controller.signal.aborted) {
				setOvertakeLoading(true);
				setOvertakeError('');
			}
		});

		getOvertakeProbabilities(selectedRace.year, selectedRace.round, {
			lap: Math.max(1, getCurrentLap(sessionData.lap_starts, playbackSecond)),
			timeSec: playbackSecond,
			topN: 8,
			attackerDriver: fetchAttacker,
			targetDriver: fetchTarget,
			signal: controller.signal,
		})
			.then((result) => {
				if (!controller.signal.aborted) {
					setOvertakeData(result);
				}
			})
			.catch((err) => {
				if (err.name === 'AbortError' || err.name === 'CanceledError') return;
				console.error(err);
				setOvertakeData(null);
				setOvertakeError(
					err?.response?.data?.detail ||
						err.message ||
						'Unable to calculate overtake probabilities.'
				);
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setOvertakeLoading(false);
				}
			});

		return () => controller.abort();
	}, [
		effectiveOvertakeAttacker,
		effectiveOvertakeTarget,
		playbackSecond,
		selectedRace,
		sessionData,
	]);

	const selectedOvertakePair = overtakeData?.selected_pair || null;
	const topOvertakePairs = useMemo(() => {
		const pairs = Array.isArray(overtakeData?.pairs) ? overtakeData.pairs : [];
		const activePairs = pairs.filter(
			(pair) =>
				activeRaceDriverCodes.has(pair.attacker_driver) &&
				activeRaceDriverCodes.has(pair.target_driver)
		);
		const immediateBattles = activePairs.filter(
			(pair) =>
				Number(pair.cars_between || 0) === 0 &&
				Number(pair.attacker_gap_ahead ?? Infinity) <= 1.5
		);
		return immediateBattles.length > 0 ? immediateBattles : activePairs;
	}, [activeRaceDriverCodes, overtakeData]);
	const displayedOvertakePair =
		selectedOvertakePair || topOvertakePairs[0] || null;

	const isVisualizing = !!selectedRace;

	/* ============================= RENDER ============================= */
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-16 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-linear-to-b from-black/90 via-black/80 to-black/90 z-0" />

			<div className="relative z-10 max-w-[1600px] mx-auto pb-12">
				{/* ────── Header ────── */}
				<div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 backdrop-blur-2xl bg-linear-to-r from-red-300/10 to-black/10 border border-white/10 rounded-xl px-6 py-4 w-full">
					<div className="flex items-center gap-4 animate-fade-in">
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

						{isLoadingSchedule ?
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
								{Array.from({ length: 12 }).map((_, i) => (
									<div
										key={i}
										className="h-[130px] rounded-xl border border-white/5 bg-white/5 animate-pulse flex flex-col p-4 justify-between"
									>
										<div className="flex justify-between items-start">
											<div className="h-3 w-20 bg-white/10 rounded" />
											<div className="h-4 w-12 bg-white/10 rounded-full" />
										</div>
										<div className="h-4 w-3/4 bg-white/10 rounded" />
										<div className="flex justify-between">
											<div className="h-3 w-24 bg-white/10 rounded" />
											<div className="h-4 w-14 bg-white/10 rounded-full" />
										</div>
									</div>
								))}
							</div>
						: scheduleError ?
							<div className="flex flex-col items-center justify-center h-64 text-center">
								<FaExclamationTriangle className="text-3xl text-red-500/50 mb-4" />
								<p className="text-red-400 text-sm">{scheduleError}</p>
								<button
									onClick={() => setSelectedYear(selectedYear)} // Trigger retry
									className="mt-4 text-xs text-gray-400 hover:text-white underline"
								>
									Try again
								</button>
							</div>
						: schedule.length === 0 ?
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
										<div
											key={`${race.year}_${race.round}`}
											role="button"
											tabIndex={isPast ? 0 : -1}
											aria-disabled={!isPast}
											onClick={() => {
												if (isPast) handleSelectRace(race);
											}}
											onKeyDown={(event) => {
												if (!isPast) return;
												if (event.key === 'Enter' || event.key === ' ') {
													event.preventDefault();
													handleSelectRace(race);
												}
											}}
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
										</div>
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
									<FaFlagCheckered className="text-white/80 text-sm" />
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
											<div className="w-48 h-1.5 rounded-full bg-white/5 overflow-hidden">
												<div className="h-full w-1/2 bg-red-600/60 animate-shimmer" />
											</div>
											<div className="flex gap-1.5 mt-2">
												{[0, 1, 2].map((i) => (
													<div
														key={i}
														className="w-1.5 h-1.5 rounded-full bg-red-600/40"
														style={{
															animation: `pulse 1.6s ease-in-out ${i * 0.2}s infinite`,
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
						<div
							ref={replayShellRef}
							className={
								isReplayFullscreen ?
									'h-full w-full bg-[#050505] p-3 sm:p-4'
								:	''
							}
						>
							<div
								className={`grid gap-0 rounded-2xl overflow-hidden shadow-2xl border border-white/6 ${
									showTimingTower ?
										'grid-cols-1 xl:grid-cols-[270px_minmax(0,1fr)]'
									:	'grid-cols-1'
								} ${isReplayFullscreen ? 'h-full' : ''}`}
							>
								{/* ===== LEFT: F1-Style Driver Tower ===== */}
								{showTimingTower && (
									<div className="bg-[#0d0d0d] xl:border-r border-white/8 flex flex-col overflow-hidden">
										{/* Tower Header */}
										<div className="px-3 py-2.5 border-b border-white/8 bg-[#111] shrink-0">
											<div className="flex items-center justify-between">
												<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
													Race Order
												</h3>
												<div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/6">
													<span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">
														{isPreRaceState ? 'Grid' : 'Lap'}
													</span>
													<span className="text-[12px] font-bold text-white tabular-nums">
														{isPreRaceState ? 'Q' : lapNum}
													</span>
													{!isPreRaceState && (
														<span className="text-[9px] text-gray-600">
															/ {totalLaps}
														</span>
													)}
												</div>
											</div>
										</div>

										{/* Driver Rows */}
										<div
											className="flex-1 overflow-y-auto relative"
											style={{
												minHeight:
													isReplayFullscreen ? 0 : (
														Math.min(driverCount * ROW_H, 600)
													),
											}}
										>
											{Object.entries(sessionData.drivers).map(
												([abbr, info]) => {
													const pe = posMap[abbr];
													const pos = pe?.position ?? driverCount;
													const isLeader = pos === 1;
													const isSel = abbr === selectedDriver;
													const isBattleDriver = battleDrivers.has(abbr);
													const isActive = pe?.active !== false;
													const drvStatus = pe?.status || '';
													const isDNF = drvStatus === 'DNF';
													const isDNS = drvStatus === 'DNS';
													const isDSQ = drvStatus === 'DSQ';
													const isRetired = isDNF || isDNS || isDSQ;

													const lastLap =
														isPreRaceState ? null : (
															getLastLapTime(
																sessionData.lap_times,
																abbr,
																lapNum
															)
														);
													const isFastestOverall =
														!isPreRaceState && visibleFastestLap?.abbr === abbr;

													const driverIdx =
														currentBoard?.findIndex((e) => e.abbr === abbr) ??
														-1;
													const gap =
														pe?.gapAhead ??
														computeGapToAhead(
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
														${
															isSel ? 'bg-white/10 ring-1 ring-white/20'
															: isBattleDriver ?
																'bg-red-500/8 ring-1 ring-red-400/20 hover:bg-red-500/12'
															:	'hover:bg-white/5'
														}
														${
															isDNS ? 'opacity-45'
															: isRetired ? 'opacity-60'
															: !isActive ? 'opacity-75'
															: ''
														}`}
															>
																{/* Position */}
																<div
																	className={`w-6 text-center shrink-0 text-[11px] font-black tabular-nums ${isLeader ? 'text-white' : 'text-gray-500'}`}
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
																	:	pos}
																</div>

																{/* Team color bar */}
																<div
																	className="w-[3px] h-5 rounded-full shrink-0 mx-1"
																	style={{
																		backgroundColor:
																			isRetired ? '#444' : info.color,
																	}}
																/>

																{/* Driver info */}
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-1">
																		<span
																			className={`text-[11px] font-bold leading-none ${
																				isSel ? 'text-white'
																				: isRetired ? 'text-gray-300'
																				: 'text-gray-200'
																			}`}
																		>
																			{abbr}
																		</span>
																		{showLeaderCrown && isLeader && (
																			<FaCrown className="text-[9px] text-yellow-300 shrink-0" />
																		)}
																		{isBattleDriver && (
																			<span
																				className={`rounded-full px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.18em] ${
																					(
																						activeBattle?.intensity ===
																						'intense'
																					) ?
																						'border border-red-400/25 bg-red-500/10 text-red-200'
																					:	'border border-amber-400/25 bg-amber-500/10 text-amber-100'
																				}`}
																			>
																				Battle P{activeBattle?.position}
																			</span>
																		)}
																		{isFastestOverall && (
																			<FaStopwatch
																				className="text-[9px] text-purple-400 shrink-0"
																				title="Fastest lap"
																			/>
																		)}
																		{isDNF && (
																			<span className="text-[6px] font-bold text-red-400/85">
																				DNF
																			</span>
																		)}
																		{isDNS && (
																			<span className="text-[6px] font-bold text-gray-400">
																				DNS
																			</span>
																		)}
																	</div>
																	{!isRetired &&
																		lastLap != null &&
																		lapNum > 0 && (
																			<span
																				className={`text-[10px] font-semibold font-mono leading-none mt-0.5 block tabular-nums ${
																					isFastestOverall ? 'text-purple-400'
																					: isBattleDriver ? 'text-red-100'
																					: 'text-gray-300'
																				}`}
																			>
																				{formatLapTime(lastLap)}
																			</span>
																		)}
																</div>

																{/* Interval */}
																<div className="shrink-0 text-right">
																	{isPreRaceState && !isRetired ?
																		<span className="inline-flex min-w-[3.7rem] justify-center rounded-md border border-white/8 bg-white/4 px-2 py-1 text-[8px] font-bold text-gray-300/90 leading-none tracking-[0.2em]">
																			GRID
																		</span>
																	: isLeader && !isRetired ?
																		<span className="inline-flex min-w-[3.7rem] justify-center rounded-md border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[8px] font-bold text-yellow-300 leading-none tracking-[0.18em]">
																			LEAD
																		</span>
																	: !isLeader && !isRetired && gap != null ?
																		<span
																			className={`inline-flex min-w-[3.9rem] justify-end rounded-md border px-2 py-1 text-[10px] font-semibold font-mono leading-none tabular-nums tracking-[0.06em] ${
																				(
																					isBattleDriver &&
																					activeBattle?.intensity === 'intense'
																				) ?
																					'border-red-400/25 bg-red-500/12 text-red-50'
																				: isBattleDriver ?
																					'border-amber-400/25 bg-amber-500/10 text-amber-50'
																				:	'border-white/8 bg-white/4 text-gray-100'
																			}`}
																		>
																			{formatGapValue(gap)}
																		</span>
																	: isRetired && isDNF && info.laps_completed ?
																		<span className="inline-flex min-w-[3.7rem] justify-center rounded-md border border-red-500/15 bg-red-500/8 px-2 py-1 text-[8px] font-mono text-red-300/75 leading-none">
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
												}
											)}
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
														completedLaps
													);
													const lastLapSel = getLastLapTime(
														sessionData.lap_times,
														selectedDriver,
														isPreRaceState ? 0 : lapNum
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
								)}

								{/* ===== RIGHT: Canvas + Overlays ===== */}
								<div className="relative bg-[#0a0a0a] overflow-hidden min-w-0">
									{/* Canvas container */}
									<div
										style={
											isReplayFullscreen ?
												{ height: '100%' }
											:	{ aspectRatio: '16 / 9' }
										}
										className={`w-full relative group ${isReplayFullscreen ? 'h-full min-h-[420px]' : ''} ${!controlsVisible ? 'cursor-none' : ''}`}
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
											style={{
												display: 'block',
												width: '100%',
												height: '100%',
											}}
										/>

										<div className="absolute top-3 right-3 z-30 flex items-center gap-2">
											<button
												type="button"
												onClick={() => setShowTimingTower((prev) => !prev)}
												className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
													showTimingTower ?
														'border-cyan-400/25 bg-cyan-400/10 text-cyan-100'
													:	'border-white/10 bg-black/45 text-gray-300 hover:text-white'
												}`}
											>
												Tower
											</button>
											<button
												type="button"
												onClick={() => setShowRaceInsights((prev) => !prev)}
												className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
													showRaceInsights ?
														'border-red-400/25 bg-red-400/10 text-red-100'
													:	'border-white/10 bg-black/45 text-gray-300 hover:text-white'
												}`}
											>
												Insights
											</button>
											<button
												type="button"
												onClick={() => setShowBattleHUD((prev) => !prev)}
												className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
													showBattleHUD ?
														'border-amber-400/25 bg-amber-400/10 text-amber-100'
													:	'border-white/10 bg-black/45 text-gray-300 hover:text-white'
												}`}
											>
												Battle
											</button>
											<button
												type="button"
												onClick={toggleReplayFullscreen}
												className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-100 transition-all hover:border-white/20 hover:bg-black/70"
											>
												{isReplayFullscreen ?
													<FaCompress className="text-[10px]" />
												:	<FaExpand className="text-[10px]" />}
												{isReplayFullscreen ? 'Exit' : 'Fullscreen'}
											</button>
										</div>

										{activeBattle && showBattleHUD && (
											<div
												className={`absolute z-40 transition-shadow duration-300 ${isDraggingHUD ? 'scale-[1.02] shadow-2xl cursor-grabbing' : 'cursor-grab'}`}
												style={{
													left: `${battleHUDPos.x}%`,
													top: `${battleHUDPos.y}%`,
													transform: 'translateX(-50%)',
													userSelect: 'none',
												}}
												onMouseDown={handleHUDMouseDown}
											>
												<div
													className={`flex items-center gap-3 rounded-2xl px-3 py-2 shadow-2xl backdrop-blur-md relative group/hud ${
														activeBattle.intensity === 'intense' ?
															'border border-red-400/20 bg-black/82'
														:	'border border-amber-400/20 bg-black/78'
													}`}
												>
													{/* Close tool */}
													<button
														onClick={(e) => {
															e.stopPropagation();
															setShowBattleHUD(false);
														}}
														className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/hud:opacity-100 transition-opacity z-50 hover:bg-red-500"
													>
														<FaTimes className="text-[7px]" />
													</button>

													<div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/50 shrink-0">
														<Image
															src={
																getTelemetryDriverImage(
																	activeBattle.target,
																	2026
																) ||
																`/images/drivers/${activeBattle.target}.png`
															}
															alt={activeBattle.target}
															fill
															sizes="48px"
															className="object-cover object-top pointer-events-none"
														/>
													</div>
													<div className="min-w-40 text-center">
														<div
															className={`text-[9px] font-bold uppercase tracking-[0.24em] ${
																activeBattle.intensity === 'intense' ?
																	'text-red-200/80'
																:	'text-amber-200/80'
															}`}
														>
															Battle for P{activeBattle.position}
														</div>
														<div className="mt-1 text-sm font-black text-white">
															{activeBattle.target} vs {activeBattle.attacker}
														</div>
														<div
															className={`mt-0.5 text-[10px] font-mono ${
																activeBattle.intensity === 'intense' ?
																	'text-red-100/85'
																:	'text-amber-100/85'
															}`}
														>
															Gap {formatGapValue(activeBattle.gap)}
														</div>
													</div>
													<div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/50 shrink-0">
														<Image
															src={
																getTelemetryDriverImage(
																	activeBattle.attacker,
																	2026
																) ||
																`/images/drivers/${activeBattle.attacker}.png`
															}
															alt={activeBattle.attacker}
															fill
															sizes="48px"
															className="object-cover object-top pointer-events-none"
														/>
													</div>
												</div>
											</div>
										)}

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
										{showRaceInsights && visibleInsights.length > 0 && (
											<div
												className={`absolute top-14 right-3 z-20 overflow-y-auto bg-black/70 backdrop-blur-md rounded-xl border border-white/8 shadow-2xl ${
													isReplayFullscreen ?
														'w-[24rem] max-h-[68%]'
													:	'w-80 max-h-[56%]'
												}`}
											>
												<div className="px-4 py-3 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-10 rounded-t-xl">
													<h4 className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-300 flex items-center gap-2">

														Race Insights
													</h4>
													<span className="text-[9px] text-gray-500 font-mono">
														{visibleInsights.length}
													</span>
												</div>
												<div className="px-2 py-2">
													{[...visibleInsights]
														.reverse()
														.slice(0, 20)
														.map((evt, i) => {
															const iconMap = {
																flag: (
																	<FaFlagCheckered className="text-[7px]" />
																),
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
																	className={`mb-1.5 rounded-lg border bg-white/4 px-3 py-2 transition-all ${typeColorMap[evt.type] || 'border-white/6'}`}
																>
																	<div className="flex items-start gap-2">
																		<div
																			className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
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
																			<div className="flex items-center gap-1.5">
																				<span
																					className="text-[10px] font-bold leading-none"
																					style={{ color: evt.color || '#ccc' }}
																				>
																					{evt.title}
																				</span>
																				<span className="text-[8px] text-gray-500 font-mono">
																					L{evt.lap}
																				</span>
																			</div>
																			<p className="mt-1 text-[9px] text-gray-300 leading-snug">
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
															timeRef.current = Math.max(
																0,
																timeRef.current - 5
															);
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

						<div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
							<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/6 p-5">
								<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
									<div>
										<div className="flex items-center gap-2">
											<div className="w-9 h-9 rounded-xl bg-blue-500/12 border border-blue-500/20 flex items-center justify-center">
												<FaExchangeAlt className="text-blue-300 text-sm" />
											</div>
											<div>
												<h3 className="text-sm font-bold text-white">
													Overtake Simulator
												</h3>
												<p className="text-[11px] text-gray-500 mt-0.5">
													Simulate the next move between any two drivers on the
													grid using the deployed model metadata.
												</p>
											</div>
										</div>
										<div className="flex flex-wrap gap-2 mt-3">
											<span className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] font-medium text-gray-300">
												Model {overtakeMeta?.best_model_name || '—'}
											</span>
											<span className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] font-medium text-gray-300">
												Horizon{' '}
												{overtakeData?.horizon_laps ||
													overtakeMeta?.horizon_laps ||
													'—'}{' '}
												laps
											</span>
											<span className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] font-medium text-gray-300">
												Mode {overtakeData?.source_mode || '—'}
											</span>
											<span className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] font-medium text-gray-300">
												Features{' '}
												{(overtakeMeta?.numeric_features?.length || 0) +
													(overtakeMeta?.categorical_features?.length || 0)}
											</span>
										</div>
									</div>
									{overtakeMeta?.test_metrics && (
										<div className="grid grid-cols-2 gap-2 min-w-[220px]">
											<div className="rounded-xl bg-black/30 border border-white/8 px-3 py-2">
												<div className="text-[9px] uppercase tracking-[0.18em] text-gray-600">
													ROC AUC
												</div>
												<div className="text-sm font-bold text-white mt-1">
													{overtakeMeta.test_metrics.roc_auc?.toFixed?.(3) ||
														'—'}
												</div>
											</div>
											<div className="rounded-xl bg-black/30 border border-white/8 px-3 py-2">
												<div className="text-[9px] uppercase tracking-[0.18em] text-gray-600">
													PR AUC
												</div>
												<div className="text-sm font-bold text-white mt-1">
													{overtakeMeta.test_metrics.pr_auc?.toFixed?.(3) ||
														'—'}
												</div>
											</div>
										</div>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
									<div className="relative z-20">
										<CustomOvertakeDropdown
											label="Attacker"
											value={effectiveOvertakeAttacker}
											options={activeGridDriverOptions}
											onChange={(val) => setOvertakeAttacker(val)}
											placeholder="Select attacker"
										/>
									</div>
									<div className="relative z-10">
										<CustomOvertakeDropdown
											label="Target"
											value={effectiveOvertakeTarget}
											options={activeGridDriverOptions}
											onChange={(val) => setOvertakeTarget(val)}
											placeholder="Select target"
										/>
									</div>
								</div>

								<div className="mt-4 rounded-2xl border border-white/8 bg-black/30 p-4 min-h-[180px] relative overflow-hidden">
									{/* Industrial approach: Subtle loading overlay instead of replacing content with text */}
									{overtakeLoading && (
										<div className="absolute inset-x-0 top-0 h-1 z-30 overflow-hidden">
											<div className="h-full w-full bg-blue-500/10">
												<div className="h-full w-1/3 bg-blue-500/40 animate-shimmer" />
											</div>
										</div>
									)}

									{selectedOvertakePair ?
										<div>
											<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
												<div>
													<div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
														Selected Pair
													</div>
													<div className="text-xl font-bold text-white mt-1">
														{selectedOvertakePair.attacker_driver} vs{' '}
														{selectedOvertakePair.target_driver}
													</div>
													<p className="text-sm text-gray-400 mt-1">
														P{selectedOvertakePair.attacker_pos} attacking P
														{selectedOvertakePair.target_pos} with{' '}
														{selectedOvertakePair.cars_between} car
														{selectedOvertakePair.cars_between === 1 ?
															''
														:	's'}{' '}
														between.
													</p>
												</div>
												<div className="rounded-2xl bg-blue-500/12 border border-blue-500/20 px-4 py-3 min-w-[180px]">
													<div className="text-[10px] uppercase tracking-[0.2em] text-blue-200/70">
														Chance In Horizon
													</div>
													<div className="text-3xl font-black text-blue-300 mt-1">
														{formatProbability(selectedOvertakePair.p_overtake)}
													</div>
												</div>
											</div>

											<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
												<div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
													<div className="text-[9px] uppercase tracking-[0.18em] text-gray-600">
														Striking Distance
													</div>
													<div className="text-sm font-mono text-white mt-1">
														{formatGapValue(
															selectedOvertakePair.attacker_gap_ahead
														)}
													</div>
												</div>
												<div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
													<div className="text-[9px] uppercase tracking-[0.18em] text-gray-600">
														Cars Between
													</div>
													<div className="text-sm font-mono text-white mt-1">
														{selectedOvertakePair.cars_between}
													</div>
												</div>
												<div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
													<div className="text-[9px] uppercase tracking-[0.18em] text-gray-600">
														Lap Time Delta
													</div>
													<div className="text-sm font-mono text-white mt-1">
														{formatGapValue(
															selectedOvertakePair.pace_advantage,
															{
																showPlus: true,
															}
														)}
													</div>
												</div>
												<div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
													<div className="text-[9px] uppercase tracking-[0.18em] text-gray-600">
														Track Context
													</div>
													<div className="text-sm text-white mt-1">
														{selectedOvertakePair.flag_type || 'Green'}
													</div>
												</div>
											</div>

											<div className="flex flex-wrap gap-2 mt-4">
												<span className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] text-gray-300">
													Attacker tyre {selectedOvertakePair.attacker_compound}
												</span>
												<span className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] text-gray-300">
													Target tyre {selectedOvertakePair.target_compound}
												</span>
												<span className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] text-gray-300">
													DRS proxy{' '}
													{selectedOvertakePair.drs_window_proxy ?
														'Open'
													:	'Out of range'}
												</span>
												{selectedOvertakePair.is_sc ?
													<span className="px-2 py-1 rounded-lg bg-yellow-500/12 border border-yellow-500/20 text-[10px] text-yellow-200">
														Safety Car active
													</span>
												:	null}
												{selectedOvertakePair.is_vsc ?
													<span className="px-2 py-1 rounded-lg bg-yellow-500/12 border border-yellow-500/20 text-[10px] text-yellow-200">
														VSC active
													</span>
												:	null}
											</div>
										</div>
									:	<div className="h-full flex flex-col justify-center">
											<p className="text-sm text-gray-300">
												{overtakeData?.selected_pair_message ||
													overtakeError ||
													'Select an attacker and a target to project the next overtake chance.'}
											</p>
											<p className="text-xs text-gray-600 mt-2">
												The attacker must currently be behind the target and
												both drivers must still be active in the replay state.
											</p>
										</div>
									}
								</div>
							</div>

							<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/6 p-5">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-sm font-bold text-white">
											Live Best Opportunities
										</h3>
										<p className="text-[11px] text-gray-500 mt-0.5">
											Top attacker-target pairs at {formatTime(playbackSecond)}{' '}
											on lap {lapNum}.
										</p>
									</div>
									<div className="text-[10px] text-gray-500 font-mono">
										{topOvertakePairs.length} pairs
									</div>
								</div>

								<div className="mt-4 space-y-2">
									{topOvertakePairs.length > 0 ?
										topOvertakePairs.map((pair) => (
											<button
												key={`${pair.attacker_driver}-${pair.target_driver}`}
												type="button"
												onClick={() => {
													setOvertakeAttacker(pair.attacker_driver);
													setOvertakeTarget(pair.target_driver);
												}}
												className={`w-full text-left rounded-xl border px-3 py-3 transition-all ${
													(
														selectedOvertakePair?.attacker_driver ===
															pair.attacker_driver &&
														selectedOvertakePair?.target_driver ===
															pair.target_driver
													) ?
														'bg-blue-500/10 border-blue-500/25'
													:	'bg-black/25 border-white/8 hover:border-white/15 hover:bg-white/5'
												}`}
											>
												<div className="flex items-center justify-between gap-3">
													<div>
														<div className="text-sm font-bold text-white">
															{pair.attacker_driver} {'->'} {pair.target_driver}
														</div>
														<div className="text-[11px] text-gray-500 mt-1">
															P{pair.attacker_pos} attacking P{pair.target_pos}{' '}
															• Gap {formatGapValue(pair.attacker_gap_ahead)}
														</div>
													</div>
													<div className="text-right">
														<div className="text-lg font-black text-blue-300">
															{formatProbability(pair.p_overtake)}
														</div>
														<div className="text-[10px] text-gray-600">
															{pair.flag_type || 'None'}
														</div>
													</div>
												</div>
											</button>
										))
									:	<div className="rounded-xl border border-white/8 bg-black/20 px-4 py-8 text-center">
											<p className="text-sm text-gray-400">
												{overtakeError ||
													overtakeData?.message ||
													'No live overtake pairs are available for this replay state yet.'}
											</p>
										</div>
									}
								</div>
							</div>
						</div>
					</div>
				:	null}
			</div>
		</div>
	);
}
