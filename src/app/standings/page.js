'use client';

import {
	getConstructorStandings,
	getDriverStandings,
} from '@/lib/api/standingsApi';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FaTrophy } from 'react-icons/fa';

export default function StandingsPage() {
	const currentYear = new Date().getFullYear();
	const [year, setYear] = useState(2025);
	const [activeTab, setActiveTab] = useState('drivers'); // 'drivers' or 'constructors'
	const [drivers, setDrivers] = useState([]);
	const [constructors, setConstructors] = useState([]);
	const [loading, setLoading] = useState(true);

	// Generate years from 1950 to current
	const years = Array.from(
		{ length: currentYear - 1950 + 1 },
		(_, i) => currentYear - i
	);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				if (activeTab === 'drivers') {
					const data = await getDriverStandings(year);
					setDrivers(data);
				} else {
					const data = await getConstructorStandings(year);
					setConstructors(data);
				}
			} catch (error) {
				console.error('Failed to fetch standings:', error);
				// Reset data on error
				if (activeTab === 'drivers') setDrivers([]);
				else setConstructors([]);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [year, activeTab]);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />

			<div className="relative z-10 max-w-7xl mx-auto">
				<div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
					<h1 className="text-4xl font-bold uppercase tracking-wider flex items-center gap-4 animate-fade-in">
						<FaTrophy className="text-red-600" />
						{year} Season Standings
					</h1>

					<div className="flex gap-4 items-center">
						<select
							value={year}
							onChange={(e) => setYear(Number(e.target.value))}
							className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-red-600 transition-colors"
						>
							{years.map((y) => (
								<option
									key={y}
									value={y}
									className="bg-black text-white"
								>
									{y}
								</option>
							))}
						</select>

						<div className="bg-white/10 backdrop-blur-md rounded-lg p-1 flex border border-white/20">
							<button
								onClick={() => setActiveTab('drivers')}
								className={`px-6 py-2 rounded-md transition-all font-medium ${
									activeTab === 'drivers' ?
										'bg-red-600 text-white shadow-lg shadow-red-600/20'
									:	'text-gray-400 hover:text-white hover:bg-white/5'
								}`}
							>
								Drivers
							</button>
							<button
								onClick={() => setActiveTab('constructors')}
								className={`px-6 py-2 rounded-md transition-all font-medium ${
									activeTab === 'constructors' ?
										'bg-red-600 text-white shadow-lg shadow-red-600/20'
									:	'text-gray-400 hover:text-white hover:bg-white/5'
								}`}
							>
								Constructors
							</button>
						</div>
					</div>
				</div>

				{loading ?
					<div className="flex justify-center items-center h-64">
						<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
					</div>
				:	<div className="bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-fade-in">
						<div className="overflow-x-auto">
							<table className="w-full text-left">
								<thead className="bg-black/40 text-gray-400 uppercase text-sm tracking-wider">
									<tr>
										<th className="px-6 py-4">Pos</th>
										<th className="px-6 py-4">
											{activeTab === 'drivers' ? 'Driver' : 'Team'}
										</th>
										{activeTab === 'drivers' && (
											<th className="px-6 py-4">Team</th>
										)}
										<th className="px-6 py-4">Wins</th>
										<th className="px-6 py-4 text-right">Points</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{(activeTab === 'drivers' ? drivers : constructors).map(
										(item) => (
											<tr
												key={item.position}
												className="hover:bg-white/5 transition-colors group"
											>
												<td className="px-6 py-4 font-bold text-xl w-20">
													<span
														className={`
													${
														item.position === 1 ?
															'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]'
														:	''
													}
													${item.position === 2 ? 'text-gray-300' : ''}
													${item.position === 3 ? 'text-amber-600' : ''}
                                                    ${
																											item.position > 3 ?
																												'text-white/50 group-hover:text-white transition-colors'
																											:	''
																										}
												`}
													>
														{item.position}
													</span>
												</td>
												<td className="px-6 py-4 font-medium text-lg">
													{activeTab === 'drivers' ?
														<div className="flex items-center gap-4">
															{item.driver_code && (
																<div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 shrink-0 border border-white/10 shadow-lg relative">
																	<Image
																		src={`/images/drivers/${item.driver_code}.png`}
																		alt={item.driver_name}
																		fill
																		className="object-cover object-top"
																		onError={(e) => {
																			e.target.style.display = 'none';
																		}}
																	/>
																</div>
															)}
															<div className="flex flex-col gap-1">
																<span className="text-xl font-bold">
																	{item.driver_name}
																</span>
																<span className="text-sm text-gray-400 md:hidden">
																	{item.team_name}
																</span>
															</div>
														</div>
													:	item.team_name}
												</td>
												{activeTab === 'drivers' && (
													<td className="px-6 py-4 text-gray-400">
														{item.team_name}
													</td>
												)}
												<td className="px-6 py-4 text-white/80">{item.wins}</td>
												<td className="px-6 py-4 text-right font-bold text-red-500 text-lg">
													{item.points}
												</td>
											</tr>
										)
									)}
								</tbody>
							</table>
							{(activeTab === 'drivers' ? drivers : constructors).length ===
								0 && (
								<div className="text-center py-12 text-gray-500">
									No data available for this season yet.
								</div>
							)}
						</div>
					</div>
				}
			</div>
		</div>
	);
}
