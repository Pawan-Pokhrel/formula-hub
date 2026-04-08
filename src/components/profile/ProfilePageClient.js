'use client';

import authApi from '@/lib/api/authApi';
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
import toast from 'react-hot-toast';
import {
	FaEnvelope,
	FaKey,
	FaSave,
	FaSlidersH,
	FaUndoAlt,
	FaUserCog,
} from 'react-icons/fa';

function getApiErrorMessage(error, fallback) {
	return (
		error?.response?.data?.detail ||
		error?.response?.data?.message ||
		error?.message ||
		fallback
	);
}

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
	const [savingPrefs, setSavingPrefs] = useState(false);

	const { isAuthenticated, user, refreshUser } = useAuth();

	const [profileForm, setProfileForm] = useState({
		fullName: '',
		phoneNumber: '',
		username: '',
	});
	const [profileSaving, setProfileSaving] = useState(false);

	const [emailChangeForm, setEmailChangeForm] = useState({
		newEmail: '',
		oldCode: '',
		newCode: '',
		requested: false,
		oldVerified: false,
		newVerified: false,
	});
	const [emailChangeLoading, setEmailChangeLoading] = useState(false);

	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [passwordSaving, setPasswordSaving] = useState(false);

	useEffect(() => {
		setProfileForm({
			fullName: user?.fullName || '',
			phoneNumber: user?.phoneNumber || '',
			username: user?.username || '',
		});
	}, [user]);

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
				// Keep local preferences even if server sync fails.
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

	const topDrivers = driverStandings.slice(0, 10);
	const topTeams = constructorStandings.slice(0, 10);

	const handleToggleWidget = (widgetId) => {
		setHiddenWidgets((prev) =>
			prev.includes(widgetId) ?
				prev.filter((id) => id !== widgetId)
			: 	[...prev, widgetId]
		);
	};

	const handleToggleFavoriteDriver = (driverCode) => {
		setFavoriteDrivers((prev) => {
			if (prev.includes(driverCode)) return prev.filter((code) => code !== driverCode);
			if (prev.length >= FAVORITE_DRIVER_LIMIT) return prev;
			return [...prev, driverCode];
		});
	};

	const handleToggleFavoriteTeam = (teamName) => {
		setFavoriteTeams((prev) => {
			if (prev.includes(teamName)) return prev.filter((team) => team !== teamName);
			if (prev.length >= FAVORITE_TEAM_LIMIT) return prev;
			return [...prev, teamName];
		});
	};

	const handleResetPreferences = async () => {
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
			toast.success('Dashboard preferences reset.');
		} catch {
			toast.error('Using local defaults. Server reset failed.');
		}
	};

	const saveProfile = async () => {
		setProfileSaving(true);
		try {
			const payload = {
				fullName: profileForm.fullName.trim(),
				phoneNumber: profileForm.phoneNumber.trim(),
				username: profileForm.username.trim() || null,
			};
			const response = await authApi.updateProfile(payload);
			await refreshUser();
			toast.success(response?.message || 'Profile updated successfully.');
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to update profile.'));
		} finally {
			setProfileSaving(false);
		}
	};

	const requestEmailChange = async () => {
		if (!emailChangeForm.newEmail.trim()) {
			toast.error('Please enter the new email address.');
			return;
		}
		setEmailChangeLoading(true);
		try {
			const response = await authApi.requestEmailChange({
				newEmail: emailChangeForm.newEmail.trim(),
			});
			setEmailChangeForm((prev) => ({
				...prev,
				requested: true,
				oldVerified: false,
				newVerified: false,
				oldCode: '',
				newCode: '',
			}));
			toast.success(response?.message || 'Codes sent to both emails.');
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to request email change.'));
		} finally {
			setEmailChangeLoading(false);
		}
	};

	const verifyEmailChannel = async (channel) => {
		const code = channel === 'old' ? emailChangeForm.oldCode : emailChangeForm.newCode;
		if (!emailChangeForm.newEmail.trim() || !code.trim()) {
			toast.error('Enter email and verification code first.');
			return;
		}
		setEmailChangeLoading(true);
		try {
			const response = await authApi.verifyEmailChange({
				newEmail: emailChangeForm.newEmail.trim(),
				code: code.trim(),
				channel,
			});
			setEmailChangeForm((prev) => ({
				...prev,
				oldVerified: Boolean(response?.oldEmailVerified),
				newVerified: Boolean(response?.newEmailVerified),
			}));
			if (response?.completed) {
				await refreshUser();
				setEmailChangeForm({
					newEmail: '',
					oldCode: '',
					newCode: '',
					requested: false,
					oldVerified: false,
					newVerified: false,
				});
			}
			toast.success(response?.message || 'Verification updated.');
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to verify code.'));
		} finally {
			setEmailChangeLoading(false);
		}
	};

	const changePassword = async () => {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error('New password and confirm password do not match.');
			return;
		}
		setPasswordSaving(true);
		try {
			const response = await authApi.changePassword({
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword,
			});
			setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
			toast.success(response?.message || 'Password changed successfully.');
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to change password.'));
		} finally {
			setPasswordSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
			<div className="fixed inset-0 z-0 bg-black/84" />
			<div className="relative z-10 mx-auto max-w-[1200px] space-y-6 pb-12 animate-fade-in">
				<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
					<p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-500">Account</p>
					<h1 className="text-3xl font-black tracking-wide md:text-4xl">Profile Settings</h1>
					<p className="mt-2 text-sm text-gray-400">
						Update your personal information, secure your email change with dual verification,
						and manage password settings.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
						<div className="mb-4 inline-flex items-center gap-2 text-red-200">
							<FaUserCog />
							<h2 className="text-lg font-bold">Personal Information</h2>
						</div>
						<div className="space-y-3">
							<input
								type="text"
								value={profileForm.fullName}
								onChange={(e) =>
									setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
								}
								placeholder="Full name"
								className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
							/>
							<input
								type="text"
								value={profileForm.phoneNumber}
								onChange={(e) =>
									setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
								}
								placeholder="Phone number"
								className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
							/>
							<input
								type="text"
								value={profileForm.username}
								onChange={(e) =>
									setProfileForm((prev) => ({ ...prev, username: e.target.value }))
								}
								placeholder="Username"
								className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
							/>
							<div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300">
								Current email: <span className="font-semibold text-white">{user?.email}</span>
							</div>
							<button
								type="button"
								onClick={saveProfile}
								disabled={profileSaving}
								className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-60"
							>
								<FaSave />
								{profileSaving ? 'Saving...' : 'Save Profile'}
							</button>
						</div>
					</div>

					<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
						<div className="mb-4 inline-flex items-center gap-2 text-red-200">
							<FaEnvelope />
							<h2 className="text-lg font-bold">Change Email (Dual Verification)</h2>
						</div>
						<p className="mb-3 text-xs text-gray-400">
							Codes will be sent to both your current and new email. Both must be verified.
						</p>
						<div className="space-y-3">
							<input
								type="email"
								value={emailChangeForm.newEmail}
								onChange={(e) =>
									setEmailChangeForm((prev) => ({ ...prev, newEmail: e.target.value }))
								}
								placeholder="New email"
								className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
							/>
							<button
								type="button"
								onClick={requestEmailChange}
								disabled={emailChangeLoading}
								className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
							>
								{emailChangeLoading ? 'Processing...' : 'Send Verification Codes'}
							</button>

							{emailChangeForm.requested && (
								<>
									<div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-center">
										<input
											type="text"
											value={emailChangeForm.oldCode}
											onChange={(e) =>
												setEmailChangeForm((prev) => ({ ...prev, oldCode: e.target.value }))
											}
											placeholder="Code from current email"
											className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
										/>
										<button
											type="button"
											onClick={() => verifyEmailChannel('old')}
											disabled={emailChangeLoading || emailChangeForm.oldVerified}
											className="rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
										>
											{emailChangeForm.oldVerified ? 'Verified' : 'Verify Current Email'}
										</button>
									</div>
									<div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-center">
										<input
											type="text"
											value={emailChangeForm.newCode}
											onChange={(e) =>
												setEmailChangeForm((prev) => ({ ...prev, newCode: e.target.value }))
											}
											placeholder="Code from new email"
											className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
										/>
										<button
											type="button"
											onClick={() => verifyEmailChannel('new')}
											disabled={emailChangeLoading || emailChangeForm.newVerified}
											className="rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
										>
											{emailChangeForm.newVerified ? 'Verified' : 'Verify New Email'}
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
					<div className="mb-4 inline-flex items-center gap-2 text-red-200">
						<FaKey />
						<h2 className="text-lg font-bold">Password Security</h2>
					</div>
					{user?.isGoogleAuth ?
						<p className="text-sm text-gray-400">
							This account uses Google Sign-In. Password change is unavailable.
						</p>
					: 	<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
							<input
								type="password"
								value={passwordForm.currentPassword}
								onChange={(e) =>
									setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
								}
								placeholder="Current password"
								className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
							/>
							<input
								type="password"
								value={passwordForm.newPassword}
								onChange={(e) =>
									setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
								}
								placeholder="New password"
								className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
							/>
							<input
								type="password"
								value={passwordForm.confirmPassword}
								onChange={(e) =>
									setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
								}
								placeholder="Confirm new password"
								className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/50"
							/>
							<div className="md:col-span-3">
								<button
									type="button"
									onClick={changePassword}
									disabled={passwordSaving}
									className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-60"
								>
									{passwordSaving ? 'Updating...' : 'Change Password'}
								</button>
							</div>
						</div>
					}
				</div>

				<div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div className="inline-flex items-center gap-2">
							<FaSlidersH className="text-red-400" />
							<h2 className="text-lg font-bold">Dashboard Preferences</h2>
						</div>
						<button
							type="button"
							onClick={handleResetPreferences}
							className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-xs font-medium text-white transition hover:border-red-400/45"
						>
							<FaUndoAlt /> Reset to default
						</button>
					</div>
					<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs text-gray-300">
						{savingPrefs ? 'Saving preference changes...' : 'Preference changes auto-save'}
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
										: 	'border-red-500/40 bg-red-500/15 text-red-200'
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
							Favorite Drivers ({favoriteDrivers.length}/{FAVORITE_DRIVER_LIMIT})
						</h3>
						<div className="mt-3 flex flex-wrap gap-2">
							{topDrivers.map((d) => {
								const active = favoriteDrivers.includes(d.driver_code);
								const disabled = !active && favoriteDrivers.length >= FAVORITE_DRIVER_LIMIT;
								return (
									<button
										key={d.driver_code}
										type="button"
										onClick={() => handleToggleFavoriteDriver(d.driver_code)}
										disabled={disabled}
										className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
											active ?
												'border-red-500/50 bg-red-500/15 text-red-200'
											: 	'border-white/15 bg-black/30 text-gray-300 hover:border-white/25'
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
						<div className="mt-3 flex flex-wrap gap-2">
							{topTeams.map((t) => {
								const active = favoriteTeams.includes(t.team_name);
								const disabled = !active && favoriteTeams.length >= FAVORITE_TEAM_LIMIT;
								return (
									<button
										key={t.team_name}
										type="button"
										onClick={() => handleToggleFavoriteTeam(t.team_name)}
										disabled={disabled}
										className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
											active ?
												'border-red-500/50 bg-red-500/15 text-red-200'
											: 	'border-white/15 bg-black/30 text-gray-300 hover:border-white/25'
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
