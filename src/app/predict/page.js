'use client';

import {
	getPredictionMetadata,
	predictLapTime,
	simulateRacePredictions,
} from '@/lib/api/predictionApi';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
	FaBolt,
	FaClock,
	FaFlagCheckered,
	FaInfoCircle,
	FaPause,
	FaPlay,
	FaSync,
	FaTachometerAlt,
} from 'react-icons/fa';

const TEAM_COLORS = {
	'Red Bull Racing': '#3671C6',
	McLaren: '#FF8000',
	Ferrari: '#E8002D',
	Mercedes: '#27F4D2',
	'Aston Martin': '#229971',
	Alpine: '#FF87BC',
	Williams: '#64C4FF',
	RB: '#6692FF',
	'Kick Sauber': '#52E252',
	'Haas F1 Team': '#B6BABD',
	Cadillac: '#1e3d6b',
};

const COMPOUND_COLORS = {
	SOFT: '#FF3333',
	MEDIUM: '#FFD700',
	HARD: '#EEEEEE',
	INTERMEDIATE: '#43B02A',
	WET: '#0080FF',
};

export default function PredictPage() {
	const searchParams = useSearchParams();
	const [activeTab, setActiveTab] = useState('manual');

	const [meta, setMeta] = useState(null);
	const [metaLoading, setMetaLoading] = useState(true);
	const [metaError, setMetaError] = useState(null);

	const [form, setForm] = useState({
		driver: '',
		team: '',
		circuit: '',
		compound: 'MEDIUM',
		tyre_life: 5,
		stint: 1,
		stint_lap: 5,
		lap_number: 10,
		position: 5,
		prev_lap_1: 90,
		prev_lap_2: '',
		prev_lap_3: '',
	});

	const [result, setResult] = useState(null);
	const [predicting, setPredicting] = useState(false);
	const [error, setError] = useState(null);

	const [replayCfg, setReplayCfg] = useState({
		year: new Date().getFullYear(),
		round: 1,
		start_lap: 4,
		end_lap: '',
		driver: '',
	});
	const [replayLoading, setReplayLoading] = useState(false);
	const [replayError, setReplayError] = useState(null);
	const [replayData, setReplayData] = useState(null);
	const [replayLap, setReplayLap] = useState(5);
	const [replayPlaying, setReplayPlaying] = useState(false);
	const [replaySpeed, setReplaySpeed] = useState(1);
	const replayTimerRef = useRef(null);

	useEffect(() => {
		const yearParam = Number(searchParams.get('year'));
		const roundParam = Number(searchParams.get('round'));
		const modeParam = searchParams.get('mode');

		if (modeParam === 'replay') {
			setActiveTab('replay');
		}

		if (Number.isInteger(yearParam) && yearParam >= 2018) {
			setReplayCfg((cfg) => ({ ...cfg, year: yearParam }));
		}

		if (Number.isInteger(roundParam) && roundParam > 0) {
			setReplayCfg((cfg) => ({ ...cfg, round: roundParam }));
		}
	}, [searchParams]);

	useEffect(() => {
		getPredictionMetadata()
			.then((m) => {
				setMeta(m);
				const firstDriver = m.drivers[0] || '';
				const firstTeam =
					m.driver_teams?.[firstDriver]?.[0] || m.teams[0] || '';
				const firstCircuit = m.circuits[0] || '';
				const baseline = m.circuit_baselines?.[firstCircuit];
				const baseLap = baseline ? Math.round(baseline.mean * 10) / 10 : 90;

				setForm((f) => ({
					...f,
					driver: firstDriver,
					team: firstTeam,
					circuit: firstCircuit,
					compound: m.compounds[1] || 'MEDIUM',
					prev_lap_1: baseLap,
				}));
			})
			.catch((e) => setMetaError(e.message || 'Failed to load model metadata'))
			.finally(() => setMetaLoading(false));
	}, []);

	useEffect(() => {
		if (!replayPlaying || !replayData?.predictions?.length) {
			clearInterval(replayTimerRef.current);
			return;
		}

		const maxLap = Math.max(
			...replayData.predictions.map((p) => p.predicted_lap || 0)
		);

		replayTimerRef.current = setInterval(() => {
			setReplayLap((prev) => {
				if (prev >= maxLap) {
					setReplayPlaying(false);
					return prev;
				}
				return prev + 1;
			});
		}, 1500 / replaySpeed);

		return () => clearInterval(replayTimerRef.current);
	}, [replayPlaying, replaySpeed, replayData]);

	const update = (field, value) => {
		setForm((f) => {
			const next = { ...f, [field]: value };

			if (field === 'driver' && meta?.driver_teams) {
				const teams = meta.driver_teams[value];
				if (teams?.length) next.team = teams[0];
			}

			if (field === 'circuit' && meta?.circuit_baselines) {
				const bl = meta.circuit_baselines[value];
				if (bl) next.prev_lap_1 = Math.round(bl.mean * 10) / 10;
			}

			if (field === 'stint_lap' && Number(next.stint) === 1) {
				next.tyre_life = value;
				next.lap_number = value;
			}

			if (field === 'stint' && Number(value) === 1) {
				next.lap_number = next.stint_lap;
			}

			return next;
		});
	};

	const circuitBaseline = meta?.circuit_baselines?.[form.circuit];

	const handleSubmit = async (e) => {
		e.preventDefault();
		setPredicting(true);
		setError(null);
		setResult(null);

		const payload = {
			...form,
			tyre_life: Number(form.tyre_life),
			stint: Number(form.stint),
			stint_lap: Number(form.stint_lap),
			lap_number: Number(form.lap_number),
			position: Number(form.position),
			prev_lap_1: Number(form.prev_lap_1),
		};
		if (form.prev_lap_2 !== '') payload.prev_lap_2 = Number(form.prev_lap_2);
		if (form.prev_lap_3 !== '') payload.prev_lap_3 = Number(form.prev_lap_3);

		try {
			const res = await predictLapTime(payload);
			setResult(res);
		} catch (err) {
			setError(
				err?.response?.data?.detail || err.message || 'Prediction failed'
			);
		} finally {
			setPredicting(false);
		}
	};

	const runReplaySimulation = async () => {
		setReplayLoading(true);
		setReplayError(null);
		setReplayData(null);
		setReplayPlaying(false);

		try {
			const data = await simulateRacePredictions({
				year: Number(replayCfg.year),
				round: Number(replayCfg.round),
				start_lap: Number(replayCfg.start_lap),
				end_lap:
					replayCfg.end_lap === '' ? undefined : Number(replayCfg.end_lap),
				drivers: replayCfg.driver ? [replayCfg.driver] : undefined,
			});
			setReplayData(data);

			if (data.predictions?.length) {
				const minLap = Math.min(
					...data.predictions.map((p) => p.predicted_lap || 0)
				);
				setReplayLap(minLap || 1);
			}
		} catch (e) {
			setReplayError(e?.response?.data?.detail || e.message || 'Replay failed');
		} finally {
			setReplayLoading(false);
		}
	};

	const fmtSec = (s) => {
		if (!s && s !== 0) return '-';
		const m = Math.floor(s / 60);
		const sec = (s % 60).toFixed(3);
		return `${m}:${sec.padStart(6, '0')}`;
	};

	const replayRows = replayData?.predictions || [];
	const replayLapRows = replayRows.filter((r) => r.predicted_lap === replayLap);
	const replayLapRange =
		replayRows.length ?
			{
				min: Math.min(...replayRows.map((r) => r.predicted_lap || 0)),
				max: Math.max(...replayRows.map((r) => r.predicted_lap || 0)),
			}
		:	null;

	if (metaLoading) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<div className="text-gray-400">Loading predictor...</div>
			</div>
		);
	}

	if (metaError) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<div className="text-center max-w-md px-4">
					<FaInfoCircle className="text-red-500 text-2xl mx-auto mb-3" />
					<h2 className="text-xl font-bold mb-2">Model Unavailable</h2>
					<p className="text-gray-400 text-sm">{metaError}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-4 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />

			<div className="relative z-10 max-w-7xl mx-auto pb-16">
				<div className="text-center mb-10 animate-fade-in">
					<div className="inline-flex items-center gap-2.5 text-red-500 text-[11px] font-bold uppercase tracking-[0.3em] mb-3">
						<span className="h-px w-8 bg-linear-to-r from-transparent to-red-600" />
						Machine Learning
						<span className="h-px w-8 bg-linear-to-l from-transparent to-red-600" />
					</div>
					<h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-3">
						Lap Time <span className="text-red-500">Predictor</span>
					</h1>
				</div>

				<div className="flex items-center justify-center mb-10">
					<div className="inline-flex bg-white/4 backdrop-blur-sm rounded-2xl p-1.5 border border-white/10">
						<button
							onClick={() => setActiveTab('manual')}
							className={`px-8 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
								activeTab === 'manual' ?
									'bg-linear-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/25'
								:	'text-gray-500 hover:text-gray-300'
							}`}
						>
							<FaBolt className="inline mr-2 text-xs" />
							Manual
						</button>
						<button
							onClick={() => setActiveTab('replay')}
							className={`px-8 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
								activeTab === 'replay' ?
									'bg-linear-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/25'
								:	'text-gray-500 hover:text-gray-300'
							}`}
						>
							<FaClock className="inline mr-2 text-xs" />
							Replay
						</button>
					</div>
				</div>

				{activeTab === 'manual' && (
					<div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 animate-fade-in">
						<form
							onSubmit={handleSubmit}
							className="space-y-5"
						>
							<FormSection
								icon={<FaFlagCheckered />}
								title="Session Setup"
							>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<SelectField
										label="Driver"
										value={form.driver}
										onChange={(v) => update('driver', v)}
										options={meta.drivers}
									/>
									<SelectField
										label="Circuit"
										value={form.circuit}
										onChange={(v) => update('circuit', v)}
										options={meta.circuits}
									/>
								</div>
							</FormSection>

							<FormSection
								icon={<FaTachometerAlt />}
								title="Tyre Strategy"
							>
								<div className="grid grid-cols-3 gap-4">
									<NumberField
										label="Tyre Life"
										value={form.tyre_life}
										onChange={(v) => update('tyre_life', v)}
										min={0}
										max={60}
									/>
									<NumberField
										label="Stint #"
										value={form.stint}
										onChange={(v) => update('stint', v)}
										min={1}
										max={10}
									/>
									<NumberField
										label="Stint Lap"
										value={form.stint_lap}
										onChange={(v) => update('stint_lap', v)}
										min={1}
										max={60}
									/>
								</div>
							</FormSection>

							<FormSection
								icon={<FaClock />}
								title="Race Data"
							>
								<div className="grid grid-cols-2 gap-4 mb-4">
									<NumberField
										label="Lap Number"
										value={form.lap_number}
										onChange={(v) => update('lap_number', v)}
										min={1}
										max={80}
									/>
									<NumberField
										label="Position"
										value={form.position}
										onChange={(v) => update('position', v)}
										min={1}
										max={20}
									/>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<NumberField
										label="Previous Lap"
										value={form.prev_lap_1}
										onChange={(v) => update('prev_lap_1', v)}
										min={50}
										max={200}
										step={0.1}
										required
										placeholder={
											circuitBaseline ?
												`~${circuitBaseline.mean.toFixed(1)}`
											:	''
										}
									/>
									<NumberField
										label="2 Laps Ago"
										value={form.prev_lap_2}
										onChange={(v) => update('prev_lap_2', v)}
										min={50}
										max={200}
										step={0.1}
										placeholder="optional"
									/>
									<NumberField
										label="3 Laps Ago"
										value={form.prev_lap_3}
										onChange={(v) => update('prev_lap_3', v)}
										min={50}
										max={200}
										step={0.1}
										placeholder="optional"
									/>
								</div>
							</FormSection>

							<button
								type="submit"
								disabled={predicting}
								className="w-full py-4 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-900 disabled:to-red-950 disabled:cursor-not-allowed rounded-2xl text-base font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 hover:shadow-red-600/30"
							>
								{predicting ?
									<>
										<div className="h-2.5 w-8 rounded-full bg-white/70 animate-pulse" />
										Calculating...
									</>
								:	<>
										<FaBolt />
										Predict Lap Time
									</>
								}
							</button>

							{error && (
								<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3">
									<FaInfoCircle className="shrink-0" />
									{error}
								</div>
							)}
						</form>

						<div className="space-y-5">
							{result ?
								<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden animate-fade-in">
									<div className="bg-linear-to-b from-red-600/10 to-transparent px-6 pt-8 pb-6 text-center">
										<p className="text-[11px] text-red-400/80 uppercase tracking-[0.3em] font-bold mb-4">
											Predicted Lap Time
										</p>
										<div className="text-5xl md:text-6xl font-black font-mono text-white tracking-wider">
											{result.predicted_lap_time_str}
										</div>
										<p className="text-gray-500 text-sm font-mono mt-2">
											{result.predicted_lap_time_sec.toFixed(3)}s
										</p>
									</div>
								</div>
							:	<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 p-10 text-center">
									<div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/5 flex items-center justify-center">
										<FaTachometerAlt className="text-2xl text-gray-700" />
									</div>
									<h3 className="text-lg font-bold text-gray-400 mb-2">
										Awaiting Parameters
									</h3>
									<p className="text-sm text-gray-600">
										Set race context and run prediction.
									</p>
								</div>
							}
						</div>
					</div>
				)}

				{activeTab === 'replay' && (
					<div className="animate-fade-in space-y-6">
						<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
							<div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
								<NumberField
									label="Season"
									value={replayCfg.year}
									onChange={(v) => setReplayCfg((c) => ({ ...c, year: v }))}
									min={2018}
									max={2035}
								/>
								<NumberField
									label="Round"
									value={replayCfg.round}
									onChange={(v) => setReplayCfg((c) => ({ ...c, round: v }))}
									min={1}
									max={30}
								/>
								<NumberField
									label="Start Lap"
									value={replayCfg.start_lap}
									onChange={(v) =>
										setReplayCfg((c) => ({ ...c, start_lap: v }))
									}
									min={4}
									max={80}
								/>
								<NumberField
									label="End Lap"
									value={replayCfg.end_lap}
									onChange={(v) => setReplayCfg((c) => ({ ...c, end_lap: v }))}
									min={4}
									max={80}
									placeholder="optional"
								/>
								<SelectField
									label="Driver Filter"
									value={replayCfg.driver}
									onChange={(v) => setReplayCfg((c) => ({ ...c, driver: v }))}
									options={['', ...(meta?.drivers || [])]}
								/>
								<button
									onClick={runReplaySimulation}
									disabled={replayLoading}
									className="h-[42px] px-5 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-900 disabled:to-red-950 disabled:cursor-not-allowed rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
								>
									{replayLoading ?
										<FaSync className="animate-spin" />
									:	<FaBolt />}{' '}
									Simulate
								</button>
							</div>
						</div>

						{replayError && (
							<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3">
								<FaInfoCircle className="shrink-0" />
								{replayError}
							</div>
						)}

						{replayData && replayLapRange && (
							<div className="space-y-4">
								<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 p-5 space-y-4">
									<div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
										<div className="text-sm text-gray-500">
											<span className="text-white font-semibold">
												{replayData.event}
											</span>{' '}
											({replayData.year} R{replayData.round})
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => setReplayPlaying((p) => !p)}
												className="px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-sm font-bold flex items-center gap-2"
											>
												{replayPlaying ?
													<FaPause />
												:	<FaPlay />}{' '}
												{replayPlaying ? 'Pause' : 'Play'}
											</button>
											{[1, 2, 4].map((s) => (
												<button
													key={s}
													onClick={() => setReplaySpeed(s)}
													className={`px-3 py-2 rounded-xl text-xs font-bold ${replaySpeed === s ? 'bg-red-600/30 text-red-300 border border-red-500/30' : 'bg-white/6 text-gray-400 hover:text-white'}`}
												>
													{s}x
												</button>
											))}
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between text-xs text-gray-500 mb-2">
											<span>Replay Lap</span>
											<span className="font-mono text-white">L{replayLap}</span>
										</div>
										<input
											type="range"
											min={replayLapRange.min}
											max={replayLapRange.max}
											value={replayLap}
											onChange={(e) => setReplayLap(Number(e.target.value))}
											className="w-full accent-red-600"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
									{replayLapRows.map((p, idx) => {
										const teamColor = TEAM_COLORS[p.team] || '#666';
										const delta =
											p.actual_lap_time_sec != null ?
												p.predicted_lap_time_sec - p.actual_lap_time_sec
											:	null;
										return (
											<div
												key={`${p.driver}_${p.predicted_lap}_${idx}`}
												className="bg-white/3 backdrop-blur-xl rounded-xl border border-white/10 p-4"
											>
												<div className="flex items-center justify-between mb-2">
													<div>
														<p
															className="text-lg font-bold"
															style={{ color: teamColor }}
														>
															{p.driver}
														</p>
														<p className="text-xs text-gray-500">
															P{p.position} - {p.team}
														</p>
													</div>
													<div className="text-right">
														<p className="text-[10px] text-gray-600 uppercase">
															Predicted
														</p>
														<p className="font-mono font-bold text-white">
															{p.predicted_lap_time_str}
														</p>
													</div>
												</div>
												<div className="grid grid-cols-2 gap-2 text-xs">
													<div className="flex justify-between text-gray-500">
														<span>Context Lap</span>
														<span className="text-white">L{p.context_lap}</span>
													</div>
													<div className="flex justify-between text-gray-500">
														<span>Predicted Lap</span>
														<span className="text-white">
															L{p.predicted_lap}
														</span>
													</div>
													<div className="flex justify-between text-gray-500">
														<span>Prev 1</span>
														<span className="text-white font-mono">
															{fmtSec(p.prev_lap_1)}
														</span>
													</div>
													<div className="flex justify-between text-gray-500">
														<span>Actual</span>
														<span className="text-white font-mono">
															{p.actual_lap_time_sec != null ?
																fmtSec(p.actual_lap_time_sec)
															:	'-'}
														</span>
													</div>
												</div>
												<div className="mt-2 text-xs font-mono">
													<span className="text-gray-500">Error: </span>
													<span
														className={
															delta == null ? 'text-gray-500'
															: delta > 0 ?
																'text-red-400'
															:	'text-green-400'
														}
													>
														{delta == null ?
															'-'
														:	`${delta > 0 ? '+' : ''}${delta.toFixed(3)}s`}
													</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function FormSection({ icon, title, children }) {
	return (
		<div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 p-5 hover:border-white/15 transition-colors duration-300">
			<div className="flex items-center gap-2.5 mb-4">
				<span className="text-red-500/70 text-sm">{icon}</span>
				<h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
					{title}
				</h3>
				<div className="flex-1 h-px bg-linear-to-r from-white/10 to-transparent" />
			</div>
			{children}
		</div>
	);
}

function SelectField({ label, value, onChange, options }) {
	return (
		<label className="block">
			<span className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block">
				{label}
			</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full bg-white/6 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/20 transition-all"
			>
				{options.includes('') && (
					<option
						value=""
						className="bg-gray-900 text-white"
					>
						All
					</option>
				)}
				{options.map((opt) =>
					opt === '' ? null : (
						<option
							key={opt}
							value={opt}
							className="bg-gray-900 text-white"
						>
							{opt}
						</option>
					)
				)}
			</select>
		</label>
	);
}

function NumberField({
	label,
	value,
	onChange,
	min,
	max,
	step = 1,
	required = false,
	placeholder = '',
}) {
	return (
		<label className="block">
			<span className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block">
				{label}
			</span>
			<input
				type="number"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				min={min}
				max={max}
				step={step}
				required={required}
				placeholder={placeholder}
				className="w-full bg-white/6 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/20 transition-all placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			/>
		</label>
	);
}
