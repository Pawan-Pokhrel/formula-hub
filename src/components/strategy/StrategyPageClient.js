'use client';

import {
	getCircuits,
	getMLPrediction,
	getRecommendation,
	loadRaceData,
} from '@/lib/api/strategyApi';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

import EmptyState from './EmptyState';
import FlagBanner from './FlagBanner';
import PaceDegradationChart from './PaceDegradationChart';
import PitStopLog from './PitStopLog';
import PlaybackBar from './PlaybackBar';
import PredictionPanel from './PredictionPanel';
import RaceLoadingSkeleton from './RaceLoadingSkeleton';
import RaceSetupPanel from './RaceSetupPanel';
import StrategyHeader from './StrategyHeader';
import StrategyTimeline from './StrategyTimeline';
import TimingTower from './TimingTower';
import TrackConditionsCard from './TrackConditionsCard';

export default function StrategyPageClient() {
	const searchParams = useSearchParams();
	const currentYear = new Date().getFullYear();

	const [year, setYear] = useState(currentYear);
	const [circuits, setCircuits] = useState([]);
	const [selectedRound, setSelectedRound] = useState(null);
	const [circuitsLoading, setCircuitsLoading] = useState(false);

	const [raceData, setRaceData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const [currentLap, setCurrentLap] = useState(1);
	const [playing, setPlaying] = useState(false);
	const [lapDurationSec, setLapDurationSec] = useState(5);
	const [lapProgress, setLapProgress] = useState(0);
	const playRef = useRef(null);
	const lapTimerRef = useRef(0);

	const [selectedDriver, setSelectedDriver] = useState(null);
	const [prediction, setPrediction] = useState(null);
	const [predLoading, setPredLoading] = useState(false);
	const [heuristic, setHeuristic] = useState(null);

	const [showConfig, setShowConfig] = useState(true);
	const predictionRequestRef = useRef(0);
	const predictionCacheRef = useRef(new Map());
	const prefillRoundRef = useRef(null);

	useEffect(() => {
		const yearParam = Number(searchParams.get('year'));
		const roundParam = Number(searchParams.get('round'));

		if (Number.isInteger(yearParam) && yearParam >= 2018) {
			setYear(yearParam);
		}

		if (Number.isInteger(roundParam) && roundParam > 0) {
			prefillRoundRef.current = roundParam;
		}
	}, [searchParams]);

	// Refresh available races whenever season changes.
	useEffect(() => {
		async function fetchCircuits() {
			setCircuitsLoading(true);
			try {
				const res = await getCircuits(year);
				setCircuits(res.data || []);
				setSelectedRound(null);
				setRaceData(null);
				setPrediction(null);
				setHeuristic(null);
				setSelectedDriver(null);
				predictionCacheRef.current.clear();
			} catch {
				setCircuits([]);
			}
			setCircuitsLoading(false);
		}

		fetchCircuits();
	}, [year]);

	useEffect(() => {
		if (!prefillRoundRef.current || circuitsLoading || circuits.length === 0) {
			return;
		}

		const targetRound = Number(prefillRoundRef.current);
		const hasRound = circuits.some(
			(item) => Number(item.round) === targetRound
		);
		if (!hasRound) return;

		setSelectedRound(targetRound);
		prefillRoundRef.current = null;
	}, [circuits, circuitsLoading]);

	// Handle smooth auto-play with configurable lap duration.
	useEffect(() => {
		if (playing && raceData) {
			const totalLaps = raceData.circuit_info.total_laps;
			const tickMs = 100;
			playRef.current = setInterval(() => {
				lapTimerRef.current += tickMs / 1000;
				const nextProgress = Math.min(1, lapTimerRef.current / lapDurationSec);
				setLapProgress(nextProgress);

				if (lapTimerRef.current >= lapDurationSec) {
					lapTimerRef.current = 0;
					setCurrentLap((prev) => {
						if (prev >= totalLaps) {
							setPlaying(false);
							setLapProgress(0);
							return prev;
						}
						const next = prev + 1;
						if (next >= totalLaps) {
							setPlaying(false);
							setLapProgress(0);
						}
						return next;
					});
				}
			}, tickMs);
		}

		return () => clearInterval(playRef.current);
	}, [playing, lapDurationSec, raceData]);

	const jumpToLap = (lapValue) => {
		lapTimerRef.current = 0;
		setLapProgress(0);
		setCurrentLap(lapValue);
	};

	// Fetch ML + heuristic recommendations with a small debounce.
	useEffect(() => {
		if (!selectedDriver || !raceData) return;

		const cacheKey = `${year}_${raceData.circuit_info.round}_${selectedDriver}_${currentLap}`;
		const cached = predictionCacheRef.current.get(cacheKey);
		if (cached) {
			setPrediction(cached.prediction || null);
			setHeuristic(cached.heuristic || null);
			setPredLoading(false);
			return;
		}

		const requestId = predictionRequestRef.current + 1;
		predictionRequestRef.current = requestId;

		const fetchPrediction = async () => {
			setPredLoading(true);
			try {
				const [mlRes, heuRes] = await Promise.all([
					getMLPrediction({
						year,
						roundNum: raceData.circuit_info.round,
						driver: selectedDriver,
						lap: currentLap,
					}),
					getRecommendation({
						year,
						roundNum: raceData.circuit_info.round,
						driver: selectedDriver,
						lap: currentLap,
					}),
				]);

				if (predictionRequestRef.current !== requestId) return;
				if (mlRes.success !== false) setPrediction(mlRes);
				if (heuRes.success !== false) setHeuristic(heuRes);

				predictionCacheRef.current.set(cacheKey, {
					prediction: mlRes.success !== false ? mlRes : null,
					heuristic: heuRes.success !== false ? heuRes : null,
				});
			} catch {
				// Keep this quiet in UI, panel will keep the last valid values.
			} finally {
				if (predictionRequestRef.current === requestId) {
					setPredLoading(false);
				}
			}
		};

		const debounce = setTimeout(fetchPrediction, 300);
		return () => clearTimeout(debounce);
	}, [selectedDriver, currentLap, raceData, year]);

	async function handleLoadRace() {
		if (!selectedRound) return;

		setLoading(true);
		setError(null);
		setRaceData(null);
		setPrediction(null);
		setHeuristic(null);
		setSelectedDriver(null);
		predictionCacheRef.current.clear();
		setCurrentLap(1);
		setPlaying(false);
		setLapProgress(0);
		lapTimerRef.current = 0;

		try {
			const res = await loadRaceData({ year, roundNum: selectedRound });
			if (!res.success) {
				setError(res.message || 'Failed to load race');
				return;
			}

			setRaceData(res);
			setShowConfig(false);

			const drivers = Object.keys(res.drivers || {});
			if (drivers.length > 0) {
				const sorted = drivers.sort(
					(a, b) =>
						(res.drivers[a].finish || 99) - (res.drivers[b].finish || 99)
				);
				setSelectedDriver(sorted[0]);
			}
		} catch (e) {
			setError(
				e?.response?.data?.message || e.message || 'Failed to load race'
			);
		} finally {
			setLoading(false);
		}
	}

	const lapSnapshot = useMemo(() => {
		if (!raceData) return [];

		const driverLaps = raceData.driver_laps || {};
		const snapshot = [];

		for (const [abbr, laps] of Object.entries(driverLaps)) {
			const lapData = laps.find((lap) => lap.lap === currentLap);
			if (!lapData) continue;
			snapshot.push({
				abbr,
				...(raceData.drivers[abbr] || {}),
				...lapData,
			});
		}

		return snapshot.sort((a, b) => (a.pos || 99) - (b.pos || 99));
	}, [raceData, currentLap]);

	const currentFlags = useMemo(() => {
		if (!raceData) return [];
		return (raceData.flags || []).filter((f) => f.lap && f.lap === currentLap);
	}, [raceData, currentLap]);

	const currentPits = useMemo(() => {
		if (!raceData) return [];
		return (raceData.pit_stops || []).filter((pit) => pit.lap === currentLap);
	}, [raceData, currentLap]);

	const paceTelemetryData = useMemo(() => {
		if (!raceData || !selectedDriver) return [];

		const selectedDriverLaps = raceData.driver_laps?.[selectedDriver] || [];
		if (!selectedDriverLaps.length) return [];

		const lapWindowStart = Math.max(1, currentLap - 14);
		const byLap = new Map();
		selectedDriverLaps.forEach((lap) => {
			byLap.set(Number(lap.lap), lap);
		});

		const allDriverLaps = Object.values(raceData.driver_laps || {});
		const result = [];

		for (let lapNum = lapWindowStart; lapNum <= currentLap; lapNum += 1) {
			const mine = byLap.get(lapNum);
			if (!mine || !Number.isFinite(Number(mine.time))) continue;

			const fieldTimes = [];
			allDriverLaps.forEach((laps) => {
				const row = laps.find((entry) => Number(entry.lap) === lapNum);
				if (!row || !row.is_clean || !Number.isFinite(Number(row.time))) return;
				fieldTimes.push(Number(row.time));
			});

			if (!fieldTimes.length) continue;
			fieldTimes.sort((a, b) => a - b);
			const mid = Math.floor(fieldTimes.length / 2);
			const fieldMedian =
				fieldTimes.length % 2 === 0 ?
					(fieldTimes[mid - 1] + fieldTimes[mid]) / 2
				:	fieldTimes[mid];

			result.push({
				lap: lapNum,
				driverPace: Number(mine.time),
				fieldPace: Number(fieldMedian),
			});
		}

		return result;
	}, [raceData, selectedDriver, currentLap]);

	const totalLaps = raceData?.circuit_info?.total_laps || 0;

	return (
		<div className="min-h-screen bg-black text-white pt-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/88 z-0" />

			<div className="relative z-10">
				<StrategyHeader
					raceData={raceData}
					showConfig={showConfig}
					onToggleConfig={() => setShowConfig((prev) => !prev)}
				/>

				{showConfig && (
					<RaceSetupPanel
						currentYear={currentYear}
						year={year}
						onYearChange={setYear}
						circuits={circuits}
						selectedRound={selectedRound}
						onRoundChange={setSelectedRound}
						circuitsLoading={circuitsLoading}
						loading={loading}
						onLoadRace={handleLoadRace}
					/>
				)}

				{error && (
					<div className="px-6 md:px-12 py-2">
						<div className="max-w-[1600px] mx-auto">
							<div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
								<FaExclamationTriangle className="text-red-500 shrink-0" />
								<span className="text-sm text-red-400">{error}</span>
								<button
									onClick={() => setError(null)}
									className="ml-auto text-red-500 hover:text-red-400"
								>
									<FaTimes />
								</button>
							</div>
						</div>
					</div>
				)}

				{!raceData && !loading && <EmptyState />}
				{loading && !raceData && <RaceLoadingSkeleton />}

				{raceData && (
					<div className="px-4 md:px-8 lg:px-12 pb-12 pt-2">
						<div className="max-w-[1600px] mx-auto space-y-4">
							<PlaybackBar
								currentLap={currentLap}
								totalLaps={totalLaps}
								lapProgress={lapProgress}
								playing={playing}
								lapDurationSec={lapDurationSec}
								onPlay={() => setPlaying((prev) => !prev)}
								onLapChange={jumpToLap}
								onLapDurationChange={setLapDurationSec}
								onStepBack={() => jumpToLap(Math.max(1, currentLap - 1))}
								onStepForward={() =>
									jumpToLap(Math.min(totalLaps, currentLap + 1))
								}
								flags={raceData.flags || []}
							/>

							<FlagBanner currentFlags={currentFlags} />

							<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] gap-4">
								<div
									className="space-y-4 transition-[opacity,transform,filter] duration-500 ease-out"
									style={{
										opacity: playing ? 0.96 + lapProgress * 0.04 : 1,
										transform:
											playing ?
												`translateY(${(1 - lapProgress) * 1.2}px)`
											:	'none',
									}}
								>
									<TimingTower
										snapshot={lapSnapshot}
										currentPits={currentPits}
										selectedDriver={selectedDriver}
										onSelectDriver={setSelectedDriver}
									/>

									<StrategyTimeline
										raceData={raceData}
										currentLap={currentLap}
										selectedDriver={selectedDriver}
									/>

									<div className="bg-black/45 backdrop-blur-xl rounded-2xl border border-white/20 p-5 mt-4 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
										<div className="flex items-center justify-between mb-2">
											<h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
												<span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
												Live Degradation Telemetry
											</h3>
										</div>
										<PaceDegradationChart
											telemetryData={paceTelemetryData}
											cliffLap={heuristic?.cliff_lap || null}
										/>
									</div>
								</div>

								<div
									className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin scrollbar-thumb-red-500/40 scrollbar-track-white/5 transition-[opacity,transform] duration-500 ease-out"
									style={{
										opacity: playing ? 0.97 + lapProgress * 0.03 : 1,
										transform:
											playing ?
												`translateY(${(1 - lapProgress) * 0.8}px)`
											:	'none',
									}}
								>
									<TrackConditionsCard
										raceData={raceData}
										currentLap={currentLap}
										currentFlags={currentFlags}
										prediction={prediction}
										heuristic={heuristic}
									/>

									<PredictionPanel
										prediction={prediction}
										heuristic={heuristic}
										loading={predLoading}
										selectedDriver={selectedDriver}
										driverInfo={raceData.drivers[selectedDriver]}
										currentLap={currentLap}
										raceData={raceData}
									/>

									<PitStopLog
										pitStops={raceData.pit_stops || []}
										drivers={raceData.drivers}
										currentLap={currentLap}
										prediction={prediction}
										selectedDriver={selectedDriver}
									/>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
