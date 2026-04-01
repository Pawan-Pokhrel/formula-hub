'use client';

import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import Image from 'next/image';
import { useMemo, useState } from 'react';

const BAND_TABS = [
	{ key: 'p4_p10', label: 'P4-P10' },
	{ key: 'p11_p22', label: 'P11-P22' },
];

function DriverRow({ row }) {
	const teamLogo = getTeamLogoPath(row.team_name);
	const driverImage = getDriverImagePath(row.driver_code);
	const accent = row.team_color || '#6B7280';

	return (
		<div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/4 px-4 py-3">
			<div
				className="absolute left-0 top-0 h-full w-1"
				style={{ backgroundColor: accent }}
			/>
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<span className="w-8 text-sm font-bold text-zinc-300">
						P{row.position}
					</span>
					<div className="relative h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-white/8">
						{driverImage && (
							<Image
								src={driverImage}
								alt={row.driver_name}
								fill
								sizes="40px"
								className="object-cover"
							/>
						)}
					</div>
					<div>
						<p className="text-sm font-semibold text-white">
							{row.driver_name}
						</p>
						<p className="text-xs text-zinc-400">
							{row.driver_code || 'N/A'} · {row.team_name}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3 text-right">
					{teamLogo && (
						<Image
							src={teamLogo}
							alt={row.team_name}
							width={24}
							height={24}
							className="h-6 w-6 rounded-full bg-white/10 p-1"
						/>
					)}
					<div>
						<p className="text-xs text-zinc-500">Session Metric</p>
						<p className="text-sm font-semibold text-zinc-200">
							{row.time ||
								row.best_lap ||
								row.q3 ||
								row.gap_to_pole ||
								row.status ||
								'-'}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function DriverBandsPagination({ bands }) {
	const [activeTab, setActiveTab] = useState('p4_p10');

	const currentRows = useMemo(() => {
		const bucket = bands?.[activeTab];
		if (!bucket?.rows?.length && activeTab === 'p4_p10') {
			return bands?.p11_p22?.rows || [];
		}
		return bucket?.rows || [];
	}, [bands, activeTab]);

	return (
		<div className="rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h3 className="text-xl font-black text-white">Full Classification</h3>
				<div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
					{BAND_TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							onClick={() => setActiveTab(tab.key)}
							className={`rounded-full px-4 py-2 text-xs font-bold tracking-[0.15em] transition-colors ${
								activeTab === tab.key ?
									'bg-white text-black'
								:	'text-zinc-300 hover:text-white'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{currentRows.length === 0 ?
				<div className="rounded-xl border border-dashed border-white/15 bg-white/4 px-4 py-6 text-sm text-zinc-400">
					No drivers in this range for the selected session.
				</div>
			:	<div className="space-y-3">
					{currentRows.map((row) => (
						<DriverRow
							key={`${row.position}_${row.driver_code || row.driver_name}`}
							row={row}
						/>
					))}
				</div>
			}
		</div>
	);
}
