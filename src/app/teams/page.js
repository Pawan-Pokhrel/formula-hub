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

const IMAGE_FIRST_NAME_OVERRIDES = {
	'kimi-antonelli': 'and',
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
	if (!teamKey) return [];

	const keyBasedPath = `/images/cars/${CURRENT_SEASON}_${teamKey}_carright.png`;
	const legacyToken =
		TEAM_CAR_TOKEN_BY_KEY[teamKey] ||
		String(teamName || '')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '');
	const legacyPath =
		legacyToken ?
			`/images/cars/${CURRENT_SEASON}${legacyToken}carright.png`
		:	null;

	return Array.from(new Set([keyBasedPath, legacyPath].filter(Boolean)));
}

function getDriverTeamCardImagePath(driver) {
	const teamToken = String(driver?.teamName || '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
	const nameParts = String(driver?.fullName || '')
		.trim()
		.toLowerCase()
		.split(/\s+/);
	const firstToken =
		IMAGE_FIRST_NAME_OVERRIDES[driver?.slug] ||
		String(nameParts[0] || '').slice(0, 3);
	const lastToken = String(nameParts[nameParts.length - 1] || '').slice(0, 3);

	if (!teamToken || !firstToken || !lastToken) return null;
	return `/images/drivers/${CURRENT_SEASON}${teamToken}${firstToken}${lastToken}01right.png`;
}

function splitDriverName(fullName) {
	const parts = String(fullName || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length <= 1) {
		return {
			firstName: parts[0] || fullName,
			lastName: '',
		};
	}

	return {
		firstName: parts.slice(0, -1).join(' '),
		lastName: parts[parts.length - 1],
	};
}

function formatPoints(value) {
	const num = Number(value || 0);
	if (!Number.isFinite(num)) return '0';
	return Number.isInteger(num) ? String(num) : num.toFixed(1);
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
							const carImageCandidates = getTeamCarImagePath(rawTeamName);
							const failedCount = Number(failedCars[teamKey] || 0);
							const carImage = carImageCandidates[failedCount] || null;
							const hasCarImage = Boolean(carImage);

							return (
								<div
									key={teamKey}
									className="group relative min-h-[290px] rounded-2xl border border-white/14 overflow-hidden p-6 pt-7"
									style={{
										background: `linear-gradient(115deg, ${hexToRgba(darkenHexColor(teamColor, 0.52), 0.95)} 0%, ${hexToRgba(teamColor, 0.88)} 52%, ${hexToRgba(teamColor, 0.76)} 100%)`,
										boxShadow: `inset 0 0 0 1px ${hexToRgba(teamColor, 0.35)}`,
									}}
								>
									<div
										className="pointer-events-none absolute inset-0 opacity-55"
										style={{
											backgroundImage:
												'linear-gradient(90deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 36%, transparent 74%), linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 44%), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 18px)',
										}}
									/>
									<div
										className="pointer-events-none absolute left-0 right-0 bottom-[16%] h-[42%] opacity-34 mix-blend-screen"
										style={{
											backgroundImage:
												'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.24) 1px, transparent 1.4px), linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.3) 48%, rgba(255,255,255,0.14) 68%, transparent 100%), repeating-linear-gradient(90deg, transparent 0px, transparent 32px, rgba(255,255,255,0.16) 32px, rgba(255,255,255,0.16) 38px, transparent 38px, transparent 82px)',
											backgroundSize: '6px 6px, 100% 100%, 100% 100%',
											filter: 'blur(0.2px)',
										}}
									/>

									<div className="relative z-10 flex items-start justify-between gap-5">
										<div>
											<h2 className="text-4xl md:text-[2.75rem] font-black leading-[0.9] tracking-tight text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
												{teamName}
											</h2>

											<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
												{teamDrivers.slice(0, 2).map((driver) => {
													const { firstName, lastName } = splitDriverName(
														driver.fullName
													);

													return (
														<div
															key={driver.slug}
															className="inline-flex items-center gap-2.5 text-white/95"
														>
															<div className="relative h-7 w-7 md:h-8 md:w-8 overflow-hidden rounded-full border border-white/35 bg-black/25">
																<Image
																	src={
																		getDriverTeamCardImagePath(driver) ||
																		getDriverImagePath(driver.code)
																	}
																	alt={driver.fullName}
																	fill
																	sizes="32px"
																	className="object-cover"
																/>
															</div>
															<p className="text-base md:text-lg tracking-tight">
																<span
																	className="font-normal normal-case text-white/95"
																	style={{
																		fontFamily:
																			'Lucida Handwriting, Brush Script MT, Segoe Script, cursive',
																	}}
																>
																	{firstName}
																</span>
																{lastName && (
																	<span className="ml-1 font-black uppercase text-white">
																		{lastName}
																	</span>
																)}
															</p>
														</div>
													);
												})}
											</div>

											<div className="mt-5 inline-flex flex-wrap gap-2">
												<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95 inline-flex items-center gap-2">
													<FaTrophy className="text-[10px] text-yellow-300" />P
													{team?.position || '-'}
												</span>
												<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95">
													{formatPoints(team?.points)} pts
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
									<div
										className="pointer-events-none absolute inset-x-0 bottom-[18%] h-10 opacity-55"
										style={{
											backgroundImage: `linear-gradient(90deg, transparent 0%, ${hexToRgba(teamColor, 0.5)} 35%, ${hexToRgba(teamColor, 0.66)} 50%, ${hexToRgba(teamColor, 0.5)} 65%, transparent 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 26px, rgba(255,255,255,0.22) 26px, rgba(255,255,255,0.22) 30px, rgba(255,255,255,0) 30px, rgba(255,255,255,0) 60px)`,
											filter: 'blur(10px)',
										}}
									/>

									{hasCarImage && (
										<div className="absolute left-4 right-12 bottom-3 z-10 h-[46%]">
											<Image
												src={carImage}
												alt={`${teamName} car`}
												fill
												sizes="(max-width: 1024px) 95vw, 44vw"
												className="object-contain object-bottom transition-transform duration-300 group-hover:scale-[1.02]"
												style={{ objectPosition: 'left bottom' }}
												onError={() => {
													setFailedCars((prev) => ({
														...prev,
														[teamKey]: Number(prev[teamKey] || 0) + 1,
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
