'use client';

import Image from 'next/image';
import Link from 'next/link';

import { getCountryCode, getTrackImagePath } from './scheduleHelpers';

export default function ScheduleTable({
	races,
	nextRound,
	selectedYear,
	nextRaceYear,
}) {
	return (
		<div className="bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/20 overflow-hidden">
			<div className="overflow-x-auto h-[calc(100vh-320px)]">
				<table className="w-full text-left border-collapse">
					<thead className="sticky top-0 z-10 bg-black/80 text-gray-300 uppercase text-sm backdrop-blur-xl">
						<tr>
							<th className="px-6 py-4">Round</th>
							<th className="px-6 py-4">Grand Prix</th>
							<th className="px-6 py-4">Circuit</th>
							<th className="px-6 py-4">Track</th>
							<th className="px-6 py-4 text-right">Telemetries</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5 border-t border-white/10">
						{races.map((race) => {
							const isNext =
								Number(nextRound) === Number(race.round) &&
								Number(selectedYear) === Number(nextRaceYear);
							const countryCode = getCountryCode(
								race.country || race.circuit?.country
							);
							const trackImage = getTrackImagePath(race);
							const telemetryHref = `/telemetry?year=${race.year || new Date().getFullYear()}&round=${race.round}&session=Race`;

							return (
								<tr
									key={`${race.year || 'y'}-${race.round}`}
									className={`transition-colors ${isNext ? 'bg-red-900/20' : 'hover:bg-white/5'}`}
								>
									<td className="px-6 py-4 font-bold text-red-400">
										{race.round}
										{isNext && (
											<span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider">
												Next
											</span>
										)}
									</td>
									<td className="px-4 py-3 md:px-6 md:py-4">
										<div className="flex items-center gap-3">
											{countryCode && (
												<div className="w-10 h-7 rounded-sm overflow-hidden border border-white/10 bg-white/5 relative shrink-0 ">
													<Image
														src={`/images/flags/${countryCode}.png`}
														alt={
															race.country || race.circuit?.country || 'Flag'
														}
														fill
														className="object-cover"
														onError={(e) => {
															e.currentTarget.style.display = 'none';
														}}
													/>
												</div>
											)}
											<div>
												<div className="font-semibold text-sm md:text-base">
													{race.event || race.race_name}
												</div>
												<div className="text-xs text-gray-500">
													{race.location ||
														race.country ||
														race.circuit?.country}
												</div>
											</div>
										</div>
									</td>
									<td className="px-4 py-3 md:px-6 md:py-4 text-gray-300">
										{race.circuit?.circuit_name ||
											race.circuit?.name ||
											race.circuit_name ||
											race.circuit ||
											'-'}
									</td>
									<td className="px-4 py-3 md:px-6 md:py-4 hidden lg:table-cell">
										{trackImage ?
											<div className="w-20 h-10 rounded-md border border-white/10 bg-white/5 relative overflow-hidden">
												<Image
													src={trackImage}
													alt={`${race.event || race.race_name} track`}
													fill
													className="object-contain invert opacity-70 p-1"
													onError={(e) => {
														e.currentTarget.style.display = 'none';
													}}
												/>
											</div>
										:	<span className="text-xs text-gray-500">N/A</span>}
									</td>
									<td className="px-6 py-4 text-right">
										<Link
											href={telemetryHref}
											className="inline-block text-[10px] px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 uppercase tracking-[0.12em] hover:bg-red-500/25 transition-colors"
										>
											See Telemetries
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
