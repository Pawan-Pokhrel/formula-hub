'use client';

import {
	getMyPreferences,
	resetMyPreferences,
	updateMyFavorites,
	updateMyLayout,
} from '@/lib/api/preferencesApi';
import {
	getConstructorStandings,
	getDriverStandings,
} from '@/lib/api/standingsApi';
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
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useMemo, useState } from 'react';
import { FaSlidersH, FaUndoAlt, FaUserCog } from 'react-icons/fa';

export default function ProfilePage() {
	const currentYear = new Date().getFullYear();
	const validWidgetIds = useMemo(
		() => WIDGET_REGISTRY.map((widget) => widget.id),
		[]
	);

	const [widgetOrder, setWidgetOrder] = useState(DEFAULT_WIDGET_ORDER);
	const [hiddenWidgets, setHiddenWidgets] = useState([]);
	const [favoriteDrivers, setFavoriteDrivers] = useState([]);
	const [favoriteTeams, setFavoriteTeams] = useState([]);
	const [driverStandings, setDriverStandings] = useState([]);
	const [constructorStandings, setConstructorStandings] = useState([]);
	const [prefsHydrated, setPrefsHydrated] = useState(false);
	const [saving, setSaving] = useState(false);
	const { isAuthenticated, user } = useAuth();

	useEffect(() => {
		Promise.all([
			getDriverStandings(currentYear).catch(() => []),
			getConstructorStandings(currentYear).catch(() => []),
		]).then(([drivers, constructors]) => {
			setDriverStandings(Array.isArray(drivers) ? drivers : []);
			setConstructorStandings(Array.isArray(constructors) ? constructors : []);
		});
	}, [currentYear]);

	useEffect(() => {
		const local = readLocalDashboardPreferences(
			validWidgetIds,
			DEFAULT_WIDGET_ORDER
		);
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
	}, [isAuthenticated, validWidgetIds]);

	useEffect(() => {
		if (!prefsHydrated) return;

		const normalized = normalizeDashboardPreferences(
			{ favoriteDrivers, favoriteTeams, widgetOrder, hiddenWidgets },
			validWidgetIds,
			DEFAULT_WIDGET_ORDER
		);
		writeLocalDashboardPreferences(normalized);

		if (!isAuthenticated) return;

		setSaving(true);
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
				// Keep local preferences even if server sync fails.
			} finally {
				setSaving(false);
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

	const topDrivers = driverStandings.slice(0, 10);
	const topTeams = constructorStandings.slice(0, 10);

	const handleToggleWidget = (widgetId) => {
		setHiddenWidgets((prev) =>
			prev.includes(widgetId) ?
				prev.filter((id) => id !== widgetId)
			:	[...prev, widgetId]
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
		setWidgetOrder(normalizeWidgetOrder(defaults.widgetOrder, validWidgetIds));
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
			// Keep local defaults.
		}
	};

	return (
		<div className="min-h-screen bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
			<div className="fixed inset-0 z-0 bg-black/84" />
			<div className="relative z-10 mx-auto max-w-[1200px] space-y-6 pb-12 animate-fade-in">
				<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
					<p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-500">
						Personalization
					</p>
					<h1 className="text-3xl font-black tracking-wide md:text-4xl">
						Profile Controls
					</h1>
					<p className="mt-2 text-sm text-gray-400">
						Manage dashboard visibility, favorites, and reset defaults.
						Dashboard itself stays clean and drag-only.
					</p>
					<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
						<div className="rounded-xl border border-white/10 bg-black/30 p-3">
							<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
								Name
							</p>
							<p className="mt-1 text-sm font-semibold text-white">
								{user?.fullName}
							</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-black/30 p-3">
							<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
								Email
							</p>
							<p className="mt-1 text-sm font-semibold text-white">
								{user?.email}
							</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-black/30 p-3">
							<p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
								Username
							</p>
							<p className="mt-1 text-sm font-semibold text-white">
								{user?.username || 'Not set'}
							</p>
						</div>
					</div>
					<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs text-gray-300">
						<FaUserCog className="text-red-400" />
						{saving ? 'Saving changes...' : 'Changes auto-save'}
					</div>
				</div>

				<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div className="inline-flex items-center gap-2">
							<FaSlidersH className="text-red-400" />
							<h2 className="text-lg font-bold">Widget Visibility</h2>
						</div>
						<button
							type="button"
							onClick={handleReset}
							className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-xs font-medium text-white transition hover:border-red-400/45"
						>
							<FaUndoAlt /> Reset to default
						</button>
					</div>
					<div className="flex flex-wrap gap-2">
						{WIDGET_REGISTRY.map((widget) => {
							const hidden = hiddenWidgets.includes(widget.id);
							return (
								<button
									key={widget.id}
									type="button"
									onClick={() => handleToggleWidget(widget.id)}
									className={`rounded-full border px-3 py-1.5 text-xs transition ${
										hidden ?
											'border-white/15 bg-black/35 text-gray-400'
										:	'border-red-500/40 bg-red-500/15 text-red-200'
									}`}
								>
									{hidden ? 'Show' : 'Hide'} {widget.title}
								</button>
							);
						})}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
						<h3 className="text-sm font-semibold text-red-200">
							Favorite Drivers ({favoriteDrivers.length}/{FAVORITE_DRIVER_LIMIT}
							)
						</h3>
						<p className="mt-1 text-xs text-gray-400">
							Choose up to 5 drivers.
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{topDrivers.map((d) => {
								const active = favoriteDrivers.includes(d.driver_code);
								const disabled =
									!active && favoriteDrivers.length >= FAVORITE_DRIVER_LIMIT;
								return (
									<button
										key={d.driver_code}
										type="button"
										onClick={() => handleToggleFavoriteDriver(d.driver_code)}
										disabled={disabled}
										className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
											active ?
												'border-red-500/50 bg-red-500/15 text-red-200'
											:	'border-white/15 bg-black/30 text-gray-300 hover:border-white/25'
										} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
									>
										{d.driver_code}
									</button>
								);
							})}
						</div>
					</div>

					<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
						<h3 className="text-sm font-semibold text-red-200">
							Favorite Teams ({favoriteTeams.length}/{FAVORITE_TEAM_LIMIT})
						</h3>
						<p className="mt-1 text-xs text-gray-400">Choose up to 3 teams.</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{topTeams.map((t) => {
								const active = favoriteTeams.includes(t.team_name);
								const disabled =
									!active && favoriteTeams.length >= FAVORITE_TEAM_LIMIT;
								return (
									<button
										key={t.team_name}
										type="button"
										onClick={() => handleToggleFavoriteTeam(t.team_name)}
										disabled={disabled}
										className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
											active ?
												'border-red-500/50 bg-red-500/15 text-red-200'
											:	'border-white/15 bg-black/30 text-gray-300 hover:border-white/25'
										} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
									>
										{t.team_name}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
