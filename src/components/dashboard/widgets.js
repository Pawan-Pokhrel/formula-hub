'use client';

import {
	getCountryCode,
	getDriverImagePath,
	getTeamLogoPath,
	getTrackImagePath,
} from '@/components/schedule/scheduleHelpers';
import { getTelemetrySessionSnapshot } from '@/lib/api/scheduleApi';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
	FaBolt,
	FaBroadcastTower,
	FaCalendarAlt,
	FaChartLine,
	FaChevronRight,
	FaClock,
	FaExternalLinkAlt,
	FaFlagCheckered,
	FaGlobe,
	FaMapMarkerAlt,
	FaNewspaper,
	FaProjectDiagram,
	FaStar,
	FaTrophy,
	FaWaveSquare,
} from 'react-icons/fa';
import DashboardCard from './DashboardCard';

const TEAM_ACCENTS = {
	mer: 'from-cyan-500/25 to-cyan-300/5 border-cyan-400/35',
	fer: 'from-red-500/25 to-red-300/5 border-red-400/35',
	rbr: 'from-blue-500/25 to-blue-300/5 border-blue-400/35',
	mcl: 'from-orange-500/25 to-orange-300/5 border-orange-400/35',
	haas: 'from-zinc-400/20 to-zinc-200/5 border-zinc-300/30',
	ast: 'from-emerald-500/25 to-emerald-300/5 border-emerald-400/35',
	wil: 'from-sky-500/25 to-sky-300/5 border-sky-400/35',
	rb: 'from-indigo-500/25 to-indigo-300/5 border-indigo-400/35',
	aud: 'from-slate-500/25 to-slate-300/5 border-slate-300/35',
	cad: 'from-blue-600/25 to-blue-300/5 border-blue-300/35',
	alp: 'from-pink-500/25 to-pink-300/5 border-pink-400/35',
	sau: 'from-lime-500/25 to-lime-300/5 border-lime-400/35',
};

const TEAM_COLOR_HEX = {
	'red bull': '#3671C6',
	'red bull racing': '#3671C6',
	mclaren: '#FF8000',
	ferrari: '#E8002D',
	mercedes: '#27F4D2',
	'aston martin': '#229971',
	alpine: '#FF87BC',
	williams: '#64C4FF',
	rb: '#6692FF',
	'racing bulls': '#6692FF',
	'kick sauber': '#52E252',
	sauber: '#52E252',
	'haas f1 team': '#B6BABD',
	haas: '#B6BABD',
	cadillac: '#1E3D6B',
	audi: '#9CA3AF',
};

function getTeamColorHex(teamName) {
	if (!teamName) return '#6b7280';
	const normalized = String(teamName).trim().toLowerCase();
	if (TEAM_COLOR_HEX[normalized]) return TEAM_COLOR_HEX[normalized];
	for (const [name, color] of Object.entries(TEAM_COLOR_HEX)) {
		if (normalized.includes(name)) return color;
	}
	return '#6b7280';
}

function hexToRgba(hex, alpha) {
	const clean = String(hex).replace('#', '').trim();
	const full =
		clean.length === 3 ?
			clean
				.split('')
				.map((ch) => ch + ch)
				.join('')
		:	clean;
	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);
	if ([r, g, b].some((v) => Number.isNaN(v)))
		return `rgba(107,114,128,${alpha})`;
	return `rgba(${r},${g},${b},${alpha})`;
}

function getTeamAccentClass(teamName) {
	const logo = getTeamLogoPath(teamName);
	const code = logo?.split('/').pop()?.replace('.png', '');
	return TEAM_ACCENTS[code] || 'from-white/12 to-white/4 border-white/20';
}

function getPodiumPoints(position) {
	const pointsMap = { 1: 25, 2: 18, 3: 15 };
	return pointsMap[Number(position)] || 0;
}

export function KpisWidget({ kpis }) {
	return (
		<DashboardCard
			title="Performance KPIs"
			subtitle="Live snapshot of season readiness"
			bodyScrollable={false}
			fitContent
		>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{kpis.map((kpi, idx) => (
					<div
						key={kpi.label}
						className="h-fit rounded-xl border border-white/20 bg-linear-to-br from-white/12 via-black/45 to-black/45 px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
					>
						<div className="mb-2 flex items-center justify-between gap-3">
							<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-300">
								{kpi.label}
							</p>
							<kpi.icon className="text-red-300" />
						</div>
						<p className="text-3xl font-black leading-none tracking-tight tabular-nums">
							{kpi.value}
						</p>
						<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
							<div
								className="h-full rounded-full bg-linear-to-r from-red-700 via-red-500 to-rose-300"
								style={{ width: `${Math.max(6, kpi.progress || 0)}%` }}
							/>
						</div>
						<p className="mt-2 text-[11px] text-gray-300">
							{idx === 0 && 'Season progression tracked in real-time'}
							{idx === 1 && 'Critical milestone to prepare strategy stack'}
							{idx === 2 && 'Replay and telemetry readiness indicator'}
							{idx === 3 && 'Current operating championship context'}
						</p>
					</div>
				))}
			</div>
		</DashboardCard>
	);
}

export function NextRaceWidget({
	nextRace,
	nextRaceStart,
	countdown,
	formatDate,
}) {
	const trackImage = getTrackImagePath(nextRace);
	const countryCode = getCountryCode(
		nextRace?.circuit?.country || nextRace?.country
	);

	return (
		<DashboardCard
			title="Next Race Window"
			subtitle="Countdown and circuit context"
			fitContent
			mediaSrc={trackImage}
			mediaAlt={nextRace?.race_name || 'Next race circuit'}
			mediaClassName="object-cover"
			rightSlot={
				<Link
					href="/track"
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-100 transition-colors hover:bg-red-500/35"
				>
					Open Track Lab <FaChevronRight className="text-[10px]" />
				</Link>
			}
		>
			{nextRace ?
				<>
					<div className="inline-flex items-center gap-3">
						{countryCode && (
							<span className="relative h-6 w-9 overflow-hidden rounded-sm border border-white/20 shadow-[0_0_0_2px_rgba(255,255,255,0.08)]">
								<Image
									src={`/images/flags/${countryCode}.png`}
									alt={nextRace.circuit?.country || 'Country'}
									fill
									className="object-cover"
									onError={(e) => {
										e.currentTarget.style.display = 'none';
									}}
								/>
							</span>
						)}
						<h2 className="text-3xl font-black tracking-tight md:text-4xl">
							{nextRace.race_name}
						</h2>
					</div>
					<p className="mb-4 mt-1 inline-flex items-center gap-2 text-sm font-semibold text-red-100">
						<FaClock className="text-red-300" />
						{nextRaceStart}
					</p>
					<div className="mb-5 flex flex-col gap-2 text-gray-100 md:flex-row md:items-center md:gap-5">
						<div className="inline-flex items-center gap-2">
							<FaCalendarAlt className="text-red-500" />
							<span>{formatDate(nextRace.date)}</span>
						</div>
						<div className="inline-flex items-center gap-2">
							<FaMapMarkerAlt className="text-red-500" />
							<span>
								{nextRace.circuit?.circuit_name}, {nextRace.circuit?.country}
							</span>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-3">
						{countdown ?
							[
								{ label: 'Days', value: countdown.days },
								{ label: 'Hours', value: countdown.hours },
								{ label: 'Minutes', value: countdown.minutes },
							].map((cell, i) => (
								<div
									key={cell.label}
									className="rounded-xl border border-white/20 bg-black/50 px-4 py-3 text-center backdrop-blur-md"
									style={{ animationDelay: `${i * 120}ms` }}
								>
									<p className="text-3xl font-black tabular-nums animate-[pulse_3.2s_ease-in-out_infinite]">
										{cell.value}
									</p>
									<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-300">
										{cell.label}
									</p>
								</div>
							))
						:	<div className="col-span-3 rounded-xl border border-white/20 bg-black/50 px-4 py-3 text-center text-gray-300 backdrop-blur-md">
								Start time unavailable
							</div>
						}
					</div>
				</>
			:	<p className="text-gray-300">No upcoming race found.</p>}
		</DashboardCard>
	);
}

export function ChampionshipPulseWidget({
	driverStandings,
	constructorStandings,
	favoriteDrivers,
	favoriteTeams,
	onToggleFavoriteDriver,
	onToggleFavoriteTeam,
	maxDrivers,
	maxTeams,
}) {
	const topDrivers = driverStandings.slice(0, 10);
	const topTeams = constructorStandings.slice(0, 10);
	const leaderPoints = topDrivers[0]?.points || 0;
	const selectedDrivers = topDrivers.filter((d) =>
		favoriteDrivers.includes(d.driver_code)
	);
	const selectedTeams = topTeams.filter((t) =>
		favoriteTeams.includes(t.team_name)
	);

	return (
		<DashboardCard
			title="Championship Pulse"
			subtitle="Favorites + top performers"
		>
			<div className="mb-5 space-y-3 rounded-xl border border-white/20 bg-black/35 p-3 backdrop-blur-sm">
				<div>
					<p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-300">
						Favorite Drivers ({favoriteDrivers.length}/{maxDrivers})
					</p>
					<div className="flex flex-wrap gap-2">
						{topDrivers.map((d) => {
							const active = favoriteDrivers.includes(d.driver_code);
							const disabled = !active && favoriteDrivers.length >= maxDrivers;
							return (
								<button
									key={d.driver_code}
									type="button"
									onClick={() => onToggleFavoriteDriver(d.driver_code)}
									disabled={disabled}
									className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
										active ?
											'border-red-400/60 bg-red-500/20 text-red-100'
										:	'border-white/20 bg-black/35 text-gray-200 hover:border-white/35'
									} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
								>
									{d.driver_code}
								</button>
							);
						})}
					</div>
				</div>

				<div>
					<p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-300">
						Favorite Teams ({favoriteTeams.length}/{maxTeams})
					</p>
					<div className="flex flex-wrap gap-2">
						{topTeams.map((t) => {
							const active = favoriteTeams.includes(t.team_name);
							const disabled = !active && favoriteTeams.length >= maxTeams;
							return (
								<button
									key={t.team_name}
									type="button"
									onClick={() => onToggleFavoriteTeam(t.team_name)}
									disabled={disabled}
									className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
										active ?
											'border-red-400/60 bg-red-500/20 text-red-100'
										:	'border-white/20 bg-black/35 text-gray-200 hover:border-white/35'
									} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
								>
									{t.team_name}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{(selectedDrivers.length > 0 || selectedTeams.length > 0) && (
				<div className="mb-4 space-y-2 rounded-xl border border-white/15 bg-black/35 p-3">
					<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-300">
						Favorites Snapshot
					</p>
					<div className="space-y-2">
						{selectedDrivers.map((driver) => (
							<div
								key={driver.driver_code}
								className="flex items-center justify-between rounded-lg border border-white/15 bg-black/45 px-3 py-2"
							>
								<div className="inline-flex items-center gap-2">
									<span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-gray-200">
										P{driver.position}
									</span>
									<span className="font-semibold">{driver.driver_name}</span>
								</div>
								<span className="font-bold text-red-300">{driver.points}</span>
							</div>
						))}
						{selectedTeams.map((team) => (
							<div
								key={team.team_name}
								className="flex items-center justify-between rounded-lg border border-white/15 bg-black/45 px-3 py-2"
							>
								<div className="inline-flex items-center gap-2">
									{getTeamLogoPath(team.team_name) && (
										<div className="relative h-7 w-7 overflow-hidden rounded-md border border-white/20 bg-white/10 p-1">
											<Image
												src={getTeamLogoPath(team.team_name)}
												alt={team.team_name}
												fill
												className="object-contain"
												onError={(e) => {
													e.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									)}
									<span className="font-semibold">{team.team_name}</span>
								</div>
								<span className="font-bold text-red-300">{team.points}</span>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="space-y-2">
				{driverStandings.slice(0, 3).map((d) => {
					const teamColor = getTeamColorHex(d.team_name);
					return (
						<div key={d.position}>
							<div className="flex items-center justify-between rounded-xl border border-white/20 bg-linear-to-r from-black/60 via-black/45 to-black/60 px-4 py-3">
								<div className="inline-flex items-center gap-3">
									{getDriverImagePath(d.driver_code) && (
										<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
											<Image
												src={getDriverImagePath(d.driver_code)}
												alt={d.driver_name}
												fill
												className="object-cover object-top"
												onError={(e) => {
													e.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									)}
									<div>
										<p className="text-sm font-semibold text-gray-200">
											P{d.position}
										</p>
										<p className="font-bold">{d.driver_name}</p>
										<p className="text-[11px] text-gray-300">{d.team_name}</p>
									</div>
								</div>
								<p className="text-lg font-black text-red-400 tabular-nums">
									{d.points}
								</p>
							</div>
							<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
								<div
									className="h-full rounded-full"
									style={{
										width: `${
											leaderPoints > 0 ?
												Math.max(18, (d.points / leaderPoints) * 100)
											:	0
										}%`,
										background: `linear-gradient(90deg, ${hexToRgba(teamColor, 0.9)} 0%, ${hexToRgba(teamColor, 0.55)} 100%)`,
									}}
								/>
							</div>
							<p className="mt-1 text-[11px] text-gray-300">
								Gap to leader:{' '}
								{leaderPoints - d.points > 0 ? leaderPoints - d.points : 0} pts
							</p>
						</div>
					);
				})}
			</div>

			<div className="mt-4 rounded-xl border border-white/20 bg-black/45 px-4 py-3">
				<p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">
					Constructors Leader
				</p>
				<div
					className={`rounded-lg border bg-linear-to-r px-3 py-2 ${getTeamAccentClass(constructorStandings[0]?.team_name)}`}
				>
					<div className="flex items-center justify-between gap-3">
						<div className="inline-flex items-center gap-2">
							{getTeamLogoPath(constructorStandings[0]?.team_name) && (
								<div className="relative h-8 w-8 overflow-hidden rounded-md border border-white/20 bg-white/10 p-1">
									<Image
										src={getTeamLogoPath(constructorStandings[0]?.team_name)}
										alt={constructorStandings[0]?.team_name || 'Team'}
										fill
										className="object-contain"
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
								</div>
							)}
							<p className="text-lg font-bold">
								{constructorStandings[0]?.team_name || 'TBA'}
							</p>
						</div>
						<p className="text-sm font-semibold text-gray-100">
							{constructorStandings[0]?.points || 0} pts
						</p>
					</div>
				</div>
			</div>
		</DashboardCard>
	);
}

export function TitleFightWidget({ driverStandings, favoriteDrivers = [] }) {
	const contenders = driverStandings.slice(0, 6);
	const leaderPoints = contenders[0]?.points || 0;

	return (
		<DashboardCard
			title="Title Fight Ladder"
			subtitle="Championship pressure map"
		>
			<div className="space-y-2">
				{contenders.length === 0 && (
					<p className="text-sm text-gray-300">No standings data available.</p>
				)}
				{contenders.map((driver) => {
					const ratio =
						leaderPoints > 0 ? (driver.points / leaderPoints) * 100 : 0;
					const isFavorite = favoriteDrivers.includes(driver.driver_code);
					const teamColor = getTeamColorHex(driver.team_name);
					const leaderDelta = (leaderPoints || 0) - (driver.points || 0);
					const signedDelta =
						leaderDelta > 0 ? `+${leaderDelta}`
						: leaderDelta < 0 ? `-${Math.abs(leaderDelta)}`
						: '+0';
					return (
						<div
							key={driver.driver_code}
							className={`rounded-xl border bg-black/45 px-3 py-3 ${
								isFavorite ?
									'border-red-300/70 shadow-[0_0_0_1px_rgba(251,113,133,0.45)]'
								:	'border-white/20'
							}`}
						>
							<div className="mb-2 flex items-center justify-between gap-2">
								<div className="inline-flex items-center gap-2">
									<span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-gray-200">
										P{driver.position}
									</span>
									{getDriverImagePath(driver.driver_code) && (
										<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/10">
											<Image
												src={getDriverImagePath(driver.driver_code)}
												alt={driver.driver_name}
												fill
												className="object-cover object-top"
												onError={(e) => {
													e.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									)}
									<p
										className="rounded-md border px-2 py-1 text-sm font-bold text-white"
										style={{
											backgroundColor: hexToRgba(teamColor, 0.28),
											borderColor: hexToRgba(teamColor, 0.62),
										}}
									>
										{driver.driver_name}
									</p>
									{isFavorite && (
										<span className="rounded-full border border-red-300/75 bg-red-500/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-red-100 shadow-[0_0_12px_rgba(248,113,113,0.5)]">
											Fav
										</span>
									)}
								</div>
								<p className="text-sm font-black tabular-nums text-red-300">
									{driver.points}
								</p>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-white/12">
								<div
									className="h-full rounded-full"
									style={{
										width: `${Math.max(12, ratio)}%`,
										background: `linear-gradient(90deg, ${hexToRgba(teamColor, 0.9)} 0%, ${hexToRgba(teamColor, 0.55)} 100%)`,
									}}
								/>
							</div>
							<p className="mt-1 text-[11px] text-gray-300">
								Delta {signedDelta} pts
							</p>
						</div>
					);
				})}
			</div>
		</DashboardCard>
	);
}

export function ConstructorBattleWidget({
	constructorStandings,
	favoriteTeams = [],
}) {
	const teams = constructorStandings.slice(0, 8);
	const leaderPoints = teams[0]?.points || 0;

	return (
		<DashboardCard
			title="Constructor Power Index"
			subtitle="Team momentum and championship depth"
		>
			<div className="space-y-2">
				{teams.length === 0 && (
					<p className="text-sm text-gray-300">
						No constructor standings available.
					</p>
				)}
				{teams.map((team) => {
					const ratio =
						leaderPoints > 0 ? (team.points / leaderPoints) * 100 : 0;
					const isFavorite = favoriteTeams.includes(team.team_name);
					const teamColor = getTeamColorHex(team.team_name);
					return (
						<div
							key={team.team_name}
							className={`rounded-xl border bg-linear-to-r px-3 py-2.5 ${getTeamAccentClass(team.team_name)} ${
								isFavorite ?
									'border-red-300/75 shadow-[0_0_0_1px_rgba(251,113,133,0.5)]'
								:	''
							}`}
						>
							<div className="mb-1.5 flex items-center justify-between gap-2">
								<div className="inline-flex items-center gap-2">
									{getTeamLogoPath(team.team_name) && (
										<div className="relative h-6 w-6 overflow-hidden rounded-sm border border-white/25 bg-white/10 p-0.5">
											<Image
												src={getTeamLogoPath(team.team_name)}
												alt={team.team_name}
												fill
												className="object-contain"
												onError={(e) => {
													e.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									)}
									<p className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.22)]">
										{team.team_name}
									</p>
									{isFavorite && (
										<span className="rounded-full border border-red-300/75 bg-red-500/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-red-100 shadow-[0_0_12px_rgba(248,113,113,0.5)]">
											Fav
										</span>
									)}
								</div>
								<p className="text-sm font-black tabular-nums text-white">
									{team.points}
								</p>
							</div>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-black/35">
								<div
									className="h-full rounded-full"
									style={{
										width: `${Math.max(15, ratio)}%`,
										background: `linear-gradient(90deg, ${hexToRgba(teamColor, 0.92)} 0%, ${hexToRgba(teamColor, 0.6)} 100%)`,
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</DashboardCard>
	);
}

export function UpcomingSessionsWidget({
	upcomingRaces,
	currentYear,
	formatDate,
}) {
	return (
		<DashboardCard
			title="Upcoming Sessions"
			subtitle="Next race weekends at a glance"
		>
			<div className="max-h-[430px] space-y-2.5 overflow-y-auto pr-1">
				{upcomingRaces.length === 0 && (
					<p className="text-sm text-gray-300">
						No upcoming sessions available.
					</p>
				)}
				{upcomingRaces.map((race) => (
					<div
						key={`${race.year || currentYear}-${race.round}`}
						className="group relative overflow-hidden rounded-xl border border-white/20 bg-black/45 px-4 py-3"
					>
						{getTrackImagePath(race) && (
							<div className="pointer-events-none absolute inset-0">
								<Image
									src={getTrackImagePath(race)}
									alt={`${race.event || race.race_name} track`}
									fill
									className="object-cover opacity-0 brightness-110 transition-all duration-300 group-hover:opacity-20"
									onError={(e) => {
										e.currentTarget.style.display = 'none';
									}}
								/>
							</div>
						)}
						<div className="relative z-10 flex w-full items-center justify-between gap-3">
							<div className="inline-flex min-w-0 items-center gap-3">
								{getCountryCode(race.country || race.circuit?.country) && (
									<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
										<Image
											src={`/images/flags/${getCountryCode(race.country || race.circuit?.country)}.png`}
											alt={race.country || race.circuit?.country || 'Flag'}
											fill
											className="object-cover"
											onError={(e) => {
												e.currentTarget.style.display = 'none';
											}}
										/>
									</div>
								)}
								<div className="min-w-0">
									<p className="font-semibold text-white">
										R{race.round} {race.event || race.race_name}
									</p>
									<p className="text-xs text-gray-200/90">
										{formatDate(race.date)} •{' '}
										{race.country || race.circuit?.country}
									</p>
								</div>
							</div>
							<div className="inline-flex items-center gap-2">
								{getTrackImagePath(race) && (
									<div className="relative h-11 w-20 overflow-hidden rounded-md border border-white/20 bg-black/35">
										<Image
											src={getTrackImagePath(race)}
											alt={`${race.event || race.race_name} track`}
											fill
											className="object-cover opacity-90 transition-all duration-300 group-hover:scale-105 group-hover:brightness-125"
											onError={(e) => {
												e.currentTarget.style.display = 'none';
											}}
										/>
									</div>
								)}
								<Link
									href="/schedule"
									target="_blank"
									rel="noreferrer"
									className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-gray-200 transition-colors hover:border-red-300/45 hover:text-red-200"
								>
									<FaChevronRight className="text-[10px]" />
								</Link>
							</div>
						</div>
					</div>
				))}
			</div>
		</DashboardCard>
	);
}

export function QuickActionsWidget() {
	return (
		<DashboardCard
			title="Quick Actions"
			subtitle="Jump directly into workspaces"
		>
			<div className="space-y-2.5">
				<Link
					href="/track"
					className="group flex items-center justify-between rounded-xl border border-white/20 bg-black/45 px-4 py-3 transition-all hover:border-red-500/40 hover:bg-black/60"
				>
					<div className="inline-flex items-center gap-2">
						<FaWaveSquare className="text-red-500" />
						<span>Track Replay Workspace</span>
					</div>
					<span className="text-gray-500 group-hover:text-red-400">Open</span>
				</Link>
				<Link
					href="/predict"
					className="group flex items-center justify-between rounded-xl border border-white/20 bg-black/45 px-4 py-3 transition-all hover:border-red-500/40 hover:bg-black/60"
				>
					<div className="inline-flex items-center gap-2">
						<FaChartLine className="text-red-500" />
						<span>ML Prediction Desk</span>
					</div>
					<span className="text-gray-500 group-hover:text-red-400">Open</span>
				</Link>
				<Link
					href="/standings"
					className="group flex items-center justify-between rounded-xl border border-white/20 bg-black/45 px-4 py-3 transition-all hover:border-red-500/40 hover:bg-black/60"
				>
					<div className="inline-flex items-center gap-2">
						<FaTrophy className="text-red-500" />
						<span>Standings Monitor</span>
					</div>
					<span className="text-gray-500 group-hover:text-red-400">Open</span>
				</Link>
				<Link
					href="/strategy"
					className="group flex items-center justify-between rounded-xl border border-white/20 bg-black/45 px-4 py-3 transition-all hover:border-red-500/40 hover:bg-black/60"
				>
					<div className="inline-flex items-center gap-2">
						<FaBolt className="text-red-500" />
						<span>Strategy Simulator</span>
					</div>
					<span className="text-gray-500 group-hover:text-red-400">Open</span>
				</Link>
			</div>
		</DashboardCard>
	);
}

export function LastRaceWidget({ lastRace, formatDate }) {
	if (!lastRace) {
		return (
			<DashboardCard
				title="Last Result Snapshot"
				subtitle="Most recent podium"
			>
				<p className="text-gray-400">No recent race result found.</p>
			</DashboardCard>
		);
	}

	const podiumSource =
		Array.isArray(lastRace.podium) && lastRace.podium.length > 0 ?
			lastRace.podium
		: Array.isArray(lastRace.results) ? lastRace.results
		: [];
	const podium = podiumSource.slice(0, 3);

	return (
		<DashboardCard
			title="Last Result Snapshot"
			subtitle={`${lastRace.race_name} • ${formatDate(lastRace.date)}`}
			fitContent
			rightSlot={
				<div className="hidden items-center gap-2 rounded-full border border-red-400/35 bg-red-500/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-red-100 md:inline-flex">
					<FaTrophy className="text-red-400" /> Podium Finishers
				</div>
			}
		>
			<div className="md:hidden space-y-3">
				{podium.map((driver) => {
					const teamColor = getTeamColorHex(driver.team_name);
					return (
						<div
							key={driver.position}
							className="rounded-xl border border-white/20 px-4 py-3 backdrop-blur-sm"
							style={{
								background: `linear-gradient(135deg, ${hexToRgba(teamColor, 0.28)} 0%, rgba(10,10,10,0.75) 70%)`,
							}}
						>
							<div className="flex items-center gap-3">
								<span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
									P{driver.position}
								</span>
								{getDriverImagePath(driver.driver_code) && (
									<div
										className="relative h-14 w-14 overflow-hidden rounded-full border border-white/20"
										style={{ backgroundColor: hexToRgba(teamColor, 0.35) }}
									>
										<Image
											src={getDriverImagePath(driver.driver_code)}
											alt={driver.driver_name}
											fill
											className="object-cover object-top"
										/>
									</div>
								)}
								<div>
									<p className="text-sm font-bold">{driver.driver_name}</p>
									<div className="mt-1 inline-flex items-center gap-2">
										{getTeamLogoPath(driver.team_name) && (
											<div className="relative h-5 w-5 overflow-hidden rounded-sm bg-white/10 p-0.5">
												<Image
													src={getTeamLogoPath(driver.team_name)}
													alt={driver.team_name}
													fill
													className="object-contain"
												/>
											</div>
										)}
										<p className="text-[11px] uppercase tracking-[0.12em] text-gray-200">
											{driver.team_name}
										</p>
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="hidden items-end justify-center gap-6 md:flex">
				{[
					podium.find((d) => Number(d.position) === 2),
					podium.find((d) => Number(d.position) === 1),
					podium.find((d) => Number(d.position) === 3),
				]
					.filter(Boolean)
					.map((driver) => {
						const position = Number(driver.position);
						const teamColor = getTeamColorHex(driver.team_name);
						const heightClass =
							position === 1 ? 'h-72'
							: position === 2 ? 'h-62'
							: 'h-56';
						const marginTopClass =
							position === 1 ? 'mt-0'
							: position === 2 ? 'mt-8'
							: 'mt-12';

						return (
							<div
								key={driver.position}
								className={`w-[33%] min-w-64 ${marginTopClass}`}
							>
								<div
									className={`relative overflow-hidden rounded-2xl border border-white/20 px-4 py-4 ${heightClass}`}
									style={{
										background: `linear-gradient(180deg, ${hexToRgba(teamColor, 0.32)} 0%, rgba(8,8,8,0.84) 70%)`,
									}}
								>
									<div className="mb-2 flex items-center justify-between">
										<span
											className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
												position === 1 ?
													'border-red-300/45 bg-red-500/18 text-red-100'
												: position === 2 ?
													'border-zinc-300/40 bg-zinc-300/15 text-zinc-100'
												:	'border-red-500/40 bg-red-600/15 text-red-200'
											}`}
										>
											P{position}
										</span>
										<span className="rounded-full border border-white/25 bg-black/35 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-gray-100">
											+{getPodiumPoints(position)} pts
										</span>
									</div>

									<div className="flex h-full flex-col items-center justify-center text-center">
										{getDriverImagePath(driver.driver_code) && (
											<div
												className={`relative mb-3 overflow-hidden rounded-full border border-white/25 ${
													position === 1 ? 'h-32 w-32' : 'h-28 w-28'
												}`}
												style={{ backgroundColor: hexToRgba(teamColor, 0.4) }}
											>
												<Image
													src={getDriverImagePath(driver.driver_code)}
													alt={driver.driver_name}
													fill
													className="object-cover object-top"
												/>
											</div>
										)}
										<p className="text-base font-black text-white">
											{driver.driver_name}
										</p>
										<div className="mt-1 inline-flex items-center gap-2">
											{getTeamLogoPath(driver.team_name) && (
												<div className="relative h-5 w-5 overflow-hidden rounded-sm bg-white/10 p-0.5">
													<Image
														src={getTeamLogoPath(driver.team_name)}
														alt={driver.team_name}
														fill
														className="object-contain"
													/>
												</div>
											)}
											<p className="text-[11px] uppercase tracking-[0.12em] text-gray-100/90">
												{driver.team_name}
											</p>
										</div>
									</div>
								</div>
							</div>
						);
					})}
			</div>
			<Link
				href="/schedule"
				target="_blank"
				rel="noreferrer"
				className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-100 transition-colors hover:text-white"
			>
				Dive Into Weekend Timeline <FaChevronRight className="text-[11px]" />
			</Link>
		</DashboardCard>
	);
}

export function WeekendStatusWidget({ weekendBrief }) {
	const event = weekendBrief?.event;
	const sessions =
		Array.isArray(weekendBrief?.sessions) ? weekendBrief.sessions : [];
	const nextSession = sessions.find((session) => session.status === 'upcoming');
	const lastSession = weekendBrief?.last_completed_session;

	return (
		<DashboardCard
			title="Weekend Intel"
			subtitle="Current week race control"
			rightSlot={
				<span
					className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${
						weekendBrief?.is_race_week ?
							'border-emerald-300/50 bg-emerald-400/20 text-emerald-100'
						:	'border-white/20 bg-white/8 text-gray-200'
					}`}
				>
					<FaBroadcastTower className="text-[10px]" />
					{weekendBrief?.is_race_week ? 'Race Week Live' : 'No Race This Week'}
				</span>
			}
		>
			{event ?
				<div className="space-y-3">
					<div className="rounded-xl border border-white/15 bg-black/40 p-4">
						<p className="text-[11px] uppercase tracking-[0.16em] text-gray-300">
							Round {event.round}
						</p>
						<p className="mt-1 text-xl font-black text-white">{event.event}</p>
						<p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-200">
							<FaGlobe className="text-cyan-300" />
							{event.location}, {event.country}
						</p>
					</div>

					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						<div className="rounded-xl border border-white/15 bg-black/40 p-3">
							<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
								Last Completed Session
							</p>
							<p className="mt-1 text-sm font-semibold text-white">
								{lastSession?.name || 'None yet'}
							</p>
							{lastSession?.start_utc && (
								<p className="mt-1 text-xs text-gray-300">
									{new Date(lastSession.start_utc).toLocaleString()}
								</p>
							)}
						</div>
						<div className="rounded-xl border border-white/15 bg-black/40 p-3">
							<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
								Next Session
							</p>
							<p className="mt-1 text-sm font-semibold text-white">
								{nextSession?.name || 'Waiting for update'}
							</p>
							{nextSession?.start_utc && (
								<p className="mt-1 text-xs text-gray-300">
									{new Date(nextSession.start_utc).toLocaleString()}
								</p>
							)}
						</div>
					</div>
				</div>
			:	<p className="text-sm text-gray-300">
					No race weekend detected for this week.
				</p>
			}
		</DashboardCard>
	);
}

export function SessionResultsWidget({ weekendBrief }) {
	const sessionResults = weekendBrief?.session_results;
	const rows = Array.isArray(sessionResults?.rows) ? sessionResults.rows : [];
	const isQualifying = sessionResults?.session_type === 'qualifying';
	const title = sessionResults?.session_name || 'Session Results';

	return (
		<DashboardCard
			title="Last Session Results"
			subtitle={title}
			bodyClassName="space-y-3"
		>
			{rows.length === 0 ?
				<p className="text-sm text-gray-300">
					Session data is not available yet.
				</p>
			: isQualifying ?
				<div className="overflow-x-auto rounded-xl border border-white/15 bg-black/40">
					<table className="min-w-full text-sm">
						<thead className="text-[10px] uppercase tracking-[0.14em] text-gray-300">
							<tr>
								<th className="px-3 py-2 text-left">Pos</th>
								<th className="px-3 py-2 text-left">Driver</th>
								<th className="px-3 py-2 text-left">Q1</th>
								<th className="px-3 py-2 text-left">Q2</th>
								<th className="px-3 py-2 text-left">Q3</th>
								<th className="px-3 py-2 text-left">Gap</th>
							</tr>
						</thead>
						<tbody>
							{rows.slice(0, 20).map((row) => (
								<tr
									key={`${row.position}-${row.driver_code}`}
									className="border-t border-white/10 text-gray-100"
								>
									<td className="px-3 py-2 font-semibold">P{row.position}</td>
									<td className="px-3 py-2">
										<div className="inline-flex items-center gap-2">
											<span
												className="h-2 w-2 rounded-full"
												style={{ backgroundColor: row.team_color || '#6b7280' }}
											/>
											<span>{row.driver_name}</span>
										</div>
									</td>
									<td className="px-3 py-2 tabular-nums">{row.q1 || '—'}</td>
									<td className="px-3 py-2 tabular-nums">{row.q2 || '—'}</td>
									<td className="px-3 py-2 tabular-nums">{row.q3 || '—'}</td>
									<td className="px-3 py-2 tabular-nums text-gray-300">
										{row.gap_to_pole || '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			:	<div className="overflow-x-auto rounded-xl border border-white/15 bg-black/40">
					<table className="min-w-full text-sm">
						<thead className="text-[10px] uppercase tracking-[0.14em] text-gray-300">
							<tr>
								<th className="px-3 py-2 text-left">Pos</th>
								<th className="px-3 py-2 text-left">Driver</th>
								<th className="px-3 py-2 text-left">Best Lap</th>
								<th className="px-3 py-2 text-left">Gap</th>
								<th className="px-3 py-2 text-left">Laps</th>
							</tr>
						</thead>
						<tbody>
							{rows.slice(0, 20).map((row) => (
								<tr
									key={`${row.position}-${row.driver_code}`}
									className="border-t border-white/10 text-gray-100"
								>
									<td className="px-3 py-2 font-semibold">P{row.position}</td>
									<td className="px-3 py-2">
										<div className="inline-flex items-center gap-2">
											<span
												className="h-2 w-2 rounded-full"
												style={{ backgroundColor: row.team_color || '#6b7280' }}
											/>
											<span>{row.driver_name}</span>
										</div>
									</td>
									<td className="px-3 py-2 tabular-nums">
										{row.best_lap || '—'}
									</td>
									<td className="px-3 py-2 tabular-nums text-gray-300">
										{row.gap_to_best || '—'}
									</td>
									<td className="px-3 py-2 tabular-nums text-gray-300">
										{row.lap_count || 0}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			}
		</DashboardCard>
	);
}

export function StartingGridWidget({ weekendBrief }) {
	const gridRows =
		Array.isArray(weekendBrief?.starting_grid) ?
			weekendBrief.starting_grid
		:	[];

	return (
		<DashboardCard
			title="Starting Grid"
			subtitle="Projected launch order"
			rightSlot={<FaFlagCheckered className="text-red-300" />}
		>
			{gridRows.length === 0 ?
				<p className="text-sm text-gray-300">
					Starting grid will appear after qualifying data is available.
				</p>
			:	<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{gridRows.slice(0, 20).map((row) => {
						const isOdd = Number(row.grid_position) % 2 === 1;
						return (
							<div
								key={`${row.grid_position}-${row.driver_code}`}
								className="rounded-xl border border-white/15 p-3"
								style={{
									background: `linear-gradient(135deg, ${row.team_color || '#6b7280'}40 0%, rgba(6,6,6,0.86) 70%)`,
								}}
							>
								<div className="flex items-center justify-between gap-2">
									<div className="inline-flex items-center gap-2">
										<span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
											P{row.grid_position}
										</span>
										<p className="text-sm font-semibold text-white">
											{row.driver_name}
										</p>
									</div>
									<span className="text-[10px] uppercase tracking-[0.12em] text-gray-200">
										{isOdd ? 'Left' : 'Right'} Side
									</span>
								</div>

								<div className="mt-3 flex items-center gap-3">
									{getDriverImagePath(row.driver_code) && (
										<div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/20 bg-black/30">
											<Image
												src={getDriverImagePath(row.driver_code)}
												alt={row.driver_name}
												fill
												className="object-cover object-top"
												onError={(e) => {
													e.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									)}
									<div className="min-w-0">
										<p className="truncate text-sm font-bold text-white">
											{row.team_name}
										</p>
										{getTeamLogoPath(row.team_name) && (
											<div className="relative mt-1 h-6 w-10 overflow-hidden rounded-sm border border-white/15 bg-white/10 p-1">
												<Image
													src={getTeamLogoPath(row.team_name)}
													alt={row.team_name}
													fill
													className="object-contain"
													onError={(e) => {
														e.currentTarget.style.display = 'none';
													}}
												/>
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			}
		</DashboardCard>
	);
}

export function F1NewsWidget({ newsItems }) {
	const items = Array.isArray(newsItems) ? newsItems : [];

	return (
		<DashboardCard
			title="F1 News Wire"
			subtitle="Latest paddock headlines"
			rightSlot={<FaNewspaper className="text-cyan-200" />}
		>
			{items.length === 0 ?
				<p className="text-sm text-gray-300">No fresh headlines right now.</p>
			:	<div className="space-y-2.5">
					{items.slice(0, 8).map((item, index) => (
						<a
							key={`${item.link}-${index}`}
							href={item.link}
							target="_blank"
							rel="noreferrer"
							className="group block rounded-xl border border-white/15 bg-black/40 p-3 transition-colors hover:border-cyan-300/35 hover:bg-black/50"
						>
							<p className="line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-cyan-100">
								{item.title}
							</p>
							<p className="mt-1 text-xs text-gray-300 line-clamp-2">
								{item.summary || 'Open for full story'}
							</p>
							<div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-gray-400">
								<span>{item.source || 'News'}</span>
								{item.published_utc && (
									<span>
										{new Date(item.published_utc).toLocaleDateString()}
									</span>
								)}
								<FaExternalLinkAlt className="text-[10px]" />
							</div>
						</a>
					))}
				</div>
			}
		</DashboardCard>
	);
}

export function GeneratedRacesWidget({
	races = [],
	currentYear,
	onToggleSave,
}) {
	const generatedRaces = Array.isArray(races) ? races : [];
	const orderedRaces = generatedRaces.slice().sort((a, b) => {
		const favDelta =
			Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite));
		if (favDelta !== 0) return favDelta;
		return Number(b.round || 0) - Number(a.round || 0);
	});
	const savedCount = orderedRaces.filter((race) => race.is_favorite).length;
	const [expandedRaceKey, setExpandedRaceKey] = useState(null);
	const [podiumByRace, setPodiumByRace] = useState({});
	const [podiumLoadingKey, setPodiumLoadingKey] = useState(null);
	const [podiumErrorByRace, setPodiumErrorByRace] = useState({});

	const getRaceKey = (race) => `${race.year ?? currentYear}_${race.round}`;

	const handleSaveClick = (event, race) => {
		event.preventDefault();
		event.stopPropagation();
		onToggleSave?.(race);
	};

	const handlePodiumToggle = async (event, race) => {
		event.preventDefault();
		event.stopPropagation();

		const raceKey = getRaceKey(race);
		if (expandedRaceKey === raceKey) {
			setExpandedRaceKey(null);
			return;
		}

		setExpandedRaceKey(raceKey);
		if (Array.isArray(podiumByRace[raceKey])) return;

		setPodiumLoadingKey(raceKey);
		try {
			const snapshot = await getTelemetrySessionSnapshot({
				year: Number(race.year || currentYear),
				round: Number(race.round),
				session: 'race',
			});

			const sourceRows =
				Array.isArray(snapshot?.podium) ? snapshot.podium
				: Array.isArray(snapshot?.rows) ? snapshot.rows
				: [];

			const rows = sourceRows
				.slice()
				.filter(Boolean)
				.sort((a, b) => Number(a?.position || 99) - Number(b?.position || 99))
				.filter(
					(row) => Number(row?.position) >= 1 && Number(row?.position) <= 3
				)
				.slice(0, 3);

			setPodiumByRace((prev) => ({ ...prev, [raceKey]: rows }));
			setPodiumErrorByRace((prev) => ({ ...prev, [raceKey]: '' }));
		} catch {
			setPodiumByRace((prev) => ({ ...prev, [raceKey]: [] }));
			setPodiumErrorByRace((prev) => ({
				...prev,
				[raceKey]: 'Unable to load podium.',
			}));
		} finally {
			setPodiumLoadingKey((prev) => (prev === raceKey ? null : prev));
		}
	};

	return (
		<DashboardCard
			title="Generated Races"
			rightSlot={
				<span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/35 bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200">
					<FaStar className="text-[8px]" />
					{savedCount} Saved
				</span>
			}
		>
			{orderedRaces.length === 0 ?
				<div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
					<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
						<FaProjectDiagram className="text-2xl text-gray-600" />
					</div>
					<p className="font-semibold text-gray-300">No generated races yet</p>
				</div>
			:	<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{orderedRaces.map((race, idx) => {
						const raceKey = getRaceKey(race);
						const flagCode = getCountryCode(
							race.country || race.circuit?.country
						);
						const hasData = race.has_data;
						const trackHref = `/track?year=${race.year ?? currentYear}&round=${race.round}`;
						const isFavorite = Boolean(race.is_favorite);
						const isExpanded = expandedRaceKey === raceKey;
						const isPodiumLoading = podiumLoadingKey === raceKey;
						const podiumRows =
							Array.isArray(podiumByRace[raceKey]) ? podiumByRace[raceKey] : [];
						const podiumError = podiumErrorByRace[raceKey];

						return (
							<div
								key={`${race.year}_${race.round}`}
								style={{ animationDelay: `${idx * 40}ms` }}
								className="space-y-2"
							>
								<Link
									href={trackHref}
									className="animate-fade-in text-left rounded-xl border transition-all duration-300 group relative overflow-hidden h-[130px] bg-black/90 backdrop-blur-3xl backdrop-brightness-90 bg-linear-to-r from-white/4 to-white/2 border-white/10 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5 cursor-pointer block"
								>
									{(flagCode || race.country === 'United Kingdom') && (
										<div className="absolute inset-y-0 right-0 w-[60%] pointer-events-none overflow-hidden rounded-r-xl">
											<Image
												src={`/images/flags/${flagCode || 'gbr'}.png`}
												alt={race.country || race.circuit?.country || 'Flag'}
												fill
												sizes="300px"
												className="object-cover object-center opacity-[0.12] group-hover:opacity-[0.45] transition-all duration-500 scale-105 group-hover:scale-110 brightness-75 group-hover:brightness-110"
												onError={(event) => {
													event.currentTarget.style.display = 'none';
												}}
											/>
											<div className="absolute inset-0 bg-linear-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
										</div>
									)}

									<div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300 bg-green-500/50 group-hover:bg-green-400" />

									<div className="relative z-10 p-4 pl-5 h-full flex flex-col justify-between">
										<div>
											<div className="flex items-center justify-between mb-2">
												<span className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
													<FaStar
														className={
															isFavorite ?
																'text-yellow-300 text-[8px]'
															:	'text-red-400/80 text-[8px]'
														}
													/>
													<span>R{String(race.round).padStart(2, '0')}</span>
												</span>
												<span className="text-[9px] font-bold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
													Generated
												</span>
											</div>
											<h3 className="font-bold text-[13px] leading-tight text-white/90 group-hover:text-white transition-colors line-clamp-2">
												{race.event}
											</h3>
										</div>

										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3 text-[10px] text-gray-500">
												<span className="flex items-center gap-1">
													<FaMapMarkerAlt className="text-[8px] text-gray-600" />
													{race.country || race.circuit?.country}
												</span>
												{race.date && (
													<>
														<span className="text-gray-700">•</span>
														<span>{race.date}</span>
													</>
												)}
											</div>
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													onClick={(event) => handleSaveClick(event, race)}
													className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] transition-all ${
														isFavorite ?
															'border-yellow-500/30 bg-yellow-500/12 text-yellow-300'
														:	'border-white/10 bg-black/35 text-gray-400 hover:text-white'
													}`}
												>
													<FaStar className="text-[8px]" />
													{isFavorite ? 'Unsave' : 'Save'}
												</button>
												<button
													type="button"
													onClick={(event) => handlePodiumToggle(event, race)}
													className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] transition-all ${
														isExpanded ?
															'border-red-400/35 bg-red-500/15 text-red-200'
														:	'border-white/10 bg-black/35 text-gray-300 hover:text-white'
													}`}
												>
													<FaTrophy className="text-[8px]" />
													Podium Sneak
												</button>
											</div>
										</div>
									</div>
								</Link>

								{isExpanded && (
									<div className="rounded-xl border border-white/12 bg-black/55 p-3">
										{isPodiumLoading ?
											<p className="text-xs text-gray-300">Loading podium...</p>
										: podiumError ?
											<p className="text-xs text-red-200">{podiumError}</p>
										: podiumRows.length === 0 ?
											<p className="text-xs text-gray-300">
												No podium data for this race.
											</p>
										:	<div className="space-y-2">
												{podiumRows.map((row) => (
													<div
														key={`${raceKey}-${row.position}-${row.driver_code || row.driver_name}`}
														className="flex items-center justify-between rounded-lg border border-white/10 bg-black/45 px-2.5 py-2"
													>
														<div className="inline-flex items-center gap-2 min-w-0">
															<span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-gray-200">
																P{row.position}
															</span>
															{getDriverImagePath(row.driver_code) && (
																<div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/20 bg-black/40">
																	<Image
																		src={getDriverImagePath(row.driver_code)}
																		alt={row.driver_name}
																		fill
																		className="object-cover object-top"
																		onError={(event) => {
																			event.currentTarget.style.display =
																				'none';
																		}}
																	/>
																</div>
															)}
															<div className="min-w-0">
																<p className="truncate text-xs font-semibold text-white">
																	{row.driver_name}
																</p>
																<p className="truncate text-[10px] text-gray-400">
																	{row.team_name}
																</p>
															</div>
														</div>
														{getTeamLogoPath(row.team_name) && (
															<div className="relative h-6 w-6 overflow-hidden rounded-sm border border-white/20 bg-black/40 p-0.5">
																<Image
																	src={getTeamLogoPath(row.team_name)}
																	alt={row.team_name}
																	fill
																	className="object-contain"
																	onError={(event) => {
																		event.currentTarget.style.display = 'none';
																	}}
																/>
															</div>
														)}
													</div>
												))}
											</div>
										}
									</div>
								)}
							</div>
						);
					})}
				</div>
			}
		</DashboardCard>
	);
}
