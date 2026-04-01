'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';
import {
	ChampionshipPulseWidget,
	ConstructorBattleWidget,
	F1NewsWidget,
	KpisWidget,
	LastRaceWidget,
	NextRaceWidget,
	SessionResultsWidget,
	StartingGridWidget,
	TitleFightWidget,
	UpcomingSessionsWidget,
	WeekendStatusWidget,
} from '@/components/dashboard/widgets';
import { parseRaceDateTime } from '@/components/schedule/scheduleHelpers';
import { getMyPreferences, updateMyFavorites } from '@/lib/api/preferencesApi';
import {
	getCurrentWeekendBrief,
	getLastRace,
	getLatestF1News,
	getNextRace,
	getSchedule,
} from '@/lib/api/scheduleApi';
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
import {
	FaBroadcastTower,
	FaCalendarAlt,
	FaChartLine,
	FaExchangeAlt,
	FaProjectDiagram,
} from 'react-icons/fa';
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

const DASHBOARD_ASPECTS = [
	{
		id: 'overview',
		label: 'Overview',
		widgets: ['kpis', 'championship-pulse', 'constructor-battle'],
	},
	{
		id: 'operations',
		label: 'Race Ops',
		widgets: ['weekend-status', 'session-results', 'starting-grid', 'f1-news'],
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
	operations: {
		'weekend-status': 'md:col-span-2',
		'session-results': 'md:col-span-2',
		'starting-grid': 'md:col-span-1 md:min-h-[520px]',
		'f1-news': 'md:col-span-1 md:min-h-[520px]',
		'last-race': 'md:col-span-2 md:min-h-[620px]',
		'next-race': 'md:col-span-1',
		'upcoming-sessions': 'md:col-span-1',
	},
	championship: {
		'title-fight': 'md:col-span-1 md:min-h-[calc(100vh-275px)]',
		'constructor-battle': 'md:col-span-1 md:min-h-[calc(100vh-275px)]',
	},
};

const TEAM_COLOR_HEX = {
	mercedes: '#27F4D2',
	ferrari: '#E8002D',
	mclaren: '#FF8000',
	'red bull': '#3671C6',
	'red bull racing': '#3671C6',
	williams: '#64C4FF',
	alpine: '#FF87BC',
	'alpine f1 team': '#FF87BC',
	'aston martin': '#229971',
	haas: '#B6BABD',
	'haas f1 team': '#B6BABD',
	'rb f1 team': '#6692FF',
	'racing bulls': '#6692FF',
	audi: '#52E252',
	sauber: '#52E252',
	cadillac: '#8A8A8A',
	'cadillac f1 team': '#8A8A8A',
};

function getTeamColorHex(teamName) {
	if (!teamName) return '#a1a1aa';
	const normalized = String(teamName).trim().toLowerCase();
	if (TEAM_COLOR_HEX[normalized]) return TEAM_COLOR_HEX[normalized];
	for (const [alias, color] of Object.entries(TEAM_COLOR_HEX)) {
		if (normalized.includes(alias)) return color;
	}
	return '#a1a1aa';
}

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
	const [weekendBrief, setWeekendBrief] = useState(null);
	const [f1News, setF1News] = useState([]);

	const [favoriteDrivers, setFavoriteDrivers] = useState(
		defaultPreferences.favoriteDrivers
	);
	const [favoriteTeams, setFavoriteTeams] = useState(
		defaultPreferences.favoriteTeams
	);
	const [activeAspect, setActiveAspect] = useState('overview');
	const [prefsHydrated, setPrefsHydrated] = useState(false);
	const { isAuthenticated, user } = useAuth();

	useEffect(() => {
		const fetchDashboardData = async () => {
			setLoading(true);
			try {
				const [
					next,
					last,
					sched,
					trackSched,
					drivers,
					constructors,
					weekend,
					news,
				] = await Promise.all([
					getNextRace().catch(() => null),
					getLastRace().catch(() => null),
					getSchedule(currentYear).catch(() => []),
					getYearSchedule(currentYear).catch(() => []),
					getDriverStandings(currentYear).catch(() => []),
					getConstructorStandings(currentYear).catch(() => []),
					getCurrentWeekendBrief().catch(() => null),
					getLatestF1News(8).catch(() => []),
				]);

				setNextRace(next);
				setLastRace(last);
				setSchedule(Array.isArray(sched) ? sched : []);
				setTrackSchedule(Array.isArray(trackSched) ? trackSched : []);
				setDriverStandings(Array.isArray(drivers) ? drivers : []);
				setConstructorStandings(
					Array.isArray(constructors) ? constructors : []
				);
				setWeekendBrief(weekend || null);
				setF1News(Array.isArray(news) ? news : []);
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
		const leaderPoints = Number(driverStandings[0]?.points || 0);
		const runnerUpPoints = Number(driverStandings[1]?.points || 0);
		const titleGap = Math.max(0, leaderPoints - runnerUpPoints);
		const qualifyingCount =
			weekendBrief?.session_results?.session_type === 'qualifying' ?
				(weekendBrief?.session_results?.rows || []).length
			:	0;

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
				label: 'Track Data Ready',
				value: `${dataReady}/${totalRounds || 0}`,
				icon: FaCalendarAlt,
				progress: clampPercent(
					totalRounds > 0 ? (dataReady / totalRounds) * 100 : 0
				),
			},
			{
				label: 'Title Gap',
				value: `${titleGap} pts`,
				icon: FaCalendarAlt,
				progress: clampPercent(
					leaderPoints > 0 ? (titleGap / leaderPoints) * 100 : 0
				),
			},
			{
				label: 'Race Week Mode',
				value: weekendBrief?.is_race_week ? 'Active' : 'Idle',
				icon: FaCalendarAlt,
				progress: weekendBrief?.is_race_week ? 100 : 30,
			},
			{
				label: 'Qualifying Entries',
				value: qualifyingCount,
				icon: FaCalendarAlt,
				progress: clampPercent((qualifyingCount / 20) * 100),
			},
		];
	}, [trackSchedule, schedule, nextRace, driverStandings, weekendBrief]);

	const upcomingRaces = useMemo(() => {
		const src = trackSchedule.length > 0 ? trackSchedule : schedule;
		return src.filter((r) => !r.is_past);
	}, [trackSchedule, schedule]);

	const seasonOverview = useMemo(() => {
		const source = trackSchedule.length > 0 ? trackSchedule : schedule;
		const completedRounds = source.filter((race) => race.is_past).length;
		const totalRounds = source.length;
		const dataReady = trackSchedule.filter((race) => race.has_data).length;

		return {
			completedRounds,
			totalRounds,
			dataReady,
		};
	}, [trackSchedule, schedule]);

	const compareHref = useMemo(() => {
		const params = new URLSearchParams({
			year: String(currentYear),
		});
		const first = driverStandings[0]?.driver_code;
		const second = driverStandings[1]?.driver_code;
		if (first) params.set('a', first);
		if (second) params.set('b', second);
		return `/compare?${params.toString()}`;
	}, [driverStandings, currentYear]);

	const driverPointsChartData = useMemo(
		() =>
			driverStandings.slice(0, 8).map((row) => {
				const shortName =
					row.driver_code || row.driver_name?.split(' ').slice(-1)[0] || 'DRV';
				return {
					name: shortName,
					driverName: row.driver_name,
					teamName: row.team_name,
					points: Number(row.points || 0),
					wins: Number(row.wins || 0),
					teamColor: getTeamColorHex(row.team_name),
					isFavorite: favoriteDrivers.includes(row.driver_code),
				};
			}),
		[driverStandings, favoriteDrivers]
	);

	const constructorPointsChartData = useMemo(
		() =>
			constructorStandings.slice(0, 8).map((row) => ({
				team: row.team_name,
				shortTeam:
					row.team_name
						?.replace(/[^A-Za-z]/g, '')
						.slice(0, 4)
						.toUpperCase() || 'TEAM',
				points: Number(row.points || 0),
				wins: Number(row.wins || 0),
				teamColor: getTeamColorHex(row.team_name),
				isFavorite: favoriteTeams.includes(row.team_name),
			})),
		[constructorStandings, favoriteTeams]
	);

	const readinessByRoundChartData = useMemo(() => {
		const source = (trackSchedule.length > 0 ? trackSchedule : schedule)
			.slice()
			.sort((a, b) => Number(a.round || 0) - Number(b.round || 0));

		const readinessByRound = new Map(
			trackSchedule.map((race) => [
				Number(race.round || 0),
				Boolean(race.has_data),
			])
		);

		let completedCumulative = 0;
		let dataReadyCumulative = 0;

		return source.map((race) => {
			const round = Number(race.round || 0);
			const completed = Boolean(race.is_past);
			const hasData = Boolean(
				typeof race.has_data === 'boolean' ?
					race.has_data
				:	readinessByRound.get(round)
			);

			if (completed) completedCumulative += 1;
			if (hasData) dataReadyCumulative += 1;

			return {
				round: round > 0 ? `R${round}` : 'R?',
				completed: completedCumulative,
				dataReady: dataReadyCumulative,
				backlog: Math.max(completedCumulative - dataReadyCumulative, 0),
			};
		});
	}, [trackSchedule, schedule]);

	const chartTooltipStyle = {
		backgroundColor: 'rgba(7, 7, 10, 0.96)',
		border: '1px solid rgba(255,255,255,0.14)',
		borderRadius: '12px',
		color: '#f4f4f5',
	};

	const missionSignals = useMemo(
		() => [
			{
				label: 'Season Progress',
				value: `${seasonOverview.completedRounds}/${seasonOverview.totalRounds || 0}`,
				detail: `Next round ${nextRace?.round || 'TBA'}`,
				accent:
					'from-amber-500/25 via-amber-400/10 to-transparent border-amber-300/30',
			},
			{
				label: 'Data Coverage',
				value: `${seasonOverview.dataReady} ready`,
				detail: 'Track simulations online',
				accent:
					'from-zinc-400/25 via-zinc-200/10 to-transparent border-zinc-300/30',
			},
			{
				label: 'Weekend State',
				value: weekendBrief?.is_race_week ? 'Race Week' : 'Off Week',
				detail:
					weekendBrief?.last_completed_session?.name ||
					'Waiting for next session',
				accent:
					'from-amber-500/25 via-amber-500/10 to-transparent border-amber-300/30',
			},
			{
				label: 'Title Gap',
				value: `${Math.max(0, Number(driverStandings[0]?.points || 0) - Number(driverStandings[1]?.points || 0))} pts`,
				detail: 'Driver championship delta',
				accent: 'from-white/20 via-white/8 to-transparent border-white/20',
			},
		],
		[seasonOverview, nextRace, weekendBrief, driverStandings]
	);

	const actionRail = useMemo(
		() => [
			{
				label: 'Telemetry Center',
				detail:
					weekendBrief?.last_completed_session?.name ||
					'Latest completed session feed',
				href: '/telemetry',
				icon: FaBroadcastTower,
				tone: 'border-amber-300/30 bg-amber-500/12 text-amber-100',
			},
			{
				label: 'Driver Compare',
				detail:
					driverStandings.length >= 2 ?
						`${driverStandings[0]?.driver_code} vs ${driverStandings[1]?.driver_code}`
					:	'Head-to-head season scan',
				href: compareHref,
				icon: FaExchangeAlt,
				tone: 'border-white/25 bg-white/8 text-zinc-100',
			},
			{
				label: 'Track Lab',
				detail: 'Run replay visualizations',
				href: '/track',
				icon: FaProjectDiagram,
				tone: 'border-zinc-300/25 bg-zinc-500/12 text-zinc-100',
			},
			{
				label: 'Strategy Room',
				detail: 'Model pit stop windows',
				href: '/strategy',
				icon: FaChartLine,
				tone: 'border-amber-300/30 bg-amber-500/12 text-amber-100',
			},
		],
		[weekendBrief, driverStandings, compareHref]
	);

	const aspectConfig = useMemo(
		() =>
			DASHBOARD_ASPECTS.find((aspect) => aspect.id === activeAspect) ||
			DASHBOARD_ASPECTS[0],
		[activeAspect]
	);
	const isLiveRaceWeekend = Boolean(weekendBrief?.is_race_week);
	const activeAspectLabel =
		activeAspect === 'operations' && !isLiveRaceWeekend ?
			'Latest Race Intel'
		:	aspectConfig.label;

	const activeWidgetIds = useMemo(() => {
		if (activeAspect === 'operations' && !isLiveRaceWeekend) {
			return ['last-race', 'next-race', 'upcoming-sessions', 'f1-news'];
		}
		return Array.from(new Set(aspectConfig.widgets)).slice(0, 4);
	}, [aspectConfig, activeAspect, isLiveRaceWeekend]);

	const activeSpanMap = useMemo(() => {
		if (activeAspect === 'operations' && !isLiveRaceWeekend) {
			return {
				'last-race': 'md:col-span-2',
				'next-race': 'md:col-span-1',
				'upcoming-sessions': 'md:col-span-1',
				'f1-news': 'md:col-span-2 md:min-h-[360px]',
			};
		}
		return ASPECT_WIDGET_SPANS[activeAspect] || {};
	}, [activeAspect, isLiveRaceWeekend]);

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
			case 'weekend-status':
				return <WeekendStatusWidget weekendBrief={weekendBrief} />;
			case 'session-results':
				return <SessionResultsWidget weekendBrief={weekendBrief} />;
			case 'starting-grid':
				return <StartingGridWidget weekendBrief={weekendBrief} />;
			case 'f1-news':
				return <F1NewsWidget newsItems={f1News} />;
			default:
				return null;
		}
	};

	if (loading) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/86" />
				<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_16%,rgba(245,158,11,0.14),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(255,255,255,0.08),transparent_28%)]" />
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
		const completedRounds = seasonOverview.completedRounds;
		const totalRounds = seasonOverview.totalRounds;
		const dataReady = seasonOverview.dataReady;

		return (
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/86" />
				<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_16%,rgba(245,158,11,0.14),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(255,255,255,0.08),transparent_28%)]" />
				<div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 pb-10 animate-fade-in">
					<div className="rounded-3xl border border-white/10 bg-black/35 p-6 backdrop-blur-xl md:p-8">
						<p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-200/80">
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
							<Link
								href={compareHref}
								className="inline-flex items-center rounded-full border border-fuchsia-300/30 bg-fuchsia-500/12 px-5 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/22"
							>
								Try Driver Comparison
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
								{nextRace?.race_name ||
									nextRace?.event ||
									'Next race coming soon'}
							</h2>
							<p className="mt-2 text-sm text-gray-300">
								{nextRace?.circuit?.circuit_name ||
									nextRace?.circuit_name ||
									nextRace?.circuit ||
									'Circuit to be confirmed'}
								{' · '}
								{nextRace?.country || nextRace?.circuit?.country || 'TBA'}
							</p>
							<p className="mt-3 text-sm text-gray-400">
								{countdown ?
									`${countdown.days}d ${countdown.hours}h ${countdown.minutes}m until lights out.`
								:	'The next session timing will appear here as soon as it is available.'
								}
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
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
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
									className="inline-flex w-full items-center justify-center rounded-xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
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
			<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_16%,rgba(245,158,11,0.14),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(255,255,255,0.08),transparent_28%)]" />
			<div className="relative z-10 mx-auto w-full max-w-[1700px] space-y-4 pb-8 animate-fade-in">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-lg">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/80">
							{activeAspectLabel}
						</p>
						<p className="text-sm font-semibold text-white/95">
							{user?.fullName ?
								`${user.fullName}'s Command Center`
							:	'Race Command Center'}
						</p>
					</div>
					<div className="inline-flex items-center gap-2">
						<span className="hidden rounded-full border border-amber-300/25 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-100 md:inline-flex">
							Personalized
						</span>
						<Link
							href={compareHref}
							className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-300/30 bg-fuchsia-500/12 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 transition-all hover:bg-fuchsia-500/24"
						>
							Compare
						</Link>
						<Link
							href="/schedule"
							className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/12 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-all hover:bg-amber-500/24"
						>
							Schedule
						</Link>
					</div>
					<div className="flex w-full flex-wrap gap-2">
						{DASHBOARD_ASPECTS.map((aspect) => {
							const active = activeAspect === aspect.id;
							return (
								<button
									key={aspect.id}
									type="button"
									onClick={() => setActiveAspect(aspect.id)}
									className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
										active ?
											'border-amber-300/35 bg-amber-500/20 text-amber-100'
										:	'border-white/15 bg-black/35 text-gray-200 hover:border-white/30'
									}`}
								>
									{aspect.label}
								</button>
							);
						})}
					</div>
				</div>

				{activeAspect === 'overview' && (
					<>
						<div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
							{missionSignals.map((signal) => (
								<div
									key={signal.label}
									className={`rounded-xl border bg-linear-to-br p-4 backdrop-blur-md ${signal.accent}`}
								>
									<p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-300">
										{signal.label}
									</p>
									<p className="mt-2 text-2xl font-black text-white">
										{signal.value}
									</p>
									<p className="mt-1 text-xs text-zinc-300">{signal.detail}</p>
								</div>
							))}
						</div>

						<div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
							{actionRail.map((action) => {
								const Icon = action.icon;
								return (
									<Link
										key={action.label}
										href={action.href}
										className={`rounded-xl border p-4 transition-all hover:-translate-y-px hover:bg-white/10 ${action.tone}`}
									>
										<div className="flex items-center justify-between gap-3">
											<p className="text-sm font-bold tracking-wide">
												{action.label}
											</p>
											<Icon className="text-lg" />
										</div>
										<p className="mt-2 text-xs text-zinc-200/90">
											{action.detail}
										</p>
									</Link>
								);
							})}
						</div>

						<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
							<div className="rounded-2xl border border-white/12 bg-black/35 p-4 backdrop-blur-md">
								<div className="mb-3 flex items-center justify-between gap-3">
									<div>
										<p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
											Driver Performance Matrix
										</p>
										<p className="text-sm font-semibold text-white">
											Points and wins (top 8)
										</p>
									</div>
								</div>
								<div className="h-72">
									<ResponsiveContainer>
										<BarChart
											data={driverPointsChartData}
											layout="vertical"
											margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
										>
											<CartesianGrid
												stroke="rgba(255,255,255,0.09)"
												horizontal={false}
											/>
											<XAxis
												type="number"
												stroke="#a1a1aa"
											/>
											<YAxis
												type="category"
												dataKey="name"
												stroke="#d4d4d8"
												width={46}
											/>
											<Tooltip contentStyle={chartTooltipStyle} />
											<Legend wrapperStyle={{ fontSize: 11 }} />
											<Bar
												dataKey="points"
												name="Points"
												radius={[4, 4, 4, 4]}
											>
												{driverPointsChartData.map((entry, index) => (
													<Cell
														key={`driver-cell-${entry.name}-${index}`}
														fill={entry.teamColor}
													/>
												))}
												<LabelList
													dataKey="points"
													position="right"
													fill="#f4f4f5"
													fontSize={11}
												/>
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
								<p className="mt-2 text-[11px] text-zinc-400">
									Team-colored bars with direct point labels for quick reading.
								</p>
							</div>

							<div className="rounded-2xl border border-white/12 bg-black/35 p-4 backdrop-blur-md">
								<div className="mb-3 flex items-center justify-between gap-3">
									<div>
										<p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
											Constructor Scorecard
										</p>
										<p className="text-sm font-semibold text-white">
											Team points vs wins
										</p>
									</div>
								</div>
								<div className="h-72">
									<ResponsiveContainer>
										<BarChart
											data={constructorPointsChartData}
											margin={{ top: 8, right: 8, left: 8, bottom: 12 }}
										>
											<CartesianGrid
												stroke="rgba(255,255,255,0.09)"
												vertical={false}
											/>
											<XAxis
												dataKey="shortTeam"
												stroke="#d4d4d8"
											/>
											<YAxis stroke="#a1a1aa" />
											<Tooltip contentStyle={chartTooltipStyle} />
											<Legend wrapperStyle={{ fontSize: 11 }} />
											<Bar
												dataKey="points"
												name="Points"
												radius={[6, 6, 0, 0]}
											>
												{constructorPointsChartData.map((entry, index) => (
													<Cell
														key={`constructor-cell-${entry.shortTeam}-${index}`}
														fill={entry.teamColor}
													/>
												))}
												<LabelList
													dataKey="points"
													position="top"
													fill="#f4f4f5"
													fontSize={11}
												/>
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
								<p className="mt-2 text-[11px] text-zinc-400">
									Each constructor uses its team color, with values shown above
									bars.
								</p>
							</div>
						</div>

						<div className="rounded-2xl border border-white/12 bg-black/35 p-4 backdrop-blur-md">
							<div className="mb-3 flex items-center justify-between gap-3">
								<div>
									<p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
										Operational Readiness Trend
									</p>
									<p className="text-sm font-semibold text-white">
										Completed rounds vs track data readiness
									</p>
								</div>
							</div>
							<div className="h-72">
								<ResponsiveContainer>
									<AreaChart
										data={readinessByRoundChartData}
										margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
									>
										<CartesianGrid stroke="rgba(255,255,255,0.09)" />
										<XAxis
											dataKey="round"
											stroke="#d4d4d8"
										/>
										<YAxis stroke="#a1a1aa" />
										<Tooltip contentStyle={chartTooltipStyle} />
										<Legend wrapperStyle={{ fontSize: 11 }} />
										<Area
											type="monotone"
											dataKey="completed"
											name="Completed Rounds"
											stroke="#f59e0b"
											fill="#f59e0b"
											fillOpacity={0.18}
										/>
										<Area
											type="monotone"
											dataKey="dataReady"
											name="Data Ready"
											stroke="#22d3ee"
											fill="#22d3ee"
											fillOpacity={0.16}
										/>
										<Area
											type="monotone"
											dataKey="backlog"
											name="Data Gap"
											stroke="#ef4444"
											fill="#ef4444"
											fillOpacity={0.13}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>
					</>
				)}

				<div
					className={`min-h-[580px] rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm md:p-4 ${
						activeAspect === 'operations' && !isLiveRaceWeekend ?
							'overflow-y-auto lg:min-h-[calc(100vh-205px)]'
						:	'lg:h-[calc(100vh-205px)] lg:min-h-0'
					}`}
				>
					<DashboardShell
						widgetIds={activeWidgetIds}
						spanMap={activeSpanMap}
						layoutMode={
							activeAspect === 'overview' ? 'overview-manual' : 'grid'
						}
						renderWidget={renderWidget}
					/>
				</div>
			</div>
		</div>
	);
}
