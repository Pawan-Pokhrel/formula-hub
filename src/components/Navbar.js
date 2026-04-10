// components/Navbar.js
'use client';

import {
	getDriverImagePath,
	getTeamCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { getTelemetryDriverImage } from '@/components/telemetry/telemetryUiUtils';
import { ROUGH_CONSTRUCTOR_ORDER_2026 } from '@/lib/data/constructorStandingsRough';
import { DRIVER_CATALOG } from '@/lib/data/driversCatalog';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	FaCalendarAlt,
	FaChevronDown,
	FaCog,
	FaSignOutAlt,
	FaTrophy,
	FaUserCircle,
} from 'react-icons/fa';

const CENTER_LINK_ITEMS = [
	{ href: '/compare', label: 'Compare' },
	{ href: '/telemetry', label: 'Telemetry' },
	{ href: '/track', label: 'Track', requiresAuth: true },
	{ href: '/predict', label: 'Predict', requiresAuth: true },
	{ href: '/strategy', label: 'Strategy', requiresAuth: true },
];

const MOBILE_LINK_ITEMS = [
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/schedule', label: 'Schedule' },
	{ href: '/standings', label: 'Standings' },
	{ href: '/drivers', label: 'Drivers' },
	{ href: '/teams', label: 'Teams' },
	...CENTER_LINK_ITEMS,
];

const TEAM_SLUG_BY_CODE = {
	mer: 'mercedes',
	fer: 'ferrari',
	rbr: 'redbull-racing',
	mcl: 'mclaren',
	haas: 'haas',
	ast: 'aston-martin',
	wil: 'williams',
	rb: 'racing-bulls',
	alp: 'alpine',
	aud: 'audi',
	cad: 'cadillac',
	sau: 'sauber',
};

const TEAM_CAR_TOKEN_BY_CODE = {
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
	sau: 'audi',
};

const RACE_HUB_ITEMS = [
	{
		href: '/schedule',
		label: 'Schedule',
		description: 'Full race weekend timeline and circuit details.',
		icon: FaCalendarAlt,
	},
	{
		href: '/standings',
		label: 'Standings',
		description: 'Live drivers and constructors championship tables.',
		icon: FaTrophy,
	},
];

function normalizeTeamToken(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function getTeamSlug(teamName) {
	const teamCode = getTeamCode(teamName);
	if (teamCode && TEAM_SLUG_BY_CODE[teamCode])
		return TEAM_SLUG_BY_CODE[teamCode];

	return String(teamName || 'team')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function getTeamCarImagePath(teamName) {
	const teamCode = getTeamCode(teamName);
	const token =
		(teamCode && TEAM_CAR_TOKEN_BY_CODE[teamCode]) ||
		normalizeTeamToken(teamName);
	return token ? `/images/cars/2026${token}carright.png` : null;
}

function hexToRgba(colorHex, alpha) {
	const raw = String(colorHex || '')
		.replace('#', '')
		.trim();
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(107,114,128,${alpha})`;
	const r = parseInt(raw.slice(0, 2), 16);
	const g = parseInt(raw.slice(2, 4), 16);
	const b = parseInt(raw.slice(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

function getTeamAccentStyle(colorHex) {
	return {
		background: `linear-gradient(120deg, ${hexToRgba(colorHex, 0.95)} 0%, ${hexToRgba(colorHex, 0.82)} 62%, ${hexToRgba(colorHex, 0.65)} 100%)`,
		borderColor: hexToRgba(colorHex, 0.58),
	};
}

function getDriverAccentStyle(colorHex) {
	return {
		background: `linear-gradient(120deg, ${hexToRgba(colorHex, 0.88)} 0%, ${hexToRgba(colorHex, 0.74)} 58%, rgba(8,8,10,0.92) 100%)`,
		borderColor: hexToRgba(colorHex, 0.5),
	};
}

function isRouteActive(pathname, href) {
	if (!pathname) return false;
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [megaMenuOpen, setMegaMenuOpen] = useState(null);
	const pathname = usePathname();
	const router = useRouter();
	const { isAuthenticated, user, logout } = useAuth();
	const profileMenuRef = useRef(null);
	const megaMenuRef = useRef(null);
	const closeTimerRef = useRef(null);

	const teamRankByCode = useMemo(() => {
		const rankMap = {};
		ROUGH_CONSTRUCTOR_ORDER_2026.forEach((teamName, index) => {
			const teamCode = getTeamCode(teamName) || normalizeTeamToken(teamName);
			rankMap[teamCode] = index;
		});
		return rankMap;
	}, []);

	const driverCards = useMemo(() => {
		return DRIVER_CATALOG.slice()
			.sort((a, b) => {
				const aCode = getTeamCode(a.teamName) || normalizeTeamToken(a.teamName);
				const bCode = getTeamCode(b.teamName) || normalizeTeamToken(b.teamName);
				const aRank = teamRankByCode[aCode] ?? 999;
				const bRank = teamRankByCode[bCode] ?? 999;
				if (aRank !== bRank) return aRank - bRank;
				if (a.number !== b.number) return a.number - b.number;
				return a.fullName.localeCompare(b.fullName);
			})
			.map((driver) => ({
				...driver,
				imagePath:
					getTelemetryDriverImage(driver.code, 2026) ||
					getDriverImagePath(driver.code),
			}));
	}, [teamRankByCode]);

	const teamCards = useMemo(() => {
		const byCode = new Map();

		for (const driver of DRIVER_CATALOG) {
			const teamCode =
				getTeamCode(driver.teamName) || normalizeTeamToken(driver.teamName);
			if (!byCode.has(teamCode)) {
				byCode.set(teamCode, {
					teamCode,
					teamName: driver.teamName,
					teamColor: driver.teamColor || '#6B7280',
				});
			}
		}

		return Array.from(byCode.values())
			.sort((a, b) => {
				const aRank = teamRankByCode[a.teamCode] ?? 999;
				const bRank = teamRankByCode[b.teamCode] ?? 999;
				if (aRank !== bRank) return aRank - bRank;
				return a.teamName.localeCompare(b.teamName);
			})
			.map((team) => ({
				...team,
				teamSlug: getTeamSlug(team.teamName),
				teamLogo: getTeamLogoPath(team.teamName),
				teamCar: getTeamCarImagePath(team.teamName),
			}));
	}, [teamRankByCode]);

	useEffect(() => {
		if (!profileMenuOpen) return undefined;
		const onMouseDown = (event) => {
			if (!profileMenuRef.current?.contains(event.target)) {
				setProfileMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', onMouseDown);
		return () => document.removeEventListener('mousedown', onMouseDown);
	}, [profileMenuOpen]);

	useEffect(() => {
		if (!megaMenuOpen) return undefined;
		const onMouseDown = (event) => {
			if (!megaMenuRef.current?.contains(event.target)) {
				setMegaMenuOpen(null);
			}
		};
		document.addEventListener('mousedown', onMouseDown);
		return () => document.removeEventListener('mousedown', onMouseDown);
	}, [megaMenuOpen]);

	useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
			}
		};
	}, []);

	const userInitial = (user?.fullName || user?.username || user?.email || 'U')
		.trim()
		.charAt(0)
		.toUpperCase();
	const userAvatarUrl = user?.avatarUrl || null;

	const handleProtectedNavigation = (event, item) => {
		if (isAuthenticated || !item.requiresAuth) return;
		event.preventDefault();
		setIsOpen(false);
		setMegaMenuOpen(null);
		toast.error(`Please log in to access ${item.label}.`);
		router.push(`/login?next=${encodeURIComponent(item.href)}`);
	};

	const clearMenuCloseTimer = () => {
		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	};

	const scheduleMenuClose = () => {
		clearMenuCloseTimer();
		closeTimerRef.current = setTimeout(() => {
			setMegaMenuOpen(null);
		}, 180);
	};

	const openHoverMenu = (menuKey) => {
		clearMenuCloseTimer();
		setMegaMenuOpen(menuKey);
	};

	const collapseHoverMenu = () => {
		clearMenuCloseTimer();
		setMegaMenuOpen(null);
	};

	const desktopLinkClass = (active) =>
		`relative rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
			active ?
				'bg-red-500/12 text-red-100'
			:	'text-gray-200 hover:bg-white/10 hover:text-white'
		}`;

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
			<div className="relative mx-auto flex w-full max-w-[1720px] items-center justify-between px-6 py-3.5">
				<div className="flex items-center gap-3">
					<Link
						href="/"
						className="text-2xl md:text-3xl font-bold tracking-wide text-white hover:text-red-200 transition-colors duration-300 cursor-pointer"
					>
						FormulaHub
					</Link>
				</div>

				<div
					ref={megaMenuRef}
					className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
					onMouseEnter={clearMenuCloseTimer}
					onMouseLeave={scheduleMenuClose}
				>
					<div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-xl">
						<Link
							href="/dashboard"
							prefetch={true}
							onMouseEnter={collapseHoverMenu}
							className={desktopLinkClass(
								isRouteActive(pathname, '/dashboard')
							)}
						>
							Dashboard
						</Link>

						<div
							className="relative"
							onMouseEnter={() => openHoverMenu('race-hub')}
						>
							<button
								type="button"
								className={desktopLinkClass(
									isRouteActive(pathname, '/schedule') ||
										isRouteActive(pathname, '/standings')
								)}
							>
								<span className="inline-flex items-center gap-1.5">
									Race Hub
									<FaChevronDown
										className={`text-[11px] transition-transform ${megaMenuOpen === 'race-hub' ? 'rotate-180' : ''}`}
									/>
								</span>
							</button>

							{megaMenuOpen === 'race-hub' && (
								<div className="absolute left-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-xl border border-white/12 bg-black/92 shadow-[0_18px_35px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
									{RACE_HUB_ITEMS.map((item, index) => {
										const Icon = item.icon;
										return (
											<Link
												key={item.href}
												href={item.href}
												prefetch={true}
												onClick={() => {
													setMegaMenuOpen(null);
												}}
												className="flex items-center gap-2.5 px-3.5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
											>
												<Icon className="text-red-300" />
												<span>{item.label}</span>
												{index === 0 && (
													<span className="ml-auto rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
														Live
													</span>
												)}
											</Link>
										);
									})}
								</div>
							)}
						</div>

						<Link
							href="/drivers"
							prefetch={true}
							onMouseEnter={() => openHoverMenu('drivers')}
							className={desktopLinkClass(isRouteActive(pathname, '/drivers'))}
						>
							<span className="inline-flex items-center gap-1.5">
								Drivers
								<FaChevronDown
									className={`text-[11px] transition-transform ${megaMenuOpen === 'drivers' ? 'rotate-180' : ''}`}
								/>
							</span>
						</Link>

						<Link
							href="/teams"
							prefetch={true}
							onMouseEnter={() => openHoverMenu('teams')}
							className={desktopLinkClass(isRouteActive(pathname, '/teams'))}
						>
							<span className="inline-flex items-center gap-1.5">
								Teams
								<FaChevronDown
									className={`text-[11px] transition-transform ${megaMenuOpen === 'teams' ? 'rotate-180' : ''}`}
								/>
							</span>
						</Link>

						{CENTER_LINK_ITEMS.map((item) => {
							const active = isRouteActive(pathname, item.href);
							return (
								<Link
									key={item.href}
									href={item.href}
									prefetch={true}
									onMouseEnter={collapseHoverMenu}
									onClick={(event) => handleProtectedNavigation(event, item)}
									className={desktopLinkClass(active)}
								>
									{item.label}
								</Link>
							);
						})}
					</div>

					{megaMenuOpen && megaMenuOpen !== 'race-hub' && (
						<div className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-screen -translate-x-1/2 px-5">
							<div className="w-full rounded-2xl border border-white/12 bg-black/94 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
								{megaMenuOpen === 'drivers' && (
									<div>
										<div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
											<div className="mx-auto grid w-[1320px] max-w-full grid-cols-4 gap-x-5 gap-y-2">
												{driverCards.map((driver) => {
													const nameParts = String(driver.fullName || '')
														.trim()
														.split(/\s+/)
														.filter(Boolean);
													const firstName =
														nameParts.length > 1 ?
															nameParts.slice(0, -1).join(' ')
														:	nameParts[0] || driver.shortName;
													const lastName =
														nameParts.length > 1 ?
															nameParts[nameParts.length - 1]
														:	'';

													return (
														<Link
															key={driver.slug}
															href={`/drivers/${driver.slug}`}
															prefetch={true}
															onClick={() => {
																setMegaMenuOpen(null);
															}}
															className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all hover:-translate-y-px hover:brightness-110"
															style={getDriverAccentStyle(driver.teamColor)}
														>
															<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/25 bg-black/20">
																<Image
																	src={driver.imagePath}
																	alt={driver.fullName}
																	fill
																	sizes="48px"
																	className="object-cover object-top scale-[1.12]"
																/>
															</div>
															<p className="truncate text-sm font-semibold text-white group-hover:underline group-hover:decoration-white/80 group-hover:underline-offset-3">
																<span>{firstName}</span>
																{lastName && (
																	<span className="ml-1 font-black uppercase tracking-wide text-white/95">
																		{lastName}
																	</span>
																)}
															</p>
														</Link>
													);
												})}
											</div>
										</div>
									</div>
								)}

								{megaMenuOpen === 'teams' && (
									<div>
										<div className="mb-3 flex items-end justify-between">
											<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-300/85">
												Team Grid
											</p>
											<p className="text-[11px] text-gray-400">
												Cars, logos, and full team pages
											</p>
										</div>
										<div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
											{teamCards.map((team) => (
												<Link
													key={team.teamCode}
													href={`/teams/${team.teamSlug}`}
													prefetch={true}
													onClick={() => {
														setMegaMenuOpen(null);
													}}
													className="group rounded-xl border p-3 transition-all hover:-translate-y-px hover:brightness-110"
													style={getTeamAccentStyle(team.teamColor)}
												>
													<div className="flex items-center justify-between gap-2">
														<p className="truncate text-xs font-bold text-white group-hover:underline group-hover:decoration-white/80 group-hover:underline-offset-3">
															{team.teamName}
														</p>
														{team.teamLogo && (
															<div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-black/18">
																<Image
																	src={team.teamLogo}
																	alt={`${team.teamName} logo`}
																	fill
																	sizes="20px"
																	className="object-contain"
																/>
															</div>
														)}
													</div>
													<div className="relative mt-2 h-12 overflow-hidden rounded-lg border border-white/16 bg-black/18">
														{team.teamCar && (
															<Image
																src={team.teamCar}
																alt={`${team.teamName} car`}
																fill
																sizes="220px"
																className="object-contain object-center"
															/>
														)}
													</div>
												</Link>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				<div className="hidden md:flex items-center gap-3">
					{isAuthenticated ?
						<div
							ref={profileMenuRef}
							className="relative"
						>
							<button
								type="button"
								onClick={() => setProfileMenuOpen((open) => !open)}
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/12"
								aria-label="Open profile menu"
							>
								{userAvatarUrl ?
									<span className="relative h-10 w-10 overflow-hidden rounded-full">
										<Image
											src={userAvatarUrl}
											alt="Profile avatar"
											fill
											sizes="40px"
											unoptimized
											className="object-cover"
										/>
									</span>
								: user?.fullName || user?.username ?
									<span className="text-sm font-bold">{userInitial}</span>
								:	<FaUserCircle className="text-lg" />}
							</button>
							{profileMenuOpen && (
								<div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/12 bg-black/92 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
									<button
										type="button"
										onClick={() => {
											setProfileMenuOpen(false);
											router.push('/profile');
										}}
										className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/10"
									>
										<FaCog className="text-red-300" />
										Profile Settings
									</button>
									<div className="h-px bg-white/10" />
									<button
										type="button"
										onClick={() => {
											setProfileMenuOpen(false);
											logout();
										}}
										className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/10"
									>
										<FaSignOutAlt className="text-red-300" />
										Logout
									</button>
								</div>
							)}
						</div>
					:	<>
							<Link
								href="/login"
								className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
									isRouteActive(pathname, '/login') ?
										'bg-white/10 text-white'
									:	'text-gray-200 hover:text-white hover:bg-white/10'
								}`}
								prefetch={true}
							>
								Login
							</Link>
							<Link
								href="/register"
								className="bg-linear-to-r from-red-600 to-red-700 px-4 py-2 rounded-full font-bold text-white hover:from-red-500 hover:to-red-600 transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 cursor-pointer"
								prefetch={true}
							>
								Register
							</Link>
						</>
					}
				</div>

				<button
					className="md:hidden relative h-10 w-10 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors duration-300 focus:outline-none cursor-pointer"
					onClick={() => setIsOpen(!isOpen)}
					aria-label="Toggle menu"
				>
					<span
						className={`absolute left-1/2 top-[11px] h-0.5 w-5 -translate-x-1/2 bg-white transition-all duration-300 ${
							isOpen ? 'translate-y-1.5 rotate-45' : ''
						}`}
					/>
					<span
						className={`absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 bg-white transition-all duration-300 ${
							isOpen ? 'opacity-0' : 'opacity-100'
						}`}
					/>
					<span
						className={`absolute left-1/2 bottom-[11px] h-0.5 w-5 -translate-x-1/2 bg-white transition-all duration-300 ${
							isOpen ? '-translate-y-1.5 -rotate-45' : ''
						}`}
					/>
				</button>
			</div>

			{isOpen && (
				<div className="lg:hidden px-6 pb-5 pt-1 animate-fade-in">
					<div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl p-3 flex flex-col gap-1.5">
						{MOBILE_LINK_ITEMS.map((item) => {
							const active = isRouteActive(pathname, item.href);

							return (
								<Link
									key={item.href}
									href={item.href}
									prefetch={true}
									onClick={(event) => {
										handleProtectedNavigation(event, item);
										if (!event.defaultPrevented) setIsOpen(false);
									}}
									className={`relative px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
										active ? 'text-red-200' : (
											'text-gray-200 hover:bg-white/10 hover:text-white'
										)
									}`}
								>
									<span className="inline-flex items-center gap-1.5">
										{item.label}
									</span>
									<span
										className={`absolute left-3.5 right-3.5 bottom-1 h-0.5 rounded-full bg-red-400 transition-opacity duration-300 ${
											active ? 'opacity-100' : 'opacity-0'
										}`}
									/>
								</Link>
							);
						})}

						<div className="my-1 h-px bg-white/10" />

						{isAuthenticated ?
							<>
								<button
									type="button"
									onClick={() => {
										setIsOpen(false);
										router.push('/profile');
									}}
									className="mt-1 bg-white/10 px-4 py-2.5 rounded-xl font-bold text-white hover:bg-white/15 transition-all duration-300 text-center cursor-pointer"
								>
									Profile Settings
								</button>
								<button
									type="button"
									onClick={() => {
										setIsOpen(false);
										logout();
									}}
									className="mt-1 bg-white/10 px-4 py-2.5 rounded-xl font-bold text-white hover:bg-white/15 transition-all duration-300 text-center cursor-pointer"
								>
									Logout
								</button>
							</>
						:	<>
								<Link
									href="/login"
									prefetch={true}
									onClick={() => setIsOpen(false)}
									className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
										isRouteActive(pathname, '/login') ?
											'bg-white/10 text-white'
										:	'text-gray-200 hover:bg-white/10 hover:text-white'
									}`}
								>
									Login
								</Link>
								<Link
									href="/register"
									prefetch={true}
									onClick={() => setIsOpen(false)}
									className="mt-1 bg-linear-to-r from-red-600 to-red-700 px-4 py-2.5 rounded-xl font-bold text-white hover:from-red-500 hover:to-red-600 transition-all duration-300 text-center cursor-pointer"
								>
									Register
								</Link>
							</>
						}
					</div>
				</div>
			)}
		</nav>
	);
}
