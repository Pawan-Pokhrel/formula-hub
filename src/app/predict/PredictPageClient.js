'use client';

import CustomSelect from '@/components/common/CustomSelect';
import TyreIcon from '@/components/common/TyreIcon';
import { logActivity } from '@/lib/api/historyApi';
import {
  getPredictionMetadata,
  predictLapTime,
  simulateRacePredictions,
} from '@/lib/api/predictionApi';
import { getLastRace } from '@/lib/api/scheduleApi';
import { getCircuits } from '@/lib/api/strategyApi';
import { useAuth } from '@/providers/AuthProvider';
import { getCarImage, getDriverImage } from '@/utils/f1_images';
import { getCountryFlag } from '@/utils/flags';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  FaBolt,
  FaClock,
  FaFlagCheckered,
  FaInfoCircle,
  FaPause,
  FaPlay,
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
	'Racing Bulls': '#6692FF',
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

function normalizePredictErrorMessage(message) {
	const raw = String(message || 'Prediction failed');
	if (raw.toLowerCase().includes('/track')) {
		return 'Race data is unavailable right now. Automatic generation has been triggered; please retry shortly.';
	}
	return raw;
}

export default function PredictPageClient() {
	const searchParams = useSearchParams();
	const [activeTab, setActiveTab] = useState('manual');
	const { token, isAuthenticated } = useAuth();

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
		prev_lap_2: 90,
		prev_lap_3: 91,
	});

	const [result, setResult] = useState(null);
	const [predicting, setPredicting] = useState(false);
	const [error, setError] = useState(null);

	const [replayCfg, setReplayCfg] = useState({
		year: 2024,
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
	const [mounted, setMounted] = useState(false);

	const [circuits, setCircuits] = useState([]);
	const [circuitsLoading, setCircuitsLoading] = useState(false);

	useEffect(() => {
		setMounted(true);

		const yearParam = Number(searchParams.get('year'));
		const roundParam = Number(searchParams.get('round'));
		const modeParam = searchParams.get('mode');

		if (modeParam === 'replay') {
			setActiveTab('replay');
		}

		if (yearParam && roundParam) {
			setReplayCfg((cfg) => ({
				...cfg,
				year: yearParam,
				round: roundParam,
			}));
		} else {
			// No params? Fetch context from the latest race.
			getLastRace()
				.then((race) => {
					if (race) {
						setReplayCfg((c) => ({
							...c,
							year: race.year || new Date(race.date).getFullYear(),
							round: race.round,
						}));
					} else {
						setReplayCfg((c) => ({ ...c, year: new Date().getFullYear() }));
					}
				})
				.catch(() => {
					setReplayCfg((c) => ({ ...c, year: new Date().getFullYear() }));
				});
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
		async function fetchCircuits() {
			setCircuitsLoading(true);
			try {
				const res = await getCircuits(replayCfg.year);
				setCircuits(res.data || []);
			} catch {
				setCircuits([]);
			}
			setCircuitsLoading(false);
		}

		if (replayCfg.year) {
			fetchCircuits();
		}
	}, [replayCfg.year]);

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

			if (isAuthenticated && token) {
				logActivity(token, {
					activity_type: 'Prediction',
					title: `${form.driver} Lap Forecast`,
					subtitle: `${form.circuit} · ML Analysis`,
					image_url:
						getCarImage(form.team) ||
						'/images/cars/2026redbullracingcarright.png',
					color_hex: TEAM_COLORS[form.team] || '#3671C6',
					reference_url: '/predict',
				}).catch(console.error);
			}
		} catch (err) {
			const detail = err?.response?.data?.detail;
			const msg =
				typeof detail === 'string' ? detail
				: Array.isArray(detail) ?
					detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
				:	err.message || 'Prediction failed';
			setError(normalizePredictErrorMessage(msg));
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

			if (isAuthenticated && token && data.predictions?.length) {
				logActivity(token, {
					activity_type: 'Simulation',
					title: `Simulation: Round ${replayCfg.round}`,
					subtitle: `${replayCfg.year} Race Replay`,
					image_url: '/images/cars/2026mercedescarright.png',
					color_hex: '#27F4D2',
					reference_url: `/predict?mode=replay&year=${replayCfg.year}&round=${replayCfg.round}`,
				}).catch(console.error);
			}
		} catch (e) {
			const detail = e?.response?.data?.detail;
			const msg =
				typeof detail === 'string' ? detail
				: Array.isArray(detail) ?
					detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
				:	e.message || 'Replay failed';
			setReplayError(normalizePredictErrorMessage(msg));
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

	/* ─── Loading / Error States ─── */
	if (metaLoading) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/90" />
				<div className="relative z-10 flex items-center justify-center pt-32">
					<div className="flex flex-col items-center gap-4">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
						<p className="text-sm text-gray-400">Loading prediction model...</p>
					</div>
				</div>
			</div>
		);
	}

	if (metaError) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-6 pt-24 text-white md:px-12 lg:px-20">
				<div className="fixed inset-0 z-0 bg-black/90" />
				<div className="relative z-10 flex items-center justify-center pt-32">
					<div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-8 text-center backdrop-blur-xl max-w-md">
						<FaInfoCircle className="mx-auto mb-3 text-2xl text-red-500" />
						<h2 className="mb-2 text-xl font-bold">Model Unavailable</h2>
						<p className="text-sm text-gray-400">{metaError}</p>
					</div>
				</div>
			</div>
		);
	}

	/* ─── Main Render ─── */
	return (
		<div className="relative min-h-screen overflow-hidden bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center px-4 pt-20 text-white md:px-12 lg:px-20">
			<div className="fixed inset-0 z-0 bg-black/90" />
			<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_12%,rgba(239,68,68,0.10),transparent_38%),radial-gradient(circle_at_90%_8%,rgba(255,255,255,0.06),transparent_32%)]" />

			<div className="relative z-10 mx-auto max-w-[1440px] pb-16">
				<div className="flex place-content-between backdrop-blur-2xl bg-linear-to-r from-white/10 via-red-100/10 to-black/10 border border-white/10 rounded-xl px-6 py-4 my-8">
					{/* Header */}
					<div className="text-center animate-fade-in flex-1">
						<p className="text-[11px] font-bold uppercase tracking-[0.3em] text-red-400/80">
							Machine Learning Inference
						</p>
						<h1 className="mt-2 text-4xl font-black uppercase tracking-wider md:text-5xl">
							Lap Time <span className="text-red-500">Predictor</span>
						</h1>
					</div>

					{/* Tab Switcher */}
					<div className="my-4 flex items-center justify-center">
						<div className="inline-flex rounded-2xl border border-white/10 bg-black/40 p-1.5 backdrop-blur-xl">
							{[
								{ id: 'manual', label: 'Manual Predict', icon: FaBolt },
								{ id: 'replay', label: 'Race Replay', icon: FaClock },
							].map((tab) => {
								const Icon = tab.icon;
								const active = activeTab === tab.id;
								return (
									<button
										key={tab.id}
										type="button"
										onClick={() => setActiveTab(tab.id)}
										className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
											active ?
												'bg-red-600 text-white shadow-lg shadow-red-600/25'
											:	'text-gray-500 hover:text-gray-300'
										}`}
									>
										<Icon className="text-xs" />
										{tab.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* ─── MANUAL TAB ─── */}
				{activeTab === 'manual' && (
					<div className="grid grid-cols-1 gap-6 animate-fade-in lg:grid-cols-[1fr_380px]">
						<form
							onSubmit={handleSubmit}
							className="space-y-4"
						>
							{/* Session Setup */}
							<FormSection
								icon={<FaFlagCheckered />}
								title="Session Setup"
								accent="border-l-red-500"
							>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<SelectField
										label="Driver"
										value={form.driver}
										onChange={(v) => update('driver', v)}
										options={meta.drivers}
									/>
									<SelectField
										label="Team"
										value={form.team}
										onChange={(v) => update('team', v)}
										options={meta.teams}
									/>
									<CustomSelect
										label="Circuit"
										value={form.circuit}
										onChange={(v) => update('circuit', v)}
										options={meta.circuits}
										renderOption={(opt) => (
											<span className="flex items-center gap-2">
												<span className="text-lg leading-none">
													{getCountryFlag(opt)}
												</span>
												<span>{opt}</span>
											</span>
										)}
									/>
									{/* Compound Selector (pill buttons) */}
									<div>
										<span className="mb-1.5 block text-[11px] uppercase tracking-wider text-gray-500">
											Compound
										</span>
										<div className="flex flex-wrap gap-1.5">
											{(meta.compounds || []).map((cmp) => {
												const color = COMPOUND_COLORS[cmp] || '#888';
												const active = form.compound === cmp;
												return (
													<button
														key={cmp}
														type="button"
														onClick={() => update('compound', cmp)}
														className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
															active ?
																'border-white/30 bg-white/15 text-white'
															:	'border-white/8 bg-white/4 text-gray-500 hover:border-white/15 hover:text-white'
														}`}
													>
														<TyreIcon
															compound={cmp}
															className="w-3.5 h-3.5 shadow-sm rounded-full drop-shadow-black/50"
														/>
														{cmp}
													</button>
												);
											})}
										</div>
									</div>
								</div>
								{circuitBaseline && (
									<div className="mt-3 flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-2 text-xs text-gray-400">
										<FaInfoCircle className="shrink-0 text-cyan-500/60" />
										<span>
											{form.circuit} baseline:{' '}
											<span className="font-mono font-bold text-white">
												{fmtSec(circuitBaseline.mean)}
											</span>{' '}
											avg, best{' '}
											<span className="font-mono font-bold text-green-400">
												{fmtSec(circuitBaseline.min)}
											</span>
										</span>
									</div>
								)}
							</FormSection>

							{/* Tyre Strategy */}
							<FormSection
								icon={<FaTachometerAlt />}
								title="Tyre Strategy"
								accent="border-l-yellow-500"
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

							{/* Race Data */}
							<FormSection
								icon={<FaClock />}
								title="Race Context"
								accent="border-l-cyan-500"
							>
								<div className="mb-4 grid grid-cols-2 gap-4">
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
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
									<NumberField
										label="Previous Lap (s)"
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
										label="2 Laps Ago (s)"
										value={form.prev_lap_2}
										onChange={(v) => update('prev_lap_2', v)}
										min={50}
										max={200}
										step={0.1}
                    required
										placeholder=""
									/>
									<NumberField
										label="3 Laps Ago (s)"
										value={form.prev_lap_3}
										onChange={(v) => update('prev_lap_3', v)}
										min={50}
										max={200}
										step={0.1}
                    required
										placeholder=""
									/>
								</div>
							</FormSection>

							{/* Submit */}
							<button
								type="submit"
								disabled={predicting}
								className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 py-4 text-base font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-500 hover:-translate-y-px disabled:bg-red-900 disabled:cursor-not-allowed"
							>
								{predicting ?
									<>
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										Calculating...
									</>
								:	<>
										<FaBolt />
										Predict Lap Time
									</>
								}
							</button>

							{error && (
								<div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
									<FaInfoCircle className="shrink-0" />
									{error}
								</div>
							)}
						</form>

						{/* Result Panel */}
						<div className="space-y-4">
							{result ?
								<div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl animate-fade-in">
									<div className="bg-linear-to-b from-red-600/15 to-transparent px-6 pb-6 pt-8 text-center">
										<p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-red-400/80">
											Predicted Lap Time
										</p>
										<div className="text-5xl font-black text-white tracking-wider font-mono md:text-6xl">
											{result.predicted_lap_time_str}
										</div>
										<p className="mt-2 font-mono text-sm text-gray-500">
											{result.predicted_lap_time_sec.toFixed(3)}s
										</p>
									</div>
									{/* Model accuracy */}
									{result.model_info && (
										<div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/5">
											<div className="p-4 text-center">
												<p className="text-[10px] uppercase tracking-wider text-gray-500">
													MAE
												</p>
												<p className="mt-1 font-mono text-sm font-bold text-cyan-400">
													{result.model_info.test_mae?.toFixed(3)}s
												</p>
											</div>
											<div className="p-4 text-center">
												<p className="text-[10px] uppercase tracking-wider text-gray-500">
													R²
												</p>
												<p className="mt-1 font-mono text-sm font-bold text-green-400">
													{(result.model_info.test_r2 * 100).toFixed(1)}%
												</p>
											</div>
										</div>
									)}
									{/* Delta vs baseline */}
									{circuitBaseline && (
										<div className="border-t border-white/10 p-4 text-center">
											<p className="text-[10px] uppercase tracking-wider text-gray-500">
												vs Circuit Average
											</p>
											{(() => {
												const delta =
													result.predicted_lap_time_sec - circuitBaseline.mean;
												return (
													<p
														className={`mt-1 font-mono text-lg font-black ${delta > 0 ? 'text-red-400' : 'text-green-400'}`}
													>
														{delta > 0 ? '+' : ''}
														{delta.toFixed(3)}s
													</p>
												);
											})()}
										</div>
									)}
								</div>
							:	<div className="rounded-2xl border border-white/10 bg-black/50 p-10 text-center backdrop-blur-xl">
									<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
										<FaTachometerAlt className="text-2xl text-gray-700" />
									</div>
									<h3 className="mb-2 text-lg font-bold text-gray-400">
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

				{/* ─── REPLAY TAB ─── */}
				{activeTab === 'replay' && (
					<div className="animate-fade-in space-y-6">
						<div className="relative z-30 rounded-2xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl transition-all duration-300">
							<p className="mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-red-400/80">
								Simulation Config
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
								<CustomSelect
									label="Season"
									value={replayCfg.year}
									onChange={(v) => setReplayCfg((c) => ({ ...c, year: v }))}
									options={Array.from(
										{ length: 8 },
										(_, i) => new Date().getFullYear() - i
									).map((y) => ({ value: y, label: `${y} Season` }))}
									getOptionValue={(opt) => opt.value}
									renderOption={(opt) => opt.label}
								/>

								<div className="lg:col-span-2">
									<CustomSelect
										label="Grand Prix"
										value={replayCfg.round}
										onChange={(v) => setReplayCfg((c) => ({ ...c, round: v }))}
										options={circuits.map((c) => ({
											value: c.round,
											label: `R${c.round} ${c.event}`,
											country: c.country || c.circuit || c.event,
										}))}
										disabled={circuitsLoading}
										placeholder={
											circuitsLoading ?
												'Loading circuits...'
											:	'Select Grand Prix'
										}
										getOptionValue={(opt) => opt.value}
										renderOption={(opt) => (
											<span className="flex items-center gap-2">
												<span className="text-lg leading-none">
													{getCountryFlag(opt.country)}
												</span>
												<span>{opt.label}</span>
											</span>
										)}
									/>
								</div>

								<NumberField
									label="Start Lap"
									value={replayCfg.start_lap || 4}
									onChange={(v) =>
										setReplayCfg((c) => ({ ...c, start_lap: v || 4 }))
									}
									min={4}
									max={80}
								/>

								<SelectField
									label="Driver Filter"
									value={replayCfg.driver}
									onChange={(v) => setReplayCfg((c) => ({ ...c, driver: v }))}
									options={['', ...(meta?.drivers || [])]}
								/>

								<div className="lg:col-span-1">
									<button
										type="button"
										onClick={runReplaySimulation}
										disabled={!replayCfg.round || replayLoading}
										className="w-full h-[42px] flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-red-600/20 disabled:shadow-none"
									>
										{replayLoading ?
											<>
												<div className="h-2.5 w-2.5 rounded-full bg-white/80 animate-pulse" />
												Loading
											</>
										: !replayCfg.round ?
											<>Select a Race</>
										:	<>
												<FaPlay className="text-xs" />
												Load Race
											</>
										}
									</button>
								</div>
							</div>
							{replayLoading && (
								<div className="mt-5 text-center">
									<div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10">
										<div className="h-3 w-20 rounded-full bg-white/10 overflow-hidden">
											<div className="h-full w-1/2 bg-red-500/60 animate-pulse" />
										</div>
										<span className="text-xs text-gray-400">
											Loading race data. First load may take 30-60 seconds.
										</span>
									</div>
								</div>
							)}
						</div>

						{replayError && (
							<div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
								<FaInfoCircle className="shrink-0" />
								{replayError}
							</div>
						)}

						{replayData && replayLapRange && (
							<div className="relative z-10 space-y-4">
								<div className="rounded-2xl border border-white/10 bg-black/50 p-5 backdrop-blur-xl space-y-4">
									<div className="flex flex-col gap-4 justify-between md:flex-row md:items-center">
										<div className="text-sm text-gray-500">
											<span className="font-bold text-white">
												{replayData.event}
											</span>{' '}
											({replayData.year} R{replayData.round})
											{replayData.mae_sec != null && (
												<span className="ml-3 text-xs text-cyan-400">
													MAE: {replayData.mae_sec}s
												</span>
											)}
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => setReplayPlaying((p) => !p)}
												className="flex items-center gap-2 rounded-xl bg-white/6 px-4 py-2 text-sm font-bold hover:bg-white/10"
											>
												{replayPlaying ?
													<FaPause />
												:	<FaPlay />}{' '}
												{replayPlaying ? 'Pause' : 'Play'}
											</button>
											{[1, 2, 4].map((s) => (
												<button
													key={s}
													type="button"
													onClick={() => setReplaySpeed(s)}
													className={`rounded-xl px-3 py-2 text-xs font-bold ${replaySpeed === s ? 'border border-red-500/30 bg-red-600/30 text-red-300' : 'bg-white/6 text-gray-400 hover:text-white'}`}
												>
													{s}x
												</button>
											))}
										</div>
									</div>

									<div>
										<div className="mb-2 flex items-center justify-between text-xs text-gray-500">
											<span>Replay Lap</span>
											<span className="font-mono font-bold text-white">
												L{replayLap}
											</span>
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

								{/* Replay Cards */}
								<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
									{replayLapRows.map((p, idx) => {
										const teamColor = TEAM_COLORS[p.team] || '#666';
										const delta =
											p.actual_lap_time_sec != null ?
												p.predicted_lap_time_sec - p.actual_lap_time_sec
											:	null;
										return (
											<div
												key={`${p.driver}_${p.predicted_lap}_${idx}`}
												className="overflow-hidden rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl"
												style={{
													borderLeftColor: teamColor,
													borderLeftWidth: 3,
												}}
											>
												<div className="p-4 relative overflow-hidden group">
													{getCarImage(p.team) && (
														<Image
															src={getCarImage(p.team)}
															width={224}
															height={112}
															className="absolute right-0 bottom-0 h-28 opacity-10 object-contain translate-y-3 translate-x-2 pointer-events-none transition-transform duration-700 group-hover:scale-105"
															alt="Car UI background"
														/>
													)}
													<div className="mb-3 flex items-center justify-between relative z-10">
														<div className="flex items-center gap-3">
															<Image
																src={getDriverImage(p.driver)}
																width={44}
																height={44}
																onError={(e) =>
																	(e.currentTarget.style.display = 'none')
																}
																className="w-11 h-11 object-cover rounded-full bg-black/40 border border-white/10 shadow-md"
																alt={p.driver}
															/>
															<div>
																<p
																	className="text-lg font-black tracking-wide"
																	style={{ color: teamColor }}
																>
																	{p.driver}
																</p>
																<p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
																	P{p.position} · {p.team}
																</p>
															</div>
														</div>
														<div className="text-right">
															<p className="text-[10px] uppercase text-gray-600">
																Predicted
															</p>
															<p className="font-mono font-bold text-white">
																{p.predicted_lap_time_str}
															</p>
														</div>
													</div>
													<div className="grid grid-cols-2 gap-2 text-xs">
														<div className="flex justify-between text-gray-500">
															<span>Context</span>
															<span className="text-white">
																L{p.context_lap}
															</span>
														</div>
														<div className="flex justify-between text-gray-500">
															<span>Compound</span>
															<span className="inline-flex items-center gap-1.5 text-white font-bold">
																<TyreIcon
																	compound={p.compound}
																	className="w-3.5 h-3.5 shadow-sm rounded-full"
																/>
																{p.compound}
															</span>
														</div>
														<div className="flex justify-between text-gray-500">
															<span>Actual</span>
															<span className="font-mono text-white">
																{p.actual_lap_time_sec != null ?
																	fmtSec(p.actual_lap_time_sec)
																:	'-'}
															</span>
														</div>
														<div className="flex justify-between text-gray-500">
															<span>Error</span>
															<span
																className={`font-mono ${
																	delta == null ? 'text-gray-500'
																	: delta > 0 ? 'text-red-400'
																	: 'text-green-400'
																}`}
															>
																{delta == null ?
																	'-'
																:	`${delta > 0 ? '+' : ''}${delta.toFixed(3)}s`}
															</span>
														</div>
													</div>
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

/* ─── Helper Components ─── */

function FormSection({ icon, title, accent = 'border-l-red-500', children }) {
	return (
		<div
			className={`rounded-2xl border border-white/10 bg-black/50 p-5 backdrop-blur-xl border-l-[3px] ${accent} transition-colors duration-300 hover:border-white/15`}
		>
			<div className="mb-4 flex items-center gap-2.5">
				<span className="text-sm text-red-500/70">{icon}</span>
				<h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
					{title}
				</h3>
				<div className="h-px flex-1 bg-linear-to-r from-white/10 to-transparent" />
			</div>
			{children}
		</div>
	);
}

function SelectField({ label, value, onChange, options }) {
	return (
		<label className="block">
			<span className="mb-1.5 block text-[11px] uppercase tracking-wider text-gray-500">
				{label}
			</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm text-white transition-all focus:border-red-600/50 focus:outline-none focus:ring-1 focus:ring-red-600/20"
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
			<span className="mb-1.5 block text-[11px] uppercase tracking-wider text-gray-500">
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
				className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm text-white transition-all placeholder:text-gray-700 focus:border-red-600/50 focus:outline-none focus:ring-1 focus:ring-red-600/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			/>
		</label>
	);
}
