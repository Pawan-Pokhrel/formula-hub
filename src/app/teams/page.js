'use client';

import {
	getDriverImagePath,
	getTeamCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import {
	getConstructorStandings,
	getDriverStandings,
} from '@/lib/api/standingsApi';
import { ROUGH_CONSTRUCTOR_ORDER_2026 } from '@/lib/data/constructorStandingsRough';
import { CURRENT_SEASON, DRIVER_CATALOG } from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaFlagCheckered, FaTrophy } from 'react-icons/fa';

function normalizeName(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ');
}

function getTeamKey(teamName) {
	return getTeamCode(teamName) || normalizeName(teamName);
}

const TEAM_DISPLAY_NAME_BY_KEY = {
	mer: 'Mercedes',
	fer: 'Ferrari',
	rbr: 'RedBull Racing',
	mcl: 'McLaren',
	haas: 'Haas F1 Team',
	ast: 'Aston Martin',
	wil: 'Williams',
	rb: 'Racing Bulls',
	alp: 'Alpine',
	aud: 'Audi',
	cad: 'Cadillac',
	sau: 'Sauber',
};

const TEAM_CAR_TOKEN_BY_KEY = {
	mer: 'mercedes',
	fer: 'ferrari',
	rbr: 'redbullracing',
	mcl: 'mclaren',
	haas: 'haasf1team',
	ast: 'astonmartin',
	wil: 'williams',
	rb: 'racingbulls',
	alp: 'alpine',
	aud: 'audi',
	cad: 'cadillac',
};

function getDisplayTeamName(teamName) {
	const key = getTeamKey(teamName);
	return TEAM_DISPLAY_NAME_BY_KEY[key] || String(teamName || 'Unknown Team');
}

function getTeamColor(teamName) {
	const teamKey = getTeamKey(teamName);
	const exact = DRIVER_CATALOG.find(
		(driver) => getTeamKey(driver.teamName) === teamKey
	);
	return exact?.teamColor || '#6B7280';
}

function darkenHexColor(hexColor, factor = 0.55) {
	const raw = String(hexColor || '')
		.trim()
		.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#1F2937';
	const toHex = (value) => value.toString(16).padStart(2, '0');
	const r = Math.max(
		0,
		Math.min(255, Math.round(parseInt(raw.slice(0, 2), 16) * factor))
	);
	const g = Math.max(
		0,
		Math.min(255, Math.round(parseInt(raw.slice(2, 4), 16) * factor))
	);
	const b = Math.max(
		0,
		Math.min(255, Math.round(parseInt(raw.slice(4, 6), 16) * factor))
	);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgba(hexColor, alpha) {
	const raw = String(hexColor || '')
		.trim()
		.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(31,41,55,${alpha})`;
	const r = parseInt(raw.slice(0, 2), 16);
	const g = parseInt(raw.slice(2, 4), 16);
	const b = parseInt(raw.slice(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

function getTeamCarImagePath(teamName) {
	const teamKey = getTeamKey(teamName);
	const teamToken =
		TEAM_CAR_TOKEN_BY_KEY[teamKey] ||
		String(teamName || '')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '');
	if (!teamToken) return null;
	return `/images/cars/${CURRENT_SEASON}${teamToken}carright.png`;
}

const FALLBACK_CONSTRUCTORS = ROUGH_CONSTRUCTOR_ORDER_2026.map(
	(teamName, index) => ({
		position: index + 1,
		team_name: teamName,
		points: 0,
		wins: 0,
	})
);

export default function TeamsPage() {
	const [constructors, setConstructors] = useState([]);
	const [driverPointsByCode, setDriverPointsByCode] = useState({});
	const [isLoading, setIsLoading] = useState(true);
	const [failedCars, setFailedCars] = useState({});

	useEffect(() => {
		let active = true;

		async function loadTeams() {
			try {
				const [constructorsRes, driversRes] = await Promise.all([
					getConstructorStandings(CURRENT_SEASON),
					getDriverStandings(CURRENT_SEASON),
				]);

				if (!active) return;

				const constructorRows =
					Array.isArray(constructorsRes) && constructorsRes.length ?
						[...constructorsRes].sort((a, b) => {
							const posA = Number(a?.position || 999);
							const posB = Number(b?.position || 999);
							if (posA !== posB) return posA - posB;
							return Number(b?.points || 0) - Number(a?.points || 0);
						})
					:	FALLBACK_CONSTRUCTORS;

				const pointsMap = {};
				for (const row of Array.isArray(driversRes) ? driversRes : []) {
					const code = String(row?.driver_code || '').toUpperCase();
					if (!code) continue;
					pointsMap[code] = Number(row?.points || 0);
				}

				setConstructors(constructorRows);
				setDriverPointsByCode(pointsMap);
			} catch {
				if (!active) return;
				setConstructors(FALLBACK_CONSTRUCTORS);
				setDriverPointsByCode({});
			} finally {
				if (active) setIsLoading(false);
			}
		}

		loadTeams();

		return () => {
			active = false;
		};
	}, []);

	const driversByTeam = useMemo(() => {
		const grouped = {};
		for (const driver of DRIVER_CATALOG) {
			const key = getTeamKey(driver.teamName);
			if (!grouped[key]) grouped[key] = [];
			grouped[key].push(driver);
		}

		for (const key of Object.keys(grouped)) {
			grouped[key].sort((a, b) => {
				const pointsA = Number(
					driverPointsByCode[String(a.code || '').toUpperCase()] ??
						a.careerPoints ??
						0
				);
				const pointsB = Number(
					driverPointsByCode[String(b.code || '').toUpperCase()] ??
						b.careerPoints ??
						0
				);
				if (pointsA !== pointsB) return pointsB - pointsA;
				return a.fullName.localeCompare(b.fullName);
			});
		}

		return grouped;
	}, [driverPointsByCode]);

	const teamRows = useMemo(() => {
		const byKey = new Map();

		for (const row of Array.isArray(constructors) ? constructors : []) {
			byKey.set(getTeamKey(row?.team_name), row);
		}

		for (const [index, teamName] of ROUGH_CONSTRUCTOR_ORDER_2026.entries()) {
			const key = getTeamKey(teamName);
			if (!byKey.has(key)) {
				byKey.set(key, {
					position: index + 1,
					team_name: teamName,
					points: 0,
					wins: 0,
				});
			}
		}

		return Array.from(byKey.values()).sort((a, b) => {
			const posA = Number(a?.position || 999);
			const posB = Number(b?.position || 999);
			if (posA !== posB) return posA - posB;
			return Number(b?.points || 0) - Number(a?.points || 0);
		});
	}, [constructors]);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1800px] mx-auto pb-12 animate-fade-in">
				<div className="mb-7 md:mb-9">
					<h1
						className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white"
						style={{
							fontFamily:
								'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
						}}
					>
						F1 Teams {CURRENT_SEASON}
					</h1>
					<p className="mt-2 text-base text-gray-300 max-w-2xl">
						Find the current Formula 1 teams for the {CURRENT_SEASON} season.
					</p>
				</div>

				{isLoading ?
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{ROUGH_CONSTRUCTOR_ORDER_2026.map((teamName) => {
							const color = getTeamColor(teamName);
							return (
								<div
									key={`teams-loading-${teamName}`}
									className="relative min-h-[290px] rounded-2xl overflow-hidden animate-pulse"
									style={{
										background: `linear-gradient(120deg, ${hexToRgba(darkenHexColor(color, 0.54), 0.3)} 0%, ${hexToRgba(color, 0.24)} 55%, rgba(6,6,8,0.72) 100%)`,
									}}
								/>
							);
						})}
					</div>
				:	<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{teamRows.map((team) => {
							const rawTeamName = team?.team_name || 'Unknown Team';
							const teamKey = getTeamKey(rawTeamName);
							const teamName = getDisplayTeamName(rawTeamName);
							const teamDrivers = driversByTeam[teamKey] || [];
							const teamColor = getTeamColor(rawTeamName);
							const teamLogo = getTeamLogoPath(rawTeamName);
							const carImage = getTeamCarImagePath(rawTeamName);
							const hasCarImage = Boolean(carImage) && !failedCars[teamKey];

							return (
								<div
									key={teamKey}
									className="group relative min-h-[290px] rounded-2xl border border-white/14 overflow-hidden p-6"
									style={{
										background: `linear-gradient(115deg, ${hexToRgba(darkenHexColor(teamColor, 0.52), 0.95)} 0%, ${hexToRgba(teamColor, 0.88)} 52%, ${hexToRgba(teamColor, 0.76)} 100%)`,
										boxShadow: `inset 0 0 0 1px ${hexToRgba(teamColor, 0.35)}`,
									}}
								>
									<div
										className="pointer-events-none absolute inset-0 opacity-55"
										style={{
											backgroundImage:
												'repeating-linear-gradient(0deg, rgba(255,255,255,0.11) 0px, rgba(255,255,255,0.11) 2px, transparent 2px, transparent 14px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 15px)',
										}}
									/>

									<div className="relative z-10 flex items-start justify-between gap-5">
										<div>
											<h2 className="text-4xl md:text-[2.75rem] font-black leading-[0.9] tracking-tight text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
												{teamName}
											</h2>

											<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
												{teamDrivers.slice(0, 2).map((driver) => (
													<div
														key={driver.slug}
														className="inline-flex items-center gap-2 text-white/95"
													>
														<div className="relative h-6 w-6 overflow-hidden rounded-full border border-white/35 bg-black/25">
															<Image
																src={getDriverImagePath(driver.code)}
																alt={driver.fullName}
																fill
																sizes="24px"
																className="object-cover"
															/>
														</div>
														<p className="text-base md:text-lg font-black uppercase tracking-tight">
															{driver.fullName}
														</p>
													</div>
												))}
											</div>

											<div className="mt-5 inline-flex flex-wrap gap-2">
												<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95 inline-flex items-center gap-2">
													<FaTrophy className="text-[10px] text-yellow-300" />P
													{team?.position || '-'}
												</span>
												<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95">
													{Number(team?.points || 0).toFixed(1)} pts
												</span>
												<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95">
													{Number(team?.wins || 0)} wins
												</span>
											</div>
										</div>

										{teamLogo && (
											<div className="relative h-13 w-13 md:h-14 md:w-14 rounded-full border border-white/25 bg-black/25 p-2.5 shrink-0">
												<Image
													src={teamLogo}
													alt={teamName}
													fill
													className="object-contain p-1"
												/>
											</div>
										)}
									</div>

									<div className="absolute inset-x-0 bottom-0 h-[56%] bg-linear-to-t from-black/28 via-transparent to-transparent" />

									{hasCarImage && (
										<div className="absolute left-5 right-5 bottom-1 z-10 h-[48%]">
											<Image
												src={carImage}
												alt={`${teamName} car`}
												fill
												sizes="(max-width: 1024px) 95vw, 44vw"
												className="object-contain object-bottom transition-transform duration-300 group-hover:scale-[1.02]"
												onError={() => {
													setFailedCars((prev) => ({
														...prev,
														[teamKey]: true,
													}));
												}}
											/>
										</div>
									)}

									<Link
										href="/standings"
										className="absolute right-4 bottom-4 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/28 text-white/90 hover:bg-black/38 transition-colors"
										aria-label={`Open standings for ${teamName}`}
									>
										<FaArrowRight className="text-xs" />
									</Link>
								</div>
							);
						})}
					</div>
				}

				<div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-semibold text-gray-300">
					<FaFlagCheckered className="text-red-500" />
					Live constructor order synced for {CURRENT_SEASON}
				</div>
			</div>
		</div>
	);
}
