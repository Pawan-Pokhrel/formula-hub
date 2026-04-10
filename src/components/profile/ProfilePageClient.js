'use client';

import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { getTelemetryDriverImage } from '@/components/telemetry/telemetryUiUtils';
import authApi from '@/lib/api/authApi';
import { getMyPreferences, updateMyFavorites } from '@/lib/api/preferencesApi';
import {
	getConstructorStandings,
	getDriverStandings,
} from '@/lib/api/standingsApi';
import {
	FAVORITE_DRIVER_LIMIT,
	FAVORITE_TEAM_LIMIT,
} from '@/lib/dashboard/preferences';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	FaBolt,
	FaCheckCircle,
	FaChevronDown,
	FaEnvelope,
	FaKey,
	FaSave,
	FaStar,
	FaUserCog,
} from 'react-icons/fa';

const FAVORITES_LOCAL_KEY = 'formulahub.profile.favorites.v1';

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
	if (!teamName) return '#9ca3af';
	const normalized = String(teamName).trim().toLowerCase();
	if (TEAM_COLOR_HEX[normalized]) return TEAM_COLOR_HEX[normalized];
	for (const [alias, color] of Object.entries(TEAM_COLOR_HEX)) {
		if (normalized.includes(alias)) return color;
	}
	return '#9ca3af';
}

function hexToRgba(hex, alpha) {
	const clean = String(hex).replace('#', '').trim();
	const full =
		clean.length === 3 ?
			clean
				.split('')
				.map((ch) => ch + ch)
				.join('')
		:	clean;
	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);
	if ([r, g, b].some((v) => Number.isNaN(v))) {
		return `rgba(156,163,175,${alpha})`;
	}
	return `rgba(${r},${g},${b},${alpha})`;
}

function readLocalFavorites() {
	if (typeof window === 'undefined') {
		return { favoriteDrivers: [], favoriteTeams: [] };
	}

	try {
		const raw = window.localStorage.getItem(FAVORITES_LOCAL_KEY);
		if (!raw) return { favoriteDrivers: [], favoriteTeams: [] };
		const parsed = JSON.parse(raw);
		return {
			favoriteDrivers: normalizeFavoriteSelection(
				parsed?.favoriteDrivers,
				FAVORITE_DRIVER_LIMIT
			),
			favoriteTeams: normalizeFavoriteSelection(
				parsed?.favoriteTeams,
				FAVORITE_TEAM_LIMIT
			),
		};
	} catch {
		return { favoriteDrivers: [], favoriteTeams: [] };
	}
}

function writeLocalFavorites(favorites) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(FAVORITES_LOCAL_KEY, JSON.stringify(favorites));
	} catch {
		// Ignore storage write failures.
	}
}

function VerificationCodeInput({ value, onChange, disabled = false, label }) {
	const inputRefs = useRef([]);
	const digits = String(value || '')
		.replace(/\D/g, '')
		.slice(0, 6)
		.padEnd(6, ' ')
		.split('');

	const updateDigit = (index, nextChar) => {
		const clean = String(nextChar || '')
			.replace(/\D/g, '')
			.slice(0, 1);
		const current = String(value || '')
			.replace(/\D/g, '')
			.slice(0, 6)
			.padEnd(6, ' ')
			.split('');
		current[index] = clean || ' ';
		const nextValue = current.join('').replace(/\s+/g, '');
		onChange(nextValue);

		if (clean && index < 5) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handlePaste = (event) => {
		event.preventDefault();
		const pasted = event.clipboardData
			.getData('text')
			.replace(/\D/g, '')
			.slice(0, 6);
		onChange(pasted);
		const focusIndex = Math.min(pasted.length, 5);
		inputRefs.current[focusIndex]?.focus();
	};

	return (
		<div className="rounded-xl border border-white/12 bg-black/35 p-3">
			<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">
				{label}
			</p>
			<div className="flex items-center gap-2">
				{digits.map((digit, index) => (
					<input
						key={`${label}-digit-${index}`}
						ref={(el) => {
							inputRefs.current[index] = el;
						}}
						type="text"
						inputMode="numeric"
						maxLength={1}
						disabled={disabled}
						value={digit === ' ' ? '' : digit}
						onPaste={handlePaste}
						onChange={(event) => updateDigit(index, event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Backspace' && !digits[index] && index > 0) {
								inputRefs.current[index - 1]?.focus();
							}
						}}
						className="h-11 w-11 rounded-lg border border-white/22 bg-linear-to-b from-white/10 to-black/45 text-center text-lg font-black text-white outline-none transition focus:border-red-400/70 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.22)] disabled:opacity-60"
					/>
				))}
			</div>
			<p className="mt-2 text-[11px] text-gray-400">
				Tip: paste the full 6-digit code directly.
			</p>
		</div>
	);
}

function FavoriteMultiSelect({
	label,
	placeholder,
	options,
	selectedValues,
	onToggle,
	limit,
	optionType = 'drivers',
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const containerRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;

		const onMouseDown = (event) => {
			if (!containerRef.current?.contains(event.target)) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', onMouseDown);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
		};
	}, [open]);

	const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
	const visibleOptions = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) return options;
		return options.filter((option) => {
			const haystack =
				`${option.label || ''} ${option.subLabel || ''}`.toLowerCase();
			return haystack.includes(normalized);
		});
	}, [options, query]);
	const selectedOptions = useMemo(
		() =>
			selectedValues
				.map((value) => options.find((item) => item.value === value))
				.filter(Boolean),
		[selectedValues, options]
	);
	const isDriverList = optionType === 'drivers';

	return (
		<div
			ref={containerRef}
			className={`relative ${open ? 'z-50' : 'z-10'}`}
		>
			<label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
				{label}
			</label>
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
				aria-haspopup="listbox"
				className="w-full flex items-center justify-between rounded-xl border border-white/6 bg-black/50 px-3 py-2 text-sm text-white outline-none transition hover:border-white/10 disabled:opacity-40"
			>
				<span className="truncate flex-1 text-left">
					{selectedValues.length > 0 ?
						`${selectedValues.length}/${limit} selected`
					:	placeholder}
				</span>
				<FaChevronDown
					size={9}
					className={`shrink-0 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{selectedOptions.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-2">
					{selectedOptions.map((option) => {
						const accent = option.accentColor || '#9ca3af';
						return (
							<span
								key={`chip-${label}-${option.value}`}
								className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] text-gray-100"
								style={{
									borderColor: hexToRgba(accent, 0.62),
									backgroundColor: hexToRgba(accent, 0.22),
								}}
							>
								{option.imageSrc && (
									<span className="relative h-5 w-5 overflow-hidden rounded-full border border-white/25 bg-black/40">
										<Image
											src={option.imageSrc}
											alt={option.label}
											fill
											className="object-cover object-top"
											onError={(event) => {
												event.currentTarget.style.display = 'none';
											}}
										/>
									</span>
								)}
								{option.logoSrc && (
									<span className="relative h-5 w-5 overflow-hidden rounded-sm border border-white/20 bg-black/35 p-0.5">
										<Image
											src={option.logoSrc}
											alt={option.label}
											fill
											className="object-contain"
											onError={(event) => {
												event.currentTarget.style.display = 'none';
											}}
										/>
									</span>
								)}
								<span className="max-w-[180px] truncate">{option.label}</span>
							</span>
						);
					})}
				</div>
			)}

			{open && (
				<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 mt-0 w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c10] shadow-2xl">
					<div className="px-2 py-2 border-b border-white/[0.04]">
						<input
							type="text"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search..."
							className="w-full rounded-lg border border-white/6 bg-white/5 py-1.5 px-3 text-xs text-white outline-none transition focus:border-white/15"
						/>
					</div>
					<div className="max-h-72 overflow-y-auto py-1">
						{visibleOptions.map((option) => {
							const checked = selectedSet.has(option.value);
							const disabled = !checked && selectedValues.length >= limit;
							const accent = option.accentColor || '#9ca3af';

							return (
								<button
									key={`${label}-${option.value}`}
									type="button"
									onClick={() => {
										if (disabled) return;
										onToggle(option.value);
										// Auto close dropdown when limit is reached
										if (!checked && selectedValues.length + 1 >= limit) {
											setOpen(false);
										}
									}}
									disabled={disabled}
									className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm transition-colors ${
										disabled ?
											'cursor-not-allowed opacity-40'
										:	'hover:bg-white/3'
									} ${checked ? 'text-white' : 'text-white/72'}`}
									style={
										checked ? { backgroundColor: hexToRgba(accent, 0.4) } : {}
									}
								>
									<div
										className={`relative shrink-0 overflow-hidden rounded-lg border border-white/5 bg-white/3 flex items-center justify-center ${!isDriverList ? 'h-8 w-12' : 'h-8 w-8'}`}
									>
										{option.imageSrc && (
											<Image
												src={option.imageSrc}
												alt=""
												fill
												sizes={!isDriverList ? '48px' : '32px'}
												className={
													!isDriverList ?
														'object-contain p-1.5'
													:	'object-cover object-top'
												}
												onError={(event) => {
													event.currentTarget.style.display = 'none';
												}}
											/>
										)}
									</div>
									{isDriverList && option.logoSrc && (
										<div className="relative h-5 w-5 shrink-0">
											<Image
												src={option.logoSrc}
												alt=""
												fill
												sizes="20px"
												className="object-contain"
												onError={(event) => {
													event.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									)}
									<div className="flex-1 text-left min-w-0">
										<p
											className="font-medium truncate text-sm"
											style={checked ? { color: 'white' } : {}}
										>
											{option.label}
										</p>
										{isDriverList && option.subLabel && (
											<p
												className="text-[10px] text-white/40 truncate"
												style={
													checked ? { color: 'rgba(255,255,255,0.7)' } : {}
												}
											>
												{option.subLabel}
											</p>
										)}
									</div>
									<div
										className="w-1 h-6 rounded-full shrink-0"
										style={{ backgroundColor: accent }}
									/>
								</button>
							);
						})}
						{visibleOptions.length === 0 && (
							<p className="px-3 py-2 text-xs text-white/40 text-center">
								No matches found.
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function getApiErrorMessage(error, fallback) {
	return (
		error?.response?.data?.detail ||
		error?.response?.data?.message ||
		error?.message ||
		fallback
	);
}

function normalizeFavoriteSelection(values, limit) {
	if (!Array.isArray(values)) return [];
	const deduped = values.filter(
		(value, index) =>
			typeof value === 'string' &&
			value.trim() &&
			values.indexOf(value) === index
	);
	return deduped.slice(0, limit);
}

export default function ProfilePage() {
	const currentYear = new Date().getFullYear();

	const [favoriteDrivers, setFavoriteDrivers] = useState([]);
	const [favoriteTeams, setFavoriteTeams] = useState([]);
	const [driverStandings, setDriverStandings] = useState([]);
	const [constructorStandings, setConstructorStandings] = useState([]);
	const [prefsHydrated, setPrefsHydrated] = useState(false);
	const [savingFavorites, setSavingFavorites] = useState(false);

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
		const local = readLocalFavorites();
		setFavoriteDrivers(local.favoriteDrivers);
		setFavoriteTeams(local.favoriteTeams);

		if (!isAuthenticated) {
			setPrefsHydrated(true);
			return;
		}

		getMyPreferences()
			.then((remote) => {
				const normalized = {
					favoriteDrivers: normalizeFavoriteSelection(
						remote?.favoriteDrivers,
						FAVORITE_DRIVER_LIMIT
					),
					favoriteTeams: normalizeFavoriteSelection(
						remote?.favoriteTeams,
						FAVORITE_TEAM_LIMIT
					),
				};
				setFavoriteDrivers(normalized.favoriteDrivers);
				setFavoriteTeams(normalized.favoriteTeams);
				writeLocalFavorites(normalized);
			})
			.catch(() => {})
			.finally(() => {
				setPrefsHydrated(true);
			});
	}, [isAuthenticated]);

	useEffect(() => {
		if (!prefsHydrated) return;

		const normalized = {
			favoriteDrivers: normalizeFavoriteSelection(
				favoriteDrivers,
				FAVORITE_DRIVER_LIMIT
			),
			favoriteTeams: normalizeFavoriteSelection(
				favoriteTeams,
				FAVORITE_TEAM_LIMIT
			),
		};
		writeLocalFavorites(normalized);

		if (!isAuthenticated) return;

		setSavingFavorites(true);
		const timer = setTimeout(async () => {
			try {
				await updateMyFavorites({
					favoriteDrivers: normalized.favoriteDrivers,
					favoriteTeams: normalized.favoriteTeams,
				});
			} catch {
				// Keep local preferences even if server sync fails.
			} finally {
				setSavingFavorites(false);
			}
		}, 700);

		return () => clearTimeout(timer);
	}, [favoriteDrivers, favoriteTeams, isAuthenticated, prefsHydrated]);

	const topDrivers = driverStandings.slice(0, 10);
	const topTeams = constructorStandings.slice(0, 10);

	const handleToggleFavoriteDriver = (driverCode) => {
		setFavoriteDrivers((prev) => {
			if (prev.includes(driverCode))
				return prev.filter((code) => code !== driverCode);
			if (prev.length >= FAVORITE_DRIVER_LIMIT) return prev;
			return [...prev, driverCode];
		});
	};

	const handleToggleFavoriteTeam = (teamName) => {
		setFavoriteTeams((prev) => {
			if (prev.includes(teamName))
				return prev.filter((team) => team !== teamName);
			if (prev.length >= FAVORITE_TEAM_LIMIT) return prev;
			return [...prev, teamName];
		});
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
		const code =
			channel === 'old' ? emailChangeForm.oldCode : emailChangeForm.newCode;
		if (!emailChangeForm.newEmail.trim() || code.trim().length !== 6) {
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
			setPasswordForm({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
			toast.success(response?.message || 'Password changed successfully.');
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to change password.'));
		} finally {
			setPasswordSaving(false);
		}
	};

	const driverOptions = useMemo(
		() =>
			topDrivers.map((driver) => ({
				value: driver.driver_code,
				label: driver.driver_name,
				subLabel:
					driver.team_name ?
						`${driver.driver_code} • ${driver.team_name} • ${driver.points ?? 0} pts`
					:	`${driver.driver_code} • ${driver.points ?? 0} pts`,
				imageSrc: getTelemetryDriverImage(driver.driver_code, 2026),
				logoSrc: getTeamLogoPath(driver.team_name),
				accentColor: getTeamColorHex(driver.team_name),
			})),
		[topDrivers]
	);

	const teamOptions = useMemo(
		() =>
			topTeams.map((team) => ({
				value: team.team_name,
				label: team.team_name,
				subLabel: `${team.wins ?? 0} wins • ${team.points ?? 0} pts`,
				logoSrc: getTeamLogoPath(team.team_name),
				accentColor: getTeamColorHex(team.team_name),
			})),
		[topTeams]
	);

	const favoriteDriverCards = useMemo(
		() =>
			favoriteDrivers.map((driverCode) => {
				const found = topDrivers.find(
					(driver) => driver.driver_code === driverCode
				);
				if (found) return found;
				return {
					driver_code: driverCode,
					driver_name: driverCode,
					team_name: '',
				};
			}),
		[favoriteDrivers, topDrivers]
	);

	const favoriteTeamCards = useMemo(
		() =>
			favoriteTeams.map((teamName) => {
				const found = topTeams.find((team) => team.team_name === teamName);
				if (found) return found;
				return { team_name: teamName, points: 0, wins: 0 };
			}),
		[favoriteTeams, topTeams]
	);

	return (
		<div className="min-h-screen overflow-x-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
			<div className="fixed inset-0 z-0 bg-black/88" />
			<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_16%,rgba(239,68,68,0.12),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.45),rgba(0,0,0,0.62))]" />
			<div
				className="pointer-events-none fixed inset-0 z-0 opacity-[0.14]"
				style={{
					backgroundImage:
						'repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0px,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 22px)',
				}}
			/>
			<div className="relative z-10 mx-auto max-w-7xl space-y-6 pb-12 animate-fade-in">
				<div className="relative overflow-hidden rounded-3xl border border-white/14 bg-[radial-gradient(circle_at_15%_18%,rgba(239,68,68,0.26),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(34,211,238,0.22),transparent_36%),linear-gradient(165deg,rgba(12,12,14,0.96),rgba(6,7,9,0.98))] p-6 backdrop-blur-2xl md:p-7">
					<div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full bg-red-500/18 blur-3xl" />
					<div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-cyan-400/18 blur-3xl" />
					<p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-red-400">
						Account Command Deck
					</p>
					<h1 className="text-3xl font-black tracking-wide md:text-4xl">
						Profile Settings
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-gray-300">
						Personalize your account identity, lock in dual-email verification,
						and curate your favorite drivers and teams with rich visuals across
						the dashboard.
					</p>
				</div>

				<div className="relative z-30 overflow-visible rounded-3xl border border-white/14 bg-[radial-gradient(circle_at_86%_14%,rgba(239,68,68,0.2),transparent_38%),linear-gradient(160deg,rgba(17,17,24,0.95),rgba(8,8,12,0.94))] p-5 shadow-[0_20px_46px_rgba(0,0,0,0.32)] backdrop-blur-2xl md:p-6">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div>
							<div className="inline-flex items-center gap-2 text-yellow-300">
								<FaStar className="text-[11px]" />
								<h2 className="text-lg font-black tracking-wide text-white">
									Favorites Personalization
								</h2>
							</div>
							<p className="mt-1 text-xs text-gray-300">
								Set your pit-wall heroes. Colors, portraits, and logos are now
								fully visual.
							</p>
						</div>
						<div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs text-gray-200">
							<FaBolt className="text-yellow-300" />
							{savingFavorites ? 'Syncing favorites...' : 'Favorites auto-sync'}
						</div>
					</div>

					<div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
						<div className="rounded-2xl border border-white/12 bg-black/40 p-3">
							<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-300">
								Drivers Grid ({favoriteDriverCards.length}/
								{FAVORITE_DRIVER_LIMIT})
							</p>
							<div className="flex flex-wrap gap-2">
								{favoriteDriverCards.length === 0 && (
									<p className="text-xs text-gray-400">
										No favorite drivers selected yet.
									</p>
								)}
								{favoriteDriverCards.map((driver) => {
									const accent = getTeamColorHex(driver.team_name);
									return (
										<span
											key={`favorite-driver-${driver.driver_code}`}
											className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
											style={{
												borderColor: hexToRgba(accent, 0.62),
												backgroundColor: hexToRgba(accent, 0.2),
											}}
										>
											<span className="relative h-6 w-6 overflow-hidden rounded-full border border-white/20 bg-black/40">
												<Image
													src={getDriverImagePath(driver.driver_code)}
													alt={driver.driver_name}
													fill
													className="object-cover object-top"
													onError={(event) => {
														event.currentTarget.style.display = 'none';
													}}
												/>
											</span>
											<span className="font-semibold text-white">
												{driver.driver_code}
											</span>
										</span>
									);
								})}
							</div>
						</div>

						<div className="rounded-2xl border border-white/12 bg-black/40 p-3">
							<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-300">
								Teams Garage ({favoriteTeamCards.length}/{FAVORITE_TEAM_LIMIT})
							</p>
							<div className="flex flex-wrap gap-2">
								{favoriteTeamCards.length === 0 && (
									<p className="text-xs text-gray-400">
										No favorite teams selected yet.
									</p>
								)}
								{favoriteTeamCards.map((team) => {
									const accent = getTeamColorHex(team.team_name);
									return (
										<span
											key={`favorite-team-${team.team_name}`}
											className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
											style={{
												borderColor: hexToRgba(accent, 0.62),
												backgroundColor: hexToRgba(accent, 0.2),
											}}
										>
											{getTeamLogoPath(team.team_name) && (
												<span className="relative h-5 w-5 overflow-hidden rounded-sm border border-white/20 bg-black/45 p-0.5">
													<Image
														src={getTeamLogoPath(team.team_name)}
														alt={team.team_name}
														fill
														className="object-contain"
														onError={(event) => {
															event.currentTarget.style.display = 'none';
														}}
													/>
												</span>
											)}
											<span className="font-semibold text-white">
												{team.team_name}
											</span>
										</span>
									);
								})}
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FavoriteMultiSelect
							label={`Favorite Drivers (${favoriteDrivers.length}/${FAVORITE_DRIVER_LIMIT})`}
							placeholder="Select favorite drivers"
							options={driverOptions}
							selectedValues={favoriteDrivers}
							onToggle={handleToggleFavoriteDriver}
							limit={FAVORITE_DRIVER_LIMIT}
							optionType="drivers"
						/>
						<FavoriteMultiSelect
							label={`Favorite Teams (${favoriteTeams.length}/${FAVORITE_TEAM_LIMIT})`}
							placeholder="Select favorite teams"
							options={teamOptions}
							selectedValues={favoriteTeams}
							onToggle={handleToggleFavoriteTeam}
							limit={FAVORITE_TEAM_LIMIT}
							optionType="teams"
						/>
					</div>
				</div>

				<div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
					<div className="rounded-2xl border border-white/14 bg-[linear-gradient(155deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] p-5 backdrop-blur-xl shadow-[0_16px_34px_rgba(0,0,0,0.3)]">
						<div className="mb-4 inline-flex items-center gap-2 text-red-200">
							<FaUserCog />
							<h2 className="text-lg font-bold">Personal Information</h2>
						</div>
						<div className="space-y-3">
							<input
								type="text"
								value={profileForm.fullName}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										fullName: e.target.value,
									}))
								}
								placeholder="Full name"
								className="w-full min-h-[52px] rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base outline-none transition focus:border-red-400/50 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
							/>
							<input
								type="text"
								value={profileForm.phoneNumber}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										phoneNumber: e.target.value,
									}))
								}
								placeholder="Phone number"
								className="w-full min-h-[52px] rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base outline-none transition focus:border-red-400/50 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
							/>
							<input
								type="text"
								value={profileForm.username}
								onChange={(e) =>
									setProfileForm((prev) => ({
										...prev,
										username: e.target.value,
									}))
								}
								placeholder="Username"
								className="w-full min-h-[52px] rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base outline-none transition focus:border-red-400/50 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
							/>
							<div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300">
								Current email:{' '}
								<span className="font-semibold text-white">{user?.email}</span>
							</div>
							<button
								type="button"
								onClick={saveProfile}
								disabled={profileSaving}
								className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-500/12 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/22 hover:shadow-[0_0_14px_rgba(248,113,113,0.35)] disabled:opacity-60"
							>
								<FaSave />
								{profileSaving ? 'Saving...' : 'Save Profile'}
							</button>
						</div>
					</div>

					<div className="rounded-2xl border border-white/14 bg-[linear-gradient(155deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] p-5 backdrop-blur-xl shadow-[0_16px_34px_rgba(0,0,0,0.3)]">
						<div className="mb-4 inline-flex items-center gap-2 text-red-200">
							<FaEnvelope />
							<h2 className="text-lg font-bold">
								Change Email (Dual Verification)
							</h2>
						</div>
						<p className="mb-3 text-xs text-gray-400">
							Codes will be sent to both your current and new email. Both must
							be verified.
						</p>
						<div className="space-y-3">
							<input
								type="email"
								value={emailChangeForm.newEmail}
								onChange={(e) =>
									setEmailChangeForm((prev) => ({
										...prev,
										newEmail: e.target.value,
									}))
								}
								placeholder="New email"
								className="w-full min-h-[52px] rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base outline-none transition focus:border-red-400/50 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
							/>
							<button
								type="button"
								onClick={requestEmailChange}
								disabled={emailChangeLoading}
								className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-red-300/45 disabled:opacity-60"
							>
								{emailChangeLoading ?
									'Processing...'
								:	'Send Verification Codes'}
							</button>

							{emailChangeForm.requested && (
								<>
									<div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
										<div className="flex items-center justify-between gap-3">
											<p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
												Verify current email
											</p>
											{emailChangeForm.oldVerified && (
												<span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-200">
													<FaCheckCircle /> Verified
												</span>
											)}
										</div>
										<VerificationCodeInput
											value={emailChangeForm.oldCode}
											onChange={(nextCode) =>
												setEmailChangeForm((prev) => ({
													...prev,
													oldCode: nextCode,
												}))
											}
											disabled={
												emailChangeLoading || emailChangeForm.oldVerified
											}
											label="6-digit code"
										/>
										<button
											type="button"
											onClick={() => verifyEmailChannel('old')}
											disabled={
												emailChangeLoading || emailChangeForm.oldVerified
											}
											className="rounded-full border border-white/18 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-red-300/45 disabled:opacity-60"
										>
											{emailChangeForm.oldVerified ?
												'Verified'
											:	'Verify Current Email'}
										</button>
									</div>
									<div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
										<div className="flex items-center justify-between gap-3">
											<p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
												Verify new email
											</p>
											{emailChangeForm.newVerified && (
												<span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-200">
													<FaCheckCircle /> Verified
												</span>
											)}
										</div>
										<VerificationCodeInput
											value={emailChangeForm.newCode}
											onChange={(nextCode) =>
												setEmailChangeForm((prev) => ({
													...prev,
													newCode: nextCode,
												}))
											}
											disabled={
												emailChangeLoading || emailChangeForm.newVerified
											}
											label="6-digit code"
										/>
										<button
											type="button"
											onClick={() => verifyEmailChannel('new')}
											disabled={
												emailChangeLoading || emailChangeForm.newVerified
											}
											className="rounded-full border border-white/18 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-red-300/45 disabled:opacity-60"
										>
											{emailChangeForm.newVerified ?
												'Verified'
											:	'Verify New Email'}
										</button>
									</div>
									<div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
										<span
											className={`h-2.5 w-2.5 rounded-full ${
												emailChangeForm.oldVerified ? 'bg-emerald-400' : (
													'bg-gray-500'
												)
											}`}
										/>
										<span>
											Current email:{' '}
											{emailChangeForm.oldVerified ? 'verified' : 'pending'}
										</span>
										<span className="mx-1 text-gray-500">•</span>
										<span
											className={`h-2.5 w-2.5 rounded-full ${
												emailChangeForm.newVerified ? 'bg-emerald-400' : (
													'bg-gray-500'
												)
											}`}
										/>
										<span>
											New email:{' '}
											{emailChangeForm.newVerified ? 'verified' : 'pending'}
										</span>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-white/14 bg-[linear-gradient(155deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 backdrop-blur-xl">
					<div className="mb-4 inline-flex items-center gap-2 text-red-200">
						<FaKey />
						<h2 className="text-lg font-bold">Password Security</h2>
					</div>
					{user?.isGoogleAuth ?
						<p className="text-sm text-gray-400">
							This account uses Google Sign-In. Password change is unavailable.
						</p>
					:	<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
							<input
								type="password"
								value={passwordForm.currentPassword}
								onChange={(e) =>
									setPasswordForm((prev) => ({
										...prev,
										currentPassword: e.target.value,
									}))
								}
								placeholder="Current password"
								className="w-full min-h-[52px] rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base outline-none transition focus:border-red-400/50 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
							/>
							<input
								type="password"
								value={passwordForm.newPassword}
								onChange={(e) =>
									setPasswordForm((prev) => ({
										...prev,
										newPassword: e.target.value,
									}))
								}
								placeholder="New password"
								className="w-full min-h-[52px] rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base outline-none transition focus:border-red-400/50 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
							/>
							<input
								type="password"
								value={passwordForm.confirmPassword}
								onChange={(e) =>
									setPasswordForm((prev) => ({
										...prev,
										confirmPassword: e.target.value,
									}))
								}
								placeholder="Confirm new password"
								className="w-full min-h-[52px] rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base outline-none transition focus:border-red-400/50 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.2)]"
							/>
							<div className="md:col-span-3">
								<button
									type="button"
									onClick={changePassword}
									disabled={passwordSaving}
									className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-500/12 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/22 hover:shadow-[0_0_14px_rgba(248,113,113,0.35)] disabled:opacity-60"
								>
									{passwordSaving ? 'Updating...' : 'Change Password'}
								</button>
							</div>
						</div>
					}
				</div>
			</div>
		</div>
	);
}
