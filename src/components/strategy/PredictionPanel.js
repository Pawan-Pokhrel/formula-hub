import {
	FaArrowDown,
	FaArrowUp,
	FaBrain,
	FaExclamationTriangle,
	FaFlag,
} from 'react-icons/fa';

import { COMPOUND_COLORS, COMPOUND_SHORT, URGENCY_CONFIG } from './constants';

function MiniStat({ label, value, color, sub }) {
	return (
		<div className="bg-white/5 rounded-lg px-3 py-1.5 text-center">
			<p className="text-[9px] uppercase tracking-widest text-gray-600">
				{label}
			</p>
			<p
				className="text-sm font-bold tabular-nums"
				style={{ color: color || '#fff' }}
			>
				{value}
			</p>
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
		<div className="bg-white/3 rounded-lg p-3 border border-white/5">
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
			<div className="bg-linear-to-b from-white/5 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
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

	let urgency = mlData?.pit_urgency || mlData?.urgency || 'STAY OUT';
	let urgencyConfig =
		URGENCY_CONFIG[urgency.replace(/\s+/g, '_')] || URGENCY_CONFIG.STAY_OUT;

	const vscOngoing = (raceData?.flags || [])
		.filter((f) => f.lap === currentLap)
		.some((f) => f.type === 'VSC' || f.type === 'SC');

	if (vscOngoing && currentState.tyre_age > 3) {
		urgency = 'PIT NOW (VSC)';
		urgencyConfig = {
			bg: 'from-yellow-600/30 to-yellow-900/30',
			border: 'border-yellow-500/60',
			text: 'text-yellow-300',
			pulse: true,
		};
	}

	const lapsToPit = mlData?.laps_to_pit ?? '--';
	const compound = mlData?.recommended_compound || '--';
	const confidence =
		mlData?.confidence ? (mlData.confidence * 100).toFixed(0) : '--';

	const heuristicSection =
		heuristic ?
			<div className="border-t border-white/5 pt-4 mt-4">
				<p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-2">
					Heuristic Strategy
				</p>
				<div className="bg-white/3 rounded-lg p-3 space-y-1 text-xs text-gray-400">
					<div className="flex justify-between">
						<span>Recommended</span>
						<span className="text-white">{heuristic.action || '--'}</span>
					</div>
					{heuristic.reason && (
						<p className="text-gray-600 text-[11px] mt-1 italic">
							{heuristic.reason}
						</p>
					)}
				</div>
			</div>
		:	<div className="bg-white/2 rounded-lg p-3 text-xs text-gray-500 border border-white/5">
				Heuristic recommendation unavailable for this lap.
			</div>;

	return (
		<div className="bg-linear-to-b from-white/5 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
			<div
				className="px-5 py-4 border-b border-white/10"
				style={{ borderTop: `3px solid ${driverInfo?.color || '#666'}` }}
			>
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-white font-bold text-base">
							{selectedDriver} - {driverInfo?.team || 'Unknown Team'}
						</h3>
					</div>
					<div className="flex gap-2">
						<MiniStat
							label="POS"
							value={currentState.position || '--'}
						/>
						<MiniStat
							label="TYRE"
							value={COMPOUND_SHORT[currentState.compound] || '?'}
							color={COMPOUND_COLORS[currentState.compound]}
						/>
						<MiniStat
							label="STOPS"
							value={currentState.stops_done ?? '--'}
						/>
					</div>
				</div>
			</div>

			<div className="p-5 space-y-4">
				{loading && mlData && (
					<div className="text-[11px] uppercase tracking-[0.2em] text-rose-200/80 text-center">
						Refreshing strategy data...
					</div>
				)}

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
						<div
							className={`relative overflow-hidden rounded-xl border ${urgencyConfig.border} ${urgencyConfig.bg} p-4 transition-all duration-500`}
						>
							{urgencyConfig.pulse && (
								<div
									className={`absolute inset-0 ${urgencyConfig.bg} animate-pulse opacity-30`}
								/>
							)}
							<div className="relative flex items-center justify-between">
								<div>
									<p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">
										Strategy Call
									</p>
									<p
										className={`text-xl font-black tracking-wider ${urgencyConfig.text}`}
									>
										{urgency}
									</p>
								</div>
								<div className="text-right">
									<p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">
										Laps to Pit
									</p>
									<p
										className={`text-3xl font-black tabular-nums ${urgencyConfig.text}`}
									>
										{typeof lapsToPit === 'number' ?
											Math.round(lapsToPit)
										:	lapsToPit}
									</p>
								</div>
							</div>
						</div>

						{vscOngoing && (
							<div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 animate-pulse">
								<span className="text-xl">\uD83D\uDEA8</span>
								<span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
									Virtual Safety Car Active - Prime Pit Opportunity!
								</span>
							</div>
						)}

						<div className="flex items-center justify-between bg-white/3 rounded-xl p-4 border border-white/5 transition-all duration-500">
							<div>
								<p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">
									Recommended Compound
								</p>
								<div className="flex items-center gap-2">
									<div
										className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black"
										style={{
											borderColor: COMPOUND_COLORS[compound] || '#666',
											color: COMPOUND_COLORS[compound] || '#666',
										}}
									>
										{COMPOUND_SHORT[compound] || '?'}
									</div>
									<span className="text-white font-bold capitalize">
										{compound}
									</span>
								</div>
							</div>
							<div className="text-right">
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
											<div
												className="w-3 h-3 rounded-full"
												style={{
													backgroundColor: COMPOUND_COLORS[comp] || '#666',
												}}
											/>
											<span className="text-xs text-gray-400 w-14 capitalize">
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

						{heuristicSection}
					</div>
				}
			</div>
		</div>
	);
}
