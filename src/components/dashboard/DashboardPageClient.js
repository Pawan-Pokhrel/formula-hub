'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';
import {
	ChampionshipPulseWidget,
	ConstructorBattleWidget,
	F1NewsWidget,
	GeneratedRacesWidget,
	KpisWidget,
	LastRaceWidget,
	NextRaceWidget,
	SessionResultsWidget,
	StartingGridWidget,
	TitleFightWidget,
	UpcomingSessionsWidget,
	WeekendStatusWidget,
} from '@/components/dashboard/widgets';
import {
	getDriverImagePath,
	getTeamLogoPath,
	parseRaceDateTime,
} from '@/components/schedule/scheduleHelpers';
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
import { getYearSchedule, toggleTrackFavorite } from '@/lib/api/trackApi';
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
import { getCarImage } from '@/utils/f1_images';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
	FaArrowRight,
	FaBroadcastTower,
	FaCalendarAlt,
	FaChartLine,
	FaExchangeAlt,
	FaProjectDiagram,
	FaStar,
	FaTrophy,
} from 'react-icons/fa';

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
	{
		id: 'saved',
		label: 'Generated Races',
		widgets: ['saved-races'],
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
	saved: {
		'saved-races': 'md:col-span-2',
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

	const generatedRaces = useMemo(
		() =>
			trackSchedule
				.filter((race) => race.is_past && race.has_data)
				.slice()
				.sort((a, b) => Number(b.round || 0) - Number(a.round || 0)),
		[trackSchedule]
	);

	const [favoriteDrivers, setFavoriteDrivers] = useState(
		defaultPreferences.favoriteDrivers
	);
	const [favoriteTeams, setFavoriteTeams] = useState(
		defaultPreferences.favoriteTeams
	);
	const [activeAspect, setActiveAspect] = useState('overview');
	const [prefsHydrated, setPrefsHydrated] = useState(false);
	const hasFetchedDashboardDataRef = useRef(false);
	const { isAuthenticated, user } = useAuth();

	useEffect(() => {
		if (hasFetchedDashboardDataRef.current) return;
		hasFetchedDashboardDataRef.current = true;

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
		const upcomingRound = nextRace?.round || '-';
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

	const actionRail = useMemo(
		() => [
			{
				label: 'Race Schedule',
				detail: 'Calendar and weekend sessions',
				href: '/schedule',
				icon: FaCalendarAlt,
			},
			{
				label: 'Standings Hub',
				detail: 'Driver and constructor rankings',
				href: '/standings',
				icon: FaTrophy,
			},
			{
				label: 'Telemetry Center',
				detail:
					weekendBrief?.last_completed_session?.name ||
					'Latest completed session feed',
				href: '/telemetry',
				icon: FaBroadcastTower,
			},
			{
				label: 'Driver Compare',
				detail:
					driverStandings.length >= 2 ?
						`${driverStandings[0]?.driver_code} vs ${driverStandings[1]?.driver_code}`
					:	'Head-to-head season scan',
				href: compareHref,
				icon: FaExchangeAlt,
			},
			{
				label: 'Track Lab',
				detail: 'Run replay visualizations',
				href: '/track',
				icon: FaProjectDiagram,
			},
			{
				label: 'Strategy Room',
				detail: 'Model pit stop windows',
				href: '/strategy',
				icon: FaChartLine,
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
	const activeWidgetIds = useMemo(() => {
		if (activeAspect === 'operations' && !isLiveRaceWeekend) {
			return ['last-race', 'next-race', 'upcoming-sessions', 'f1-news'];
		}
		if (activeAspect === 'saved') {
			return ['saved-races'];
		}
		return Array.from(new Set(aspectConfig.widgets)).slice(0, 4);
	}, [aspectConfig, activeAspect, isLiveRaceWeekend]);

	const activeSpanMap = useMemo(() => {
		if (activeAspect === 'operations' && !isLiveRaceWeekend) {
			return {
				'last-race': 'md:col-span-2',
				'next-race': 'md:col-span-1',
				'upcoming-sessions': 'md:col-span-1',
				'f1-news': 'md:col-span-2',
			};
		}
		if (activeAspect === 'saved') {
			return { 'saved-races': 'md:col-span-2' };
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

	const handleToggleGeneratedRaceSave = async (race) => {
		if (!race) return;
		const raceYear = Number(race.year || currentYear);
		const raceRound = Number(race.round);

		try {
			const result = await toggleTrackFavorite(raceYear, raceRound);
			setTrackSchedule((prev) =>
				prev.map((item) => {
					const itemYear = Number(item.year || currentYear);
					const itemRound = Number(item.round);
					if (itemYear !== raceYear || itemRound !== raceRound) {
						return item;
					}
					return {
						...item,
						is_favorite: Boolean(result?.is_favorite),
					};
				})
			);
		} catch {
			// Keep current dashboard view if favorite toggle fails.
		}
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
			case 'saved-races':
				return (
					<GeneratedRacesWidget
						races={generatedRaces}
						currentYear={currentYear}
						onToggleSave={handleToggleGeneratedRaceSave}
					/>
				);
			default:
				return null;
		}
	};

	if (loading) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-20 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/90" />
				<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_14%,rgba(239,68,68,0.14),transparent_38%),radial-gradient(circle_at_84%_10%,rgba(39,244,210,0.11),transparent_33%),radial-gradient(circle_at_78%_76%,rgba(255,128,0,0.10),transparent_36%),radial-gradient(circle_at_18%_82%,rgba(54,113,198,0.10),transparent_34%)]" />
				<div className="relative z-10 mx-auto w-full max-w-[1760px] space-y-4 animate-fade-in pt-8">
					<div className="h-12 w-80 animate-pulse rounded-2xl bg-white/8" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5"
							/>
						))}
					</div>
					<div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
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
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-20 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/90" />
				<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_14%,rgba(239,68,68,0.14),transparent_38%),radial-gradient(circle_at_84%_10%,rgba(39,244,210,0.11),transparent_33%),radial-gradient(circle_at_78%_76%,rgba(255,128,0,0.10),transparent_36%),radial-gradient(circle_at_18%_82%,rgba(54,113,198,0.10),transparent_34%)]" />
				<div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 pb-12 animate-fade-in">
					<div className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/60 p-7 backdrop-blur-xl md:p-10">
						<div
							className="pointer-events-none absolute inset-0 opacity-30"
							style={{
								backgroundImage:
									'repeating-linear-gradient(0deg,rgba(255,255,255,0.06) 0px,rgba(255,255,255,0.06) 1px,transparent 1px,transparent 18px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 20px)',
							}}
						/>
						<div className="relative z-10">
							<p className="text-[11px] font-bold uppercase tracking-[0.3em] text-red-400/80">
								FormulaHub · Season Dashboard
							</p>
							<h1 className="mt-2 max-w-3xl text-3xl font-black uppercase tracking-wide leading-none md:text-5xl">
								Your F1 Command
								<br />
								<span className="text-red-500">Center Awaits</span>
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 md:text-base">
								Live championship standings, upcoming race countdowns, and
								personalized driver favorites - all in one place. Sign in to
								unlock saved track replays, strategy tools, and telemetry
								insights.
							</p>
							<div className="mt-7 flex flex-wrap gap-3">
								<Link
									href="/login?next=/dashboard"
									prefetch={true}
									className="inline-flex items-center rounded-2xl bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-600/25 transition hover:bg-red-500 hover:-translate-y-px"
								>
									Sign In for Full Access
								</Link>
								<Link
									href="/register"
									prefetch={true}
									className="inline-flex items-center rounded-2xl border border-white/15 bg-white/8 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/14 hover:-translate-y-px"
								>
									Create Account
								</Link>
								<Link
									href={compareHref}
									prefetch={true}
									className="inline-flex items-center rounded-2xl border border-white/12 bg-black/40 px-6 py-3 text-sm font-semibold text-gray-200 backdrop-blur-xl transition hover:border-white/25 hover:text-white hover:-translate-y-px"
								>
									Try Driver Comparison
								</Link>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
						{kpis.slice(0, 6).map((item) => (
							<div
								key={item.label}
								className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur-xl transition-all hover:border-white/20"
							>
								<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
									{item.label}
								</p>
								<p className="mt-2 text-2xl font-black text-white leading-none tabular-nums">
									{item.value}
								</p>
								<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
									<div
										className="h-full rounded-full bg-linear-to-r from-red-600 to-red-400"
										style={{ width: `${item.progress}%` }}
									/>
								</div>
							</div>
						))}
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr]">
						<div className="rounded-2xl border border-white/10 bg-black/55 p-6 backdrop-blur-xl">
							<p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-red-400/80">
								Championship Leaders
							</p>
							<p className="mb-5 text-xs text-gray-500">
								Live standings preview - sign in to set favorites
							</p>
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								{headlineDriver && (
									<div
										className="relative overflow-hidden rounded-xl border border-white/14 p-4 transition-all hover:border-white/25"
										style={{
											background: `linear-gradient(120deg,${getTeamColorHex(headlineDriver?.team_name)}CC 0%,${getTeamColorHex(headlineDriver?.team_name)}66 55%,rgba(8,8,10,0.90) 100%)`,
										}}
									>
										<div className="relative z-10">
											<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
												P1 · Drivers
											</p>
											<p className="mt-1 text-xl font-black text-white">
												{headlineDriver?.driver_name || '-'}
											</p>
											<p className="text-xs text-white/70">
												{headlineDriver?.team_name}
											</p>
											<p className="mt-3 text-3xl font-black tabular-nums text-white">
												{headlineDriver?.points || 0}
												<span className="ml-1 text-sm font-semibold text-white/55">
													pts
												</span>
											</p>
										</div>
									</div>
								)}
								{headlineTeam && (
									<div
										className="relative overflow-hidden rounded-xl border border-white/14 p-4 transition-all hover:border-white/25"
										style={{
											background: `linear-gradient(120deg,${getTeamColorHex(headlineTeam?.team_name)}CC 0%,${getTeamColorHex(headlineTeam?.team_name)}66 55%,rgba(8,8,10,0.90) 100%)`,
										}}
									>
										<div className="relative z-10">
											<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
												P1 · Constructors
											</p>
											<p className="mt-1 text-xl font-black text-white">
												{headlineTeam?.team_name || '-'}
											</p>
											<p className="text-xs text-white/70">
												Wins: {headlineTeam?.wins || 0}
											</p>
											<p className="mt-3 text-3xl font-black tabular-nums text-white">
												{headlineTeam?.points || 0}
												<span className="ml-1 text-sm font-semibold text-white/55">
													pts
												</span>
											</p>
										</div>
									</div>
								)}
							</div>
							<div className="mt-4 grid grid-cols-3 gap-3">
								{[
									{
										label: 'Season Progress',
										value: `${completedRounds}/${totalRounds || 0}`,
									},
									{ label: 'Track Data Ready', value: dataReady },
									{
										label: 'Last Race',
										value: lastRace?.race_name || lastRace?.event || 'TBA',
									},
								].map((stat) => (
									<div
										key={stat.label}
										className="rounded-xl border border-white/10 bg-black/40 p-3"
									>
										<p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
											{stat.label}
										</p>
										<p className="mt-1.5 text-sm font-bold text-white line-clamp-1">
											{stat.value}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="flex flex-col gap-4">
							<div className="flex-1 rounded-2xl border border-white/10 bg-black/55 p-6 backdrop-blur-xl">
								<p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-red-400/80">
									Next Race
								</p>
								<h2 className="mt-2 text-lg font-black text-white">
									{nextRace?.race_name || nextRace?.event || 'Coming soon'}
								</h2>
								<p className="mt-1 text-xs text-gray-400">
									{nextRace?.circuit?.circuit_name || nextRace?.circuit || '-'}
									{' · '}
									{nextRace?.country || nextRace?.circuit?.country || 'TBA'}
								</p>
								{countdown && (
									<div className="mt-4 grid grid-cols-3 gap-2 text-center">
										{[
											{ label: 'Days', value: countdown.days },
											{ label: 'Hrs', value: countdown.hours },
											{ label: 'Min', value: countdown.minutes },
										].map((cell) => (
											<div
												key={cell.label}
												className="rounded-xl border border-white/12 bg-black/50 py-3"
											>
												<p className="text-2xl font-black tabular-nums">
													{cell.value}
												</p>
												<p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
													{cell.label}
												</p>
											</div>
										))}
									</div>
								)}
							</div>
							<Link
								href="/login?next=/dashboard"
								prefetch={true}
								className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/15 px-5 py-4 text-sm font-bold text-red-100 backdrop-blur-xl transition-all hover:bg-red-500/25 hover:-translate-y-px"
							>
								<FaTrophy className="text-red-400" />
								Sign In to Unlock All Features
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-20 text-white md:px-12 lg:px-20">
			<div className="fixed inset-0 z-0 bg-black/90" />
			<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_14%,rgba(239,68,68,0.14),transparent_38%),radial-gradient(circle_at_84%_10%,rgba(39,244,210,0.11),transparent_33%),radial-gradient(circle_at_78%_76%,rgba(255,128,0,0.10),transparent_36%),radial-gradient(circle_at_18%_82%,rgba(54,113,198,0.10),transparent_34%)]" />
			<div className="relative z-10 mx-auto w-full max-w-[1700px] space-y-4 pb-12 animate-fade-in">
				<div className="flex flex-col gap-2 pt-6 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.28em] text-red-400/80">
							FormulaHub · Command Center
						</p>
						<h1 className="mt-1 text-3xl font-black uppercase tracking-wide md:text-4xl">
							{user?.fullName ?
								`${user.fullName}'s Dashboard`
							:	'Race Dashboard'}
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Link
							href={compareHref}
							prefetch={true}
							className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/10"
						>
							Compare Drivers
						</Link>
						<Link
							href="/schedule"
							prefetch={true}
							className="inline-flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/12 px-4 py-2 text-xs font-semibold text-red-100 backdrop-blur-xl transition-all hover:bg-red-500/20"
						>
							Full Schedule
						</Link>
						<Link
							href="/standings"
							prefetch={true}
							className="inline-flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/12 px-4 py-2 text-xs font-semibold text-red-100 backdrop-blur-xl transition-all hover:bg-red-500/20"
						>
							Standings
						</Link>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
					{DASHBOARD_ASPECTS.filter(
						(aspect) => aspect.id !== 'saved' || isAuthenticated
					).map((aspect) => {
						const active = activeAspect === aspect.id;
						const isSaved = aspect.id === 'saved';
						return (
							<button
								key={aspect.id}
								type="button"
								onClick={() => setActiveAspect(aspect.id)}
								className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all duration-200 ${
									active ?
										'border-red-400/45 bg-red-500/20 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.18)]'
									:	'border-white/10 bg-transparent text-gray-400 hover:border-red-400/35 hover:text-red-100'
								}`}
							>
								{isSaved && (
									<FaStar
										className={`text-[9px] ${
											active ? 'text-red-300' : 'text-red-600'
										}`}
									/>
								)}
								{aspect.label}
								{isSaved && generatedRaces.length > 0 && (
									<span
										className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
											active ?
												'bg-red-500/30 text-red-100'
											:	'bg-white/10 text-gray-500'
										}`}
									>
										{generatedRaces.length}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{activeAspect === 'overview' && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{actionRail.map((action) => {
								const Icon = action.icon;
								return (
									<Link
										key={action.label}
										href={action.href}
										prefetch={true}
										className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/45 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-500/40 hover:bg-black/62 hover:shadow-lg hover:shadow-red-500/10"
									>
										<div
											className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
											style={{
												backgroundImage:
													'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(0,0,0,0) 60%)',
											}}
										/>
										<div className="relative z-10 flex items-center justify-between gap-3">
											<div className="inline-flex min-w-0 items-center gap-3">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-red-400 transition-colors group-hover:border-red-500/30 group-hover:bg-red-500/15 group-hover:text-red-200">
													<Icon size={16} />
												</div>
												<div className="min-w-0">
													<p className="truncate text-xs font-black uppercase tracking-[0.14em] text-zinc-100 group-hover:text-white">
														{action.label}
													</p>
													<p className="truncate text-[11px] text-zinc-400 group-hover:text-zinc-300">
														{action.detail}
													</p>
												</div>
											</div>
											<div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 transition-colors group-hover:text-red-300">
												Open <FaArrowRight className="text-[10px]" />
											</div>
										</div>
									</Link>
								);
							})}
						</div>

						{favoriteDrivers.length > 0 || favoriteTeams.length > 0 ?
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
								{favoriteDrivers.slice(0, FAVORITE_DRIVER_LIMIT).map((code) => {
									const drv = driverStandings.find(
										(d) => d.driver_code === code
									);
									if (!drv) return null;
									const leaderPoints = Number(driverStandings[0]?.points || 0);
									const gap = leaderPoints - Number(drv.points);
									const isLeader = driverStandings[0]?.driver_code === code;
									const driverRankIndex = driverStandings.findIndex(
										(d) => d.driver_code === code
									);
									const driverRank = Number(
										drv.position ||
											(driverRankIndex >= 0 ? driverRankIndex + 1 : 0)
									);
									const runnerUpPoints = Number(
										driverStandings[1]?.points || 0
									);
									const displayGap =
										isLeader ?
											`+${Math.max(0, Number(drv.points) - runnerUpPoints)} PTS CLEAR`
										:	`-${Math.max(0, gap)} PTS TO LEADER`;

									const teamColor = getTeamColorHex(drv.team_name);
									const driverImg = getDriverImagePath(code);
									const teamLogo = getTeamLogoPath(drv.team_name);
									const carImg = getCarImage(drv.team_name);

									return (
										<div
											key={code}
											className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl transition-all duration-300 hover:border-white/20"
											style={{
												backgroundImage: `radial-gradient(circle at top right, ${teamColor}33 0%, rgba(0,0,0,0) 65%)`,
											}}
										>
											<div
												className="pointer-events-none absolute inset-0 opacity-20"
												style={{
													backgroundImage:
														'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 15px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 18px)',
												}}
											/>
											<div className="absolute right-0 top-0 h-full w-3/4 opacity-20 transition-opacity duration-500 hover:opacity-40">
												{carImg && (
													<Image
														src={carImg}
														alt="Car"
														fill
														className="object-contain object-right mix-blend-screen scale-125 translate-x-12 translate-y-8"
													/>
												)}
											</div>
											<div className="relative z-10 flex items-start justify-between">
												<div className="flex items-center gap-4">
													{driverImg ?
														<div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 bg-black/50 shadow-xl">
															<Image
																src={driverImg}
																alt={code}
																fill
																className="object-cover object-top"
															/>
														</div>
													:	<div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-xl font-black shadow-xl">
															{code}
														</div>
													}
													<div>
														<p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
															Favorite Driver
														</p>
														<h3 className="text-xl font-black leading-none text-white">
															{drv.driver_name}
														</h3>
														<p className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-gray-400">
															{teamLogo && (
																<span className="relative inline-block h-3.5 w-3.5 opacity-80">
																	<Image
																		src={teamLogo}
																		alt=""
																		fill
																		className="object-contain"
																	/>
																</span>
															)}
															{drv.team_name}
														</p>
													</div>
												</div>
												<div className="flex flex-col items-end gap-2">
													<span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
														P{driverRank || '-'}
													</span>
													{isLeader && (
														<span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
															Leader
														</span>
													)}
												</div>
											</div>
											<div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
												<div className="rounded-xl border border-white/5 bg-black/40 p-3">
													<p className="text-[10px] uppercase tracking-wider text-gray-500">
														Championship Rank
													</p>
													<p className="text-lg font-black text-white">
														P{driverRank || '-'}
													</p>
												</div>
												<div className="rounded-xl border border-white/5 bg-black/40 p-3">
													<p className="text-[10px] uppercase tracking-wider text-gray-500">
														Championship
													</p>
													<p className="text-2xl font-black text-white">
														{drv.points}{' '}
														<span className="text-xs text-gray-500 font-bold">
															PTS
														</span>
													</p>
												</div>
												<div className="rounded-xl border border-white/5 bg-black/40 p-3 col-span-2">
													<p className="text-[10px] uppercase tracking-wider text-gray-500">
														Title Focus
													</p>
													<p
														className="text-lg font-black leading-tight"
														style={{ color: isLeader ? '#22c55e' : '#f87171' }}
													>
														{displayGap}
													</p>
												</div>
											</div>
										</div>
									);
								})}

								{favoriteTeams.slice(0, FAVORITE_TEAM_LIMIT).map((teamName) => {
									const tm = constructorStandings.find(
										(t) => t.team_name === teamName
									);
									if (!tm) return null;
									const leaderPoints = Number(
										constructorStandings[0]?.points || 0
									);
									const gap = leaderPoints - Number(tm.points);
									const isLeader =
										constructorStandings[0]?.team_name === teamName;
									const teamRankIndex = constructorStandings.findIndex(
										(t) => t.team_name === teamName
									);
									const teamRank = Number(
										tm.position || (teamRankIndex >= 0 ? teamRankIndex + 1 : 0)
									);
									const runnerUpPoints = Number(
										constructorStandings[1]?.points || 0
									);
									const displayGap =
										isLeader ?
											`+${Math.max(0, Number(tm.points) - runnerUpPoints)} PTS CLEAR`
										:	`-${Math.max(0, gap)} PTS TO LEADER`;

									const teamColor = getTeamColorHex(teamName);
									const teamLogo = getTeamLogoPath(teamName);
									const carImg = getCarImage(teamName);

									return (
										<div
											key={teamName}
											className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl transition-all duration-300 hover:border-white/20"
											style={{
												backgroundImage: `radial-gradient(circle at top right, ${teamColor}33 0%, rgba(0,0,0,0) 65%)`,
											}}
										>
											<div
												className="pointer-events-none absolute inset-0 opacity-20"
												style={{
													backgroundImage:
														'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 15px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 18px)',
												}}
											/>
											<div className="absolute right-0 top-0 h-full w-3/4 opacity-30 transition-opacity duration-500 hover:opacity-50">
												{carImg && (
													<Image
														src={carImg}
														alt="Car"
														fill
														className="object-contain object-right mix-blend-screen scale-125 translate-x-8 translate-y-6"
													/>
												)}
											</div>
											<div className="relative z-10 flex items-start justify-between">
												<div className="flex items-center gap-4">
													{teamLogo ?
														<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/50 p-2.5 shadow-xl">
															<Image
																src={teamLogo}
																alt={teamName}
																fill
																className="object-contain"
															/>
														</div>
													:	<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-sm font-black shadow-xl">
															{teamName.substring(0, 3).toUpperCase()}
														</div>
													}
													<div>
														<p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
															Favorite Team
														</p>
														<h3 className="text-xl font-black leading-none text-white">
															{teamName}
														</h3>
														<p className="mt-1.5 text-xs font-semibold text-gray-400">
															Wins: {tm.wins} in {currentYear}
														</p>
													</div>
												</div>
												<div className="flex flex-col items-end gap-2">
													<span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
														P{teamRank || '-'}
													</span>
													{isLeader && (
														<span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
															Leader
														</span>
													)}
												</div>
											</div>
											<div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
												<div className="rounded-xl border border-white/5 bg-black/40 p-3">
													<p className="text-[10px] uppercase tracking-wider text-gray-500">
														Championship Rank
													</p>
													<p className="text-lg font-black text-white">
														P{teamRank || '-'}
													</p>
												</div>
												<div className="rounded-xl border border-white/5 bg-black/40 p-3">
													<p className="text-[10px] uppercase tracking-wider text-gray-500">
														Championship
													</p>
													<p className="text-2xl font-black text-white">
														{tm.points}{' '}
														<span className="text-xs text-gray-500 font-bold">
															PTS
														</span>
													</p>
												</div>
												<div className="rounded-xl border border-white/5 bg-black/40 p-3 col-span-2">
													<p className="text-[10px] uppercase tracking-wider text-gray-500">
														Title Focus
													</p>
													<p
														className="text-lg font-black leading-tight"
														style={{ color: isLeader ? '#22c55e' : '#f87171' }}
													>
														{displayGap}
													</p>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						:	<div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
								<FaStar className="mb-4 text-3xl text-gray-600" />
								<h3 className="text-lg font-bold text-white">
									No Favorites Selected
								</h3>
								<p className="mt-2 max-w-sm text-center text-sm text-gray-400">
									Select your favorite drivers and teams from your profile or
									the standing hub to unlock personalized stats here.
								</p>
								<Link
									href="/profile"
									className="mt-4 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-500 transition-colors"
								>
									Update Preferences
								</Link>
							</div>
						}
					</div>
				)}

				<div
					className={`rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm md:p-4 ${
						activeAspect === 'operations' && !isLiveRaceWeekend ?
							'min-h-0 overflow-visible'
						: activeAspect === 'overview' ? 'hidden'
						: 'min-h-[580px] lg:h-[calc(100vh-205px)] lg:min-h-0'
					}`}
				>
					<DashboardShell
						widgetIds={activeWidgetIds}
						spanMap={activeSpanMap}
						layoutMode={
							activeAspect === 'overview' ? 'overview-manual'
							: activeAspect === 'operations' && !isLiveRaceWeekend ?
								'race-ops'
							:	'grid'
						}
						renderWidget={renderWidget}
					/>
				</div>
			</div>
		</div>
	);
}
