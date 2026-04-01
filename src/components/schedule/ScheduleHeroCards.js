import Image from 'next/image';
import Link from 'next/link';
import { FaCalendarAlt, FaMapMarkerAlt, FaTrophy } from 'react-icons/fa';

import {
	getCountryCode,
	getDriverImagePath,
	getTrackImagePath,
	parseRaceDateTime,
} from './scheduleHelpers';

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
						<div className="space-y-2.5">
							{(lastRace.podium || []).slice(0, 3).map((driver) => (
								<div
									key={driver.position}
									className="rounded-xl bg-linear-to-r from-white/10 to-white/5 border border-white/15 px-4 py-3 flex items-center justify-between gap-3"
								>
									<div className="inline-flex items-center gap-3 min-w-0">
										<div
											className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center border shrink-0 ${
												driver.position === 1 ?
													'bg-yellow-400/15 text-yellow-300 border-yellow-400/35'
												: driver.position === 2 ?
													'bg-zinc-300/15 text-zinc-200 border-zinc-300/30'
												:	'bg-amber-700/20 text-amber-300 border-amber-500/35'
											}`}
										>
											{driver.position}
										</div>
										{getDriverImagePath(driver.driver_code) && (
											<div className="w-11 h-11 rounded-lg overflow-hidden border border-white/10 bg-white/5 relative shrink-0">
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
										<div className="min-w-0">
											<p className="font-semibold text-sm md:text-base truncate">
												{driver.driver_name}
											</p>
											<p className="text-[11px] uppercase tracking-[0.12em] text-gray-500 truncate">
												{driver.team_name}
											</p>
										</div>
									</div>
									<div className="text-right shrink-0">
										<p className="text-[10px] text-gray-500 uppercase tracking-[0.14em]">
											Finish
										</p>
										<p className="text-sm font-bold text-red-300">
											P{driver.position}
										</p>
									</div>
								</div>
							))}
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
