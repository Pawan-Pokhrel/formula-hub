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
	FaUsers,
} from 'react-icons/fa';
import {
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
} from 'recharts';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function toFixedPoints(value) {
	const num = Number(value || 0);
	return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

const TEAM_CAR_TOKEN = {
	mer: 'mercedes', fer: 'ferrari', rbr: 'redbullracing', mcl: 'mclaren',
	haas: 'haasf1team', ast: 'astonmartin', wil: 'williams', rb: 'racingbulls',
	alp: 'alpine', aud: 'audi', cad: 'cadillac',
};

const IMAGE_FIRST_NAME_OVERRIDES = { 'kimi-antonelli': 'and' };

function get2026DriverImage(driverCode) {
	if (!driverCode) return null;
	const catalog = DRIVER_CATALOG.find(
		(d) => String(d.code).toUpperCase() === String(driverCode).toUpperCase()
	);
	if (!catalog) return null;
	const teamToken = TEAM_CAR_TOKEN[getTeamCode(catalog.teamName)] || getTeamCode(catalog.teamName);
	const nameParts = catalog.fullName.toLowerCase().trim().split(/\s+/);
	const firstToken = IMAGE_FIRST_NAME_OVERRIDES[catalog.slug] || nameParts[0].slice(0, 3);
	const lastToken = nameParts[nameParts.length - 1].slice(0, 3);
	return `/images/drivers/2026${teamToken}${firstToken}${lastToken}01right.png`;
}

function getTeamCarImage(teamName) {
	if (!teamName) return null;
	const token = TEAM_CAR_TOKEN[getTeamCode(teamName)];
	if (!token) return null;
	return `/images/cars/2026${token}carright.png`;
}

function getTeamColorFromCatalog(teamName) {
	if (!teamName) return null;
	const driver = DRIVER_CATALOG.find(
		(d) => String(d.teamName).toLowerCase() === String(teamName).toLowerCase()
	);
	return driver?.teamColor || null;
}

/** Lighten a hex color by mixing it with white */
function lightenHex(hex, amount = 0.45) {
	const raw = String(hex || '').replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex;
	const r = parseInt(raw.slice(0, 2), 16);
	const g = parseInt(raw.slice(2, 4), 16);
	const b = parseInt(raw.slice(4, 6), 16);
	const lr = Math.round(r + (255 - r) * amount);
	const lg = Math.round(g + (255 - g) * amount);
	const lb = Math.round(b + (255 - b) * amount);
	return `#${lr.toString(16).padStart(2,'0')}${lg.toString(16).padStart(2,'0')}${lb.toString(16).padStart(2,'0')}`;
}

/** Darken a hex color */
function darkenHex(hex, amount = 0.45) {
	const raw = String(hex || '').replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex;
	const r = Math.round(parseInt(raw.slice(0, 2), 16) * (1 - amount));
	const g = Math.round(parseInt(raw.slice(2, 4), 16) * (1 - amount));
	const b = Math.round(parseInt(raw.slice(4, 6), 16) * (1 - amount));
	return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function buildMetrics(left, right, comparisonType) {
	if (!left || !right) return [];
	return [
		{ id: 'points', label: 'Points', shortLabel: 'PTS', leftValue: Number(left.points || 0), rightValue: Number(right.points || 0), format: (v) => toFixedPoints(v), higherIsBetter: true },
		{ id: 'wins', label: comparisonType === 'drivers' ? 'Race Wins' : 'Team Wins', shortLabel: 'WIN', leftValue: Number(left.wins || 0), rightValue: Number(right.wins || 0), format: (v) => `${v}`, higherIsBetter: true },
		{ id: 'podiums', label: 'Podiums', shortLabel: 'POD', leftValue: Number(left.podiums || 0), rightValue: Number(right.podiums || 0), format: (v) => `${v}`, higherIsBetter: true },
		{ id: 'poles', label: 'Pole Positions', shortLabel: 'POL', leftValue: Number(left.poles || 0), rightValue: Number(right.poles || 0), format: (v) => `${v}`, higherIsBetter: true },
		{ id: 'top10_finishes', label: 'Top 10s', shortLabel: 'T10', leftValue: Number(left.top10_finishes || 0), rightValue: Number(right.top10_finishes || 0), format: (v) => `${v}`, higherIsBetter: true },
		{ id: 'avg_finish', label: 'Avg Finish', shortLabel: 'AVG', leftValue: Number(left.avg_finish || 99), rightValue: Number(right.avg_finish || 99), format: (v) => Number.isFinite(v) && v < 99 ? `P${v.toFixed(1)}` : 'N/A', higherIsBetter: false },
		{ id: 'dnf_count', label: 'DNFs', shortLabel: 'DNF', leftValue: Number(left.dnf_count || 0), rightValue: Number(right.dnf_count || 0), format: (v) => `${v}`, higherIsBetter: false },
	];
}

function getWinner(metric) {
	if (metric.leftValue === metric.rightValue) return 'tie';
	if (metric.higherIsBetter) return metric.leftValue > metric.rightValue ? 'left' : 'right';
	return metric.leftValue < metric.rightValue ? 'left' : 'right';
}

function normalizeRadar(metric, value, opposite) {
	if (!Number.isFinite(value) || !Number.isFinite(opposite)) return 50;
	if (metric.higherIsBetter) { const max = Math.max(value, opposite, 1); return (value / max) * 100; }
	const max = Math.max(value, opposite, 1);
	return ((max - value) / max) * 100;
}

function getEntityKey(entity, type) {
	if (!entity) return '';
	return type === 'drivers' ? entity.driver_code || entity.driver_name : entity.team_name;
}

function getEntityLabel(entity, type) {
	if (!entity) return '';
	return type === 'drivers' ? `${entity.position}. ${entity.driver_name}` : `${entity.position}. ${entity.team_name}`;
}

/* ─── Resolve display colors (same team = distinguish) ─────────────────────── */
function resolveCompareColors(leftEntity, rightEntity, type) {
	const leftTeam = leftEntity?.team_name;
	const rightTeam = rightEntity?.team_name;
	const leftBase = getTeamColorFromCatalog(leftTeam) || '#ef4444';
	const rightBase = getTeamColorFromCatalog(rightTeam) || '#22d3ee';

	const sameTeam = leftTeam && rightTeam &&
		String(leftTeam).toLowerCase() === String(rightTeam).toLowerCase();

	if (!sameTeam) return { leftColor: leftBase, rightColor: rightBase };

	// Same team: left gets original, right gets a lightened variant
	return {
		leftColor: darkenHex(leftBase, 0.15),
		rightColor: lightenHex(leftBase, 0.45),
	};
}

/* ─── Custom Dropdown ──────────────────────────────────────────────────────── */
function EntityDropdown({ label, value, onChange, entities, comparisonType, disabled }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		function handleClick(e) {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		}
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, []);

	const selected = entities.find((e) => getEntityKey(e, comparisonType) === value);

	function getOptionImage(entity) {
		if (comparisonType === 'drivers') {
			return get2026DriverImage(entity.driver_code) || getDriverImagePath(entity.driver_code);
		}
		return getTeamLogoPath(entity.team_name);
	}

	function getOptionLogo(entity) {
		return getTeamLogoPath(entity.team_name);
	}

	function getOptionColor(entity) {
		return getTeamColorFromCatalog(entity.team_name) || '#6b7280';
	}

	return (
		<div ref={ref} className="relative">
			<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
				{label}
			</label>

			{/* Trigger */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => setOpen((v) => !v)}
				className="w-full flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/50 px-3 py-2 text-sm text-white outline-none transition hover:border-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{selected ? (
					<>
						{/* Driver thumbnail or team logo */}
						<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03]">
							{getOptionImage(selected) && (
								<Image
									src={getOptionImage(selected)}
									alt=""
									fill
									sizes="32px"
									className={`object-cover ${comparisonType === 'constructors' ? 'object-contain p-1' : 'object-top'}`}
								/>
							)}
						</div>
						{comparisonType === 'drivers' && getOptionLogo(selected) && (
							<div className="relative h-5 w-5 shrink-0">
								<Image src={getOptionLogo(selected)} alt="" fill sizes="20px" className="object-contain" />
							</div>
						)}
						<div className="flex-1 text-left min-w-0">
							<p className="font-medium truncate text-white text-sm">
								{comparisonType === 'drivers' ? selected.driver_name : selected.team_name}
							</p>
							{comparisonType === 'drivers' && (
								<p className="text-[10px] text-white/35 truncate">{selected.team_name}</p>
							)}
						</div>
						{/* Team color strip */}
						<div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: getOptionColor(selected) }} />
					</>
				) : (
					<span className="flex-1 text-left text-white/30">Select...</span>
				)}
				<FaChevronDown size={10} className={`shrink-0 text-white/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
			</button>

			{/* Dropdown panel */}
			{open && (
				<div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-[#0c0c10] shadow-2xl overflow-hidden">
					<div className="max-h-72 overflow-y-auto py-1">
						{entities.map((entity) => {
							const key = getEntityKey(entity, comparisonType);
							const isActive = key === value;
							const color = getOptionColor(entity);
							const img = getOptionImage(entity);
							const logo = getOptionLogo(entity);
							return (
								<button
									key={key}
									type="button"
									onClick={() => { onChange(key); setOpen(false); }}
									className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
										isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
									}`}
								>
									{/* Position badge */}
									<span className="text-[10px] text-white/25 w-4 shrink-0 text-right">
										{entity.position}
									</span>

									{/* Driver/team image */}
									<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03]">
										{img && (
											<Image
												src={img}
												alt=""
												fill
												sizes="32px"
												className={`object-cover ${comparisonType === 'constructors' ? 'object-contain p-1' : 'object-top'}`}
											/>
										)}
									</div>

									{/* Team logo (for driver mode) */}
									{comparisonType === 'drivers' && logo && (
										<div className="relative h-4 w-4 shrink-0">
											<Image src={logo} alt="" fill sizes="16px" className="object-contain" />
										</div>
									)}

									{/* Text */}
									<div className="flex-1 min-w-0">
										<p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/70'}`}>
											{comparisonType === 'drivers' ? entity.driver_name : entity.team_name}
										</p>
										{comparisonType === 'drivers' && (
											<p className="text-[10px] text-white/30 truncate">{entity.team_name}</p>
										)}
									</div>

									{/* Team color pill */}
									<div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: color }} />
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

/* ─── Skeleton ─────────────────────────────────────────────────────────────── */
function Skeleton() {
	return (
		<div className="animate-pulse space-y-5">
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{[0, 1].map((i) => (
					<div key={i} className="rounded-3xl border border-white/[0.05] bg-white/[0.015] overflow-hidden">
						<div className="h-44 bg-white/[0.04]" />
						<div className="p-5 space-y-3">
							<div className="h-3 w-20 rounded bg-white/[0.06]" />
							<div className="h-5 w-40 rounded bg-white/[0.1]" />
							<div className="grid grid-cols-3 gap-2 pt-2">
								{[0,1,2].map((j) => <div key={j} className="h-16 rounded-xl bg-white/[0.04]" />)}
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
					<div className="h-4 w-32 rounded bg-white/[0.08] mb-4" />
					{Array.from({length:7}).map((_,i) => <div key={i} className="h-10 rounded-xl bg-white/[0.03]" />)}
				</div>
			</div>
		</div>
	);
}

/* ─── Identity Card ─────────────────────────────────────────────────────────── */
function IdentityCard({ entity, comparisonType, accentColor }) {
	if (!entity) {
		return (
			<div className="rounded-3xl border border-white/[0.05] bg-white/[0.01] p-6 text-sm text-white/30 flex items-center justify-center h-48">
				Select a {comparisonType === 'drivers' ? 'driver' : 'constructor'}
			</div>
		);
	}

	const teamName = entity.team_name;
	const teamColor = accentColor || getTeamColorFromCatalog(teamName) || '#6b7280';
	const teamLogo = getTeamLogoPath(teamName);

	const heroImage =
		comparisonType === 'drivers'
			? (get2026DriverImage(entity.driver_code) || getDriverImagePath(entity.driver_code))
			: getTeamCarImage(teamName);

	const displayName = comparisonType === 'drivers' ? entity.driver_name : entity.team_name;

	const driverNum = comparisonType === 'drivers'
		? DRIVER_CATALOG.find((d) => String(d.code).toUpperCase() === String(entity.driver_code).toUpperCase())?.number
		: null;

	return (
		<div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
			<div
				className="relative h-52 overflow-hidden"
				style={{ background: `linear-gradient(135deg, ${teamColor}30 0%, ${teamColor}08 60%, #050507 100%)` }}
			>
				<div
					className="pointer-events-none absolute inset-0 opacity-20"
					style={{ backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.07) 0,rgba(255,255,255,0.07) 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 20px)' }}
				/>
				{teamLogo && (
					<div className="absolute top-4 left-4 z-10 h-9 w-9">
						<Image src={teamLogo} alt={teamName} fill className="object-contain" />
					</div>
				)}
				<div
					className="absolute top-3 right-4 z-10 text-[3.5rem] font-black leading-none"
					style={{ color: `${teamColor}20`, WebkitTextStroke: `1px ${teamColor}35` }}
				>
					{driverNum || entity.position}
				</div>
				{heroImage && (
					comparisonType === 'drivers' ? (
						/* Driver: wider image, crop to show top 60% (face/helmet area) */
						<div className="absolute inset-0 flex justify-center overflow-hidden">
							<div className="relative w-4/5" style={{ height: '167%', top: 0 }}>
								<Image src={heroImage} alt={displayName} fill sizes="(max-width:768px)100vw,50vw"
									className="object-contain object-top"
									priority />
							</div>
						</div>
					) : (
						/* Constructor car */
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="relative h-full w-full max-w-sm">
								<Image src={heroImage} alt={displayName} fill sizes="(max-width:768px)100vw,50vw"
									className="object-contain scale-90"
									priority />
							</div>
						</div>
					)
				)}
				<div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050507] to-transparent" />
			</div>

			<div className="bg-[#050507] px-5 pb-5 pt-3">
				<div className="flex items-end justify-between mb-4">
					<div>
						<p className="text-[10px] uppercase tracking-[0.22em] text-white/30 mb-0.5">
							{comparisonType === 'drivers' ? entity.driver_code : 'Constructor'}
						</p>
						<h2 className="text-2xl font-semibold text-white">{displayName}</h2>
						{comparisonType === 'drivers' && <p className="text-sm text-white/35 mt-0.5">{teamName}</p>}
					</div>
					<div className="h-1.5 w-14 rounded-full opacity-60" style={{ backgroundColor: teamColor }} />
				</div>

				<div className="grid grid-cols-3 gap-2">
					{[
						{ label: 'Pos', value: `P${entity.position}` },
						{ label: 'Points', value: toFixedPoints(entity.points) },
						{ label: 'Wins', value: entity.wins ?? 0 },
					].map((stat) => (
						<div key={stat.label} className="flex flex-col py-3 px-3 rounded-xl"
							style={{ background: `${teamColor}0e`, border: `1px solid ${teamColor}22` }}>
							<span className="text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">{stat.label}</span>
							<span className="text-xl font-semibold text-white">{stat.value}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/* ─── Metric Row ─────────────────────────────────────────────────────────────── */
function MetricRow({ metric, leftColor, rightColor }) {
	const winner = getWinner(metric);
	const total = metric.leftValue + metric.rightValue;
	const leftPct = total === 0 ? 50 : Math.round((metric.leftValue / total) * 100);
	const rightPct = 100 - leftPct;

	return (
		<div className="grid grid-cols-[1fr_72px_1fr] items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
			<div className="flex flex-col items-start">
				<span className="text-2xl font-semibold" style={{ color: winner === 'left' ? leftColor : 'rgba(255,255,255,0.45)' }}>
					{metric.format(metric.leftValue)}
				</span>
				{winner === 'left' && (
					<span className="text-[8px] uppercase tracking-widest mt-0.5 font-medium" style={{ color: leftColor }}>
						Ahead
					</span>
				)}
			</div>

			<div className="text-center">
				<p className="text-[9px] uppercase tracking-[0.14em] text-white/25 mb-2">{metric.label}</p>
				<div className="flex h-1 rounded-full overflow-hidden gap-px">
					<div className="h-full rounded-l-full" style={{ width: `${leftPct}%`, backgroundColor: winner === 'left' ? leftColor : `${leftColor}55` }} />
					<div className="h-full rounded-r-full ml-auto" style={{ width: `${rightPct}%`, backgroundColor: winner === 'right' ? rightColor : `${rightColor}55` }} />
				</div>
			</div>

			<div className="flex flex-col items-end">
				<span className="text-2xl font-semibold" style={{ color: winner === 'right' ? rightColor : 'rgba(255,255,255,0.45)' }}>
					{metric.format(metric.rightValue)}
				</span>
				{winner === 'right' && (
					<span className="text-[8px] uppercase tracking-widest mt-0.5 font-medium" style={{ color: rightColor }}>
						Ahead
					</span>
				)}
			</div>
		</div>
	);
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function DriverComparisonPageClient() {
	const currentYear = new Date().getFullYear();
	const searchParams = useSearchParams();

	const urlYear = Number(searchParams.get('year'));
	const initialYear = Number.isFinite(urlYear) && urlYear >= 1950 && urlYear <= currentYear ? urlYear : currentYear;
	const requestedType = searchParams.get('type') === 'constructors' ? 'constructors' : 'drivers';

	const [year, setYear] = useState(initialYear);
	const [comparisonType, setComparisonType] = useState(requestedType);
	const [dataset, setDataset] = useState({ drivers: [], constructors: [], rounds: 0 });
	const [loading, setLoading] = useState(true);
	const [leftKey, setLeftKey] = useState('');
	const [rightKey, setRightKey] = useState('');

	const years = useMemo(
		() => Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i),
		[currentYear]
	);

	useEffect(() => {
		let active = true;
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

	const entities = useMemo(() => {
		if (comparisonType === 'drivers')
			return dataset.drivers.filter((r) => r.driver_code || r.driver_name);
		return dataset.constructors;
	}, [dataset, comparisonType]);

	const validKeys = useMemo(() => entities.map((e) => getEntityKey(e, comparisonType)), [entities, comparisonType]);

	const reqLeft = comparisonType === 'drivers'
		? String(searchParams.get('a') || '').trim().toUpperCase()
		: String(searchParams.get('a') || '').trim();
	const reqRight = comparisonType === 'drivers'
		? String(searchParams.get('b') || '').trim().toUpperCase()
		: String(searchParams.get('b') || '').trim();

	const resolvedLeft = useMemo(() => {
		if (!validKeys.length) return '';
		if (validKeys.includes(reqLeft)) return reqLeft;
		if (validKeys.includes(leftKey)) return leftKey;
		return validKeys[0];
	}, [validKeys, leftKey, reqLeft]);

	const resolvedRight = useMemo(() => {
		if (!validKeys.length) return '';
		if (validKeys.includes(reqRight) && reqRight !== resolvedLeft) return reqRight;
		if (validKeys.includes(rightKey) && rightKey !== resolvedLeft) return rightKey;
		return validKeys.find((k) => k !== resolvedLeft) || resolvedLeft;
	}, [validKeys, rightKey, reqRight, resolvedLeft]);

	const leftEntity = useMemo(
		() => entities.find((e) => getEntityKey(e, comparisonType) === resolvedLeft) || null,
		[entities, comparisonType, resolvedLeft]
	);
	const rightEntity = useMemo(
		() => entities.find((e) => getEntityKey(e, comparisonType) === resolvedRight) || null,
		[entities, comparisonType, resolvedRight]
	);

	const { leftColor, rightColor } = useMemo(
		() => resolveCompareColors(leftEntity, rightEntity, comparisonType),
		[leftEntity, rightEntity, comparisonType]
	);

	const leftName = comparisonType === 'drivers' ? leftEntity?.driver_name : leftEntity?.team_name;
	const rightName = comparisonType === 'drivers' ? rightEntity?.driver_name : rightEntity?.team_name;

	const metrics = useMemo(
		() => buildMetrics(leftEntity, rightEntity, comparisonType),
		[leftEntity, rightEntity, comparisonType]
	);

	const radarData = useMemo(
		() => metrics.map((m) => ({
			metric: m.shortLabel,
			[leftName || 'A']: normalizeRadar(m, m.leftValue, m.rightValue),
			[rightName || 'B']: normalizeRadar(m, m.rightValue, m.leftValue),
		})),
		[metrics, leftName, rightName]
	);

	const verdict = useMemo(() => {
		let lw = 0, rw = 0;
		metrics.forEach((m) => { const w = getWinner(m); if (w === 'left') lw++; if (w === 'right') rw++; });
		return { winner: lw === rw ? 'tie' : lw > rw ? 'left' : 'right', lw, rw };
	}, [metrics]);

	const canCompare = Boolean(leftEntity && rightEntity);

	return (
		<div className="min-h-screen bg-[#050507] px-4 pb-16 pt-24 text-white md:px-10 lg:px-16">
			<div className="mx-auto max-w-6xl space-y-5">

				{/* ── Header ────────────────────────────────────── */}
				<div className="mb-6">
					<p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/20 mb-2">
						FormulaHub · Analysis
					</p>
					<h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
						Head-to-Head
					</h1>
					<p className="mt-2 text-sm text-white/35 max-w-lg">
						Compare season performance across every measurable dimension.
					</p>

					<div className="mt-5 inline-flex rounded-xl border border-white/[0.06] bg-white/[0.015] p-1 gap-1">
						{[
							{ key: 'drivers', label: 'Drivers', icon: <FaUsers size={10} /> },
							{ key: 'constructors', label: 'Constructors', icon: <FaCarSide size={10} /> },
						].map(({ key, label, icon }) => (
							<button
								key={key}
								type="button"
								onClick={() => setComparisonType(key)}
								className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-200 ${
									comparisonType === key
										? 'bg-white/[0.08] text-white'
										: 'text-white/30 hover:text-white/60'
								}`}
							>
								{icon} {label}
							</button>
						))}
					</div>
				</div>

				{/* ── Controls ──────────────────────────────────── */}
				<div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_44px_1fr_110px] md:items-end">
					<EntityDropdown
						label={comparisonType === 'drivers' ? 'Driver A' : 'Constructor A'}
						value={resolvedLeft}
						onChange={setLeftKey}
						entities={entities}
						comparisonType={comparisonType}
						disabled={loading || entities.length < 2}
					/>

					<div className="flex items-end justify-center pb-0.5">
						<button
							type="button"
							onClick={() => { setLeftKey(resolvedRight); setRightKey(resolvedLeft); }}
							disabled={!canCompare}
							className="h-10 w-10 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/35 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-20"
						>
							<FaExchangeAlt size={12} className="mx-auto" />
						</button>
					</div>

					<EntityDropdown
						label={comparisonType === 'drivers' ? 'Driver B' : 'Constructor B'}
						value={resolvedRight}
						onChange={setRightKey}
						entities={entities}
						comparisonType={comparisonType}
						disabled={loading || entities.length < 2}
					/>

					<div>
						<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
							Season
						</label>
						<select
							value={year}
							onChange={(e) => { setLoading(true); setYear(Number(e.target.value)); }}
							className="w-full rounded-xl border border-white/[0.06] bg-black/50 px-3 py-[10px] text-sm text-white outline-none transition focus:border-white/20"
						>
							{years.map((y) => <option key={y} value={y}>{y}</option>)}
						</select>
					</div>
				</div>

				{loading && <Skeleton />}

				{!loading && entities.length < 2 && (
					<div className="rounded-2xl border border-amber-400/[0.12] bg-amber-500/[0.05] p-5 text-sm text-amber-200/70">
						Not enough data for this season.
					</div>
				)}

				{!loading && canCompare && (
					<>
						{/* Identity cards */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<IdentityCard entity={leftEntity} comparisonType={comparisonType} accentColor={leftColor} />
							<IdentityCard entity={rightEntity} comparisonType={comparisonType} accentColor={rightColor} />
						</div>

						{/* Radar + Metrics */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							{/* Radar */}
							<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5">
								<div className="flex items-center justify-between mb-3">
									<h2 className="text-sm font-semibold text-white">Performance Shape</h2>
									<span className="text-[9px] uppercase tracking-[0.18em] text-white/20">Normalized</span>
								</div>
								<div className="flex gap-4 mb-4">
									{[{ name: leftName, color: leftColor }, { name: rightName, color: rightColor }].map((l) => (
										<div key={l.name} className="flex items-center gap-2">
											<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
											<span className="text-[10px] text-white/45 truncate max-w-[100px]">{l.name}</span>
										</div>
									))}
								</div>
								<div className="h-64">
									<ResponsiveContainer>
										<RadarChart data={radarData} outerRadius="72%">
											<PolarGrid stroke="rgba(255,255,255,0.06)" />
											<PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 10 }} />
											<Tooltip contentStyle={{ backgroundColor: 'rgba(5,5,7,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', fontSize: 11 }} />
											<Radar name={leftName} dataKey={leftName} stroke={leftColor} fill={leftColor} fillOpacity={0.22} strokeWidth={1.5} />
											<Radar name={rightName} dataKey={rightName} stroke={rightColor} fill={rightColor} fillOpacity={0.16} strokeWidth={1.5} />
										</RadarChart>
									</ResponsiveContainer>
								</div>
							</div>

							{/* Metric rows */}
							<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-5">
								{/* Header row */}
								<div className="grid grid-cols-[1fr_72px_1fr] items-center gap-3 mb-1 pb-3 border-b border-white/[0.05]">
									<div className="flex items-center gap-2">
										<div className="w-2 h-2 rounded-full" style={{ backgroundColor: leftColor }} />
										<span className="text-[10px] uppercase tracking-[0.12em] text-white/35 truncate">{leftName}</span>
									</div>
									<div />
									<div className="flex items-center justify-end gap-2">
										<span className="text-[10px] uppercase tracking-[0.12em] text-white/35 truncate">{rightName}</span>
										<div className="w-2 h-2 rounded-full" style={{ backgroundColor: rightColor }} />
									</div>
								</div>

								{metrics.map((m) => (
									<MetricRow key={m.id} metric={m} leftColor={leftColor} rightColor={rightColor} />
								))}
							</div>
						</div>

						{/* Verdict */}
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
							<div className="rounded-3xl border border-white/[0.05] bg-white/[0.015] p-6">
								<p className="text-[10px] uppercase tracking-[0.24em] text-white/20 mb-3">Verdict</p>
								<p className="text-2xl font-semibold text-white leading-snug">
									{verdict.winner === 'tie'
										? 'Evenly Matched This Season'
										: verdict.winner === 'left'
										? `${leftName} leads on ${verdict.lw} of ${metrics.length} metrics`
										: `${rightName} leads on ${verdict.rw} of ${metrics.length} metrics`}
								</p>
								<div className="mt-4 flex items-center gap-3">
									<span className="text-sm font-semibold w-4 text-right" style={{ color: leftColor }}>{verdict.lw}</span>
									<div className="flex-1 flex h-1.5 rounded-full overflow-hidden gap-0.5">
										<div className="rounded-l-full" style={{ width: `${(verdict.lw / metrics.length) * 100}%`, backgroundColor: leftColor }} />
										<div className="flex-1 rounded-r-full" style={{ backgroundColor: rightColor, opacity: 0.45 }} />
									</div>
									<span className="text-sm font-semibold w-4" style={{ color: rightColor }}>{verdict.rw}</span>
								</div>
								<p className="mt-2 text-xs text-white/20">
									{dataset.rounds} rounds · {year} season
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
										<Link
											key={l.href}
											href={l.href}
											className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] px-3 py-2.5 text-sm text-white/45 transition hover:bg-white/[0.04] hover:text-white"
										>
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
