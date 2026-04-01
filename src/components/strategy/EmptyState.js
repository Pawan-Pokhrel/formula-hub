import { FaBrain, FaClock, FaFlag, FaWrench } from 'react-icons/fa';

export default function EmptyState() {
	return (
		<div className="col-span-full flex flex-col items-center justify-center py-24 animate-fade-in">
			<div className="relative mb-6">
				<div className="w-20 h-20 rounded-full bg-linear-to-br from-red-600/20 to-red-900/20 flex items-center justify-center border border-red-500/20">
					<FaFlag className="text-3xl text-red-500/50" />
				</div>
				<div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-linear-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center border border-amber-500/20">
					<FaBrain className="text-sm text-amber-500/60" />
				</div>
			</div>
			<h3 className="text-lg font-bold text-white mb-2">Strategy Simulator</h3>
			<p className="text-sm text-gray-500 text-center max-w-md mb-6">
				Select a race from the panel above, then watch the race unfold lap by
				lap with AI-powered strategy predictions in real time.
			</p>
			<div className="grid grid-cols-3 gap-4 text-center">
				<div className="bg-white/3 rounded-xl p-4 border border-white/5">
					<FaClock className="text-lg text-red-500/70 mx-auto mb-2" />
					<p className="text-[10px] uppercase tracking-wider text-gray-500">
						Lap-by-Lap
					</p>
					<p className="text-xs text-gray-400 mt-1">Race replay</p>
				</div>
				<div className="bg-white/3 rounded-xl p-4 border border-white/5">
					<FaBrain className="text-lg text-amber-500/70 mx-auto mb-2" />
					<p className="text-[10px] uppercase tracking-wider text-gray-500">
						ML Powered
					</p>
					<p className="text-xs text-gray-400 mt-1">XGBoost model</p>
				</div>
				<div className="bg-white/3 rounded-xl p-4 border border-white/5">
					<FaWrench className="text-lg text-blue-500/70 mx-auto mb-2" />
					<p className="text-[10px] uppercase tracking-wider text-gray-500">
						Pit Strategy
					</p>
					<p className="text-xs text-gray-400 mt-1">Optimal timing</p>
				</div>
			</div>
		</div>
	);
}
