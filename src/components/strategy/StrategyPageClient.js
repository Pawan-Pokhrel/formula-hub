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
import PitStopLog from './PitStopLog';
import PlaybackBar from './PlaybackBar';
import PredictionPanel from './PredictionPanel';
import RaceLoadingSkeleton from './RaceLoadingSkeleton';
import RaceSetupPanel from './RaceSetupPanel';
import StrategyHeader from './StrategyHeader';
import StrategyTimeline from './StrategyTimeline';
import TimingTower from './TimingTower';

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
	const [playSpeed, setPlaySpeed] = useState(1);
	const playRef = useRef(null);

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

	// Handle auto play loop and stop at the last lap.
	useEffect(() => {
		if (playing && raceData) {
			const totalLaps = raceData.circuit_info.total_laps;
			playRef.current = setInterval(() => {
				setCurrentLap((prev) => {
					if (prev >= totalLaps) {
						setPlaying(false);
						return prev;
					}
					return prev + 1;
				});
			}, 1500 / playSpeed);
		}

		return () => clearInterval(playRef.current);
	}, [playing, playSpeed, raceData]);

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

	const totalLaps = raceData?.circuit_info?.total_laps || 0;

	return (
		<div className="min-h-screen bg-black text-white pt-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />

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
								playing={playing}
								playSpeed={playSpeed}
								onPlay={() => setPlaying((prev) => !prev)}
								onLapChange={setCurrentLap}
								onSpeedChange={setPlaySpeed}
								onStepBack={() =>
									setCurrentLap((prev) => Math.max(1, prev - 1))
								}
								onStepForward={() =>
									setCurrentLap((prev) => Math.min(totalLaps, prev + 1))
								}
								flags={raceData.flags || []}
							/>

							<FlagBanner currentFlags={currentFlags} />

							<div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
								<div className="space-y-4">
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
								</div>

								<div className="space-y-4">
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
