'use client';

import { getTelemetryDriverImage } from '@/components/telemetry/telemetryUiUtils';
import { getTelemetrySessionSnapshot } from '@/lib/api/scheduleApi';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

import { getCountryCode, getTrackImagePath } from './scheduleHelpers';

function normalizePodiumRows(snapshot) {
	if (!snapshot || typeof snapshot !== 'object') return [];

	const fromPodium =
		Array.isArray(snapshot.podium) && snapshot.podium.length > 0 ?
			snapshot.podium
		:	[];
	if (fromPodium.length > 0) {
		return fromPodium
			.slice()
			.sort((a, b) => Number(a.position || 99) - Number(b.position || 99))
			.slice(0, 3);
	}

	const fromRows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
	return fromRows
		.filter((row) => Number(row?.position) >= 1 && Number(row?.position) <= 3)
		.slice()
		.sort((a, b) => Number(a.position || 99) - Number(b.position || 99));
}

function getPodiumStandStyle(teamColor, opacity = 0.22) {
	const raw = String(teamColor || '')
		.trim()
		.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
		return {
			background:
				'linear-gradient(180deg, rgba(239,68,68,0.24) 0%, rgba(10,10,12,0.92) 100%)',
			borderColor: 'rgba(239,68,68,0.35)',
		};
	}
	const r = parseInt(raw.slice(0, 2), 16);
	const g = parseInt(raw.slice(2, 4), 16);
	const b = parseInt(raw.slice(4, 6), 16);
	return {
		background: `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, ${opacity}) 0%, rgba(10,10,12,0.92) 100%)`,
		borderColor: `rgba(${r}, ${g}, ${b}, 0.5)`,
	};
}

export default function ScheduleTable({
	races,
	nextRound,
	selectedYear,
	nextRaceYear,
}) {
	const [expandedRaceKey, setExpandedRaceKey] = useState(null);
	const [podiumByRaceKey, setPodiumByRaceKey] = useState({});
	const [loadingRaceKey, setLoadingRaceKey] = useState(null);
	const [podiumErrorByRaceKey, setPodiumErrorByRaceKey] = useState({});

	const loadRacePodium = async (race, raceKey) => {
		if (podiumByRaceKey[raceKey]) return;

		setLoadingRaceKey(raceKey);
		setPodiumErrorByRaceKey((prev) => ({ ...prev, [raceKey]: null }));
		try {
			const raceYear = Number(
				race.year || selectedYear || new Date().getFullYear()
			);
			const telemetry = await getTelemetrySessionSnapshot({
				year: raceYear,
				round: Number(race.round),
				session: 'Race',
			});
			const normalized = normalizePodiumRows(telemetry);
			setPodiumByRaceKey((prev) => ({ ...prev, [raceKey]: normalized }));
		} catch (error) {
			setPodiumErrorByRaceKey((prev) => ({
				...prev,
				[raceKey]: error?.message || 'Failed to load podium preview.',
			}));
		} finally {
			setLoadingRaceKey((current) => (current === raceKey ? null : current));
		}
	};

	const handleTogglePodium = async (race, raceKey) => {
		if (expandedRaceKey === raceKey) {
			setExpandedRaceKey(null);
			return;
		}
		setExpandedRaceKey(raceKey);
		await loadRacePodium(race, raceKey);
	};

	return (
		<div className="bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/20 overflow-hidden">
			<div className="max-h-[70vh] overflow-x-auto overflow-y-auto md:h-[calc(100vh-320px)] md:max-h-none">
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
							const raceYear = Number(
								race.year || selectedYear || new Date().getFullYear()
							);
							const raceKey = `${raceYear}-${race.round}`;
							const isNext =
								Number(nextRound) === Number(race.round) &&
								Number(selectedYear) === Number(nextRaceYear);
							const raceStatus = String(race.status || '').toLowerCase();
							const raceDate =
								race.date || race.race_date || race.race_date_utc || null;
							const parsedRaceDate = raceDate ? new Date(raceDate) : null;
							const isCompletedRace =
								Boolean(race.is_past) ||
								raceStatus === 'completed' ||
								raceStatus === 'finished' ||
								(Boolean(parsedRaceDate) &&
									!Number.isNaN(parsedRaceDate.getTime()) &&
									parsedRaceDate.getTime() < Date.now());
							const countryCode = getCountryCode(
								race.country || race.circuit?.country
							);
							const trackImage = getTrackImagePath(race);
							const telemetryHref = `/telemetry?year=${raceYear}&round=${race.round}&session=Race`;
							const isExpanded = expandedRaceKey === raceKey;
							const isPodiumLoading = loadingRaceKey === raceKey;
							const podiumRows = podiumByRaceKey[raceKey] || [];
							const podiumByPosition = podiumRows.reduce((acc, row) => {
								acc[Number(row.position)] = row;
								return acc;
							}, {});
							const podiumError = podiumErrorByRaceKey[raceKey];

							return (
								<Fragment key={raceKey}>
									<tr
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
											{isCompletedRace ?
												<button
													type="button"
													onClick={() => handleTogglePodium(race, raceKey)}
													className="inline-flex items-center gap-2 text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-gray-200 border border-white/20 uppercase tracking-[0.12em] hover:bg-white/10 transition-colors"
												>
													<span>
														{isExpanded ? 'Hide Results' : 'Show Results'}
													</span>
													<FaChevronDown
														className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
													/>
												</button>
											:	<span className="inline-block text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-gray-500 border border-white/10 uppercase tracking-[0.12em]">
													Unavailable
												</span>
											}
										</td>
									</tr>
									{isCompletedRace && isExpanded && (
										<tr className="bg-black/50">
											<td
												colSpan={5}
												className="px-4 py-4 md:px-6 md:py-5"
											>
												<div className="rounded-2xl border border-red-500/20 bg-[linear-gradient(145deg,rgba(8,8,10,0.98),rgba(12,12,14,0.94))] p-4 md:p-5">
													<div className="mb-3 flex items-center justify-between gap-3">
														<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-300/85">
															Race Podium Preview
														</p>
														<p className="text-[11px] text-gray-500">
															{race.event || race.race_name}
														</p>
													</div>

													{isPodiumLoading ?
														<div className="grid grid-cols-3 gap-3 md:gap-5 animate-pulse">
															<div className="h-48 rounded-xl border border-white/10 bg-white/5" />
															<div className="h-56 rounded-xl border border-white/10 bg-white/5" />
															<div className="h-48 rounded-xl border border-white/10 bg-white/5" />
														</div>
													: podiumError ?
														<div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
															{podiumError}
														</div>
													: podiumRows.length > 0 ?
														<div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5 md:items-end">
															{[2, 1, 3].map((position) => {
																const driver =
																	podiumByPosition[position] || null;
																const standClass =
																	position === 1 ? 'h-28 md:h-32' : (
																		'h-20 md:h-24'
																	);
																const imageSize =
																	position === 1 ? 'h-20 w-20' : 'h-16 w-16';

																if (!driver) {
																	return (
																		<div
																			key={`podium-empty-${position}`}
																			className="rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-6 text-center text-xs text-gray-500"
																		>
																			P{position} unavailable
																		</div>
																	);
																}

																return (
																	<div
																		key={`podium-${position}-${driver.driver_code || driver.driver_name}`}
																		className="flex flex-col items-center gap-3"
																	>
																		{(() => {
																			const driverImage =
																				getTelemetryDriverImage(
																					driver.driver_code,
																					raceYear
																				);
																			return (
																				<div
																					className={`relative overflow-hidden rounded-full border border-white/20 bg-black/40 ${imageSize}`}
																				>
																					{driverImage ?
																						<Image
																							src={driverImage}
																							alt={driver.driver_name}
																							fill
																							sizes={
																								position === 1 ? '80px' : '64px'
																							}
																							className="object-cover object-top"
																						/>
																					:	<div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
																							No Img
																						</div>
																					}
																				</div>
																			);
																		})()}
																		<div className="text-center">
																			<p className="text-sm font-black text-white leading-tight">
																				{driver.driver_name}
																			</p>
																			<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
																				{driver.team_name}
																			</p>
																		</div>
																		<div
																			className={`w-full rounded-t-xl border border-b-0 ${standClass} flex items-center justify-center text-xs font-black uppercase tracking-[0.14em] text-white/90`}
																			style={getPodiumStandStyle(
																				driver.team_color
																			)}
																		>
																			{position === 1 ?
																				'Winner'
																			:	`P${position}`}
																		</div>
																	</div>
																);
															})}
														</div>
													:	<div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
															Podium preview is unavailable for this race.
														</div>
													}

													<div className="mt-4 flex items-center justify-end gap-3">
														<Link
															href={telemetryHref}
															className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-100 hover:bg-white/10 transition-colors"
														>
															See Full Telemetries
														</Link>
													</div>
												</div>
											</td>
										</tr>
									)}
								</Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
