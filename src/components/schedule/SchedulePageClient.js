'use client';

import { getLastRace, getNextRace } from '@/lib/api/scheduleApi';
import { getYearSchedule } from '@/lib/api/trackApi';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useMemo, useState } from 'react';

import ScheduleHeroCards from '@/components/schedule/ScheduleHeroCards';
import ScheduleTable from '@/components/schedule/ScheduleTable';

export default function SchedulePage() {
	const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
	const currentYear = new Date().getFullYear();
	const [year, setYear] = useState(currentYear);
	const [loading, setLoading] = useState(true);
	const [nextRace, setNextRace] = useState(null);
	const [lastRace, setLastRace] = useState(null);
	const [schedule, setSchedule] = useState([]);
	const nextRaceYear = useMemo(() => {
		if (!nextRace?.date) return null;
		const parsed = new Date(nextRace.date);
		return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
	}, [nextRace]);

	const years = useMemo(
		() =>
			Array.from({ length: currentYear - 2018 + 1 }, (_, i) => currentYear - i),
		[currentYear]
	);

	useEffect(() => {
		const fetchCurrentRaceCards = async () => {
			const [next, last] = await Promise.all([
				getNextRace().catch(() => null),
				getLastRace().catch(() => null),
			]);

			setNextRace(next);
			setLastRace(last);
		};

		fetchCurrentRaceCards();
	}, []);

	useEffect(() => {
		const fetchScheduleByYear = async () => {
			setLoading(true);
			try {
				const races = await getYearSchedule(year).catch(() => []);
				setSchedule(Array.isArray(races) ? races : []);
			} finally {
				setLoading(false);
			}
		};

		fetchScheduleByYear();
	}, [year]);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1600px] mx-auto pb-10 animate-fade-in">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 backdrop-blur-2xl bg-linear-to-r from-red-700/10 to-white/10 rounded-2xl p-4 border border-white/20">
					<h1 className="text-3xl md:text-4xl font-black uppercase tracking-wide inline-flex items-center gap-3">
						Race Schedule
					</h1>

					<select
						value={year}
						onChange={(e) => setYear(Number(e.target.value))}
						className="bg-black/60 backdrop-blur-2xl border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500/50"
					>
						{years.map((y) => (
							<option
								key={y}
								value={y}
								className="bg-black"
							>
								{y}
							</option>
						))}
					</select>
				</div>

				<ScheduleHeroCards
					nextRace={nextRace}
					lastRace={lastRace}
				/>

				{loading ?
					<div className="rounded-2xl border border-white/20 bg-black/60 backdrop-blur-2xl p-4 space-y-2">
						<div className="h-10 rounded-xl bg-white/10 animate-pulse" />
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="h-12 rounded-xl bg-white/8 animate-pulse"
							/>
						))}
					</div>
				:	<ScheduleTable
						races={schedule}
						nextRound={nextRace?.round}
						selectedYear={year}
						nextRaceYear={nextRaceYear}
						isAuthenticated={isAuthenticated}
						isAuthLoading={isAuthLoading}
					/>
				}
			</div>
		</div>
	);
}
