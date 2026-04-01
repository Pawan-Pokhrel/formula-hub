'use client';

import { getCountryCode } from '@/components/schedule/scheduleHelpers';
import {
	getCurrentTelemetrySnapshot,
	getSchedule,
	getTelemetryHistoryEvents,
	getTelemetrySessionSnapshot,
} from '@/lib/api/scheduleApi';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
	FaBroadcastTower,
	FaChartLine,
	FaMapMarkerAlt,
	FaProjectDiagram,
	FaStopwatch,
} from 'react-icons/fa';
import DriverBandsPagination from './DriverBandsPagination';
import PodiumTop3 from './PodiumTop3';

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

export default function TelemetryPageClient() {
	const router = useRouter();
	const { isAuthenticated } = useAuth();
	const currentYear = new Date().getFullYear();

	const [snapshot, setSnapshot] = useState(null);
	const [loading, setLoading] = useState(true);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [selectedYear, setSelectedYear] = useState(currentYear);
	const [historyEvents, setHistoryEvents] = useState([]);
	const [selectedRound, setSelectedRound] = useState(null);
	const [selectedSession, setSelectedSession] = useState('');
	const [selectedDriverCode, setSelectedDriverCode] = useState('');
	const [error, setError] = useState(null);

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

		Promise.all([
			getCurrentTelemetrySnapshot(),
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

				const initialRound = Number(snapshotData?.event?.round || 0);
				const rounds = history;
				const matching = rounds.find(
					(event) => Number(event.round) === initialRound
				);
				const selectedEvent = matching || rounds[0] || null;
				if (selectedEvent) {
					setSelectedRound(Number(selectedEvent.round));
					const fallbackSession =
						snapshotData?.session?.name ||
						selectedEvent.sessions?.[selectedEvent.sessions.length - 1]?.name ||
						'';
					setSelectedSession(fallbackSession);
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
				setLoading(false);
				setHistoryLoading(false);
			});

		return () => {
			active = false;
		};
	}, [selectedYear]);

	useEffect(() => {
		if (!selectedRound) return;
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
			<div className="mx-auto max-w-6xl space-y-6">
				<header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_12%_18%,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(255,255,255,0.07),transparent_30%),linear-gradient(170deg,rgba(12,12,14,0.98),rgba(6,7,9,0.98))] p-6 md:p-8">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
						Telemetry Center
					</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
						Session Command Board
					</h1>

					<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
						<div>
							<label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400">
								Season
							</label>
							<select
								value={selectedYear}
								onChange={(eventValue) => {
									setLoading(true);
									setHistoryLoading(true);
									setSelectedYear(Number(eventValue.target.value));
								}}
								className="w-full cursor-pointer rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/45"
							>
								{yearOptions.map((year) => (
									<option
										key={year}
										value={year}
									>
										{year}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400">
								Race
							</label>
							<select
								value={selectedRound || ''}
								onChange={(eventValue) => {
									const round = Number(eventValue.target.value);
									const nextEvent = historyEvents.find(
										(item) => Number(item.round) === round
									);
									setLoading(true);
									setSelectedRound(round);
									setSelectedSession(
										nextEvent?.sessions?.[nextEvent.sessions.length - 1]
											?.name || ''
									);
								}}
								className="w-full cursor-pointer rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/45"
								disabled={historyLoading || historyEvents.length === 0}
							>
								{historyEvents.map((item) => (
									<option
										key={`${item.year}_${item.round}`}
										value={item.round}
									>
										R{item.round} - {item.event}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400">
								Session
							</label>
							<select
								value={selectedSession}
								onChange={(eventValue) => {
									setLoading(true);
									setSelectedSession(eventValue.target.value);
								}}
								className="w-full cursor-pointer rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/45"
								disabled={completedSessions.length === 0}
							>
								{completedSessions.map((sessionItem) => (
									<option
										key={`${sessionItem.name}_${sessionItem.start_utc}`}
										value={sessionItem.name}
									>
										{sessionItem.name}
									</option>
								))}
							</select>
						</div>
					</div>

					{loading ?
						<p className="mt-3 text-sm text-zinc-400">
							Loading telemetry data...
						</p>
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
							<span className="font-semibold text-amber-200">
								{session?.name}
							</span>
							<span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
								<FaBroadcastTower className="text-[10px]" />
								{snapshot?.source_label}
							</span>
						</div>
					}
				</header>

				{!loading && !error && (
					<>
						<PodiumTop3 rows={snapshot?.podium || []} />
						<DriverBandsPagination bands={snapshot?.driver_bands} />
						<div className="rounded-2xl border border-white/10 bg-black/40 p-4 md:p-5">
							<p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
								Action Rail
							</p>
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={() => openProtectedRoute(trackHref, 'Track')}
									className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
								>
									<FaProjectDiagram />
									Visualize On Track
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

						<div className="rounded-2xl border border-white/10 bg-black/40 p-4 md:p-5">
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
									Driver Lap Times
								</p>
								<div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-amber-200">
									<FaStopwatch className="text-[10px]" />
									FastF1 Lap Feed
								</div>
							</div>

							{lapTraces.length > 0 ?
								<>
									<div className="mb-3">
										<select
											value={selectedDriverTrace?.driver_code || ''}
											onChange={(eventValue) =>
												setSelectedDriverCode(eventValue.target.value)
											}
											className="w-full cursor-pointer rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/45"
										>
											{lapTraces.map((trace) => (
												<option
													key={trace.driver_code}
													value={trace.driver_code}
												>
													{trace.driver_code} - {trace.driver_name}
												</option>
											))}
										</select>
									</div>

									<div className="overflow-x-auto rounded-xl border border-white/10 bg-black/45">
										<table className="min-w-full text-sm">
											<thead className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
												<tr>
													<th className="px-3 py-2 text-left">Lap</th>
													<th className="px-3 py-2 text-left">Lap Time</th>
													<th className="px-3 py-2 text-left">S1</th>
													<th className="px-3 py-2 text-left">S2</th>
													<th className="px-3 py-2 text-left">S3</th>
													<th className="px-3 py-2 text-left">Compound</th>
													<th className="px-3 py-2 text-left">Stint</th>
												</tr>
											</thead>
											<tbody>
												{(selectedDriverTrace?.laps || []).map((lap) => (
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
														<td className="px-3 py-2 tabular-nums text-zinc-300">
															{lap.sector1 || '-'}
														</td>
														<td className="px-3 py-2 tabular-nums text-zinc-300">
															{lap.sector2 || '-'}
														</td>
														<td className="px-3 py-2 tabular-nums text-zinc-300">
															{lap.sector3 || '-'}
														</td>
														<td className="px-3 py-2">{lap.compound || '-'}</td>
														<td className="px-3 py-2">{lap.stint || '-'}</td>
													</tr>
												))}
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
