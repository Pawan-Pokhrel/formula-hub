'use client';

import { getSessionData, getTrackSessions } from '@/lib/api/trackApi';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaFlagCheckered, FaPause, FaPlay, FaRedo } from 'react-icons/fa';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format seconds → "MM:SS" */
function formatTime(sec) {
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Binary-search the lap_starts array for the current lap number. */
function getCurrentLap(lapStarts, timeSec) {
	if (!lapStarts || lapStarts.length === 0) return 0;
	let lo = 0,
		hi = lapStarts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (lapStarts[mid] <= timeSec) lo = mid;
		else hi = mid - 1;
	}
	return Math.max(1, lo);
}

/* ------------------------------------------------------------------ */
/*  Canvas drawing helpers                                              */
/* ------------------------------------------------------------------ */

/** Draw the track outline. */
function drawTrack(ctx, w, h, trackX, trackY) {
	if (trackX.length < 2) return;

	ctx.beginPath();
	ctx.moveTo(trackX[0] * w, trackY[0] * h);
	for (let i = 1; i < trackX.length; i++) {
		ctx.lineTo(trackX[i] * w, trackY[i] * h);
	}
	ctx.closePath();

	// Wide dark road surface
	ctx.strokeStyle = '#1a1a1a';
	ctx.lineWidth = 18;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke();

	// Lighter track edge
	ctx.strokeStyle = '#2a2a2a';
	ctx.lineWidth = 14;
	ctx.stroke();

	// Thin white center-line
	ctx.strokeStyle = 'rgba(255,255,255,0.06)';
	ctx.lineWidth = 1;
	ctx.setLineDash([6, 8]);
	ctx.stroke();
	ctx.setLineDash([]);

	// Start / finish marker
	const sx = trackX[0] * w;
	const sy = trackY[0] * h;
	ctx.save();
	ctx.fillStyle = '#dc2626';
	ctx.shadowColor = '#dc2626';
	ctx.shadowBlur = 10;
	ctx.fillRect(sx - 2, sy - 16, 4, 32);
	ctx.restore();
}

/** Draw all drivers at the interpolated position for time t. */
function drawDrivers(ctx, w, h, data, t) {
	const sr = data.info.sample_rate || 1;
	const drivers = data.drivers;
	const positions = data.positions;

	for (const [abbr, info] of Object.entries(drivers)) {
		const pos = positions[abbr];
		if (!pos || !pos.x || pos.x.length < 2) continue;

		const idx = t * sr;
		const i = Math.floor(idx);
		const frac = idx - i;

		// Out of data (DNF / session ended for this driver)
		if (i >= pos.x.length - 1) continue;

		// Linear interpolation between 1 Hz samples
		const px = (pos.x[i] + (pos.x[i + 1] - pos.x[i]) * frac) * w;
		const py = (pos.y[i] + (pos.y[i + 1] - pos.y[i]) * frac) * h;

		const color = info.color || '#ffffff';

		// ── Glow + dot ──
		ctx.save();
		ctx.shadowColor = color;
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(px, py, 5, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.restore();

		// White border ring
		ctx.beginPath();
		ctx.arc(px, py, 5, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(255,255,255,0.5)';
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// ── F1-TV style label pill ──
		ctx.font = 'bold 9px Inter, system-ui, sans-serif';
		const tw = ctx.measureText(abbr).width;
		const pillW = tw + 10;
		const pillH = 15;
		const pillX = px - pillW / 2;
		const pillY = py - 22;

		ctx.fillStyle = color;
		ctx.beginPath();
		if (ctx.roundRect) {
			ctx.roundRect(pillX, pillY, pillW, pillH, 3);
		} else {
			ctx.rect(pillX, pillY, pillW, pillH);
		}
		ctx.fill();

		// Pill border for legibility on bright backgrounds
		ctx.strokeStyle = 'rgba(0,0,0,0.3)';
		ctx.lineWidth = 0.5;
		ctx.stroke();

		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(abbr, px, pillY + pillH / 2);
	}
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function TrackPage() {
	// ── state ──
	const [sessions, setSessions] = useState([]);
	const [selectedKey, setSelectedKey] = useState('');
	const [sessionData, setSessionData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadedKey, setLoadedKey] = useState('');
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(5);
	const [displayTime, setDisplayTime] = useState(0);

	// ── refs (mutable values for the rAF loop) ──
	const canvasRef = useRef(null);
	const animRef = useRef(null);
	const timeRef = useRef(0);
	const playRef = useRef(false);
	const speedRef = useRef(5);
	const dataRef = useRef(null);
	const lastUiRef = useRef(0);

	// keep refs in sync with state
	useEffect(() => {
		playRef.current = isPlaying;
	}, [isPlaying]);
	useEffect(() => {
		speedRef.current = speed;
	}, [speed]);
	useEffect(() => {
		dataRef.current = sessionData;
	}, [sessionData]);

	/* ── fetch sessions on mount ── */
	useEffect(() => {
		getTrackSessions()
			.then((list) => {
				setSessions(list);
				if (list.length > 0) {
					setSelectedKey(`${list[0].year}_${list[0].round}`);
				}
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	/* ── fetch session data when selection changes ── */
	useEffect(() => {
		if (!selectedKey) return;
		const [year, round] = selectedKey.split('_').map(Number);

		let cancelled = false;
		getSessionData(year, round)
			.then((data) => {
				if (!cancelled) {
					setSessionData(data);
					setLoadedKey(selectedKey);
				}
			})
			.catch(console.error);

		return () => {
			cancelled = true;
		};
	}, [selectedKey]);

	/* ── Canvas animation loop ── */
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !sessionData) return;

		const ctx = canvas.getContext('2d');
		let prevTs = null;

		const frame = (ts) => {
			if (prevTs === null) prevTs = ts;
			const delta = (ts - prevTs) / 1000;
			prevTs = ts;

			const d = dataRef.current;
			if (!d) {
				animRef.current = requestAnimationFrame(frame);
				return;
			}

			// ── advance clock ──
			if (playRef.current) {
				timeRef.current += delta * speedRef.current;
				if (timeRef.current >= d.info.duration_sec) {
					timeRef.current = d.info.duration_sec;
					setIsPlaying(false);
				}
			}

			// ── throttled UI update (4 Hz) ──
			const now = performance.now();
			if (now - lastUiRef.current > 250) {
				lastUiRef.current = now;
				setDisplayTime(timeRef.current);
			}

			// ── size canvas for HiDPI ──
			const dpr = window.devicePixelRatio || 1;
			const cw = canvas.clientWidth;
			const ch = canvas.clientHeight;
			if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
				canvas.width = cw * dpr;
				canvas.height = ch * dpr;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			}

			// ── draw ──
			ctx.clearRect(0, 0, cw, ch);

			// Background
			ctx.fillStyle = '#0a0a0a';
			ctx.fillRect(0, 0, cw, ch);

			drawTrack(ctx, cw, ch, d.track.x, d.track.y);
			drawDrivers(ctx, cw, ch, d, timeRef.current);

			animRef.current = requestAnimationFrame(frame);
		};

		animRef.current = requestAnimationFrame(frame);
		return () => {
			if (animRef.current) cancelAnimationFrame(animRef.current);
		};
	}, [sessionData]);

	/* ── Keyboard shortcuts ── */
	useEffect(() => {
		const onKey = (e) => {
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
			if (e.code === 'Space') {
				e.preventDefault();
				setIsPlaying((p) => !p);
			}
			if (e.code === 'ArrowRight') {
				timeRef.current = Math.min(
					timeRef.current + 5,
					dataRef.current?.info?.duration_sec ?? Infinity
				);
				setDisplayTime(timeRef.current);
			}
			if (e.code === 'ArrowLeft') {
				timeRef.current = Math.max(0, timeRef.current - 5);
				setDisplayTime(timeRef.current);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	/* ── handlers ── */
	const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

	const handleSeek = useCallback((e) => {
		const t = parseFloat(e.target.value);
		timeRef.current = t;
		setDisplayTime(t);
	}, []);

	const handleRestart = useCallback(() => {
		timeRef.current = 0;
		setDisplayTime(0);
		setIsPlaying(true);
	}, []);

	const handleSessionChange = useCallback((key) => {
		setSelectedKey(key);
		setIsPlaying(false);
		timeRef.current = 0;
		setDisplayTime(0);
	}, []);

	/* ── derived values ── */
	const lapNum =
		sessionData ? getCurrentLap(sessionData.lap_starts, displayTime) : 0;
	const totalLaps = sessionData?.info?.total_laps ?? 0;
	const maxTime = sessionData?.info?.duration_sec ?? 0;
	const SPEEDS = [1, 2, 5, 10, 20, 50];
	const dataLoading = !!selectedKey && selectedKey !== loadedKey;

	/* ── render ── */
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />

			<div className="relative z-10 max-w-7xl mx-auto pb-12">
				{/* ────── Header ────── */}
				<div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
					<h1 className="text-4xl font-bold uppercase tracking-wider flex items-center gap-4 animate-fade-in">
						<FaFlagCheckered className="text-red-600" />
						Live Track
					</h1>

					{sessions.length > 0 && (
						<div>
							<select
								value={selectedKey}
								onChange={(e) => handleSessionChange(e.target.value)}
								className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-red-600 transition-colors"
							>
								{sessions.map((s) => (
									<option
										key={`${s.year}_${s.round}`}
										value={`${s.year}_${s.round}`}
										className="bg-black text-white"
									>
										{s.event} ({s.year})
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{/* ────── Content ────── */}
				{loading || dataLoading ?
					<div className="flex justify-center items-center h-96">
						<div className="text-center">
							<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mx-auto mb-4" />
							<p className="text-gray-400">
								{dataLoading ? 'Loading track data…' : 'Loading sessions…'}
							</p>
						</div>
					</div>
				: sessionData ?
					<div className="animate-fade-in">
						{/* Session info banner */}
						<div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 px-6 py-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
							<div className="flex flex-wrap items-center gap-x-6 gap-y-1">
								<span className="font-bold text-white">
									{sessionData.info.event}
								</span>
								<span className="text-gray-400">
									{sessionData.info.circuit}
								</span>
								<span className="text-gray-500">
									{sessionData.info.country}
								</span>
							</div>
							<div className="flex items-center gap-4 text-gray-400">
								<span>{totalLaps} Laps</span>
								<span>{sessionData.info.date}</span>
							</div>
						</div>

						{/* ── Grid: Canvas + Legend ── */}
						<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
							{/* Canvas column (3 / 4) */}
							<div className="lg:col-span-3 space-y-4">
								{/* Track canvas card */}
								<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl">
									<div className="aspect-4/3 w-full">
										<canvas
											ref={canvasRef}
											className="w-full h-full rounded-xl"
										/>
									</div>
								</div>

								{/* Playback controls */}
								<div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
									<div className="flex items-center gap-3 md:gap-4 flex-wrap">
										{/* Play / Pause */}
										<button
											onClick={togglePlay}
											className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition-colors shrink-0"
											aria-label={isPlaying ? 'Pause' : 'Play'}
										>
											{isPlaying ?
												<FaPause className="text-sm" />
											:	<FaPlay className="text-sm ml-0.5" />}
										</button>

										{/* Restart */}
										<button
											onClick={handleRestart}
											className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
											aria-label="Restart"
										>
											<FaRedo className="text-xs" />
										</button>

										{/* Lap counter */}
										<div className="text-sm whitespace-nowrap">
											<span className="text-gray-400">Lap </span>
											<span className="text-white font-bold">{lapNum}</span>
											<span className="text-gray-500">/{totalLaps}</span>
										</div>

										{/* Timeline */}
										<input
											type="range"
											min={0}
											max={maxTime}
											step={0.5}
											value={displayTime}
											onChange={handleSeek}
											className="flex-1 min-w-[100px] h-1.5 accent-red-600 cursor-pointer"
										/>

										{/* Current time / total */}
										<span className="text-sm text-gray-300 font-mono whitespace-nowrap">
											{formatTime(displayTime)}{' '}
											<span className="text-gray-600">
												/ {formatTime(maxTime)}
											</span>
										</span>

										{/* Speed selector */}
										<select
											value={speed}
											onChange={(e) => setSpeed(Number(e.target.value))}
											className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-red-600"
										>
											{SPEEDS.map((s) => (
												<option
													key={s}
													value={s}
													className="bg-black"
												>
													{s}×
												</option>
											))}
										</select>
									</div>

									<p className="mt-2 text-[11px] text-gray-600 select-none">
										Space: play / pause &nbsp;·&nbsp; ← → : ±5 s
									</p>
								</div>
							</div>

							{/* Driver legend (1 / 4) */}
							<div className="lg:col-span-1">
								<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl sticky top-28">
									<h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
										Drivers
									</h3>
									<div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
										{Object.entries(sessionData.drivers)
											.sort(([, a], [, b]) => a.number - b.number)
											.map(([abbr, info]) => (
												<div
													key={abbr}
													className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
												>
													<span
														className="w-3 h-3 rounded-full shrink-0"
														style={{
															backgroundColor: info.color,
															boxShadow: `0 0 6px ${info.color}50`,
														}}
													/>
													<span className="text-sm font-bold text-white leading-none">
														{abbr}
													</span>
													<span className="text-[11px] text-gray-500 truncate leading-none">
														{info.team}
													</span>
												</div>
											))}
									</div>
								</div>
							</div>
						</div>
					</div>
				:	/* ── empty state ── */
					<div className="flex flex-col items-center justify-center h-96 text-center">
						<FaFlagCheckered className="text-6xl text-gray-700 mb-6" />
						<h2 className="text-2xl font-bold text-gray-400 mb-2">
							No Track Data Available
						</h2>
						<p className="text-gray-500 max-w-md">
							Run the <strong>track_data_preparation</strong> notebook in Google
							Colab, then place the generated JSON files in the backend&apos;s{' '}
							<code className="text-gray-400">track_data/</code> directory.
						</p>
					</div>
				}
			</div>
		</div>
	);
}
