'use client';

import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { DRIVER_CATALOG, getAllTeams } from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FaArrowRight, FaSearch, FaUsers } from 'react-icons/fa';

function formatCompactStat(label, value) {
	return {
		label,
		value: Number.isFinite(value) ? value.toLocaleString() : value,
	};
}

export default function DriversPage() {
	const [query, setQuery] = useState('');
	const [team, setTeam] = useState('All Teams');
	const teams = useMemo(() => ['All Teams', ...getAllTeams()], []);

	const filteredDrivers = useMemo(() => {
		const q = query.trim().toLowerCase();
		return DRIVER_CATALOG.filter((driver) => {
			const matchesTeam = team === 'All Teams' || driver.teamName === team;
			const matchesQuery =
				q.length === 0 ||
				driver.fullName.toLowerCase().includes(q) ||
				driver.code.toLowerCase().includes(q) ||
				driver.teamName.toLowerCase().includes(q) ||
				driver.nationality.toLowerCase().includes(q);
			return matchesTeam && matchesQuery;
		}).sort((a, b) => {
			if (b.worldChampionships !== a.worldChampionships) {
				return b.worldChampionships - a.worldChampionships;
			}
			if (b.careerWins !== a.careerWins) {
				return b.careerWins - a.careerWins;
			}
			return a.fullName.localeCompare(b.fullName);
		});
	}, [query, team]);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1500px] mx-auto pb-12 animate-fade-in">
				<div className="mb-6 md:mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="text-3xl md:text-4xl font-black uppercase tracking-wide inline-flex items-center gap-3">
							<FaUsers className="text-red-500" />
							Current Drivers
						</h1>
						<p className="mt-2 text-sm text-gray-300 max-w-2xl">
							Browse the active FormulaHub driver roster and open full profile
							pages for detailed career statistics.
						</p>
					</div>
				</div>

				<div className="mb-6 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3">
					<label className="relative block">
						<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search by driver, code, team, or nationality"
							className="w-full rounded-xl border border-white/15 bg-black/60 backdrop-blur-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-red-500/60"
						/>
					</label>
					<select
						value={team}
						onChange={(event) => setTeam(event.target.value)}
						className="rounded-xl border border-white/15 bg-black/60 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-red-500/60"
					>
						{teams.map((teamName) => (
							<option
								key={teamName}
								value={teamName}
								className="bg-black"
							>
								{teamName}
							</option>
						))}
					</select>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
					{filteredDrivers.map((driver) => {
						const driverImage = getDriverImagePath(driver.code);
						const teamLogo = getTeamLogoPath(driver.teamName);
						const stats = [
							formatCompactStat('Wins', driver.careerWins),
							formatCompactStat('Podiums', driver.careerPodiums),
							formatCompactStat('Titles', driver.worldChampionships),
						];

						return (
							<Link
								key={driver.slug}
								href={`/drivers/${driver.slug}`}
								className="group rounded-2xl border border-white/12 bg-linear-to-br from-white/12 via-white/4 to-transparent p-4 hover:border-white/25 hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)] transition-all duration-300"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p
											className="text-[10px] uppercase tracking-[0.18em] font-semibold"
											style={{ color: `${driver.teamColor}` }}
										>
											{driver.teamName}
										</p>
										<h2 className="mt-1 text-lg font-bold leading-tight text-white">
											{driver.fullName}
										</h2>
										<p className="text-xs text-gray-300 mt-1">
											#{driver.number} • {driver.nationality}
										</p>
									</div>
									{teamLogo && (
										<div className="relative w-10 h-10 rounded-lg bg-black/45 border border-white/10 overflow-hidden">
											<Image
												src={teamLogo}
												alt={driver.teamName}
												fill
												className="object-contain p-1.5"
											/>
										</div>
									)}
								</div>

								<div className="mt-3 flex items-center gap-3">
									<div className="relative w-20 h-20 rounded-xl bg-white/5 overflow-hidden">
										<Image
											src={driverImage}
											alt={driver.fullName}
											fill
											className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
										/>
									</div>
									<div className="grid grid-cols-3 gap-2 flex-1">
										{stats.map((stat) => (
											<div
												key={stat.label}
												className="rounded-lg bg-black/45 border border-white/10 px-2 py-2 text-center"
											>
												<p className="text-[10px] text-gray-400 uppercase tracking-wide">
													{stat.label}
												</p>
												<p className="text-sm font-semibold text-white mt-0.5">
													{stat.value}
												</p>
											</div>
										))}
									</div>
								</div>

								<div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-red-200 group-hover:text-white transition-colors">
									Open full profile <FaArrowRight className="text-[11px]" />
								</div>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
}
