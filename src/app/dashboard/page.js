'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';
import {
	ChampionshipPulseWidget,
	KpisWidget,
	LastRaceWidget,
	NextRaceWidget,
	QuickActionsWidget,
	UpcomingSessionsWidget,
} from '@/components/dashboard/widgets';
import { parseRaceDateTime } from '@/components/schedule/scheduleHelpers';
import {
	getMyPreferences,
	resetMyPreferences,
	updateMyFavorites,
	updateMyLayout,
} from '@/lib/api/preferencesApi';
import { getLastRace, getNextRace, getSchedule } from '@/lib/api/scheduleApi';
import {
	getConstructorStandings,
	getDriverStandings,
} from '@/lib/api/standingsApi';
import { getYearSchedule } from '@/lib/api/trackApi';
import {
	clearLocalDashboardPreferences,
	FAVORITE_DRIVER_LIMIT,
	FAVORITE_TEAM_LIMIT,
	getDefaultDashboardPreferences,
	normalizeDashboardPreferences,
	normalizeWidgetOrder,
	readLocalDashboardPreferences,
	writeLocalDashboardPreferences,
} from '@/lib/dashboard/preferences';
import {
	DEFAULT_WIDGET_ORDER,
	WIDGET_REGISTRY,
} from '@/lib/dashboard/widgetRegistry';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

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
	const validWidgetIds = useMemo(
		() => WIDGET_REGISTRY.map((widget) => widget.id),
		[]
	);
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

	const [widgetOrder, setWidgetOrder] = useState(defaultPreferences.widgetOrder);
	const [hiddenWidgets, setHiddenWidgets] = useState(
		defaultPreferences.hiddenWidgets
	);
	const [favoriteDrivers, setFavoriteDrivers] = useState(
		defaultPreferences.favoriteDrivers
	);
	const [favoriteTeams, setFavoriteTeams] = useState(
		defaultPreferences.favoriteTeams
	);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [authResolved, setAuthResolved] = useState(false);
	const [prefsHydrated, setPrefsHydrated] = useState(false);
	const [savingPrefs, setSavingPrefs] = useState(false);

	useEffect(() => {
		setIsAuthenticated(Boolean(localStorage.getItem('token')));
		setAuthResolved(true);
	}, []);

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
				setConstructorStandings(Array.isArray(constructors) ? constructors : []);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [currentYear]);

	useEffect(() => {
		if (!authResolved) return;

		const local = readLocalDashboardPreferences(validWidgetIds, DEFAULT_WIDGET_ORDER);
		setWidgetOrder(local.widgetOrder);
		setHiddenWidgets(local.hiddenWidgets);
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
				setWidgetOrder(normalized.widgetOrder);
				setHiddenWidgets(normalized.hiddenWidgets);
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
	}, [authResolved, isAuthenticated, validWidgetIds]);

	useEffect(() => {
		if (!prefsHydrated) return;

		const normalized = normalizeDashboardPreferences(
			{ favoriteDrivers, favoriteTeams, widgetOrder, hiddenWidgets },
			validWidgetIds,
			DEFAULT_WIDGET_ORDER
		);

		writeLocalDashboardPreferences(normalized);
		if (!isAuthenticated) return;

		setSavingPrefs(true);
		const timer = setTimeout(async () => {
			try {
				await Promise.all([
					updateMyLayout({
						widgetOrder: normalized.widgetOrder,
						hiddenWidgets: normalized.hiddenWidgets,
					}),
					updateMyFavorites({
						favoriteDrivers: normalized.favoriteDrivers,
						favoriteTeams: normalized.favoriteTeams,
					}),
				]);
			} catch {
				// Keep local preferences even if sync fails.
			} finally {
				setSavingPrefs(false);
			}
		}, 900);

		return () => clearTimeout(timer);
	}, [
		favoriteDrivers,
		favoriteTeams,
		hiddenWidgets,
		isAuthenticated,
		prefsHydrated,
		validWidgetIds,
		widgetOrder,
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
		const src = trackSchedule.length > 0 ? trackSchedule : schedule;
		const completed = src.filter((r) => r.is_past).length;
		const totalRounds = src.length;
		const dataReady = trackSchedule.filter((r) => r.has_data).length;
		const upcomingRound = nextRace?.round || '—';

		return [
			{ label: 'Rounds Completed', value: completed || 0, icon: FaCalendarAlt },
			{ label: 'Next Round', value: upcomingRound, icon: FaCalendarAlt },
			{
				label: 'Data Sessions Ready',
				value: `${dataReady}/${totalRounds || 0}`,
				icon: FaCalendarAlt,
			},
			{ label: 'Championship Year', value: currentYear, icon: FaCalendarAlt },
		];
	}, [trackSchedule, schedule, nextRace, currentYear]);

	const upcomingRaces = useMemo(() => {
		const src = trackSchedule.length > 0 ? trackSchedule : schedule;
		return src.filter((r) => !r.is_past).slice(0, 5);
	}, [trackSchedule, schedule]);

	const handleReorder = (nextOrder) => {
		setWidgetOrder(normalizeWidgetOrder(nextOrder, validWidgetIds));
	};

	const handleToggleWidget = (widgetId) => {
		setHiddenWidgets((prev) =>
			prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
		);
	};

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

	const handleReset = async () => {
		const defaults = getDefaultDashboardPreferences(DEFAULT_WIDGET_ORDER);
		setWidgetOrder(defaults.widgetOrder);
		setHiddenWidgets(defaults.hiddenWidgets);
		setFavoriteDrivers(defaults.favoriteDrivers);
		setFavoriteTeams(defaults.favoriteTeams);
		clearLocalDashboardPreferences();

		if (!isAuthenticated) return;

		try {
			const serverDefaults = await resetMyPreferences();
			const normalized = normalizeDashboardPreferences(
				serverDefaults,
				validWidgetIds,
				DEFAULT_WIDGET_ORDER
			);
			setWidgetOrder(normalized.widgetOrder);
			setHiddenWidgets(normalized.hiddenWidgets);
			setFavoriteDrivers(normalized.favoriteDrivers);
			setFavoriteTeams(normalized.favoriteTeams);
			writeLocalDashboardPreferences(normalized);
		} catch {
			// Defaults are already set locally.
		}
	};

	const renderWidget = (widgetId, dragHandleProps) => {
		switch (widgetId) {
			case 'kpis':
				return <KpisWidget kpis={kpis} dragHandleProps={dragHandleProps} />;
			case 'next-race':
				return (
					<NextRaceWidget
						nextRace={nextRace}
						nextRaceStart={nextRaceStart}
						countdown={countdown}
						formatDate={formatDate}
						dragHandleProps={dragHandleProps}
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
						dragHandleProps={dragHandleProps}
					/>
				);
			case 'upcoming-sessions':
				return (
					<UpcomingSessionsWidget
						upcomingRaces={upcomingRaces}
						currentYear={currentYear}
						formatDate={formatDate}
						dragHandleProps={dragHandleProps}
					/>
				);
			case 'quick-actions':
				return <QuickActionsWidget dragHandleProps={dragHandleProps} />;
			case 'last-race':
				return (
					<LastRaceWidget
						lastRace={lastRace}
						formatDate={formatDate}
						dragHandleProps={dragHandleProps}
					/>
				);
			default:
				return null;
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/80" />
				<div className="relative z-10 mx-auto max-w-[1500px] space-y-4 animate-fade-in">
					<div className="h-10 w-72 animate-pulse rounded-xl bg-white/8" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
							/>
						))}
					</div>
					<div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
			<div className="fixed inset-0 z-0 bg-black/82" />
			<div className="relative z-10 mx-auto max-w-[1500px] space-y-4 pb-12 animate-fade-in">
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="mb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-red-500">
							Operations Overview
						</p>
						<h1 className="text-3xl font-black tracking-wide md:text-4xl">
							Race Command Center
						</h1>
						{!isAuthenticated && (
							<p className="mt-2 text-sm text-gray-400">
								Login to save dashboard layout and favorites across devices.
							</p>
						)}
					</div>
					<Link
						href="/schedule"
						className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 transition-colors hover:bg-white/10"
					>
						<FaCalendarAlt className="text-red-500" />
						Open Full Schedule
					</Link>
				</div>

				<DashboardShell
					registry={WIDGET_REGISTRY}
					widgetOrder={widgetOrder}
					hiddenWidgets={hiddenWidgets}
					onReorder={handleReorder}
					onToggleWidget={handleToggleWidget}
					onReset={handleReset}
					renderWidget={renderWidget}
					saving={savingPrefs}
				/>
			</div>
		</div>
	);
}
