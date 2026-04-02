import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import {
	CURRENT_SEASON,
	DRIVER_CATALOG,
	getDriverBySlug,
} from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	FaArrowLeft,
	FaArrowRight,
	FaBalanceScale,
	FaCalendarAlt,
	FaFlag,
	FaFlagCheckered,
	FaTrophy,
} from 'react-icons/fa';
import DriverSeasonStatsClient from './DriverSeasonStatsClient';

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

function formatBirthDate(value) {
	if (!value) return 'Unknown';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});
}

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

function splitDriverName(fullName) {
	const parts = String(fullName || '')
		.trim()
		.split(/\s+/);
	return {
		firstName: parts[0] || fullName,
		lastName: parts.slice(1).join(' ') || parts[0] || fullName,
	};
}

function darkenHexColor(hexColor, factor = 0.5) {
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

function buildTimeline(driver) {
	const timeline = [
		{ label: 'F1 Debut', value: `${driver.debutSeason} (${driver.debutTeam})` },
		{ label: 'First Podium', value: driver.firstPodiumYear || 'Pending' },
		{ label: 'First Win', value: driver.firstWinYear || 'Pending' },
		{ label: 'Best WDC Finish', value: driver.bestChampionshipFinish || 'N/A' },
	];

	if (driver.titleYears?.length) {
		timeline.push({
			label: 'Title Years',
			value: driver.titleYears.join(', '),
		});
	}

	return timeline;
}

export async function generateStaticParams() {
	return DRIVER_CATALOG.map((driver) => ({ slug: driver.slug }));
}

export default async function DriverDetailPage({ params }) {
	const resolvedParams = await params;
	const driver = getDriverBySlug(resolvedParams?.slug);
	if (!driver) notFound();

	const teammate = DRIVER_CATALOG.find(
		(candidate) =>
			candidate.teamName === driver.teamName && candidate.slug !== driver.slug
	);
	const driverImage = getDriverImagePath(driver.code);
	const teamLogo = getTeamLogoPath(driver.teamName);
	const timeline = buildTimeline(driver);
	const experience = Math.max(1, 2026 - driver.debutSeason + 1);
	const flagCode = getNationalityFlagCode(driver.nationality);
	const countryName = getCountryNameFromNationality(driver.nationality);
	const { firstName, lastName } = splitDriverName(driver.fullName);
	const darkTeamTone = darkenHexColor(driver.teamColor, 0.36);
	const midTeamTone = darkenHexColor(driver.teamColor, 0.66);
	const compareHref = `/compare?type=drivers&a=${encodeURIComponent(driver.code)}&year=${CURRENT_SEASON}`;
	const careerStats = [
		{ label: 'Championships', value: driver.worldChampionships },
		{ label: 'Career Wins', value: driver.careerWins },
		{ label: 'Career Podiums', value: driver.careerPodiums },
		{ label: 'Pole Positions', value: driver.careerPoles },
		{ label: 'Fastest Laps', value: driver.careerFastestLaps },
		{ label: 'Career Starts', value: driver.careerStarts },
		{ label: 'Career Points', value: driver.careerPoints.toLocaleString() },
		{ label: 'Experience', value: `${experience} seasons` },
	];

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1300px] mx-auto pb-12 animate-fade-in">
				<Link
					href="/drivers"
					className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors mb-5"
				>
					<FaArrowLeft className="text-red-500" />
					Back to Drivers
				</Link>

				<section
					className="relative overflow-hidden rounded-3xl border border-white/15"
					style={{
						background: `linear-gradient(115deg, ${hexToRgba(darkTeamTone, 0.97)} 0%, ${hexToRgba(driver.teamColor, 0.92)} 60%, ${hexToRgba(midTeamTone, 0.98)} 100%)`,
						boxShadow: `inset 0 0 0 1px ${hexToRgba(driver.teamColor, 0.38)}`,
					}}
				>
					<div
						className="pointer-events-none absolute inset-0 opacity-55"
						style={{
							backgroundImage:
								'repeating-linear-gradient(0deg, rgba(255,255,255,0.11) 0px, rgba(255,255,255,0.11) 2px, transparent 2px, transparent 14px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 15px)',
						}}
					/>
					<div className="pointer-events-none absolute inset-y-0 right-[2%] z-1 flex items-center">
						<p
							className="text-[230px] md:text-[340px] lg:text-[400px] leading-none font-black tracking-tight"
							style={{
								color: hexToRgba(darkTeamTone, 0.35),
								textShadow: '0 6px 30px rgba(0,0,0,0.26)',
								WebkitTextStroke: `1px ${hexToRgba(driver.teamColor, 0.22)}`,
							}}
						>
							{driver.number}
						</p>
					</div>

					<div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] min-h-[420px]">
						<div className="relative p-6 md:p-8 lg:p-10 flex flex-col justify-center overflow-visible">
							<div className="pointer-events-none absolute left-[20%] top-0 hidden md:block h-full">
								<div className="h-28 w-2 bg-white/90" />
								<div className="mt-1 h-16 w-2 bg-white/80" />
								<div className="mt-[190px] h-16 w-2 bg-white/80" />
								<div className="mt-1 h-28 w-2 bg-white/90" />
							</div>

							<p className="text-xs md:text-sm uppercase tracking-[0.18em] font-semibold text-white/90">
								{driver.teamName}
							</p>
							<h1 className="mt-3 leading-[0.84] relative z-10 max-w-none">
								<span
									className="block text-5xl md:text-7xl lg:text-[5.6rem] text-white/95"
									style={{
										fontFamily:
											'Lucida Handwriting, Brush Script MT, Segoe Script, cursive',
									}}
								>
									{firstName}
								</span>
								<span
									className="block text-6xl md:text-8xl lg:text-[9rem] font-black uppercase tracking-[-0.03em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.34)]"
									style={{
										fontFamily:
											'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
									}}
								>
									{lastName}
								</span>
							</h1>

							<div className="mt-4 inline-flex flex-wrap items-center gap-3 text-sm font-semibold text-white/95">
								{flagCode && (
									<span className="inline-flex h-5 overflow-hidden rounded border border-white/30 bg-black/20">
										<Image
											src={`/images/flags/${flagCode}.png`}
											alt={`${countryName} flag`}
											width={28}
											height={20}
											className="h-full w-auto"
										/>
									</span>
								)}
								<span>{countryName}</span>
								<span className="text-white/70">|</span>
								<span>{driver.teamName}</span>
								<span className="text-white/70">|</span>
								<span>#{driver.number}</span>
							</div>

							<p className="mt-4 max-w-xl text-sm md:text-base text-white/88">
								{driver.bio}
							</p>

							<div className="mt-6 inline-flex flex-wrap items-center gap-3">
								<Link
									href={compareHref}
									className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-black/18 px-5 py-2.5 text-sm font-bold text-white hover:bg-black/28 transition-colors"
								>
									<FaBalanceScale className="text-xs" />
									Compare now
									<FaArrowRight className="text-xs" />
								</Link>
							</div>
						</div>

						<div className="relative z-20 min-h-[280px] lg:min-h-full overflow-hidden">
							{teamLogo && (
								<div className="absolute top-5 right-5 z-20 h-12 w-12">
									<Image
										src={teamLogo}
										alt={driver.teamName}
										fill
										className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
									/>
								</div>
							)}
							<div className="absolute bottom-0 right-0 w-full h-full">
								<Image
									src={driverImage}
									alt={driver.fullName}
									fill
									className="object-contain object-bottom"
									priority
								/>
							</div>
						</div>
					</div>
				</section>

				<section className="mt-4 rounded-3xl border border-white/14 bg-linear-to-br from-white/10 via-white/4 to-transparent p-5 md:p-6">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2 className="text-xl md:text-2xl font-black inline-flex items-center gap-2">
								<FaFlagCheckered className="text-red-500" />
								This Year Stats
							</h2>
							<p className="mt-1 text-sm text-gray-300">
								Live season snapshot for {CURRENT_SEASON}
							</p>
						</div>
					</div>

					<div className="mt-4">
						<DriverSeasonStatsClient
							driverCode={driver.code}
							driverName={driver.fullName}
							year={CURRENT_SEASON}
							teamColor={driver.teamColor}
						/>
					</div>
				</section>

				<section className="mt-4 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
					<div className="rounded-2xl border border-white/12 bg-black/50 p-5">
						<h2 className="text-lg md:text-xl font-black inline-flex items-center gap-2">
							<FaTrophy className="text-yellow-400" />
							Career Stats
						</h2>
						<p className="mt-1 text-sm text-gray-300">
							Long-run profile built from the historical career dataset.
						</p>

						<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
							{careerStats.map((item) => (
								<div
									key={item.label}
									className="rounded-xl border border-white/12 bg-linear-to-br from-white/12 via-white/6 to-transparent p-3"
									style={{
										boxShadow: `inset 0 0 0 1px ${hexToRgba(driver.teamColor, 0.12)}`,
									}}
								>
									<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
										{item.label}
									</p>
									<p className="mt-1 text-xl font-black text-white">
										{item.value}
									</p>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-2xl border border-white/12 bg-black/50 p-5">
						<h2 className="text-lg font-bold inline-flex items-center gap-2">
							<FaCalendarAlt className="text-red-500" />
							Driver Profile
						</h2>
						<p className="mt-2 text-sm text-gray-300">{driver.style}</p>

						<div className="mt-3 space-y-2 text-sm">
							<p className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-gray-200">
								<span className="text-gray-400">Born:</span>{' '}
								{formatBirthDate(driver.birthDate)}
							</p>
							<p className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-gray-200">
								<span className="text-gray-400">Birthplace:</span>{' '}
								{driver.placeOfBirth}
							</p>
							<p className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-gray-200">
								<span className="text-gray-400">Nationality:</span>{' '}
								{driver.nationality}
							</p>

							<div className="pt-2">
								<h3 className="text-sm uppercase tracking-[0.14em] text-gray-400">
									Career Timeline
								</h3>
								<div className="mt-2 space-y-2">
									{timeline.map((item) => (
										<div
											key={item.label}
											className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 flex items-center justify-between gap-3"
										>
											<p className="text-xs text-gray-400 uppercase tracking-wide">
												{item.label}
											</p>
											<p className="text-sm font-semibold text-white text-right">
												{item.value}
											</p>
										</div>
									))}
								</div>
							</div>
							<p className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-gray-200">
								<span className="text-gray-400">Current Team:</span>{' '}
								{driver.teamName}
							</p>
							{teammate && (
								<p className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-gray-200 inline-flex items-center gap-2">
									<FaFlag className="text-red-400" />
									<span className="text-gray-400">Teammate:</span>{' '}
									{teammate.fullName}
								</p>
							)}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
