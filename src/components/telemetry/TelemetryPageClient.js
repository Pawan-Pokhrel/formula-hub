'use client';

import TyreIcon from '@/components/common/TyreIcon';
import {
	getCountryCode,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import {
	getCurrentTelemetrySnapshot,
	getSchedule,
	getTelemetryHistoryEvents,
	getTelemetrySessionSnapshot,
} from '@/lib/api/scheduleApi';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	FaChartLine,
	FaChevronDown,
	FaMapMarkerAlt,
	FaProjectDiagram,
	FaStopwatch,
} from 'react-icons/fa';
import DriverBandsPagination from './DriverBandsPagination';
import { getTelemetryDriverImage } from './telemetryUiUtils';

function buildContextQuery(snapshot) {
	const event = snapshot?.event;
	const session = snapshot?.session;
	if (!event) return '';

	const params = new URLSearchParams({
		year: String(event.year),
		round: String(event.round),
	});
	if (session?.name) params.set('session', session.name);
	if (session?.session_type) params.set('sessionType', session.session_type);
	return params.toString();
}

function buildFallbackHistoryEvents(scheduleRows, selectedYear) {
	const now = new Date();

	return (Array.isArray(scheduleRows) ? scheduleRows : [])
		.filter((race) => {
			const raceDate = new Date(race?.date || '');
			return !Number.isNaN(raceDate.getTime()) && raceDate < now;
		})
		.map((race) => ({
			year: selectedYear,
			round: Number(race?.round || 0),
			event: race?.race_name || race?.event || `Round ${race?.round || '?'}`,
			country: race?.circuit?.country || race?.country || 'Unknown',
			location: race?.circuit?.location || race?.location || 'Unknown',
			race_date_utc: race?.date || null,
			sessions: [
				{
					name: 'Race',
					session_type: 'race',
					start_utc: race?.date || null,
					status: 'completed',
				},
			],
		}))
		.filter((race) => race.round > 0)
		.sort((a, b) => b.round - a.round);
}

function getPreferredSessionName(eventItem, preferredSession = '') {
	const sessions =
		Array.isArray(eventItem?.sessions) ? eventItem.sessions : [];
	if (!sessions.length) return preferredSession || '';

	const normalizedPreferred = String(preferredSession || '')
		.trim()
		.toLowerCase();
	if (normalizedPreferred) {
		const preferredMatch = sessions.find(
			(session) =>
				String(session?.name || '')
					.trim()
					.toLowerCase() === normalizedPreferred
		);
		if (preferredMatch?.name) return preferredMatch.name;
	}

	const raceSession = sessions.find((session) => {
		const byType = String(session?.session_type || '')
			.trim()
			.toLowerCase();
		const byName = String(session?.name || '')
			.trim()
			.toLowerCase();
		return byType === 'race' || byName === 'race';
	});
	if (raceSession?.name) return raceSession.name;

	return sessions[sessions.length - 1]?.name || preferredSession || '';
}

const TYRE_COMPOUND_META = {
	S: { label: 'Soft' },
	M: {
		label: 'Medium',
	},
	H: { label: 'Hard' },
	I: {
		label: 'Intermediate',
	},
	W: { label: 'Wet' },
};

function normalizeTyreCompound(rawCompound) {
	const value = String(rawCompound || '')
		.trim()
		.toUpperCase();

	if (!value) return null;
	if (TYRE_COMPOUND_META[value]) {
		return { code: value, ...TYRE_COMPOUND_META[value] };
	}

	if (value.includes('SOFT')) return { code: 'S', ...TYRE_COMPOUND_META.S };
	if (value.includes('MED')) return { code: 'M', ...TYRE_COMPOUND_META.M };
	if (value.includes('HARD')) return { code: 'H', ...TYRE_COMPOUND_META.H };
	if (value.includes('INTER')) return { code: 'I', ...TYRE_COMPOUND_META.I };
	if (value.includes('WET')) return { code: 'W', ...TYRE_COMPOUND_META.W };

	if (value === 'C3' || value === 'C4') {
		return { code: 'M', ...TYRE_COMPOUND_META.M };
	}
	if (value === 'C5') {
		return { code: 'S', ...TYRE_COMPOUND_META.S };
	}
	if (value === 'C1' || value === 'C2') {
		return { code: 'H', ...TYRE_COMPOUND_META.H };
	}

	return {
		code: value.slice(0, 1),
		label: rawCompound,
	};
}

function TelemetryPageSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			<div className="rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5">
				<div className="mb-4 h-5 w-48 rounded bg-white/10" />
				<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
					<div className="h-36 rounded-xl border border-white/10 bg-white/6" />
					<div className="h-36 rounded-xl border border-white/10 bg-white/6" />
					<div className="h-36 rounded-xl border border-white/10 bg-white/6" />
				</div>
			</div>
			<div className="rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5">
				<div className="mb-4 h-4 w-36 rounded bg-white/10" />
				<div className="space-y-3">
					<div className="h-20 rounded-xl border border-white/10 bg-white/6" />
					<div className="h-20 rounded-xl border border-white/10 bg-white/6" />
					<div className="h-20 rounded-xl border border-white/10 bg-white/6" />
				</div>
			</div>
		</div>
	);
}

function CustomSelect({
	value,
	onChange,
	options,
	disabled = false,
	placeholder = 'Select',
	renderOption,
	renderValue,
}) {
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef(null);

	const selectedOption =
		options.find((option) => String(option.value) === String(value)) || null;

	useEffect(() => {
		if (!open) return undefined;

		const onMouseDown = (event) => {
			if (!wrapperRef.current?.contains(event.target)) {
				setOpen(false);
			}
		};

		const onKeyDown = (event) => {
			if (event.key === 'Escape') {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	return (
		<div
			ref={wrapperRef}
			className={`relative ${disabled ? 'opacity-60' : ''}`}
		>
			<button
				type="button"
				onClick={() => {
					if (!disabled) setOpen((current) => !current);
				}}
				disabled={disabled}
				className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-left text-sm text-white outline-none transition hover:border-white/30 focus:border-red-500/50"
			>
				<div className="min-w-0 flex-1">
					{selectedOption ?
						renderValue ?
							renderValue(selectedOption)
						:	selectedOption.label
					:	placeholder}
				</div>
				<FaChevronDown
					className={`shrink-0 text-xs text-zinc-400 transition-transform ${
						open ? 'rotate-180' : ''
					}`}
				/>
			</button>

			{open && !disabled && (
				<div className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-white/15 bg-black/90 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
					{options.map((option) => {
						const isSelected =
							String(option.value) === String(selectedOption?.value || '');

						return (
							<button
								key={String(option.value)}
								type="button"
								onClick={() => {
									onChange(option.value);
									setOpen(false);
								}}
								className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
									isSelected ? 'bg-white/15' : 'hover:bg-white/10'
								}`}
							>
								{renderOption ?
									renderOption(option, { selected: isSelected })
								:	<span className="text-sm text-white">{option.label}</span>}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default function TelemetryPageClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated } = useAuth();
	const currentYear = new Date().getFullYear();
	const queryYear = Number(searchParams.get('year'));
	const queryRound = Number(searchParams.get('round'));
	const querySession = String(searchParams.get('session') || '').trim();
	const initialYear =
		Number.isFinite(queryYear) && queryYear >= 2018 ? queryYear : currentYear;
	const initialQueryRoundRef = useRef(
		Number.isFinite(queryRound) && queryRound > 0 ? queryRound : null
	);
	const initialQuerySessionRef = useRef(querySession);

	const [snapshot, setSnapshot] = useState(null);
	const [loading, setLoading] = useState(true);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [selectedYear, setSelectedYear] = useState(initialYear);
	const [historyEvents, setHistoryEvents] = useState([]);
	const [selectedRound, setSelectedRound] = useState(
		Number.isFinite(queryRound) && queryRound > 0 ? queryRound : null
	);
	const [selectedSession, setSelectedSession] = useState(querySession);
	const [selectedDriverCode, setSelectedDriverCode] = useState('');
	const [error, setError] = useState(null);
	const hasConsumedInitialQueryRef = useRef(false);
	const skipNextSessionFetchRef = useRef(false);

	const yearOptions = useMemo(
		() =>
			Array.from(
				{ length: currentYear - 2018 + 1 },
				(_, idx) => currentYear - idx
			),
		[currentYear]
	);

	useEffect(() => {
		let active = true;

		const hasQueryRound =
			Number.isFinite(initialQueryRoundRef.current) &&
			Number(initialQueryRoundRef.current) > 0;
		const useInitialQuerySnapshot =
			hasQueryRound && !hasConsumedInitialQueryRef.current;

		const snapshotPromise =
			useInitialQuerySnapshot ?
				getTelemetrySessionSnapshot({
					year: selectedYear,
					round: Number(initialQueryRoundRef.current),
					session: initialQuerySessionRef.current || undefined,
				})
			: 	getCurrentTelemetrySnapshot();

		Promise.all([
			snapshotPromise,
			getTelemetryHistoryEvents(selectedYear, 32).catch(() => []),
			getSchedule(selectedYear).catch(() => []),
		])
			.then(([snapshotData, historyData, scheduleData]) => {
				if (!active) return;

				const telemetryHistory = Array.isArray(historyData) ? historyData : [];
				const fallbackHistory = buildFallbackHistoryEvents(
					scheduleData,
					selectedYear
				);
				const history =
					telemetryHistory.length > 0 ? telemetryHistory : fallbackHistory;

				setSnapshot(snapshotData || null);
				setHistoryEvents(history);

				const initialRound =
					useInitialQuerySnapshot ?
						Number(initialQueryRoundRef.current)
					: 	null;
				const rounds = history;
				const matching = rounds.find(
					(event) => Number(event.round) === initialRound
				);
				const selectedEvent = matching || rounds[0] || null;
				if (selectedEvent) {
					setSelectedRound(Number(selectedEvent.round));
					const fallbackSession =
						(useInitialQuerySnapshot ? initialQuerySessionRef.current : '') ||
						getPreferredSessionName(
							selectedEvent,
							snapshotData?.session?.name || ''
						);
					setSelectedSession(fallbackSession);
				}

				if (useInitialQuerySnapshot) {
					skipNextSessionFetchRef.current = true;
				}

				const firstDriverCode =
					snapshotData?.lap_traces?.[0]?.driver_code || '';
				setSelectedDriverCode(firstDriverCode);
			})
			.catch((err) => {
				if (!active) return;
				setError(err?.message || 'Unable to load telemetry.');
			})
			.finally(() => {
				if (!active) return;
				hasConsumedInitialQueryRef.current = true;
				setLoading(false);
				setHistoryLoading(false);
			});

		return () => {
			active = false;
		};
	}, [selectedYear]);

	useEffect(() => {
		if (!selectedRound) return;
		if (skipNextSessionFetchRef.current) {
			skipNextSessionFetchRef.current = false;
			return;
		}
		let active = true;

		getTelemetrySessionSnapshot({
			year: selectedYear,
			round: selectedRound,
			session: selectedSession || undefined,
		})
			.then((data) => {
				if (!active || !data) return;
				setSnapshot(data);
				setError(null);
				setSelectedDriverCode((prev) => {
					const traces = Array.isArray(data?.lap_traces) ? data.lap_traces : [];
					if (!traces.length) return '';
					if (traces.some((trace) => trace.driver_code === prev)) return prev;
					return traces[0].driver_code || '';
				});
			})
			.catch((err) => {
				if (!active) return;
				setError(err?.message || 'Unable to load telemetry session.');
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [selectedYear, selectedRound, selectedSession]);

	useEffect(() => {
		if (!selectedRound) return;

		const nextYear = String(selectedYear);
		const nextRound = String(selectedRound);
		const nextSession = String(selectedSession || '');
		const currentYearParam = String(searchParams.get('year') || '');
		const currentRoundParam = String(searchParams.get('round') || '');
		const currentSessionParam = String(searchParams.get('session') || '');

		if (
			currentYearParam === nextYear &&
			currentRoundParam === nextRound &&
			currentSessionParam === nextSession
		) {
			return;
		}

		const nextParams = new URLSearchParams({
			year: nextYear,
			round: nextRound,
		});
		if (nextSession) {
			nextParams.set('session', nextSession);
		}

		router.replace(`/telemetry?${nextParams.toString()}`, { scroll: false });
	}, [router, searchParams, selectedYear, selectedRound, selectedSession]);

	const event = snapshot?.event;
	const session = snapshot?.session;
	const contextQuery = useMemo(() => buildContextQuery(snapshot), [snapshot]);
	const countryCode = getCountryCode(event?.country || '');
	const lapTraces = useMemo(
		() => (Array.isArray(snapshot?.lap_traces) ? snapshot.lap_traces : []),
		[snapshot]
	);
	const selectedDriverTrace = useMemo(
		() =>
			lapTraces.find((trace) => trace.driver_code === selectedDriverCode) ||
			lapTraces[0] ||
			null,
		[lapTraces, selectedDriverCode]
	);
	const selectedEvent = useMemo(
		() =>
			historyEvents.find(
				(item) => Number(item.round) === Number(selectedRound)
			) || null,
		[historyEvents, selectedRound]
	);
	const completedSessions = useMemo(
		() =>
			Array.isArray(selectedEvent?.sessions) ? selectedEvent.sessions : [],
		[selectedEvent]
	);

	const seasonOptions = useMemo(
		() =>
			yearOptions.map((year) => ({ value: String(year), label: String(year) })),
		[yearOptions]
	);

	const raceOptions = useMemo(
		() =>
			historyEvents.map((item) => ({
				value: String(item.round),
				label: `R${item.round} - ${item.event}`,
				round: item.round,
				event: item.event,
				country: item.country || 'Unknown',
				flagCode: getCountryCode(item.country || ''),
			})),
		[historyEvents]
	);

	const renderRaceOption = (option) => (
		<div className="flex items-center gap-2">
			{option.flagCode && (
				<div className="h-5 overflow-hidden rounded-sm border border-white/15 bg-black/25">
					<Image
						src={`/images/flags/${option.flagCode}.png`}
						alt={option.country}
						width={28}
						height={20}
						className="h-full w-auto object-cover"
					/>
				</div>
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-white">
					R{option.round} - {option.event}
				</p>
				<p className="truncate text-xs text-zinc-400">{option.country}</p>
			</div>
		</div>
	);

	const renderRaceValue = (option) => (
		<div className="flex items-center gap-2">
			{option.flagCode && (
				<div className="h-4 overflow-hidden rounded-sm border border-white/15 bg-black/25">
					<Image
						src={`/images/flags/${option.flagCode}.png`}
						alt={option.country}
						width={24}
						height={16}
						className="h-full w-auto object-cover"
					/>
				</div>
			)}
			<span className="truncate text-sm font-semibold text-white">
				R{option.round} - {option.event}
			</span>
		</div>
	);

	const sessionOptions = useMemo(
		() =>
			completedSessions.map((sessionItem) => ({
				value: sessionItem.name,
				label: sessionItem.name,
			})),
		[completedSessions]
	);

	const driverOptions = useMemo(
		() =>
			lapTraces.map((trace) => ({
				value: trace.driver_code || '',
				label: `${trace.driver_code} - ${trace.driver_name}`,
				driverCode: trace.driver_code,
				driverName: trace.driver_name,
				teamName: trace.team_name,
				driverImage: getTelemetryDriverImage(
					trace.driver_code,
					event?.year || selectedYear
				),
				teamLogo: getTeamLogoPath(trace.team_name),
			})),
		[lapTraces, event?.year, selectedYear]
	);

	const renderDriverOption = (option) => (
		<div className="flex items-center gap-2">
			<div className="relative h-9 w-9 overflow-hidden rounded-md bg-white/10">
				{option.driverImage && (
					<Image
						src={option.driverImage}
						alt={option.driverName}
						fill
						sizes="36px"
						className="object-cover object-top"
					/>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-white">
					{option.driverCode} - {option.driverName}
				</p>
				<p className="truncate text-xs text-zinc-400">{option.teamName}</p>
			</div>
			{option.teamLogo && (
				<div className="relative h-7 w-7 shrink-0 rounded-md bg-black/30 p-1">
					<Image
						src={option.teamLogo}
						alt={option.teamName}
						fill
						sizes="28px"
						className="object-contain"
					/>
				</div>
			)}
		</div>
	);

	const renderDriverValue = (option) => (
		<div className="flex items-center gap-2">
			<div className="relative h-8 w-8 overflow-hidden rounded-md bg-white/10">
				{option.driverImage && (
					<Image
						src={option.driverImage}
						alt={option.driverName}
						fill
						sizes="32px"
						className="object-cover object-top"
					/>
				)}
			</div>
			<span className="truncate text-sm font-semibold text-white">
				{option.driverCode} - {option.driverName}
			</span>
			{option.teamLogo && (
				<div className="relative h-6 w-6 shrink-0 rounded-md bg-black/30 p-1">
					<Image
						src={option.teamLogo}
						alt={option.teamName}
						fill
						sizes="24px"
						className="object-contain"
					/>
				</div>
			)}
		</div>
	);

	const trackHref =
		contextQuery ?
			`/track?${contextQuery}&autogen=true&source=telemetry`
		:	'/track';
	const predictHref =
		contextQuery ? `/predict?${contextQuery}&mode=replay` : '/predict';
	const strategyHref = contextQuery ? `/strategy?${contextQuery}` : '/strategy';

	const openProtectedRoute = (href, label) => {
		if (isAuthenticated) {
			router.push(href);
			return;
		}
		toast.error(`Please log in to access ${label}.`);
		router.push(`/login?next=${encodeURIComponent(href)}`);
	};

	return (
		<div className="min-h-screen bg-[#060607] px-4 pb-14 pt-28 text-white md:px-10">
			<div className="mx-auto max-w-7xl space-y-6">
				<header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_12%_18%,rgba(239,68,68,0.2),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(170deg,rgba(12,12,14,0.98),rgba(6,7,9,0.98))] p-6 md:p-8">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
						F1 Live Hub
					</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
						Race Control Telemetry
					</h1>

					<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
						<div>
							<label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400">
								Season
							</label>
							<CustomSelect
								value={String(selectedYear)}
								onChange={(nextValue) => {
									setLoading(true);
									setHistoryLoading(true);
									setSelectedRound(null);
									setSelectedSession('');
									setSelectedYear(Number(nextValue));
								}}
								options={seasonOptions}
								disabled={seasonOptions.length === 0}
							/>
						</div>
						<div>
							<label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400">
								Race
							</label>
							<CustomSelect
								value={selectedRound ? String(selectedRound) : ''}
								onChange={(nextValue) => {
									const round = Number(nextValue);
									const nextEvent = historyEvents.find(
										(item) => Number(item.round) === round
									);
									setLoading(true);
									setSelectedRound(round);
									setSelectedSession(getPreferredSessionName(nextEvent));
								}}
								options={raceOptions}
								disabled={historyLoading || raceOptions.length === 0}
								placeholder="Select Race"
								renderOption={renderRaceOption}
								renderValue={renderRaceValue}
							/>
						</div>
						<div>
							<label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400">
								Session
							</label>
							<CustomSelect
								value={selectedSession}
								onChange={(nextValue) => {
									setLoading(true);
									setSelectedSession(String(nextValue));
								}}
								options={sessionOptions}
								disabled={sessionOptions.length === 0}
								placeholder="Select Session"
							/>
						</div>
					</div>

					{loading ?
						<div className="mt-4 animate-pulse space-y-2">
							<div className="h-4 w-56 rounded bg-white/10" />
							<div className="h-4 w-72 rounded bg-white/10" />
						</div>
					: error ?
						<p className="mt-3 text-sm text-red-300">{error}</p>
					:	<div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
							{event?.event && (
								<span className="font-semibold text-white">{event.event}</span>
							)}
							<span className="text-zinc-500">|</span>
							{event?.country && (
								<span className="inline-flex items-center gap-2">
									{countryCode && (
										<Image
											src={`/images/flags/${countryCode}.png`}
											alt={event.country}
											width={24}
											height={16}
											className="h-4 w-6 rounded-xs border border-white/10 object-cover"
										/>
									)}
									<FaMapMarkerAlt className="text-zinc-500" />
									{event.country}
								</span>
							)}
							<span className="text-zinc-500">|</span>
							<span className="font-semibold text-red-200">
								{session?.name}
							</span>
						</div>
					}

					<div className="mt-5 flex flex-col items-end gap-2">
						<p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-500">
							Action Rail
						</p>
						<div className="flex flex-wrap justify-end gap-3">
							<button
								type="button"
								onClick={() => openProtectedRoute(trackHref, 'Track')}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
							>
								<FaProjectDiagram />
								Go To Track Visualization
							</button>
							<button
								type="button"
								onClick={() => openProtectedRoute(predictHref, 'Predict')}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
							>
								<FaChartLine />
								Simulate Lap Times
							</button>
							<button
								type="button"
								onClick={() => openProtectedRoute(strategyHref, 'Strategy')}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
							>
								<FaChartLine />
								Pit Strategy
							</button>
						</div>
					</div>
				</header>

				{loading && <TelemetryPageSkeleton />}

				{!loading && !error && (
					<>
						<DriverBandsPagination
							bands={snapshot?.driver_bands}
							sessionType={session?.session_type || 'race'}
							seasonYear={event?.year || selectedYear}
						/>

						<div className="rounded-2xl border border-white/10 bg-black/40 p-4 md:p-5">
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
									Driver Lap Times
								</p>
								<div className="inline-flex items-center gap-2 rounded-full border border-red-300/25 bg-red-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-red-200">
									<FaStopwatch className="text-[10px]" />
									FastF1 Lap Feed
								</div>
							</div>

							{lapTraces.length > 0 ?
								<>
									<div className="mb-3">
										<CustomSelect
											value={selectedDriverTrace?.driver_code || ''}
											onChange={(nextValue) =>
												setSelectedDriverCode(String(nextValue))
											}
											options={driverOptions}
											disabled={driverOptions.length === 0}
											placeholder="Choose Driver"
											renderOption={renderDriverOption}
											renderValue={renderDriverValue}
										/>
									</div>

									<div className="relative overflow-hidden rounded-xl border border-red-500/25 bg-black">
										<div
											className="pointer-events-none absolute inset-0"
											style={{
												backgroundImage:
													'radial-gradient(120% 95% at -6% 118%, rgba(220,38,38,0.26), transparent 58%),radial-gradient(105% 72% at 108% -12%, rgba(153,27,27,0.22), transparent 62%),linear-gradient(180deg, rgba(0,0,0,0.94), rgba(0,0,0,0.98))',
											}}
										/>
										<div className="pointer-events-none absolute -left-24 top-6 h-24 w-[72%] rounded-[999px] bg-red-500/20 blur-2xl rotate-14" />
										<div className="pointer-events-none absolute left-[16%] top-[44%] h-20 w-[70%] rounded-[999px] bg-red-700/18 blur-2xl -rotate-10" />
										<div className="pointer-events-none absolute -right-20 bottom-4 h-24 w-[64%] rounded-[999px] bg-red-400/16 blur-[44px] rotate-16" />
										<table className="relative z-10 min-w-full text-sm">
											<thead className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
												<tr>
													<th className="px-3 py-2 text-left">Lap</th>
													<th className="px-3 py-2 text-left">Lap Time</th>
													<th className="px-1.5 py-2 text-left">S1</th>
													<th className="px-1.5 py-2 text-left">S2</th>
													<th className="px-1.5 py-2 text-left">S3</th>
													<th className="px-3 py-2 text-left">Compound</th>
													<th className="px-3 py-2 text-left">Stint</th>
												</tr>
											</thead>
											<tbody>
												{(selectedDriverTrace?.laps || []).map((lap) => {
													const tyre = normalizeTyreCompound(lap.compound);
													return (
														<tr
															key={`${selectedDriverTrace.driver_code}_${lap.lap}`}
															className="border-t border-white/8 text-zinc-100"
														>
															<td className="px-3 py-2 font-semibold">
																{lap.lap}
															</td>
															<td className="px-3 py-2 tabular-nums">
																{lap.lap_time || '-'}
															</td>
															<td className="px-1 py-2 tabular-nums text-zinc-200">
																<span className="inline-flex min-w-[106px] justify-center rounded-lg bg-red-500/12 px-3.5 py-1.5">
																	{lap.sector1 || '-'}
																</span>
															</td>
															<td className="px-1 py-2 tabular-nums text-zinc-200">
																<span className="inline-flex min-w-[106px] justify-center rounded-lg bg-red-500/12 px-3.5 py-1.5">
																	{lap.sector2 || '-'}
																</span>
															</td>
															<td className="px-1 py-2 tabular-nums text-zinc-200">
																<span className="inline-flex min-w-[106px] justify-center rounded-lg bg-red-500/12 px-3.5 py-1.5">
																	{lap.sector3 || '-'}
																</span>
															</td>
															<td className="px-3 py-2">
																{tyre ?
																	<div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-100">
																		<TyreIcon
																			compound={tyre.label}
																			className="h-5 w-5"
																		/>
																		<span>{tyre.label}</span>
																	</div>
																:	'-'}
															</td>
															<td className="px-3 py-2 text-zinc-300">
																{lap.stint ? `Stint ${lap.stint}` : '-'}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</>
							:	<p className="text-sm text-zinc-400">
									No lap trace is available for this selection.
								</p>
							}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
