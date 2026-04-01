'use client';

import { getComparisonDataset } from '@/lib/api/standingsApi';
import { useEffect, useMemo, useState } from 'react';
import { FaChartLine } from 'react-icons/fa';

function toFixedPoints(value) {
	const num = Number(value || 0);
	return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function formatAvgFinish(value) {
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0 || num >= 99) return 'N/A';
	return `P${num.toFixed(2)}`;
}

function getMetricProgress(label, value, stats) {
	const numeric = Number(value || 0);
	const raceCount = Math.max(1, Number(stats?.race_count || 24));

	switch (label) {
		case 'Position': {
			const position = Number(stats?.position || 20);
			return Math.max(6, Math.min(100, Math.round(100 - (position - 1) * 5)));
		}
		case 'Points':
			return Math.max(6, Math.min(100, Math.round((numeric / 400) * 100)));
		case 'Wins':
			return Math.max(
				6,
				Math.min(100, Math.round((numeric / raceCount) * 100))
			);
		case 'Podiums':
			return Math.max(
				6,
				Math.min(100, Math.round((numeric / raceCount) * 100))
			);
		case 'Poles':
			return Math.max(
				6,
				Math.min(100, Math.round((numeric / raceCount) * 100))
			);
		case 'Top 10':
			return Math.max(
				6,
				Math.min(100, Math.round((numeric / raceCount) * 100))
			);
		case 'DNFs':
			return Math.max(
				6,
				Math.min(100, Math.round(100 - (numeric / raceCount) * 100))
			);
		case 'Avg Finish': {
			const avgFinish = Number(stats?.avg_finish || 99);
			if (!Number.isFinite(avgFinish) || avgFinish <= 0 || avgFinish >= 99)
				return 8;
			return Math.max(8, Math.min(100, Math.round(100 - (avgFinish - 1) * 6)));
		}
		default:
			return 20;
	}
}

export default function DriverSeasonStatsClient({
	driverCode,
	driverName,
	year,
	teamColor,
}) {
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState(null);

	useEffect(() => {
		let active = true;

		getComparisonDataset(year)
			.then((data) => {
				if (!active) return;
				const rows = Array.isArray(data?.drivers) ? data.drivers : [];
				const byCode = rows.find(
					(row) =>
						String(row?.driver_code || '').toUpperCase() ===
						String(driverCode || '').toUpperCase()
				);
				const byName = rows.find(
					(row) =>
						String(row?.driver_name || '')
							.trim()
							.toLowerCase() ===
						String(driverName || '')
							.trim()
							.toLowerCase()
				);
				setStats(byCode || byName || null);
			})
			.catch(() => {
				if (!active) return;
				setStats(null);
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [driverCode, driverName, year]);

	const metricCards = useMemo(() => {
		if (!stats) return [];
		return [
			{ label: 'Position', value: `P${stats.position || '-'}` },
			{ label: 'Points', value: toFixedPoints(stats.points) },
			{ label: 'Wins', value: stats.wins || 0 },
			{ label: 'Podiums', value: stats.podiums || 0 },
			{ label: 'Poles', value: stats.poles || 0 },
			{ label: 'Top 10', value: stats.top10_finishes || 0 },
			{ label: 'Avg Finish', value: formatAvgFinish(stats.avg_finish) },
			{ label: 'DNFs', value: stats.dnf_count || 0 },
		];
	}, [stats]);

	if (loading) {
		return (
			<div className="rounded-2xl border border-white/10 bg-black/40 p-4">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 animate-pulse">
					{Array.from({ length: 8 }).map((_, index) => (
						<div
							key={`season-skeleton-${index}`}
							className="rounded-xl p-3 border border-white/8"
							style={{ backgroundColor: `${teamColor}22` }}
						>
							<div className="h-2.5 w-16 rounded bg-white/20" />
							<div className="mt-2 h-6 w-10 rounded bg-white/25" />
							<div className="mt-3 h-1.5 w-full rounded-full bg-white/15" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-gray-300 inline-flex items-center gap-2">
				<FaChartLine className="text-red-400" />
				This season stats are not available yet.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
			{metricCards.map((item, index) => {
				const progress = getMetricProgress(item.label, item.value, stats);
				return (
					<div
						key={item.label}
						className="rounded-xl border border-white/10 bg-black/38 p-3 overflow-hidden"
						style={{
							background: `linear-gradient(145deg, ${teamColor}14 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.48) 100%)`,
						}}
					>
						<div
							className="h-0.5 rounded-full"
							style={{
								width: `${Math.max(12, progress)}%`,
								backgroundColor: teamColor,
								opacity: 0.85,
							}}
						/>
						<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
							{item.label}
						</p>
						<p className="mt-1 text-lg font-black text-white">{item.value}</p>
						<p className="mt-1 text-[10px] text-gray-500 uppercase tracking-[0.12em]">
							Form Index {String(index + 1).padStart(2, '0')}
						</p>
					</div>
				);
			})}
		</div>
	);
}
