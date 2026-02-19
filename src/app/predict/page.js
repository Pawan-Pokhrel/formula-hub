'use client';

import { getPredictionMetadata, predictLapTime } from '@/lib/api/predictionApi';
import { useEffect, useState } from 'react';
import { FaBolt, FaClock, FaInfoCircle } from 'react-icons/fa';

/* ================================================================== */
/*  Prediction Page                                                     */
/* ================================================================== */

export default function PredictPage() {
	/* ── metadata from backend ── */
	const [meta, setMeta] = useState(null);
	const [metaLoading, setMetaLoading] = useState(true);
	const [metaError, setMetaError] = useState(null);

	/* ── form state ── */
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

	/* ── result / loading ── */
	const [result, setResult] = useState(null);
	const [predicting, setPredicting] = useState(false);
	const [error, setError] = useState(null);

	/* ── Fetch metadata on mount ── */
	useEffect(() => {
		getPredictionMetadata()
			.then((m) => {
				setMeta(m);
				setForm((f) => ({
					...f,
					driver: m.drivers[0] || '',
					team: m.teams[0] || '',
					circuit: m.circuits[0] || '',
					compound: m.compounds[1] || 'MEDIUM',
				}));
			})
			.catch((e) => setMetaError(e.message || 'Failed to load model metadata'))
			.finally(() => setMetaLoading(false));
	}, []);

	/* ── Update field ── */
	const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

	/* ── Submit prediction ── */
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
		if (form.prev_lap_2) payload.prev_lap_2 = Number(form.prev_lap_2);
		if (form.prev_lap_3) payload.prev_lap_3 = Number(form.prev_lap_3);

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

	/* ── Format seconds nicely ── */
	const fmtSec = (s) => {
		const m = Math.floor(s / 60);
		const sec = (s % 60).toFixed(3);
		return `${m}:${sec.padStart(6, '0')}`;
	};

	/* ── Loading / error states ── */
	if (metaLoading) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
				<div className="fixed inset-0 bg-black/80 z-0" />
				<div className="relative z-10 text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mx-auto mb-4" />
					<p className="text-gray-400">Loading prediction model…</p>
				</div>
			</div>
		);
	}

	if (metaError) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
				<div className="fixed inset-0 bg-black/80 z-0" />
				<div className="relative z-10 text-center max-w-md">
					<FaInfoCircle className="text-red-500 text-4xl mx-auto mb-4" />
					<h2 className="text-xl font-bold mb-2">Model Unavailable</h2>
					<p className="text-gray-400">{metaError}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />

			<div className="relative z-10 max-w-5xl mx-auto pb-16">
				{/* ── Header ── */}
				<div className="text-center mb-10 animate-fade-in">
					<h1 className="text-4xl font-bold uppercase tracking-wider flex items-center justify-center gap-4 mb-3">
						<FaBolt className="text-red-600" />
						Lap Time Predictor
					</h1>
					<p className="text-gray-400 max-w-xl mx-auto">
						Predict lap times using our XGBoost ML model trained on{' '}
						<span className="text-white font-semibold">
							{meta.training_info.total_laps?.toLocaleString()}
						</span>{' '}
						laps from {meta.training_info.seasons?.join(' & ')} seasons.
					</p>
					<div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
						<span>
							MAE:{' '}
							<span className="text-green-400 font-bold">
								{meta.training_info.test_mae?.toFixed(3)}s
							</span>
						</span>
						<span>
							R²:{' '}
							<span className="text-green-400 font-bold">
								{(meta.training_info.test_r2 * 100)?.toFixed(1)}%
							</span>
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 animate-fade-in">
					{/* ── LEFT: Input Form ── */}
					<form
						onSubmit={handleSubmit}
						className="space-y-6"
					>
						{/* Row: Driver · Team · Circuit */}
						<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
							<h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
								Race Context
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
								<SelectField
									label="Circuit"
									value={form.circuit}
									onChange={(v) => update('circuit', v)}
									options={meta.circuits}
								/>
							</div>
						</div>

						{/* Row: Tyre info */}
						<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
							<h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
								Tyre Data
							</h3>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								<SelectField
									label="Compound"
									value={form.compound}
									onChange={(v) => update('compound', v)}
									options={meta.compounds}
								/>
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
						</div>

						{/* Row: Race info */}
						<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
							<h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
								Race Position
							</h3>
							<div className="grid grid-cols-2 gap-4">
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
						</div>

						{/* Row: Previous laps */}
						<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
							<h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
								Previous Laps (seconds)
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<NumberField
									label="Previous Lap *"
									value={form.prev_lap_1}
									onChange={(v) => update('prev_lap_1', v)}
									min={50}
									max={200}
									step={0.1}
									required
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
						</div>

						{/* Submit */}
						<button
							type="submit"
							disabled={predicting}
							className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed rounded-xl text-lg font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-3"
						>
							{predicting ?
								<>
									<div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
									Predicting…
								</>
							:	<>
									<FaBolt />
									Predict Lap Time
								</>
							}
						</button>

						{error && (
							<div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
								{error}
							</div>
						)}
					</form>

					{/* ── RIGHT: Result Panel ── */}
					<div className="space-y-6">
						{result ?
							<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 animate-fade-in">
								{/* Big predicted time */}
								<div className="text-center mb-6">
									<p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
										Predicted Lap Time
									</p>
									<div className="text-5xl font-bold font-mono text-white tracking-wider">
										{result.predicted_lap_time_str}
									</div>
									<p className="text-sm text-gray-400 mt-2">
										{result.predicted_lap_time_sec.toFixed(3)} seconds
									</p>
								</div>

								{/* Inputs summary */}
								<div className="border-t border-white/10 pt-4 space-y-2">
									<p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
										Input Summary
									</p>
									{Object.entries(result.inputs_used).map(([key, val]) => (
										<div
											key={key}
											className="flex justify-between text-sm"
										>
											<span className="text-gray-400 capitalize">
												{key.replace(/_/g, ' ')}
											</span>
											<span className="text-white font-medium">
												{typeof val === 'number' ? val.toFixed(1) : val}
											</span>
										</div>
									))}
								</div>

								{/* Model info */}
								<div className="border-t border-white/10 pt-4 mt-4">
									<p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
										Model Accuracy
									</p>
									<div className="grid grid-cols-2 gap-4 text-center">
										<div className="bg-white/5 rounded-lg p-3">
											<p className="text-xs text-gray-500">MAE</p>
											<p className="text-lg font-bold text-green-400">
												±{result.model_info.test_mae?.toFixed(3)}s
											</p>
										</div>
										<div className="bg-white/5 rounded-lg p-3">
											<p className="text-xs text-gray-500">R² Score</p>
											<p className="text-lg font-bold text-green-400">
												{(result.model_info.test_r2 * 100)?.toFixed(1)}%
											</p>
										</div>
									</div>
								</div>
							</div>
						:	/* Empty state */
							<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
								<FaClock className="text-4xl text-gray-700 mx-auto mb-4" />
								<h3 className="text-lg font-bold text-gray-400 mb-2">
									Prediction Result
								</h3>
								<p className="text-sm text-gray-500">
									Fill in the race parameters and click{' '}
									<strong className="text-red-400">Predict</strong> to see the
									estimated lap time.
								</p>
							</div>
						}

						{/* Info box */}
						<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
							<div className="flex items-start gap-3">
								<FaInfoCircle className="text-gray-500 mt-0.5 shrink-0" />
								<div className="text-xs text-gray-500 space-y-1">
									<p>
										<strong className="text-gray-400">Tip:</strong> For best
										accuracy, provide all three previous lap times. The model
										uses rolling averages and degradation rates from recent
										laps.
									</p>
									<p>
										Predictions are based on an XGBoost model with 33 engineered
										features covering tyre, fuel, and circuit characteristics.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ================================================================== */
/*  Reusable form components                                            */
/* ================================================================== */

function SelectField({ label, value, onChange, options }) {
	return (
		<label className="block">
			<span className="text-xs text-gray-400 mb-1 block">{label}</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
			>
				{options.map((opt) => (
					<option
						key={opt}
						value={opt}
						className="bg-gray-900 text-white"
					>
						{opt}
					</option>
				))}
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
			<span className="text-xs text-gray-400 mb-1 block">{label}</span>
			<input
				type="number"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				min={min}
				max={max}
				step={step}
				required={required}
				placeholder={placeholder}
				className="w-full bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			/>
		</label>
	);
}
