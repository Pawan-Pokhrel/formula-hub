'use client';

import CachedAvatarImage from '@/components/common/CachedAvatarImage';
import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { getTelemetryDriverImage } from '@/components/telemetry/telemetryUiUtils';
import authApi from '@/lib/api/authApi';
import { primeAvatarCache } from '@/lib/avatar/avatarCache';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaChevronDown } from 'react-icons/fa';
import {
	FiCamera,
	FiCheck,
	FiLock,
	FiMail,
	FiTrash2,
	FiUser,
	FiX,
} from 'react-icons/fi';

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

/* ─── Spinner (uses <span> to avoid hydration errors with div-in-span) ─── */
function Spinner({ className = '' }) {
	return (
		<span
			className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
		/>
	);
}

/* ─── Section Stripe accent ─── */
function SectionStripe() {
	return (
		<div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-red-600 via-red-500/60 to-transparent" />
	);
}

/* ─── Premium Verification Code Input ─── */
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
		<div>
			<p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
				{label}
			</p>
			<div className="flex items-center justify-center gap-2.5">
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
						className="h-14 w-12 rounded-xl border border-white/15 bg-linear-to-b from-white/8 to-black/50 text-center text-xl font-black text-white outline-none transition-all duration-200 focus:border-red-500/70 focus:shadow-[0_0_16px_rgba(239,68,68,0.25)] focus:scale-105 disabled:opacity-40 placeholder-white/15"
					/>
				))}
			</div>
			<p className="mt-2.5 text-center text-[10px] text-gray-500 tracking-wider uppercase">
				Paste full code or type digit-by-digit
			</p>
		</div>
	);
}

/* ─── Premium Email Verification Modal ─── */
function EmailVerificationModal({
	open,
	onClose,
	emailChangeForm,
	setEmailChangeForm,
	emailChangeLoading,
	onVerify,
	userEmail,
}) {
	if (!open) return null;

	const step = !emailChangeForm.oldVerified ? 1 : 2;
	const bothDone = emailChangeForm.oldVerified && emailChangeForm.newVerified;

	return (
		<div className="fixed inset-0 z-9999 flex items-center justify-center">
			{/* Backdrop with smooth fade */}
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-xs"
				style={{ animation: 'evmFadeIn 0.3s ease-out' }}
				onClick={onClose}
			/>

			{/* Modal with scale entrance */}
			<div
				className="relative w-full max-w-[420px] mx-4 rounded-[28px] bg-[#111114] shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
				style={{ animation: 'evmSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}
			>
				{/* Top accent — subtle gradient glow */}
				<div className="absolute -top-px left-8 right-8 h-px bg-linear-to-r from-transparent via-red-500/60 to-transparent" />

				{/* Close */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-5 right-5 h-7 w-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer z-10"
				>
					<FiX size={15} />
				</button>

				<div className="px-8 pt-8 pb-9">
					{/* Header */}
					<div className="text-center mb-7">
						<p
							className="text-[22px] font-black tracking-tight mb-1"
							style={{
								background: 'linear-gradient(135deg, #fff 30%, #e11d48 100%)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								backgroundClip: 'text',
							}}
						>
							Verify Email
						</p>
						<p className="text-[13px] text-white/35 font-medium">
							Dual-factor confirmation required
						</p>
					</div>

					{/* Elegant stepper */}
					<div className="flex items-center justify-center mb-8">
						{/* Step 1 */}
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
									emailChangeForm.oldVerified ?
										'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
									: step === 1 ?
										'bg-red-500/15 text-red-400 ring-1 ring-red-500/40'
									:	'bg-white/5 text-white/25 ring-1 ring-white/8'
								}`}
							>
								{emailChangeForm.oldVerified ?
									<FiCheck
										size={16}
										strokeWidth={3}
									/>
								:	'1'}
							</div>
							<span
								className={`text-[9px] font-bold uppercase tracking-[0.15em] ${
									emailChangeForm.oldVerified ? 'text-emerald-400/70'
									: step === 1 ? 'text-white/60'
									: 'text-white/20'
								}`}
							>
								Current
							</span>
						</div>

						{/* Connector */}
						<div className="relative w-16 h-px mx-3 mb-5">
							<div className="absolute inset-0 bg-white/8 rounded" />
							<div
								className={`absolute inset-y-0 left-0 rounded transition-all duration-700 ease-out ${emailChangeForm.oldVerified ? 'w-full bg-emerald-500/50' : 'w-0'}`}
							/>
						</div>

						{/* Step 2 */}
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
									emailChangeForm.newVerified ?
										'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
									: step === 2 ?
										'bg-red-500/15 text-red-400 ring-1 ring-red-500/40'
									:	'bg-white/5 text-white/25 ring-1 ring-white/8'
								}`}
							>
								{emailChangeForm.newVerified ?
									<FiCheck
										size={16}
										strokeWidth={3}
									/>
								:	'2'}
							</div>
							<span
								className={`text-[9px] font-bold uppercase tracking-[0.15em] ${
									emailChangeForm.newVerified ? 'text-emerald-400/70'
									: step === 2 ? 'text-white/60'
									: 'text-white/20'
								}`}
							>
								New
							</span>
						</div>
					</div>

					{/* Step content */}
					{bothDone ?
						<div
							className="text-center py-4"
							style={{ animation: 'evmFadeIn 0.4s ease-out' }}
						>
							<div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
								<FiCheck
									className="text-emerald-400 text-xl"
									strokeWidth={3}
								/>
							</div>
							<p
								className="text-lg font-black tracking-tight mb-1"
								style={{
									background: 'linear-gradient(135deg, #fff 30%, #10b981 100%)',
									WebkitBackgroundClip: 'text',
									WebkitTextFillColor: 'transparent',
									backgroundClip: 'text',
								}}
							>
								Email Updated
							</p>
							<p className="text-white/35 text-[13px]">
								Your account email has been changed.
							</p>
						</div>
					: step === 1 ?
						<div style={{ animation: 'evmFadeIn 0.3s ease-out' }}>
							<div className="mb-6 rounded-2xl bg-white/3 px-4 py-3.5">
								<p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 mb-1">
									Verification sent to
								</p>
								<p className="text-sm text-white/70 font-semibold truncate">
									{userEmail}
								</p>
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
								label="Current email code"
							/>

							<button
								type="button"
								onClick={() => onVerify('old')}
								disabled={
									emailChangeLoading || emailChangeForm.oldCode.length < 6
								}
								className="mt-7 w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] cursor-pointer"
							>
								{emailChangeLoading ?
									<>
										<Spinner className="h-3.5 w-3.5 border-black/40 border-t-black" />
										Verifying...
									</>
								:	'Continue'}
							</button>
						</div>
					:	<div style={{ animation: 'evmFadeIn 0.3s ease-out' }}>
							<div className="mb-6 rounded-2xl bg-white/3 px-4 py-3.5">
								<p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 mb-1">
									Verification sent to
								</p>
								<p className="text-sm text-white/70 font-semibold truncate">
									{emailChangeForm.newEmail}
								</p>
							</div>

							<VerificationCodeInput
								value={emailChangeForm.newCode}
								onChange={(nextCode) =>
									setEmailChangeForm((prev) => ({
										...prev,
										newCode: nextCode,
									}))
								}
								disabled={emailChangeLoading || emailChangeForm.newVerified}
								label="New email code"
							/>

							{!emailChangeForm.newVerified && (
								<button
									type="button"
									onClick={() => onVerify('new')}
									disabled={
										emailChangeLoading || emailChangeForm.newCode.length < 6
									}
									className="mt-7 w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] cursor-pointer"
								>
									{emailChangeLoading ?
										<>
											<Spinner className="h-3.5 w-3.5 border-black/40 border-t-black" />
											Verifying...
										</>
									:	'Confirm Change'}
								</button>
							)}
						</div>
					}
				</div>
			</div>

			<style>{`
				@keyframes evmFadeIn {
					from { opacity: 0; }
					to { opacity: 1; }
				}
				@keyframes evmSlideUp {
					from { opacity: 0; transform: translateY(16px) scale(0.97); }
					to { opacity: 1; transform: translateY(0) scale(1); }
				}
			`}</style>
		</div>
	);
}

/* ─── Favorite Multi-Select Dropdown ─── */
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
				className="w-full min-h-[50px] flex items-center justify-between rounded-xl border border-white/12 bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/22 disabled:opacity-40 cursor-pointer"
			>
				<span className="truncate flex-1 text-left pr-2">
					{selectedValues.length > 0 ?
						`${selectedValues.length}/${limit} selected`
					:	placeholder}
				</span>
				<span className="mr-2 rounded-md border border-white/10 bg-white/4 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/55">
					{selectedValues.length}/{limit}
				</span>
				<FaChevronDown
					size={9}
					className={`shrink-0 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{open && (
				<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 mt-0 w-full overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c10] shadow-2xl">
					<div className="border-b border-white/4 px-2.5 py-2.5">
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

/* ─── Main Profile Page ─── */
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
		avatarPath: '',
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
	const [emailModalOpen, setEmailModalOpen] = useState(false);

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
			avatarPath: user?.avatarPath || '',
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
			// Build a true PATCH payload — only include fields that have changed.
			const payload = {};

			const trimmedFullName = profileForm.fullName.trim();
			if (trimmedFullName !== (user?.fullName || '')) {
				payload.fullName = trimmedFullName;
			}

			const trimmedPhone = profileForm.phoneNumber.trim();
			if (trimmedPhone !== (user?.phoneNumber || '')) {
				payload.phoneNumber = trimmedPhone;
			}

			const trimmedUsername = profileForm.username.trim() || null;
			const currentUsername = user?.username || null;
			if (trimmedUsername !== currentUsername) {
				payload.username = trimmedUsername;
			}

			if (!user?.isGoogleAuth) {
				const nextAvatarUrl = profileForm.avatarUrl || null;
				const nextAvatarPath = profileForm.avatarPath || null;
				if (
					nextAvatarUrl !== (user?.avatarUrl || null) ||
					nextAvatarPath !== (user?.avatarPath || null)
				) {
					payload.avatarUrl = nextAvatarUrl;
					payload.avatarPath = nextAvatarPath;
				}
			}

			// If nothing changed, skip the API call entirely.
			if (Object.keys(payload).length === 0) {
				toast('No changes to save.', { icon: 'ℹ️' });
				return;
			}

			const response = await authApi.updateProfile(payload);
			const savedUser = response?.data;
			if (savedUser) {
				setProfileForm({
					fullName: savedUser.fullName || '',
					phoneNumber: savedUser.phoneNumber || '',
					username: savedUser.username || '',
					avatarUrl: savedUser.avatarUrl || '',
					avatarPath: savedUser.avatarPath || '',
				});
				if (savedUser.avatarUrl) {
					void primeAvatarCache(savedUser.avatarUrl);
				}
			}
			await refreshUser();
			toast.success(response?.message || 'Profile updated successfully.');
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to update profile.'));
		} finally {
			setProfileSaving(false);
		}
	};

	const persistAvatarChange = async (nextAvatar, successMessage) => {
		setProfileAvatarUploading(true);
		try {
			const response = await authApi.updateProfile({
				avatarUrl: nextAvatar?.avatarUrl ?? null,
				avatarPath: nextAvatar?.avatarPath ?? null,
			});

			const savedAvatarUrl = response?.data?.avatarUrl || '';
			const savedAvatarPath = response?.data?.avatarPath || '';
			setProfileForm((prev) => ({
				...prev,
				avatarUrl: savedAvatarUrl,
				avatarPath: savedAvatarPath,
			}));
			if (savedAvatarUrl) {
				void primeAvatarCache(savedAvatarUrl);
			}
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
			const avatarData = response?.data || response;
			const uploadedAvatar = {
				avatarUrl: avatarData?.avatarUrl || '',
				avatarPath: avatarData?.avatarPath || '',
			};
			if (!uploadedAvatar.avatarUrl) {
				throw new Error('Upload finished but no image URL was returned.');
			}

			setProfileForm((prev) => ({ ...prev, ...uploadedAvatar }));
			void primeAvatarCache(uploadedAvatar.avatarUrl);
			await persistAvatarChange(uploadedAvatar, 'Profile image updated successfully.');
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

		setProfileForm((prev) => ({ ...prev, avatarUrl: '', avatarPath: '' }));
		await persistAvatarChange(
			{ avatarUrl: null, avatarPath: null },
			'Profile image removed.'
		);
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
			setEmailModalOpen(true);
			toast.success(response?.message || 'Codes sent to both emails.');
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to request email change.'));
		} finally {
			setEmailChangeLoading(false);
		}
	};

	const verifyEmailChannel = useCallback(
		async (channel) => {
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
					toast.success(response?.message || 'Email changed successfully!');
					// Auto-close modal after success with a short delay
					setTimeout(() => {
						setEmailModalOpen(false);
						setEmailChangeForm({
							newEmail: '',
							oldCode: '',
							newCode: '',
							requested: false,
							oldVerified: false,
							newVerified: false,
						});
					}, 2000);
				} else {
					toast.success(response?.message || 'Code verified.');
				}
			} catch (error) {
				toast.error(getApiErrorMessage(error, 'Failed to verify code.'));
			} finally {
				setEmailChangeLoading(false);
			}
		},
		[emailChangeForm, refreshUser]
	);

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

	const userInitial = (user?.fullName || user?.username || user?.email || 'U')
		.trim()
		.charAt(0)
		.toUpperCase();

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
				{/* Header */}
				<div className="mb-10 animate-fade-in">
					<div className="flex items-center gap-4 mb-2">
						<div className="h-0.5 w-8 bg-red-600" />
						<p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
							FormulaHub Settings
						</p>
					</div>
					<h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
						User Profile
					</h1>
					<p className="mt-3 max-w-2xl text-sm font-medium tracking-wide text-gray-500">
						CONFIGURE YOUR PERSONAL DETAILS, ACCOUNT IDENTITY, AND
						FAVORITES FOR A TAILORED EXPERIENCE.
					</p>
				</div>

				<div className="flex flex-col gap-8 animate-fade-in-up w-full max-w-7xl mx-auto relative z-20">
					{/* ─── ROW 1: Favorites ─── */}
					<div className="flex flex-col gap-6 w-full relative z-50">
						<div className="relative rounded-3xl border border-white/10 bg-white/3 p-8 backdrop-blur-xl shadow-2xl overflow-visible">
							<SectionStripe />
							<div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
								<div>
									<h2 className="text-lg font-black uppercase tracking-widest text-white">
										Favorite Picks
									</h2>
									<p className="mt-1 text-xs text-gray-400 uppercase tracking-wider">
										Select your favorites (up to {FAVORITE_DRIVER_LIMIT} drivers
										& {FAVORITE_TEAM_LIMIT} teams)
									</p>
								</div>
								{savingFavorites && (
									<div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
										<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
										<span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
											Syncing
										</span>
									</div>
								)}
							</div>

							<div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 relative z-50">
								<div className="relative z-50">
									<FavoriteMultiSelect
										label={`Favorite Drivers (${favoriteDrivers.length}/${FAVORITE_DRIVER_LIMIT})`}
										placeholder="Choose favorite drivers"
										options={driverOptions}
										selectedValues={favoriteDrivers}
										onToggle={handleToggleFavoriteDriver}
										limit={FAVORITE_DRIVER_LIMIT}
										optionType="drivers"
									/>
								</div>
								<div className="relative z-40">
									<FavoriteMultiSelect
										label={`Favorite Teams (${favoriteTeams.length}/${FAVORITE_TEAM_LIMIT})`}
										placeholder="Choose favorite teams"
										options={teamOptions}
										selectedValues={favoriteTeams}
										onToggle={handleToggleFavoriteTeam}
										limit={FAVORITE_TEAM_LIMIT}
										optionType="teams"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div className="rounded-2xl bg-black/40 p-5 border border-white/8">
									<p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
										Favorite Drivers
									</p>
									<div className="flex flex-wrap gap-2">
										{favoriteDriverCards.length === 0 && (
											<p className="text-xs text-gray-600 uppercase tracking-widest">
												No Favorite Drivers Yet
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
													:	<span
															className="inline-block h-1.5 w-1.5 rounded-full"
															style={{ backgroundColor: accent }}
														/>
													}
													{driver.driver_code}
												</span>
											);
										})}
									</div>
								</div>

								<div className="rounded-2xl bg-black/40 p-5 border border-white/8">
									<p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
										Favorite Teams
									</p>
									<div className="flex flex-wrap gap-2">
										{favoriteTeamCards.length === 0 && (
											<p className="text-xs text-gray-600 uppercase tracking-widest">
												No Favorite Teams Yet
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
													:	<span
															className="inline-block h-1.5 w-1.5 rounded-full"
															style={{ backgroundColor: accent }}
														/>
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

					{/* ─── ROW 2: Identity & Contact ─── */}
					<div className="flex flex-col gap-6 w-full relative z-30">
						<div className="relative rounded-3xl border border-white/10 bg-white/3 p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
							<SectionStripe />
							<div className="mb-6 border-b border-white/8 pb-4 flex items-center gap-3">
								<div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
									<FiUser className="text-red-400 text-sm" />
								</div>
								<div>
									<h2 className="text-lg font-black uppercase tracking-widest text-white">
										Identity & Contact
									</h2>
									<p className="mt-0.5 text-xs text-gray-500 uppercase tracking-widest">
										User Information Profile
									</p>
								</div>
							</div>

							{/* Avatar section */}
							<div className="mb-8 rounded-2xl border border-white/8 bg-black/30 p-5">
								<div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
									<div className="flex items-center gap-4">
										<div className="group relative">
											<div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/15 bg-black/50 ring-2 ring-red-600/20 ring-offset-2 ring-offset-[#09090b] transition-all duration-300 group-hover:ring-red-600/40">
												{profileForm.avatarUrl ?
													<CachedAvatarImage
														src={profileForm.avatarUrl}
														alt="Profile avatar"
														sizes="80px"
														className="h-full w-full object-cover"
													/>
												:	<div className="flex h-full w-full items-center justify-center text-2xl font-black text-white/40">
														{userInitial}
													</div>
												}
											</div>
											{/* Camera overlay on hover (non-Google only) */}
											{!user?.isGoogleAuth && (
												<label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
													<FiCamera className="text-white text-lg" />
													<input
														type="file"
														accept="image/*"
														onChange={uploadProfileAvatar}
														disabled={profileAvatarUploading}
														className="hidden"
													/>
												</label>
											)}
										</div>
										<div>
											<p className="text-sm font-semibold text-white">
												Profile Image
											</p>
											<p className="text-xs text-gray-500 mt-0.5">
												Shown in navigation and account surfaces.
											</p>
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										{user?.isGoogleAuth ?
											<p className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
												Managed by Google Sign-In
											</p>
										:	<>
												<label className="cursor-pointer rounded-xl border border-red-500/30 bg-red-900/15 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-red-300 hover:bg-red-900/25 transition flex items-center gap-2">
													{profileAvatarUploading ?
														<>
															<Spinner className="h-3 w-3" />
															Uploading...
														</>
													:	<>
															<FiCamera size={12} />
															Upload
														</>
													}
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
													className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white/60 hover:text-white hover:bg-white/8 transition flex items-center gap-2 cursor-pointer"
												>
													<FiTrash2 size={12} />
													Remove
												</button>
											</>
										}
									</div>
								</div>
							</div>

							{/* Form fields */}
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
										placeholder="e.g. Alex Morgan"
										className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/8 focus:border-red-600/60 focus:shadow-[0_0_12px_rgba(220,38,38,0.1)]"
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
										className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/8 focus:border-red-600/60 focus:shadow-[0_0_12px_rgba(220,38,38,0.1)]"
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
										className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/8 focus:border-red-600/60 focus:shadow-[0_0_12px_rgba(220,38,38,0.1)]"
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
										className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-500 outline-none cursor-not-allowed"
									/>
								</div>
							</div>
							<div className="mt-8 pt-6 border-t border-white/8 flex justify-end">
								<button
									type="button"
									onClick={saveProfile}
									disabled={profileSaving || profileAvatarUploading}
									className="group flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-40 min-w-[200px] shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] cursor-pointer"
								>
									{profileAvatarUploading ?
										<>
											<Spinner className="h-3 w-3" />
											Uploading image...
										</>
									: profileSaving ?
										<>
											<Spinner className="h-3 w-3" />
											Saving...
										</>
									:	'Save Details'}
								</button>
							</div>
						</div>
					</div>

					{/* ─── ROW 3: Email Change ─── */}
					<div className="flex flex-col gap-6 w-full">
						<div className="relative rounded-3xl border border-white/10 bg-white/3 p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
							<SectionStripe />
							<div className="mb-6 border-b border-white/8 pb-4 flex items-center gap-3">
								<div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
									<FiMail className="text-red-400 text-sm" />
								</div>
								<div>
									<h2 className="text-lg font-black uppercase tracking-widest text-white">
										Communications Shift
									</h2>
									<p className="mt-0.5 text-xs text-gray-500 uppercase tracking-[0.12em]">
										Update your primary email via dual verification
									</p>
								</div>
							</div>

							{user?.isGoogleAuth ?
								<div className="bg-black/30 p-6 rounded-2xl border border-white/8 flex items-center justify-center">
									<p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
										Account secured via Google SSO. Email modifications
										unavailable.
									</p>
								</div>
							:	<div className="max-w-2xl">
									<div className="flex flex-col sm:flex-row gap-3">
										<div className="flex-1 flex flex-col gap-2">
											<label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
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
												className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/8 focus:border-red-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
											/>
										</div>
										<div className="flex items-end">
											<button
												type="button"
												onClick={requestEmailChange}
												disabled={
													emailChangeLoading || emailChangeForm.requested
												}
												className="rounded-xl border border-white/15 bg-transparent hover:bg-white/8 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-40 min-w-40 flex justify-center items-center gap-2 hover:border-white/25 cursor-pointer"
											>
												{emailChangeLoading ?
													<>
														<Spinner className="h-3 w-3" />
														Sending...
													</>
												: emailChangeForm.requested ?
													<>
														<FiCheck size={12} />
														Codes Sent
													</>
												:	'Request Change'}
											</button>
										</div>
									</div>

									{emailChangeForm.requested && (
										<div className="mt-4">
											<button
												type="button"
												onClick={() => setEmailModalOpen(true)}
												className="rounded-xl border border-red-500/25 bg-red-600/10 hover:bg-red-600/20 text-red-400 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
											>
												<FiMail size={13} />
												Enter Verification Codes
											</button>
										</div>
									)}
								</div>
							}
						</div>
					</div>

					{/* ─── ROW 4: Security ─── */}
					<div className="flex flex-col gap-6 w-full">
						<div className="relative rounded-3xl border border-white/10 bg-white/3 p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
							<SectionStripe />
							<div className="mb-6 border-b border-white/8 pb-4 flex items-center gap-3">
								<div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
									<FiLock className="text-red-400 text-sm" />
								</div>
								<div>
									<h2 className="text-lg font-black uppercase tracking-widest text-white">
										Access & Security
									</h2>
									<p className="mt-0.5 text-xs text-gray-500 uppercase tracking-widest">
										Password Management
									</p>
								</div>
							</div>
							{user?.isGoogleAuth ?
								<div className="bg-black/30 p-6 rounded-2xl border border-white/8 flex items-center justify-center">
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
											className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/8 focus:border-red-600/60"
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
											className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/8 focus:border-red-600/60"
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
											className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:bg-white/8 focus:border-red-600/60"
										/>
									</div>
									<div className="md:col-span-3 mt-4 pt-6 border-t border-white/8 flex justify-end">
										<button
											type="button"
											onClick={changePassword}
											disabled={passwordSaving}
											className="group bg-white text-black hover:bg-gray-200 px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-40 min-w-[200px] flex justify-center items-center gap-2 rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
										>
											{passwordSaving ?
												<>
													<Spinner className="h-3 w-3 border-black/40 border-t-black" />
													Updating...
												</>
											:	'Update Password'}
										</button>
									</div>
								</div>
							}
						</div>
					</div>
				</div>
			</div>

			{/* Email Verification Modal */}
			<EmailVerificationModal
				open={emailModalOpen}
				onClose={() => setEmailModalOpen(false)}
				emailChangeForm={emailChangeForm}
				setEmailChangeForm={setEmailChangeForm}
				emailChangeLoading={emailChangeLoading}
				onVerify={verifyEmailChannel}
				userEmail={user?.email || ''}
			/>
		</div>
	);
}
