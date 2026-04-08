'use client';

import { getTeamLogoPath } from '@/components/schedule/scheduleHelpers';
import { getCarImage } from '@/utils/f1_images';
import Image from 'next/image';
import { useState } from 'react';
import PodiumTop3 from './PodiumTop3';
import {
	getTelemetryMetric,
	getTeamCardBackground,
	getTelemetryCardTexturePattern,
	getRacePointsByPosition,
	getTelemetryDriverImage,
} from './telemetryUiUtils';

const BAND_TABS = [
	{ key: 'p1_p10', label: 'P1-P10' },
	{ key: 'p11_p22', label: 'P11-P22' },
];

function DriverRow({ row, sessionType }) {
	const teamLogo = getTeamLogoPath(row.team_name);
	const driverImage = getTelemetryDriverImage(row.driver_code);
	const carImage = getCarImage(row.team_name);
	const accent = row.team_color || '#6B7280';
	const metric = getTelemetryMetric(row, sessionType);
	const points = sessionType === 'race' ? getRacePointsByPosition(row.position) : 0;

	return (
		<div
			className="relative w-full overflow-hidden rounded-xl border border-white/15 px-4 py-2.5 backdrop-blur-md"
			style={{ background: getTeamCardBackground(accent) }}
		>
			<div
				className="pointer-events-none absolute inset-0 opacity-35"
				style={{
					backgroundImage: getTelemetryCardTexturePattern(),
					backgroundSize: '22px 22px, 100% 100%, 180px 100%',
				}}
			/>
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-3">
					<span className="w-8 text-sm font-bold text-zinc-300">P{row.position}</span>
					<div className="relative h-16 w-16 overflow-hidden rounded-lg bg-white/8">
						{driverImage && (
							<Image
								src={driverImage}
								alt={row.driver_name}
								fill
								sizes="64px"
								className="object-cover object-top"
							/>
						)}
					</div>
					<div>
						<p className="text-sm font-semibold text-white">{row.driver_name}</p>
						<p className="text-xs text-zinc-400">
							{row.driver_code || 'N/A'} - {row.team_name}
						</p>
					</div>
				</div>

				<div className="relative hidden h-8 w-24 md:block">
					{carImage && (
						<Image
							src={carImage}
							alt={`${row.team_name} car`}
							fill
							sizes="96px"
							className="object-contain opacity-95"
						/>
					)}
				</div>

				<div className="ml-auto flex items-center gap-3">
					{teamLogo && (
						<div className="relative h-10 w-10 shrink-0 rounded-lg bg-black/20 p-1">
							<Image
								src={teamLogo}
								alt={row.team_name}
								fill
								sizes="40px"
								className="object-contain p-1"
							/>
						</div>
					)}
					<div className="text-right">
						<p className="text-xs text-zinc-500">{metric.primaryLabel}</p>
						<p className={`text-sm font-semibold ${metric.retired ? 'text-red-400' : 'text-zinc-100'}`}>
							{metric.primaryValue}
						</p>
						{metric.secondaryLabel && (
							<p className="text-[11px] text-zinc-300">
								{metric.secondaryLabel}: {metric.secondaryValue}
							</p>
						)}
					</div>
					{sessionType === 'race' && (
						<div className="rounded-lg border border-red-300/35 bg-red-500/18 px-3 py-1.5 text-center">
							<p className="text-lg font-black leading-none text-red-100">+{points}</p>
							<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-200">pts</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function DriverList({ rows, sessionType }) {
	if (!rows.length) {
		return (
			<div className="rounded-xl border border-dashed border-white/15 bg-white/4 px-4 py-6 text-sm text-zinc-400">
				No drivers in this range for the selected session.
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{rows.map((row) => (
				<DriverRow
					key={`${row.position}_${row.driver_code || row.driver_name}`}
					row={row}
					sessionType={sessionType}
				/>
			))}
		</div>
	);
}

export default function DriverBandsPagination({ bands, sessionType = 'race' }) {
	const [activeTab, setActiveTab] = useState('p1_p10');

	const top3Rows = bands?.top3?.rows || [];
	const p4To10Rows = bands?.p4_p10?.rows || [];
	const p11To22Rows = bands?.p11_p22?.rows || [];

	const currentRows = activeTab === 'p1_p10' ? p4To10Rows : p11To22Rows;

	return (
		<div className="rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h3 className="text-xl font-black text-white">Race Classification</h3>
				<div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
					{BAND_TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							onClick={() => setActiveTab(tab.key)}
							className={`rounded-full px-4 py-2 text-xs font-bold tracking-[0.15em] transition-colors ${
								activeTab === tab.key ?
									'bg-white text-black'
								: 'text-zinc-300 hover:text-white'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{activeTab === 'p1_p10' ?
				<div className="space-y-4">
					<PodiumTop3
						rows={top3Rows}
						sessionType={sessionType}
					/>
					<div className="rounded-xl border border-white/10 bg-black/30 p-3">
						<p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
							P4-P10
						</p>
						<DriverList
							rows={currentRows}
							sessionType={sessionType}
						/>
					</div>
				</div>
			: <DriverList
					rows={currentRows}
					sessionType={sessionType}
				/>
			}
		</div>
	);
}
