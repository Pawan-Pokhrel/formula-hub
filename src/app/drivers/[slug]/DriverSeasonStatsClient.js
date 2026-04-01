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
							className="rounded-xl p-3"
							style={{ backgroundColor: `${teamColor}22` }}
						>
							<div className="h-2.5 w-16 rounded bg-white/20" />
							<div className="mt-2 h-6 w-10 rounded bg-white/25" />
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
			{metricCards.map((item) => (
				<div
					key={item.label}
					className="rounded-xl border border-white/10 bg-black/38 p-3"
				>
					<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
						{item.label}
					</p>
					<p className="mt-1 text-lg font-black text-white">{item.value}</p>
				</div>
			))}
		</div>
	);
}
