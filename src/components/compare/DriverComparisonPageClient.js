'use client';

import {
	getCountryCode,
	getDriverImagePath,
	getTeamCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { getTelemetryDriverImage } from '@/components/telemetry/telemetryUiUtils';
import { logActivity } from '@/lib/api/historyApi';
import {
	getSchedule,
	getTelemetrySessionSnapshot,
} from '@/lib/api/scheduleApi';
import {
	getComparisonDataset,
	getConstructorComparison,
	getConstructorCareerStats,
	getDriverCareerStats,
	getDriverComparison,
} from '@/lib/api/standingsApi';
import { getSessionData } from '@/lib/api/trackApi';
import { DRIVER_CATALOG } from '@/lib/data/driversCatalog';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	FaCarSide,
	FaChevronDown,
	FaChevronRight,
	FaExchangeAlt,
	FaTrophy,
	FaUsers,
} from 'react-icons/fa';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

const HISTORY_LOG_DEBOUNCE_MS = 1800;
const OPTIONAL_FETCH_TIMEOUT_MS = 8000;

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function toFixed(v, decimals = 1) {
	const n = Number(v || 0);
	return Number.isInteger(n) ? String(n) : n.toFixed(decimals);
}

function isRequestCanceled(error) {
	return (
		error?.name === 'AbortError' ||
		error?.name === 'CanceledError' ||
		error?.code === 'ERR_CANCELED'
	);
}

const TEAM_CAR_TOKEN = {
	mer: 'mercedes',
	fer: 'ferrari',
	rbr: 'redbullracing',
	mcl: 'mclaren',
	haas: 'haasf1team',
	ast: 'astonmartin',
	wil: 'williams',
	rb: 'racingbulls',
	alp: 'alpine',
	aud: 'audi',
	cad: 'cadillac',
};

const NAME_OVERRIDES = { 'kimi-antonelli': 'and' };

function get2026Image(driverCode) {
	if (!driverCode) return null;
	const cat = DRIVER_CATALOG.find(
		(d) => d.code?.toUpperCase() === driverCode?.toUpperCase()
	);
	if (!cat) return null;
	const token =
		TEAM_CAR_TOKEN[getTeamCode(cat.teamName)] || getTeamCode(cat.teamName);
	const parts = cat.fullName.toLowerCase().split(/\s+/);
	const first = NAME_OVERRIDES[cat.slug] || parts[0].slice(0, 3);
	const last = parts[parts.length - 1].slice(0, 3);
	return `/images/drivers/2026${token}${first}${last}01right.png`;
}

function getCarImage(teamName) {
	const token = TEAM_CAR_TOKEN[getTeamCode(teamName)];
	return token ? `/images/cars/2026${token}carright.png` : null;
}

function teamColor(teamName) {
	if (!teamName) return null;
	const tLow = teamName.toLowerCase();
	const d = DRIVER_CATALOG.find(
		(x) =>
			x.teamName?.toLowerCase() === tLow ||
			x.teamName?.toLowerCase().includes(tLow) ||
			tLow.includes(x.teamName?.toLowerCase())
	);
	return d?.teamColor || null;
}

function driverCatalog(code) {
	return (
		DRIVER_CATALOG.find((d) => d.code?.toUpperCase() === code?.toUpperCase()) ||
		null
	);
}

function lighten(hex, amt = 0.45) {
	const r = hex?.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(r)) return hex;
	return (
		'#' +
		[r.slice(0, 2), r.slice(2, 4), r.slice(4, 6)]
			.map((c) => {
				const n = parseInt(c, 16);
				return Math.round(n + (255 - n) * amt)
					.toString(16)
					.padStart(2, '0');
			})
			.join('')
	);
}

function darken(hex, amt = 0.2) {
	const r = hex?.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(r)) return hex;
	return (
		'#' +
		[r.slice(0, 2), r.slice(2, 4), r.slice(4, 6)]
			.map((c) =>
				Math.round(parseInt(c, 16) * (1 - amt))
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

function resolveColors(le, re) {
	const lb = teamColor(le?.team_name) || '#ef4444';
	const rb = teamColor(re?.team_name) || '#22d3ee';
	const same =
		le?.team_name &&
		re?.team_name &&
		le.team_name.toLowerCase() === re.team_name.toLowerCase();
	if (!same) return { lc: lb, rc: rb };
	return { lc: darken(lb, 0.15), rc: lighten(lb, 0.45) };
}

function getKey(e, type) {
	if (!e) return '';
	return type === 'drivers' ? e.driver_code || e.driver_name : e.team_name;
}

function getLabel(e, type) {
	if (!e) return '';
	return type === 'drivers' ?
			`${e.position}. ${e.driver_name}`
		:	`${e.position}. ${e.team_name}`;
}

function getRaceDisplayName(race) {
	if (!race) return '';
	return (
		race.raceName ||
		race.race_name ||
		race.event ||
		`Round ${race.round || '?'}`
	);
}

function parseRaceDate(race) {
	const raw =
		race?.date ||
		race?.race_date ||
		race?.race_date_utc ||
		race?.raceDate ||
		null;
	if (!raw) return null;
	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

function pct(a, b) {
	const total = (a || 0) + (b || 0);
	return total <= 0 ? 50 : Math.round(((a || 0) / total) * 100);
}

function normalize(metric, val, opp) {
	if (!Number.isFinite(val) || !Number.isFinite(opp)) return 50;
	if (metric.higherIsBetter) {
		const mx = Math.max(val, opp, 1);
		return (val / mx) * 100;
	}
	const mx = Math.max(val, opp, 1);
	return ((mx - val) / mx) * 100;
}

function winner(m) {
	if (m.lv === m.rv) return 'tie';
	return (
		m.higherIsBetter ?
			m.lv > m.rv ?
				'left'
			:	'right'
		: m.lv < m.rv ? 'left'
		: 'right'
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   METRICS BUILDERS
───────────────────────────────────────────────────────────────────────────── */

function buildSeasonMetrics(left, right, type) {
	if (!left || !right) return [];
	const races = Math.max(left.races_entered || left.top10_finishes || 1, 1);
	const rracesR = Math.max(right.races_entered || right.top10_finishes || 1, 1);

	const lWinRate = left.wins && races ? (left.wins / races) * 100 : 0;
	const rWinRate = right.wins && rracesR ? (right.wins / rracesR) * 100 : 0;
	const lPodRate = left.podiums && races ? (left.podiums / races) * 100 : 0;
	const rPodRate =
		right.podiums && rracesR ? (right.podiums / rracesR) * 100 : 0;

	return [
		{
			id: 'points',
			label: 'Championship Pts',
			shortLabel: 'PTS',
			lv: Number(left.points || 0),
			rv: Number(right.points || 0),
			fmt: (v) => toFixed(v, 0),
			higherIsBetter: true,
		},
		{
			id: 'wins',
			label: type === 'drivers' ? 'Race Wins' : 'Team Wins',
			shortLabel: 'WIN',
			lv: Number(left.wins || 0),
			rv: Number(right.wins || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'podiums',
			label: 'Podiums',
			shortLabel: 'POD',
			lv: Number(left.podiums || 0),
			rv: Number(right.podiums || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'poles',
			label: 'Pole Positions',
			shortLabel: 'POL',
			lv: Number(left.poles || 0),
			rv: Number(right.poles || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'top10',
			label: 'Top 10 Finishes',
			shortLabel: 'T10',
			lv: Number(left.top10_finishes || 0),
			rv: Number(right.top10_finishes || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'winrate',
			label: 'Win Rate',
			shortLabel: 'W%',
			lv: lWinRate,
			rv: rWinRate,
			fmt: (v) => `${v.toFixed(1)}%`,
			higherIsBetter: true,
		},
		{
			id: 'podrate',
			label: 'Podium Rate',
			shortLabel: 'P%',
			lv: lPodRate,
			rv: rPodRate,
			fmt: (v) => `${v.toFixed(1)}%`,
			higherIsBetter: true,
		},
		{
			id: 'avg',
			label: 'Avg Finish',
			shortLabel: 'AVG',
			lv: Number(left.avg_finish || 99),
			rv: Number(right.avg_finish || 99),
			fmt: (v) => (Number.isFinite(v) && v < 99 ? `P${v.toFixed(1)}` : 'N/A'),
			higherIsBetter: false,
		},
		{
			id: 'dnf',
			label: 'DNFs',
			shortLabel: 'DNF',
			lv: Number(left.dnf_count || 0),
			rv: Number(right.dnf_count || 0),
			fmt: (v) => String(v),
			higherIsBetter: false,
		},
	];
}

function buildCareerMetrics(leftCat, rightCat) {
	if (!leftCat || !rightCat) return [];
	const ls = Math.max(leftCat.careerStarts || 1, 1);
	const rs = Math.max(rightCat.careerStarts || 1, 1);
	return [
		{
			id: 'cp',
			label: 'Career Points',
			shortLabel: 'PTS',
			lv: Number(leftCat.careerPoints || 0),
			rv: Number(rightCat.careerPoints || 0),
			fmt: (v) => toFixed(v, 0),
			higherIsBetter: true,
		},
		{
			id: 'cw',
			label: 'Career Wins',
			shortLabel: 'WIN',
			lv: Number(leftCat.careerWins || 0),
			rv: Number(rightCat.careerWins || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'cpod',
			label: 'Career Podiums',
			shortLabel: 'POD',
			lv: Number(leftCat.careerPodiums || 0),
			rv: Number(rightCat.careerPodiums || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'cpol',
			label: 'Pole Positions',
			shortLabel: 'POL',
			lv: Number(leftCat.careerPoles || 0),
			rv: Number(rightCat.careerPoles || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'cfl',
			label: 'Fastest Laps',
			shortLabel: 'FL',
			lv: Number(leftCat.careerFastestLaps || 0),
			rv: Number(rightCat.careerFastestLaps || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'wdc',
			label: 'Championships',
			shortLabel: 'WDC',
			lv: Number(leftCat.worldChampionships || 0),
			rv: Number(rightCat.worldChampionships || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'starts',
			label: 'Race Starts',
			shortLabel: 'RCS',
			lv: Number(leftCat.careerStarts || 0),
			rv: Number(rightCat.careerStarts || 0),
			fmt: (v) => String(v),
			higherIsBetter: true,
		},
		{
			id: 'wr',
			label: 'Win Rate',
			shortLabel: 'W%',
			lv: leftCat.careerWins ? (leftCat.careerWins / ls) * 100 : 0,
			rv: rightCat.careerWins ? (rightCat.careerWins / rs) * 100 : 0,
			fmt: (v) => `${v.toFixed(2)}%`,
			higherIsBetter: true,
		},
		{
			id: 'pr',
			label: 'Podium Rate',
			shortLabel: 'P%',
			lv: leftCat.careerPodiums ? (leftCat.careerPodiums / ls) * 100 : 0,
			rv: rightCat.careerPodiums ? (rightCat.careerPodiums / rs) * 100 : 0,
			fmt: (v) => `${v.toFixed(1)}%`,
			higherIsBetter: true,
		},
	];
}

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM DROPDOWNS
───────────────────────────────────────────────────────────────────────────── */
function SeasonDropdown({ value, onChange, years, disabled }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		const fn = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		const onEscape = (e) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', fn);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('mousedown', fn);
			document.removeEventListener('keydown', onEscape);
		};
	}, [open]);

	const [prevValue, setPrevValue] = useState(value);
	const [prevDisabled, setPrevDisabled] = useState(disabled);

	if (value !== prevValue) {
		setPrevValue(value);
		setOpen(false);
	}
	if (disabled !== prevDisabled) {
		setPrevDisabled(disabled);
		setOpen(false);
	}

	return (
		<div
			ref={ref}
			className={`relative ${open ? 'z-50' : 'z-10'}`}
		>
			<button
				type="button"
				disabled={disabled}
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-haspopup="listbox"
				className="w-full flex items-center justify-between rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition hover:border-white/22 disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<span>{value}</span>
				<FaChevronDown
					size={9}
					className={`shrink-0 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{open && (
				<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 mt-0 w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c10] shadow-2xl">
					<div className="max-h-72 overflow-y-auto py-1">
						{years.map((y) => {
							const active = y === value;
							return (
								<button
									key={y}
									type="button"
									onClick={() => {
										onChange(y);
										setOpen(false);
									}}
									className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${active ? 'bg-white/6 text-white font-medium' : 'text-white/72 hover:bg-white/3'}`}
								>
									{y}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

function RaceDropdown({ value, onChange, schedule, disabled }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		const fn = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		const onEscape = (e) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', fn);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('mousedown', fn);
			document.removeEventListener('keydown', onEscape);
		};
	}, [open]);

	const [prevValue, setPrevValue] = useState(value);
	const [prevDisabled, setPrevDisabled] = useState(disabled);

	if (value !== prevValue) {
		setPrevValue(value);
		setOpen(false);
	}
	if (disabled !== prevDisabled) {
		setPrevDisabled(disabled);
		setOpen(false);
	}

	const selectedRace =
		value === 'all' ? null : (
			schedule.find((r) => String(r.round) === String(value))
		);

	return (
		<div
			ref={ref}
			className={`relative ${open ? 'z-50' : 'z-10'}`}
		>
			<button
				type="button"
				disabled={disabled}
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-haspopup="listbox"
				className="w-full flex items-center justify-between rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition hover:border-white/22 disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<span className="mr-2 flex min-w-0 flex-1 items-center gap-2">
					{value === 'all' ?
						'Entire Season'
					: selectedRace ?
						<>
							{getCountryCode(selectedRace.circuit?.country) && (
								<Image
									src={`/images/flags/${getCountryCode(selectedRace.circuit.country)}.png`}
									alt={selectedRace.circuit.country}
									width={16}
									height={12}
									className="rounded-sm object-cover"
								/>
							)}
							<span className="min-w-0 truncate text-white/90">
								{getRaceDisplayName(selectedRace)}
							</span>
						</>
					:	value}
				</span>
				<FaChevronDown
					size={9}
					className={`shrink-0 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{open && (
				<div className="absolute right-0 top-[calc(100%+6px)] z-50 mt-0 w-80 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c10] shadow-2xl">
					<div className="max-h-72 overflow-y-auto py-1">
						<button
							type="button"
							onClick={() => {
								onChange('all');
								setOpen(false);
							}}
							className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${value === 'all' ? 'bg-white/6 text-white font-medium' : 'text-white/72 hover:bg-white/3'}`}
						>
							Entire Season
						</button>
						{schedule.map((race) => {
							const active = String(race.round) === String(value);
							return (
								<button
									key={race.round}
									type="button"
									onClick={() => {
										onChange(String(race.round));
										setOpen(false);
									}}
									className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${active ? 'bg-white/6 text-white font-medium' : 'text-white/80 hover:bg-white/3'}`}
								>
									<span className="text-[10px] text-white/40 min-w-6">
										R{race.round}
									</span>
									{getCountryCode(race.circuit?.country) && (
										<Image
											src={`/images/flags/${getCountryCode(race.circuit.country)}.png`}
											alt={race.circuit.country}
											width={16}
											height={12}
											className="rounded-sm object-cover shrink-0"
										/>
									)}
									<span className="min-w-0 flex-1 truncate text-white/90">
										{getRaceDisplayName(race)}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

function EntityDropdown({
	label,
	value,
	onChange,
	entities,
	comparisonType,
	disabled,
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		const fn = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		const onEscape = (e) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', fn);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('mousedown', fn);
			document.removeEventListener('keydown', onEscape);
		};
	}, [open]);

	const [prevValue, setPrevValue] = useState(value);
	const [prevDisabled, setPrevDisabled] = useState(disabled);
	const [prevCompType, setPrevCompType] = useState(comparisonType);

	if (value !== prevValue) {
		setPrevValue(value);
		setOpen(false);
	}
	if (disabled !== prevDisabled) {
		setPrevDisabled(disabled);
		setOpen(false);
	}
	if (comparisonType !== prevCompType) {
		setPrevCompType(comparisonType);
		setOpen(false);
	}

	const selected = entities.find((e) => getKey(e, comparisonType) === value);

	function img(entity) {
		return comparisonType === 'drivers' ?
				get2026Image(entity.driver_code) ||
					getDriverImagePath(entity.driver_code)
			:	getTeamLogoPath(entity.team_name);
	}
	function logo(entity) {
		return getTeamLogoPath(entity.team_name);
	}
	function color(entity) {
		return teamColor(entity.team_name) || '#6b7280';
	}

	return (
		<div
			ref={ref}
			className={`relative ${open ? 'z-50' : 'z-10'}`}
		>
			<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
				{label}
			</label>
			<button
				type="button"
				disabled={disabled}
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-haspopup="listbox"
				className="w-full flex items-center gap-2.5 rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition hover:border-white/22 disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{selected ?
					<>
						<div
							className={`relative shrink-0 overflow-hidden rounded-lg border border-white/5 bg-white/3 flex items-center justify-center ${comparisonType === 'constructors' ? 'h-8 w-12' : 'h-8 w-8'}`}
						>
							{img(selected) && (
								<Image
									src={img(selected)}
									alt=""
									fill
									sizes={comparisonType === 'constructors' ? '48px' : '32px'}
									className={
										comparisonType === 'constructors' ?
											'object-contain p-1.5'
										:	'object-cover object-top'
									}
								/>
							)}
						</div>
						{comparisonType === 'drivers' && logo(selected) && (
							<div className="relative h-5 w-5 shrink-0">
								<Image
									src={logo(selected)}
									alt=""
									fill
									sizes="20px"
									className="object-contain"
								/>
							</div>
						)}
						<div className="flex-1 text-left min-w-0">
							<p className="font-medium truncate text-white text-sm">
								{comparisonType === 'drivers' ?
									selected.driver_name
								:	selected.team_name}
							</p>
							{comparisonType === 'drivers' && (
								<p className="text-[10px] text-white/30 truncate">
									{selected.team_name}
								</p>
							)}
						</div>
						<div
							className="w-1 h-6 rounded-full shrink-0"
							style={{ backgroundColor: color(selected) }}
						/>
					</>
				:	<span className="flex-1 text-left text-white/25 text-sm">
						Select...
					</span>
				}
				<FaChevronDown
					size={9}
					className={`shrink-0 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{open && (
				<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 mt-0 w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c10] shadow-2xl">
					<div className="max-h-72 overflow-y-auto py-1">
						{entities.map((entity) => {
							const key = getKey(entity, comparisonType);
							const active = key === value;
							return (
								<button
									key={key}
									type="button"
									onClick={() => {
										onChange(key);
										setOpen(false);
									}}
									className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${active ? 'bg-white/6' : 'hover:bg-white/3'}`}
								>
									<span className="text-[10px] text-white/20 w-4 shrink-0 text-right">
										{entity.position}
									</span>
									<div
										className={`relative shrink-0 overflow-hidden rounded-lg border border-white/5 bg-white/2 flex items-center justify-center ${comparisonType === 'constructors' ? 'h-8 w-12' : 'h-8 w-8'}`}
									>
										{img(entity) && (
											<Image
												src={img(entity)}
												alt=""
												fill
												sizes={
													comparisonType === 'constructors' ? '48px' : '32px'
												}
												className={
													comparisonType === 'constructors' ?
														'object-contain p-1.5'
													:	'object-cover object-top'
												}
											/>
										)}
									</div>
									{comparisonType === 'drivers' && logo(entity) && (
										<div className="relative h-4 w-4 shrink-0">
											<Image
												src={logo(entity)}
												alt=""
												fill
												sizes="16px"
												className="object-contain"
											/>
										</div>
									)}
									<div className="flex-1 min-w-0">
										<p
											className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-white/72'}`}
										>
											{comparisonType === 'drivers' ?
												entity.driver_name
											:	entity.team_name}
										</p>
										{comparisonType === 'drivers' && (
											<p className="text-[10px] text-white/25 truncate">
												{entity.team_name}
											</p>
										)}
									</div>
									<div
										className="w-1 h-5 rounded-full shrink-0"
										style={{ backgroundColor: color(entity) }}
									/>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────────────────────────────────────── */
function Skeleton() {
	return (
		<div className="animate-pulse space-y-5">
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{[0, 1].map((i) => (
					<div
						key={i}
						className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12]/95"
					>
						<div className="h-52 bg-white/4" />
						<div className="p-5 space-y-3">
							<div className="h-3 w-20 rounded bg-white/6" />
							<div className="h-5 w-36 rounded bg-white/10" />
							<div className="grid grid-cols-3 gap-2 pt-2">
								{[0, 1, 2].map((j) => (
									<div
										key={j}
										className="h-14 rounded-xl bg-white/4"
									/>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5">
					<div className="h-4 w-32 rounded bg-white/8 mb-4" />
					<div className="h-64 rounded-xl bg-white/3" />
				</div>
				<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5 space-y-3">
					<div className="h-4 w-32 rounded bg-white/8 mb-2" />
					{Array.from({ length: 9 }).map((_, i) => (
						<div
							key={i}
							className="h-10 rounded-xl bg-white/3"
						/>
					))}
				</div>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   IDENTITY CARD
───────────────────────────────────────────────────────────────────────────── */
function IdentityCard({
	entity,
	comparisonType,
	accentColor,
	statsLabel,
	viewMode,
	careerCat,
}) {
	if (!entity) {
		return (
			<div className="flex h-52 items-center justify-center rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-6 text-sm text-white/25">
				Select a {comparisonType === 'drivers' ? 'driver' : 'constructor'}
			</div>
		);
	}

	const tc = accentColor || teamColor(entity.team_name) || '#6b7280';
	const tl = getTeamLogoPath(entity.team_name);
	const isDriverCard = comparisonType === 'drivers';
	const heroImg =
		comparisonType === 'drivers' ?
			get2026Image(entity.driver_code) || getDriverImagePath(entity.driver_code)
		:	getCarImage(entity.team_name);
	const dn =
		comparisonType === 'drivers' ? entity.driver_name : entity.team_name;
	const num =
		comparisonType === 'drivers' ?
			driverCatalog(entity.driver_code)?.number
		:	null;

	// stat tiles — differ per mode/type
	const statTiles =
		viewMode === 'career' && careerCat ?
			[
				{
					label: 'Seasons',
					value:
						careerCat.careerStarts >= 17 ?
							`${Math.round(careerCat.careerStarts / 17)}`
						:	'1',
				},
				{ label: 'WDC', value: careerCat.worldChampionships || 0 },
				{ label: 'Career Wins', value: careerCat.careerWins || 0 },
			]
		:	[
				{ label: 'Pos', value: `P${entity.position}` },
				{ label: 'Points', value: toFixed(entity.points || 0, 0) },
				{ label: 'Wins', value: entity.wins ?? 0 },
			];

	return (
		<div className="relative overflow-hidden rounded-3xl border border-white/6">
			<div
				className="pointer-events-none absolute inset-0 z-1 opacity-[0.28]"
				style={{
					backgroundImage:
						'repeating-linear-gradient(0deg,rgba(255,255,255,0.10) 0px,rgba(255,255,255,0.10) 1px,transparent 1px,transparent 18px),repeating-linear-gradient(90deg,rgba(255,255,255,0.08) 0px,rgba(255,255,255,0.08) 1px,transparent 1px,transparent 18px)',
				}}
			/>
			<div
				className="relative z-2 h-52 overflow-hidden"
				style={{
					background: `linear-gradient(120deg, ${tc}DE 0%, ${tc}B8 58%, rgba(8,8,10,0.92) 100%)`,
				}}
			>
				<div
					className="pointer-events-none absolute inset-0 opacity-40"
					style={{
						backgroundImage:
							'repeating-linear-gradient(0deg,rgba(255,255,255,0.07) 0,rgba(255,255,255,0.07) 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 20px)',
					}}
				/>
				{tl && (
					<div className="absolute top-4 left-4 z-10 h-9 w-9">
						<Image
							src={tl}
							alt=""
							fill
							className="object-contain"
						/>
					</div>
				)}
				<div
					className="absolute top-3 right-4 z-10 text-[3.5rem] font-black leading-none"
					style={{ color: `${tc}20`, WebkitTextStroke: `1px ${tc}30` }}
				>
					{num || entity.position}
				</div>
				{heroImg &&
					(comparisonType === 'drivers' ?
						<div className="absolute inset-0 flex justify-center overflow-hidden">
							<div
								className="relative w-4/5"
								style={{ height: '167%', top: 0 }}
							>
								<Image
									src={heroImg}
									alt={dn}
									fill
									sizes="(max-width:768px)100vw,50vw"
									className="object-contain object-top saturate-[1.2] brightness-110 contrast-110"
									priority
								/>
							</div>
						</div>
					:	<div className="absolute inset-0 flex items-center justify-center">
							<div className="relative h-full w-full max-w-sm">
								<Image
									src={heroImg}
									alt={dn}
									fill
									sizes="(max-width:768px)100vw,50vw"
									className="object-contain scale-90"
									priority
								/>
							</div>
						</div>)}
				<div className="absolute bottom-0 left-0 right-0 h-14 bg-linear-to-t from-[#050507] to-transparent" />
			</div>

			<div
				className="relative z-2 px-5 pb-5 pt-3"
				style={{
					background: `linear-gradient(180deg, rgba(5,5,7,0.98) 0%, ${tc}12 120%)`,
				}}
			>
				<div className="flex items-end justify-between mb-3">
					<div>
						<p className="text-[10px] uppercase tracking-[0.22em] text-white/25 mb-0.5">
							{comparisonType === 'drivers' ?
								entity.driver_code
							:	'Constructor'}
						</p>
						<h2 className="text-xl font-semibold text-white">{dn}</h2>
						{comparisonType === 'drivers' && (
							<p className="text-xs text-white/30 mt-0.5">{entity.team_name}</p>
						)}
					</div>
					<div
						className="h-1.5 w-12 rounded-full opacity-50"
						style={{ backgroundColor: tc }}
					/>
				</div>
				<div className="grid grid-cols-3 gap-2">
					{statTiles.map((s) => (
						<div
							key={s.label}
							className="flex flex-col py-2.5 px-3 rounded-xl"
							style={{
								background: `${tc}24`,
								border: `1px solid ${tc}54`,
							}}
						>
							<span className="text-[9px] uppercase tracking-[0.16em] text-white/25 mb-1">
								{s.label}
							</span>
							<span className="text-lg font-semibold text-white">
								{s.value}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   METRIC ROW
───────────────────────────────────────────────────────────────────────────── */
function MetricRow({ metric, lc, rc }) {
	const w = winner(metric);
	const lp = pct(metric.lv, metric.rv);
	const rp = 100 - lp;
	return (
		<div className="grid grid-cols-[1fr_78px_1fr] items-center gap-2 py-3 border-b border-white/5 last:border-0">
			<div className="flex flex-col items-start">
				<span
					className="text-xl font-semibold leading-tight"
					style={{ color: w === 'left' ? lc : 'rgba(255,255,255,0.65)' }}
				>
					{metric.fmt(metric.lv)}
				</span>
				{w === 'left' && (
					<span
						className="text-[8px] uppercase tracking-widest mt-0.5 font-semibold"
						style={{ color: lc }}
					>
						Ahead
					</span>
				)}
				{w === 'tie' && (
					<span className="text-[8px] uppercase tracking-widest mt-0.5 text-white/35">
						Tied
					</span>
				)}
			</div>
			<div className="text-center">
				<p className="text-[9px] uppercase tracking-widest text-white/45 mb-1.5 leading-none">
					{metric.label}
				</p>
				<div className="flex h-[3px] rounded-full overflow-hidden gap-px">
					<div
						className="h-full rounded-l-full"
						style={{
							width: `${lp}%`,
							backgroundColor: w === 'left' ? lc : `${lc}50`,
						}}
					/>
					<div
						className="h-full rounded-r-full ml-auto"
						style={{
							width: `${rp}%`,
							backgroundColor: w === 'right' ? rc : `${rc}50`,
						}}
					/>
				</div>
			</div>
			<div className="flex flex-col items-end">
				<span
					className="text-xl font-semibold leading-tight"
					style={{ color: w === 'right' ? rc : 'rgba(255,255,255,0.65)' }}
				>
					{metric.fmt(metric.rv)}
				</span>
				{w === 'right' && (
					<span
						className="text-[8px] uppercase tracking-widest mt-0.5 font-semibold text-right"
						style={{ color: rc }}
					>
						Ahead
					</span>
				)}
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   CAREER BAR CHART (career mode only)
───────────────────────────────────────────────────────────────────────────── */
function CareerBarChart({ leftCat, rightCat, lName, rName, lc, rc }) {
	if (!leftCat || !rightCat) return null;
	const data = [
		{
			label: 'Wins',
			lv: leftCat.careerWins || 0,
			rv: rightCat.careerWins || 0,
		},
		{
			label: 'Podiums',
			lv: leftCat.careerPodiums || 0,
			rv: rightCat.careerPodiums || 0,
		},
		{
			label: 'Poles',
			lv: leftCat.careerPoles || 0,
			rv: rightCat.careerPoles || 0,
		},
		{
			label: 'FL',
			lv: leftCat.careerFastestLaps || 0,
			rv: rightCat.careerFastestLaps || 0,
		},
	];
	return (
		<div className="mt-4 rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-semibold text-white">Career Tallies</h2>
				<div className="flex gap-4">
					{[
						{ name: lName, color: lc },
						{ name: rName, color: rc },
					].map((l) => (
						<div
							key={l.name}
							className="flex items-center gap-1.5"
						>
							<div
								className="w-2 h-2 rounded-full"
								style={{ backgroundColor: l.color }}
							/>
							<span className="text-[10px] text-white/40 truncate max-w-20">
								{l.name}
							</span>
						</div>
					))}
				</div>
			</div>
			<div className="h-44">
				<ResponsiveContainer>
					<BarChart
						data={data}
						margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
					>
						<CartesianGrid
							stroke="rgba(255,255,255,0.04)"
							vertical={false}
						/>
						<XAxis
							dataKey="label"
							tick={{ fill: '#6b7280', fontSize: 10 }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							tick={{ fill: '#6b7280', fontSize: 10 }}
							axisLine={false}
							tickLine={false}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: 'rgba(5,5,7,0.96)',
								border: '1px solid rgba(255,255,255,0.07)',
								borderRadius: 10,
								color: '#fff',
								fontSize: 11,
							}}
						/>
						<Bar
							dataKey="lv"
							name={lName}
							fill={lc}
							radius={[4, 4, 0, 0]}
							fillOpacity={0.85}
							maxBarSize={32}
						/>
						<Bar
							dataKey="rv"
							name={rName}
							fill={rc}
							radius={[4, 4, 0, 0]}
							fillOpacity={0.75}
							maxBarSize={32}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   RACE WEEKEND DASHBOARD
───────────────────────────────────────────────────────────────────────────── */

function parseTimeToMs(timeStr) {
	if (!timeStr) return null;
	const s = String(timeStr).trim();
	if (s.includes('Lap') || s.includes('lap')) return null; // Lapped

	let ms = 0;
	let parts = s.replace('+', '').split(':');

	if (parts.length === 2) {
		ms += parseInt(parts[0], 10) * 60000;
		ms += parseFloat(parts[1]) * 1000;
	} else if (parts.length === 3) {
		ms += parseInt(parts[0], 10) * 3600000;
		ms += parseInt(parts[1], 10) * 60000;
		ms += parseFloat(parts[2]) * 1000;
	} else {
		ms += parseFloat(parts[0]) * 1000;
	}
	return isNaN(ms) ? null : ms;
}

function formatTimeDiff(ms) {
	if (ms == null || isNaN(ms)) return null;
	const absMs = Math.abs(ms);
	const mins = Math.floor(absMs / 60000);
	const secs = ((absMs % 60000) / 1000).toFixed(3);
	if (mins > 0) {
		return `+ ${mins}m ${secs}s`;
	}
	return `+ ${secs}s`;
}

function calculateGap(rowA, rowB) {
	if (!rowA || !rowB) return '-';
	if (rowA.position === rowB.position) return 'Same';

	const posA = parseInt(rowA.position);
	const posB = parseInt(rowB.position);

	if (isNaN(posA) || isNaN(posB)) {
		if (isNaN(posA) && !isNaN(posB)) return 'DNF';
		if (!isNaN(posA) && isNaN(posB)) return 'DNF (Behind)';
		return '-';
	}

	const leader = posA < posB ? rowA : rowB;
	const trailer = posA < posB ? rowB : rowA;

	if (trailer.time?.includes('Lap') || trailer.time?.includes('lap')) {
		const laps = parseInt(trailer.time.replace(/[^\d]/g, '')) || 1;
		return `+ ${laps} ${laps === 1 ? 'lap' : 'laps'} ahead (${posB - posA} pos)`;
	}

	const isLeaderWinner = leader.position == 1;

	// If one is P1...
	if (isLeaderWinner) {
		if (!trailer.time) return `+ ${posB - posA} pos`;
		const ms = parseTimeToMs(trailer.time);
		if (ms !== null) {
			return formatTimeDiff(ms);
		}
		return trailer.time.startsWith('+') ? trailer.time : `+ ${trailer.time}`;
	}

	// Calculate gap between non-winners
	const msA = parseTimeToMs(leader.time);
	const msB = parseTimeToMs(trailer.time);

	if (
		msA !== null &&
		msB !== null &&
		(trailer.time?.startsWith('+') || leader.time?.startsWith('+'))
	) {
		const diff = Math.abs(msA - msB);
		return formatTimeDiff(diff);
	}

	// Fallback
	const posDiff = posB - posA;
	return `+ ${posDiff} pos`;
}

function formatLapSeconds(sec) {
	if (!Number.isFinite(sec)) return '--:--.---';
	const mins = Math.floor(sec / 60);
	const seconds = (sec - mins * 60).toFixed(3).padStart(6, '0');
	return `${mins}:${seconds}`;
}

function quantile(sortedValues, q) {
	if (!Array.isArray(sortedValues) || sortedValues.length === 0) return null;
	const pos = (sortedValues.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	if (sortedValues[base + 1] !== undefined) {
		return (
			sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base])
		);
	}
	return sortedValues[base];
}

function parseDurationToSec(value) {
	if (Number.isFinite(Number(value))) return Number(value);
	if (typeof value !== 'string' || !value.trim()) return null;
	const ms = parseTimeToMs(value);
	if (!Number.isFinite(ms)) return null;
	return ms / 1000;
}

function pickFirstFinite(...values) {
	for (const value of values) {
		if (Number.isFinite(value)) return value;
	}
	return null;
}

function filterAnomalousLaps(laps) {
	const cleaned = (Array.isArray(laps) ? laps : [])
		.map((lap) => ({
			lap: Number(lap.lap ?? lap.lap_number ?? lap.lapNumber),
			lap_time_sec: pickFirstFinite(
				Number(lap.lap_time_sec),
				Number(lap.time),
				parseDurationToSec(lap.lap_time),
				parseDurationToSec(lap.time_str)
			),
			s1: pickFirstFinite(
				Number(lap.s1),
				parseDurationToSec(lap.sector1),
				parseDurationToSec(lap.sector_1),
				parseDurationToSec(lap.sector1_time)
			),
			s2: pickFirstFinite(
				Number(lap.s2),
				parseDurationToSec(lap.sector2),
				parseDurationToSec(lap.sector_2),
				parseDurationToSec(lap.sector2_time)
			),
			s3: pickFirstFinite(
				Number(lap.s3),
				parseDurationToSec(lap.sector3),
				parseDurationToSec(lap.sector_3),
				parseDurationToSec(lap.sector3_time)
			),
			pit_in: Boolean(lap.pit_in),
			pit_out: Boolean(lap.pit_out),
			is_clean: lap.is_clean,
		}))
		.filter(
			(lap) => Number.isFinite(lap.lap) && Number.isFinite(lap.lap_time_sec)
		);

	if (cleaned.length === 0) return [];

	const raceLikeLaps = cleaned.filter(
		(lap) => !lap.pit_in && !lap.pit_out && lap.is_clean !== false
	);
	const baseline = raceLikeLaps.length >= 3 ? raceLikeLaps : cleaned;

	if (baseline.length < 5) {
		return baseline.sort((a, b) => a.lap - b.lap);
	}

	const sortedTimes = baseline
		.map((lap) => lap.lap_time_sec)
		.filter(Number.isFinite)
		.sort((a, b) => a - b);
	const q1 = quantile(sortedTimes, 0.25);
	const q3 = quantile(sortedTimes, 0.75);
	if (!Number.isFinite(q1) || !Number.isFinite(q3)) {
		return baseline.sort((a, b) => a.lap - b.lap);
	}

	const iqr = Math.max(0.1, q3 - q1);
	const lowerBound = Math.max(50, q1 - iqr * 1.5);
	const upperBound = q3 + iqr * 1.5 + 1.0;
	const trimmed = baseline.filter(
		(lap) => lap.lap_time_sec >= lowerBound && lap.lap_time_sec <= upperBound
	);

	const minUseful = Math.max(3, Math.floor(baseline.length * 0.6));
	const finalRows = trimmed.length >= minUseful ? trimmed : baseline;
	return finalRows.sort((a, b) => a.lap - b.lap);
}

function buildChartLaps(laps) {
	const normalized = (Array.isArray(laps) ? laps : [])
		.map((lap) => ({
			lap: Number(lap.lap ?? lap.lap_number ?? lap.lapNumber),
			lap_time_sec: pickFirstFinite(
				Number(lap.lap_time_sec),
				Number(lap.time),
				parseDurationToSec(lap.lap_time),
				parseDurationToSec(lap.time_str)
			),
			pit_in: Boolean(lap.pit_in),
			pit_out: Boolean(lap.pit_out),
			is_clean: lap.is_clean,
		}))
		.filter(
			(lap) => Number.isFinite(lap.lap) && Number.isFinite(lap.lap_time_sec)
		);

	return normalized.sort((a, b) => a.lap - b.lap);
}

function average(values) {
	if (!Array.isArray(values) || values.length === 0) return null;
	const sum = values.reduce((acc, value) => acc + value, 0);
	return sum / values.length;
}

function estimateRacePace(laps) {
	const safe = Array.isArray(laps) ? laps : [];
	const cleanNoPit = safe
		.filter((lap) => !lap.pit_in && !lap.pit_out && lap.is_clean !== false)
		.map((lap) => Number(lap.lap_time_sec))
		.filter(Number.isFinite)
		.sort((a, b) => a - b);
	const fallback = safe
		.filter((lap) => !lap.pit_in && !lap.pit_out)
		.map((lap) => Number(lap.lap_time_sec))
		.filter(Number.isFinite)
		.sort((a, b) => a - b);
	const source = cleanNoPit.length >= 3 ? cleanNoPit : fallback;
	if (!source.length) return null;
	return quantile(source, 0.5);
}

function calculateComparableLapGapMs(leftLaps, rightLaps) {
	const left = Array.isArray(leftLaps) ? leftLaps : [];
	const right = Array.isArray(rightLaps) ? rightLaps : [];
	if (!left.length || !right.length) return null;

	const rightByLap = new Map(
		right.map((lap) => [Number(lap?.lap), Number(lap?.lap_time_sec)])
	);

	let leftTotalSec = 0;
	let rightTotalSec = 0;
	let commonCount = 0;

	for (const lap of left) {
		const lapNum = Number(lap?.lap);
		const leftSec = Number(lap?.lap_time_sec);
		const rightSec = Number(rightByLap.get(lapNum));
		if (!Number.isFinite(lapNum)) continue;
		if (!Number.isFinite(leftSec) || !Number.isFinite(rightSec)) continue;
		leftTotalSec += leftSec;
		rightTotalSec += rightSec;
		commonCount += 1;
	}

	const minLaps = Math.min(left.length, right.length);
	const requiredCommon = Math.max(3, Math.floor(minLaps * 0.6));
	if (commonCount < requiredCommon || commonCount === 0) return null;

	return (rightTotalSec - leftTotalSec) * 1000;
}

function formatSectorSeconds(sec) {
	if (!Number.isFinite(sec)) return '--.---';
	return sec.toFixed(3);
}

function traceBestLapSec(trace) {
	const laps = Array.isArray(trace?.laps) ? trace.laps : [];
	const values = laps
		.map((lap) =>
			pickFirstFinite(
				Number(lap?.lap_time_sec),
				Number(lap?.time),
				parseDurationToSec(lap?.lap_time),
				parseDurationToSec(lap?.time_str),
				parseDurationToSec(lap?.time)
			)
		)
		.filter(Number.isFinite);
	return values.length ? Math.min(...values) : null;
}

function selectFastestTeamTrace(lapTraces, teamName) {
	const traces = (Array.isArray(lapTraces) ? lapTraces : []).filter((trace) => {
		const traceTeam = String(trace?.team_name || '').toLowerCase();
		const targetTeam = String(teamName || '').toLowerCase();
		if (!traceTeam || !targetTeam) return false;
		return traceTeam === targetTeam;
	});

	if (!traces.length) return null;

	let bestTrace = null;
	let bestLap = Number.POSITIVE_INFINITY;
	for (const trace of traces) {
		const best = traceBestLapSec(trace);
		if (Number.isFinite(best) && best < bestLap) {
			bestLap = best;
			bestTrace = trace;
		}
	}

	return bestTrace || traces[0];
}

function RaceWeekendDashboard({
	telemetry,
	trackData,
	trackGenStatus,
	leftEntity,
	rightEntity,
	lName,
	rName,
	lc,
	rc,
	comparisonType,
}) {
	const safeTelemetry = telemetry || { rows: [], lap_traces: [] };
	const isConstructorComparison = comparisonType === 'constructors';
	const leftCode = leftEntity?.driver_code || leftEntity?.team_name || lName;
	const rightCode = rightEntity?.driver_code || rightEntity?.team_name || rName;
	const leftDriverCode = leftEntity?.driver_code;
	const rightDriverCode = rightEntity?.driver_code;

	const leftTrackDriver =
		leftDriverCode ? trackData?.drivers?.[leftDriverCode] : null;
	const rightTrackDriver =
		rightDriverCode ? trackData?.drivers?.[rightDriverCode] : null;

	const leftTrackBest = (() => {
		if (!leftDriverCode) return null;
		const values = Object.values(trackData?.lap_times?.[leftDriverCode] || {})
			.map(Number)
			.filter(Number.isFinite);
		return values.length ? Math.min(...values) : null;
	})();
	const rightTrackBest = (() => {
		if (!rightDriverCode) return null;
		const values = Object.values(trackData?.lap_times?.[rightDriverCode] || {})
			.map(Number)
			.filter(Number.isFinite);
		return values.length ? Math.min(...values) : null;
	})();

	const lRow =
		safeTelemetry.rows?.find(
			(r) =>
				r.driver_code === leftCode ||
				r.team_name === leftCode ||
				r.driver_name?.includes(leftCode)
		) ||
		(leftTrackDriver ?
			{
				position: leftTrackDriver.finish_position,
				grid_position: leftTrackDriver.grid_position,
				best_lap: formatLapSeconds(leftTrackBest),
				time: leftTrackDriver.status_detail || leftTrackDriver.status,
			}
		:	null);
	const rRow =
		safeTelemetry.rows?.find(
			(r) =>
				r.driver_code === rightCode ||
				r.team_name === rightCode ||
				r.driver_name?.includes(rightCode)
		) ||
		(rightTrackDriver ?
			{
				position: rightTrackDriver.finish_position,
				grid_position: rightTrackDriver.grid_position,
				best_lap: formatLapSeconds(rightTrackBest),
				time: rightTrackDriver.status_detail || rightTrackDriver.status,
			}
		:	null);

	const leftTrackLaps =
		leftDriverCode ?
			trackData?.strategy_driver_laps?.[leftDriverCode] || []
		:	[];
	const rightTrackLaps =
		rightDriverCode ?
			trackData?.strategy_driver_laps?.[rightDriverCode] || []
		:	[];

	const leftTelemetryTrace =
		isConstructorComparison ?
			selectFastestTeamTrace(safeTelemetry.lap_traces, leftCode)
		:	safeTelemetry.lap_traces?.find(
				(t) =>
					t.driver_code === leftCode ||
					t.driver_name?.toLowerCase().includes(leftCode?.toLowerCase()) ||
					t.team_name === leftCode
			);
	const rightTelemetryTrace =
		isConstructorComparison ?
			selectFastestTeamTrace(safeTelemetry.lap_traces, rightCode)
		:	safeTelemetry.lap_traces?.find(
				(t) =>
					t.driver_code === rightCode ||
					t.driver_name?.toLowerCase().includes(rightCode?.toLowerCase()) ||
					t.team_name === rightCode
			);

	const leftTelemetryLaps = leftTelemetryTrace?.laps || [];
	const rightTelemetryLaps = rightTelemetryTrace?.laps || [];

	const leftTelemetryBestLapSec = (() => {
		const values = leftTelemetryLaps
			.map((lap) =>
				pickFirstFinite(
					Number(lap?.lap_time_sec),
					Number(lap?.time),
					parseDurationToSec(lap?.lap_time),
					parseDurationToSec(lap?.time_str),
					parseDurationToSec(lap?.time)
				)
			)
			.filter(Number.isFinite);
		return values.length ? Math.min(...values) : null;
	})();

	const rightTelemetryBestLapSec = (() => {
		const values = rightTelemetryLaps
			.map((lap) =>
				pickFirstFinite(
					Number(lap?.lap_time_sec),
					Number(lap?.time),
					parseDurationToSec(lap?.lap_time),
					parseDurationToSec(lap?.time_str),
					parseDurationToSec(lap?.time)
				)
			)
			.filter(Number.isFinite);
		return values.length ? Math.min(...values) : null;
	})();

	const leftBestLapDisplay =
		Number.isFinite(leftTelemetryBestLapSec) ?
			formatLapSeconds(leftTelemetryBestLapSec)
		:	lRow?.best_lap || '--:--.---';
	const rightBestLapDisplay =
		Number.isFinite(rightTelemetryBestLapSec) ?
			formatLapSeconds(rightTelemetryBestLapSec)
		:	rRow?.best_lap || '--:--.---';

	const leftRawLaps =
		leftTrackLaps.length > 0 ?
			leftTrackLaps.map((lap) => ({
				lap: lap.lap,
				lap_time_sec: lap.time,
				s1: lap.s1,
				s2: lap.s2,
				s3: lap.s3,
				pit_in: lap.pit_in,
				pit_out: lap.pit_out,
				is_clean: lap.is_clean,
			}))
		:	leftTelemetryLaps;
	const rightRawLaps =
		rightTrackLaps.length > 0 ?
			rightTrackLaps.map((lap) => ({
				lap: lap.lap,
				lap_time_sec: lap.time,
				s1: lap.s1,
				s2: lap.s2,
				s3: lap.s3,
				pit_in: lap.pit_in,
				pit_out: lap.pit_out,
				is_clean: lap.is_clean,
			}))
		:	rightTelemetryLaps;

	const leftLapData = filterAnomalousLaps(leftRawLaps);
	const rightLapData = filterAnomalousLaps(rightRawLaps);
	const leftChartLaps = buildChartLaps(leftRawLaps);
	const rightChartLaps = buildChartLaps(rightRawLaps);
	const comparableLapGapMs = calculateComparableLapGapMs(
		leftChartLaps,
		rightChartLaps
	);

	const leftLapMap = new Map(leftLapData.map((lap) => [lap.lap, lap]));
	const rightLapMap = new Map(rightLapData.map((lap) => [lap.lap, lap]));
	const leftChartLapMap = new Map(leftChartLaps.map((lap) => [lap.lap, lap]));
	const rightChartLapMap = new Map(rightChartLaps.map((lap) => [lap.lap, lap]));
	const leftRacePace = estimateRacePace(leftChartLaps);
	const rightRacePace = estimateRacePace(rightChartLaps);

	const maxLaps = Math.max(
		leftChartLaps.length ? Math.max(...leftChartLaps.map((lap) => lap.lap)) : 0,
		rightChartLaps.length ?
			Math.max(...rightChartLaps.map((lap) => lap.lap))
		:	0
	);

	const lapChartData = [];
	const excludedLapReasonByLap = new Map();
	for (let i = 1; i <= maxLaps; i++) {
		const leftLap = leftChartLapMap.get(i);
		const rightLap = rightChartLapMap.get(i);
		const leftTime = Number(leftLap?.lap_time_sec);
		const rightTime = Number(rightLap?.lap_time_sec);
		const leftHasTime = Number.isFinite(leftTime);
		const rightHasTime = Number.isFinite(rightTime);
		const pitLap =
			Boolean(leftLap?.pit_in) ||
			Boolean(leftLap?.pit_out) ||
			Boolean(rightLap?.pit_in) ||
			Boolean(rightLap?.pit_out);
		const flaggedNotClean =
			leftLap?.is_clean === false || rightLap?.is_clean === false;
		const paceOutlier =
			(leftHasTime &&
				Number.isFinite(leftRacePace) &&
				leftTime > leftRacePace + 5.5) ||
			(rightHasTime &&
				Number.isFinite(rightRacePace) &&
				rightTime > rightRacePace + 5.5);
		const neutralizedLap = !pitLap && (flaggedNotClean || paceOutlier);
		const excludedReason =
			pitLap ? 'pit'
			: neutralizedLap ? 'neutralized'
			: null;

		const point = { lap: i };
		if (leftHasTime && !excludedReason) point[lName] = leftTime;
		if (rightHasTime && !excludedReason) point[rName] = rightTime;
		if (excludedReason) {
			excludedLapReasonByLap.set(i, excludedReason);
		}
		if (Number.isFinite(point[lName]) && Number.isFinite(point[rName])) {
			point.gap_sec = point[rName] - point[lName];
		}
		lapChartData.push(point);
	}

	const excludedLapMarkers = [...excludedLapReasonByLap.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([lap, reason]) => ({ lap, reason }));
	const pitExcludedLabel = excludedLapMarkers
		.filter((m) => m.reason === 'pit')
		.map((m) => `L${m.lap}`)
		.join(', ');
	const neutralizedExcludedLabel = excludedLapMarkers
		.filter((m) => m.reason === 'neutralized')
		.map((m) => `L${m.lap}`)
		.join(', ');

	const allLapTimes = lapChartData
		.flatMap((point) => [point[lName], point[rName]])
		.filter(Number.isFinite);
	const lapMin = allLapTimes.length ? Math.min(...allLapTimes) : 0;
	const lapMax = allLapTimes.length ? Math.max(...allLapTimes) : 0;
	const sortedLapTimes = [...allLapTimes].sort((a, b) => a - b);
	const q10 = quantile(sortedLapTimes, 0.1);
	const q90 = quantile(sortedLapTimes, 0.9);
	const focusMin = Number.isFinite(q10) ? q10 : lapMin;
	const focusMax = Number.isFinite(q90) ? q90 : lapMax;
	const focusSpread = Math.max(0.9, focusMax - focusMin);
	const cappedSpread = Math.min(2.6, focusSpread + 0.35);
	const focusMid = (focusMin + focusMax) / 2;
	const yDomain = [focusMid - cappedSpread / 2, focusMid + cappedSpread / 2];
	const zoomedChartWidth = Math.max(640, maxLaps * 28);
	const safeChartWidth = Math.min(1800, zoomedChartWidth);

	const leftAvatar =
		comparisonType === 'drivers' ?
			get2026Image(leftEntity?.driver_code) ||
			getDriverImagePath(leftEntity?.driver_code)
		:	getTeamLogoPath(leftEntity?.team_name) ||
			getCarImage(leftEntity?.team_name);
	const rightAvatar =
		comparisonType === 'drivers' ?
			get2026Image(rightEntity?.driver_code) ||
			getDriverImagePath(rightEntity?.driver_code)
		:	getTeamLogoPath(rightEntity?.team_name) ||
			getCarImage(rightEntity?.team_name);

	const leftAverageLap = average(
		leftLapData.map((lap) => lap.lap_time_sec).filter(Number.isFinite)
	);
	const rightAverageLap = average(
		rightLapData.map((lap) => lap.lap_time_sec).filter(Number.isFinite)
	);

	const sectorLabels = [
		{ key: 's1', label: 'Sector 1' },
		{ key: 's2', label: 'Sector 2' },
		{ key: 's3', label: 'Sector 3' },
	];

	const comparableLaps = lapChartData
		.filter(
			(point) => Number.isFinite(point[lName]) && Number.isFinite(point[rName])
		)
		.map((point) => point.lap);

	const sectorSummary = sectorLabels.map(({ key, label }) => {
		const leftValues = comparableLaps
			.map((lap) => leftLapMap.get(lap)?.[key])
			.filter(Number.isFinite);
		const rightValues = comparableLaps
			.map((lap) => rightLapMap.get(lap)?.[key])
			.filter(Number.isFinite);

		const sampleSize = Math.min(leftValues.length, rightValues.length);
		if (sampleSize === 0) {
			return { label, hasData: false };
		}

		const leftAvg = average(leftValues);
		const rightAvg = average(rightValues);
		const delta = Math.abs((leftAvg || 0) - (rightAvg || 0));
		const faster =
			leftAvg === rightAvg ? 'Tie'
			: leftAvg < rightAvg ? lName
			: rName;

		return {
			key,
			label,
			hasData: true,
			leftAvg,
			rightAvg,
			delta,
			faster,
			sampleSize,
		};
	});

	const commonLapNumbers = [...comparableLaps].sort((a, b) => a - b);
	const firstCommonLap =
		commonLapNumbers.length > 0 ? commonLapNumbers[0] : null;
	const [lapCompareSelection, setLapCompareSelection] = useState('');
	const [lapDropdownOpen, setLapDropdownOpen] = useState(false);
	const lapDropdownRef = useRef(null);

	useEffect(() => {
		if (!lapDropdownOpen) return undefined;
		const onMouseDown = (event) => {
			if (!lapDropdownRef.current?.contains(event.target)) {
				setLapDropdownOpen(false);
			}
		};
		const onEscape = (event) => {
			if (event.key === 'Escape') setLapDropdownOpen(false);
		};
		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('keydown', onEscape);
		};
	}, [lapDropdownOpen]);

	const lapCompareOptions = commonLapNumbers.map((lap) => ({
		value: `lap-${lap}`,
		label: `Lap ${lap}`,
	}));

	const effectiveLapCompareSelection = (() => {
		if (lapCompareSelection === 'average') return 'average';
		const validSelections = new Set(
			commonLapNumbers.map((lap) => `lap-${lap}`)
		);
		if (validSelections.has(lapCompareSelection)) return lapCompareSelection;
		if (Number.isFinite(firstCommonLap)) return `lap-${firstCommonLap}`;
		return 'average';
	})();

	const isAverageSelection = effectiveLapCompareSelection === 'average';
	const selectedLapNumber =
		!isAverageSelection && effectiveLapCompareSelection.startsWith('lap-') ?
			Number(effectiveLapCompareSelection.replace('lap-', ''))
		:	null;

	const selectedLeftLap =
		Number.isFinite(selectedLapNumber) ?
			leftLapMap.get(selectedLapNumber)
		:	null;
	const selectedRightLap =
		Number.isFinite(selectedLapNumber) ?
			rightLapMap.get(selectedLapNumber)
		:	null;

	const lapCompareMetrics = [
		{
			id: 's1',
			label: 'sector 1',
			left:
				isAverageSelection ?
					sectorSummary.find((row) => row.key === 's1')?.leftAvg
				:	selectedLeftLap?.s1,
			right:
				isAverageSelection ?
					sectorSummary.find((row) => row.key === 's1')?.rightAvg
				:	selectedRightLap?.s1,
		},
		{
			id: 's2',
			label: 'sector 2',
			left:
				isAverageSelection ?
					sectorSummary.find((row) => row.key === 's2')?.leftAvg
				:	selectedLeftLap?.s2,
			right:
				isAverageSelection ?
					sectorSummary.find((row) => row.key === 's2')?.rightAvg
				:	selectedRightLap?.s2,
		},
		{
			id: 's3',
			label: 'sector 3',
			left:
				isAverageSelection ?
					sectorSummary.find((row) => row.key === 's3')?.leftAvg
				:	selectedLeftLap?.s3,
			right:
				isAverageSelection ?
					sectorSummary.find((row) => row.key === 's3')?.rightAvg
				:	selectedRightLap?.s3,
		},
		{
			id: 'lap',
			label: 'lap',
			left: isAverageSelection ? leftAverageLap : selectedLeftLap?.lap_time_sec,
			right:
				isAverageSelection ? rightAverageLap : selectedRightLap?.lap_time_sec,
		},
	].map((metric) => {
		const left = Number(metric.left);
		const right = Number(metric.right);
		const hasData = Number.isFinite(left) && Number.isFinite(right);
		if (!hasData) {
			return {
				...metric,
				hasData: false,
				delta: null,
				faster: null,
			};
		}
		const delta = right - left;
		const faster =
			delta === 0 ? 'Tie'
			: delta > 0 ? lName
			: rName;
		return {
			...metric,
			hasData: true,
			delta,
			faster,
			left,
			right,
		};
	});

	const overallLapMetric = lapCompareMetrics.find(
		(metric) => metric.id === 'lap' && metric.hasData
	);
	const lapCompareLabel =
		isAverageSelection ? 'Average pace'
		: Number.isFinite(selectedLapNumber) ? `Lap ${selectedLapNumber}`
		: 'Lap comparison';
	const selectedCompareOption =
		lapCompareOptions.find(
			(option) => option.value === effectiveLapCompareSelection
		) || null;
	const lapDropdownButtonLabel =
		selectedCompareOption?.label ||
		(lapCompareOptions.length > 0 ? 'Select Lap' : 'No laps');

	const selectedLapIndex =
		Number.isFinite(selectedLapNumber) ?
			commonLapNumbers.indexOf(selectedLapNumber)
		:	-1;
	const previousLapNumber =
		selectedLapIndex > 0 ? commonLapNumbers[selectedLapIndex - 1] : null;
	const nextLapNumber =
		selectedLapIndex >= 0 && selectedLapIndex < commonLapNumbers.length - 1 ?
			commonLapNumbers[selectedLapIndex + 1]
		:	null;

	const metricById = Object.fromEntries(
		lapCompareMetrics.map((metric) => [metric.id, metric])
	);
	const FAST_DELTA_COLOR = '#22d3a6';
	const SLOW_DELTA_COLOR = '#f97316';

	function getCellView(metricId, side) {
		const metric = metricById[metricId];
		if (!metric?.hasData) {
			return {
				value: null,
				gapText: '-',
				color: 'rgba(255,255,255,0.65)',
			};
		}

		const leftValue = Number(metric.left);
		const rightValue = Number(metric.right);
		const value = side === 'left' ? leftValue : rightValue;
		const opponentValue = side === 'left' ? rightValue : leftValue;
		const diff = value - opponentValue;

		let color = 'rgba(255,255,255,0.85)';
		if (diff < 0) color = FAST_DELTA_COLOR;
		if (diff > 0) color = SLOW_DELTA_COLOR;

		const gapText =
			diff === 0 ? '0.000s' : (
				`${diff > 0 ? '+' : '-'}${Math.abs(diff).toFixed(3)}s`
			);

		return {
			value,
			gapText,
			color,
		};
	}

	return (
		<div className="mt-4 space-y-4">
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_1fr]">
				{/* Key Stats */}
				<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5">
					<h2 className="text-sm font-semibold text-white mb-4">
						Race Session Stats
					</h2>

					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-2">
							<div></div>
							<div className="text-center">
								<span className="text-[10px] uppercase text-white/40 block mb-1 truncate">
									{lName}
								</span>
								<div
									className="w-4 h-1 mx-auto rounded-full"
									style={{ backgroundColor: lc }}
								/>
							</div>
							<div className="text-center">
								<span className="text-[10px] uppercase text-white/40 block mb-1 truncate">
									{rName}
								</span>
								<div
									className="w-4 h-1 mx-auto rounded-full"
									style={{ backgroundColor: rc }}
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-2 items-center border-b border-white/5 pb-2">
							<span className="text-xs text-white/60">Starting Position</span>
							<span className="text-center text-sm font-medium">
								{lRow?.grid_position ? `P${lRow.grid_position}` : '-'}
							</span>
							<span className="text-center text-sm font-medium">
								{rRow?.grid_position ? `P${rRow.grid_position}` : '-'}
							</span>
						</div>

						<div className="grid grid-cols-3 gap-2 items-center border-b border-white/5 pb-2">
							<span className="text-xs text-white/60">Finish Position</span>
							<span className="text-center text-sm font-medium">
								{lRow?.position ? `P${lRow.position}` : 'DNF'}
							</span>
							<span className="text-center text-sm font-medium">
								{rRow?.position ? `P${rRow.position}` : 'DNF'}
							</span>
						</div>

						<div className="grid grid-cols-3 gap-2 items-center border-b border-white/5 pb-2">
							<span className="text-xs text-white/60">Best Lap</span>
							<span className="text-center text-sm font-medium">
								{leftBestLapDisplay}
							</span>
							<span className="text-center text-sm font-medium">
								{rightBestLapDisplay}
							</span>
						</div>

						<div className="mt-4 p-3 bg-white/5 rounded-xl flex flex-col items-center justify-center space-y-1">
							<span className="text-[10px] text-white/50 uppercase tracking-wider">
								Head-to-Head Gap
							</span>
							<div className="text-sm font-semibold flex items-center space-x-3 mt-1 text-amber-400">
								{(() => {
									if (!lRow || !rRow) return <span>N/A</span>;
									const pA = parseInt(lRow.position);
									const pB = parseInt(rRow.position);
									if (isNaN(pA) && isNaN(pB)) return <span>Both DNF</span>;
									if (isNaN(pA))
										return (
											<span>
												{rName} finished (DNF for {lName})
											</span>
										);
									if (isNaN(pB))
										return (
											<span>
												{lName} finished (DNF for {rName})
											</span>
										);
									if (pA === pB) return <span>Same Position</span>;

									const ahead = pA < pB ? lName : rName;
									const gapStr =
										Number.isFinite(comparableLapGapMs) ?
											formatTimeDiff(Math.abs(comparableLapGapMs)).replace(
												'+ ',
												''
											)
										:	calculateGap(lRow, rRow).replace('+ ', '');
									return (
										<>
											<span>{ahead} ahead by</span>
											<span className="text-white px-2 py-0.5 rounded-md bg-white/10">
												{gapStr}
											</span>
										</>
									);
								})()}
							</div>
						</div>
					</div>
				</div>

				{/* Lap Traces Chart */}
				<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5 min-h-[300px] min-w-0 flex flex-col">
					<div className="mb-2 flex items-center justify-between gap-3">
						<h2 className="text-sm font-semibold text-white">
							Race Lap Traces
						</h2>
						{trackGenStatus?.status === 'generating' && (
							<span className="text-[10px] uppercase tracking-[0.16em] text-amber-300/70">
								Enriched track data generating...
							</span>
						)}
					</div>
					{lapChartData.length > 0 ?
						<>
							<div className="mb-2 flex flex-wrap items-center gap-2">
								<div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/2 px-2 py-1">
									<div className="relative h-5 w-5 overflow-hidden rounded-full border border-white/20 bg-black/30">
										{leftAvatar && (
											<Image
												src={leftAvatar}
												alt={lName}
												fill
												className={
													comparisonType === 'drivers' ?
														'object-cover object-top'
													:	'object-contain p-0.5'
												}
											/>
										)}
									</div>
									<div
										className="h-0.5 w-6 rounded-full"
										style={{ backgroundColor: lc }}
									/>
									<span className="text-[10px] text-white/70 truncate max-w-24">
										{lName}
									</span>
								</div>
								<div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/2 px-2 py-1">
									<div className="relative h-5 w-5 overflow-hidden rounded-full border border-white/20 bg-black/30">
										{rightAvatar && (
											<Image
												src={rightAvatar}
												alt={rName}
												fill
												className={
													comparisonType === 'drivers' ?
														'object-cover object-top'
													:	'object-contain p-0.5'
												}
											/>
										)}
									</div>
									<div
										className="h-0.5 w-6 rounded-full"
										style={{
											backgroundColor: rc,
											backgroundImage:
												'repeating-linear-gradient(90deg, transparent 0px, transparent 4px, rgba(255,255,255,0.45) 4px, rgba(255,255,255,0.45) 7px)',
										}}
									/>
									<span className="text-[10px] text-white/70 truncate max-w-24">
										{rName}
									</span>
								</div>
								{excludedLapMarkers.length > 0 && (
									<div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/2 px-2 py-1">
										<span className="text-[10px] uppercase tracking-[0.12em] text-white/45">
											Excluded
										</span>
										{pitExcludedLabel && (
											<span className="text-[10px] text-amber-300/85">
												Pit: {pitExcludedLabel}
											</span>
										)}
										{neutralizedExcludedLabel && (
											<span className="text-[10px] text-sky-300/80">
												SC/VSC: {neutralizedExcludedLabel}
											</span>
										)}
									</div>
								)}
							</div>
							<div className="flex-1 min-h-[250px] min-w-0 w-full">
								<div
									className="h-full w-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25"
									style={{
										scrollbarWidth: 'thin',
										scrollbarColor: '#6b7280 #11131a',
									}}
								>
									<div
										className="h-[280px]"
										style={{ width: `${safeChartWidth}px`, minWidth: '100%' }}
									>
										<ResponsiveContainer
											width="100%"
											height="100%"
										>
											<LineChart
												data={lapChartData}
												margin={{ top: 16, right: 12, left: -12, bottom: 0 }}
											>
												<CartesianGrid
													strokeDasharray="3 3"
													stroke="#ffffff10"
													vertical={false}
												/>
												<XAxis
													dataKey="lap"
													type="category"
													stroke="#ffffff50"
													fontSize={10}
													tickLine={false}
													interval={0}
													tickMargin={8}
													tickFormatter={(lap) => `L${lap}`}
												/>
												<YAxis
													domain={yDomain}
													reversed
													stroke="#ffffff50"
													fontSize={10}
													tickLine={false}
													tickFormatter={(val) => `${Number(val).toFixed(1)}s`}
												/>
												<Tooltip
													contentStyle={{
														backgroundColor: '#0b0d12',
														borderColor: '#ffffff20',
														borderRadius: '8px',
													}}
													itemStyle={{ fontSize: '12px' }}
													labelStyle={{ color: '#ffffff80', fontSize: '11px' }}
													formatter={(value, name) => {
														if (!Number.isFinite(Number(value)))
															return ['--', name];
														return [`${Number(value).toFixed(3)}s`, name];
													}}
													labelFormatter={(lap, payload) => {
														const reason = excludedLapReasonByLap.get(
															Number(lap)
														);
														if (reason === 'pit') {
															return `Lap ${lap} · Pit stop lap excluded`;
														}
														if (reason === 'neutralized') {
															return `Lap ${lap} · Safety car / VSC lap excluded`;
														}
														const row = payload?.[0]?.payload;
														if (!row || !Number.isFinite(row.gap_sec))
															return `Lap ${lap}`;
														const faster =
															row.gap_sec === 0 ? 'Tie'
															: row.gap_sec > 0 ? lName
															: rName;
														return `Lap ${lap} · ${faster} faster by ${Math.abs(row.gap_sec).toFixed(3)}s`;
													}}
												/>
												{excludedLapMarkers.map((marker) => (
													<ReferenceLine
														key={`excluded-${marker.lap}`}
														x={marker.lap}
														stroke={
															marker.reason === 'pit' ? '#f59e0b' : '#38bdf8'
														}
														strokeDasharray="3 3"
														strokeOpacity={0.45}
													/>
												))}
												<Line
													type="monotone"
													dataKey={lName}
													stroke={lc}
													strokeWidth={2}
													dot={false}
													activeDot={{ r: 4 }}
													connectNulls
												/>
												<Line
													type="monotone"
													dataKey={rName}
													stroke={rc}
													strokeWidth={2}
													strokeDasharray="6 4"
													dot={false}
													activeDot={{ r: 4 }}
													connectNulls
												/>
											</LineChart>
										</ResponsiveContainer>
									</div>
								</div>
							</div>
						</>
					:	<div className="flex-1 border border-white/5 rounded-2xl flex flex-col items-center justify-center bg-white/1">
							<span className="text-white/20 text-xs uppercase tracking-widest text-center px-4">
								{safeTelemetry.lap_traces?.length > 0 ?
									'No Laps for selected drivers'
								:	'Lap Traces Unavailable'}
							</span>
						</div>
					}
				</div>
			</div>

			<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5">
				<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-sm font-semibold text-white">
						Sector & Lap Compare
					</h2>
					<button
						type="button"
						onClick={() => {
							if (isAverageSelection) {
								if (commonLapNumbers.length > 0) {
									setLapCompareSelection(`lap-${commonLapNumbers[0]}`);
								}
								return;
							}
							setLapCompareSelection('average');
						}}
						className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${isAverageSelection ? 'border-emerald-300/45 bg-emerald-500/12 text-emerald-200' : 'border-white/10 bg-black/35 text-white/80 hover:border-white/20'}`}
					>
						{isAverageSelection ? 'Back To First Lap' : 'Show Average Diff'}
					</button>
				</div>

				<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								if (!Number.isFinite(previousLapNumber)) return;
								setLapCompareSelection(`lap-${previousLapNumber}`);
							}}
							disabled={!Number.isFinite(previousLapNumber)}
							className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70 transition hover:border-white/20 disabled:opacity-35 disabled:cursor-not-allowed"
						>
							<FaChevronRight
								size={9}
								className="rotate-180"
							/>
							<span>
								{Number.isFinite(previousLapNumber) ?
									`Lap ${previousLapNumber}`
								:	'Prev --'}
							</span>
						</button>
						<span className="rounded-md border border-white/10 bg-white/3 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/65">
							{lapCompareLabel}
						</span>
						<button
							type="button"
							onClick={() => {
								if (!Number.isFinite(nextLapNumber)) return;
								setLapCompareSelection(`lap-${nextLapNumber}`);
							}}
							disabled={!Number.isFinite(nextLapNumber)}
							className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70 transition hover:border-white/20 disabled:opacity-35 disabled:cursor-not-allowed"
						>
							<span>
								{Number.isFinite(nextLapNumber) ?
									`Lap ${nextLapNumber}`
								:	'Next --'}
							</span>
							<FaChevronRight size={9} />
						</button>
					</div>
					{overallLapMetric?.hasData && (
						<span className="text-[11px] text-white/55">
							{overallLapMetric.faster === 'Tie' ?
								'Equal lap pace'
							:	`${overallLapMetric.faster} faster by ${Math.abs(overallLapMetric.delta).toFixed(3)}s`
							}
						</span>
					)}
				</div>

				<div className="rounded-2xl border border-white/8 bg-black/35 p-3">
					<div className="overflow-x-auto">
						<table className="min-w-full border-separate border-spacing-y-1.5 text-sm">
							<thead>
								<tr>
									<th className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-white/45">
										{isConstructorComparison ? 'Team' : 'Driver'}
									</th>
									<th className="px-3 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-white/45">
										Sector 1
									</th>
									<th className="px-3 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-white/45">
										Sector 2
									</th>
									<th className="px-3 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-white/45">
										Sector 3
									</th>
									<th className="px-3 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-white/45">
										<div className="inline-flex items-center gap-2">
											<div
												ref={lapDropdownRef}
												className="relative"
											>
												<button
													type="button"
													onClick={() => setLapDropdownOpen((open) => !open)}
													disabled={lapCompareOptions.length === 0}
													className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/80 transition hover:border-white/20 disabled:opacity-35 disabled:cursor-not-allowed"
												>
													<span>{lapDropdownButtonLabel}</span>
													<FaChevronDown
														size={8}
														className={`transition-transform ${lapDropdownOpen ? 'rotate-180' : ''}`}
													/>
												</button>
												{lapDropdownOpen && lapCompareOptions.length > 0 && (
													<div className="absolute right-0 top-[calc(100%+6px)] z-50 w-44 overflow-hidden rounded-xl border border-white/8 bg-[#0a0b0f] shadow-2xl">
														<div className="max-h-64 overflow-y-auto py-1">
															{lapCompareOptions.map((option) => {
																const active =
																	effectiveLapCompareSelection === option.value;
																return (
																	<button
																		key={option.value}
																		type="button"
																		onClick={() => {
																			setLapCompareSelection(option.value);
																			setLapDropdownOpen(false);
																		}}
																		className={`w-full px-3 py-2 text-left text-[11px] transition ${active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'}`}
																	>
																		{option.label}
																	</button>
																);
															})}
														</div>
													</div>
												)}
											</div>
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{[
									{
										key: 'left',
										name: lName,
										avatar: leftAvatar,
										accent: lc,
										s1: getCellView('s1', 'left'),
										s2: getCellView('s2', 'left'),
										s3: getCellView('s3', 'left'),
										lap: getCellView('lap', 'left'),
									},
									{
										key: 'right',
										name: rName,
										avatar: rightAvatar,
										accent: rc,
										s1: getCellView('s1', 'right'),
										s2: getCellView('s2', 'right'),
										s3: getCellView('s3', 'right'),
										lap: getCellView('lap', 'right'),
									},
								].map((row) => (
									<tr
										key={row.key}
										className="bg-white/2"
									>
										<td className="rounded-l-xl border border-white/8 border-r-0 px-3 py-2">
											<div className="flex items-center gap-2.5 min-w-[180px]">
												<div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/20 bg-black/30">
													{row.avatar && (
														<Image
															src={row.avatar}
															alt={row.name}
															fill
															className={
																comparisonType === 'drivers' ?
																	'object-cover object-top'
																:	'object-contain p-0.5'
															}
														/>
													)}
												</div>
												<div>
													<p className="text-sm font-semibold text-white truncate max-w-[140px]">
														{row.name}
													</p>
													<div
														className="mt-0.5 h-0.5 w-10 rounded-full"
														style={{ backgroundColor: row.accent }}
													/>
												</div>
											</div>
										</td>
										<td className="border border-white/8 border-l-0 border-r-0 px-3 py-2 text-center">
											<p
												className="text-[13px] font-medium"
												style={{ color: row.s1.color }}
											>
												{Number.isFinite(row.s1.value) ?
													`${formatSectorSeconds(row.s1.value)}s`
												:	'-'}
											</p>
											<p className="text-[10px] text-white/40">
												{row.s1.gapText}
											</p>
										</td>
										<td className="border border-white/8 border-l-0 border-r-0 px-3 py-2 text-center">
											<p
												className="text-[13px] font-medium"
												style={{ color: row.s2.color }}
											>
												{Number.isFinite(row.s2.value) ?
													`${formatSectorSeconds(row.s2.value)}s`
												:	'-'}
											</p>
											<p className="text-[10px] text-white/40">
												{row.s2.gapText}
											</p>
										</td>
										<td className="border border-white/8 border-l-0 border-r-0 px-3 py-2 text-center">
											<p
												className="text-[13px] font-medium"
												style={{ color: row.s3.color }}
											>
												{Number.isFinite(row.s3.value) ?
													`${formatSectorSeconds(row.s3.value)}s`
												:	'-'}
											</p>
											<p className="text-[10px] text-white/40">
												{row.s3.gapText}
											</p>
										</td>
										<td className="rounded-r-xl border border-white/8 border-l-0 px-3 py-2 text-center">
											<p
												className="text-[14px] font-semibold"
												style={{ color: row.lap.color }}
											>
												{Number.isFinite(row.lap.value) ?
													formatLapSeconds(row.lap.value)
												:	'-'}
											</p>
											<p className="text-[10px] text-white/40">
												{row.lap.gapText}
											</p>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function DriverComparisonPageClient() {
	const currentYear = new Date().getFullYear();
	const searchParams = useSearchParams();

	const urlYear = Number(searchParams.get('year'));
	const initialYear =
		Number.isFinite(urlYear) && urlYear >= 1950 && urlYear <= currentYear ?
			urlYear
		:	currentYear;
	const requestedType =
		searchParams.get('type') === 'constructors' ? 'constructors' : 'drivers';
	const requestedView =
		searchParams.get('view') === 'career' ? 'career' : 'season';
	const requestedRoundRaw = searchParams.get('round') || 'all';
	const initialRound =
		/^\d+$/.test(requestedRoundRaw) ? requestedRoundRaw : 'all';

	const [year, setYear] = useState(initialYear);
	const [comparisonType, setComparisonType] = useState(requestedType);
	const [viewMode, setViewMode] = useState(requestedView);
	const [dataset, setDataset] = useState({
		drivers: [],
		constructors: [],
		rounds: 0,
	});
	const [comparisonData, setComparisonData] = useState({
		scope: 'season',
		round: null,
		rounds: 0,
		race_name: null,
		drivers: [],
		constructors: [],
	});
	const [loading, setLoading] = useState(true);

	const [schedule, setSchedule] = useState([]);
	const [selectedRace, setSelectedRace] = useState(initialRound);

	const [raceTelemetry, setRaceTelemetry] = useState(null);
	const [telemetryLoading, setTelemetryLoading] = useState(false);
	const [trackData, setTrackData] = useState(null);
	const [trackGenStatus, setTrackGenStatus] = useState(null);
	const [dbCareerStats, setDbCareerStats] = useState({
		drivers: [],
		constructors: [],
	});

	// Seed from URL params once — state owns selection from here on
	const [leftKey, setLeftKey] = useState(() => {
		const p = searchParams.get('a') || '';
		return requestedType === 'drivers' ? p.trim().toUpperCase() : p.trim();
	});
	const [rightKey, setRightKey] = useState(() => {
		const p = searchParams.get('b') || '';
		return requestedType === 'drivers' ? p.trim().toUpperCase() : p.trim();
	});
	const [hasUserInteracted, setHasUserInteracted] = useState(false);
	const hasHydratedYearRef = useRef(false);
	const markUserInteraction = useCallback(() => {
		setHasUserInteracted(true);
	}, []);

	const years = useMemo(
		() =>
			Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i),
		[currentYear]
	);

	const availableSchedule = useMemo(() => {
		const now = Date.now();
		return (Array.isArray(schedule) ? schedule : [])
			.filter((race) => {
				const raceDate = parseRaceDate(race);
				if (!raceDate) return true;
				return raceDate.getTime() <= now;
			})
			.sort((a, b) => Number(a?.round || 0) - Number(b?.round || 0));
	}, [schedule]);

	const effectiveSelectedRace = viewMode === 'season' ? selectedRace : 'all';

	useEffect(() => {
		let active = true;
		setLoading(true);
		const scheduleController = new AbortController();
		const scheduleTimeout = setTimeout(() => {
			scheduleController.abort();
		}, OPTIONAL_FETCH_TIMEOUT_MS);

		Promise.allSettled([
			getComparisonDataset(year),
			getSchedule(year, { signal: scheduleController.signal }),
		])
			.then(([dataResult, scheduleResult]) => {
				if (!active) return;
				const data =
					dataResult.status === 'fulfilled' ?
						dataResult.value
					:	{
							drivers: [],
							constructors: [],
							rounds: 0,
						};
				const scheduleData =
					scheduleResult.status === 'fulfilled' &&
					Array.isArray(scheduleResult.value) ?
						scheduleResult.value
					:	[];
				setDataset({
					drivers: Array.isArray(data?.drivers) ? data.drivers : [],
					constructors:
						Array.isArray(data?.constructors) ? data.constructors : [],
					rounds: Number(data?.rounds || 0),
				});
				setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
				if (hasHydratedYearRef.current) {
					setSelectedRace('all'); // Reset race when user changes year
				} else {
					hasHydratedYearRef.current = true;
				}
			})
			.finally(() => {
				clearTimeout(scheduleTimeout);
				if (active) setLoading(false);
			});
		return () => {
			active = false;
			clearTimeout(scheduleTimeout);
			scheduleController.abort();
		};
	}, [year]);

	useEffect(() => {
		Promise.allSettled([
			getDriverCareerStats(),
			getConstructorCareerStats(),
		]).then(([resD, resC]) => {
			const mapKeysToCamel = (obj) => {
				if (!obj) return {};
				return {
					...obj,
					worldChampionships: obj.world_championships || 0,
					careerEntries: obj.career_entries || 0,
					careerStarts: obj.career_starts || 0,
					careerWins: obj.career_wins || 0,
					careerPodiums: obj.career_podiums || 0,
					careerPoles: obj.career_poles || 0,
					careerFastestLaps: obj.career_fastest_laps || 0,
					careerPoints: obj.career_points || 0,
				};
			};
			setDbCareerStats({
				drivers:
					resD.status === 'fulfilled' && Array.isArray(resD.value) ?
						resD.value.map(mapKeysToCamel)
					:	[],
				constructors:
					resC.status === 'fulfilled' && Array.isArray(resC.value) ?
						resC.value.map(mapKeysToCamel)
					:	[],
			});
		});
	}, []);

	useEffect(() => {
		if (selectedRace === 'all' || availableSchedule.length === 0) return;
		const exists = availableSchedule.some(
			(race) => String(race?.round) === String(selectedRace)
		);
		if (!exists) setSelectedRace('all');
	}, [availableSchedule, selectedRace]);

	useEffect(() => {
		if (effectiveSelectedRace === 'all') {
			setRaceTelemetry(null);
			return;
		}

		let active = true;
		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, OPTIONAL_FETCH_TIMEOUT_MS);
		setTelemetryLoading(true);

		getTelemetrySessionSnapshot({
			year,
			round: effectiveSelectedRace,
			signal: controller.signal,
		})
			.then((data) => {
				if (!active) return;
				setRaceTelemetry(data);
			})
			.catch((err) => {
				if (isRequestCanceled(err)) {
					if (active) setRaceTelemetry(null);
					return;
				}
				console.error('Failed to fetch race telemetry', err);
				if (active) setRaceTelemetry(null);
			})
			.finally(() => {
				clearTimeout(timeout);
				if (active) setTelemetryLoading(false);
			});

		return () => {
			active = false;
			clearTimeout(timeout);
			controller.abort();
		};
	}, [year, effectiveSelectedRace]);

	useEffect(() => {
		if (effectiveSelectedRace === 'all') {
			setTrackData(null);
			setTrackGenStatus(null);
			return;
		}

		let active = true;
		const controller = new AbortController();
		setTrackData(null);
		setTrackGenStatus({
			status: 'loading',
			message: 'Checking enriched track dataset...',
		});

		getSessionData(year, effectiveSelectedRace, {
			signal: controller.signal,
			onStatus: (status) => {
				if (!active) return;
				setTrackGenStatus(status || null);
			},
		})
			.then((data) => {
				if (!active) return;
				setTrackData(data);
				setTrackGenStatus({ status: 'ready', message: 'Track dataset ready' });
			})
			.catch((err) => {
				if (!active || err?.name === 'AbortError') return;
				if (err?.response?.status === 401 || err?.response?.status === 403) {
					setTrackData(null);
					setTrackGenStatus({
						status: 'auth_required',
						message: 'Sign in to access enriched track telemetry.',
					});
					return;
				}
				console.error('Failed to fetch track session data', err);
				setTrackData(null);
				setTrackGenStatus({
					status: 'error',
					message: err?.message || 'Track data generation failed',
				});
			});

		return () => {
			active = false;
			controller.abort();
		};
	}, [year, effectiveSelectedRace]);

	// Force season mode if career isn't available
	useEffect(() => {
		// Only forcefully reset to season if we know career stats are fully loaded but none matched
	}, [comparisonType, viewMode]);

	const entities = useMemo(() => {
		if (comparisonType === 'drivers')
			return dataset.drivers.filter((r) => r.driver_code || r.driver_name);
		return dataset.constructors;
	}, [dataset, comparisonType]);

	const validKeys = useMemo(
		() => entities.map((e) => getKey(e, comparisonType)),
		[entities, comparisonType]
	);

	useEffect(() => {
		if (!validKeys.length) return;
		const nextLeft = validKeys[0];
		const nextRight = validKeys.find((k) => k !== nextLeft) || nextLeft;

		if (!leftKey || !validKeys.includes(leftKey)) {
			setLeftKey(nextLeft);
		}
		if (!rightKey || !validKeys.includes(rightKey) || rightKey === nextLeft) {
			setRightKey(nextRight);
		}
	}, [validKeys, leftKey, rightKey]);

	// Resolution: state-first, no URL params after initial seed
	const resolvedLeft = useMemo(() => {
		if (!validKeys.length) return '';
		if (validKeys.includes(leftKey)) return leftKey;
		return validKeys[0];
	}, [validKeys, leftKey]);

	const resolvedRight = useMemo(() => {
		if (!validKeys.length) return '';
		if (validKeys.includes(rightKey) && rightKey !== resolvedLeft)
			return rightKey;
		return validKeys.find((k) => k !== resolvedLeft) || resolvedLeft;
	}, [validKeys, rightKey, resolvedLeft]);

	const comparisonScope = useMemo(() => {
		if (viewMode === 'career') return 'career';
		return effectiveSelectedRace === 'all' ? 'season' : 'race';
	}, [viewMode, effectiveSelectedRace]);

	useEffect(() => {
		if (!resolvedLeft || !resolvedRight) {
			setComparisonData((prev) => ({
				...prev,
				scope: comparisonScope,
				drivers: [],
				constructors: [],
			}));
			return;
		}

		let active = true;
		const loadComparison =
			comparisonType === 'drivers' ?
				getDriverComparison
			:	getConstructorComparison;

		loadComparison(year, {
			left: resolvedLeft,
			right: resolvedRight,
			scope: comparisonScope,
			round:
				comparisonScope === 'race' ?
					Number(effectiveSelectedRace)
				:	undefined,
		})
			.then((data) => {
				if (!active) return;
				setComparisonData({
					scope: data?.scope || comparisonScope,
					round: data?.round ?? null,
					rounds: Number(data?.rounds || 0),
					race_name: data?.race_name || null,
					drivers: Array.isArray(data?.drivers) ? data.drivers : [],
					constructors:
						Array.isArray(data?.constructors) ? data.constructors : [],
				});
			})
			.catch((error) => {
				if (!active) return;
				console.error('Failed to fetch comparison data', error);
				setComparisonData({
					scope: comparisonScope,
					round:
						comparisonScope === 'race' ?
							Number(effectiveSelectedRace)
						:	null,
					rounds: 0,
					race_name: null,
					drivers: [],
					constructors: [],
				});
			});

		return () => {
			active = false;
		};
	}, [
		comparisonType,
		year,
		comparisonScope,
		effectiveSelectedRace,
		resolvedLeft,
		resolvedRight,
	]);

	const comparisonRows = useMemo(() => {
		return comparisonType === 'drivers' ?
				(Array.isArray(comparisonData.drivers) ? comparisonData.drivers : [])
			:	(Array.isArray(comparisonData.constructors) ?
					comparisonData.constructors
				:	[]);
	}, [comparisonData, comparisonType]);

	const leftEntity = useMemo(() => {
		const compared =
			comparisonRows.find((e) => getKey(e, comparisonType) === resolvedLeft) ||
			null;
		return (
			compared ||
			entities.find((e) => getKey(e, comparisonType) === resolvedLeft) ||
			null
		);
	}, [comparisonRows, entities, comparisonType, resolvedLeft]);
	const rightEntity = useMemo(() => {
		const compared =
			comparisonRows.find((e) => getKey(e, comparisonType) === resolvedRight) ||
			null;
		return (
			compared ||
			entities.find((e) => getKey(e, comparisonType) === resolvedRight) ||
			null
		);
	}, [comparisonRows, entities, comparisonType, resolvedRight]);

	// Career catalog entries
	const leftCat = useMemo(() => {
		if (viewMode === 'career' && leftEntity) return leftEntity;
		if (comparisonType === 'drivers') {
			const dbD = dbCareerStats.drivers.find(
				(d) =>
					d.driver_code === leftEntity?.driver_code ||
					d.driver_name === leftEntity?.driver_name
			);
			return dbD || driverCatalog(leftEntity?.driver_code);
		} else {
			return (
				dbCareerStats.constructors.find(
					(c) => c.team_name === leftEntity?.team_name
				) || null
			);
		}
	}, [leftEntity, comparisonType, dbCareerStats, viewMode]);

	const rightCat = useMemo(() => {
		if (viewMode === 'career' && rightEntity) return rightEntity;
		if (comparisonType === 'drivers') {
			const dbD = dbCareerStats.drivers.find(
				(d) =>
					d.driver_code === rightEntity?.driver_code ||
					d.driver_name === rightEntity?.driver_name
			);
			return dbD || driverCatalog(rightEntity?.driver_code);
		} else {
			return (
				dbCareerStats.constructors.find(
					(c) => c.team_name === rightEntity?.team_name
				) || null
			);
		}
	}, [rightEntity, comparisonType, dbCareerStats, viewMode]);

	const { lc, rc } = useMemo(
		() => resolveColors(leftEntity, rightEntity),
		[leftEntity, rightEntity]
	);

	const { token, isAuthenticated } = useAuth();
	const historyLoggedRef = useRef('');
	const historyLogTimeoutRef = useRef(null);

	useEffect(() => {
		const shouldLogComparison = hasUserInteracted || selectedRace !== 'all';
		if (
			!isAuthenticated ||
			!token ||
			!leftEntity ||
			!rightEntity ||
			!shouldLogComparison
		) {
			if (historyLogTimeoutRef.current) {
				clearTimeout(historyLogTimeoutRef.current);
				historyLogTimeoutRef.current = null;
			}
			return;
		}

		const hc =
			comparisonType === 'drivers' ?
				`${leftEntity.driver_code}-vs-${rightEntity.driver_code}-${viewMode}-${selectedRace}-${year}`
			:	`${leftEntity.team_name}-vs-${rightEntity.team_name}-${viewMode}-${selectedRace}-${year}`;

		if (historyLoggedRef.current === hc) return;

		if (historyLogTimeoutRef.current) {
			clearTimeout(historyLogTimeoutRef.current);
		}

		historyLogTimeoutRef.current = setTimeout(() => {
			historyLogTimeoutRef.current = null;
			if (historyLoggedRef.current === hc) return;
			historyLoggedRef.current = hc;

			const t1 =
				comparisonType === 'drivers' ?
					leftEntity.driver_name
				:	leftEntity.team_name;
			const t2 =
				comparisonType === 'drivers' ?
					rightEntity.driver_name
				:	rightEntity.team_name;
			const image =
				comparisonType === 'drivers' ?
					getTelemetryDriverImage(leftEntity.driver_code, 2026)
				:	getTeamLogoPath(leftEntity.team_name);
			const params = new URLSearchParams({
				type: comparisonType,
				year: String(year),
				a: getKey(leftEntity, comparisonType),
				b: getKey(rightEntity, comparisonType),
			});
			if (viewMode === 'career') {
				params.set('view', 'career');
			} else if (selectedRace !== 'all') {
				params.set('round', String(selectedRace));
			}

			const baseSubtitle =
				comparisonType === 'drivers' ? 'Driver Telemetry' : 'Constructor Delta';
			const selectedRaceItem =
				selectedRace === 'all' ? null : (
					availableSchedule.find(
						(race) => String(race?.round) === String(selectedRace)
					)
				);
			const raceLabel =
				selectedRaceItem ? getRaceDisplayName(selectedRaceItem)
				: selectedRace !== 'all' ? `Round ${selectedRace}`
				: null;
			const subtitle =
				raceLabel ? `${year} - ${raceLabel} - ${baseSubtitle}` : baseSubtitle;

			logActivity(token, {
				activity_type: 'Comparison',
				title: `${t1} vs. ${t2}`,
				subtitle,
				image_url:
					image ||
					getCarImage(leftEntity.team_name) ||
					'/images/cars/2026redbullracingcarright.png',
				color_hex: resolveColors(leftEntity, rightEntity).lc || '#3671C6',
				reference_url: `/compare?${params.toString()}`,
			}).catch(console.error);
		}, HISTORY_LOG_DEBOUNCE_MS);

		return () => {
			if (historyLogTimeoutRef.current) {
				clearTimeout(historyLogTimeoutRef.current);
				historyLogTimeoutRef.current = null;
			}
		};
	}, [
		leftEntity,
		rightEntity,
		comparisonType,
		isAuthenticated,
		token,
		viewMode,
		selectedRace,
		hasUserInteracted,
		year,
		availableSchedule,
	]);

	const lName =
		comparisonType === 'drivers' ?
			leftEntity?.driver_name
		:	leftEntity?.team_name;
	const rName =
		comparisonType === 'drivers' ?
			rightEntity?.driver_name
		:	rightEntity?.team_name;

	const metrics = useMemo(() => {
		if (viewMode === 'career' && leftCat && rightCat)
			return buildCareerMetrics(leftCat, rightCat);
		return buildSeasonMetrics(leftEntity, rightEntity, comparisonType);
	}, [viewMode, leftCat, rightCat, leftEntity, rightEntity, comparisonType]);

	const radarData = useMemo(
		() =>
			metrics.map((m) => ({
				metric: m.shortLabel,
				[lName || 'A']: normalize(m, m.lv, m.rv),
				[rName || 'B']: normalize(m, m.rv, m.lv),
			})),
		[metrics, lName, rName]
	);

	const verdict = useMemo(() => {
		let lw = 0,
			rw = 0;
		metrics.forEach((m) => {
			const w = winner(m);
			if (w === 'left') lw++;
			if (w === 'right') rw++;
		});
		return {
			winner:
				lw === rw ? 'tie'
				: lw > rw ? 'left'
				: 'right',
			lw,
			rw,
		};
	}, [metrics]);

	const canCompare = Boolean(leftEntity && rightEntity);
	const careerAvailable =
		(comparisonType === 'drivers' || comparisonType === 'constructors') &&
		leftCat &&
		rightCat;
	const displayedRounds =
		Number(comparisonData?.rounds || 0) || Number(dataset?.rounds || 0);

	return (
		<div className="relative min-h-screen bg-[#060607] bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-4 pb-14 pt-28 text-[15px] text-white md:px-10 lg:px-16">
			<div className="fixed inset-0 z-0 bg-black/90" />
			<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_12%_16%,rgba(239,68,68,0.10),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.04),transparent_34%)]" />
			<div className="relative z-10 mx-auto max-w-7xl space-y-6">
				{/* ── Header ──────────────────────────────────────── */}
				<div className="mb-2 rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_12%_18%,rgba(239,68,68,0.2),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(170deg,rgba(12,12,14,0.98),rgba(6,7,9,0.98))] p-6 md:p-8">
					<p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/20 mb-2">
						FormulaHub · Analysis
					</p>
					<h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
						Head-to-Head
					</h1>
					<p className="mt-2 text-sm text-white/30 max-w-lg">
						Compare season form or lifetime stats across every measurable
						dimension.
					</p>

					{/* Type + View mode toggles */}
					<div className="mt-5 flex flex-wrap gap-3 items-center">
						<div className="inline-flex gap-1 rounded-xl border border-white/10 bg-black/45 p-1 backdrop-blur-xl">
							{[
								{
									key: 'drivers',
									label: 'Drivers',
									icon: <FaUsers size={10} />,
								},
								{
									key: 'constructors',
									label: 'Constructors',
									icon: <FaCarSide size={10} />,
								},
							].map(({ key, label, icon }) => (
								<button
									key={key}
									type="button"
									onClick={() => {
										markUserInteraction();
										setComparisonType(key);
									}}
									className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-200 ${comparisonType === key ? 'bg-white/12 text-white' : 'text-white/35 hover:text-white/70'}`}
								>
									{icon} {label}
								</button>
							))}
						</div>

						{/* Season / Career toggle */}
						<div className="inline-flex gap-1 rounded-xl border border-white/10 bg-black/45 p-1 backdrop-blur-xl">
							<button
								type="button"
								onClick={() => {
									markUserInteraction();
									setViewMode('season');
								}}
								className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-200 ${viewMode === 'season' ? 'bg-white/12 text-white' : 'text-white/35 hover:text-white/70'}`}
							>
								{year} Season
							</button>
							<button
								type="button"
								onClick={() => {
									markUserInteraction();
									setViewMode('career');
								}}
								disabled={!careerAvailable}
								className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-200 ${viewMode === 'career' ? 'bg-white/12 text-white' : 'text-white/35 hover:text-white/70'} disabled:opacity-25 disabled:cursor-not-allowed`}
							>
								<FaTrophy size={9} /> Career
							</button>
						</div>
					</div>
				</div>

				{/* ── Controls ────────────────────────────────────── */}
				<div
					className={`relative z-50 rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur-2xl md:grid md:items-end md:gap-3 md:p-5 overflow-visible ${viewMode === 'season' ? 'md:grid-cols-[1fr_40px_1fr_90px_260px]' : 'md:grid-cols-[1fr_40px_1fr]'}`}
				>
					<EntityDropdown
						label={comparisonType === 'drivers' ? 'Driver A' : 'Constructor A'}
						value={resolvedLeft}
						onChange={(k) => {
							markUserInteraction();
							setLeftKey(k);
						}}
						entities={entities}
						comparisonType={comparisonType}
						disabled={loading || entities.length < 2}
					/>

					<div className="flex items-end justify-center pb-1">
						<button
							type="button"
							onClick={() => {
								markUserInteraction();
								setLeftKey(resolvedRight);
								setRightKey(resolvedLeft);
							}}
							disabled={!canCompare}
							className="h-10 w-10 rounded-full border border-white/10 bg-white/4 text-white/35 transition hover:bg-white/8 hover:text-white disabled:opacity-20"
						>
							<FaExchangeAlt
								size={12}
								className="mx-auto"
							/>
						</button>
					</div>

					<EntityDropdown
						label={comparisonType === 'drivers' ? 'Driver B' : 'Constructor B'}
						value={resolvedRight}
						onChange={(k) => {
							markUserInteraction();
							setRightKey(k);
						}}
						entities={entities}
						comparisonType={comparisonType}
						disabled={loading || entities.length < 2}
					/>

					{viewMode === 'season' && (
						<>
							<div>
								<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
									Season
								</label>
								<SeasonDropdown
									value={year}
									onChange={(v) => {
										markUserInteraction();
										setLoading(true);
										setYear(Number(v));
									}}
									years={years}
									disabled={loading}
								/>
							</div>

							<div>
								<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
									Round
								</label>
								<RaceDropdown
									value={selectedRace}
									onChange={(v) => {
										markUserInteraction();
										setSelectedRace(v);
									}}
									schedule={availableSchedule}
									disabled={loading || availableSchedule.length === 0}
								/>
							</div>
						</>
					)}
				</div>

				{/* Note for career mode when season switcher isn't relevant */}
				{viewMode === 'career' && (
					<p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">
						Showing lifetime career stats · Season selector applies only to
						Season mode
					</p>
				)}

				{loading && <Skeleton />}

				{!loading && entities.length < 2 && (
					<div className="rounded-2xl border border-amber-400/12 bg-amber-500/5 p-5 text-sm text-amber-200/60">
						Not enough data for this season.
					</div>
				)}

				{!loading && canCompare && (
					<>
						{/* Identity cards */}
						<div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
							<IdentityCard
								entity={leftEntity}
								comparisonType={comparisonType}
								accentColor={lc}
								viewMode={viewMode}
								careerCat={leftCat}
							/>
							<IdentityCard
								entity={rightEntity}
								comparisonType={comparisonType}
								accentColor={rc}
								viewMode={viewMode}
								careerCat={rightCat}
							/>
						</div>

						{effectiveSelectedRace === 'all' ?
							<>
								{/* Radar + Metric rows */}
								<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
									{/* Radar */}
									<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5">
										<div className="flex items-center justify-between mb-3">
											<h2 className="text-sm font-semibold text-white">
												Performance Shape
											</h2>
											<span className="text-[9px] uppercase tracking-[0.16em] text-white/20">
												Normalized radar
											</span>
										</div>
										<div className="flex gap-4 mb-3">
											{[
												{ name: lName, color: lc },
												{ name: rName, color: rc },
											].map((l) => (
												<div
													key={l.name}
													className="flex items-center gap-2"
												>
													<div
														className="w-2.5 h-2.5 rounded-full shrink-0"
														style={{ backgroundColor: l.color }}
													/>
													<span className="text-[10px] text-white/40 truncate max-w-[100px]">
														{l.name}
													</span>
												</div>
											))}
										</div>
										<div className="h-64">
											<ResponsiveContainer>
												<RadarChart
													data={radarData}
													outerRadius="72%"
												>
													<PolarGrid stroke="rgba(255,255,255,0.06)" />
													<PolarAngleAxis
														dataKey="metric"
														tick={{ fill: '#6b7280', fontSize: 10 }}
													/>
													<Tooltip
														contentStyle={{
															backgroundColor: 'rgba(5,5,7,0.96)',
															border: '1px solid rgba(255,255,255,0.07)',
															borderRadius: 10,
															color: '#fff',
															fontSize: 11,
														}}
													/>
													<Radar
														name={lName}
														dataKey={lName}
														stroke={lc}
														fill={lc}
														fillOpacity={0.22}
														strokeWidth={1.5}
													/>
													<Radar
														name={rName}
														dataKey={rName}
														stroke={rc}
														fill={rc}
														fillOpacity={0.16}
														strokeWidth={1.5}
													/>
												</RadarChart>
											</ResponsiveContainer>
										</div>
									</div>

									{/* Metric rows */}
									<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5">
										<div className="grid grid-cols-[1fr_68px_1fr] items-center gap-2 mb-2 pb-3 border-b border-white/5">
											<div className="flex items-center gap-2">
												<div
													className="w-2 h-2 rounded-full shrink-0"
													style={{ backgroundColor: lc }}
												/>
												<span className="text-[9px] uppercase tracking-[0.12em] text-white/35 truncate">
													{lName}
												</span>
											</div>
											<div />
											<div className="flex items-center justify-end gap-2">
												<span className="text-[9px] uppercase tracking-[0.12em] text-white/35 truncate">
													{rName}
												</span>
												<div
													className="w-2 h-2 rounded-full shrink-0"
													style={{ backgroundColor: rc }}
												/>
											</div>
										</div>
										{metrics.map((m) => (
											<MetricRow
												key={m.id}
												metric={m}
												lc={lc}
												rc={rc}
											/>
										))}
									</div>
								</div>

								{/* Career bar chart (career mode) */}
								{viewMode === 'career' && leftCat && rightCat && (
									<CareerBarChart
										leftCat={leftCat}
										rightCat={rightCat}
										lName={lName}
										rName={rName}
										lc={lc}
										rc={rc}
									/>
								)}

								{/* Verdict */}
								<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
									<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-6">
										<p className="text-[10px] uppercase tracking-[0.24em] text-white/20 mb-3">
											{viewMode === 'career' ?
												'Career Verdict'
											:	`${year} Season Verdict`}
										</p>
										<p className="text-2xl font-semibold text-white leading-snug">
											{verdict.winner === 'tie' ?
												'Evenly Matched'
											: verdict.winner === 'left' ?
												`${lName} leads on ${verdict.lw} of ${metrics.length} metrics`
											:	`${rName} leads on ${verdict.rw} of ${metrics.length} metrics`
											}
										</p>
										<div className="mt-4 flex items-center gap-3">
											<span
												className="text-sm font-semibold w-5 text-right"
												style={{ color: lc }}
											>
												{verdict.lw}
											</span>
											<div className="flex-1 flex h-1.5 rounded-full overflow-hidden gap-0.5">
												<div
													className="rounded-l-full"
													style={{
														width: `${(verdict.lw / metrics.length) * 100}%`,
														backgroundColor: lc,
													}}
												/>
												<div
													className="flex-1 rounded-r-full"
													style={{ backgroundColor: rc, opacity: 0.4 }}
												/>
											</div>
											<span
												className="text-sm font-semibold w-5"
												style={{ color: rc }}
											>
												{verdict.rw}
											</span>
										</div>
										<p className="mt-2 text-xs text-white/20">
											{viewMode === 'career' ?
												`${metrics.length} lifetime metrics compared`
											:	`${displayedRounds} rounds · ${year} season`}
										</p>
									</div>

									<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5">
										<p className="text-[10px] uppercase tracking-[0.24em] text-white/20 mb-3">
											Explore
										</p>
										<div className="space-y-2">
											{[
												{ href: `/telemetry?year=${year}`, label: 'Telemetry' },
												{ href: '/standings', label: 'Standings' },
												{ href: '/drivers', label: 'All Drivers' },
											].map((l) => (
												<Link
													key={l.href}
													href={l.href}
													prefetch={true}
													className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/6 hover:text-white"
												>
													<span>{l.label}</span>
													<FaChevronRight
														size={9}
														className="text-white/20"
													/>
												</Link>
											))}
										</div>
									</div>
								</div>
							</>
						: (
							(telemetryLoading && !trackData && !raceTelemetry) ||
							((trackGenStatus?.status === 'generating' ||
								trackGenStatus?.status === 'loading') &&
								!trackData &&
								!raceTelemetry)
						) ?
							<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-8 text-center mt-4">
								<h2 className="text-xl font-semibold text-white/50 mb-2 animate-pulse">
									Loading Race Weekend Data...
								</h2>
								{trackGenStatus?.message && (
									<p className="text-xs text-white/35">
										{trackGenStatus.message}
									</p>
								)}
							</div>
						: raceTelemetry || trackData ?
							<RaceWeekendDashboard
								telemetry={raceTelemetry}
								trackData={trackData}
								trackGenStatus={trackGenStatus}
								leftEntity={leftEntity}
								rightEntity={rightEntity}
								lName={lName}
								rName={rName}
								lc={lc}
								rc={rc}
								comparisonType={comparisonType}
							/>
						:	<div className="rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-8 text-center mt-4">
								<h2 className="text-xl font-semibold text-white mb-2">
									Race Weekend Telemetry
								</h2>
								<p className="text-white/50 text-sm max-w-lg mx-auto">
									Comparison dashboard for Round {effectiveSelectedRace} ({year}{' '}
									season) between {lName} and {rName} is not available. Data may
									not be fully synced.
								</p>
							</div>
						}
					</>
				)}
			</div>
		</div>
	);
}

