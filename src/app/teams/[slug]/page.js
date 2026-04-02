import CenterSnapRollerClient from '@/components/navigation/CenterSnapRollerClient';
import {
	getTeamCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { CURRENT_SEASON, DRIVER_CATALOG } from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
};

const TEAM_HISTORY_BY_KEY = {
	mer: {
		totalWins: 129,
		firstWin: '1954 French Grand Prix',
		totalPoles: 140,
		teamPrincipal: 'Toto Wolff',
		ceo: 'Toto Wolff',
		reserveDrivers: ['Valtteri Bottas', 'Frederik Vesti'],
	},
	fer: {
		totalWins: 248,
		firstWin: '1951 British Grand Prix',
		totalPoles: 253,
		teamPrincipal: 'Frederic Vasseur',
		ceo: 'Benedetto Vigna',
		reserveDrivers: ['Antonio Giovinazzi', 'Zhou Guanyu'],
	},
	rbr: {
		totalWins: 122,
		firstWin: '2009 Chinese Grand Prix',
		totalPoles: 104,
		teamPrincipal: 'Christian Horner',
		ceo: 'Oliver Mintzlaff',
		reserveDrivers: ['Liam Lawson', 'Ayumu Iwasa'],
	},
	mcl: {
		totalWins: 190,
		firstWin: '1968 Belgian Grand Prix',
		totalPoles: 166,
		teamPrincipal: 'Andrea Stella',
		ceo: 'Zak Brown',
		reserveDrivers: ["Pato O'Ward", 'Ryo Hirakawa'],
	},
	haas: {
		totalWins: 0,
		totalPoles: 0,
		highestFinish: 4,
		highestFinishCount: 5,
		teamPrincipal: 'Ayao Komatsu',
		ceo: 'Gene Haas',
		reserveDrivers: ['Pietro Fittipaldi'],
	},
	ast: {
		totalWins: 0,
		totalPoles: 1,
		highestFinish: 2,
		highestFinishCount: 8,
		teamPrincipal: 'Mike Krack',
		ceo: 'Martin Whitmarsh',
		reserveDrivers: ['Felipe Drugovich', 'Stoffel Vandoorne'],
	},
	wil: {
		totalWins: 114,
		firstWin: '1979 British Grand Prix',
		totalPoles: 128,
		teamPrincipal: 'James Vowles',
		ceo: 'James Vowles',
		reserveDrivers: ['Franco Colapinto'],
	},
	rb: {
		totalWins: 2,
		firstWin: '2008 Italian Grand Prix',
		totalPoles: 1,
		teamPrincipal: 'Laurent Mekies',
		ceo: 'Peter Bayer',
		reserveDrivers: ['Ayumu Iwasa'],
	},
	alp: {
		totalWins: 1,
		firstWin: '2021 Hungarian Grand Prix',
		totalPoles: 1,
		teamPrincipal: 'Oliver Oakes',
		ceo: 'Luca de Meo',
		reserveDrivers: ['Jack Doohan', 'Paul Aron'],
	},
	aud: {
		totalWins: 0,
		totalPoles: 0,
		highestFinish: null,
		highestFinishCount: null,
		teamPrincipal: 'Mattia Binotto',
		ceo: 'Gernot Dollner',
		reserveDrivers: ['TBD'],
	},
	cad: {
		totalWins: 0,
		totalPoles: 0,
		highestFinish: null,
		highestFinishCount: null,
		teamPrincipal: 'Graeme Lowdon',
		ceo: 'Dan Towriss',
		reserveDrivers: ['TBD'],
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

function darkenHexColor(hexColor, factor = 0.52) {
	const raw = String(hexColor || '')
		.trim()
		.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#1f2937';
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

function splitDriverName(fullName) {
	const parts = String(fullName || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
	return {
		firstName: parts.slice(0, -1).join(' '),
		lastName: parts[parts.length - 1],
	};
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
	const darkTeamTone = darkenHexColor(teamColor, 0.34);
	const midTeamTone = darkenHexColor(teamColor, 0.66);
	const teamLogo = getTeamLogoPath(sourceTeamName);
	const carToken = TEAM_CAR_TOKEN_BY_KEY[teamKey] || teamKey;
	const teamCarImage = `/images/cars/${CURRENT_SEASON}${carToken}carright.png`;
	const driverNameRow = teamDrivers
		.slice(0, 2)
		.map((driver) => splitDriverName(driver.fullName));
	const activePair = teamDrivers.slice(0, 2);
	const totalPairChampionships = activePair.reduce(
		(sum, driver) => sum + Number(driver.worldChampionships || 0),
		0
	);
	const totalPairWins = activePair.reduce(
		(sum, driver) => sum + Number(driver.careerWins || 0),
		0
	);
	const totalPairPodiums = activePair.reduce(
		(sum, driver) => sum + Number(driver.careerPodiums || 0),
		0
	);
	const totalPairPoints = activePair.reduce(
		(sum, driver) => sum + Number(driver.careerPoints || 0),
		0
	);
	const pairCompareHref =
		activePair.length === 2 ?
			`/compare?type=drivers&a=${encodeURIComponent(activePair[0].code)}&b=${encodeURIComponent(activePair[1].code)}&year=${CURRENT_SEASON}`
		:	`/compare?type=drivers&a=${encodeURIComponent(activePair[0]?.code || '')}&year=${CURRENT_SEASON}`;
	const foundedYear = Number.parseInt(String(founded), 10);
	const seasonsActive =
		Number.isFinite(foundedYear) && foundedYear > 0 ?
			Math.max(1, CURRENT_SEASON - foundedYear + 1)
		:	null;
	const teamHistory = TEAM_HISTORY_BY_KEY[teamKey] || {
		totalWins: 0,
		totalPoles: 0,
		highestFinish: null,
		highestFinishCount: null,
		teamPrincipal: 'Not listed',
		ceo: 'Not listed',
		reserveDrivers: [],
	};
	const hasTeamWins = Number(teamHistory.totalWins || 0) > 0;
	const reserveDriversLabel =
		(
			Array.isArray(teamHistory.reserveDrivers) &&
			teamHistory.reserveDrivers.length
		) ?
			teamHistory.reserveDrivers.join(', ')
		:	'None listed';
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
					className="relative overflow-hidden rounded-[28px] border border-white/15"
					style={{
						background: `linear-gradient(140deg, ${hexToRgba(darkTeamTone, 0.98)} 0%, ${hexToRgba(teamColor, 0.86)} 58%, ${hexToRgba(midTeamTone, 0.96)} 100%)`,
						boxShadow: `inset 0 0 0 1px ${hexToRgba(teamColor, 0.35)}`,
					}}
				>
					<div
						className="pointer-events-none absolute inset-0 opacity-55"
						style={{
							backgroundImage:
								'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 14px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 18px), linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 46%, rgba(0,0,0,0.2) 100%)',
						}}
					/>

					<div className="relative z-10 border-b border-white/18 px-4 md:px-8 pt-4 md:pt-5 pb-3">
						{teamLogo && (
							<div className="absolute right-4 md:right-7 top-4 z-20 h-11 w-11 rounded-full border border-white/35 bg-black/20 p-2">
								<Image
									src={teamLogo}
									alt={displayName}
									fill
									className="object-contain"
								/>
							</div>
						)}
						<div className="relative h-[120px] md:h-[150px]">
							<Image
								src={teamCarImage}
								alt={`${displayName} car`}
								fill
								sizes="(max-width: 1024px) 95vw, 76vw"
								className="object-contain object-center"
							/>
						</div>
					</div>

					<div className="relative z-10 border-b border-white/18 px-4 md:px-8 py-4">
						<div className="mx-auto max-w-[760px] flex items-center justify-center gap-3 md:gap-5">
							<div className="h-2.5 flex-1 max-w-[230px] bg-white/88 [clip-path:polygon(0_0,92%_0,100%_50%,92%_100%,0_100%,6%_50%)]" />
							<h1
								className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] text-white whitespace-nowrap"
								style={{
									fontFamily:
										'Sora, Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
								}}
							>
								{displayName}
							</h1>
							<div className="h-2.5 flex-1 max-w-[230px] bg-white/88 [clip-path:polygon(8%_0,100%_0,94%_50%,100%_100%,8%_100%,0_50%)]" />
						</div>
						<div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] md:text-xs font-semibold text-white/92 tracking-wide">
							{driverNameRow.map((name) => (
								<p key={`${name.firstName}-${name.lastName}`}>
									{name.firstName}{' '}
									<span className="uppercase tracking-[0.08em]">
										{name.lastName}
									</span>
								</p>
							))}
						</div>
					</div>

					<div className="relative z-10 px-4 md:px-8 py-5 md:py-6 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4 md:gap-5">
						<div>
							<p className="text-[11px] uppercase tracking-[0.2em] text-white/80">
								Team Brief
							</p>
							<p className="mt-2 text-sm md:text-base text-white/90 max-w-3xl">
								{summary}
							</p>
						</div>
						<div className="rounded-2xl border border-white/18 bg-black/22 p-3 md:p-4">
							<p className="text-[11px] uppercase tracking-[0.2em] text-white/80">
								Driver Pairings Stats
							</p>
							<div className="mt-3 grid grid-cols-2 gap-2 text-xs md:text-sm">
								<div className="rounded-lg border border-white/12 bg-white/4 px-2.5 py-2">
									<p className="text-white/65">Championships</p>
									<p className="font-semibold text-white">
										{totalPairChampionships}
									</p>
								</div>
								<div className="rounded-lg border border-white/12 bg-white/4 px-2.5 py-2">
									<p className="text-white/65">Wins</p>
									<p className="font-semibold text-white">{totalPairWins}</p>
								</div>
								<div className="rounded-lg border border-white/12 bg-white/4 px-2.5 py-2">
									<p className="text-white/65">Podiums</p>
									<p className="font-semibold text-white">{totalPairPodiums}</p>
								</div>
								<div className="rounded-lg border border-white/12 bg-white/4 px-2.5 py-2">
									<p className="text-white/65">Career Points</p>
									<p className="font-semibold text-white">
										{totalPairPoints.toLocaleString()}
									</p>
								</div>
							</div>
							<div className="mt-3">
								<Link
									href={pairCompareHref}
									className="inline-flex items-center justify-center rounded-full border border-white/80 bg-black/22 px-4 py-2 text-xs font-semibold text-white hover:bg-black/32 transition-colors"
								>
									Compare Team Drivers
								</Link>
							</div>
						</div>
					</div>
				</section>

				<section className="mt-4 rounded-2xl border border-white/12 bg-black/50 p-5">
					<h2 className="text-lg md:text-xl font-semibold tracking-wide text-white">
						Driver Lineup
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
									className="group relative h-68 rounded-2xl border border-white/14 overflow-hidden p-3.5 cursor-pointer hover:border-white/28 transition-all duration-300"
									style={{
										background: `linear-gradient(112deg, ${hexToRgba(teamColor, 0.9)} 0%, ${hexToRgba(midTeamTone, 0.92)} 52%, rgba(7,7,9,0.95) 100%)`,
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
										<div className="w-[58%] flex flex-col">
											<h3 className="text-[1.65rem] md:text-[1.8rem] leading-[0.94] font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.34)]">
												{driver.fullName.split(' ')[0]}{' '}
												<span className="font-black uppercase">
													{driver.fullName.split(' ').slice(1).join(' ')}
												</span>
											</h3>
											<p className="text-xs md:text-sm font-semibold text-white/85 mt-1">
												{driver.teamName}
											</p>
											<p className="mt-3 text-[2.2rem] leading-none font-black italic text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.35)]">
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

										<div className="w-[42%] relative">
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
											<div className="absolute left-[-16%] top-[5%] h-[228px] w-[124%]">
												<Image
													src={driverImage}
													alt={driver.fullName}
													fill
													className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
													style={{ objectPosition: '50% 2%' }}
												/>
											</div>
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				</section>

				<section className="mt-4 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
					<div className="rounded-3xl border border-white/14 bg-linear-to-br from-white/10 via-white/4 to-transparent p-5 md:p-6">
						<h2 className="text-xl md:text-2xl font-semibold tracking-wide text-white">
							Season Team Stats
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
					</div>

					<div className="rounded-3xl border border-white/14 bg-black/45 p-5 md:p-6">
						<h2 className="text-xl md:text-2xl font-semibold tracking-wide text-white">
							Team Career Snapshot
						</h2>
						<p className="mt-2 text-sm text-gray-300">
							Long-run identity and timeline context for {displayName}.
						</p>
						<div className="mt-4 space-y-2 text-sm">
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Team</span>
								<span className="font-semibold text-white">{displayName}</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">First season</span>
								<span className="font-semibold text-white">{founded}</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Seasons active</span>
								<span className="font-semibold text-white">
									{seasonsActive ? seasonsActive : 'New entry'}
								</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Home base</span>
								<span className="font-semibold text-white">{base}</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Current drivers</span>
								<span className="font-semibold text-white">
									{teamDrivers.length}
								</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Current pairing</span>
								<span className="font-semibold text-white text-right">
									{teamDrivers
										.slice(0, 2)
										.map((driver) => driver.fullName)
										.join(' / ')}
								</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Total team wins</span>
								<span className="font-semibold text-white">
									{teamHistory.totalWins}
								</span>
							</div>
							{hasTeamWins ?
								<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
									<span className="text-gray-400">First team win</span>
									<span className="font-semibold text-white text-right">
										{teamHistory.firstWin}
									</span>
								</div>
							:	<>
									<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
										<span className="text-gray-400">Best finish</span>
										<span className="font-semibold text-white">
											{teamHistory.highestFinish ?
												`P${teamHistory.highestFinish}`
											:	'N/A'}
										</span>
									</div>
									<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
										<span className="text-gray-400">Best-finish frequency</span>
										<span className="font-semibold text-white">
											{teamHistory.highestFinishCount ?
												`${teamHistory.highestFinishCount} times`
											:	'N/A'}
										</span>
									</div>
								</>
							}
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Total poles</span>
								<span className="font-semibold text-white">
									{teamHistory.totalPoles}
								</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Team principal</span>
								<span className="font-semibold text-white text-right">
									{teamHistory.teamPrincipal}
								</span>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">CEO</span>
								<span className="font-semibold text-white text-right">
									{teamHistory.ceo}
								</span>
							</div>
							<div className="flex items-start justify-between gap-4 rounded-xl border border-white/12 bg-white/4 px-3 py-2">
								<span className="text-gray-400">Reserve drivers</span>
								<span className="font-semibold text-white text-right">
									{reserveDriversLabel}
								</span>
							</div>
						</div>
						<p className="mt-4 text-sm text-gray-300">{summary}</p>
					</div>
				</section>
			</div>
		</div>
	);
}
