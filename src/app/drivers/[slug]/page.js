import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { DRIVER_CATALOG, getDriverBySlug } from '@/lib/data/driversCatalog';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	FaArrowLeft,
	FaBullseye,
	FaCalendarAlt,
	FaFlag,
	FaTrophy,
} from 'react-icons/fa';

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

export default function DriverDetailPage({ params }) {
	const driver = getDriverBySlug(params.slug);
	if (!driver) notFound();

	const teammate = DRIVER_CATALOG.find(
		(candidate) =>
			candidate.teamName === driver.teamName && candidate.slug !== driver.slug
	);
	const driverImage = getDriverImagePath(driver.code);
	const teamLogo = getTeamLogoPath(driver.teamName);
	const timeline = buildTimeline(driver);
	const experience = Math.max(1, 2026 - driver.debutSeason + 1);

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
					className="rounded-3xl border border-white/15 p-5 md:p-7 bg-linear-to-br from-white/14 via-white/5 to-transparent"
					style={{ boxShadow: `inset 0 0 0 1px ${driver.teamColor}33` }}
				>
					<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
						<div className="rounded-2xl border border-white/10 bg-black/45 p-3">
							<div className="relative aspect-3/4 rounded-xl overflow-hidden bg-white/5">
								<Image
									src={driverImage}
									alt={driver.fullName}
									fill
									className="object-cover object-top"
								/>
							</div>
							<div className="mt-3 flex items-center justify-between gap-3">
								<p className="text-xl font-black">#{driver.number}</p>
								{teamLogo && (
									<div className="relative w-12 h-12 rounded-lg border border-white/12 bg-black/40 overflow-hidden">
										<Image
											src={teamLogo}
											alt={driver.teamName}
											fill
											className="object-contain p-2"
										/>
									</div>
								)}
							</div>
						</div>

						<div>
							<p
								className="text-xs uppercase tracking-[0.18em] font-semibold"
								style={{ color: driver.teamColor }}
							>
								{driver.teamName}
							</p>
							<h1 className="mt-1 text-3xl md:text-4xl font-black tracking-tight">
								{driver.fullName}
							</h1>
							<p className="mt-2 text-sm text-gray-300 max-w-3xl">
								{driver.bio}
							</p>

							<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
								<div className="rounded-xl border border-white/10 bg-black/40 p-3">
									<p className="text-[10px] uppercase text-gray-400 tracking-wide">
										Championships
									</p>
									<p className="mt-1 text-xl font-bold inline-flex items-center gap-2">
										<FaTrophy className="text-yellow-400" />
										{driver.worldChampionships}
									</p>
								</div>
								<div className="rounded-xl border border-white/10 bg-black/40 p-3">
									<p className="text-[10px] uppercase text-gray-400 tracking-wide">
										Career Points
									</p>
									<p className="mt-1 text-xl font-bold">
										{driver.careerPoints.toLocaleString()}
									</p>
								</div>
								<div className="rounded-xl border border-white/10 bg-black/40 p-3">
									<p className="text-[10px] uppercase text-gray-400 tracking-wide">
										Career Starts
									</p>
									<p className="mt-1 text-xl font-bold">
										{driver.careerStarts}
									</p>
								</div>
								<div className="rounded-xl border border-white/10 bg-black/40 p-3">
									<p className="text-[10px] uppercase text-gray-400 tracking-wide">
										Experience
									</p>
									<p className="mt-1 text-xl font-bold">{experience} seasons</p>
								</div>
							</div>

							<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
								{[
									{ label: 'Wins', value: driver.careerWins },
									{ label: 'Podiums', value: driver.careerPodiums },
									{ label: 'Poles', value: driver.careerPoles },
									{ label: 'Fastest Laps', value: driver.careerFastestLaps },
								].map((item) => (
									<div
										key={item.label}
										className="rounded-xl border border-white/10 bg-black/40 p-3"
									>
										<p className="text-[10px] uppercase text-gray-400 tracking-wide">
											{item.label}
										</p>
										<p className="mt-1 text-lg font-semibold">{item.value}</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>

				<section className="mt-4 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
					<div className="rounded-2xl border border-white/12 bg-black/50 p-5">
						<h2 className="text-lg font-bold inline-flex items-center gap-2">
							<FaBullseye className="text-red-500" />
							Driving Style
						</h2>
						<p className="mt-2 text-sm text-gray-300">{driver.style}</p>

						<div className="mt-5">
							<h3 className="text-sm uppercase tracking-[0.14em] text-gray-400">
								Career Timeline
							</h3>
							<div className="mt-3 space-y-2">
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
					</div>

					<div className="rounded-2xl border border-white/12 bg-black/50 p-5">
						<h2 className="text-lg font-bold inline-flex items-center gap-2">
							<FaCalendarAlt className="text-red-500" />
							Profile Details
						</h2>
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
