import TyreIcon from '@/components/common/TyreIcon';
import { getTeamLogoPath } from '@/components/schedule/scheduleHelpers';
import { getDriverImage } from '@/utils/f1_images';
import { FaArrowRight, FaWrench } from 'react-icons/fa';

export default function PitStopLog({
	pitStops,
	drivers,
	currentLap,
	prediction,
	selectedDriver,
}) {
	const teammateConflict = Boolean(prediction?.prediction?.teammate_conflict);
	const teammateAbbr = prediction?.prediction?.teammate_abbr;

	const visibleStops = (pitStops || []).filter((p) => p.lap <= currentLap);

	if (visibleStops.length === 0) {
		return (
			<div className="bg-linear-to-b from-black/55 to-black/45 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
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
		<div className="bg-linear-to-b from-black/55 to-black/45 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-xs uppercase tracking-[0.15em] text-gray-500 font-medium">
					Pit Stop Log
				</h3>
				<div className="flex items-center gap-2">
					{teammateConflict && (
						<span className="text-[10px] px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 uppercase tracking-wider font-semibold">
							Double-stack risk
						</span>
					)}
					<span className="text-xs text-gray-600 tabular-nums">
						{visibleStops.length} stops
					</span>
				</div>
			</div>
			<div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
				{visibleStops
					.sort((a, b) => b.lap - a.lap)
					.map((stop, idx) => {
						const driverInfo = drivers?.[stop.abbr] || {};
						const teamLogo = getTeamLogoPath(driverInfo?.team);
						const driverImage = getDriverImage(stop.abbr);
						const highlightConflict =
							teammateConflict &&
							(stop.abbr === selectedDriver || stop.abbr === teammateAbbr) &&
							Math.abs(Number(stop.lap) - Number(currentLap)) <= 2;

						return (
							<div
								key={`${stop.abbr}-${stop.lap}-${idx}`}
								className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${highlightConflict ? 'bg-amber-500/12 border border-amber-500/30 hover:bg-amber-500/20' : 'bg-white/8 border border-white/10 hover:bg-white/12'}`}
							>
								<span className="text-[10px] font-mono text-gray-600 w-8 tabular-nums">
									L{stop.lap}
								</span>
								{driverImage && (
									<img
										src={driverImage}
										alt={stop.abbr}
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
										className="h-5 w-5 rounded-full object-cover border border-white/20"
									/>
								)}
								<div
									className="w-1 h-4 rounded-full"
									style={{ backgroundColor: driverInfo.color || '#666' }}
								/>
								<span className="text-xs font-bold text-white w-10">
									{stop.abbr}
								</span>
								{teamLogo && (
									<img
										src={teamLogo}
										alt={driverInfo?.team || 'Team'}
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
										className="h-3.5 w-3.5 object-contain opacity-90"
									/>
								)}
								<div className="flex items-center gap-1.5 flex-1">
									{stop.compound_from && (
										<>
											<div className="flex items-center gap-1 opacity-60">
												<TyreIcon
													compound={stop.compound_from}
													className="w-3.5 h-3.5"
												/>
												<span className="text-[10px] text-gray-400 capitalize hidden sm:inline-block font-medium">
													{stop.compound_from}
												</span>
											</div>
											<FaArrowRight className="text-[8px] text-gray-500 mx-0.5" />
										</>
									)}
									<div className="flex items-center gap-1.5">
										<TyreIcon
											compound={stop.compound_to || stop.compound}
											className="w-4 h-4 shadow-black/40 shadow-sm rounded-full"
										/>
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
