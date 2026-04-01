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

const NATIONALITY_FLAG_MAP = {
	australian: 'aus',
	argentine: 'arg',
	brazilian: 'bra',
	british: 'gbr',
	canadian: 'can',
	dutch: 'ned',
	finnish: 'fin',
	french: 'fra',
	german: 'ger',
	italian: 'ita',
	mexican: 'mex',
	monacan: 'mon',
	spanish: 'esp',
	'thai-british': 'tha',
	'thai british': 'tha',
	'new zealander': 'nzl',
};

function getNationalityFlagCode(nationality) {
	if (!nationality) return null;
	const normalized = String(nationality).trim().toLowerCase();
	return NATIONALITY_FLAG_MAP[normalized] || null;
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
		}).sort((a, b) => a.fullName.localeCompare(b.fullName));
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
							placeholder="Search by driver, team, or nationality"
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

				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 justify-items-center">
					{filteredDrivers.map((driver) => {
						const driverImage = getDriverImagePath(driver.code);
						const teamLogo = getTeamLogoPath(driver.teamName);
						const flagCode = getNationalityFlagCode(driver.nationality);

						return (
							<Link
								key={driver.slug}
								href={`/drivers/${driver.slug}`}
								className="group relative w-full max-w-[320px] min-h-[460px] rounded-2xl border border-white/12 bg-black/60 p-4 overflow-hidden hover:border-white/25 hover:shadow-[0_16px_45px_rgba(0,0,0,0.42)] transition-all duration-300"
							>
								<div
									className="pointer-events-none absolute inset-y-0 right-0 w-[34%] opacity-85"
									style={{
										backgroundImage: `linear-gradient(140deg, ${driver.teamColor}66 0%, ${driver.teamColor}28 40%, transparent 100%), repeating-linear-gradient(-36deg, rgba(255,255,255,0.11) 0px, rgba(255,255,255,0.11) 2px, transparent 2px, transparent 10px)`,
									}}
								/>

								<div className="relative z-10 flex items-start justify-between gap-3">
									<div>
										<p
											className="text-[10px] uppercase tracking-[0.18em] font-semibold"
											style={{ color: `${driver.teamColor}` }}
										>
											{driver.teamName}
										</p>
										<h2 className="mt-1 text-xl font-bold leading-tight text-white max-w-[220px]">
											{driver.fullName}
										</h2>
									</div>
									{teamLogo && (
										<div className="relative w-10 h-10 rounded-lg bg-black/45 border border-white/10 overflow-hidden shrink-0">
											<Image
												src={teamLogo}
												alt={driver.teamName}
												fill
												className="object-contain p-1.5"
											/>
										</div>
									)}
								</div>

								<div className="relative z-10 mt-4 h-[280px] rounded-xl bg-white/5 overflow-hidden border border-white/10">
									<Image
										src={driverImage}
										alt={driver.fullName}
										fill
										className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
									/>
								</div>

								<div className="relative z-10 mt-4 space-y-2">
									<div className="rounded-lg bg-black/45 border border-white/10 px-3 py-2">
										<p className="text-[10px] uppercase tracking-wide text-gray-400">
											Racing Number
										</p>
										<p className="text-base font-semibold text-white">
											#{driver.number}
										</p>
									</div>
									<div className="rounded-lg bg-black/45 border border-white/10 px-3 py-2 flex items-center justify-between gap-2">
										<div>
											<p className="text-[10px] uppercase tracking-wide text-gray-400">
												Nationality
											</p>
											<p className="text-sm font-semibold text-white">
												{driver.nationality}
											</p>
										</div>
										{flagCode && (
											<div className="h-7 overflow-hidden rounded border border-white/15 bg-black/35 shrink-0">
												<Image
													src={`/images/flags/${flagCode}.png`}
													alt={`${driver.nationality} flag`}
													width={40}
													height={28}
													className="h-full w-auto"
													onError={(event) => {
														event.currentTarget.style.display = 'none';
													}}
												/>
											</div>
										)}
									</div>
								</div>

								<div className="relative z-10 mt-3 inline-flex items-center gap-2 text-xs font-semibold text-red-200 group-hover:text-white transition-colors">
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
