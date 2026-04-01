import { useMemo, useRef } from 'react';
import {
	FaFastForward,
	FaPause,
	FaPlay,
	FaStepBackward,
	FaStepForward,
} from 'react-icons/fa';

export default function PlaybackBar({
	currentLap,
	totalLaps,
	playing,
	playSpeed,
	onPlay,
	onLapChange,
	onSpeedChange,
	onStepBack,
	onStepForward,
	flags,
}) {
	const barRef = useRef(null);
	const progress = totalLaps > 0 ? (currentLap / totalLaps) * 100 : 0;

	const flagLaps = useMemo(
		() => [...new Set(flags.filter((f) => f.lap).map((f) => f.lap))],
		[flags]
	);

	const handleBarClick = (e) => {
		if (!barRef.current || !totalLaps) return;
		const rect = barRef.current.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		onLapChange(Math.max(1, Math.round(pct * totalLaps)));
	};

	return (
		<div className="bg-linear-to-r from-white/4 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-1.5">
					<button
						onClick={onStepBack}
						className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
					>
						<FaStepBackward className="text-xs" />
					</button>
					<button
						onClick={onPlay}
						className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
							playing ?
								'bg-red-600 text-white shadow-lg shadow-red-600/30'
							:	'bg-white/10 text-white hover:bg-white/15'
						}`}
					>
						{playing ?
							<FaPause className="text-xs" />
						:	<FaPlay className="text-xs ml-0.5" />}
					</button>
					<button
						onClick={onStepForward}
						className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
					>
						<FaStepForward className="text-xs" />
					</button>
				</div>

				<div className="text-center min-w-20">
					<div className="text-[10px] uppercase tracking-[0.15em] text-gray-500">
						Lap
					</div>
					<div className="text-lg font-bold font-mono tabular-nums">
						<span className="text-white">{currentLap}</span>
						<span className="text-gray-600">/{totalLaps}</span>
					</div>
				</div>

				<div
					className="flex-1 relative"
					ref={barRef}
				>
					<div
						className="h-2 bg-white/5 rounded-full cursor-pointer relative overflow-visible"
						onClick={handleBarClick}
					>
						{flagLaps.map((lap) => (
							<div
								key={`flag-${lap}`}
								className="absolute top-0 w-0.5 h-full bg-yellow-500/70"
								style={{ left: `${(lap / totalLaps) * 100}%` }}
							/>
						))}

						<div
							className="absolute top-0 left-0 h-full rounded-full bg-linear-to-r from-red-600 to-red-500 transition-all duration-200"
							style={{ width: `${progress}%` }}
						/>

						<div
							className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-red-500 shadow-lg shadow-red-500/30 transition-all duration-200"
							style={{ left: `calc(${progress}% - 7px)` }}
						/>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<FaFastForward className="text-[10px] text-gray-500" />
					{[1, 2, 4].map((s) => (
						<button
							key={s}
							onClick={() => onSpeedChange(s)}
							className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
								playSpeed === s ?
									'bg-red-600/30 text-red-400 border border-red-500/30'
								:	'bg-white/5 text-gray-500 hover:text-white'
							}`}
						>
							{s}x
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
