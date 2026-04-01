'use client';

import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { getComparisonDataset } from '@/lib/api/standingsApi';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
	FaBalanceScale,
	FaCarSide,
	FaExchangeAlt,
	FaFlagCheckered,
	FaUsers,
} from 'react-icons/fa';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

function toFixedPoints(value) {
	const num = Number(value || 0);
	return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function buildMetrics(left, right, comparisonType) {
	if (!left || !right) return [];

	const common = [
		{
			id: 'points',
			label: 'Championship Points',
			leftValue: Number(left.points || 0),
			rightValue: Number(right.points || 0),
			format: (v) => `${toFixedPoints(v)} pts`,
			higherIsBetter: true,
		},
		{
			id: 'wins',
			label: comparisonType === 'drivers' ? 'Race Wins' : 'Team Wins',
			leftValue: Number(left.wins || 0),
			rightValue: Number(right.wins || 0),
			format: (v) => `${v}`,
			higherIsBetter: true,
		},
		{
			id: 'podiums',
			label: 'Podiums',
			leftValue: Number(left.podiums || 0),
			rightValue: Number(right.podiums || 0),
			format: (v) => `${v}`,
			higherIsBetter: true,
		},
		{
			id: 'poles',
			label: 'Pole Positions',
			leftValue: Number(left.poles || 0),
			rightValue: Number(right.poles || 0),
			format: (v) => `${v}`,
			higherIsBetter: true,
		},
		{
			id: 'top10_finishes',
			label: 'Top 10 Finishes',
			leftValue: Number(left.top10_finishes || 0),
			rightValue: Number(right.top10_finishes || 0),
			format: (v) => `${v}`,
			higherIsBetter: true,
		},
		{
			id: 'avg_finish',
			label: 'Average Finish',
			leftValue: Number(left.avg_finish || 99),
			rightValue: Number(right.avg_finish || 99),
			format: (v) =>
				Number.isFinite(v) && v < 99 ? `P${v.toFixed(2)}` : 'N/A',
			higherIsBetter: false,
		},
		{
			id: 'dnf_count',
			label: 'DNFs',
			leftValue: Number(left.dnf_count || 0),
			rightValue: Number(right.dnf_count || 0),
			format: (v) => `${v}`,
			higherIsBetter: false,
		},
	];

	return common;
}

function getWinner(metric) {
	if (metric.leftValue === metric.rightValue) return 'tie';
	if (metric.higherIsBetter) {
		return metric.leftValue > metric.rightValue ? 'left' : 'right';
	}
	return metric.leftValue < metric.rightValue ? 'left' : 'right';
}

function normalizeRadarValue(metric, value, oppositeValue) {
	if (!Number.isFinite(value) || !Number.isFinite(oppositeValue)) return 50;
	if (metric.higherIsBetter) {
		const maxValue = Math.max(value, oppositeValue, 1);
		return (value / maxValue) * 100;
	}
	const maxValue = Math.max(value, oppositeValue, 1);
	return ((maxValue - value) / maxValue) * 100;
}

function getEntityKey(entity, comparisonType) {
	if (!entity) return '';
	if (comparisonType === 'drivers') {
		return entity.driver_code || entity.driver_name;
	}
	return entity.team_name;
}

function getEntityLabel(entity, comparisonType) {
	if (!entity) return '';
	if (comparisonType === 'drivers') {
		return `${entity.position}. ${entity.driver_name}`;
	}
	return `${entity.position}. ${entity.team_name}`;
}

function getBarWidths(metric) {
	if (metric.leftValue === metric.rightValue) {
		return { left: 50, right: 50 };
	}

	if (metric.higherIsBetter) {
		const total = metric.leftValue + metric.rightValue;
		if (total <= 0) return { left: 50, right: 50 };
		return {
			left: Math.max(12, (metric.leftValue / total) * 100),
			right: Math.max(12, (metric.rightValue / total) * 100),
		};
	}

	const maxValue = Math.max(metric.leftValue, metric.rightValue);
	if (maxValue <= 0) return { left: 50, right: 50 };
	const leftScore = maxValue - metric.leftValue;
	const rightScore = maxValue - metric.rightValue;
	const total = leftScore + rightScore;
	if (total <= 0) return { left: 50, right: 50 };
	return {
		left: Math.max(12, (leftScore / total) * 100),
		right: Math.max(12, (rightScore / total) * 100),
	};
}

function IdentityCard({ entity, side, comparisonType }) {
	if (!entity) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
				No selection.
			</div>
		);
	}

	const teamLogo = getTeamLogoPath(entity.team_name || entity.team_name);
	const driverImage =
		comparisonType === 'drivers' ?
			getDriverImagePath(entity.driver_code)
		:	null;
	const accent =
		side === 'left' ?
			'from-red-500/18 via-red-500/6 to-transparent border-red-400/20'
		:	'from-cyan-500/20 via-cyan-500/7 to-transparent border-cyan-300/20';

	return (
		<div
			className={`rounded-2xl border bg-linear-to-br ${accent} p-5 backdrop-blur-sm`}
		>
			<div className="flex items-center gap-4">
				<div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-white/8">
					{driverImage ?
						<Image
							src={driverImage}
							alt={entity.driver_name}
							fill
							sizes="64px"
							className="object-cover"
						/>
					: teamLogo ?
						<Image
							src={teamLogo}
							alt={entity.team_name}
							fill
							sizes="64px"
							className="object-contain p-2"
						/>
					:	null}
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
						{comparisonType === 'drivers' ? entity.driver_code || 'DRV' : 'CON'}
					</p>
					<h2 className="text-2xl font-black text-white">
						{comparisonType === 'drivers' ?
							entity.driver_name
						:	entity.team_name}
					</h2>
					<div className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-300">
						{teamLogo && comparisonType === 'drivers' && (
							<Image
								src={teamLogo}
								alt={entity.team_name}
								width={20}
								height={20}
								className="h-5 w-5 rounded-full bg-white/10 p-1"
							/>
						)}
						<span>
							{comparisonType === 'drivers' ?
								entity.team_name
							:	'Constructor Team'}
						</span>
					</div>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-3 gap-2">
				<div className="rounded-xl border border-white/12 bg-black/35 px-3 py-2 text-center">
					<p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
						Position
					</p>
					<p className="mt-1 text-lg font-black text-white">
						P{entity.position}
					</p>
				</div>
				<div className="rounded-xl border border-white/12 bg-black/35 px-3 py-2 text-center">
					<p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
						Points
					</p>
					<p className="mt-1 text-lg font-black text-white">
						{toFixedPoints(entity.points)}
					</p>
				</div>
				<div className="rounded-xl border border-white/12 bg-black/35 px-3 py-2 text-center">
					<p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
						Wins
					</p>
					<p className="mt-1 text-lg font-black text-white">{entity.wins}</p>
				</div>
			</div>
		</div>
	);
}

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

	const [year, setYear] = useState(initialYear);
	const [comparisonType, setComparisonType] = useState(requestedType);
	const [dataset, setDataset] = useState({
		drivers: [],
		constructors: [],
		rounds: 0,
	});
	const [loading, setLoading] = useState(true);
	const [leftKey, setLeftKey] = useState('');
	const [rightKey, setRightKey] = useState('');

	const years = useMemo(
		() =>
			Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i),
		[currentYear]
	);

	useEffect(() => {
		let active = true;

		getComparisonDataset(year)
			.then((data) => {
				if (!active) return;
				setDataset({
					drivers: Array.isArray(data?.drivers) ? data.drivers : [],
					constructors:
						Array.isArray(data?.constructors) ? data.constructors : [],
					rounds: Number(data?.rounds || 0),
				});
			})
			.catch(() => {
				if (!active) return;
				setDataset({ drivers: [], constructors: [], rounds: 0 });
				setLeftKey('');
				setRightKey('');
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [year]);

	const entities = useMemo(() => {
		if (comparisonType === 'drivers') {
			return dataset.drivers.filter(
				(row) => row.driver_code || row.driver_name
			);
		}
		return dataset.constructors;
	}, [dataset, comparisonType]);

	const validKeys = useMemo(
		() => entities.map((entity) => getEntityKey(entity, comparisonType)),
		[entities, comparisonType]
	);

	const requestedLeftRaw = String(searchParams.get('a') || '').trim();
	const requestedRightRaw = String(searchParams.get('b') || '').trim();
	const requestedLeft =
		comparisonType === 'drivers' ?
			requestedLeftRaw.toUpperCase()
		:	requestedLeftRaw;
	const requestedRight =
		comparisonType === 'drivers' ?
			requestedRightRaw.toUpperCase()
		:	requestedRightRaw;

	const resolvedLeftKey = useMemo(() => {
		if (validKeys.length === 0) return '';
		if (validKeys.includes(leftKey)) return leftKey;
		if (validKeys.includes(requestedLeft)) return requestedLeft;
		return validKeys[0];
	}, [validKeys, leftKey, requestedLeft]);

	const resolvedRightKey = useMemo(() => {
		if (validKeys.length === 0) return '';
		if (validKeys.includes(rightKey) && rightKey !== resolvedLeftKey)
			return rightKey;
		if (
			validKeys.includes(requestedRight) &&
			requestedRight !== resolvedLeftKey
		) {
			return requestedRight;
		}
		return validKeys.find((key) => key !== resolvedLeftKey) || resolvedLeftKey;
	}, [validKeys, rightKey, requestedRight, resolvedLeftKey]);

	const leftEntity = useMemo(
		() =>
			entities.find(
				(entity) => getEntityKey(entity, comparisonType) === resolvedLeftKey
			) || null,
		[entities, comparisonType, resolvedLeftKey]
	);
	const rightEntity = useMemo(
		() =>
			entities.find(
				(entity) => getEntityKey(entity, comparisonType) === resolvedRightKey
			) || null,
		[entities, comparisonType, resolvedRightKey]
	);

	const metrics = useMemo(
		() => buildMetrics(leftEntity, rightEntity, comparisonType),
		[leftEntity, rightEntity, comparisonType]
	);

	const leftDisplayName = useMemo(() => {
		if (!leftEntity)
			return comparisonType === 'drivers' ? 'Driver A' : 'Constructor A';
		return comparisonType === 'drivers' ?
				leftEntity.driver_name
			:	leftEntity.team_name;
	}, [leftEntity, comparisonType]);

	const rightDisplayName = useMemo(() => {
		if (!rightEntity)
			return comparisonType === 'drivers' ? 'Driver B' : 'Constructor B';
		return comparisonType === 'drivers' ?
				rightEntity.driver_name
			:	rightEntity.team_name;
	}, [rightEntity, comparisonType]);

	const leftVisualPath = useMemo(() => {
		if (!leftEntity) return null;
		if (comparisonType === 'drivers') {
			return (
				getDriverImagePath(leftEntity.driver_code) ||
				getTeamLogoPath(leftEntity.team_name)
			);
		}
		return getTeamLogoPath(leftEntity.team_name);
	}, [leftEntity, comparisonType]);

	const rightVisualPath = useMemo(() => {
		if (!rightEntity) return null;
		if (comparisonType === 'drivers') {
			return (
				getDriverImagePath(rightEntity.driver_code) ||
				getTeamLogoPath(rightEntity.team_name)
			);
		}
		return getTeamLogoPath(rightEntity.team_name);
	}, [rightEntity, comparisonType]);

	const radarData = useMemo(
		() =>
			metrics.map((metric) => ({
				metric: metric.label,
				left: normalizeRadarValue(metric, metric.leftValue, metric.rightValue),
				right: normalizeRadarValue(metric, metric.rightValue, metric.leftValue),
			})),
		[metrics]
	);

	const barData = useMemo(
		() =>
			metrics.map((metric) => ({
				metric: metric.label,
				left: Number(metric.leftValue || 0),
				right: Number(metric.rightValue || 0),
			})),
		[metrics]
	);

	const verdict = useMemo(() => {
		let leftWins = 0;
		let rightWins = 0;
		metrics.forEach((metric) => {
			const winner = getWinner(metric);
			if (winner === 'left') leftWins += 1;
			if (winner === 'right') rightWins += 1;
		});

		if (leftWins === rightWins) return { winner: 'tie', leftWins, rightWins };
		return {
			winner: leftWins > rightWins ? 'left' : 'right',
			leftWins,
			rightWins,
		};
	}, [metrics]);

	const canCompare = Boolean(leftEntity && rightEntity);

	const swapSelection = () => {
		setLeftKey(resolvedRightKey);
		setRightKey(resolvedLeftKey);
	};

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_8%_8%,rgba(239,68,68,0.2),transparent_34%),radial-gradient(circle_at_95%_10%,rgba(8,145,178,0.18),transparent_34%),#050507] px-6 pb-12 pt-24 text-white md:px-12 lg:px-20">
			<div className="mx-auto max-w-7xl space-y-6">
				<header className="rounded-3xl border border-white/10 bg-black/45 p-6 backdrop-blur-2xl md:p-8">
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
						FormulaHub Comparison Lab
					</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
						Head-To-Head: Drivers & Constructors
					</h1>
					<p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
						Switch between driver and constructor mode, then compare meaningful
						performance signals: wins, podiums, poles, top-10 consistency,
						reliability, and finishing efficiency.
					</p>
					<div className="mt-5 inline-flex rounded-xl border border-white/12 bg-black/45 p-1">
						<button
							type="button"
							onClick={() => setComparisonType('drivers')}
							className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
								comparisonType === 'drivers' ?
									'bg-red-600/30 text-red-100'
								:	'text-zinc-300 hover:text-white'
							}`}
						>
							<FaUsers /> Drivers
						</button>
						<button
							type="button"
							onClick={() => setComparisonType('constructors')}
							className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
								comparisonType === 'constructors' ?
									'bg-cyan-500/30 text-cyan-100'
								:	'text-zinc-300 hover:text-white'
							}`}
						>
							<FaCarSide /> Constructors
						</button>
					</div>
				</header>

				<section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl md:p-5">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
						<div>
							<label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
								{comparisonType === 'drivers' ? 'Driver A' : 'Constructor A'}
							</label>
							<select
								value={resolvedLeftKey}
								onChange={(event) => setLeftKey(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-400/45"
								disabled={loading || entities.length < 2}
							>
								{entities.map((entity) => (
									<option
										key={getEntityKey(entity, comparisonType)}
										value={getEntityKey(entity, comparisonType)}
									>
										{getEntityLabel(entity, comparisonType)}
									</option>
								))}
							</select>
						</div>

						<button
							type="button"
							onClick={swapSelection}
							className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={!canCompare}
							aria-label="Swap selected entities"
						>
							<FaExchangeAlt />
						</button>

						<div>
							<label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
								{comparisonType === 'drivers' ? 'Driver B' : 'Constructor B'}
							</label>
							<select
								value={resolvedRightKey}
								onChange={(event) => setRightKey(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/45"
								disabled={loading || entities.length < 2}
							>
								{entities.map((entity) => (
									<option
										key={getEntityKey(entity, comparisonType)}
										value={getEntityKey(entity, comparisonType)}
									>
										{getEntityLabel(entity, comparisonType)}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
								Season
							</label>
							<select
								value={year}
								onChange={(event) => {
									setLoading(true);
									setYear(Number(event.target.value));
								}}
								className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/35"
							>
								{years.map((seasonYear) => (
									<option
										key={seasonYear}
										value={seasonYear}
									>
										{seasonYear}
									</option>
								))}
							</select>
						</div>
					</div>
				</section>

				{loading && (
					<div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-400">
						Loading standings for comparison...
					</div>
				)}

				{!loading && entities.length < 2 && (
					<div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6 text-sm text-amber-100">
						Not enough standings data to run this comparison for the selected
						season.
					</div>
				)}

				{!loading && canCompare && (
					<>
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<IdentityCard
								entity={leftEntity}
								side="left"
								comparisonType={comparisonType}
							/>
							<IdentityCard
								entity={rightEntity}
								side="right"
								comparisonType={comparisonType}
							/>
						</div>

						<section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							<div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
								<div className="mb-3 flex items-center justify-between gap-3">
									<h2 className="text-xl font-black text-white">
										Performance Shape
									</h2>
									<span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
										Normalized Radar
									</span>
								</div>
								<div className="h-80">
									<ResponsiveContainer>
										<RadarChart
											data={radarData}
											outerRadius="75%"
										>
											<PolarGrid stroke="rgba(255,255,255,0.18)" />
											<PolarAngleAxis
												dataKey="metric"
												tick={{ fill: '#d4d4d8', fontSize: 11 }}
											/>
											<Radar
												name={leftDisplayName}
												dataKey="left"
												stroke="#ef4444"
												fill="#ef4444"
												fillOpacity={0.25}
											/>
											<Radar
												name={rightDisplayName}
												dataKey="right"
												stroke="#22d3ee"
												fill="#22d3ee"
												fillOpacity={0.2}
											/>
											<Legend />
										</RadarChart>
									</ResponsiveContainer>
								</div>
							</div>

							<div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
								<div className="mb-3 flex items-center justify-between gap-3">
									<h2 className="text-xl font-black text-white">Stat Delta</h2>
									<span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
										Raw Values
									</span>
								</div>
								<div className="h-80">
									<ResponsiveContainer>
										<BarChart
											data={barData}
											layout="vertical"
											margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
										>
											<CartesianGrid
												stroke="rgba(255,255,255,0.10)"
												horizontal={false}
											/>
											<XAxis
												type="number"
												stroke="#a1a1aa"
											/>
											<YAxis
												type="category"
												dataKey="metric"
												width={120}
												stroke="#d4d4d8"
											/>
											<Tooltip
												contentStyle={{
													backgroundColor: 'rgba(12,12,16,0.94)',
													border: '1px solid rgba(255,255,255,0.16)',
													borderRadius: 10,
													color: '#f4f4f5',
												}}
											/>
											<Legend />
											<Bar
												dataKey="left"
												fill="#ef4444"
												radius={[4, 4, 4, 4]}
											/>
											<Bar
												dataKey="left"
												name={leftDisplayName}
												fill="#ef4444"
												radius={[4, 4, 4, 4]}
											/>
											<Bar
												dataKey="right"
												name={rightDisplayName}
												fill="#22d3ee"
												radius={[4, 4, 4, 4]}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						</section>

						<section className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<h2 className="text-2xl font-black text-white">
									Metric Breakdown
								</h2>
								<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
									<FaBalanceScale />
									Head To Head
								</span>
							</div>

							<div className="space-y-4">
								{metrics.map((metric) => {
									const winner = getWinner(metric);
									const bars = getBarWidths(metric);

									return (
										<div
											key={metric.id}
											className="rounded-xl border border-white/10 bg-black/35 p-4"
										>
											<div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-zinc-400">
												<span>{metric.label}</span>
												<span>
													{winner === 'tie' ?
														'Tie'
													: winner === 'left' ?
														`${
															comparisonType === 'drivers' ?
																leftEntity?.driver_name
															:	leftEntity?.team_name
														} Edge`
													:	`${
															comparisonType === 'drivers' ?
																rightEntity?.driver_name
															:	rightEntity?.team_name
														} Edge`
													}
												</span>
											</div>
											<div className="mb-3 grid grid-cols-2 gap-3 text-sm font-semibold">
												<p className="inline-flex items-center gap-2 text-red-200">
													{leftVisualPath && (
														<Image
															src={leftVisualPath}
															alt={leftDisplayName}
															width={18}
															height={18}
															className="h-[18px] w-[18px] rounded-full border border-white/15 bg-white/8"
														/>
													)}
													<span className="truncate">{leftDisplayName}</span>
													<span className="font-semibold">
														{metric.format(metric.leftValue)}
													</span>
												</p>
												<p className="inline-flex items-center justify-end gap-2 text-right text-cyan-200">
													<span className="font-semibold">
														{metric.format(metric.rightValue)}
													</span>
													<span className="truncate">{rightDisplayName}</span>
													{rightVisualPath && (
														<Image
															src={rightVisualPath}
															alt={rightDisplayName}
															width={18}
															height={18}
															className="h-[18px] w-[18px] rounded-full border border-white/15 bg-white/8"
														/>
													)}
												</p>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div className="h-2 rounded-full bg-white/10">
													<div
														className="h-full rounded-full bg-linear-to-r from-red-700 to-red-300"
														style={{ width: `${Math.min(100, bars.left)}%` }}
													/>
												</div>
												<div className="h-2 rounded-full bg-white/10">
													<div
														className="ml-auto h-full rounded-full bg-linear-to-r from-cyan-500 to-cyan-200"
														style={{ width: `${Math.min(100, bars.right)}%` }}
													/>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</section>

						<section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
							<div className="rounded-2xl border border-white/10 bg-black/35 p-5">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
									Verdict
								</p>
								<p className="mt-2 text-2xl font-black text-white">
									{verdict.winner === 'tie' ?
										'Evenly Matched'
									: verdict.winner === 'left' ?
										`${comparisonType === 'drivers' ? leftEntity.driver_name : leftEntity.team_name} has the stronger season profile`
									:	`${comparisonType === 'drivers' ? rightEntity.driver_name : rightEntity.team_name} has the stronger season profile`
									}
								</p>
								<p className="mt-3 text-sm text-zinc-300">
									Metric wins: {leftDisplayName} {verdict.leftWins} vs{' '}
									{rightDisplayName} {verdict.rightWins}
								</p>
								<p className="mt-2 text-xs uppercase tracking-[0.14em] text-zinc-500">
									Season rounds analyzed: {dataset.rounds || 'N/A'}
								</p>
							</div>
							<div className="rounded-2xl border border-white/10 bg-black/35 p-5">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
									Quick Actions
								</p>
								<div className="mt-3 space-y-2 text-sm">
									<Link
										href={`/telemetry?year=${year}`}
										className="inline-flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-zinc-100 transition hover:bg-white/10"
									>
										<span>Open Telemetry</span>
										<FaFlagCheckered className="text-red-300" />
									</Link>
									<Link
										href="/standings"
										className="inline-flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-zinc-100 transition hover:bg-white/10"
									>
										<span>View Full Standings</span>
										<FaFlagCheckered className="text-cyan-300" />
									</Link>
									<Link
										href={`/track?year=${year}`}
										className="inline-flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-zinc-100 transition hover:bg-white/10"
									>
										<span>Open Track Visualizer</span>
										<FaFlagCheckered className="text-amber-300" />
									</Link>
								</div>
							</div>
						</section>
					</>
				)}
			</div>
		</div>
	);
}
