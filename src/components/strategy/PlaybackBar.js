import { useMemo, useRef } from 'react';
import {
	FaClock,
	FaPause,
	FaPlay,
	FaStepBackward,
	FaStepForward,
} from 'react-icons/fa';

export default function PlaybackBar({
	currentLap,
	totalLaps,
	lapProgress,
	playing,
	lapDurationSec,
	onPlay,
	onLapChange,
	onLapDurationChange,
	onStepBack,
	onStepForward,
	flags,
}) {
	const barRef = useRef(null);
	const clampedProgress = Math.max(0, Math.min(1, Number(lapProgress || 0)));
	const progress =
		totalLaps > 0 ?
			((Math.max(1, currentLap) - 1 + clampedProgress) / totalLaps) * 100
		:	0;

	const flagLaps = useMemo(
		() => [...new Set(flags.filter((f) => f.lap).map((f) => f.lap))],
		[flags]
	);

	const handleBarClick = (e) => {
		if (!barRef.current || !totalLaps) return;
		const rect = barRef.current.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		onLapChange(Math.max(1, Math.ceil(pct * totalLaps)));
	};

	return (
		<div className="bg-linear-to-r from-black/55 to-black/45 backdrop-blur-2xl border border-white/20 rounded-2xl px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-1.5">
					<button
						onClick={onStepBack}
						className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/35 hover:bg-black/55 transition-colors text-gray-300 hover:text-white border border-white/10"
					>
						<FaStepBackward className="text-xs" />
					</button>
					<button
						onClick={onPlay}
						className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
							playing ?
								'bg-red-600 text-white shadow-lg shadow-red-600/30'
							:	'bg-black/45 text-white hover:bg-black/60 border border-white/15'
						}`}
					>
						{playing ?
							<FaPause className="text-xs" />
						:	<FaPlay className="text-xs ml-0.5" />}
					</button>
					<button
						onClick={onStepForward}
						className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/35 hover:bg-black/55 transition-colors text-gray-300 hover:text-white border border-white/10"
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
						className="h-2 bg-black/45 rounded-full cursor-pointer relative overflow-visible border border-white/10"
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
					<FaClock className="text-[10px] text-gray-500" />
					{[5, 10].map((seconds) => (
						<button
							key={seconds}
							onClick={() => onLapDurationChange(seconds)}
							className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
								lapDurationSec === seconds ?
									'bg-red-600/30 text-red-400 border border-red-500/30'
								:	'bg-black/35 text-gray-400 hover:text-white border border-white/10'
							}`}
						>
							{seconds}s
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
