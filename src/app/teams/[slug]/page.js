import CenterSnapRollerClient from '@/components/navigation/CenterSnapRollerClient';
import {
	getTeamCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { CURRENT_SEASON, DRIVER_CATALOG } from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	FaArrowLeft,
	FaArrowRight,
	FaCalendarAlt,
	FaFlagCheckered,
	FaTrophy,
} from 'react-icons/fa';
import TeamSeasonStatsClient from './TeamSeasonStatsClient';

const TEAM_META_BY_KEY = {
	mer: {
		displayName: 'Mercedes',
		slug: 'mercedes',
		base: 'Brackley, United Kingdom',
		founded: '2010',
		summary:
			'Factory precision and long-run consistency remain core Mercedes strengths in modern Formula 1.',
	},
	fer: {
		displayName: 'Ferrari',
		slug: 'ferrari',
		base: 'Maranello, Italy',
		founded: '1950',
		summary:
			'Ferrari blends heritage and raw pace, with a relentless focus on qualifying speed and race execution.',
	},
	rbr: {
		displayName: 'RedBull Racing',
		slug: 'redbull-racing',
		base: 'Milton Keynes, United Kingdom',
		founded: '2005',
		summary:
			'An aggressive, high-downforce philosophy and elite race operations define RedBull Racing performance.',
	},
	mcl: {
		displayName: 'McLaren',
		slug: 'mclaren',
		base: 'Woking, United Kingdom',
		founded: '1966',
		summary:
			'McLaren combines aerodynamic efficiency and strategic discipline to stay in the front-running battle.',
	},
	haas: {
		displayName: 'Haas F1 Team',
		slug: 'haas',
		base: 'Kannapolis, United States',
		founded: '2016',
		summary:
			'Haas focuses on maximizing race weekends through efficient setup direction and opportunistic strategy calls.',
	},
	ast: {
		displayName: 'Aston Martin',
		slug: 'aston-martin',
		base: 'Silverstone, United Kingdom',
		founded: '2021',
		summary:
			'Aston Martin emphasizes balanced race pace and tactical flexibility across varied circuit profiles.',
	},
	wil: {
		displayName: 'Williams',
		slug: 'williams',
		base: 'Grove, United Kingdom',
		founded: '1977',
		summary:
			'Williams is rebuilding with structured development and steady points-scoring racecraft.',
	},
	rb: {
		displayName: 'Racing Bulls',
		slug: 'racing-bulls',
		base: 'Faenza, Italy',
		founded: '2006',
		summary:
			'Racing Bulls delivers sharp qualifying sessions and dynamic race-day adaptation from a compact operation.',
	},
	alp: {
		displayName: 'Alpine',
		slug: 'alpine',
		base: 'Enstone, United Kingdom',
		founded: '2021',
		summary:
			'Alpine continues to evolve with a technical-first approach and incremental gains over full race distance.',
	},
	aud: {
		displayName: 'Audi',
		slug: 'audi',
		base: 'Hinwil, Switzerland',
		founded: '2026',
		summary:
			'Audi enters the grid with long-term factory ambitions centered on efficient engineering cycles.',
	},
	cad: {
		displayName: 'Cadillac',
		slug: 'cadillac',
		base: 'United States',
		founded: '2026',
		summary:
			'Cadillac brings a new factory-backed identity, targeting rapid growth in race management and pace.',
	},
	sau: {
		displayName: 'Sauber',
		slug: 'sauber',
		base: 'Hinwil, Switzerland',
		founded: '1993',
		summary:
			'Sauber emphasizes disciplined execution and development continuity while preparing for future evolution.',
	},
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
	sau: 'sauber',
};

const IMAGE_FIRST_NAME_OVERRIDES = {
	'kimi-antonelli': 'and',
};

const TEAM_DRIVER_IMAGE_TOKEN_BY_KEY = {
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
	sau: 'sauber',
};

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

function getDriverTeamCardImagePath(driver) {
	const teamKey = getTeamKey(driver?.teamName);
	const teamToken =
		TEAM_DRIVER_IMAGE_TOKEN_BY_KEY[teamKey] ||
		String(driver?.teamName || '')
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

	const safeFirst =
		firstToken ||
		String(driver?.code || 'drv')
			.slice(0, 3)
			.toLowerCase();
	const safeLast =
		lastToken ||
		String(driver?.code || 'img')
			.slice(-3)
			.toLowerCase();
	return `/images/drivers/${CURRENT_SEASON}${teamToken}${safeFirst}${safeLast}01right.png`;
}

function getTeamFromSlug(slug) {
	const entry = Object.entries(TEAM_META_BY_KEY).find(
		([, meta]) => meta.slug === slug
	);
	if (entry) return { teamKey: entry[0], ...entry[1] };

	const inferred = DRIVER_CATALOG.find(
		(driver) => normalizeName(driver.teamName).replace(/\s+/g, '-') === slug
	);
	if (!inferred) return null;

	const teamKey = getTeamKey(inferred.teamName);
	const meta = TEAM_META_BY_KEY[teamKey];
	if (!meta) return null;
	return { teamKey, ...meta };
}

export async function generateStaticParams() {
	return Object.values(TEAM_META_BY_KEY).map((team) => ({ slug: team.slug }));
}

export default async function TeamDetailPage({ params }) {
	const resolvedParams = await params;
	const selectedTeam = getTeamFromSlug(resolvedParams?.slug);
	if (!selectedTeam) notFound();

	const { teamKey, displayName, base, founded, summary } = selectedTeam;
	const teamDrivers = DRIVER_CATALOG.filter(
		(driver) => getTeamKey(driver.teamName) === teamKey
	).sort((a, b) => Number(a.number || 999) - Number(b.number || 999));

	if (!teamDrivers.length) notFound();

	const sourceTeamName = teamDrivers[0].teamName;
	const teamColor = teamDrivers[0].teamColor || '#6B7280';
	const teamLogo = getTeamLogoPath(sourceTeamName);
	const carToken = TEAM_CAR_TOKEN_BY_KEY[teamKey] || teamKey;
	const teamCarImage = `/images/cars/${CURRENT_SEASON}${carToken}carright.png`;
	const teamRollerItems = Object.entries(TEAM_META_BY_KEY).map(
		([key, meta]) => {
			const firstDriver = DRIVER_CATALOG.find(
				(candidate) => getTeamKey(candidate.teamName) === key
			);
			const sourceName = firstDriver?.teamName || meta.displayName;
			return {
				id: key,
				href: `/teams/${meta.slug}`,
				label: meta.displayName,
				color: firstDriver?.teamColor || '#6B7280',
				logo: getTeamLogoPath(sourceName),
			};
		}
	);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1400px] mx-auto pb-12 animate-fade-in">
				<Link
					href="/teams"
					className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors mb-5"
				>
					<FaArrowLeft className="text-red-500" />
					Back to Teams
				</Link>

				<div className="mb-4">
					<CenterSnapRollerClient
						items={teamRollerItems}
						activeId={teamKey}
						ariaLabel="Team page roller"
					/>
				</div>

				<section
					className="relative overflow-hidden rounded-3xl border border-white/15 p-6 md:p-8"
					style={{
						background: `linear-gradient(112deg, ${teamColor}D6 0%, ${teamColor}BB 54%, rgba(8,8,10,0.88) 100%)`,
						boxShadow: `inset 0 0 0 1px ${teamColor}66`,
					}}
				>
					<div
						className="pointer-events-none absolute inset-0 opacity-50"
						style={{
							backgroundImage:
								'linear-gradient(90deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 34%, transparent 72%), repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 14px)',
						}}
					/>

					<div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-6 min-h-[360px]">
						<div className="flex flex-col justify-between">
							<div>
								<h1
									className="text-5xl md:text-6xl font-semibold tracking-[-0.015em] leading-[0.96] text-white"
									style={{
										fontFamily:
											'Sora, Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
									}}
								>
									{displayName}
								</h1>
								<p className="mt-3 max-w-2xl text-white/90 text-sm md:text-base">
									{summary}
								</p>
							</div>

							<div className="mt-5 inline-flex flex-wrap gap-2">
								<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95 inline-flex items-center gap-2">
									<FaCalendarAlt className="text-[10px]" />
									Founded {founded}
								</span>
								<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95">
									Base: {base}
								</span>
								<span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/95">
									{teamDrivers.length} drivers
								</span>
							</div>
						</div>

						<div className="relative">
							{teamLogo && (
								<div className="absolute top-1 right-1 z-20 h-14 w-14 rounded-full border border-white/30 bg-black/20 p-2.5">
									<Image
										src={teamLogo}
										alt={displayName}
										fill
										className="object-contain p-1"
									/>
								</div>
							)}

							<div className="absolute left-0 right-0 bottom-0 h-[70%]">
								<Image
									src={teamCarImage}
									alt={`${displayName} car`}
									fill
									sizes="(max-width: 1024px) 90vw, 42vw"
									className="object-contain object-bottom"
								/>
							</div>
						</div>
					</div>
				</section>

				<section className="mt-4 rounded-3xl border border-white/14 bg-linear-to-br from-white/10 via-white/4 to-transparent p-5 md:p-6">
					<h2 className="text-xl md:text-2xl font-black inline-flex items-center gap-2">
						<FaFlagCheckered className="text-red-500" />
						This Season Team Stats
					</h2>
					<p className="mt-1 text-sm text-gray-300">
						Live constructor metrics for {CURRENT_SEASON}.
					</p>
					<div className="mt-4">
						<TeamSeasonStatsClient
							teamName={sourceTeamName}
							teamColor={teamColor}
							year={CURRENT_SEASON}
						/>
					</div>
				</section>

				<section className="mt-4 rounded-2xl border border-white/12 bg-black/50 p-5">
					<h2 className="text-lg md:text-xl font-black inline-flex items-center gap-2">
						<FaTrophy className="text-yellow-400" />
						Team Drivers
					</h2>
					<p className="mt-1 text-sm text-gray-300">
						Current lineup with profile highlights.
					</p>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
						{teamDrivers.map((driver) => {
							const driverImage = getDriverTeamCardImagePath(driver);
							const flagCode = getNationalityFlagCode(driver.nationality);
							const countryName = getCountryNameFromNationality(
								driver.nationality
							);
							const displayNumber = getDisplayNumber(driver);

							return (
								<Link
									key={driver.slug}
									href={`/drivers/${driver.slug}`}
									className="group relative h-80 rounded-xl border border-white/15 overflow-hidden p-3.5 cursor-pointer hover:border-white/30 transition-all duration-300"
									style={{
										background: `linear-gradient(120deg, ${teamColor}CC 0%, ${teamColor}B8 58%, rgba(8,8,10,0.92) 100%)`,
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
											<h3 className="text-[35px] leading-[0.95] font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
												{driver.fullName.split(' ')[0]}
												<br />
												{driver.fullName.split(' ').slice(1).join(' ')}
											</h3>
											<p className="text-sm font-semibold text-white/90 mt-1">
												{driver.teamName}
											</p>
											<p className="mt-4 text-[46px] leading-none font-black italic text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.35)]">
												{displayNumber}
											</p>
											<div className="mt-auto inline-flex items-center gap-2">
												{flagCode && (
													<div className="h-5 overflow-hidden rounded border border-white/25 bg-black/25">
														<Image
															src={`/images/flags/${flagCode}.png`}
															alt={`${countryName} flag`}
															width={28}
															height={20}
															className="h-full w-auto"
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
											<div className="absolute left-[-36%] bottom-[-14%] h-[292px] w-[160%]">
												<Image
													src={driverImage}
													alt={driver.fullName}
													fill
													className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
													style={{ objectPosition: '50% top' }}
												/>
											</div>
										</div>
									</div>

									<div
										className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center justify-center h-7 w-7 rounded-full border border-white/20 bg-black/30 opacity-0 translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
										style={{ color: teamColor }}
									>
										<FaArrowRight className="text-xs" />
									</div>
								</Link>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
}
