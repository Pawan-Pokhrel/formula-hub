'use client';

import {
	getConstructorStandings,
	getDriverStandings,
} from '@/lib/api/standingsApi';
import { useEffect, useMemo, useState } from 'react';

import StandingsHeader from './StandingsHeader';
import StandingsLoadingSkeleton from './StandingsLoadingSkeleton';
import StandingsTable from './StandingsTable';

export default function StandingsPageClient() {
	const currentYear = new Date().getFullYear();
	const [year, setYear] = useState(currentYear);
	const [activeTab, setActiveTab] = useState('drivers');
	const [drivers, setDrivers] = useState([]);
	const [constructors, setConstructors] = useState([]);
	const [loading, setLoading] = useState(true);

	const years = useMemo(
		() =>
			Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i),
		[currentYear]
	);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				if (activeTab === 'drivers') {
					const data = await getDriverStandings(year);
					setDrivers(Array.isArray(data) ? data : []);
				} else {
					const data = await getConstructorStandings(year);
					setConstructors(Array.isArray(data) ? data : []);
				}
			} catch (error) {
				console.error('Failed to fetch standings:', error);
				if (activeTab === 'drivers') setDrivers([]);
				else setConstructors([]);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [year, activeTab]);

	const rows = activeTab === 'drivers' ? drivers : constructors;
	const leader = rows[0] || null;
	const totalWins = rows.reduce((acc, row) => acc + Number(row.wins || 0), 0);
	const totalPoints = rows.reduce(
		(acc, row) => acc + Number(row.points || 0),
		0
	);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/86 z-0" />
			<div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_10%,rgba(220,38,38,0.18),transparent_40%),radial-gradient(circle_at_85%_5%,rgba(244,114,182,0.14),transparent_35%)]" />
			<div className="relative z-10 max-w-7xl mx-auto pb-10">
				<div className="mb-5 rounded-2xl border border-white/20 bg-linear-to-r from-black/45 via-red-950/30 to-black/45 backdrop-blur-2xl p-5 md:p-6">
					<p className="text-xs uppercase tracking-[0.2em] text-red-300/90 font-semibold mb-1">
						Season Intelligence
					</p>
					<p className="text-sm md:text-base text-gray-200/90">
						Track championship momentum by switching between drivers and
						constructors with historic season snapshots.
					</p>
				</div>

				<StandingsHeader
					year={year}
					years={years}
					activeTab={activeTab}
					onYearChange={setYear}
					onTabChange={setActiveTab}
				/>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
					<div className="rounded-xl border border-white/20 bg-black/50 backdrop-blur-2xl p-4">
						<p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mb-1">
							Current Leader
						</p>
						<p className="text-lg font-extrabold text-white truncate">
							{leader ?
								activeTab === 'drivers' ?
									leader.driver_name
								:	leader.team_name
							:	'TBA'}
						</p>
						<p className="text-sm text-red-300 font-semibold">
							{leader ? `${leader.points} pts` : '-'}
						</p>
					</div>
					<div className="rounded-xl border border-white/20 bg-black/50 backdrop-blur-2xl p-4">
						<p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mb-1">
							Total Wins Listed
						</p>
						<p className="text-2xl font-black text-amber-300 tabular-nums">
							{totalWins}
						</p>
					</div>
					<div className="rounded-xl border border-white/20 bg-black/50 backdrop-blur-2xl p-4">
						<p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mb-1">
							Total Points Listed
						</p>
						<p className="text-2xl font-black text-red-300 tabular-nums">
							{totalPoints}
						</p>
					</div>
				</div>

				{loading ?
					<StandingsLoadingSkeleton />
				:	<StandingsTable
						activeTab={activeTab}
						rows={rows}
					/>
				}
			</div>
		</div>
	);
}
