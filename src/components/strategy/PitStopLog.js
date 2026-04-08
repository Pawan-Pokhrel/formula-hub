import { FaArrowRight, FaWrench } from 'react-icons/fa';
import TyreIcon from '@/components/common/TyreIcon';

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
								<div className="flex items-center gap-1.5 flex-1">
									{stop.compound_from && (
										<>
											<div className="flex items-center gap-1 opacity-60">
												<TyreIcon compound={stop.compound_from} className="w-[14px] h-[14px]" />
												<span className="text-[10px] text-gray-400 capitalize hidden sm:inline-block font-medium">
													{stop.compound_from}
												</span>
											</div>
											<FaArrowRight className="text-[8px] text-gray-500 mx-0.5" />
										</>
									)}
									<div className="flex items-center gap-1.5">
										<TyreIcon compound={stop.compound_to || stop.compound} className="w-4 h-4 shadow-black/40 shadow-sm rounded-full" />
										<span className="text-[11px] font-bold text-white capitalize tracking-wide">
											{stop.compound_to || stop.compound}
										</span>
									</div>
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
