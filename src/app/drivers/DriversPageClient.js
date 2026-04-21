'use client';

import { getTeamLogoPath } from '@/components/schedule/scheduleHelpers';
import {
  getConstructorStandings,
  getDriverStandings,
} from '@/lib/api/standingsApi';
import {
  ROUGH_CONSTRUCTOR_ORDER_2026,
  readConstructorRankCache,
  writeConstructorRankCache,
} from '@/lib/data/constructorStandingsRough';
import {
  CURRENT_SEASON,
  DRIVER_CATALOG,
  getAllTeams,
} from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowRight, FaChevronDown, FaSearch } from 'react-icons/fa';

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
	'british-swedish': 'gbr',
	'new zealander': 'nzl',
};

const NATIONALITY_COUNTRY_MAP = {
	australian: 'Australia',
	argentine: 'Argentina',
	brazilian: 'Brazil',
	british: 'United Kingdom',
	canadian: 'Canada',
	dutch: 'Netherlands',
	finnish: 'Finland',
	french: 'France',
	german: 'Germany',
	italian: 'Italy',
	mexican: 'Mexico',
	monacan: 'Monaco',
	spanish: 'Spain',
	'thai-british': 'Thailand',
	'thai british': 'Thailand',
	'new zealander': 'New Zealand',
};

const DISPLAY_NUMBER_OVERRIDES = {
	'max-verstappen': 3,
	'lando-norris': 1,
};

const IMAGE_FIRST_NAME_OVERRIDES = {
	'kimi-antonelli': 'and',
};

function getNationalityFlagCode(nationality) {
	if (!nationality) return null;
	const normalized = String(nationality).trim().toLowerCase();
	return NATIONALITY_FLAG_MAP[normalized] || null;
}

function getCountryNameFromNationality(nationality) {
	if (!nationality) return 'Unknown';
	const normalized = String(nationality).trim().toLowerCase();
	return NATIONALITY_COUNTRY_MAP[normalized] || nationality;
}

function getDisplayNumber(driver) {
	return DISPLAY_NUMBER_OVERRIDES[driver.slug] ?? driver.number;
}

function getDriverCardImagePath(driver) {
	const teamToken = String(driver.teamName || '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
	const nameParts = String(driver.fullName || '')
		.trim()
		.toLowerCase()
		.split(/\s+/);
	const firstToken =
		IMAGE_FIRST_NAME_OVERRIDES[driver.slug] ||
		String(nameParts[0] || '').slice(0, 3);
	const lastToken = String(nameParts[nameParts.length - 1] || '').slice(0, 3);
	return `/images/drivers/${CURRENT_SEASON}${teamToken}${firstToken}${lastToken}01right.png`;
}

function normalizeName(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ');
}

function getTeamKey(teamName) {
	const logoPath = getTeamLogoPath(teamName);
	if (logoPath) {
		return logoPath.replace('/images/teams/', '').replace('.png', '');
	}
	return normalizeName(teamName);
}

function getTeamColor(teamName) {
	const match = DRIVER_CATALOG.find((driver) => driver.teamName === teamName);
	return match?.teamColor || '#6B7280';
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

const FALLBACK_TEAM_ORDER = Object.fromEntries(
	Array.from(new Set(DRIVER_CATALOG.map((driver) => driver.teamName))).map(
		(teamName, index) => [getTeamKey(teamName), index]
	)
);

const ROUGH_SEED_TEAM_RANK = Object.fromEntries(
	ROUGH_CONSTRUCTOR_ORDER_2026.map((teamName, index) => [
		getTeamKey(teamName),
		index,
	])
);

const DRIVER_POINTS_CACHE_KEY = `formulahub.drivers.points.v1.${CURRENT_SEASON}`;
const DRIVER_POINTS_CACHE_TTL_MS = 5 * 60 * 1000;

function readDriverPointsCache() {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.sessionStorage.getItem(DRIVER_POINTS_CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		if (!parsed.points || typeof parsed.points !== 'object') return null;
		if (!Number.isFinite(Number(parsed.updatedAt))) return null;
		if (Date.now() - Number(parsed.updatedAt) > DRIVER_POINTS_CACHE_TTL_MS)
			return null;
		return parsed.points;
	} catch {
		return null;
	}
}

function writeDriverPointsCache(pointsBySlug) {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(
			DRIVER_POINTS_CACHE_KEY,
			JSON.stringify({ points: pointsBySlug, updatedAt: Date.now() })
		);
	} catch {
		// Ignore cache write issues.
	}
}

export default function DriversPage() {
	const [query, setQuery] = useState('');
	const [team, setTeam] = useState('All Teams');
	const [constructorRankByKey, setConstructorRankByKey] =
		useState(ROUGH_SEED_TEAM_RANK);
	const [driverPointsBySlug, setDriverPointsBySlug] = useState({});
	const [isStandingsResolved, setIsStandingsResolved] = useState(false);
	const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
	const teamMenuRef = useRef(null);
	const teams = useMemo(() => ['All Teams', ...getAllTeams()], []);
	const teamOptions = useMemo(
		() =>
			teams.map((teamName) => ({
				name: teamName,
				logo: teamName === 'All Teams' ? null : getTeamLogoPath(teamName),
				color: teamName === 'All Teams' ? '#6B7280' : getTeamColor(teamName),
			})),
		[teams]
	);
	const orderedSkeletonTeams = useMemo(
		() =>
			teamOptions
				.filter((option) => option.name !== 'All Teams')
				.sort((a, b) => {
					const rankA =
						constructorRankByKey[getTeamKey(a.name)] ??
						ROUGH_SEED_TEAM_RANK[getTeamKey(a.name)] ??
						FALLBACK_TEAM_ORDER[getTeamKey(a.name)] ??
						Number.MAX_SAFE_INTEGER;
					const rankB =
						constructorRankByKey[getTeamKey(b.name)] ??
						ROUGH_SEED_TEAM_RANK[getTeamKey(b.name)] ??
						FALLBACK_TEAM_ORDER[getTeamKey(b.name)] ??
						Number.MAX_SAFE_INTEGER;
					return rankA - rankB;
				}),
		[teamOptions, constructorRankByKey]
	);
	const skeletonCards = useMemo(
		() =>
			orderedSkeletonTeams.flatMap((teamOption) => [
				{ ...teamOption, slot: 1 },
				{ ...teamOption, slot: 2 },
			]),
		[orderedSkeletonTeams]
	);

	useEffect(() => {
		let mounted = true;

		const cachedRank = readConstructorRankCache();
		const cachedPoints = readDriverPointsCache();
		if (cachedRank && mounted) {
			setConstructorRankByKey((prev) => ({ ...prev, ...cachedRank }));
		}
		if (cachedPoints && mounted) {
			setDriverPointsBySlug(cachedPoints);
		}
		if ((cachedRank && Object.keys(cachedRank).length) || cachedPoints) {
			setIsStandingsResolved(true);
		}

		async function loadStandingsOrder() {
			try {
				const [constructors, drivers] = await Promise.all([
					getConstructorStandings(CURRENT_SEASON),
					getDriverStandings(CURRENT_SEASON),
				]);

				if (!mounted) return;

				const sortedConstructors = [
					...(Array.isArray(constructors) ? constructors : []),
				].sort((a, b) => {
					const positionA = Number(a?.position || 999);
					const positionB = Number(b?.position || 999);
					if (positionA !== positionB) return positionA - positionB;
					return Number(b?.points || 0) - Number(a?.points || 0);
				});

				const nextConstructorRankByKey = {};
				sortedConstructors.forEach((row, index) => {
					nextConstructorRankByKey[getTeamKey(row?.team_name)] = index;
				});

				const driverByCode = Object.fromEntries(
					DRIVER_CATALOG.map((driver) => [
						String(driver.code || '').toUpperCase(),
						driver,
					])
				);
				const driverByName = Object.fromEntries(
					DRIVER_CATALOG.map((driver) => [
						normalizeName(driver.fullName),
						driver,
					])
				);

				const nextDriverPointsBySlug = {};
				for (const row of Array.isArray(drivers) ? drivers : []) {
					const code = String(row?.driver_code || '').toUpperCase();
					const fromCode = driverByCode[code];
					const fromName = driverByName[normalizeName(row?.driver_name)];
					const match = fromCode || fromName;
					if (!match) continue;
					nextDriverPointsBySlug[match.slug] = Number(row?.points || 0);
				}

				setConstructorRankByKey(nextConstructorRankByKey);
				setDriverPointsBySlug(nextDriverPointsBySlug);
				writeConstructorRankCache(nextConstructorRankByKey);
				writeDriverPointsCache(nextDriverPointsBySlug);
			} catch {
				if (!mounted) return;
				const cachedOnFailure = readConstructorRankCache();
				const pointsOnFailure = readDriverPointsCache();
				setConstructorRankByKey(
					cachedOnFailure && Object.keys(cachedOnFailure).length ?
						{ ...ROUGH_SEED_TEAM_RANK, ...cachedOnFailure }
					:	ROUGH_SEED_TEAM_RANK
				);
				setDriverPointsBySlug(pointsOnFailure || {});
			} finally {
				if (!mounted) return;
				setIsStandingsResolved(true);
			}
		}

		loadStandingsOrder();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		function handleOutsideClick(event) {
			if (!teamMenuRef.current) return;
			if (!teamMenuRef.current.contains(event.target)) {
				setIsTeamMenuOpen(false);
			}
		}

		document.addEventListener('mousedown', handleOutsideClick);
		return () => document.removeEventListener('mousedown', handleOutsideClick);
	}, []);

	const filteredDrivers = useMemo(() => {
		const q = query.trim().toLowerCase();

		return DRIVER_CATALOG.filter((driver) => {
			const countryName = getCountryNameFromNationality(driver.nationality);
			const matchesTeam = team === 'All Teams' || driver.teamName === team;
			const matchesQuery =
				q.length === 0 ||
				driver.fullName.toLowerCase().includes(q) ||
				driver.code.toLowerCase().includes(q) ||
				driver.teamName.toLowerCase().includes(q) ||
				driver.nationality.toLowerCase().includes(q) ||
				countryName.toLowerCase().includes(q);
			return matchesTeam && matchesQuery;
		}).sort((a, b) => {
			const teamRankA =
				constructorRankByKey[getTeamKey(a.teamName)] ??
				FALLBACK_TEAM_ORDER[getTeamKey(a.teamName)] ??
				Number.MAX_SAFE_INTEGER;
			const teamRankB =
				constructorRankByKey[getTeamKey(b.teamName)] ??
				FALLBACK_TEAM_ORDER[getTeamKey(b.teamName)] ??
				Number.MAX_SAFE_INTEGER;
			if (teamRankA !== teamRankB) return teamRankA - teamRankB;

			const pointsA = Number(driverPointsBySlug[a.slug] ?? a.careerPoints ?? 0);
			const pointsB = Number(driverPointsBySlug[b.slug] ?? b.careerPoints ?? 0);
			if (pointsA !== pointsB) return pointsB - pointsA;

			return a.fullName.localeCompare(b.fullName);
		});
	}, [query, team, constructorRankByKey, driverPointsBySlug]);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1800px] mx-auto pb-12 animate-fade-in">
				<div className="mb-6 md:mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="text-3xl md:text-4xl font-black uppercase tracking-wide inline-flex items-center gap-3">
							F1 Drivers 2026
						</h1>
						<p className="mt-2 text-sm text-gray-300 max-w-2xl">
							Find the current Formula 1 drivers for the 2026 season.
						</p>
					</div>
				</div>

				<div className="mb-7 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
					<label className="relative block">
						<FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search driver, team, or country"
							className="w-full rounded-2xl border border-white/15 bg-linear-to-r from-black/70 via-black/45 to-black/70 backdrop-blur-2xl py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-white/35 focus:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
						/>
					</label>

					<div
						className="relative"
						ref={teamMenuRef}
					>
						<button
							type="button"
							onClick={() => setIsTeamMenuOpen((prev) => !prev)}
							className="w-full rounded-2xl border border-white/15 bg-linear-to-r from-black/70 via-black/45 to-black/70 backdrop-blur-2xl px-4 py-3.5 text-sm text-white flex items-center justify-between gap-3 hover:border-white/30 transition-colors"
						>
							<span className="inline-flex items-center gap-3 min-w-0">
								{team !== 'All Teams' && (
									<Image
										src={getTeamLogoPath(team)}
										alt={team}
										width={20}
										height={20}
										className="object-contain shrink-0"
									/>
								)}
								<span className="truncate">{team}</span>
							</span>
							<FaChevronDown
								className={`text-xs text-gray-300 transition-transform ${isTeamMenuOpen ? 'rotate-180' : ''}`}
							/>
						</button>

						{isTeamMenuOpen && (
							<div className="absolute z-40 mt-2 w-full rounded-2xl border border-white/15 bg-black/90 backdrop-blur-2xl p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.45)] max-h-80 overflow-y-auto">
								{teamOptions.map((option) => (
									<button
										key={option.name}
										type="button"
										onClick={() => {
											setTeam(option.name);
											setIsTeamMenuOpen(false);
										}}
										className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 hover:bg-white/10 transition-colors"
										style={{
											background:
												option.name === team ?
													`linear-gradient(90deg, ${option.color}2E 0%, transparent 90%)`
												:	undefined,
										}}
									>
										{option.logo && (
											<Image
												src={option.logo}
												alt={option.name}
												width={20}
												height={20}
												className="object-contain shrink-0"
											/>
										)}
										<span className="text-sm text-white truncate">
											{option.name}
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{!isStandingsResolved ?
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
						{skeletonCards.map((teamOption) => (
							<div
								key={`skeleton-${teamOption.name}-${teamOption.slot}`}
								className="relative h-72 rounded-xl overflow-hidden"
								style={{
									background: `linear-gradient(120deg, ${hexToRgba(darkenHexColor(teamOption.color, 0.52), 0.18)} 0%, ${hexToRgba(darkenHexColor(teamOption.color, 0.44), 0.16)} 58%, rgba(8,8,10,0.62) 100%)`,
								}}
							/>
						))}
					</div>
				:	<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
						{filteredDrivers.map((driver) => {
							const driverImage = getDriverCardImagePath(driver);
							const teamLogo = getTeamLogoPath(driver.teamName);
							const flagCode = getNationalityFlagCode(driver.nationality);
							const countryName = getCountryNameFromNationality(
								driver.nationality
							);
							const displayNumber = getDisplayNumber(driver);

							return (
								<Link
									key={driver.slug}
									href={`/drivers/${driver.slug}`}
									className="group relative h-72 rounded-xl border border-white/15 overflow-hidden p-3.5 cursor-pointer hover:border-white/30 transition-all duration-300"
									style={{
										background: `linear-gradient(120deg, ${driver.teamColor}CC 0%, ${driver.teamColor}B8 58%, rgba(8,8,10,0.92) 100%)`,
									}}
								>
									<div
										className="pointer-events-none absolute inset-0 opacity-60"
										style={{
											backgroundImage:
												'repeating-linear-gradient(0deg, rgba(255,255,255,0.11) 0px, rgba(255,255,255,0.11) 2px, transparent 2px, transparent 14px), repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 2px, transparent 2px, transparent 16px)',
										}}
									/>

									<div className="relative z-10 flex h-full">
										<div className="w-[60%] flex flex-col">
											<h2 className="text-[35px] leading-[0.95] font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
												{driver.fullName.split(' ')[0]}
												<br />
												{driver.fullName.split(' ').slice(1).join(' ')}
											</h2>
											<p className="text-sm font-semibold text-white/90 mt-1">
												{driver.teamName}
											</p>
											<p className="mt-4 text-[46px] leading-none font-black italic text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.35)]">
												{displayNumber}
											</p>
											<div className="mt-auto inline-flex items-center gap-2">
												{flagCode && (
													<div className="h-5 overflow-hidden  border-2 border-white rounded-sm bg-black/25">
														<Image
															src={`/images/flags/${flagCode}.png`}
															alt={`${countryName} flag`}
															width={28}
															height={20}
															className="h-full w-auto"
															onError={(event) => {
																event.currentTarget.style.display = 'none';
															}}
														/>
													</div>
												)}
												<span className="text-xs font-semibold text-white/95 tracking-wide">
													{countryName}
												</span>
											</div>
										</div>

										<div className="w-[40%] relative">
											{teamLogo && (
												<div className="absolute top-0 right-0 z-20 h-11 w-11 rounded-lg bg-black/30 border border-white/20 p-1">
													<Image
														src={teamLogo}
														alt={driver.teamName}
														fill
														className="object-contain p-1"
													/>
												</div>
											)}
											<div className="absolute left-[-50%] bottom-[-35%] h-[280px] w-[200%]">
												<Image
													src={driverImage}
													alt={driver.fullName}
													fill
													className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
													style={{ objectPosition: '44% -8px' }}
												/>
											</div>
										</div>
									</div>

									<div
										className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center justify-center h-7 w-7 rounded-full border border-white/20 bg-black/30 opacity-0 translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
										style={{ color: driver.teamColor }}
									>
										<FaArrowRight className="text-xs" />
									</div>
								</Link>
							);
						})}
					</div>
				}
			</div>
		</div>
	);
}
