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
	getCountryCode,
	getDriverImagePath,
	getTeamLogoPath,
	getTrackImagePath,
	parseRaceDateTime,
} from '@/components/schedule/scheduleHelpers';
import { getTelemetryDriverImage } from '@/components/telemetry/telemetryUiUtils';
import {
	clearHistory,
	deleteHistoryItem,
	getHistory,
} from '@/lib/api/historyApi';
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
import {
	getTrackSessions,
	getYearSchedule,
	toggleTrackFavorite,
} from '@/lib/api/trackApi';
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
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	FaArrowRight,
	FaBroadcastTower,
	FaCalendarAlt,
	FaChartLine,
	FaClock,
	FaExchangeAlt,
	FaHistory,
	FaList,
	FaProjectDiagram,
	FaSpinner,
	FaStar,
	FaThLarge,
	FaTimes,
	FaTrashAlt,
	FaTrophy,
} from 'react-icons/fa';

const CARD_HISTORY_LIMIT = 25;
const LIST_HISTORY_LIMIT = 50;

const DASHBOARD_ASPECTS = [
	{
		id: 'overview',
		label: 'Overview',
		widgets: ['kpis', 'championship-pulse', 'constructor-battle'],
	},
	{
		id: 'news',
		label: 'Latest News',
		widgets: ['f1-news'],
	},
	{
		id: 'operations',
		label: 'Race Ops',
		widgets: ['weekend-status', 'session-results', 'starting-grid'],
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
	{
		id: 'activities',
		label: 'Activities',
		widgets: [],
	},
];

const ASPECT_WIDGET_SPANS = {
	overview: {
		kpis: 'md:col-span-2',
		'championship-pulse': 'md:col-span-1 md:min-h-[460px]',
		'constructor-battle': 'md:col-span-1 md:min-h-[460px]',
	},
	news: {
		'f1-news': 'md:col-span-2 md:min-h-[920px]',
	},
	operations: {
		'weekend-status': 'md:col-span-2',
		'session-results': 'md:col-span-2',
		'starting-grid': 'md:col-span-1 md:min-h-[520px]',
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
	audi: '#E60000',
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

function getHistorySearchParams(referenceUrl) {
	if (!referenceUrl) return null;
	try {
		if (referenceUrl.startsWith('/')) {
			return new URL(referenceUrl, 'https://formulahub.local').searchParams;
		}
		return new URL(referenceUrl).searchParams;
	} catch {
		return null;
	}
}

function getHistoryActionErrorMessage(error, fallbackMessage) {
	return error?.response?.data?.detail || fallbackMessage;
}

export default function DashboardPage() {
	const router = useRouter();
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
	const [allTrackSessions, setAllTrackSessions] = useState([]);

	const generatedRaces = useMemo(() => {
		return allTrackSessions.slice().sort((a, b) => {
			const yearA = Number(a.year || 0);
			const yearB = Number(b.year || 0);
			if (yearB !== yearA) return yearB - yearA;
			return Number(b.round || 0) - Number(a.round || 0);
		});
	}, [allTrackSessions]);

	const [favoriteDrivers, setFavoriteDrivers] = useState(
		defaultPreferences.favoriteDrivers
	);
	const [favoriteTeams, setFavoriteTeams] = useState(
		defaultPreferences.favoriteTeams
	);
	const [activeAspect, setActiveAspect] = useState('overview');
	const [isAspectNavOpen, setIsAspectNavOpen] = useState(false);
	const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);
	const [activityView, setActivityView] = useState('cards');
	const [prefsHydrated, setPrefsHydrated] = useState(false);
	const [userHistory, setUserHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyDialog, setHistoryDialog] = useState({
		open: false,
		mode: 'single',
		item: null,
	});
	const [historyActionLoading, setHistoryActionLoading] = useState(false);
	const [historyActionError, setHistoryActionError] = useState('');
	const hasFetchedDashboardDataRef = useRef(false);
	const { isAuthenticated, user, token } = useAuth();
	const historyFetchLimit =
		activeAspect === 'activities' && activityView === 'list' ?
			LIST_HISTORY_LIMIT
		:	CARD_HISTORY_LIMIT;

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
					allSessions,
				] = await Promise.all([
					getNextRace().catch(() => null),
					getLastRace().catch(() => null),
					getSchedule(currentYear).catch(() => []),
					getYearSchedule(currentYear).catch(() => []),
					getDriverStandings(currentYear).catch(() => []),
					getConstructorStandings(currentYear).catch(() => []),
					getCurrentWeekendBrief().catch(() => null),
					getLatestF1News(18).catch(() => []),
					getTrackSessions().catch(() => []),
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
				setAllTrackSessions(Array.isArray(allSessions) ? allSessions : []);
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

	useEffect(() => {
		if (!isAuthenticated || !token) return;
		if (activeAspect !== 'activities' && activeAspect !== 'overview') return;
		setHistoryLoading(true);
		getHistory(token, historyFetchLimit)
			.then((data) => setUserHistory(Array.isArray(data) ? data : []))
			.catch(() => setUserHistory([]))
			.finally(() => setHistoryLoading(false));
	}, [isAuthenticated, token, activeAspect, historyFetchLimit]);

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
	const visibleAspects = useMemo(
		() =>
			DASHBOARD_ASPECTS.filter(
				(aspect) =>
					(aspect.id !== 'saved' && aspect.id !== 'activities') ||
					isAuthenticated
			),
		[isAuthenticated]
	);
	const isLiveRaceWeekend = Boolean(weekendBrief?.is_race_week);
	const activeWidgetIds = useMemo(() => {
		if (activeAspect === 'operations' && !isLiveRaceWeekend) {
			return ['last-race', 'next-race', 'upcoming-sessions'];
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

	const handleAspectSelect = (aspectId) => {
		setActiveAspect(aspectId);
		setIsAspectNavOpen(false);
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
			setAllTrackSessions((prev) =>
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

	const openHistoryEntry = (referenceUrl) => {
		if (!referenceUrl || referenceUrl === '#') return;
		if (referenceUrl.startsWith('/')) {
			router.push(referenceUrl);
			return;
		}
		window.location.assign(referenceUrl);
	};

	const openHistoryDialog = (mode, item = null) => {
		setHistoryActionError('');
		setHistoryDialog({
			open: true,
			mode,
			item,
		});
	};

	const closeHistoryDialog = () => {
		if (historyActionLoading) return;
		setHistoryDialog({
			open: false,
			mode: 'single',
			item: null,
		});
		setHistoryActionError('');
	};

	const confirmHistoryAction = async () => {
		if (!token || historyActionLoading) {
			if (!token) {
				toast.error('Please log in again to manage your activity history.');
			}
			return;
		}

		setHistoryActionLoading(true);
		setHistoryActionError('');

		try {
			if (historyDialog.mode === 'single' && historyDialog.item?.id) {
				await deleteHistoryItem(token, historyDialog.item.id);
				setUserHistory((prev) =>
					prev.filter((entry) => entry.id !== historyDialog.item.id)
				);
				toast.success('Activity deleted successfully.');
			} else if (historyDialog.mode === 'clear') {
				await clearHistory(token);
				setUserHistory([]);
				toast.success('Activity history cleared.');
			}

			setHistoryDialog({
				open: false,
				mode: 'single',
				item: null,
			});
		} catch (error) {
			if (historyDialog.mode === 'single' && error?.response?.status === 404) {
				setUserHistory((prev) =>
					prev.filter((entry) => entry.id !== historyDialog.item?.id)
				);
				setHistoryDialog({
					open: false,
					mode: 'single',
					item: null,
				});
				toast.success('Activity was already removed.');
				return;
			}

			const message = getHistoryActionErrorMessage(
				error,
				historyDialog.mode === 'clear' ?
					'Unable to clear your activity history right now.'
				:	'Unable to delete this activity right now.'
			);
			setHistoryActionError(message);
			toast.error(message);
		} finally {
			setHistoryActionLoading(false);
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

	const driverByCode = useMemo(() => {
		const map = new Map();
		driverStandings.forEach((row) => {
			const code = String(row?.driver_code || '')
				.trim()
				.toUpperCase();
			if (code) map.set(code, row);
		});
		return map;
	}, [driverStandings]);

	const trackRaceByYearRound = useMemo(() => {
		const source = trackSchedule.length > 0 ? trackSchedule : schedule;
		const map = new Map();

		// Start with the full schedule to establish current year rounds
		source.forEach((race) => {
			const round = Number(race?.round || 0);
			const raceYear = Number(race?.year || currentYear);
			if (!round || !raceYear) return;
			map.set(`${raceYear}_${round}`, race);
		});

		// Layer in all track sessions (including historical ones)
		allTrackSessions.forEach((session) => {
			const round = Number(session?.round || 0);
			const raceYear = Number(session?.year || 0);
			if (!round || !raceYear) return;
			const key = `${raceYear}_${round}`;
			// If session has data, we prioritize this entry
			map.set(key, { ...map.get(key), ...session, has_data: true });
		});

		return map;
	}, [trackSchedule, schedule, allTrackSessions, currentYear]);

	const historyItemsToRender = useMemo(() => {
		const maxItems =
			activityView === 'list' ? LIST_HISTORY_LIMIT : CARD_HISTORY_LIMIT;
		return Array.isArray(userHistory) ? userHistory.slice(0, maxItems) : [];
	}, [activityView, userHistory]);

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

					{/* Mobile Quick Links Drawer Toggle */}
					<div className="md:hidden">
						<button
							type="button"
							onClick={() => setIsQuickLinksOpen((prev) => !prev)}
							className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/10"
						>
							<FaThLarge className="text-[11px] text-red-300" />
							Quick Links
							<span className="text-[10px] text-gray-400">
								{isQuickLinksOpen ? 'Hide' : 'Show'}
							</span>
						</button>
					</div>

					<div className="hidden flex-wrap items-center gap-2 md:flex">
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

				{/* Mobile Quick Links Drawer */}
				{isQuickLinksOpen && (
					<>
						{/* Overlay */}
						<div
							className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
							role="button"
							onClick={() => setIsQuickLinksOpen(false)}
							aria-label="Close quick links drawer"
						/>
						{/* Drawer */}
						<div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
							<div className="mx-auto max-w-sm rounded-t-2xl border border-white/10 bg-black/95 p-5 shadow-2xl backdrop-blur-xl">
								<div className="flex items-center justify-between mb-4">
									<span className="text-xs font-bold uppercase tracking-[0.14em] text-white">
										Quick Links
									</span>
									<button
										onClick={() => setIsQuickLinksOpen(false)}
										className="rounded-full p-2 text-white hover:bg-white/10"
										aria-label="Close"
									>
										<FaTimes />
									</button>
								</div>
								<div className="grid grid-cols-1 gap-3">
									<Link
										href={compareHref}
										prefetch={true}
										className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-xs font-semibold text-white backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/10"
									>
										Compare Drivers
									</Link>
									<Link
										href="/schedule"
										prefetch={true}
										className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/12 px-4 py-3 text-xs font-semibold text-red-100 backdrop-blur-xl transition-all hover:bg-red-500/20"
									>
										Full Schedule
									</Link>
									<Link
										href="/standings"
										prefetch={true}
										className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/12 px-4 py-3 text-xs font-semibold text-red-100 backdrop-blur-xl transition-all hover:bg-red-500/20"
									>
										Standings
									</Link>
								</div>
							</div>
						</div>
					</>
				)}

				<div className="md:hidden rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl">
					<button
						type="button"
						onClick={() => setIsAspectNavOpen((prev) => !prev)}
						className="flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-red-400/30 hover:bg-white/8"
					>
						<span className="inline-flex items-center gap-2">
							<FaList className="text-[11px] text-red-300" />
							{aspectConfig.label}
						</span>
						<span className="text-[10px] text-gray-400">
							{isAspectNavOpen ? 'Hide' : 'Browse'}
						</span>
					</button>
					{isAspectNavOpen && (
						<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
							{visibleAspects.map((aspect) => {
								const active = activeAspect === aspect.id;
								const isSaved = aspect.id === 'saved';
								const isActivities = aspect.id === 'activities';
								return (
									<button
										key={aspect.id}
										type="button"
										onClick={() => handleAspectSelect(aspect.id)}
										className={`inline-flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] transition-all duration-200 ${
											active ?
												'border-red-400/45 bg-red-500/20 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.18)]'
											:	'border-white/10 bg-transparent text-gray-300 hover:border-red-400/35 hover:text-red-100'
										}`}
									>
										<span className="inline-flex items-center gap-2">
											{isSaved && (
												<FaStar
													className={`text-[9px] ${
														active ? 'text-red-300' : 'text-red-600'
													}`}
												/>
											)}
											{isActivities && (
												<FaHistory
													className={`text-[9px] ${
														active ? 'text-red-300' : 'text-red-600'
													}`}
												/>
											)}
											{aspect.label}
										</span>
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
										{isActivities && userHistory.length > 0 && (
											<span
												className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
													active ?
														'bg-red-500/30 text-red-100'
													:	'bg-white/10 text-gray-500'
												}`}
											>
												{userHistory.length}
											</span>
										)}
									</button>
								);
							})}
						</div>
					)}
				</div>

				<div className="hidden flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl md:flex">
					{visibleAspects.map((aspect) => {
						const active = activeAspect === aspect.id;
						const isSaved = aspect.id === 'saved';
						const isActivities = aspect.id === 'activities';
						return (
							<button
								key={aspect.id}
								type="button"
								onClick={() => handleAspectSelect(aspect.id)}
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
								{isActivities && (
									<FaHistory
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
								{isActivities && userHistory.length > 0 && (
									<span
										className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
											active ?
												'bg-red-500/30 text-red-100'
											:	'bg-white/10 text-gray-500'
										}`}
									>
										{userHistory.length}
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
							<>
								<div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
									{favoriteDrivers
										.slice(0, FAVORITE_DRIVER_LIMIT)
										.map((code) => {
											const drv = driverStandings.find(
												(d) => d.driver_code === code
											);
											if (!drv) return null;
											const leaderPoints = Number(
												driverStandings[0]?.points || 0
											);
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
													className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0C] transition-all duration-300 hover:border-white/25 hover:shadow-xl hover:-translate-y-1"
												>
													{/* Top section: Team Color Gradient & Driver Info */}
													<div
														className="relative p-4 sm:p-6 sm:px-7 pb-24 sm:pb-32"
														style={{
															background: `linear-gradient(135deg, ${teamColor}AA 0%, ${teamColor}22 100%)`,
														}}
													>
														<div className="relative z-10 flex items-start justify-between">
															<div className="flex items-center gap-4">
																{driverImg ?
																	<div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
																		<Image
																			src={driverImg}
																			alt={code}
																			fill
																			className="object-cover object-top"
																		/>
																	</div>
																:	<div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 text-xl font-black text-white shadow-xl">
																		{code}
																	</div>
																}
																<div>
																	<p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 shadow-sm">
																		Favorite Driver
																	</p>
																	<h3 className="text-[17px] md:text-[22px] font-black leading-none text-white drop-shadow-md">
																		{drv.driver_name}
																	</h3>
																	<p className="mt-2 flex items-center gap-2 text-xs font-bold text-white/95 drop-shadow-md">
																		{teamLogo && (
																			<span className="relative inline-block h-4 w-4">
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
																<span className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-white backdrop-blur-md shadow-lg border border-white/10">
																	P{driverRank || '-'}
																</span>
																{isLeader && (
																	<span className="rounded-full bg-[#22c55e]/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] backdrop-blur-md border border-[#22c55e]/30">
																		Leader
																	</span>
																)}
															</div>
														</div>

														{/* Unobstructed Car Image sitting perfectly on the right */}
														<div className="absolute -bottom-2 right-0 sm:-bottom-4  h-32 sm:h-40 w-56 sm:w-72 md:w-[320px] transition-transform duration-500 group-hover:scale-105 group-hover:-translate-x-2">
															{carImg && (
																<Image
																	src={carImg}
																	alt="Car"
																	fill
																	className="object-contain object-right drop-shadow-[0_15px_20px_rgba(0,0,0,0.6)]"
																/>
															)}
														</div>
													</div>

													{/* Bottom section: Stats in a clean, dark grid avoiding the car mapping */}
													<div className="relative z-20 flex-1 bg-[#0A0A0C] px-7 py-6 grid grid-cols-2 gap-y-5 gap-x-2 border-t border-white/5">
														<div>
															<p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
																Championship Rank
															</p>
															<p className="text-xl font-black text-white">
																P{driverRank || '-'}
															</p>
														</div>
														<div className="pl-6">
															<p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
																Championship
															</p>
															<p className="text-[22px] font-black text-white leading-none">
																{drv.points}{' '}
																<span className="text-xs font-bold text-gray-500">
																	PTS
																</span>
															</p>
														</div>
														<div className="col-span-2 pt-2 border-t border-white/5">
															<p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
																Title Focus
															</p>
															<p
																className="text-[15px] font-black tracking-wide"
																style={{
																	color: isLeader ? '#34d399' : '#f87171',
																}}
															>
																{displayGap}
															</p>
														</div>
													</div>
												</div>
											);
										})}

									{favoriteTeams
										.slice(0, FAVORITE_TEAM_LIMIT)
										.map((teamName) => {
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
												tm.position ||
													(teamRankIndex >= 0 ? teamRankIndex + 1 : 0)
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
													className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0C] transition-all duration-300 hover:border-white/25 hover:shadow-xl hover:-translate-y-1"
												>
													{/* Top section */}
													<div
														className="relative p-4 sm:p-6 sm:px-7 pb-24 sm:pb-32"
														style={{
															background: `linear-gradient(135deg, ${teamColor}AA 0%, ${teamColor}22 100%)`,
														}}
													>
														<div className="relative z-10 flex items-start justify-between">
															<div className="flex items-center gap-4">
																{teamLogo ?
																	<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white border-2 border-transparent shadow-[0_4px_15px_rgba(0,0,0,0.5)] p-2">
																		<Image
																			src={teamLogo}
																			alt={teamName}
																			fill
																			className="object-contain"
																		/>
																	</div>
																:	<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-black/40 text-lg font-black shadow-xl">
																		{teamName.substring(0, 3).toUpperCase()}
																	</div>
																}
																<div>
																	<p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 shadow-sm">
																		Favorite Team
																	</p>
																	<h3 className="text-[17px] sm:text-[22px] font-black leading-none text-white drop-shadow-md">
																		{teamName}
																	</h3>
																	<p className="mt-2 text-xs font-bold text-white/95 drop-shadow-md">
																		Constructor
																	</p>
																</div>
															</div>
															<div className="flex flex-col items-end gap-2">
																<span className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-white backdrop-blur-md shadow-lg border border-white/10">
																	P{teamRank || '-'}
																</span>
																{isLeader && (
																	<span className="rounded-full bg-[#22c55e]/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] backdrop-blur-md border border-[#22c55e]/30">
																		Leader
																	</span>
																)}
															</div>
														</div>

														{/* Separated Car Image */}
														<div className="absolute -bottom-2 right-0 sm:-bottom-4 h-32 sm:h-40 w-56 sm:w-72 md:w-[320px] transition-transform duration-500 group-hover:scale-105 group-hover:-translate-x-2">
															{carImg && (
																<Image
																	src={carImg}
																	alt="Car"
																	fill
																	className="object-contain object-right drop-shadow-[0_15px_20px_rgba(0,0,0,0.6)]"
																/>
															)}
														</div>
													</div>

													{/* Bottom section */}
													<div className="relative z-20 flex-1 bg-[#0A0A0C] px-7 py-6 grid grid-cols-2 gap-y-5 gap-x-2 border-t border-white/5">
														<div>
															<p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
																Championship Rank
															</p>
															<p className="text-xl font-black text-white">
																P{teamRank || '-'}
															</p>
														</div>
														<div className="pl-6">
															<p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
																Championship
															</p>
															<p className="text-[22px] font-black text-white leading-none">
																{tm.points}{' '}
																<span className="text-xs font-bold text-gray-500">
																	PTS
																</span>
															</p>
														</div>
														<div className="col-span-2 pt-2 border-t border-white/5">
															<p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
																Title Focus
															</p>
															<p
																className="text-[15px] font-black tracking-wide"
																style={{
																	color: isLeader ? '#34d399' : '#f87171',
																}}
															>
																{displayGap}
															</p>
														</div>
													</div>
												</div>
											);
										})}
								</div>
							</>
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
									Update Favorites
								</Link>
							</div>
						}
					</div>
				)}

				{activeAspect === 'activities' && (
					<div className="space-y-6 animate-fade-in">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.24em] text-red-400">
									FormulaHub · Timeline
								</p>
								<h2 className="text-2xl font-black uppercase tracking-wide text-white mt-1">
									Your Activity Feed
								</h2>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => openHistoryDialog('clear')}
									disabled={
										historyLoading ||
										historyItemsToRender.length === 0 ||
										historyActionLoading
									}
									className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-100 transition-all hover:bg-red-500/22 disabled:cursor-not-allowed disabled:opacity-45"
								>
									<FaTrashAlt className="text-[10px]" />
									Clear History
								</button>
								<div className="inline-flex gap-1 rounded-xl border border-white/10 bg-black/45 p-1 backdrop-blur-xl">
									<button
										type="button"
										onClick={() => setActivityView('cards')}
										className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${activityView === 'cards' ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/75'}`}
									>
										<FaThLarge className="text-[11px]" />
									</button>
									<button
										type="button"
										onClick={() => setActivityView('list')}
										className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${activityView === 'list' ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/75'}`}
									>
										<FaList className="text-[11px]" />
									</button>
								</div>
							</div>
						</div>

						{historyLoading ?
							<div
								className={`${activityView === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-5'}`}
							>
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className={`animate-pulse rounded-3xl border border-white/10 bg-white/5 ${activityView === 'list' ? 'h-20' : 'h-64'}`}
									/>
								))}
							</div>
						: historyItemsToRender.length === 0 ?
							<div className="flex flex-col items-center justify-center h-72 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
								<FaHistory className="mb-4 text-3xl text-gray-600" />
								<h3 className="text-lg font-bold text-white">
									No Activity Yet
								</h3>
								<p className="mt-2 max-w-md text-center text-sm text-gray-400">
									Your comparisons, predictions, simulations, and strategy runs
									will appear here automatically.
								</p>
								<div className="mt-5 flex gap-3">
									<Link
										href="/compare"
										className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-500 transition-colors"
									>
										Compare
									</Link>
									<Link
										href="/predict"
										className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
									>
										Predict
									</Link>
								</div>
							</div>
						:	<div
								className={`${activityView === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-5'}`}
							>
								{historyItemsToRender.map((item) => {
									const baseAccentColor = item.color_hex || '#ef4444';
									const params = getHistorySearchParams(item.reference_url);
									const isCompareActivity = item.activity_type === 'Comparison';
									const compareType =
										params?.get('type') === 'constructors' ?
											'constructors'
										:	'drivers';
									const leftParam =
										params?.get('a') || params?.get('left') || '';
									const rightParam =
										params?.get('b') || params?.get('right') || '';

									const leftDriverCode = leftParam.trim().toUpperCase();
									const rightDriverCode = rightParam.trim().toUpperCase();
									const leftDriver = driverByCode.get(leftDriverCode) || null;
									const rightDriver = driverByCode.get(rightDriverCode) || null;

									const leftTeamName =
										compareType === 'drivers' ?
											leftDriver?.team_name
										:	leftParam;
									const rightTeamName =
										compareType === 'drivers' ?
											rightDriver?.team_name
										:	rightParam;

									const leftAccentColor =
										isCompareActivity ?
											getTeamColorHex(leftTeamName) || baseAccentColor
										:	baseAccentColor;
									const rightAccentColor =
										isCompareActivity ?
											getTeamColorHex(rightTeamName) || baseAccentColor
										:	baseAccentColor;

									const compareLeftImage =
										compareType === 'drivers' ?
											getTelemetryDriverImage(leftDriverCode, 2026)
										:	getCarImage(leftParam);
									const compareRightImage =
										compareType === 'drivers' ?
											getTelemetryDriverImage(rightDriverCode, 2026)
										:	getCarImage(rightParam);

									const isTrackActivity =
										item.activity_type === 'Simulation' &&
										String(item.reference_url || '').startsWith('/track');
									const trackYear = Number(params?.get('year') || currentYear);
									const trackRound = Number(params?.get('round') || 0);
									const trackRace =
										trackYear && trackRound ?
											trackRaceByYearRound.get(`${trackYear}_${trackRound}`)
										:	null;
									const trackCountry =
										trackRace?.country || trackRace?.circuit?.country || null;
									const trackCountryCode = getCountryCode(trackCountry);
									const trackFlagImage =
										trackCountryCode ?
											`/images/flags/${trackCountryCode}.png`
										:	null;
									const trackCircuitImage =
										trackRace ? getTrackImagePath(trackRace) : null;

									const cardAccentColor =
										isCompareActivity ? leftAccentColor : baseAccentColor;
									const timeAgo = (() => {
										if (!item.created_at) return '';
										const diff =
											Date.now() - new Date(item.created_at).getTime();
										const mins = Math.floor(diff / 60000);
										if (mins < 1) return 'Just now';
										if (mins < 60) return `${mins}m ago`;
										const hrs = Math.floor(mins / 60);
										if (hrs < 24) return `${hrs}h ago`;
										const days = Math.floor(hrs / 24);
										return `${days}d ago`;
									})();

									const typeIcon = {
										Comparison: FaExchangeAlt,
										Prediction: FaChartLine,
										Simulation: FaProjectDiagram,
										Strategy: FaBroadcastTower,
									};
									const TypeIcon = typeIcon[item.activity_type] || FaHistory;

									if (activityView === 'list') {
										return (
											<div
												key={item.id}
												role="button"
												tabIndex={0}
												onClick={() =>
													openHistoryEntry(item.reference_url || '#')
												}
												onKeyDown={(event) => {
													if (event.key === 'Enter' || event.key === ' ') {
														event.preventDefault();
														openHistoryEntry(item.reference_url || '#');
													}
												}}
												className="group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0C] px-4 py-3 transition-all duration-300 hover:border-white/25 hover:shadow-lg"
											>
												<div
													className="absolute left-0 top-0 bottom-0 w-1"
													style={{
														background:
															isCompareActivity ?
																`linear-gradient(180deg, ${leftAccentColor}, ${rightAccentColor})`
															:	cardAccentColor,
													}}
												/>
												<div
													className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
													style={{
														backgroundColor: `${cardAccentColor}25`,
														borderColor: `${cardAccentColor}40`,
													}}
												>
													<TypeIcon
														className="text-[12px]"
														style={{ color: cardAccentColor }}
													/>
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-black text-white">
														{item.title}
													</p>
													<p className="truncate text-xs text-gray-400 mt-0.5">
														{item.subtitle}
													</p>
												</div>
												<span className="shrink-0 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
													{timeAgo}
												</span>
												<div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
													{(isTrackActivity ?
														trackCircuitImage || item.image_url
													:	compareLeftImage || item.image_url) && (
														<Image
															src={
																isTrackActivity ?
																	trackCircuitImage || item.image_url
																:	compareLeftImage || item.image_url
															}
															alt={item.activity_type}
															fill
															className="object-contain object-center opacity-80 group-hover:opacity-100 transition-opacity"
														/>
													)}
												</div>
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														openHistoryDialog('single', item);
													}}
													className="shrink-0 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-red-200 transition-all hover:bg-red-500/20 cursor-pointer"
												>
													<FaTrashAlt className="text-[10px]" />
												</button>
											</div>
										);
									}

									return (
										<div
											key={item.id}
											role="button"
											tabIndex={0}
											onClick={() =>
												openHistoryEntry(item.reference_url || '#')
											}
											onKeyDown={(event) => {
												if (event.key === 'Enter' || event.key === ' ') {
													event.preventDefault();
													openHistoryEntry(item.reference_url || '#');
												}
											}}
											className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0C] transition-all duration-300 hover:border-white/25 hover:shadow-xl hover:-translate-y-1"
										>
											{/* Accent bar */}
											<div
												className="h-1 w-full"
												style={{
													background:
														isCompareActivity ?
															`linear-gradient(90deg, ${leftAccentColor}, ${rightAccentColor})`
														:	`linear-gradient(90deg, ${cardAccentColor}, transparent)`,
												}}
											/>

											{/* Header */}
											<div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
												<div className="flex items-center gap-2.5">
													<div
														className="flex h-7 w-7 items-center justify-center rounded-lg"
														style={{
															backgroundColor: `${cardAccentColor}25`,
															border: `1px solid ${cardAccentColor}40`,
														}}
													>
														<TypeIcon
															className="text-[10px]"
															style={{ color: cardAccentColor }}
														/>
													</div>
													<span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
														{item.activity_type}
													</span>
												</div>
												<div className="flex items-center gap-2">
													<span className="text-[10px] flex items-center gap-1.5 text-gray-500 uppercase tracking-wider font-semibold">
														<FaClock className="text-[8px]" /> {timeAgo}
													</span>
													<button
														type="button"
														onClick={(event) => {
															event.stopPropagation();
															openHistoryDialog('single', item);
														}}
														className="rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-red-200 transition-all hover:bg-red-500/20 cursor-pointer"
													>
														<FaTrashAlt className="text-[10px]" />
													</button>
												</div>
											</div>

											{/* Body */}
											<div className="flex-1 p-6 pb-2">
												<h3 className="text-lg font-black text-white group-hover:text-white line-clamp-1">
													{item.title}
												</h3>
												<p className="text-xs text-gray-400 mt-1 pb-4 border-b border-white/5">
													{item.subtitle}
												</p>
											</div>

											{/* Image */}
											<div className="relative h-28 w-full overflow-hidden">
												<div
													className="absolute inset-0"
													style={{
														background:
															isCompareActivity ?
																`linear-gradient(120deg, ${leftAccentColor}1A, transparent 45%, ${rightAccentColor}1A)`
															:	`linear-gradient(to bottom, transparent, ${cardAccentColor}10)`,
													}}
												/>
												{isCompareActivity ?
													<div className="absolute inset-0 grid grid-cols-2">
														<div className="relative border-r border-white/10">
															{compareLeftImage && (
																<Image
																	src={compareLeftImage}
																	alt="Left comparison"
																	fill
																	className="object-contain object-bottom scale-105 translate-y-2 opacity-45 group-hover:opacity-85 group-hover:scale-115 transition-all duration-500"
																/>
															)}
														</div>
														<div className="relative">
															{compareRightImage && (
																<Image
																	src={compareRightImage}
																	alt="Right comparison"
																	fill
																	className="object-contain object-bottom scale-105 translate-y-2 opacity-45 group-hover:opacity-85 group-hover:scale-115 transition-all duration-500"
																/>
															)}
														</div>
													</div>
												: isTrackActivity ?
													<>
														{trackFlagImage && (
															<Image
																src={trackFlagImage}
																alt="Track country"
																fill
																className="object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500"
															/>
														)}
														{(trackCircuitImage || item.image_url) && (
															<Image
																src={trackCircuitImage || item.image_url}
																alt={trackRace?.event || item.activity_type}
																fill
																className="object-contain object-bottom scale-110 translate-y-2 opacity-45 group-hover:opacity-85 group-hover:scale-125 transition-all duration-500"
															/>
														)}
													</>
												: item.image_url ?
													<Image
														src={item.image_url}
														alt={item.activity_type}
														fill
														className="object-contain object-bottom scale-110 translate-y-2 opacity-40 group-hover:opacity-80 group-hover:scale-125 transition-all duration-500"
													/>
												:	null}
											</div>

											{/* Footer */}
											<div className="px-6 py-3 flex items-center justify-end">
												<span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 group-hover:text-red-300 transition-colors flex items-center gap-1.5">
													Open <FaArrowRight className="text-[8px]" />
												</span>
											</div>
										</div>
									);
								})}
							</div>
						}
					</div>
				)}

				<div
					className={`rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm md:p-4 ${
						activeAspect === 'operations' && !isLiveRaceWeekend ?
							'min-h-0 overflow-visible'
						: activeAspect === 'overview' || activeAspect === 'activities' ?
							'hidden'
						:	'min-h-[580px] lg:h-[calc(100vh-205px)] lg:min-h-0'
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

				{historyDialog.open && (
					<div
						className="fixed inset-0 z-120 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
						onClick={(event) => {
							if (event.target === event.currentTarget) closeHistoryDialog();
						}}
					>
						<div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0d0d12] p-5 shadow-2xl">
							<button
								type="button"
								onClick={closeHistoryDialog}
								disabled={historyActionLoading}
								className="absolute right-3 top-3 rounded-lg border border-white/15 bg-white/5 p-1.5 text-gray-300 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
							>
								<FaTimes className="text-[11px]" />
							</button>

							<div className="pr-10">
								<h3 className="text-lg font-bold text-white">
									{historyDialog.mode === 'clear' ?
										'Clear all activity history?'
									:	'Delete this activity?'}
								</h3>
								<p className="mt-2 text-sm text-gray-300">
									{historyDialog.mode === 'clear' ?
										'This will remove your full dashboard timeline and cannot be undone.'
									:	'This activity will be removed permanently from your timeline.'
									}
								</p>
							</div>

							{historyDialog.mode === 'single' && historyDialog.item && (
								<div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
									<p className="truncate text-sm font-semibold text-white">
										{historyDialog.item.title}
									</p>
									<p className="mt-0.5 truncate text-xs text-gray-400">
										{historyDialog.item.subtitle}
									</p>
								</div>
							)}

							{historyActionError && (
								<p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
									{historyActionError}
								</p>
							)}

							{historyActionLoading && (
								<div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
									<FaSpinner className="animate-spin text-[11px]" />
									{historyDialog.mode === 'clear' ?
										'Clearing history...'
									:	'Deleting activity...'}
								</div>
							)}

							<div className="mt-5 flex justify-end gap-2">
								<button
									type="button"
									onClick={closeHistoryDialog}
									disabled={historyActionLoading}
									className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={confirmHistoryAction}
									disabled={historyActionLoading}
									className="rounded-lg border border-red-500/35 bg-red-500 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
								>
									{historyActionLoading ?
										historyDialog.mode === 'clear' ?
											'Clearing...'
										:	'Deleting...'
									: historyDialog.mode === 'clear' ?
										'Clear history'
									:	'Delete'}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
