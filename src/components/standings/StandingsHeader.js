
export default function StandingsHeader({
	year,
	years,
	activeTab,
	onYearChange,
	onTabChange,
}) {
	return (
		<div className="mb-8 flex flex-col gap-5 rounded-2xl border border-white/20 bg-linear-to-r from-red-900/10 to-white/10 p-4 backdrop-blur-2xl xl:flex-row xl:items-end xl:justify-between">
			<div>
				<p className="text-[11px] uppercase tracking-[0.24em] text-red-500 font-bold mb-1">
					Championship Board
				</p>
				<h1 className="inline-flex items-center gap-3 text-2xl font-black tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-3xl md:text-4xl">
					{year} Season Standings
				</h1>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<select
					value={year}
					onChange={(e) => onYearChange(Number(e.target.value))}
					className="w-full rounded-xl border border-white/20 bg-black/60 px-4 py-2.5 text-white backdrop-blur-2xl transition-colors focus:outline-none focus:border-red-500 sm:w-auto"
				>
					{years.map((y) => (
						<option
							key={y}
							value={y}
							className="bg-black text-white"
						>
							{y}
						</option>
					))}
				</select>

				<div className="flex rounded-xl border border-white/20 bg-black/60 p-1 backdrop-blur-2xl">
					<button
						onClick={() => onTabChange('drivers')}
						className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-all sm:flex-none sm:px-5 ${
							activeTab === 'drivers' ?
								'bg-red-600 text-white shadow-lg shadow-red-600/20'
							:	'text-gray-400 hover:text-white hover:bg-white/5'
						}`}
					>
						Drivers
					</button>
					<button
						onClick={() => onTabChange('constructors')}
						className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-all sm:flex-none sm:px-5 ${
							activeTab === 'constructors' ?
								'bg-red-600 text-white shadow-lg shadow-red-600/20'
							:	'text-gray-400 hover:text-white hover:bg-white/5'
						}`}
					>
						Constructors
					</button>
				</div>
			</div>
		</div>
	);
}
