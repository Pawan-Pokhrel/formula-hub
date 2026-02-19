'use client';

import { getLastRace, getNextRace, getSchedule } from '@/lib/api/scheduleApi';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
	FaCalendarAlt,
	FaFlagCheckered,
	FaMapMarkerAlt,
	FaTrophy,
} from 'react-icons/fa';

export default function Dashboard() {
	const [nextRace, setNextRace] = useState(null);
	const [lastRace, setLastRace] = useState(null);
	const [schedule, setSchedule] = useState([]);
	const [loading, setLoading] = useState(true);

	const nextRaceRef = useRef(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const currentYear = new Date().getFullYear();
				const [next, last, sched] = await Promise.all([
					getNextRace(),
					getLastRace(),
					getSchedule(currentYear),
				]);
				setNextRace(next);
				setLastRace(last);
				setSchedule(sched || []);
			} catch (error) {
				console.error('Failed to fetch dashboard data:', error);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	useEffect(() => {
		if (nextRace && nextRaceRef.current && !loading) {
			setTimeout(() => {
				nextRaceRef.current.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
				});
			}, 500); // Small delay to ensure render is complete
		}
	}, [nextRace, loading]);

	const formatDate = (dateString) => {
		if (!dateString) return 'TBA';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const formatTime = (timeString) => {
		if (!timeString) return '';
		// Ergast time is usually UTC like "14:00:00Z"
		// We can just show it as is or convert to local
		return timeString.replace('Z', ' UTC');
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-black flex justify-center items-center">
				<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />

			<div className="relative z-10 max-w-[1600px] mx-auto flex gap-8">
				<div className="flex flex-col gap-8 mb-12 w-1/5 mt-14">
					{/* Last Race Card */}
					<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col justify-center animate-fade-in">
						<h2 className="text-xl text-gray-400 font-bold uppercase tracking-widest mb-4">
							Last Race
						</h2>
						{lastRace ?
							<div>
								<h3 className="text-2xl font-bold text-white mb-2">
									{lastRace.race_name}
								</h3>
								<p className="text-gray-400 mb-6">
									{formatDate(lastRace.date)}
								</p>

								{lastRace.podium && lastRace.podium.length > 0 ?
									<div className="space-y-3">
										{lastRace.podium.map((driver) => (
											<div
												key={driver.position}
												className="flex items-center gap-3"
											>
												<div
													className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                                    ${
																											driver.position === 1 ?
																												'bg-yellow-500 text-black'
																											: driver.position === 2 ?
																												'bg-gray-300 text-black'
																											:	'bg-amber-700 text-white'
																										}`}
												>
													{driver.position}
												</div>
												{driver.driver_code && (
													<div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 shrink-0 border border-white/20 shadow-md relative">
														<Image
															src={`/images/drivers/${driver.driver_code}.png`}
															alt={driver.driver_name}
															fill
															className="object-cover object-top"
															onError={(e) => {
																e.target.style.display = 'none';
															}}
														/>
													</div>
												)}
												<div>
													<div className="font-bold text-white text-lg">
														{driver.driver_name}
													</div>
													<div className="text-sm text-gray-400">
														{driver.team_name}
													</div>
												</div>
											</div>
										))}
									</div>
								:	<div className="flex items-center gap-3 text-yellow-500">
										<FaTrophy className="text-2xl" />
										<span className="text-lg font-medium">Winner: TBA</span>
									</div>
								}
							</div>
						:	<div className="text-gray-400">No completed races yet.</div>}
					</div>

					{/* Next Race Card */}
					<div className="lg:col-span-2 bg-linear-to-br from-red-900/20 to-black/50 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 relative overflow-hidden group animate-fade-in">
						<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
							<FaFlagCheckered className="text-9xl text-white" />
						</div>

						<h2 className="text-xl text-red-500 font-bold uppercase tracking-widest mb-2">
							Next Race Session
						</h2>
						{nextRace ?
							<div className="flex flex-col gap-8 items-center justify-between">
								<div className="flex-1 ">
									<h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
										{nextRace.race_name}
									</h3>
									<div className="flex flex-col gap-4 text-lg text-gray-300">
										<div className="flex items-center gap-3">
											<FaCalendarAlt className="text-red-500" />
											<span>
												{formatDate(nextRace.date)} {formatTime(nextRace.time)}
											</span>
										</div>
										<div className="flex items-center gap-3">
											<FaMapMarkerAlt className="text-red-500" />
											<span>
												{nextRace.circuit.circuit_name},{' '}
												{nextRace.circuit.location}, {nextRace.circuit.country}
											</span>
										</div>
									</div>
									<div className="mt-8">
										<div className="inline-block bg-red-600 text-white px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-600/20">
											Round {nextRace.round}
										</div>
									</div>
								</div>
							</div>
						:	<div className="text-gray-400 text-xl">
								No upcoming races found.
							</div>
						}
					</div>
				</div>

				{/* Calendar */}
				<div className="w-full animate-fade-in">
					<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
						<FaCalendarAlt className="text-red-600" />
						{new Date().getFullYear()} Race Calendar
					</h2>

					<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 h-[calc(100vh-250px)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-red-600/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-red-600 [&::-webkit-scrollbar-track]:mt-[52px]">
						<table className="w-full text-left border-collapse">
							<thead className="sticky top-0 z-10 bg-neutral-900 text-gray-400 uppercase text-sm shadow-lg">
								<tr>
									<th className="px-6 py-4">Round</th>
									<th className="px-6 py-4">Grand Prix</th>
									<th className="px-6 py-4">Circuit</th>
									<th className="px-6 py-4">Date</th>
									<th className="px-6 py-4">Location</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5 border-t border-white/10">
								{schedule.map((race) => {
									const isNextRace = nextRace && race.round === nextRace.round;

									return (
										<tr
											key={race.round}
											ref={isNextRace ? nextRaceRef : null}
											className={`transition-all duration-300 ${
												isNextRace ?
													'bg-red-900/20 border-l-4 border-l-red-600 shadow-[inset_0_0_20px_rgba(220,38,38,0.1)]'
												:	'hover:bg-white/5 border-l-4 border-l-transparent'
											}`}
										>
											<td className="px-6 py-4 font-bold text-red-500">
												{race.round}
												{isNextRace && (
													<span className="ml-2 inline-block px-2 py-0.5 text-[10px] bg-red-600 text-white rounded uppercase tracking-wider">
														Next
													</span>
												)}
											</td>
											<td className="px-6 py-4 font-medium text-white">
												{race.race_name}
											</td>
											<td className="px-6 py-4 text-gray-300">
												<div>{race.circuit.circuit_name}</div>
												<Link
													href={`/images/circuits/${race.race_name.split(' ')[0].toLowerCase()}.png`}
													target="_blank"
												>
													<div className="mt-2 w-32 h-20 bg-white/5 p-2 rounded border border-white/10 hover:bg-white/10 transition-colors relative">
														<Image
															src={`/images/circuits/${race.race_name.split(' ')[0].toLowerCase()}.png`}
															alt="Track Layout"
															fill
															className="object-contain invert opacity-60 hover:opacity-100 transition-opacity p-1"
															onError={(e) => {
																e.target.parentElement.style.display = 'none';
															}}
														/>
													</div>
												</Link>
											</td>
											<td className="px-6 py-4 text-gray-300">
												{formatDate(race.date)}
											</td>
											<td className="px-6 py-4 text-gray-300">
												{race.circuit.location}, {race.circuit.country}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
