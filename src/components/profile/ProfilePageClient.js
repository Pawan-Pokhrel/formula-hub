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
import { getApiErrorMessage } from '@/lib/errors/getApiErrorMessage';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaChevronDown } from 'react-icons/fa';

const FAVORITES_LOCAL_KEY = 'formulahub.profile.favorites.v1';

const TEAM_COLOR_HEX = {
	mercedes: '#27F4D2',
	ferrari: '#E8002D',
	'red bull': '#3671C6',
	'red bull racing': '#3671C6',
	mclaren: '#FF8000',
	aston: '#229971',
	'aston martin': '#229971',
	williams: '#64C4FF',
	alpine: '#FF87BC',
	'alpine f1 team': '#FF87BC',
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
			<label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
				{label}
			</label>
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
				aria-haspopup="listbox"
				className="w-full min-h-[50px] flex items-center justify-between rounded-xl border border-white/[0.12] bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/[0.22] disabled:opacity-40"
			>
				<span className="truncate flex-1 text-left pr-2">
					{selectedValues.length > 0 ?
						`${selectedValues.length}/${limit} selected`
					:	placeholder}
				</span>
				<span className="mr-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/55">
					{selectedValues.length}/{limit}
				</span>
				<FaChevronDown
					size={9}
					className={`shrink-0 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{/* Selected options block removed as requested (displayed below instead) */}

			{open && (
				<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 mt-0 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c10] shadow-2xl">
					<div className="border-b border-white/[0.04] px-2.5 py-2.5">
						<input
							type="text"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search..."
							className="w-full rounded-lg border border-white/6 bg-white/5 px-3 py-2 text-xs text-white outline-none transition focus:border-white/20"
						/>
					</div>
					<div className="max-h-72 overflow-y-auto py-1.5">
						{visibleOptions.map((option) => {
							const checked = selectedSet.has(option.value);
							const disabled = !checked && selectedValues.length >= limit;
							const accent = option.accentColor || '#9ca3af';
							const optionImage =
								option.imageSrc || (!isDriverList ? option.logoSrc : null);
							const activeStyle =
								checked ?
									{
										backgroundImage: `linear-gradient(90deg, ${hexToRgba(accent, 0.86)} 0%, ${hexToRgba(accent, 0.68)} 62%, ${hexToRgba(accent, 0.28)} 100%)`,
										boxShadow: `inset 0 0 0 1px ${hexToRgba(accent, 0.95)}, 0 10px 20px ${hexToRgba(accent, 0.36)}`,
									}
								:	undefined;

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
									className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 text-sm transition-colors ${
										disabled ?
											'cursor-not-allowed opacity-40'
										:	'hover:bg-white/3'
									} ${checked ? 'text-white' : 'text-white/72'}`}
									style={activeStyle}
								>
									<div
										className={`relative shrink-0 overflow-hidden rounded-lg border border-white/5 bg-white/3 flex items-center justify-center ${!isDriverList ? 'h-8 w-12' : 'h-8 w-8'}`}
									>
										{optionImage && (
											<Image
												src={optionImage}
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
											className="truncate text-sm font-medium"
											style={checked ? { color: 'white' } : {}}
										>
											{option.label}
										</p>
										{isDriverList && option.subLabel && (
											<p
												className="text-[10px] text-white/40 truncate"
												style={
													checked ? { color: 'rgba(255,255,255,0.88)' } : {}
												}
											>
												{option.subLabel}
											</p>
										)}
									</div>
									{checked && <FaCheckCircle className="text-white/95" />}
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
		avatarUrl: '',
	});
	const [profileSaving, setProfileSaving] = useState(false);
	const [profileAvatarUploading, setProfileAvatarUploading] = useState(false);

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
			avatarUrl: user?.avatarUrl || '',
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

	const allDrivers = driverStandings;
	const allTeams = constructorStandings;

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
				avatarUrl: profileForm.avatarUrl || null,
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

	const persistAvatarChange = async (nextAvatarUrl, successMessage) => {
		setProfileAvatarUploading(true);
		try {
			const response = await authApi.updateProfile({
				avatarUrl: nextAvatarUrl,
			});

			const savedAvatar = response?.data?.avatarUrl || '';
			setProfileForm((prev) => ({ ...prev, avatarUrl: savedAvatar }));
			await refreshUser();
			toast.success(successMessage);
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to update profile image.'));
		} finally {
			setProfileAvatarUploading(false);
		}
	};

	const uploadProfileAvatar = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type?.startsWith('image/')) {
			toast.error('Please choose an image file.');
			event.target.value = '';
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error('Image must be 5MB or smaller.');
			event.target.value = '';
			return;
		}

		try {
			const response = await authApi.uploadAvatar(file);
			const uploadedUrl = response?.avatarUrl || '';
			if (!uploadedUrl) {
				throw new Error('Upload finished but no image URL was returned.');
			}

			setProfileForm((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
			await persistAvatarChange(
				uploadedUrl,
				'Profile image updated successfully.'
			);
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to upload profile image.'));
		} finally {
			event.target.value = '';
		}
	};

	const removeProfileAvatar = async () => {
		if (!profileForm.avatarUrl) {
			toast.error('No profile image to remove.');
			return;
		}

		setProfileForm((prev) => ({ ...prev, avatarUrl: '' }));
		await persistAvatarChange(null, 'Profile image removed.');
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
			allDrivers.map((driver) => ({
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
		[allDrivers]
	);

	const teamOptions = useMemo(
		() =>
			allTeams.map((team) => ({
				value: team.team_name,
				label: team.team_name,
				subLabel: `${team.wins ?? 0} wins • ${team.points ?? 0} pts`,
				imageSrc: getTeamLogoPath(team.team_name),
				logoSrc: getTeamLogoPath(team.team_name),
				accentColor: getTeamColorHex(team.team_name),
			})),
		[allTeams]
	);

	const favoriteDriverCards = useMemo(
		() =>
			favoriteDrivers.map((driverCode) => {
				const found = allDrivers.find(
					(driver) => driver.driver_code === driverCode
				);
				if (found) return found;
				return {
					driver_code: driverCode,
					driver_name: driverCode,
					team_name: '',
				};
			}),
		[favoriteDrivers, allDrivers]
	);

	const favoriteTeamCards = useMemo(
		() =>
			favoriteTeams.map((teamName) => {
				const found = allTeams.find((team) => team.team_name === teamName);
				if (found) return found;
				return { team_name: teamName, points: 0, wins: 0 };
			}),
		[favoriteTeams, allTeams]
	);

	return (
		<div className="min-h-screen bg-[#09090b] text-gray-200">
			{/* Core background texture */}
			<div className="fixed inset-0 z-0 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center opacity-30 mix-blend-luminosity" />
			<div className="fixed inset-0 z-0 bg-black/60 backdrop-blur-[2px]" />
			<div
				className="pointer-events-none fixed inset-0 z-0 opacity-10"
				style={{
					backgroundImage: `repeating-linear-gradient(45deg, #111 0, #111 1px, transparent 0, transparent 50%),
									  repeating-linear-gradient(-45deg, #111 0, #111 1px, transparent 0, transparent 50%)`,
					backgroundSize: '12px 12px',
				}}
			/>

			<div className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-16 md:px-14 lg:px-24">
				{/* Sleek F1 Style Header */}
				<div className="mb-10 animate-fade-in">
					<div className="flex items-center gap-4 mb-2">
						<div className="h-[2px] w-8 bg-red-600"></div>
						<p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
							FormulaHub Settings
						</p>
					</div>
					<h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
						Driver Profile
					</h1>
					<p className="mt-3 max-w-2xl text-sm font-medium tracking-wide text-gray-500">
						CONFIGURE YOUR PERSONAL DETAILS, IDENTITY, AND TRACK PREFERENCES FOR
						A TAILORED EXPERIENCE AND DASHBOARD.
					</p>
				</div>

				<div className="flex flex-col gap-10 animate-fade-in-up w-full max-w-7xl mx-auto relative z-20">
					{/* ROW 1: Favorites (Full Width, Higher Z-index for dropdown) */}
					<div className="flex flex-col gap-6 w-full relative z-50">
						<div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 relative z-50">
							<div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
								<div>
									<h2 className="text-lg font-black uppercase tracking-widest text-white">
										Grid Favorites
									</h2>
									<p className="mt-1 text-xs text-gray-400 uppercase tracking-wider">
										Select your lineup (up to {FAVORITE_DRIVER_LIMIT} drivers &{' '}
										{FAVORITE_TEAM_LIMIT} constructors)
									</p>
								</div>
								{savingFavorites && (
									<div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
										<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></div>
										<span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
											Syncing
										</span>
									</div>
								)}
							</div>

							<div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 relative z-50">
								<div className="relative z-50">
									<FavoriteMultiSelect
										label={`Selected Drivers (${favoriteDrivers.length}/${FAVORITE_DRIVER_LIMIT})`}
										placeholder="Choose your drivers"
										options={driverOptions}
										selectedValues={favoriteDrivers}
										onToggle={handleToggleFavoriteDriver}
										limit={FAVORITE_DRIVER_LIMIT}
										optionType="drivers"
									/>
								</div>
								<div className="relative z-40">
									<FavoriteMultiSelect
										label={`Selected Teams (${favoriteTeams.length}/${FAVORITE_TEAM_LIMIT})`}
										placeholder="Choose your constructors"
										options={teamOptions}
										selectedValues={favoriteTeams}
										onToggle={handleToggleFavoriteTeam}
										limit={FAVORITE_TEAM_LIMIT}
										optionType="teams"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div className="rounded-2xl bg-black/40 p-5 border border-white/10">
									<p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
										Active Driver Roster
									</p>
									<div className="flex flex-wrap gap-2">
										{favoriteDriverCards.length === 0 && (
											<p className="text-xs text-gray-600 uppercase tracking-widest">
												Empty Roster
											</p>
										)}
										{favoriteDriverCards.map((driver) => {
											const accent = getTeamColorHex(driver.team_name);
											const driverImg = getDriverImagePath(driver.driver_code);
											return (
												<span
													key={`favorite-driver-${driver.driver_code}`}
													className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300"
													style={{
														backgroundColor: hexToRgba(accent, 0.15),
														color: '#FFF',
													}}
												>
													{driverImg ?
														<span className="relative h-6 w-6 overflow-hidden rounded-full bg-black/40 border border-white/10">
															<Image
																src={driverImg}
																alt={driver.driver_code}
																fill
																className="object-cover object-top"
															/>
														</span>
													:	<div
															className="h-1.5 w-1.5 rounded-full"
															style={{ backgroundColor: accent }}
														></div>
													}
													{driver.driver_code}
												</span>
											);
										})}
									</div>
								</div>

								<div className="rounded-2xl bg-black/40 p-5 border border-white/10">
									<p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
										Active Team Garage
									</p>
									<div className="flex flex-wrap gap-2">
										{favoriteTeamCards.length === 0 && (
											<p className="text-xs text-gray-600 uppercase tracking-widest">
												Empty Garage
											</p>
										)}
										{favoriteTeamCards.map((team) => {
											const accent = getTeamColorHex(team.team_name);
											const logoImg = getTeamLogoPath(team.team_name);
											return (
												<span
													key={`favorite-team-${team.team_name}`}
													className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300"
													style={{
														backgroundColor: hexToRgba(accent, 0.15),
														color: '#FFF',
													}}
												>
													{logoImg ?
														<span className="relative h-4 w-6 overflow-hidden rounded-sm bg-black/40 border border-white/10 p-0.5">
															<Image
																src={logoImg}
																alt={team.team_name}
																fill
																className="object-contain"
															/>
														</span>
													:	<div
															className="h-1.5 w-1.5 rounded-full"
															style={{ backgroundColor: accent }}
														></div>
													}
													{team.team_name}
												</span>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* ROW 2: Identity & Contact (Full Width) */}
					<div className="flex flex-col gap-6 w-full relative z-30">
						<div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20">
							<div className="mb-6 border-b border-white/10 pb-4">
								<h2 className="text-lg font-black uppercase tracking-widest text-white">
									Identity & Contact
								</h2>
								<p className="mt-1 text-xs text-gray-400 uppercase tracking-widest">
									User Information Profile
								</p>
							</div>
							<div className="mb-6 rounded-2xl border border-white/12 bg-black/35 p-4">
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
									Driver Portrait
								</p>
								<div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
									<div className="flex items-center gap-3">
										<div className="h-16 w-16 overflow-hidden rounded-full border border-white/20 bg-black/45">
											{profileForm.avatarUrl ?
												<Image
													src={profileForm.avatarUrl}
													alt="Profile avatar preview"
													width={64}
													height={64}
													unoptimized
													className="h-full w-full object-cover"
												/>
											:	<div className="flex h-full w-full items-center justify-center text-lg font-black text-white/55">
													{(
														user?.fullName ||
														user?.username ||
														user?.email ||
														'U'
													)
														.charAt(0)
														.toUpperCase()}
												</div>
											}
										</div>
										<div>
											<p className="text-sm font-semibold text-white">
												Profile Image
											</p>
											<p className="text-xs text-gray-400">
												Shown in navigation and account surfaces.
											</p>
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										{user?.isGoogleAuth ?
											<p className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
												Google account image is managed by Google Sign-In.
											</p>
										:	<>
												<label className="cursor-pointer rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200 hover:bg-red-900/30">
													{profileAvatarUploading ?
														'Uploading...'
													:	'Upload New'}
													<input
														type="file"
														accept="image/*"
														onChange={uploadProfileAvatar}
														disabled={profileAvatarUploading}
														className="hidden"
													/>
												</label>
												<button
													type="button"
													onClick={removeProfileAvatar}
													disabled={profileAvatarUploading || profileSaving}
													className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/75 hover:text-white hover:bg-white/10"
												>
													Remove
												</button>
											</>
										}
									</div>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="flex flex-col gap-2">
									<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors focus-within:text-red-500">
										Full Name
									</label>
									<input
										type="text"
										value={profileForm.fullName}
										onChange={(e) =>
											setProfileForm((prev) => ({
												...prev,
												fullName: e.target.value,
											}))
										}
										placeholder="e.g. Lewis Hamilton"
										className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/10 focus:border-red-600"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors focus-within:text-red-500">
										Username
									</label>
									<input
										type="text"
										value={profileForm.username}
										onChange={(e) =>
											setProfileForm((prev) => ({
												...prev,
												username: e.target.value,
											}))
										}
										placeholder="e.g. LH44"
										className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/10 focus:border-red-600"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors focus-within:text-red-500">
										Comms Link (Phone)
									</label>
									<input
										type="tel"
										value={profileForm.phoneNumber}
										onChange={(e) =>
											setProfileForm((prev) => ({
												...prev,
												phoneNumber: e.target.value,
											}))
										}
										placeholder="+1 234 567 890"
										className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/10 focus:border-red-600"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
										Primary Email (Active)
									</label>
									<input
										type="email"
										disabled
										value={user?.email || ''}
										className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-500 outline-none cursor-not-allowed"
									/>
								</div>
							</div>
							<div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
								<button
									type="button"
									onClick={saveProfile}
									disabled={profileSaving || profileAvatarUploading}
									className="group flex items-center justify-center rounded-2xl bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-50 min-w-[200px] shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
								>
									{profileAvatarUploading ?
										<span className="flex items-center gap-2">
											<div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
											Uploading image...
										</span>
									: profileSaving ?
										<span className="flex items-center gap-2">
											<div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
											Saving...
										</span>
									:	'Save Details'}
								</button>
							</div>
						</div>
					</div>

					{/* ROW 3: Email Shift (Full Width) */}
					<div className="flex flex-col gap-6 w-full">
						<div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20">
							<div className="mb-6 border-b border-white/10 pb-4">
								<h2 className="text-lg font-black uppercase tracking-widest text-white">
									Communications Shift
								</h2>
								<p className="mt-1 text-xs text-gray-400 uppercase tracking-[0.12em]">
									Update your primary destination email via dual-auth.
								</p>
							</div>

							{user?.isGoogleAuth ?
								<div className="bg-black/40 p-6 rounded-2xl border border-white/10 flex items-center justify-center">
									<p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
										Account secured via Google SSO. Email modifications
										unavailable.
									</p>
								</div>
							:	<div className="space-y-6 max-w-2xl">
									<div className="flex flex-col gap-2">
										<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors focus-within:text-red-500">
											New Destination Email
										</label>
										<input
											type="email"
											value={emailChangeForm.newEmail}
											onChange={(e) =>
												setEmailChangeForm((prev) => ({
													...prev,
													newEmail: e.target.value,
												}))
											}
											placeholder="e.g. future.champion@example.com"
											disabled={emailChangeForm.requested}
											className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/10 focus:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
										/>
									</div>

									{!emailChangeForm.requested && (
										<button
											type="button"
											onClick={requestEmailChange}
											disabled={emailChangeLoading}
											className="w-auto border border-white/20 bg-transparent hover:bg-white/10 text-white px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-50 min-w-[200px] flex justify-center items-center rounded-2xl hover:border-white/30"
										>
											{emailChangeLoading ?
												<span className="flex items-center gap-2">
													<div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
													Initiating...
												</span>
											:	'Request Change'}
										</button>
									)}

									{emailChangeForm.requested && (
										<div className="mt-6 space-y-6 border-t border-white/10 pt-6 bg-black/20 p-6 rounded-2xl border border-white/5">
											{!emailChangeForm.oldVerified ?
												<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
													<div className="mb-3 flex items-center justify-between">
														<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
															Current Inbox Code (AUTH-1)
														</label>
														<span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-xl border bg-white/5 border-white/10 text-gray-500">
															Pending
														</span>
													</div>
													<VerificationCodeInput
														value={emailChangeForm.oldCode}
														onChange={(nextCode) =>
															setEmailChangeForm((prev) => ({
																...prev,
																oldCode: nextCode,
															}))
														}
														disabled={emailChangeLoading}
														label="Enter 6-Digit Code sent to old email"
													/>
													<button
														type="button"
														onClick={() => verifyEmailChannel('old')}
														disabled={
															emailChangeLoading ||
															emailChangeForm.oldCode.length < 6
														}
														className="mt-6 w-full border border-red-500/30 bg-red-600/10 hover:bg-red-600/20 text-red-500 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 flex justify-center items-center rounded-xl hover:border-red-500/50 disabled:opacity-50"
													>
														{emailChangeLoading ?
															'Verifying...'
														:	'Verify First Auth'}
													</button>
												</div>
											:	<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
													<div className="mb-3 flex items-center justify-between">
														<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
															New Inbox Code (AUTH-2)
														</label>
														<span
															className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-xl border ${emailChangeForm.newVerified ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
														>
															{emailChangeForm.newVerified ?
																'Verified'
															:	'Pending'}
														</span>
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
														label="Enter 6-Digit Code sent to new email"
													/>
													{!emailChangeForm.newVerified && (
														<button
															type="button"
															onClick={() => verifyEmailChannel('new')}
															disabled={
																emailChangeLoading ||
																emailChangeForm.newCode.length < 6
															}
															className="mt-6 w-full border border-red-500/30 bg-red-600/10 hover:bg-red-600/20 text-red-500 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 flex justify-center items-center rounded-xl hover:border-red-500/50 disabled:opacity-50"
														>
															{emailChangeLoading ?
																'Verifying...'
															:	'Verify Second Auth'}
														</button>
													)}
												</div>
											}
										</div>
									)}
								</div>
							}
						</div>
					</div>

					{/* ROW 4: Security (Full Width) */}
					<div className="flex flex-col gap-6 w-full">
						<div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20">
							<div className="mb-6 border-b border-white/10 pb-4">
								<h2 className="text-lg font-black uppercase tracking-widest text-white">
									Access & Security
								</h2>
								<p className="mt-1 text-xs text-gray-400 uppercase tracking-widest">
									Password Management
								</p>
							</div>
							{user?.isGoogleAuth ?
								<div className="bg-black/40 p-6 rounded-2xl border border-white/10 flex items-center justify-center">
									<p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
										Account secured via Google SSO. Password modifications
										unavailable.
									</p>
								</div>
							:	<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
									<div className="flex flex-col gap-2">
										<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors focus-within:text-red-500">
											Current Password
										</label>
										<input
											type="password"
											value={passwordForm.currentPassword}
											onChange={(e) =>
												setPasswordForm((prev) => ({
													...prev,
													currentPassword: e.target.value,
												}))
											}
											placeholder="••••••••"
											className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/10 focus:border-red-600"
										/>
									</div>
									<div className="flex flex-col gap-2">
										<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors focus-within:text-red-500">
											New Password
										</label>
										<input
											type="password"
											value={passwordForm.newPassword}
											onChange={(e) =>
												setPasswordForm((prev) => ({
													...prev,
													newPassword: e.target.value,
												}))
											}
											placeholder="••••••••"
											className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/10 focus:border-red-600"
										/>
									</div>
									<div className="flex flex-col gap-2">
										<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors focus-within:text-red-500">
											Confirm Password
										</label>
										<input
											type="password"
											value={passwordForm.confirmPassword}
											onChange={(e) =>
												setPasswordForm((prev) => ({
													...prev,
													confirmPassword: e.target.value,
												}))
											}
											placeholder="••••••••"
											className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/10 focus:border-red-600"
										/>
									</div>
									<div className="md:col-span-3 mt-4 pt-6 border-t border-white/10 flex justify-end">
										<button
											type="button"
											onClick={changePassword}
											disabled={passwordSaving}
											className="group bg-white text-black hover:bg-gray-200 px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-50 min-w-[200px] flex justify-center items-center rounded-2xl hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
										>
											{passwordSaving ?
												<span className="flex items-center gap-2">
													<div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
													Updating...
												</span>
											:	'Update Password'}
										</button>
									</div>
								</div>
							}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
