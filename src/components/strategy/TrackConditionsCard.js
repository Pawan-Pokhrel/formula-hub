import {
	getCountryCode,
	getTrackImagePath,
} from '@/components/schedule/scheduleHelpers';
import Image from 'next/image';
import {
	FaCloudSun,
	FaExclamationTriangle,
	FaRoad,
	FaTint,
	FaTools,
	FaWind,
} from 'react-icons/fa';

function WeatherStat({ icon: Icon, label, value }) {
	return (
		<div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
			<p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
				{label}
			</p>
			<div className="flex items-center gap-2 text-white">
				<Icon className="text-gray-400" />
				<span className="text-sm font-bold tabular-nums">{value}</span>
			</div>
		</div>
	);
}

function mapFlagState(flagType) {
	const key = String(flagType || '').toUpperCase();
	if (key === 'SC') {
		return {
			label: 'Safety Car',
			className: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
		};
	}
	if (key === 'VSC') {
		return {
			label: 'Virtual Safety Car',
			className: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
		};
	}
	if (key === 'RED') {
		return {
			label: 'Red Flag',
			className: 'border-red-500/40 bg-red-500/15 text-red-300',
		};
	}
	return {
		label: 'Green Flag',
		className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
	};
}

export default function TrackConditionsCard({
	raceData,
	currentLap,
	currentFlags,
	prediction,
	heuristic,
}) {
	if (!raceData?.circuit_info) return null;

	const ci = raceData.circuit_info;
	const totalLaps = Number(ci.total_laps || 1);
	const lap = Number(currentLap || 1);
	const trackImage = getTrackImagePath({ event: ci.event });
	const countryCode = getCountryCode(ci.country || '');

	const weatherSeries = Array.isArray(raceData.weather) ? raceData.weather : [];
	const weatherIndex =
		weatherSeries.length <= 1 ?
			0
		:	Math.max(
				0,
				Math.min(
					weatherSeries.length - 1,
					Math.round(
						((lap - 1) / Math.max(totalLaps - 1, 1)) *
							(weatherSeries.length - 1)
					)
				)
			);
	const weatherNow = weatherSeries[weatherIndex] || null;

	const pitLoss = Number(ci.pit_loss_sec || 0);
	const effectivePitLoss = Number(
		prediction?.gap_analysis?.effective_pit_loss ??
			prediction?.prediction?.effective_pit_loss ??
			pitLoss
	);
	const tyreStress = Number(ci.tyre_stress || 0);
	const scProbability = Number(ci.sc_probability || 0);
	const flagState = mapFlagState(currentFlags?.[0]?.type);

	return (
		<div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/62 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.42)]">
			{trackImage && (
				<Image
					src={trackImage}
					alt={ci.event || 'Circuit'}
					fill
					onError={(e) => {
						e.currentTarget.style.display = 'none';
					}}
					className="object-cover opacity-20"
				/>
			)}
			<div className="absolute inset-0 bg-linear-to-b from-black/78 via-black/82 to-black/90" />

			<div className="relative p-4 space-y-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mb-1">
							Track Conditions
						</p>
						<h3 className="text-sm font-black text-white uppercase tracking-wider">
							{ci.event || 'Race Context'}
						</h3>
						<p className="text-[11px] text-gray-400 mt-1">
							Lap {lap} of {totalLaps}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{countryCode && (
							<Image
								src={`/images/flags/${countryCode}.png`}
								alt={ci.country || 'Country'}
								width={24}
								height={16}
								onError={(e) => {
									e.currentTarget.style.display = 'none';
								}}
								className="h-4 w-6 rounded-xs object-cover border border-white/20"
							/>
						)}
						<span
							className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${flagState.className}`}
						>
							{flagState.label}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<WeatherStat
						icon={FaCloudSun}
						label="Track Temp"
						value={
							weatherNow ?
								`${Number(weatherNow.track_temp || 0).toFixed(1)} C`
							:	'--'
						}
					/>
					<WeatherStat
						icon={FaTint}
						label="Humidity"
						value={
							weatherNow ?
								`${Number(weatherNow.humidity || 0).toFixed(0)}%`
							:	'--'
						}
					/>
					<WeatherStat
						icon={FaWind}
						label="Wind"
						value={
							weatherNow ?
								`${Number(weatherNow.wind_speed || 0).toFixed(1)} m/s`
							:	'--'
						}
					/>
					<WeatherStat
						icon={FaTools}
						label="Pit Loss"
						value={`${effectivePitLoss.toFixed(1)}s`}
					/>
				</div>

				<div className="grid grid-cols-2 gap-2 text-[11px]">
					<div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
						<p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
							Tyre Stress
						</p>
						<p className="text-white font-bold tabular-nums">
							{tyreStress.toFixed(2)}
						</p>
					</div>
					<div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
						<p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
							SC Probability
						</p>
						<p className="text-white font-bold tabular-nums">
							{Math.round(scProbability * 100)}%
						</p>
					</div>
				</div>

				{heuristic?.action && (
					<div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
						<p className="text-[10px] uppercase tracking-wider text-blue-300 mb-1">
							Current Engineer Call
						</p>
						<p className="text-xs font-bold text-white uppercase tracking-wide">
							{heuristic.action}
						</p>
					</div>
				)}

				{Number.isFinite(pitLoss) && effectivePitLoss < pitLoss && (
					<div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
						<FaRoad className="text-emerald-300" />
						Effective pit loss reduced by neutralization window.
					</div>
				)}

				{currentFlags?.length > 0 && (
					<div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
						<FaExclamationTriangle className="text-amber-300" />
						{currentFlags[0]?.message || 'Race control event active.'}
					</div>
				)}
			</div>
		</div>
	);
}
