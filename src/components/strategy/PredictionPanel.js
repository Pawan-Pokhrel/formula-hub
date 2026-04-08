import {
	FaArrowDown,
	FaArrowUp,
	FaBrain,
	FaExclamationTriangle,
	FaFlag,
} from 'react-icons/fa';

import TyreIcon from '@/components/common/TyreIcon';
import { getTeamLogoPath } from '@/components/schedule/scheduleHelpers';
import { getCarImage, getDriverImage } from '@/utils/f1_images';
import { COMPOUND_COLORS, COMPOUND_SHORT, URGENCY_CONFIG } from './constants';

function MiniStat({ label, value, color, sub, icon }) {
	return (
		<div className="bg-white/10 rounded-lg px-3 py-1.5 text-center flex flex-col items-center justify-center min-w-[50px] border border-white/10">
			<p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">
				{label}
			</p>
			{icon ?
				icon
			:	<p
					className="text-sm font-bold tabular-nums"
					style={{ color: color || '#fff' }}
				>
					{value}
				</p>
			}
			{sub && <p className="text-[9px] text-gray-600">{sub}</p>}
		</div>
	);
}

function GapCard({ icon: Icon, label, value }) {
	const formatted =
		value != null ?
			typeof value === 'number' ?
				`${value > 0 ? '+' : ''}${value.toFixed(1)}s`
			:	value
		:	'--';

	return (
		<div className="bg-white/8 rounded-lg p-3 border border-white/10">
			<div className="flex items-center gap-1.5 mb-1">
				<Icon className="text-[10px] text-gray-600" />
				<span className="text-[10px] uppercase tracking-widest text-gray-500">
					{label}
				</span>
			</div>
			<p className="text-sm font-bold text-white tabular-nums">{formatted}</p>
		</div>
	);
}

function CompoundDenotation({ compound }) {
	const key = String(compound || 'UNKNOWN').toUpperCase();
	const color = COMPOUND_COLORS[key] || '#666';
	const shortLabel = COMPOUND_SHORT[key] || '?';

	return (
		<div
			className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black"
			style={{ borderColor: color, color }}
		>
			{shortLabel}
		</div>
	);
}

export default function PredictionPanel({
	prediction,
	heuristic,
	loading,
	selectedDriver,
	driverInfo,
	currentLap,
	raceData,
}) {
	if (!selectedDriver) {
		return (
			<div className="bg-linear-to-b from-black/55 to-black/45 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px] shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
				<FaFlag className="text-3xl text-gray-600 mb-3" />
				<p className="text-sm text-gray-500">
					Select a driver from the timing tower
				</p>
			</div>
		);
	}

	const mlData = prediction?.prediction;
	const currentState = prediction?.current_state || {};
	const gapInfo = prediction?.gap_analysis || {};
	const compoundProbs = mlData?.compound_probabilities || {};
	const paceVsField = Number(
		prediction?.pace_vs_field ?? mlData?.pace_vs_field ?? 0
	);
	const performanceCoeff = Number(
		mlData?.car_performance_coeff ?? prediction?.car_performance_coeff ?? 1
	);
	const dirtyAirAlert = Boolean(
		mlData?.dirty_air_alert ?? prediction?.dirty_air_alert
	);
	const projectedRejoinGap = Number(
		mlData?.projected_rejoin_gap_ahead ??
			prediction?.projected_rejoin_gap_ahead ??
			gapInfo?.projected_rejoin_gap_ahead ??
			99
	);
	const vscOngoing = (raceData?.flags || [])
		.filter((f) => f.lap === currentLap)
		.some((f) => f.type === 'VSC' || f.type === 'SC');
	const totalLaps = Number(raceData?.circuit_info?.total_laps || 0);
	const remainingLaps = Math.max(0, totalLaps - Number(currentLap || 0));
	const raceComplete = totalLaps > 0 && Number(currentLap || 0) >= totalLaps;
	const finishWindow = totalLaps > 0 && remainingLaps <= 1;
	const vscPrimeWindow = Boolean(
		!finishWindow &&
		(mlData?.vsc_optimal_window ?? (vscOngoing && currentState.tyre_age > 8))
	);
	const teammateConflict = Boolean(
		mlData?.teammate_conflict || Number(mlData?.double_stack_penalty || 0) > 0
	);

	let urgency = mlData?.pit_urgency || mlData?.urgency || 'STAY OUT';
	let urgencyConfig =
		URGENCY_CONFIG[urgency.replace(/\s+/g, '_')] || URGENCY_CONFIG.STAY_OUT;

	if (vscPrimeWindow) {
		urgency = 'PIT NOW (VSC)';
		urgencyConfig = {
			bg: 'from-yellow-600/30 to-yellow-900/30',
			border: 'border-yellow-500/60',
			text: 'text-yellow-300',
			pulse: true,
		};

		if (finishWindow) {
			urgency = raceComplete ? 'RACE COMPLETE' : 'HOLD TO FINISH';
			urgencyConfig = {
				bg: 'from-sky-600/20 to-sky-900/20',
				border: 'border-sky-500/40',
				text: 'text-sky-300',
				pulse: false,
			};
		}
	}

	const lapsToPit = finishWindow ? '--' : (mlData?.laps_to_pit ?? '--');
	const compound = mlData?.recommended_compound || '--';
	const confidence =
		mlData?.confidence ? (mlData.confidence * 100).toFixed(0) : '--';
	const teamLogo = getTeamLogoPath(driverInfo?.team);
	const driverImage = getDriverImage(selectedDriver);
	const carImage = getCarImage(driverInfo?.team);

	const heuristicSection =
		heuristic ?
			<div
				className="relative overflow-hidden rounded-xl border border-blue-500/40 bg-linear-to-b from-blue-600/20 to-blue-900/20 p-4 transition-all duration-500 drop-shadow-lg"
				title="Real-time race telemetry heuristic strategy calculation"
			>
				<div className="absolute inset-0 bg-blue-500/10 animate-pulse opacity-30 pointer-events-none" />
				<div className="relative flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">
							Heuristic Strategy Call
						</p>
					</div>
					<div className="flex justify-between items-end">
						<span className="text-xl font-black tracking-wider text-white uppercase">
							{heuristic.action || '--'}
						</span>
					</div>
					{heuristic.reason && (
						<p className="text-blue-200/80 text-[11px] mt-1 font-medium bg-blue-950/40 p-2 rounded border border-blue-500/20 shadow-inner">
							{heuristic.reason}
						</p>
					)}
				</div>
			</div>
		:	<div className="bg-white/8 rounded-lg p-3 text-xs text-gray-400 border border-white/10">
				Heuristic recommendation unavailable for this lap.
			</div>;

	return (
		<div className="bg-linear-to-b from-black/55 to-black/45 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.42)]">
			<div
				className="relative px-5 py-4 border-b border-white/10 overflow-hidden group"
				style={{ borderTop: `3px solid ${driverInfo?.color || '#666'}` }}
			>
				{carImage && (
					<img
						src={carImage}
						alt="Car"
						className="absolute -right-4 -bottom-6 h-28 opacity-25 object-contain drop-shadow-2xl pointer-events-none transition-transform duration-700 group-hover:scale-105"
					/>
				)}
				<div className="flex items-center justify-between relative z-10">
					<div className="flex items-center gap-3">
						{driverImage ?
							<img
								src={driverImage}
								onError={(e) => {
									e.currentTarget.style.display = 'none';
								}}
								className="w-12 h-12 object-cover rounded-full bg-black/40 border border-white/20 shadow-xl"
								alt={selectedDriver}
							/>
						:	<div className="w-12 h-12 rounded-full bg-black/40 border border-white/20 shadow-xl flex items-center justify-center text-xs font-black tracking-wider text-gray-300">
								{selectedDriver}
							</div>
						}
						<div>
							<h3 className="text-white font-black text-lg tracking-wider relative -bottom-0.5">
								{selectedDriver}
							</h3>
							<div className="flex items-center gap-1.5">
								{teamLogo && (
									<img
										src={teamLogo}
										alt={driverInfo?.team || 'Team'}
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
										className="h-3.5 w-3.5 object-contain"
									/>
								)}
								<p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
									{driverInfo?.team || 'Unknown Team'}
								</p>
							</div>
						</div>
					</div>
					<div className="flex gap-2">
						<MiniStat
							label="POS"
							value={currentState.position || '--'}
						/>
						<MiniStat
							label="TYRE"
							icon={
								<TyreIcon
									compound={currentState.compound}
									className="w-5 h-5 mx-auto"
									sizeLabel={true}
								/>
							}
						/>
						<MiniStat
							label="STOPS"
							value={currentState.stops_done ?? '--'}
						/>
					</div>
				</div>
			</div>

			<div className="p-5 space-y-4">
				{!mlData ?
					<div className="space-y-4">
						<div className="flex flex-col items-center justify-center py-6 text-gray-600">
							<FaBrain className="text-2xl mb-2" />
							<p className="text-sm">ML prediction unavailable for this lap</p>
							<p className="text-xs text-gray-700 mt-1">
								Using heuristic recommendation as fallback
							</p>
						</div>
						{heuristicSection}
					</div>
				:	<div className="animate-fade-in space-y-4">
						{heuristicSection}

						<div
							className={`rounded-xl border border-white/5 bg-white/5 p-4 transition-all duration-500`}
							title="Secondary Machine Learning prediction base"
						>
							<div className="relative flex items-center justify-between">
								<div>
									<p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">
										ML Base Strategy
									</p>
									<p
										className={`text-lg font-bold tracking-wider ${urgencyConfig.text}`}
									>
										{urgency}
									</p>
								</div>
								<div className="text-right">
									<p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">
										Laps to Pit
									</p>
									<p className={`text-2xl font-bold tabular-nums text-white`}>
										{typeof lapsToPit === 'number' ?
											Math.round(lapsToPit)
										:	lapsToPit}
									</p>
								</div>
							</div>
						</div>

						{vscPrimeWindow && (
							<div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 animate-pulse">
								<span className="text-xl">\uD83D\uDEA8</span>
								<span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
									VSC Prime Pit Opportunity detected by race context model.
									{finishWindow && (
										<div className="bg-sky-500/10 border border-sky-500/25 rounded-lg px-3 py-2 text-xs text-sky-300 flex items-center gap-2">
											<FaFlag className="text-sky-300" />
											{raceComplete ?
												'Race finished. Strategy locked.'
											:	'Final lap window. Pit recommendation disabled.'}
										</div>
									)}
								</span>
							</div>
						)}

						<div
							className="grid grid-cols-2 gap-3"
							title="Advanced Track Telemetry Metrics"
						>
							<div className="bg-white/5 rounded-xl block p-3 border border-white/5">
								<p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">
									Clear Air Projection
								</p>
								<div className="flex items-center gap-2 mt-1">
									<div
										className={`h-2 w-2 rounded-full ${dirtyAirAlert ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
									/>
									<p className="text-sm font-black tracking-wide text-white">
										{dirtyAirAlert ? 'DIRTY AIR AHEAD' : 'TRAFFIC CLEAR'}
									</p>
								</div>
								<p className="text-[10px] text-gray-500 mt-1 font-medium">
									Projected rejoin gap: {projectedRejoinGap.toFixed(2)}s
								</p>
							</div>
							<div className="bg-white/5 rounded-xl p-3 border border-white/5">
								<p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">
									Team Pace Index
								</p>
								<div className="flex items-center gap-2 mt-1">
									<p
										className={`text-sm font-black tracking-wide ${paceVsField < 0 ? 'text-green-400' : 'text-gray-300'}`}
									>
										{paceVsField.toFixed(3)}s
									</p>
									<span className="text-[10px] text-gray-500 font-bold uppercase">
										vs Median
									</span>
									<span className="text-[10px] text-blue-300 font-bold uppercase">
										Coeff {performanceCoeff.toFixed(3)}
									</span>
								</div>
							</div>
						</div>

						{teammateConflict && (
							<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400 flex items-center gap-2">
								<FaExclamationTriangle className="text-amber-500" />
								Teammate double-stack risk detected. Consider offsetting stop
								lap.
							</div>
						)}

						<div
							className="flex items-center justify-between bg-white/3 rounded-xl p-4 border border-white/5 transition-all duration-500 hover:bg-white/5"
							title="The mathematically optimal tyre compound to switch to"
						>
							<div>
								<p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-2">
									Recommended Compound
								</p>
								<div className="flex items-center gap-3">
									<TyreIcon
										compound={compound}
										className="w-10 h-10 -ml-0.5 drop-shadow-xl hover:scale-105 transition-transform"
									/>
									<span className="text-white font-black text-lg tracking-wide uppercase">
										{compound}
									</span>
								</div>
							</div>
							<div
								className="text-right"
								title="ML Model Confidence Score for this recommendation"
							>
								<p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">
									Confidence
								</p>
								<p className="text-xl font-bold text-white">
									{confidence}
									<span className="text-xs text-gray-500">%</span>
								</p>
							</div>
						</div>

						{Object.keys(compoundProbs).length > 0 && (
							<div className="space-y-2">
								<p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">
									Compound Probabilities
								</p>
								{Object.entries(compoundProbs)
									.sort((a, b) => b[1] - a[1])
									.map(([comp, prob]) => (
										<div
											key={comp}
											className="flex items-center gap-2"
										>
											<CompoundDenotation compound={comp} />
											<span className="text-[11px] font-medium text-gray-300 w-16 capitalize">
												{comp}
											</span>
											<div className="flex-1 bg-white/5 rounded-full h-2">
												<div
													className="h-full rounded-full transition-all duration-500"
													style={{
														width: `${(prob * 100).toFixed(0)}%`,
														backgroundColor: COMPOUND_COLORS[comp] || '#666',
													}}
												/>
											</div>
											<span className="text-xs text-gray-500 tabular-nums w-10 text-right">
												{(prob * 100).toFixed(0)}%
											</span>
										</div>
									))}
							</div>
						)}

						{Object.keys(gapInfo).length > 0 && (
							<div className="space-y-2">
								<p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">
									Gap Analysis
								</p>
								<div className="grid grid-cols-2 gap-2">
									<GapCard
										icon={FaArrowUp}
										label="Gap Ahead"
										value={gapInfo.gap_ahead}
									/>
									<GapCard
										icon={FaArrowDown}
										label="Gap Behind"
										value={gapInfo.gap_behind}
									/>
								</div>

								{gapInfo.in_undercut_window && (
									<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400 flex items-center gap-2">
										<FaExclamationTriangle className="text-amber-500" />
										Driver behind in undercut window!
									</div>
								)}
							</div>
						)}
					</div>
				}
			</div>
		</div>
	);
}
