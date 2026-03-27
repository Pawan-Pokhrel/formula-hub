'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import {
	ChampionshipPulseWidget,
	ConstructorBattleWidget,
	KpisWidget,
	LastRaceWidget,
	NextRaceWidget,
	TitleFightWidget,
	UpcomingSessionsWidget,
} from '@/components/dashboard/widgets';
import { parseRaceDateTime } from '@/components/schedule/scheduleHelpers';
import { getMyPreferences, updateMyFavorites } from '@/lib/api/preferencesApi';
import { getLastRace, getNextRace, getSchedule } from '@/lib/api/scheduleApi';
import {
	getConstructorStandings,
	getDriverStandings,
} from '@/lib/api/standingsApi';
import { getYearSchedule } from '@/lib/api/trackApi';
import {
	FAVORITE_DRIVER_LIMIT,
	FAVORITE_TEAM_LIMIT,
	getDefaultDashboardPreferences,
	normalizeDashboardPreferences,
	readLocalDashboardPreferences,
	writeLocalDashboardPreferences,
} from '@/lib/dashboard/preferences';
import {
	DEFAULT_WIDGET_ORDER,
	WIDGET_REGISTRY,
} from '@/lib/dashboard/widgetRegistry';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

const DASHBOARD_ASPECTS = [
	{
		id: 'overview',
		label: 'Overview',
		widgets: ['kpis', 'championship-pulse', 'constructor-battle'],
	},
	{
		id: 'race',
		label: 'Race Ops',
		widgets: ['last-race', 'next-race', 'upcoming-sessions'],
	},
	{
		id: 'championship',
		label: 'Championship',
		widgets: ['title-fight', 'constructor-battle'],
	},
];

const ASPECT_WIDGET_SPANS = {
	overview: {
		kpis: 'md:col-span-2',
		'championship-pulse': 'md:col-span-1 md:min-h-[460px]',
		'constructor-battle': 'md:col-span-1 md:min-h-[460px]',
	},
	race: {
		'last-race': 'md:col-span-2 md:min-h-[620px]',
		'next-race': 'md:col-span-1',
		'upcoming-sessions': 'md:col-span-1',
	},
	championship: {
		'title-fight': 'md:col-span-1 md:min-h-[calc(100vh-275px)]',
		'constructor-battle': 'md:col-span-1 md:min-h-[calc(100vh-275px)]',
	},
};

function formatDate(dateString) {
	if (!dateString) return 'TBA';
	const d = new Date(dateString);
	return d.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function getCountdown(targetDate, targetTime) {
	const target = parseRaceDateTime(targetDate, targetTime);
	if (!target) return null;

	const now = new Date();
	const diff = target.getTime() - now.getTime();
	if (Number.isNaN(target.getTime()) || diff <= 0) return null;

	const totalHours = Math.floor(diff / (1000 * 60 * 60));
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;
	const minutes = Math.floor((diff / (1000 * 60)) % 60);

	return { days, hours, minutes };
}

function formatStartTime(targetDate, targetTime) {
	const dt = parseRaceDateTime(targetDate, targetTime);
	if (!dt) return 'Start time unavailable';
	return dt.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short',
	});
}

export default function DashboardPage() {
	const currentYear = new Date().getFullYear();
	const validWidgetIds = useMemo(() => {
		const fromRegistry = WIDGET_REGISTRY.map((widget) => widget.id);
		const fromAspects = DASHBOARD_ASPECTS.flatMap((aspect) => aspect.widgets);
		return Array.from(new Set([...fromRegistry, ...fromAspects]));
	}, []);
	const defaultPreferences = useMemo(
		() => getDefaultDashboardPreferences(DEFAULT_WIDGET_ORDER),
		[]
	);

	const [loading, setLoading] = useState(true);
	const [nextRace, setNextRace] = useState(null);
	const [lastRace, setLastRace] = useState(null);
	const [schedule, setSchedule] = useState([]);
	const [trackSchedule, setTrackSchedule] = useState([]);
	const [driverStandings, setDriverStandings] = useState([]);
	const [constructorStandings, setConstructorStandings] = useState([]);

	const [favoriteDrivers, setFavoriteDrivers] = useState(
		defaultPreferences.favoriteDrivers
	);
	const [favoriteTeams, setFavoriteTeams] = useState(
		defaultPreferences.favoriteTeams
	);
	const [activeAspect, setActiveAspect] = useState('overview');
	const [sidebarPinned, setSidebarPinned] = useState(false);
	const [prefsHydrated, setPrefsHydrated] = useState(false);
	const { isAuthenticated, user } = useAuth();

	useEffect(() => {
		const fetchDashboardData = async () => {
			setLoading(true);
			try {
				const [next, last, sched, trackSched, drivers, constructors] =
					await Promise.all([
						getNextRace().catch(() => null),
						getLastRace().catch(() => null),
						getSchedule(currentYear).catch(() => []),
						getYearSchedule(currentYear).catch(() => []),
						getDriverStandings(currentYear).catch(() => []),
						getConstructorStandings(currentYear).catch(() => []),
					]);

				setNextRace(next);
				setLastRace(last);
				setSchedule(Array.isArray(sched) ? sched : []);
				setTrackSchedule(Array.isArray(trackSched) ? trackSched : []);
				setDriverStandings(Array.isArray(drivers) ? drivers : []);
				setConstructorStandings(
					Array.isArray(constructors) ? constructors : []
				);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [currentYear]);

	useEffect(() => {
		const local = readLocalDashboardPreferences(
			validWidgetIds,
			DEFAULT_WIDGET_ORDER
		);
		setFavoriteDrivers(local.favoriteDrivers);
		setFavoriteTeams(local.favoriteTeams);

		if (!isAuthenticated) {
			setPrefsHydrated(true);
			return;
		}

		getMyPreferences()
			.then((remote) => {
				const normalized = normalizeDashboardPreferences(
					remote,
					validWidgetIds,
					DEFAULT_WIDGET_ORDER
				);
				setFavoriteDrivers(normalized.favoriteDrivers);
				setFavoriteTeams(normalized.favoriteTeams);
				writeLocalDashboardPreferences(normalized);
			})
			.catch(() => {
				writeLocalDashboardPreferences(local);
			})
			.finally(() => {
				setPrefsHydrated(true);
			});
	}, [isAuthenticated, validWidgetIds]);

	useEffect(() => {
		if (!prefsHydrated) return;

		const normalized = normalizeDashboardPreferences(
			{
				favoriteDrivers,
				favoriteTeams,
				widgetOrder: DEFAULT_WIDGET_ORDER,
				hiddenWidgets: [],
			},
			validWidgetIds,
			DEFAULT_WIDGET_ORDER
		);

		writeLocalDashboardPreferences(normalized);
		if (!isAuthenticated) return;

		const timer = setTimeout(async () => {
			try {
				await updateMyFavorites({
					favoriteDrivers: normalized.favoriteDrivers,
					favoriteTeams: normalized.favoriteTeams,
				});
			} catch {
				// Keep local preferences even if sync fails.
			}
		}, 900);

		return () => clearTimeout(timer);
	}, [
		favoriteDrivers,
		favoriteTeams,
		isAuthenticated,
		prefsHydrated,
		validWidgetIds,
	]);

	const countdown = useMemo(
		() => getCountdown(nextRace?.date, nextRace?.time),
		[nextRace]
	);
	const nextRaceStart = useMemo(
		() => formatStartTime(nextRace?.date, nextRace?.time),
		[nextRace]
	);

	const kpis = useMemo(() => {
		const clampPercent = (num) =>
			Math.max(0, Math.min(100, Number.isFinite(num) ? num : 0));
		const src = trackSchedule.length > 0 ? trackSchedule : schedule;
		const completed = src.filter((r) => r.is_past).length;
		const totalRounds = src.length;
		const dataReady = trackSchedule.filter((r) => r.has_data).length;
		const upcomingRound = nextRace?.round || '—';
		const upcomingRoundNum = Number(nextRace?.round) || 0;

		return [
			{
				label: 'Rounds Completed',
				value: completed || 0,
				icon: FaCalendarAlt,
				progress: clampPercent(
					totalRounds > 0 ? (completed / totalRounds) * 100 : 0
				),
			},
			{
				label: 'Next Round',
				value: upcomingRound,
				icon: FaCalendarAlt,
				progress: clampPercent(
					totalRounds > 0 ? (upcomingRoundNum / totalRounds) * 100 : 0
				),
			},
			{
				label: 'Data Sessions Ready',
				value: `${dataReady}/${totalRounds || 0}`,
				icon: FaCalendarAlt,
				progress: clampPercent(
					totalRounds > 0 ? (dataReady / totalRounds) * 100 : 0
				),
			},
			{
				label: 'Championship Year',
				value: currentYear,
				icon: FaCalendarAlt,
				progress: 100,
			},
		];
	}, [trackSchedule, schedule, nextRace, currentYear]);

	const upcomingRaces = useMemo(() => {
		const src = trackSchedule.length > 0 ? trackSchedule : schedule;
		return src.filter((r) => !r.is_past);
	}, [trackSchedule, schedule]);

	const aspectConfig = useMemo(
		() =>
			DASHBOARD_ASPECTS.find((aspect) => aspect.id === activeAspect) ||
			DASHBOARD_ASPECTS[0],
		[activeAspect]
	);

	const activeWidgetIds = useMemo(
		() => Array.from(new Set(aspectConfig.widgets)).slice(0, 4),
		[aspectConfig]
	);

	const activeSpanMap = useMemo(
		() => ASPECT_WIDGET_SPANS[activeAspect] || {},
		[activeAspect]
	);

	const handleToggleFavoriteDriver = (driverCode) => {
		setFavoriteDrivers((prev) => {
			if (prev.includes(driverCode)) {
				return prev.filter((code) => code !== driverCode);
			}
			if (prev.length >= FAVORITE_DRIVER_LIMIT) return prev;
			return [...prev, driverCode];
		});
	};

	const handleToggleFavoriteTeam = (teamName) => {
		setFavoriteTeams((prev) => {
			if (prev.includes(teamName)) {
				return prev.filter((team) => team !== teamName);
			}
			if (prev.length >= FAVORITE_TEAM_LIMIT) return prev;
			return [...prev, teamName];
		});
	};

	const renderWidget = (widgetId) => {
		switch (widgetId) {
			case 'kpis':
				return <KpisWidget kpis={kpis} />;
			case 'next-race':
				return (
					<NextRaceWidget
						nextRace={nextRace}
						nextRaceStart={nextRaceStart}
						countdown={countdown}
						formatDate={formatDate}
					/>
				);
			case 'championship-pulse':
				return (
					<ChampionshipPulseWidget
						driverStandings={driverStandings}
						constructorStandings={constructorStandings}
						favoriteDrivers={favoriteDrivers}
						favoriteTeams={favoriteTeams}
						onToggleFavoriteDriver={handleToggleFavoriteDriver}
						onToggleFavoriteTeam={handleToggleFavoriteTeam}
						maxDrivers={FAVORITE_DRIVER_LIMIT}
						maxTeams={FAVORITE_TEAM_LIMIT}
					/>
				);
			case 'title-fight':
				return (
					<TitleFightWidget
						driverStandings={driverStandings}
						favoriteDrivers={favoriteDrivers}
					/>
				);
			case 'constructor-battle':
				return (
					<ConstructorBattleWidget
						constructorStandings={constructorStandings}
						favoriteTeams={favoriteTeams}
					/>
				);
			case 'upcoming-sessions':
				return (
					<UpcomingSessionsWidget
						upcomingRaces={upcomingRaces}
						currentYear={currentYear}
						formatDate={formatDate}
					/>
				);
			case 'last-race':
				return (
					<LastRaceWidget
						lastRace={lastRace}
						formatDate={formatDate}
					/>
				);
			default:
				return null;
		}
	};

	if (loading) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/86" />
				<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_16%,rgba(12,180,255,0.13),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(255,61,61,0.15),transparent_28%)]" />
				<div className="relative z-10 mx-auto w-full max-w-[1760px] space-y-4 animate-fade-in">
					<div className="h-10 w-72 animate-pulse rounded-xl bg-white/10" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="h-32 animate-pulse rounded-2xl border border-white/15 bg-white/7"
							/>
						))}
					</div>
					<div className="h-96 animate-pulse rounded-2xl border border-white/15 bg-white/7" />
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		const headlineDriver = driverStandings[0];
		const headlineTeam = constructorStandings[0];
		const completedRounds = (trackSchedule.length > 0 ? trackSchedule : schedule).filter(
			(race) => race.is_past
		).length;
		const totalRounds = (trackSchedule.length > 0 ? trackSchedule : schedule).length;
		const dataReady = trackSchedule.filter((race) => race.has_data).length;

		return (
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/86" />
				<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_16%,rgba(12,180,255,0.13),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(255,61,61,0.15),transparent_28%)]" />
				<div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 pb-10 animate-fade-in">
					<div className="rounded-3xl border border-white/10 bg-black/35 p-6 backdrop-blur-xl md:p-8">
						<p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200/80">
							Public Dashboard Preview
						</p>
						<h1 className="mt-3 max-w-3xl text-3xl font-black tracking-wide md:text-5xl">
							See the FormulaHub race center before you sign in.
						</h1>
						<p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300 md:text-base">
							Track the season at a glance, preview upcoming rounds, and then
							log in to unlock personalized widgets, saved track data,
							simulation tools, and your full command center.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<Link
								href="/login?next=/dashboard"
								className="inline-flex items-center rounded-full bg-linear-to-r from-red-600 to-red-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:from-red-500 hover:to-red-600"
							>
								Log In For Full Access
							</Link>
							<Link
								href="/register"
								className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
							>
								Create Account
							</Link>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
						{kpis.map((item) => (
							<div
								key={item.label}
								className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-xl"
							>
								<p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
									{item.label}
								</p>
								<p className="mt-3 text-3xl font-black text-white">
									{item.value}
								</p>
								<div className="mt-4 h-2 rounded-full bg-white/10">
									<div
										className="h-full rounded-full bg-linear-to-r from-cyan-400 to-red-500"
										style={{ width: `${item.progress}%` }}
									/>
								</div>
							</div>
						))}
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
						<div className="rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">
								Weekend Snapshot
							</p>
							<h2 className="mt-3 text-2xl font-bold text-white">
								{nextRace?.race_name || nextRace?.event || 'Next race coming soon'}
							</h2>
							<p className="mt-2 text-sm text-gray-300">
								{nextRace?.circuit?.circuit_name || nextRace?.circuit_name || nextRace?.circuit || 'Circuit to be confirmed'}
								{' · '}
								{nextRace?.country || nextRace?.circuit?.country || 'TBA'}
							</p>
							<p className="mt-3 text-sm text-gray-400">
								{countdown ?
									`${countdown.days}d ${countdown.hours}h ${countdown.minutes}m until lights out.`
								:	'The next session timing will appear here as soon as it is available.'}
							</p>
							<div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
								<div className="rounded-xl border border-white/10 bg-white/5 p-4">
									<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
										Season Progress
									</p>
									<p className="mt-2 text-xl font-bold text-white">
										{completedRounds}/{totalRounds || 0}
									</p>
								</div>
								<div className="rounded-xl border border-white/10 bg-white/5 p-4">
									<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
										Track Data Ready
									</p>
									<p className="mt-2 text-xl font-bold text-white">
										{dataReady}
									</p>
								</div>
								<div className="rounded-xl border border-white/10 bg-white/5 p-4">
									<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
										Last Race
									</p>
									<p className="mt-2 text-sm font-semibold text-white">
										{lastRace?.race_name || lastRace?.event || 'No result yet'}
									</p>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">
								Championship Leaders
							</p>
							<div className="mt-4 space-y-4">
								<div className="rounded-xl border border-white/10 bg-white/5 p-4">
									<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
										Drivers
									</p>
									<p className="mt-2 text-lg font-bold text-white">
										{headlineDriver?.driver_name || 'Leaderboard loading'}
									</p>
									<p className="text-sm text-gray-400">
										{headlineDriver?.team_name || 'Season standings preview'}
									</p>
								</div>
								<div className="rounded-xl border border-white/10 bg-white/5 p-4">
									<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
										Constructors
									</p>
									<p className="mt-2 text-lg font-bold text-white">
										{headlineTeam?.team_name || 'Constructor standings preview'}
									</p>
									<p className="text-sm text-gray-400">
										Log in to personalize favorites and dashboard widgets.
									</p>
								</div>
								<Link
									href="/login?next=/track"
									className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/20"
								>
									Log In To Open Track Data, Predictions, and Strategy Tools
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
			<div className="fixed inset-0 z-0 bg-black/86" />
			<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_16%,rgba(12,180,255,0.13),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(255,61,61,0.15),transparent_28%)]" />
			<div className="relative z-10 mx-auto w-full max-w-[1700px] space-y-4 pb-8 animate-fade-in">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-lg">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200/80">
							{aspectConfig.label}
						</p>
						<p className="text-sm font-semibold text-white/95">
							{user?.fullName ? `${user.fullName}'s Command Center` : 'Race Command Center'}
						</p>
					</div>
					<div className="inline-flex items-center gap-2">
						<span className="hidden rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100 md:inline-flex">
							Personalized
						</span>
						<Link
							href="/schedule"
							className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/12 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition-all hover:bg-cyan-500/24"
						>
							Schedule
						</Link>
					</div>
					<div className="flex w-full flex-wrap gap-2 lg:hidden">
						{DASHBOARD_ASPECTS.map((aspect) => {
							const active = activeAspect === aspect.id;
							return (
								<button
									key={aspect.id}
									type="button"
									onClick={() => setActiveAspect(aspect.id)}
									className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
										active ?
											'border-cyan-400/35 bg-cyan-500/20 text-cyan-50'
										:	'border-white/15 bg-black/35 text-gray-200 hover:border-white/30'
									}`}
								>
									{aspect.label}
								</button>
							);
						})}
					</div>
				</div>

				<div
					className={`flex min-h-[580px] gap-4 ${
						activeAspect === 'race' ?
							'lg:min-h-[calc(100vh-205px)]'
						:	'lg:h-[calc(100vh-205px)] lg:min-h-0'
					}`}
				>
					<DashboardSidebar
						items={DASHBOARD_ASPECTS}
						activeId={activeAspect}
						onSelect={setActiveAspect}
						pinned={sidebarPinned}
						onTogglePinned={setSidebarPinned}
					/>
					<div
						className={`min-h-0 flex-1 rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm md:p-4 ${
							activeAspect === 'race' ? 'overflow-y-auto' : ''
						}`}
					>
						<DashboardShell
							widgetIds={activeWidgetIds}
							spanMap={activeSpanMap}
							layoutMode={
								activeAspect === 'race' ? 'race-ops'
								: activeAspect === 'overview' ?
									'overview-manual'
								:	'grid'
							}
							renderWidget={renderWidget}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
