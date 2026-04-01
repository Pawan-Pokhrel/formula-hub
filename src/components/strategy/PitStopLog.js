import { FaArrowRight, FaWrench } from 'react-icons/fa';

import { COMPOUND_COLORS } from './constants';

export default function PitStopLog({ pitStops, drivers, currentLap }) {
	const visibleStops = (pitStops || []).filter((p) => p.lap <= currentLap);

	if (visibleStops.length === 0) {
		return (
			<div className="bg-linear-to-b from-white/5 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
				<h3 className="text-xs uppercase tracking-[0.15em] text-gray-500 font-medium mb-3">
					Pit Stop Log
				</h3>
				<div className="flex flex-col items-center justify-center py-6 text-gray-600">
					<FaWrench className="text-xl mb-2" />
					<p className="text-xs">No pit stops yet</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-linear-to-b from-white/5 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-xs uppercase tracking-[0.15em] text-gray-500 font-medium">
					Pit Stop Log
				</h3>
				<span className="text-xs text-gray-600 tabular-nums">
					{visibleStops.length} stops
				</span>
			</div>
			<div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
				{visibleStops
					.sort((a, b) => b.lap - a.lap)
					.map((stop, idx) => {
						const driverInfo = drivers?.[stop.abbr] || {};

						return (
							<div
								key={`${stop.abbr}-${stop.lap}-${idx}`}
								className="flex items-center gap-3 bg-white/3 rounded-lg px-3 py-2 hover:bg-white/6 transition-colors"
							>
								<span className="text-[10px] font-mono text-gray-600 w-8 tabular-nums">
									L{stop.lap}
								</span>
								<div
									className="w-1 h-4 rounded-full"
									style={{ backgroundColor: driverInfo.color || '#666' }}
								/>
								<span className="text-xs font-bold text-white w-10">
									{stop.abbr}
								</span>
								<div className="flex items-center gap-1 flex-1">
									{stop.compound_from && (
										<>
											<div
												className="w-3.5 h-3.5 rounded-full border"
												style={{
													borderColor:
														COMPOUND_COLORS[stop.compound_from] || '#666',
												}}
											/>
											<FaArrowRight className="text-[8px] text-gray-600" />
										</>
									)}
									<div
										className="w-3.5 h-3.5 rounded-full"
										style={{
											backgroundColor:
												COMPOUND_COLORS[stop.compound_to || stop.compound] ||
												'#666',
										}}
									/>
									<span className="text-[10px] text-gray-500 capitalize ml-1">
										{stop.compound_to || stop.compound}
									</span>
								</div>
								{stop.duration && (
									<span className="text-[10px] font-mono text-gray-600 tabular-nums">
										{stop.duration.toFixed(1)}s
									</span>
								)}
							</div>
						);
					})}
			</div>
		</div>
	);
}
