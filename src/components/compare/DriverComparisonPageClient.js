'use client';

import {
	getDriverImagePath,
	getTeamCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { getComparisonDataset } from '@/lib/api/standingsApi';
import { DRIVER_CATALOG } from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
	FaCarSide,
	FaChevronDown,
	FaChevronRight,
	FaExchangeAlt,
	FaTrophy,
	FaUsers,
} from 'react-icons/fa';
import {
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
	Cell,
	Bar,
	BarChart,
	XAxis,
	YAxis,
	CartesianGrid,
} from 'recharts';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function toFixed(v, decimals = 1) {
	const n = Number(v || 0);
	return Number.isInteger(n) ? String(n) : n.toFixed(decimals);
}

const TEAM_CAR_TOKEN = {
	mer: 'mercedes', fer: 'ferrari', rbr: 'redbullracing', mcl: 'mclaren',
	haas: 'haasf1team', ast: 'astonmartin', wil: 'williams', rb: 'racingbulls',
	alp: 'alpine', aud: 'audi', cad: 'cadillac',
};

const NAME_OVERRIDES = { 'kimi-antonelli': 'and' };

function get2026Image(driverCode) {
	if (!driverCode) return null;
	const cat = DRIVER_CATALOG.find((d) => d.code?.toUpperCase() === driverCode?.toUpperCase());
	if (!cat) return null;
	const token = TEAM_CAR_TOKEN[getTeamCode(cat.teamName)] || getTeamCode(cat.teamName);
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
	const d = DRIVER_CATALOG.find((x) => x.teamName?.toLowerCase() === teamName?.toLowerCase());
	return d?.teamColor || null;
}

function driverCatalog(code) {
	return DRIVER_CATALOG.find((d) => d.code?.toUpperCase() === code?.toUpperCase()) || null;
}

function lighten(hex, amt = 0.45) {
	const r = hex?.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(r)) return hex;
	return '#' + [r.slice(0,2), r.slice(2,4), r.slice(4,6)].map((c) => {
		const n = parseInt(c, 16);
		return Math.round(n + (255 - n) * amt).toString(16).padStart(2, '0');
	}).join('');
}

function darken(hex, amt = 0.2) {
	const r = hex?.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(r)) return hex;
	return '#' + [r.slice(0,2), r.slice(2,4), r.slice(4,6)].map((c) =>
		Math.round(parseInt(c, 16) * (1 - amt)).toString(16).padStart(2, '0')
	).join('');
}

function resolveColors(le, re) {
	const lb = teamColor(le?.team_name) || '#ef4444';
	const rb = teamColor(re?.team_name) || '#22d3ee';
	const same = le?.team_name && re?.team_name &&
		le.team_name.toLowerCase() === re.team_name.toLowerCase();
	if (!same) return { lc: lb, rc: rb };
	return { lc: darken(lb, 0.15), rc: lighten(lb, 0.45) };
}

function getKey(e, type) {
	if (!e) return '';
	return type === 'drivers' ? (e.driver_code || e.driver_name) : e.team_name;
}

function getLabel(e, type) {
	if (!e) return '';
	return type === 'drivers' ? `${e.position}. ${e.driver_name}` : `${e.position}. ${e.team_name}`;
}

function pct(a, b) {
	const total = (a || 0) + (b || 0);
	return total <= 0 ? 50 : Math.round(((a || 0) / total) * 100);
}

function normalize(metric, val, opp) {
	if (!Number.isFinite(val) || !Number.isFinite(opp)) return 50;
	if (metric.higherIsBetter) { const mx = Math.max(val, opp, 1); return (val / mx) * 100; }
	const mx = Math.max(val, opp, 1);
	return ((mx - val) / mx) * 100;
}

function winner(m) {
	if (m.lv === m.rv) return 'tie';
	return m.higherIsBetter ? (m.lv > m.rv ? 'left' : 'right') : (m.lv < m.rv ? 'left' : 'right');
}

/* ─────────────────────────────────────────────────────────────────────────────
   METRICS BUILDERS
───────────────────────────────────────────────────────────────────────────── */

function buildSeasonMetrics(left, right, type) {
	if (!left || !right) return [];
	const races = Math.max(left.races_entered || left.top10_finishes || 1, 1);
	const rracesR = Math.max(right.races_entered || right.top10_finishes || 1, 1);

	const lWinRate = left.wins && races ? ((left.wins / races) * 100) : 0;
	const rWinRate = right.wins && rracesR ? ((right.wins / rracesR) * 100) : 0;
	const lPodRate = left.podiums && races ? ((left.podiums / races) * 100) : 0;
	const rPodRate = right.podiums && rracesR ? ((right.podiums / rracesR) * 100) : 0;

	return [
		{ id: 'points', label: 'Championship Pts', shortLabel: 'PTS', lv: Number(left.points || 0), rv: Number(right.points || 0), fmt: (v) => toFixed(v, 0), higherIsBetter: true },
		{ id: 'wins', label: type === 'drivers' ? 'Race Wins' : 'Team Wins', shortLabel: 'WIN', lv: Number(left.wins || 0), rv: Number(right.wins || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'podiums', label: 'Podiums', shortLabel: 'POD', lv: Number(left.podiums || 0), rv: Number(right.podiums || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'poles', label: 'Pole Positions', shortLabel: 'POL', lv: Number(left.poles || 0), rv: Number(right.poles || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'top10', label: 'Top 10 Finishes', shortLabel: 'T10', lv: Number(left.top10_finishes || 0), rv: Number(right.top10_finishes || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'winrate', label: 'Win Rate', shortLabel: 'W%', lv: lWinRate, rv: rWinRate, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
		{ id: 'podrate', label: 'Podium Rate', shortLabel: 'P%', lv: lPodRate, rv: rPodRate, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
		{ id: 'avg', label: 'Avg Finish', shortLabel: 'AVG', lv: Number(left.avg_finish || 99), rv: Number(right.avg_finish || 99), fmt: (v) => (Number.isFinite(v) && v < 99) ? `P${v.toFixed(1)}` : 'N/A', higherIsBetter: false },
		{ id: 'dnf', label: 'DNFs', shortLabel: 'DNF', lv: Number(left.dnf_count || 0), rv: Number(right.dnf_count || 0), fmt: (v) => String(v), higherIsBetter: false },
	];
}

function buildCareerMetrics(leftCat, rightCat) {
	if (!leftCat || !rightCat) return [];
	const ls = Math.max(leftCat.careerStarts || 1, 1);
	const rs = Math.max(rightCat.careerStarts || 1, 1);
	return [
		{ id: 'cp', label: 'Career Points', shortLabel: 'PTS', lv: Number(leftCat.careerPoints || 0), rv: Number(rightCat.careerPoints || 0), fmt: (v) => toFixed(v, 0), higherIsBetter: true },
		{ id: 'cw', label: 'Career Wins', shortLabel: 'WIN', lv: Number(leftCat.careerWins || 0), rv: Number(rightCat.careerWins || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'cpod', label: 'Career Podiums', shortLabel: 'POD', lv: Number(leftCat.careerPodiums || 0), rv: Number(rightCat.careerPodiums || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'cpol', label: 'Pole Positions', shortLabel: 'POL', lv: Number(leftCat.careerPoles || 0), rv: Number(rightCat.careerPoles || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'cfl', label: 'Fastest Laps', shortLabel: 'FL', lv: Number(leftCat.careerFastestLaps || 0), rv: Number(rightCat.careerFastestLaps || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'wdc', label: 'Championships', shortLabel: 'WDC', lv: Number(leftCat.worldChampionships || 0), rv: Number(rightCat.worldChampionships || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'starts', label: 'Race Starts', shortLabel: 'RCS', lv: Number(leftCat.careerStarts || 0), rv: Number(rightCat.careerStarts || 0), fmt: (v) => String(v), higherIsBetter: true },
		{ id: 'wr', label: 'Win Rate', shortLabel: 'W%', lv: leftCat.careerWins ? (leftCat.careerWins / ls) * 100 : 0, rv: rightCat.careerWins ? (rightCat.careerWins / rs) * 100 : 0, fmt: (v) => `${v.toFixed(2)}%`, higherIsBetter: true },
		{ id: 'pr', label: 'Podium Rate', shortLabel: 'P%', lv: leftCat.careerPodiums ? (leftCat.careerPodiums / ls) * 100 : 0, rv: rightCat.careerPodiums ? (rightCat.careerPodiums / rs) * 100 : 0, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
	];
}

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM DROPDOWN
───────────────────────────────────────────────────────────────────────────── */
function EntityDropdown({ label, value, onChange, entities, comparisonType, disabled }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
		document.addEventListener('mousedown', fn);
		return () => document.removeEventListener('mousedown', fn);
	}, []);

	const selected = entities.find((e) => getKey(e, comparisonType) === value);

	function img(entity) {
		return comparisonType === 'drivers'
			? (get2026Image(entity.driver_code) || getDriverImagePath(entity.driver_code))
			: getTeamLogoPath(entity.team_name);
	}
	function logo(entity) { return getTeamLogoPath(entity.team_name); }
	function color(entity) { return teamColor(entity.team_name) || '#6b7280'; }

	return (
		<div ref={ref} className="relative">
			<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">{label}</label>
			<button
				type="button" disabled={disabled}
				onClick={() => setOpen((v) => !v)}
				className="w-full flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-black/50 px-3 py-2 text-sm text-white outline-none transition hover:border-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{selected ? (
					<>
						<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.03]">
							{img(selected) && <Image src={img(selected)} alt="" fill sizes="32px" className={`object-cover ${comparisonType === 'constructors' ? 'object-contain p-1' : 'object-top'}`} />}
						</div>
						{comparisonType === 'drivers' && logo(selected) && (
							<div className="relative h-5 w-5 shrink-0"><Image src={logo(selected)} alt="" fill sizes="20px" className="object-contain" /></div>
						)}
						<div className="flex-1 text-left min-w-0">
							<p className="font-medium truncate text-white text-sm">{comparisonType === 'drivers' ? selected.driver_name : selected.team_name}</p>
							{comparisonType === 'drivers' && <p className="text-[10px] text-white/30 truncate">{selected.team_name}</p>}
						</div>
						<div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: color(selected) }} />
					</>
				) : (
					<span className="flex-1 text-left text-white/25 text-sm">Select...</span>
				)}
				<FaChevronDown size={9} className={`shrink-0 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>

			{open && (
				<div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-white/[0.07] bg-[#0c0c10] shadow-2xl overflow-hidden">
					<div className="max-h-72 overflow-y-auto py-1">
						{entities.map((entity) => {
							const key = getKey(entity, comparisonType);
							const active = key === value;
							return (
								<button
									key={key} type="button"
									onClick={() => { onChange(key); setOpen(false); }}
									className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
								>
									<span className="text-[10px] text-white/20 w-4 shrink-0 text-right">{entity.position}</span>
									<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02]">
										{img(entity) && <Image src={img(entity)} alt="" fill sizes="32px" className={`object-cover ${comparisonType === 'constructors' ? 'object-contain p-1' : 'object-top'}`} />}
									</div>
									{comparisonType === 'drivers' && logo(entity) && (
										<div className="relative h-4 w-4 shrink-0"><Image src={logo(entity)} alt="" fill sizes="16px" className="object-contain" /></div>
									)}
									<div className="flex-1 min-w-0">
										<p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-white/65'}`}>
											{comparisonType === 'drivers' ? entity.driver_name : entity.team_name}
										</p>
										{comparisonType === 'drivers' && <p className="text-[10px] text-white/25 truncate">{entity.team_name}</p>}
									</div>
									<div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: color(entity) }} />
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
				{[0,1].map((i) => (
					<div key={i} className="rounded-3xl border border-white/[0.05] bg-white/[0.015] overflow-hidden">
						<div className="h-52 bg-white/[0.04]" />
						<div className="p-5 space-y-3">
							<div className="h-3 w-20 rounded bg-white/[0.06]" />
							<div className="h-5 w-36 rounded bg-white/[0.1]" />
							<div className="grid grid-cols-3 gap-2 pt-2">
								{[0,1,2].map((j) => <div key={j} className="h-14 rounded-xl bg-white/[0.04]" />)}
							</div>
						</div>
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5">
					<div className="h-4 w-32 rounded bg-white/[0.08] mb-4" />
					<div className="h-64 rounded-xl bg-white/[0.03]" />
				</div>
				<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5 space-y-3">
					<div className="h-4 w-32 rounded bg-white/[0.08] mb-2" />
					{Array.from({length:9}).map((_,i) => <div key={i} className="h-10 rounded-xl bg-white/[0.03]" />)}
				</div>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   IDENTITY CARD
───────────────────────────────────────────────────────────────────────────── */
function IdentityCard({ entity, comparisonType, accentColor, statsLabel, viewMode, careerCat }) {
	if (!entity) {
		return (
			<div className="rounded-3xl border border-white/[0.05] bg-white/[0.01] p-6 text-sm text-white/25 flex items-center justify-center h-52">
				Select a {comparisonType === 'drivers' ? 'driver' : 'constructor'}
			</div>
		);
	}

	const tc = accentColor || teamColor(entity.team_name) || '#6b7280';
	const tl = getTeamLogoPath(entity.team_name);
	const isDriverCard = comparisonType === 'drivers';
	const heroImg = comparisonType === 'drivers'
		? (get2026Image(entity.driver_code) || getDriverImagePath(entity.driver_code))
		: getCarImage(entity.team_name);
	const dn = comparisonType === 'drivers' ? entity.driver_name : entity.team_name;
	const num = comparisonType === 'drivers' ? driverCatalog(entity.driver_code)?.number : null;

	// stat tiles — differ per mode/type
	const statTiles = viewMode === 'career' && careerCat
		? [
				{ label: 'Seasons', value: careerCat.careerStarts >= 17 ? `${Math.round(careerCat.careerStarts / 17)}` : '1' },
				{ label: 'WDC', value: careerCat.worldChampionships || 0 },
				{ label: 'Career Wins', value: careerCat.careerWins || 0 },
			]
		: [
				{ label: 'Pos', value: `P${entity.position}` },
				{ label: 'Points', value: toFixed(entity.points || 0, 0) },
				{ label: 'Wins', value: entity.wins ?? 0 },
			];

	return (
		<div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
			<div className="relative h-52 overflow-hidden"
				style={{
					background: `linear-gradient(135deg, ${isDriverCard ? `${tc}52` : `${tc}30`} 0%, ${isDriverCard ? `${tc}1f` : `${tc}08`} 58%, #050507 100%)`,
				}}>
				<div className="pointer-events-none absolute inset-0 opacity-20"
					style={{ backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.07) 0,rgba(255,255,255,0.07) 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 20px)' }} />
				{tl && <div className="absolute top-4 left-4 z-10 h-9 w-9"><Image src={tl} alt="" fill className="object-contain" /></div>}
				<div className="absolute top-3 right-4 z-10 text-[3.5rem] font-black leading-none"
					style={{ color: `${tc}20`, WebkitTextStroke: `1px ${tc}30` }}>
					{num || entity.position}
				</div>
				{heroImg && (
					comparisonType === 'drivers' ? (
						<div className="absolute inset-0 flex justify-center overflow-hidden">
							<div className="relative w-4/5" style={{ height: '167%', top: 0 }}>
								<Image src={heroImg} alt={dn} fill sizes="(max-width:768px)100vw,50vw" className="object-contain object-top saturate-[1.2] brightness-110 contrast-110" priority />
							</div>
						</div>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="relative h-full w-full max-w-sm">
								<Image src={heroImg} alt={dn} fill sizes="(max-width:768px)100vw,50vw" className="object-contain scale-90" priority />
							</div>
						</div>
					)
				)}
				<div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#050507] to-transparent" />
			</div>

			<div className="bg-[#050507] px-5 pb-5 pt-3">
				<div className="flex items-end justify-between mb-3">
					<div>
						<p className="text-[10px] uppercase tracking-[0.22em] text-white/25 mb-0.5">
							{comparisonType === 'drivers' ? entity.driver_code : 'Constructor'}
						</p>
						<h2 className="text-xl font-semibold text-white">{dn}</h2>
						{comparisonType === 'drivers' && <p className="text-xs text-white/30 mt-0.5">{entity.team_name}</p>}
					</div>
					<div className="h-1.5 w-12 rounded-full opacity-50" style={{ backgroundColor: tc }} />
				</div>
				<div className="grid grid-cols-3 gap-2">
					{statTiles.map((s) => (
						<div key={s.label} className="flex flex-col py-2.5 px-3 rounded-xl"
							style={{
								background: isDriverCard ? `${tc}1a` : `${tc}0d`,
								border: `1px solid ${isDriverCard ? `${tc}48` : `${tc}20`}`,
							}}>
							<span className="text-[9px] uppercase tracking-[0.16em] text-white/25 mb-1">{s.label}</span>
							<span className="text-lg font-semibold text-white">{s.value}</span>
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
		<div className="grid grid-cols-[1fr_78px_1fr] items-center gap-2 py-3 border-b border-white/[0.05] last:border-0">
			<div className="flex flex-col items-start">
				<span className="text-xl font-semibold leading-tight" style={{ color: w === 'left' ? lc : 'rgba(255,255,255,0.65)' }}>
					{metric.fmt(metric.lv)}
				</span>
				{w === 'left' && <span className="text-[8px] uppercase tracking-widest mt-0.5 font-semibold" style={{ color: lc }}>Ahead</span>}
				{w === 'tie' && <span className="text-[8px] uppercase tracking-widest mt-0.5 text-white/35">Tied</span>}
			</div>
			<div className="text-center">
				<p className="text-[9px] uppercase tracking-[0.1em] text-white/45 mb-1.5 leading-none">{metric.label}</p>
				<div className="flex h-[3px] rounded-full overflow-hidden gap-px">
					<div className="h-full rounded-l-full" style={{ width: `${lp}%`, backgroundColor: w === 'left' ? lc : `${lc}50` }} />
					<div className="h-full rounded-r-full ml-auto" style={{ width: `${rp}%`, backgroundColor: w === 'right' ? rc : `${rc}50` }} />
				</div>
			</div>
			<div className="flex flex-col items-end">
				<span className="text-xl font-semibold leading-tight" style={{ color: w === 'right' ? rc : 'rgba(255,255,255,0.65)' }}>
					{metric.fmt(metric.rv)}
				</span>
				{w === 'right' && <span className="text-[8px] uppercase tracking-widest mt-0.5 font-semibold text-right" style={{ color: rc }}>Ahead</span>}
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
		{ label: 'Wins', lv: leftCat.careerWins || 0, rv: rightCat.careerWins || 0 },
		{ label: 'Podiums', lv: leftCat.careerPodiums || 0, rv: rightCat.careerPodiums || 0 },
		{ label: 'Poles', lv: leftCat.careerPoles || 0, rv: rightCat.careerPoles || 0 },
		{ label: 'FL', lv: leftCat.careerFastestLaps || 0, rv: rightCat.careerFastestLaps || 0 },
	];
	return (
		<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5 mt-4">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-semibold text-white">Career Tallies</h2>
				<div className="flex gap-4">
					{[{ name: lName, color: lc }, { name: rName, color: rc }].map((l) => (
						<div key={l.name} className="flex items-center gap-1.5">
							<div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
							<span className="text-[10px] text-white/40 truncate max-w-[80px]">{l.name}</span>
						</div>
					))}
				</div>
			</div>
			<div className="h-44">
				<ResponsiveContainer>
					<BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
						<CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
						<XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
						<YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
						<Tooltip contentStyle={{ backgroundColor: 'rgba(5,5,7,0.96)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#fff', fontSize: 11 }} />
						<Bar dataKey="lv" name={lName} fill={lc} radius={[4,4,0,0]} fillOpacity={0.85} maxBarSize={32} />
						<Bar dataKey="rv" name={rName} fill={rc} radius={[4,4,0,0]} fillOpacity={0.75} maxBarSize={32} />
					</BarChart>
				</ResponsiveContainer>
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
	const initialYear = Number.isFinite(urlYear) && urlYear >= 1950 && urlYear <= currentYear ? urlYear : currentYear;
	const requestedType = searchParams.get('type') === 'constructors' ? 'constructors' : 'drivers';

	const [year, setYear] = useState(initialYear);
	const [comparisonType, setComparisonType] = useState(requestedType);
	const [viewMode, setViewMode] = useState('season');
	const [dataset, setDataset] = useState({ drivers: [], constructors: [], rounds: 0 });
	const [loading, setLoading] = useState(true);

	// Seed from URL params once — state owns selection from here on
	const [leftKey, setLeftKey] = useState(() => {
		const p = searchParams.get('a') || '';
		return requestedType === 'drivers' ? p.trim().toUpperCase() : p.trim();
	});
	const [rightKey, setRightKey] = useState(() => {
		const p = searchParams.get('b') || '';
		return requestedType === 'drivers' ? p.trim().toUpperCase() : p.trim();
	});

	const years = useMemo(() => Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i), [currentYear]);

	useEffect(() => {
		let active = true;
		setLoading(true);
		getComparisonDataset(year)
			.then((data) => {
				if (!active) return;
				setDataset({
					drivers: Array.isArray(data?.drivers) ? data.drivers : [],
					constructors: Array.isArray(data?.constructors) ? data.constructors : [],
					rounds: Number(data?.rounds || 0),
				});
			})
			.catch(() => { if (!active) return; setDataset({ drivers: [], constructors: [], rounds: 0 }); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [year]);

	// Force season mode for constructors (no career catalog)
	useEffect(() => {
		if (comparisonType === 'constructors' && viewMode === 'career') setViewMode('season');
	}, [comparisonType, viewMode]);

	const entities = useMemo(() => {
		if (comparisonType === 'drivers')
			return dataset.drivers.filter((r) => r.driver_code || r.driver_name);
		return dataset.constructors;
	}, [dataset, comparisonType]);

	const validKeys = useMemo(() => entities.map((e) => getKey(e, comparisonType)), [entities, comparisonType]);

	// Resolution: state-first, no URL params after initial seed
	const resolvedLeft = useMemo(() => {
		if (!validKeys.length) return '';
		if (validKeys.includes(leftKey)) return leftKey;
		return validKeys[0];
	}, [validKeys, leftKey]);

	const resolvedRight = useMemo(() => {
		if (!validKeys.length) return '';
		if (validKeys.includes(rightKey) && rightKey !== resolvedLeft) return rightKey;
		return validKeys.find((k) => k !== resolvedLeft) || resolvedLeft;
	}, [validKeys, rightKey, resolvedLeft]);

	const leftEntity = useMemo(() => entities.find((e) => getKey(e, comparisonType) === resolvedLeft) || null, [entities, comparisonType, resolvedLeft]);
	const rightEntity = useMemo(() => entities.find((e) => getKey(e, comparisonType) === resolvedRight) || null, [entities, comparisonType, resolvedRight]);

	// Career catalog entries
	const leftCat = useMemo(() => comparisonType === 'drivers' ? driverCatalog(leftEntity?.driver_code) : null, [leftEntity, comparisonType]);
	const rightCat = useMemo(() => comparisonType === 'drivers' ? driverCatalog(rightEntity?.driver_code) : null, [rightEntity, comparisonType]);

	const { lc, rc } = useMemo(() => resolveColors(leftEntity, rightEntity), [leftEntity, rightEntity]);

	const lName = comparisonType === 'drivers' ? leftEntity?.driver_name : leftEntity?.team_name;
	const rName = comparisonType === 'drivers' ? rightEntity?.driver_name : rightEntity?.team_name;

	const metrics = useMemo(() => {
		if (viewMode === 'career' && leftCat && rightCat) return buildCareerMetrics(leftCat, rightCat);
		return buildSeasonMetrics(leftEntity, rightEntity, comparisonType);
	}, [viewMode, leftCat, rightCat, leftEntity, rightEntity, comparisonType]);

	const radarData = useMemo(() => metrics.map((m) => ({
		metric: m.shortLabel,
		[lName || 'A']: normalize(m, m.lv, m.rv),
		[rName || 'B']: normalize(m, m.rv, m.lv),
	})), [metrics, lName, rName]);

	const verdict = useMemo(() => {
		let lw = 0, rw = 0;
		metrics.forEach((m) => { const w = winner(m); if (w === 'left') lw++; if (w === 'right') rw++; });
		return { winner: lw === rw ? 'tie' : lw > rw ? 'left' : 'right', lw, rw };
	}, [metrics]);

	const canCompare = Boolean(leftEntity && rightEntity);
	const careerAvailable = comparisonType === 'drivers' && leftCat && rightCat;

	return (
		<div className="relative min-h-screen bg-black bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-4 pb-16 pt-24 text-white md:px-10 lg:px-16">
			<div className="fixed inset-0 z-0 bg-black/88" />
			<div className="relative z-10 mx-auto max-w-7xl space-y-5">

				{/* ── Header ──────────────────────────────────────── */}
				<div className="mb-4">
					<p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/20 mb-2">FormulaHub · Analysis</p>
					<h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Head-to-Head</h1>
					<p className="mt-2 text-sm text-white/30 max-w-lg">
						Compare season form or lifetime stats across every measurable dimension.
					</p>

					{/* Type + View mode toggles */}
					<div className="mt-5 flex flex-wrap gap-3 items-center">
						<div className="inline-flex rounded-xl border border-white/[0.06] bg-white/[0.015] p-1 gap-1">
							{[
								{ key: 'drivers', label: 'Drivers', icon: <FaUsers size={10} /> },
								{ key: 'constructors', label: 'Constructors', icon: <FaCarSide size={10} /> },
							].map(({ key, label, icon }) => (
								<button key={key} type="button" onClick={() => setComparisonType(key)}
									className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-200 ${comparisonType === key ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'}`}>
									{icon} {label}
								</button>
							))}
						</div>

						{/* Season / Career toggle */}
						<div className="inline-flex rounded-xl border border-white/[0.06] bg-white/[0.015] p-1 gap-1">
							<button type="button" onClick={() => setViewMode('season')}
								className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-200 ${viewMode === 'season' ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'}`}>
								{year} Season
							</button>
							<button type="button" onClick={() => setViewMode('career')}
								disabled={!careerAvailable && comparisonType === 'constructors'}
								className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-200 ${viewMode === 'career' ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'} disabled:opacity-25 disabled:cursor-not-allowed`}>
								<FaTrophy size={9} /> Career
							</button>
						</div>
					</div>
				</div>

				{/* ── Controls ────────────────────────────────────── */}
				<div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_40px_1fr_110px] md:items-end">
					<EntityDropdown label={comparisonType === 'drivers' ? 'Driver A' : 'Constructor A'}
						value={resolvedLeft} onChange={setLeftKey} entities={entities}
						comparisonType={comparisonType} disabled={loading || entities.length < 2} />

					<div className="flex items-end justify-center pb-1">
						<button type="button" onClick={() => { setLeftKey(resolvedRight); setRightKey(resolvedLeft); }}
							disabled={!canCompare}
							className="h-10 w-10 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/35 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-20">
							<FaExchangeAlt size={12} className="mx-auto" />
						</button>
					</div>

					<EntityDropdown label={comparisonType === 'drivers' ? 'Driver B' : 'Constructor B'}
						value={resolvedRight} onChange={setRightKey} entities={entities}
						comparisonType={comparisonType} disabled={loading || entities.length < 2} />

					<div>
						<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">Season</label>
						<select value={year} onChange={(e) => { setLoading(true); setYear(Number(e.target.value)); }}
							className="w-full rounded-xl border border-white/[0.06] bg-black/50 px-3 py-[10px] text-sm text-white outline-none transition focus:border-white/20">
							{years.map((y) => <option key={y} value={y}>{y}</option>)}
						</select>
					</div>
				</div>

				{/* Note for career mode when season switcher isn't relevant */}
				{viewMode === 'career' && (
					<p className="text-[10px] text-white/20 uppercase tracking-widest -mt-1">
						Showing lifetime career stats · Season selector applies only to Season mode
					</p>
				)}

				{loading && <Skeleton />}

				{!loading && entities.length < 2 && (
					<div className="rounded-2xl border border-amber-400/[0.12] bg-amber-500/[0.05] p-5 text-sm text-amber-200/60">
						Not enough data for this season.
					</div>
				)}

				{!loading && canCompare && (
					<>
						{/* Identity cards */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<IdentityCard entity={leftEntity} comparisonType={comparisonType} accentColor={lc}
								viewMode={viewMode} careerCat={leftCat} />
							<IdentityCard entity={rightEntity} comparisonType={comparisonType} accentColor={rc}
								viewMode={viewMode} careerCat={rightCat} />
						</div>

						{/* Radar + Metric rows */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							{/* Radar */}
							<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5">
								<div className="flex items-center justify-between mb-3">
									<h2 className="text-sm font-semibold text-white">Performance Shape</h2>
									<span className="text-[9px] uppercase tracking-[0.16em] text-white/20">Normalized radar</span>
								</div>
								<div className="flex gap-4 mb-3">
									{[{ name: lName, color: lc }, { name: rName, color: rc }].map((l) => (
										<div key={l.name} className="flex items-center gap-2">
											<div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
											<span className="text-[10px] text-white/40 truncate max-w-[100px]">{l.name}</span>
										</div>
									))}
								</div>
								<div className="h-64">
									<ResponsiveContainer>
										<RadarChart data={radarData} outerRadius="72%">
											<PolarGrid stroke="rgba(255,255,255,0.06)" />
											<PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 10 }} />
											<Tooltip contentStyle={{ backgroundColor: 'rgba(5,5,7,0.96)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#fff', fontSize: 11 }} />
											<Radar name={lName} dataKey={lName} stroke={lc} fill={lc} fillOpacity={0.22} strokeWidth={1.5} />
											<Radar name={rName} dataKey={rName} stroke={rc} fill={rc} fillOpacity={0.16} strokeWidth={1.5} />
										</RadarChart>
									</ResponsiveContainer>
								</div>
							</div>

							{/* Metric rows */}
							<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5">
								<div className="grid grid-cols-[1fr_68px_1fr] items-center gap-2 mb-2 pb-3 border-b border-white/[0.05]">
									<div className="flex items-center gap-2">
										<div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lc }} />
										<span className="text-[9px] uppercase tracking-[0.12em] text-white/35 truncate">{lName}</span>
									</div>
									<div />
									<div className="flex items-center justify-end gap-2">
										<span className="text-[9px] uppercase tracking-[0.12em] text-white/35 truncate">{rName}</span>
										<div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rc }} />
									</div>
								</div>
								{metrics.map((m) => (
									<MetricRow key={m.id} metric={m} lc={lc} rc={rc} />
								))}
							</div>
						</div>

						{/* Career bar chart (career mode, drivers only) */}
						{viewMode === 'career' && leftCat && rightCat && (
							<CareerBarChart leftCat={leftCat} rightCat={rightCat} lName={lName} rName={rName} lc={lc} rc={rc} />
						)}

						{/* Verdict */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
							<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-6">
								<p className="text-[10px] uppercase tracking-[0.24em] text-white/20 mb-3">
									{viewMode === 'career' ? 'Career Verdict' : `${year} Season Verdict`}
								</p>
								<p className="text-2xl font-semibold text-white leading-snug">
									{verdict.winner === 'tie' ? 'Evenly Matched'
										: verdict.winner === 'left' ? `${lName} leads on ${verdict.lw} of ${metrics.length} metrics`
										: `${rName} leads on ${verdict.rw} of ${metrics.length} metrics`}
								</p>
								<div className="mt-4 flex items-center gap-3">
									<span className="text-sm font-semibold w-5 text-right" style={{ color: lc }}>{verdict.lw}</span>
									<div className="flex-1 flex h-1.5 rounded-full overflow-hidden gap-0.5">
										<div className="rounded-l-full" style={{ width: `${(verdict.lw / metrics.length) * 100}%`, backgroundColor: lc }} />
										<div className="flex-1 rounded-r-full" style={{ backgroundColor: rc, opacity: 0.4 }} />
									</div>
									<span className="text-sm font-semibold w-5" style={{ color: rc }}>{verdict.rw}</span>
								</div>
								<p className="mt-2 text-xs text-white/20">
									{viewMode === 'career' ? `${metrics.length} lifetime metrics compared` : `${dataset.rounds} rounds · ${year} season`}
								</p>
							</div>

							<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5">
								<p className="text-[10px] uppercase tracking-[0.24em] text-white/20 mb-3">Explore</p>
								<div className="space-y-2">
									{[
										{ href: `/telemetry?year=${year}`, label: 'Telemetry' },
										{ href: '/standings', label: 'Standings' },
										{ href: '/drivers', label: 'All Drivers' },
									].map((l) => (
										<Link key={l.href} href={l.href}
											className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] px-3 py-2.5 text-sm text-white/40 transition hover:bg-white/[0.04] hover:text-white">
											<span>{l.label}</span>
											<FaChevronRight size={9} className="text-white/20" />
										</Link>
									))}
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
