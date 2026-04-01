import { FaCog, FaFlagCheckered } from 'react-icons/fa';

export default function StrategyHeader({
	raceData,
	showConfig,
	onToggleConfig,
}) {
	return (
		<div className="px-6 md:px-12 pt-4 pb-2">
			<div className="flex items-center justify-between max-w-[1600px] mx-auto">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-3">
						<FaFlagCheckered className="text-red-600" />
						<span className="bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
							Strategy Simulator
						</span>
					</h1>
					{raceData && (
						<p className="text-xs text-gray-500 mt-1 tracking-wide">
							{raceData.circuit_info.event} &bull;{' '}
							{raceData.circuit_info.circuit}, {raceData.circuit_info.country}{' '}
							&bull; {raceData.circuit_info.year}
						</p>
					)}
				</div>
				<button
					onClick={onToggleConfig}
					className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm"
				>
					<FaCog className="text-gray-400" />
					{showConfig ? 'Hide' : 'Race Setup'}
				</button>
			</div>
		</div>
	);
}
