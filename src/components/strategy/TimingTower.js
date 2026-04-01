import { COMPOUND_COLORS, COMPOUND_SHORT } from './constants';
import { formatGap, formatLap } from './utils';

export default function TimingTower({
	snapshot,
	currentPits,
	selectedDriver,
	onSelectDriver,
}) {
	const pitDrivers = new Set(currentPits.map((p) => p.abbr));

	return (
		<div className="bg-linear-to-b from-white/5 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
			<div className="grid grid-cols-[40px_50px_1fr_90px_80px_70px_80px_60px] gap-2 px-4 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-[0.15em] text-gray-500 font-medium">
				<div>Pos</div>
				<div></div>
				<div>Driver</div>
				<div className="text-right">Lap Time</div>
				<div className="text-right">Gap</div>
				<div className="text-center">Tyre</div>
				<div className="text-right">Age</div>
				<div className="text-center">Stint</div>
			</div>

			<div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
				{snapshot.map((driver, idx) => {
					const isSelected = driver.abbr === selectedDriver;
					const isPitting = pitDrivers.has(driver.abbr);
					const compoundColor = COMPOUND_COLORS[driver.compound] || '#666';

					return (
						<div
							key={driver.abbr}
							onClick={() => onSelectDriver(driver.abbr)}
							className={`grid grid-cols-[40px_50px_1fr_90px_80px_70px_80px_60px] gap-2 px-4 py-2 cursor-pointer transition-all border-l-2 ${
								isSelected ?
									'bg-white/8 border-l-red-500'
								:	'hover:bg-white/4 border-l-transparent'
							} ${isPitting ? 'bg-blue-500/10' : ''} ${idx % 2 === 0 ? 'bg-white/1' : ''}`}
						>
							<div className="flex items-center">
								<span
									className={`text-sm font-bold tabular-nums ${
										idx === 0 ? 'text-yellow-400'
										: idx === 1 ? 'text-gray-300'
										: idx === 2 ? 'text-amber-600'
										: 'text-gray-500'
									}`}
								>
									{driver.pos || '-'}
								</span>
							</div>

							<div className="flex items-center">
								<div
									className="w-1 h-6 rounded-full mr-2"
									style={{ backgroundColor: driver.color || '#fff' }}
								/>
								<span className="text-xs font-bold text-white">
									{driver.abbr}
								</span>
							</div>

							<div className="flex items-center gap-2">
								<span className="text-xs text-gray-400 truncate">
									{driver.team}
								</span>
								{isPitting && (
									<span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[9px] text-blue-400 font-bold tracking-wider uppercase">
										PIT
									</span>
								)}
							</div>

							<div className="text-right flex items-center justify-end">
								<span className="text-xs font-mono tabular-nums text-gray-300">
									{driver.time ? formatLap(driver.time) : '--:--.---'}
								</span>
							</div>

							<div className="text-right flex items-center justify-end">
								<span
									className={`text-xs font-mono tabular-nums ${
										idx === 0 ? 'text-gray-600' : 'text-gray-400'
									}`}
								>
									{idx === 0 ? 'LEADER' : formatGap(driver.gap_leader)}
								</span>
							</div>

							<div className="flex items-center justify-center">
								<div
									className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black"
									style={{ borderColor: compoundColor, color: compoundColor }}
								>
									{COMPOUND_SHORT[driver.compound] || '?'}
								</div>
							</div>

							<div className="text-right flex items-center justify-end">
								<span
									className={`text-xs font-mono tabular-nums ${
										driver.tyre_age > 25 ? 'text-red-400'
										: driver.tyre_age > 15 ? 'text-amber-400'
										: 'text-gray-400'
									}`}
								>
									{driver.tyre_age || 0}L
								</span>
							</div>

							<div className="text-center flex items-center justify-center">
								<span className="text-xs text-gray-500">
									S{driver.stint || 1}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
