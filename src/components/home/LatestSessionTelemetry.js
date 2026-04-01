'use client';

import {
	getCountryCode,
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import { getCurrentTelemetrySnapshot } from '@/lib/api/scheduleApi';
import { useAuth } from '@/providers/AuthProvider';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
	FaBroadcastTower,
	FaChartLine,
	FaMapMarkerAlt,
	FaPlay,
	FaProjectDiagram,
} from 'react-icons/fa';

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

export default function LatestSessionTelemetry() {
	const router = useRouter();
	const { isAuthenticated } = useAuth();

	const [snapshot, setSnapshot] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let active = true;

		getCurrentTelemetrySnapshot()
			.then((data) => {
				if (!active) return;
				setSnapshot(data);
			})
			.catch((err) => {
				if (!active) return;
				setError(err?.message || 'Telemetry is temporarily unavailable.');
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	const contextQuery = useMemo(() => buildContextQuery(snapshot), [snapshot]);
	const event = snapshot?.event;
	const session = snapshot?.session;
	const podium = snapshot?.podium || [];
	const countryCode = getCountryCode(event?.country || '');

	const telemetryHref =
		contextQuery ? `/telemetry?${contextQuery}` : '/telemetry';
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
		<section className="relative px-6 py-20 md:px-10 lg:px-16">
			<div className="mx-auto max-w-6xl rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(245,158,11,0.18),transparent_36%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(165deg,rgba(10,10,12,0.96),rgba(5,6,8,0.98))] p-6 md:p-8 lg:p-10">
				<div className="mb-7 flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
							Live Telemetry Flow
						</p>
						<h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
							Latest Session Command View
						</h2>
					</div>
					<span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
						<FaBroadcastTower />
						{snapshot?.source_label}
					</span>
				</div>

				{loading && (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{[1, 2, 3].map((idx) => (
							<div
								key={idx}
								className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/5"
							/>
						))}
					</div>
				)}

				{!loading && (error || !event || podium.length === 0) && (
					<div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
						{error ||
							'No completed telemetry session is available yet. Check back after the next session completes.'}
					</div>
				)}

				{!loading && !error && event && podium.length > 0 && (
					<>
						<div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-200">
							<span className="font-semibold text-white">{event.event}</span>
							<span className="text-zinc-500">|</span>
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
							<span className="text-zinc-500">|</span>
							<span className="font-semibold text-amber-200">
								{session?.name}
							</span>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							{podium.map((row) => {
								const driverImage = getDriverImagePath(row.driver_code);
								const teamLogo = getTeamLogoPath(row.team_name);
								const accent = row.team_color || '#6B7280';
								return (
									<div
										key={`${row.position}_${row.driver_code || row.driver_name}`}
										className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/45 p-4"
									>
										<div
											className="absolute left-0 top-0 h-full w-1"
											style={{ backgroundColor: accent }}
										/>
										<div className="mb-4 flex items-center justify-between">
											<span className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-xs font-bold tracking-wider text-white">
												P{row.position}
											</span>
											{teamLogo && (
												<Image
													src={teamLogo}
													alt={row.team_name}
													width={24}
													height={24}
													className="h-6 w-6 rounded-full bg-white/10 p-1"
												/>
											)}
										</div>
										<div className="flex items-center gap-3">
											<div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-white/8">
												{driverImage ?
													<Image
														src={driverImage}
														alt={row.driver_name}
														fill
														sizes="56px"
														className="object-cover"
													/>
												:	null}
											</div>
											<div>
												<p className="text-sm font-semibold text-zinc-300">
													{row.driver_code || row.driver_name}
												</p>
												<p className="text-lg font-extrabold text-white">
													{row.driver_name}
												</p>
												<p className="text-xs text-zinc-400">{row.team_name}</p>
											</div>
										</div>
										<p className="mt-3 text-xs font-medium text-zinc-400">
											{row.time ||
												row.best_lap ||
												row.q3 ||
												row.gap_to_pole ||
												'Result recorded'}
										</p>
									</div>
								);
							})}
						</div>

						<div className="mt-7 flex flex-wrap gap-3">
							<Link
								href={telemetryHref}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-zinc-200"
							>
								View All Drivers
							</Link>
							<button
								type="button"
								onClick={() => openProtectedRoute(trackHref, 'Track')}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
							>
								<FaProjectDiagram />
								Visualize
							</button>
							<button
								type="button"
								onClick={() => openProtectedRoute(predictHref, 'Predict')}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
							>
								<FaPlay />
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
					</>
				)}
			</div>
		</section>
	);
}
