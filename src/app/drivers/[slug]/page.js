import CenterSnapRollerClient from '@/components/navigation/CenterSnapRollerClient';
import {
	getDriverImagePath,
	getTeamCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import {
	buildDriverCareerMap,
	getDriverCareerStats,
} from '@/lib/api/driverCareerApi';
import { ROUGH_CONSTRUCTOR_ORDER_2026 } from '@/lib/data/constructorStandingsRough';
import {
	CURRENT_SEASON,
	DRIVER_CATALOG,
	getDriverBySlug,
} from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaArrowLeft, FaArrowRight, FaBalanceScale } from 'react-icons/fa';
import DriverSeasonStatsClient from './DriverSeasonStatsClient';

export const revalidate = 300;

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

function getAgeFromBirthDate(value) {
	if (!value) return null;
	const dob = new Date(value);
	if (Number.isNaN(dob.getTime())) return null;

	const now = new Date();
	let age = now.getFullYear() - dob.getFullYear();
	const hasHadBirthdayThisYear =
		now.getMonth() > dob.getMonth() ||
		(now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
	if (!hasHadBirthdayThisYear) age -= 1;
	return age >= 0 ? age : null;
}

function formatCareerPoints(value) {
	const numeric = Number(value || 0);
	if (!Number.isFinite(numeric)) return '0';
	return numeric.toLocaleString(undefined, {
		minimumFractionDigits: Number.isInteger(numeric) ? 0 : 1,
		maximumFractionDigits: 1,
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
	const staticDriver = getDriverBySlug(resolvedParams?.slug);
	if (!staticDriver) notFound();

	const careerRows = await getDriverCareerStats({ year: CURRENT_SEASON });
	const careerByCode = buildDriverCareerMap(careerRows);
	const liveCareer = careerByCode.get(
		String(staticDriver.code || '').toUpperCase()
	);
	const driver =
		liveCareer ?
			{
				...staticDriver,
				worldChampionships: Math.max(
					Number(staticDriver.worldChampionships || 0),
					Number(liveCareer.world_championships || 0)
				),
				careerStarts: Math.max(
					Number(staticDriver.careerStarts || 0),
					Number(liveCareer.career_starts || 0)
				),
				careerWins: Math.max(
					Number(staticDriver.careerWins || 0),
					Number(liveCareer.career_wins || 0)
				),
				careerPodiums: Math.max(
					Number(staticDriver.careerPodiums || 0),
					Number(liveCareer.career_podiums || 0)
				),
				careerPoles: Math.max(
					Number(staticDriver.careerPoles || 0),
					Number(liveCareer.career_poles || 0)
				),
				careerFastestLaps: Math.max(
					Number(staticDriver.careerFastestLaps || 0),
					Number(liveCareer.career_fastest_laps || 0)
				),
				careerPoints: Math.max(
					Number(staticDriver.careerPoints || 0),
					Number(liveCareer.career_points || 0)
				),
				birthDate: liveCareer.date_of_birth || staticDriver.birthDate,
				nationality: liveCareer.nationality || staticDriver.nationality,
			}
		:	staticDriver;

	const teammate = DRIVER_CATALOG.find(
		(candidate) =>
			candidate.teamName === driver.teamName && candidate.slug !== driver.slug
	);
	const driverImage = getDriverImagePath(driver.code);
	const teamLogo = getTeamLogoPath(driver.teamName);
	const timeline = buildTimeline(driver);
	const experience = Math.max(1, 2026 - driver.debutSeason + 1);
	const age = getAgeFromBirthDate(driver.birthDate);
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
		{ label: 'Career Points', value: formatCareerPoints(driver.careerPoints) },
		{ label: 'Experience', value: `${experience} seasons` },
	];
	const constructorOrderByKey = Object.fromEntries(
		ROUGH_CONSTRUCTOR_ORDER_2026.map((teamName, index) => [
			getTeamKey(teamName),
			index,
		])
	);
	const driverRollerItems = [...DRIVER_CATALOG]
		.sort((a, b) => {
			const rankA =
				constructorOrderByKey[getTeamKey(a.teamName)] ??
				Number.MAX_SAFE_INTEGER;
			const rankB =
				constructorOrderByKey[getTeamKey(b.teamName)] ??
				Number.MAX_SAFE_INTEGER;
			if (rankA !== rankB) return rankA - rankB;

			const numA = Number(a.number || 999);
			const numB = Number(b.number || 999);
			if (numA !== numB) return numA - numB;

			return a.fullName.localeCompare(b.fullName);
		})
		.map((item) => ({
			id: item.slug,
			label: item.fullName,
			meta: item.code,
			color: item.teamColor || '#6B7280',
			href: `/drivers/${item.slug}`,
		}));

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1300px] mx-auto pb-12 animate-fade-in">
				<Link
					href="/drivers"
					prefetch={true}
					className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors mb-5"
				>
					<FaArrowLeft className="text-red-500" />
					Back to Drivers
				</Link>

				<div className="mb-4">
					<CenterSnapRollerClient
						items={driverRollerItems}
						activeId={driver.slug}
						ariaLabel="Driver page roller"
					/>
				</div>

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
											'Sora, Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
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
									prefetch={true}
									className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-black/18 px-5 py-2.5 text-sm font-bold text-white hover:bg-black/28 transition-colors"
								>
									<FaBalanceScale className="text-xs" />
									Compare now
									<FaArrowRight className="text-xs" />
								</Link>
							</div>
						</div>

						<div className="relative z-20 min-h-[320px] overflow-hidden lg:min-h-full">
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
							<div className="absolute right-0 bottom-0 h-[110%] w-full md:right-0 md:w-full">
								<Image
									src={driverImage}
									alt={driver.fullName}
									fill
									className="object-contain object-bottom scale-[1] md:scale-[1.12]"
									priority
								/>
							</div>
						</div>
					</div>
				</section>

				<section className="mt-8">
					<div className="mb-5 px-1">
						<h2 className="text-xl md:text-2xl font-semibold tracking-[-0.02em] text-white">
							Season {CURRENT_SEASON} Snapshot
						</h2>
					</div>

					<div className="rounded-3xl border border-white/10 bg-white/2 p-5 md:p-6 backdrop-blur-sm">
						<DriverSeasonStatsClient
							driverCode={driver.code}
							driverName={driver.fullName}
							year={CURRENT_SEASON}
							teamColor={driver.teamColor}
						/>
					</div>
				</section>

				<section className="mt-6 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
					<div className="rounded-3xl border border-white/10 bg-white/2 p-6 md:p-8 backdrop-blur-sm">
						<h2 className="text-lg md:text-xl font-semibold tracking-[-0.02em] text-white mb-8">
							Career Overview
						</h2>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
							{careerStats.map((item) => (
								<div
									key={item.label}
									className="flex flex-col p-4 rounded-xl bg-white/1.5 border border-white/4"
								>
									<div className="flex items-center gap-2 mb-1">
										<div
											className="w-1 h-1 rounded-full opacity-60"
											style={{ backgroundColor: driver.teamColor }}
										/>
										<p className="text-[10px] uppercase tracking-widest text-white/40 leading-none mt-px">
											{item.label}
										</p>
									</div>
									<p className="text-2xl md:text-3xl font-medium tracking-tight text-white mt-1">
										{item.value}
									</p>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-3xl border border-white/10 bg-white/2 p-6 md:p-8 backdrop-blur-sm">
						<h2 className="text-lg md:text-xl font-semibold tracking-[-0.02em] text-white mb-2">
							Driver Profile
						</h2>
						{driver.style && (
							<p className="text-sm text-white/50 mb-6">{driver.style}</p>
						)}

						<div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 text-sm">
							<div className="flex flex-col justify-center p-4 rounded-xl bg-white/2 border border-white/5">
								<span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
									Born
								</span>
								<span className="text-sm text-white/90 font-medium">
									{formatBirthDate(driver.birthDate)}
								</span>
							</div>
							<div className="flex flex-col justify-center p-4 rounded-xl bg-white/2 border border-white/5">
								<span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
									Age
								</span>
								<span className="text-sm text-white/90 font-medium">
									{age == null ? 'Unknown' : age}
								</span>
							</div>
							<div className="flex flex-col justify-center p-4 rounded-xl bg-white/2 border border-white/5">
								<span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
									Birthplace
								</span>
								<span className="text-sm text-white/90 font-medium">
									{driver.placeOfBirth}
								</span>
							</div>
							<div className="flex flex-col justify-center p-4 rounded-xl bg-white/2 border border-white/5">
								<span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
									Nationality
								</span>
								<span className="text-sm text-white/90 font-medium">
									{driver.nationality}
								</span>
							</div>
							<div className="flex flex-col justify-center p-4 rounded-xl bg-white/2 border border-white/5">
								<span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
									Current Team
								</span>
								<span className="text-sm text-white/90 font-medium">
									{driver.teamName}
								</span>
							</div>
							{teammate && (
								<div className="flex flex-col justify-center p-4 rounded-xl bg-white/2 border border-white/5">
									<span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
										Teammate
									</span>
									<span className="text-sm text-white/90 font-medium">
										{teammate.fullName}
									</span>
								</div>
							)}
						</div>

						<div className="mt-8">
							<h3 className="text-[10px] uppercase tracking-widest text-amber-500/80 mb-4 font-semibold">
								Timeline
							</h3>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
								{timeline.map((item) => (
									<div
										key={item.label}
										className="flex flex-col p-3.5 rounded-xl bg-white/2 border border-white/5"
									>
										<p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
											{item.label}
										</p>
										<p className="text-sm text-white/90 font-medium">
											{item.value}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
