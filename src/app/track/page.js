'use client';

import { getSessionData, getTrackSessions } from '@/lib/api/trackApi';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	FaChevronLeft,
	FaChevronRight,
	FaCrown,
	FaFlagCheckered,
	FaPause,
	FaPlay,
	FaRedo,
} from 'react-icons/fa';

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

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

/* ================================================================== */
/*  Track-position computation (precomputed once on data load)         */
/* ================================================================== */

/** Cumulative arc-length [0…1] along the track outline. */
function buildTrackArcLength(trackX, trackY) {
	const n = trackX.length;
	const cum = new Float32Array(n);
	for (let i = 1; i < n; i++) {
		const dx = trackX[i] - trackX[i - 1];
		const dy = trackY[i] - trackY[i - 1];
		cum[i] = cum[i - 1] + Math.sqrt(dx * dx + dy * dy);
	}
	const total = cum[n - 1] || 1;
	for (let i = 0; i < n; i++) cum[i] /= total;
	return cum;
}

/** Nearest-point track parameter (0–1) with strided search. */
function getTrackParameter(px, py, trackX, trackY, arcLen, stride = 3) {
	let minDist = Infinity;
	let best = 0;
	for (let i = 0; i < trackX.length; i += stride) {
		const dx = px - trackX[i];
		const dy = py - trackY[i];
		const d = dx * dx + dy * dy;
		if (d < minDist) {
			minDist = d;
			best = arcLen[i];
		}
	}
	return best;
}

/**
 * Pre-compute race-position boards at every 1 Hz sample.
 * Returns boards[sampleIdx] = [{abbr, position, laps, active}, …]
 */
function precomputeRacePositions(data) {
	const { track, drivers, positions, info } = data;
	const trackX = track.x;
	const trackY = track.y;
	const arcLen = buildTrackArcLength(trackX, trackY);

	const maxSamples = Math.max(
		...Object.values(positions).map((p) => p.x?.length || 0),
		1
	);

	const state = {};
	for (const abbr of Object.keys(drivers)) {
		state[abbr] = { laps: 0, prevParam: -1 };
	}

	const boards = new Array(maxSamples);

	for (let s = 0; s < maxSamples; s++) {
		const board = [];
		for (const abbr of Object.keys(drivers)) {
			const pos = positions[abbr];
			if (!pos?.x || s >= pos.x.length) {
				board.push({
					abbr,
					laps: state[abbr].laps,
					param: 0,
					score: -1,
					active: false,
				});
				continue;
			}
			const param = getTrackParameter(
				pos.x[s],
				pos.y[s],
				trackX,
				trackY,
				arcLen
			);
			const st = state[abbr];
			if (st.prevParam > 0.75 && param < 0.25 && s > 0) st.laps++;
			st.prevParam = param;
			board.push({
				abbr,
				laps: st.laps,
				param,
				score: st.laps + param,
				active: true,
			});
		}

		board.sort((a, b) => {
			if (!a.active && !b.active) return 0;
			if (!a.active) return 1;
			if (!b.active) return -1;
			return b.score - a.score;
		});
		board.forEach((e, i) => {
			e.position = i + 1;
		});
		boards[s] = board;
	}
	return boards;
}

/* ================================================================== */
/*  Canvas drawing helpers                                              */
/* ================================================================== */

function drawTrack(ctx, w, h, trackX, trackY) {
	if (trackX.length < 2) return;

	ctx.beginPath();
	ctx.moveTo(trackX[0] * w, trackY[0] * h);
	for (let i = 1; i < trackX.length; i++)
		ctx.lineTo(trackX[i] * w, trackY[i] * h);
	ctx.closePath();

	ctx.strokeStyle = '#1a1a1a';
	ctx.lineWidth = 18;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke();

	ctx.strokeStyle = '#2a2a2a';
	ctx.lineWidth = 14;
	ctx.stroke();

	ctx.strokeStyle = 'rgba(255,255,255,0.06)';
	ctx.lineWidth = 1;
	ctx.setLineDash([6, 8]);
	ctx.stroke();
	ctx.setLineDash([]);

	// Start / finish line
	const sx = trackX[0] * w;
	const sy = trackY[0] * h;
	ctx.save();
	ctx.fillStyle = '#dc2626';
	ctx.shadowColor = '#dc2626';
	ctx.shadowBlur = 10;
	ctx.fillRect(sx - 2, sy - 16, 4, 32);
	ctx.restore();
}

/**
 * Draw every driver marker.
 * – Leader → gold crown ring + gold pill
 * – Selected → enlarged dot + headshot circle + dimmed others
 */
function drawDrivers(
	ctx,
	w,
	h,
	data,
	t,
	selectedDriver,
	currentBoard,
	driverImages
) {
	const sr = data.info.sample_rate || 1;
	const drivers = data.drivers;
	const positions = data.positions;

	// Build quick position lookup
	const posMap = {};
	if (currentBoard) for (const e of currentBoard) posMap[e.abbr] = e;
	const leaderAbbr = currentBoard?.[0]?.abbr;

	const hasSelection = !!selectedDriver;

	// Draw order: regular → leader → selected (on top)
	const ordered = Object.keys(drivers)
		.slice()
		.sort((a, b) => {
			if (a === selectedDriver) return 1;
			if (b === selectedDriver) return -1;
			if (a === leaderAbbr) return 1;
			if (b === leaderAbbr) return -1;
			return 0;
		});

	for (const abbr of ordered) {
		const info = drivers[abbr];
		const pos = positions[abbr];
		if (!pos?.x || pos.x.length < 2) continue;

		const idx = t * sr;
		const i = Math.floor(idx);
		const frac = idx - i;
		if (i >= pos.x.length - 1) continue;

		const px = (pos.x[i] + (pos.x[i + 1] - pos.x[i]) * frac) * w;
		const py = (pos.y[i] + (pos.y[i + 1] - pos.y[i]) * frac) * h;
		const color = info.color || '#ffffff';

		const isLeader = abbr === leaderAbbr;
		const isSelected = abbr === selectedDriver;
		const dimmed = hasSelection && !isSelected;

		const dotR =
			isSelected ? 8
			: isLeader ? 7
			: 5;
		const glowBlur =
			isSelected ? 24
			: isLeader ? 16
			: 10;

		ctx.save();
		ctx.globalAlpha = dimmed ? 0.3 : 1.0;

		// ── Leader gold outer ring ──
		if (isLeader) {
			ctx.save();
			ctx.shadowColor = '#fbbf24';
			ctx.shadowBlur = 18;
			ctx.beginPath();
			ctx.arc(px, py, dotR + 4, 0, Math.PI * 2);
			ctx.strokeStyle = '#fbbf24';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();
		}

		// ── Glow + dot ──
		ctx.save();
		ctx.shadowColor = color;
		ctx.shadowBlur = glowBlur;
		ctx.beginPath();
		ctx.arc(px, py, dotR, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.restore();

		// ── White border ──
		ctx.beginPath();
		ctx.arc(px, py, dotR, 0, Math.PI * 2);
		ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.5)';
		ctx.lineWidth = isSelected ? 2.5 : 1.5;
		ctx.stroke();

		// ── Selected driver: circular headshot above marker ──
		let headshotDrawn = false;
		if (isSelected) {
			const img = driverImages?.[abbr];
			if (img?.complete && img.naturalWidth > 0) {
				headshotDrawn = true;
				const imgR = 15;
				const imgCx = px;
				const imgCy = py - dotR - imgR - 8;

				// Coloured circle behind
				ctx.save();
				ctx.beginPath();
				ctx.arc(imgCx, imgCy, imgR + 2, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.shadowColor = color;
				ctx.shadowBlur = 14;
				ctx.fill();
				ctx.restore();

				// Clip + draw image
				ctx.save();
				ctx.beginPath();
				ctx.arc(imgCx, imgCy, imgR, 0, Math.PI * 2);
				ctx.clip();
				ctx.drawImage(img, imgCx - imgR, imgCy - imgR, imgR * 2, imgR * 2);
				ctx.restore();

				// Thin border
				ctx.beginPath();
				ctx.arc(imgCx, imgCy, imgR + 1, 0, Math.PI * 2);
				ctx.strokeStyle = color;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		}

		// ── F1-style label pill ──
		const pe = posMap[abbr];
		const posLabel = pe ? `P${pe.position} ${abbr}` : abbr;

		ctx.font = `bold ${isSelected ? 10 : 9}px Inter, system-ui, sans-serif`;
		const tw = ctx.measureText(posLabel).width;
		const pillW = tw + 12;
		const pillH = isSelected ? 17 : 15;
		const pillX = px - pillW / 2;

		// Adjust pill Y depending on whether headshot is drawn
		const pillY =
			headshotDrawn ?
				py - dotR - 15 * 2 - 8 - pillH - 6
			:	py - dotR - pillH - 6;

		const pillColor = isLeader ? '#fbbf24' : color;
		ctx.fillStyle = pillColor;
		ctx.beginPath();
		if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 3);
		else ctx.rect(pillX, pillY, pillW, pillH);
		ctx.fill();

		ctx.strokeStyle = 'rgba(0,0,0,0.3)';
		ctx.lineWidth = 0.5;
		ctx.stroke();

		ctx.fillStyle = isLeader ? '#000' : '#fff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(posLabel, px, pillY + pillH / 2);

		ctx.restore(); // globalAlpha
	}
}

/* ================================================================== */
/*  Page Component                                                      */
/* ================================================================== */

const ROW_H = 52; // driver list row height (px)
const SPEEDS = [1, 2, 5, 10, 20, 50];

export default function TrackPage() {
	/* ── state ── */
	const [sessions, setSessions] = useState([]);
	const [selectedKey, setSelectedKey] = useState('');
	const [sessionData, setSessionData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadedKey, setLoadedKey] = useState('');
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(5);
	const [displayTime, setDisplayTime] = useState(0);
	const [selectedDriver, setSelectedDriver] = useState(null);
	const [currentBoard, setCurrentBoard] = useState(null);
	const [lapInput, setLapInput] = useState('');
	const [genStatus, setGenStatus] = useState(null); // null | {status:'generating',message:'...'} | {status:'error',message:'...'}

	/* ── refs ── */
	const canvasRef = useRef(null);
	const animRef = useRef(null);
	const timeRef = useRef(0);
	const playRef = useRef(false);
	const speedRef = useRef(5);
	const dataRef = useRef(null);
	const lastUiRef = useRef(0);
	const driverImagesRef = useRef({});
	const racePositionsRef = useRef(null);
	const selectedDriverRef = useRef(null);
	const boardRef = useRef(null);

	/* sync refs */
	useEffect(() => {
		playRef.current = isPlaying;
	}, [isPlaying]);
	useEffect(() => {
		speedRef.current = speed;
	}, [speed]);
	useEffect(() => {
		dataRef.current = sessionData;
	}, [sessionData]);
	useEffect(() => {
		selectedDriverRef.current = selectedDriver;
	}, [selectedDriver]);

	/* ── Pre-compute race positions ── */
	const racePositions = useMemo(() => {
		if (!sessionData) return null;
		return precomputeRacePositions(sessionData);
	}, [sessionData]);

	useEffect(() => {
		racePositionsRef.current = racePositions;
	}, [racePositions]);

	/* ── Pre-load headshot images for the canvas ── */
	useEffect(() => {
		if (!sessionData) return;
		const imgs = {};
		for (const abbr of Object.keys(sessionData.drivers)) {
			const img = new window.Image();
			img.crossOrigin = 'anonymous';
			img.src = `/images/drivers/${abbr}.png`;
			imgs[abbr] = img;
		}
		driverImagesRef.current = imgs;
	}, [sessionData]);

	/* ── Fetch sessions on mount ── */
	useEffect(() => {
		getTrackSessions()
			.then((list) => {
				setSessions(list);
				if (list.length > 0) setSelectedKey(`${list[0].year}_${list[0].round}`);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	/* ── Fetch session data when selection changes ── */
	useEffect(() => {
		if (!selectedKey) return;
		const [year, round] = selectedKey.split('_').map(Number);
		const controller = new AbortController();

		// Use a microtask to batch state resets outside the effect body
		Promise.resolve().then(() => {
			setSessionData(null);
			setSelectedDriver(null);
			setCurrentBoard(null);
			setGenStatus(null);
		});

		getSessionData(year, round, {
			signal: controller.signal,
			onStatus: (s) => setGenStatus(s),
		})
			.then((d) => {
				if (!controller.signal.aborted) {
					setSessionData(d);
					setLoadedKey(selectedKey);
					setGenStatus(null);
				}
			})
			.catch((err) => {
				if (err.name !== 'AbortError') {
					console.error(err);
					setGenStatus({ status: 'error', message: err.message });
				}
			});

		return () => controller.abort();
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

			if (playRef.current) {
				timeRef.current += delta * speedRef.current;
				if (timeRef.current >= d.info.duration_sec) {
					timeRef.current = d.info.duration_sec;
					setIsPlaying(false);
				}
			}

			// Throttled UI update (4 Hz)
			const now = performance.now();
			if (now - lastUiRef.current > 250) {
				lastUiRef.current = now;
				setDisplayTime(timeRef.current);

				const rp = racePositionsRef.current;
				if (rp) {
					const sr = d.info.sample_rate || 1;
					const sIdx = Math.min(
						Math.floor(timeRef.current * sr),
						rp.length - 1
					);
					const board = rp[Math.max(0, sIdx)];
					boardRef.current = board;
					setCurrentBoard(board);
				}
			}

			// HiDPI
			const dpr = window.devicePixelRatio || 1;
			const cw = canvas.clientWidth;
			const ch = canvas.clientHeight;
			if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
				canvas.width = cw * dpr;
				canvas.height = ch * dpr;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			}

			ctx.clearRect(0, 0, cw, ch);
			ctx.fillStyle = '#0a0a0a';
			ctx.fillRect(0, 0, cw, ch);

			drawTrack(ctx, cw, ch, d.track.x, d.track.y);
			drawDrivers(
				ctx,
				cw,
				ch,
				d,
				timeRef.current,
				selectedDriverRef.current,
				boardRef.current,
				driverImagesRef.current
			);

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
			if (e.code === 'Escape') setSelectedDriver(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	/* ── Handlers ── */
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

	const jumpToLap = useCallback((lap) => {
		const d = dataRef.current;
		if (!d?.lap_starts) return;
		const clamped = Math.max(1, Math.min(lap, d.lap_starts.length - 1));
		timeRef.current = d.lap_starts[clamped] || 0;
		setDisplayTime(timeRef.current);
	}, []);

	const handleDriverClick = useCallback((abbr) => {
		setSelectedDriver((prev) => (prev === abbr ? null : abbr));
	}, []);

	/* ── Derived values ── */
	const lapNum =
		sessionData ? getCurrentLap(sessionData.lap_starts, displayTime) : 0;
	const totalLaps = sessionData?.info?.total_laps ?? 0;
	const maxTime = sessionData?.info?.duration_sec ?? 0;
	const dataLoading = !!selectedKey && selectedKey !== loadedKey;
	const driverCount = sessionData ? Object.keys(sessionData.drivers).length : 0;

	const posMap = useMemo(() => {
		const m = {};
		if (currentBoard) for (const e of currentBoard) m[e.abbr] = e;
		return m;
	}, [currentBoard]);

	/* ============================= RENDER ============================= */
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />

			<div className="relative z-10 max-w-[1440px] mx-auto pb-12">
				{/* ────── Header ────── */}
				<div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
					<h1 className="text-4xl font-bold uppercase tracking-wider flex items-center gap-4 animate-fade-in">
						<FaFlagCheckered className="text-red-600" />
						Live Track
					</h1>

					{sessions.length > 0 && (
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
					)}
				</div>

				{/* ────── Content ────── */}
				{loading ?
					<div className="flex justify-center items-center h-96">
						<div className="text-center">
							<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mx-auto mb-4" />
							<p className="text-gray-400">Loading sessions…</p>
						</div>
					</div>
				: (dataLoading || genStatus) && !sessionData ?
					/* ── Skeleton / generating state ── */
					<div className="animate-fade-in">
						<div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
							{/* Skeleton canvas */}
							<div className="space-y-4">
								<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl">
									<div className="aspect-4/3 w-full bg-white/2 rounded-xl flex flex-col items-center justify-center gap-4 relative overflow-hidden">
										{/* Shimmer overlay */}
										<div className="absolute inset-0 animate-slide-across bg-linear-to-r from-transparent via-white/3 to-transparent" />

										{genStatus?.status === 'error' ?
											<>
												<div className="w-12 h-12 rounded-full border-2 border-red-500/50 flex items-center justify-center">
													<span className="text-red-500 text-xl">!</span>
												</div>
												<p className="text-red-400 text-sm font-medium">
													Generation failed
												</p>
												<p className="text-gray-500 text-xs max-w-xs text-center">
													{genStatus.message}
												</p>
											</>
										:	<>
												<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600" />
												<p className="text-gray-300 font-medium">
													{genStatus?.status === 'generating' ?
														'Generating track data…'
													:	'Loading track data…'}
												</p>
												<p className="text-gray-500 text-xs max-w-xs text-center">
													{genStatus?.status === 'generating' ?
														'Extracting telemetry from FastF1. This may take 1-2 minutes for the first load.'
													:	'Please wait…'}
												</p>
												{/* Progress dots */}
												<div className="flex gap-1.5 mt-2">
													{[0, 1, 2].map((i) => (
														<div
															key={i}
															className="w-2 h-2 rounded-full bg-red-600"
															style={{
																animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
															}}
														/>
													))}
												</div>
											</>
										}
									</div>
								</div>
								{/* Skeleton controls */}
								<div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 h-20">
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-full bg-white/5" />
										<div className="flex-1 h-2 rounded bg-white/5" />
										<div className="w-16 h-8 rounded-lg bg-white/5" />
									</div>
								</div>
							</div>
							{/* Skeleton driver list */}
							<div>
								<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
									<div className="px-4 py-3 border-b border-white/10">
										<div className="h-3 w-24 bg-white/5 rounded" />
									</div>
									<div className="p-2 space-y-1">
										{Array.from({ length: 10 }).map((_, i) => (
											<div
												key={i}
												className="flex items-center gap-3 px-3 h-12 rounded-xl"
											>
												<div className="w-5 h-4 bg-white/5 rounded" />
												<div className="w-8 h-8 rounded-full bg-white/5" />
												<div className="flex-1 space-y-1.5">
													<div className="h-3 w-12 bg-white/5 rounded" />
													<div className="h-2 w-20 bg-white/3 rounded" />
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
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

						{/* ── Grid: Canvas + Live standings ── */}
						<div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
							{/* ===== LEFT: Canvas + Controls ===== */}
							<div className="space-y-4">
								{/* Canvas card */}
								<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl">
									<div className="aspect-4/3 w-full">
										<canvas
											ref={canvasRef}
											className="w-full h-full rounded-xl"
										/>
									</div>
								</div>

								{/* Playback controls */}
								<div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 space-y-3">
									{/* Row 1: Play · Restart · Lap Nav · Timeline · Time · Speed */}
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

										{/* ── Lap navigation ── */}
										<div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
											<button
												onClick={() => jumpToLap(lapNum - 1)}
												disabled={lapNum <= 1}
												className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
												aria-label="Previous lap"
											>
												<FaChevronLeft className="text-[10px]" />
											</button>
											<div className="flex items-center gap-1">
												<span className="text-[11px] text-gray-500 uppercase tracking-wider">
													Lap
												</span>
												<input
													type="number"
													min={1}
													max={totalLaps}
													value={lapInput || lapNum}
													onChange={(e) => setLapInput(e.target.value)}
													onBlur={() => {
														const v = parseInt(lapInput);
														if (v >= 1 && v <= totalLaps) jumpToLap(v);
														setLapInput('');
													}}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															const v = parseInt(lapInput);
															if (v >= 1 && v <= totalLaps) jumpToLap(v);
															setLapInput('');
															e.target.blur();
														}
													}}
													className="w-10 bg-transparent text-center text-white font-bold text-sm focus:outline-none focus:bg-white/10 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
												/>
												<span className="text-gray-500 text-sm">
													/{totalLaps}
												</span>
											</div>
											<button
												onClick={() => jumpToLap(lapNum + 1)}
												disabled={lapNum >= totalLaps}
												className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
												aria-label="Next lap"
											>
												<FaChevronRight className="text-[10px]" />
											</button>
										</div>

										{/* Timeline slider */}
										<input
											type="range"
											min={0}
											max={maxTime}
											step={0.5}
											value={displayTime}
											onChange={handleSeek}
											className="flex-1 min-w-20 h-1.5 accent-red-600 cursor-pointer"
										/>

										{/* Time display */}
										<span className="text-sm text-gray-300 font-mono whitespace-nowrap">
											{formatTime(displayTime)}{' '}
											<span className="text-gray-600">
												/ {formatTime(maxTime)}
											</span>
										</span>

										{/* Speed */}
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

									<p className="text-[11px] text-gray-600 select-none">
										Space: play / pause &nbsp;·&nbsp; ← → : ±5 s &nbsp;·&nbsp;
										Esc: deselect driver
									</p>
								</div>
							</div>

							{/* ===== RIGHT: Live Race Order ===== */}
							<div>
								<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl sticky top-28 overflow-hidden">
									{/* Header */}
									<div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
										<h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
											Race Order
										</h3>
										{selectedDriver && (
											<button
												onClick={() => setSelectedDriver(null)}
												className="text-[10px] text-gray-500 hover:text-white transition-colors"
											>
												Clear selection
											</button>
										)}
									</div>

									{/* Driver list with position transitions */}
									<div
										className="relative overflow-y-auto"
										style={{ height: Math.min(driverCount * ROW_H, 580) }}
									>
										{Object.entries(sessionData.drivers).map(([abbr, info]) => {
											const pe = posMap[abbr];
											const pos = pe?.position ?? driverCount;
											const isLeader = pos === 1;
											const isSel = abbr === selectedDriver;
											const isActive = pe?.active !== false;

											return (
												<div
													key={abbr}
													className={`absolute left-0 right-0 transition-[top] duration-500 ease-out cursor-pointer group`}
													style={{
														top: `${(pos - 1) * ROW_H}px`,
														height: `${ROW_H}px`,
													}}
													onClick={() => handleDriverClick(abbr)}
												>
													<div
														className={`flex items-center gap-3 h-full mx-2 px-3 rounded-xl transition-colors
															${isSel ? 'bg-white/15 border border-white/20' : 'hover:bg-white/5 border border-transparent'}
															${!isActive ? 'opacity-40' : ''}`}
													>
														{/* Position badge */}
														<div
															className={`w-7 text-center shrink-0 ${isLeader ? 'text-yellow-400' : 'text-gray-400'}`}
														>
															{isLeader ?
																<FaCrown className="text-yellow-400 text-sm mx-auto" />
															:	<span className="text-xs font-bold">{pos}</span>}
														</div>

														{/* Driver image */}
														<div
															className={`relative w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 ${isSel ? 'border-white' : 'border-transparent'}`}
															style={{
																borderColor: isSel ? info.color : undefined,
															}}
														>
															<Image
																src={`/images/drivers/${abbr}.png`}
																alt={abbr}
																fill
																sizes="32px"
																className="object-cover"
																onError={(e) => {
																	e.target.style.display = 'none';
																}}
															/>
															{/* Fallback: colored circle */}
															<div
																className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"
																style={{ backgroundColor: info.color + '80' }}
															>
																{abbr}
															</div>
														</div>

														{/* Team color band */}
														<div
															className="w-1 h-6 rounded-full shrink-0"
															style={{ backgroundColor: info.color }}
														/>

														{/* Name + team */}
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<span
																	className={`text-sm font-bold leading-none ${isSel ? 'text-white' : 'text-gray-200'}`}
																>
																	{abbr}
																</span>
																<span className="text-[10px] text-gray-500 leading-none hidden sm:inline">
																	#{info.number}
																</span>
															</div>
															<span className="text-[11px] text-gray-500 truncate block leading-tight mt-0.5">
																{info.team}
															</span>
														</div>

														{/* Selection indicator */}
														{isSel && (
															<div
																className="w-2 h-2 rounded-full shrink-0"
																style={{
																	backgroundColor: info.color,
																	boxShadow: `0 0 8px ${info.color}`,
																}}
															/>
														)}
													</div>
												</div>
											);
										})}
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
