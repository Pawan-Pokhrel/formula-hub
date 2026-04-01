import Image from 'next/image';
import Link from 'next/link';
import { FaCalendarAlt, FaMapMarkerAlt, FaTrophy } from 'react-icons/fa';

import {
	getCountryCode,
	getDriverImagePath,
	getTeamLogoPath,
	getTrackImagePath,
	parseRaceDateTime,
} from './scheduleHelpers';

const TEAM_ACCENT_MAP = {
	'RED BULL': '#3671C6',
	'RED BULL RACING': '#3671C6',
	FERRARI: '#E8002D',
	MERCEDES: '#27F4D2',
	MCLAREN: '#FF8000',
	'ASTON MARTIN': '#229971',
	ALPINE: '#FF87BC',
	WILLIAMS: '#64C4FF',
	'RACING BULLS': '#6692FF',
	'KICK SAUBER': '#52E252',
	SAUBER: '#52E252',
	HAAS: '#B6BABD',
	'HAAS F1 TEAM': '#B6BABD',
};

function getTeamAccentColor(driver) {
	if (!driver) return '#EF4444';
	const explicit = String(driver.team_color || '').trim();
	if (/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(explicit)) return explicit;

	const teamName = String(driver.team_name || '')
		.trim()
		.toUpperCase();
	if (TEAM_ACCENT_MAP[teamName]) return TEAM_ACCENT_MAP[teamName];

	for (const [alias, color] of Object.entries(TEAM_ACCENT_MAP)) {
		if (teamName.includes(alias)) return color;
	}

	return '#EF4444';
}

function formatDate(dateString) {
	if (!dateString) return 'TBA';
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});
}

function formatTime(timeString) {
	if (!timeString) return 'UTC';
	return timeString.replace('Z', ' UTC').replace(/\.\d+/, '');
}

function formatStartTime(dateValue, timeValue) {
	const dt = parseRaceDateTime(dateValue, timeValue);
	if (!dt) return null;
	return dt.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short',
	});
}

export default function ScheduleHeroCards({ nextRace, lastRace }) {
	const nextCountryCode = getCountryCode(
		nextRace?.country || nextRace?.circuit?.country
	);
	const nextTrackImage = nextRace ? getTrackImagePath(nextRace) : null;
	const nextStartText = formatStartTime(nextRace?.date, nextRace?.time);
	const podiumEntries = (lastRace?.podium || []).slice(0, 3);
	const podiumByPosition = podiumEntries.reduce((acc, driver) => {
		const position = Number(driver?.position);
		if (position >= 1 && position <= 3) acc[position] = driver;
		return acc;
	}, {});
	const podiumOrder = [2, 1, 3];

	return (
		<div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4 mb-6">
			<div className="bg-black/60 backdrop-blur-2xl border border-white/20 rounded-2xl p-6">
				<p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] mb-3">
					Last Race
				</p>
				{lastRace ?
					<>
						<h3 className="text-xl md:text-2xl font-black tracking-wide mb-1">
							{lastRace.race_name}
						</h3>
						<p className="text-xs md:text-sm text-gray-400 mb-4">
							{formatDate(lastRace.date)}
						</p>
						<div className="grid grid-cols-3 gap-2 items-end">
							{podiumOrder.map((position) => {
								const driver = podiumByPosition[position];
								if (!driver) {
									return (
										<div
											key={`empty-${position}`}
											className="h-36 rounded-xl border border-white/10 bg-white/5"
										/>
									);
								}

								const accent = getTeamAccentColor(driver);
								const teamLogo = getTeamLogoPath(driver.team_name);
								const driverImage = getDriverImagePath(driver.driver_code);
								const cardHeight = position === 1 ? 'h-44' : 'h-36';
								const podiumHeight =
									position === 1 ? 'h-14'
									: position === 2 ? 'h-10'
									: 'h-8';

								return (
									<div
										key={position}
										className="flex flex-col items-center gap-1"
									>
										<div
											className={`relative w-full ${cardHeight} rounded-xl bg-linear-to-b from-white/14 via-white/6 to-black/35 border border-white/15 overflow-hidden`}
											style={{
												boxShadow: `inset 0 0 0 1px ${accent}33`,
												borderTop: `2px solid ${accent}`,
											}}
										>
											<span
												className="absolute top-2 right-2 z-10 inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full text-[10px] font-black"
												style={{
													backgroundColor: `${accent}22`,
													color: accent,
													border: `1px solid ${accent}55`,
												}}
											>
												P{position}
											</span>

											{teamLogo && (
												<div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-md bg-black/35 backdrop-blur-md p-1.5">
													<Image
														src={teamLogo}
														alt={driver.team_name}
														fill
														className="object-contain p-1"
														onError={(e) => {
															e.currentTarget.style.display = 'none';
														}}
													/>
												</div>
											)}

											{driverImage && (
												<div className="absolute top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-lg overflow-hidden bg-white/5">
													<Image
														src={driverImage}
														alt={driver.driver_name}
														fill
														className="object-cover object-top"
														onError={(e) => {
															e.currentTarget.style.display = 'none';
														}}
													/>
												</div>
											)}

											<div className="absolute bottom-2 left-1.5 right-1.5 text-center">
												<p className="text-[11px] font-semibold text-white truncate">
													{driver.driver_name}
												</p>
												<p
													className="text-[9px] uppercase tracking-[0.14em] truncate"
													style={{ color: accent }}
												>
													{driver.team_name}
												</p>
											</div>
										</div>

										<div
											className={`w-[88%] ${podiumHeight} rounded-t-lg border border-white/15 border-b-0 flex items-center justify-center text-[9px] font-black uppercase tracking-[0.12em] text-white/90`}
											style={{
												background: `linear-gradient(180deg, ${accent}44 0%, rgba(0,0,0,0.55) 100%)`,
											}}
										>
											{position === 1 ? 'Winner' : `P${position}`}
										</div>
									</div>
								);
							})}
						</div>
					</>
				:	<div className="text-gray-400 inline-flex items-center gap-2">
						<FaTrophy className="text-red-500" />
						No completed races yet.
					</div>
				}
			</div>

			<div className="group bg-linear-to-br from-red-800/35 via-black/60 to-black/55 backdrop-blur-2xl border border-red-400/35 rounded-2xl p-6 relative overflow-hidden">
				{nextTrackImage && (
					<div className="absolute inset-y-0 right-0 w-[75%]">
						<Link
							href={nextTrackImage}
							target="_blank"
							rel="noopener noreferrer"
							className="block h-full w-full cursor-pointer"
						>
							<Image
								src={nextTrackImage}
								alt={`${nextRace?.race_name || 'Race'} background track`}
								fill
								className="object-contain object-right opacity-35 brightness-90 scale-100 transition-all duration-300 group-hover:opacity-100 group-hover:brightness-125 group-hover:scale-105"
								onError={(e) => {
									e.currentTarget.style.display = 'none';
								}}
							/>
						</Link>
					</div>
				)}

				<div className="absolute inset-0 bg-linear-to-br from-black/45 via-black/15 to-black/60 pointer-events-none" />

				<p className="text-[11px] text-red-500 uppercase tracking-[0.2em] mb-2 font-bold relative z-10">
					Next Race Session
				</p>
				{nextRace ?
					<>
						<h3 className="text-3xl md:text-4xl font-black mb-4 relative z-10">
							{nextRace.race_name}
						</h3>
						{nextStartText && (
							<p className="text-sm text-red-300 mb-3 font-medium relative z-10">
								{nextStartText}
							</p>
						)}
						<div className="flex items-center gap-3 mb-4 relative z-10">
							{nextCountryCode && (
								<div className="h-10 overflow-hidden border border-white/20 bg-white/10 rounded-sm shrink-0">
									<Image
										src={`/images/flags/${nextCountryCode}.png`}
										alt={
											nextRace.country || nextRace.circuit?.country || 'Flag'
										}
										width={48}
										height={32}
										className="h-full w-auto block"
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
								</div>
							)}
						</div>
						<div className="space-y-2.5 text-gray-300 text-sm relative z-10">
							<p className="inline-flex items-center gap-2">
								<FaCalendarAlt className="text-red-500" />
								{formatDate(nextRace.date)} {formatTime(nextRace.time)}
							</p>
							<p className="inline-flex items-center gap-2">
								<FaMapMarkerAlt className="text-red-500" />
								{nextRace.circuit?.circuit_name}, {nextRace.circuit?.country}
							</p>
						</div>
						<div className="mt-5 inline-block bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] relative z-10">
							Round {nextRace.round}
						</div>
					</>
				:	<p className="text-gray-400">No upcoming races found.</p>}
			</div>
		</div>
	);
}
