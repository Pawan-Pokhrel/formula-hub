'use client';

import { getComparisonDataset } from '@/lib/api/standingsApi';
import { useEffect, useMemo, useState } from 'react';

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
			{
				label: 'Position',
				value: `P${stats.position || '-'}`,
				note: 'Championship rank',
			},
			{
				label: 'Points',
				value: toFixedPoints(stats.points),
				note: 'Current total',
			},
			{ label: 'Wins', value: stats.wins || 0, note: 'Race victories' },
			{ label: 'Podiums', value: stats.podiums || 0, note: 'Top-3 finishes' },
			{ label: 'Poles', value: stats.poles || 0, note: 'Qualifying P1s' },
			{
				label: 'Top 10',
				value: stats.top10_finishes || 0,
				note: 'Points finishes',
			},
			{
				label: 'Avg Finish',
				value: formatAvgFinish(stats.avg_finish),
				note: 'Race pace trend',
			},
			{ label: 'DNFs', value: stats.dnf_count || 0, note: 'Retirements' },
		];
	}, [stats]);

	if (loading) {
		return (
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 animate-pulse">
				{Array.from({ length: 8 }).map((_, index) => (
					<div
						key={`season-skeleton-${index}`}
						className="relative flex flex-col p-4 rounded-2xl bg-white/3 border border-white/6 overflow-hidden"
					>
						<div className="h-2 w-16 rounded bg-white/10 mb-3" />
						<div className="h-8 w-12 rounded bg-white/20 mb-2" />
						<div className="h-2 w-20 rounded bg-white/5" />
					</div>
				))}
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="p-4 mt-4 rounded-2xl bg-white/2 border border-white/5 text-sm text-white/50">
				This season&apos;s stats are not available yet.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
			{metricCards.map((item) => (
				<div
					key={item.label}
					className="flex flex-col p-4 rounded-xl bg-white/1.5 border border-white/4"
				>
					<div className="flex items-center gap-2 mb-1">
						<div
							className="w-1 h-1 rounded-full opacity-60"
							style={{ backgroundColor: teamColor }}
						/>
						<p className="text-[10px] uppercase tracking-[0.18em] text-white/40 leading-none mt-px">
							{item.label}
						</p>
					</div>
					<p className="text-2xl md:text-3xl font-medium tracking-tight text-white mt-1">
						{item.value}
					</p>
					<p className="mt-1.5 text-[9px] text-white/30 uppercase tracking-widest">
						{item.note}
					</p>
				</div>
			))}
		</div>
	);
}
