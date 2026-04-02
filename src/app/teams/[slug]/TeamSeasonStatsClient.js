'use client';

import { getTeamCode } from '@/components/schedule/scheduleHelpers';
import { getComparisonDataset } from '@/lib/api/standingsApi';
import { useEffect, useMemo, useState } from 'react';
import { FaChartLine } from 'react-icons/fa';

function normalizeName(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ');
}

function getTeamKey(teamName) {
	return getTeamCode(teamName) || normalizeName(teamName);
}

function toPoints(value) {
	const num = Number(value || 0);
	if (!Number.isFinite(num)) return '0';
	return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function toAvgFinish(value) {
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0 || num >= 99) return 'N/A';
	return `P${num.toFixed(2)}`;
}

export default function TeamSeasonStatsClient({ teamName, teamColor, year }) {
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState(null);

	useEffect(() => {
		let active = true;
		const expectedKey = getTeamKey(teamName);

		getComparisonDataset(year)
			.then((data) => {
				if (!active) return;
				const constructors =
					Array.isArray(data?.constructors) ? data.constructors : [];
				const match = constructors.find(
					(row) => getTeamKey(row?.team_name) === expectedKey
				);
				setStats(match || null);
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
	}, [teamName, year]);

	const metricCards = useMemo(() => {
		if (!stats) return [];
		return [
			{
				label: 'Position',
				value: `P${stats.position || '-'}`,
				note: 'Constructor rank',
			},
			{
				label: 'Points',
				value: toPoints(stats.points),
				note: 'Championship total',
			},
			{ label: 'Wins', value: stats.wins || 0, note: 'Grand Prix wins' },
			{ label: 'Podiums', value: stats.podiums || 0, note: 'Top-3 finishes' },
			{ label: 'Poles', value: stats.poles || 0, note: 'Qualifying P1s' },
			{
				label: 'Top 10',
				value: stats.top10_finishes || 0,
				note: 'Points finishes',
			},
			{
				label: 'Avg Finish',
				value: toAvgFinish(stats.avg_finish),
				note: 'Race pace trend',
			},
			{ label: 'DNFs', value: stats.dnf_count || 0, note: 'Retirements' },
		];
	}, [stats]);

	if (loading) {
		return (
			<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 animate-pulse">
				{Array.from({ length: 8 }).map((_, index) => (
					<div
						key={`team-season-loading-${index}`}
						className="rounded-xl border border-white/10 p-3"
						style={{ backgroundColor: `${teamColor}1E` }}
					>
						<div className="h-2.5 w-16 rounded bg-white/20" />
						<div className="mt-2 h-6 w-12 rounded bg-white/25" />
						<div className="mt-2 h-2 w-24 rounded bg-white/20" />
					</div>
				))}
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-gray-300 inline-flex items-center gap-2">
				<FaChartLine className="text-red-400" />
				This season team stats are not available yet.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
			{metricCards.map((item) => (
				<div
					key={item.label}
					className="rounded-xl border border-white/10 p-3"
					style={{
						background: `linear-gradient(145deg, ${teamColor}18 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.5) 100%)`,
					}}
				>
					<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
						{item.label}
					</p>
					<p className="mt-1 text-lg font-black text-white">{item.value}</p>
					<p className="mt-1 text-[10px] text-gray-500 uppercase tracking-[0.12em]">
						{item.note}
					</p>
				</div>
			))}
		</div>
	);
}
