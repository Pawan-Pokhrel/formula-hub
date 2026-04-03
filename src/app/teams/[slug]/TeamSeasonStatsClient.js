'use client';

import { getTeamCode } from '@/components/schedule/scheduleHelpers';
import { getComparisonDataset } from '@/lib/api/standingsApi';
import { useEffect, useMemo, useState } from 'react';

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
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 animate-pulse">
				{Array.from({ length: 8 }).map((_, index) => (
					<div key={`team-season-loading-${index}`} className="relative flex flex-col p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
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
			<div className="p-4 mt-4 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-white/50">
				This season's team stats are not available yet.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
			{metricCards.map((item) => (
				<div key={item.label} className="flex flex-col p-4 rounded-xl bg-white/[0.015] border border-white/[0.04]">
					<div className="flex items-center gap-2 mb-1">
						<div className="w-1 h-1 rounded-full opacity-60" style={{ backgroundColor: teamColor }} />
						<p className="text-[10px] uppercase tracking-[0.18em] text-white/40 leading-none mt-[1px]">
							{item.label}
						</p>
					</div>
					<p className="text-2xl md:text-3xl font-medium tracking-tight text-white mt-1">
						{item.value}
					</p>
					<p className="mt-1.5 text-[9px] text-white/30 uppercase tracking-[0.1em]">
						{item.note}
					</p>
				</div>
			))}
		</div>
	);
}
