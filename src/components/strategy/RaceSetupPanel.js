import { FaChevronDown, FaPlay } from 'react-icons/fa';

export default function RaceSetupPanel({
	currentYear,
	year,
	onYearChange,
	circuits,
	selectedRound,
	onRoundChange,
	circuitsLoading,
	loading,
	onLoadRace,
}) {
	return (
		<div className="px-6 md:px-12 py-4 animate-fade-in">
			<div className="max-w-[1600px] mx-auto">
				<div className="bg-linear-to-b from-white/6 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
					<div className="grid grid-cols-1 md:grid-cols-[200px_1fr_180px] gap-6 items-end">
						<div>
							<label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-medium">
								Season
							</label>
							<div className="relative">
								<select
									value={year}
									onChange={(e) => onYearChange(Number(e.target.value))}
									className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
								>
									{Array.from({ length: 8 }, (_, i) => currentYear - i).map(
										(y) => (
											<option
												key={y}
												value={y}
												className="bg-black"
											>
												{y} Season
											</option>
										)
									)}
								</select>
								<FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none" />
							</div>
						</div>

						<div>
							<label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-medium">
								Grand Prix
							</label>
							<div className="relative">
								<select
									value={selectedRound || ''}
									onChange={(e) =>
										onRoundChange(Number(e.target.value) || null)
									}
									disabled={circuitsLoading}
									className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all disabled:opacity-50"
								>
									<option
										value=""
										className="bg-black"
									>
										{circuitsLoading ?
											'Loading circuits...'
										:	'Select Grand Prix'}
									</option>
									{circuits.map((c) => (
										<option
											key={c.round}
											value={c.round}
											className="bg-black"
										>
											R{c.round} {c.event}
										</option>
									))}
								</select>
								<FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none" />
							</div>
						</div>

						<button
							onClick={onLoadRace}
							disabled={!selectedRound || loading}
							className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-red-600/20 disabled:shadow-none"
						>
							{loading ?
								<>
									<div className="h-2.5 w-2.5 rounded-full bg-white/80 animate-pulse" />
									Preparing race
								</>
							:	<>
									<FaPlay className="text-xs" />
									Load Race
								</>
							}
						</button>
					</div>

					{loading && (
						<div className="mt-4 text-center">
							<div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10">
								<div className="h-3 w-20 rounded-full bg-white/10 overflow-hidden">
									<div className="h-full w-1/2 bg-red-500/60 animate-pulse" />
								</div>
								<span className="text-xs text-gray-400">
									Loading race data. First load may take 30-60 seconds.
								</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
