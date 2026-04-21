
export default function StandingsHeader({
	year,
	years,
	activeTab,
	onYearChange,
	onTabChange,
}) {
	return (
		<div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-8 backdrop-blur-2xl bg-linear-to-r from-red-900/10 to-white/10 rounded-2xl p-4 border border-white/20">
			<div>
				<p className="text-[11px] uppercase tracking-[0.24em] text-red-500 font-bold mb-1">
					Championship Board
				</p>
				<h1 className="text-3xl md:text-4xl font-black tracking-wide inline-flex items-center gap-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
					{year} Season Standings
				</h1>
			</div>

			<div className="flex flex-col sm:flex-row gap-3 sm:items-center">
				<select
					value={year}
					onChange={(e) => onYearChange(Number(e.target.value))}
					className="bg-black/60 backdrop-blur-2xl border border-white/20 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500 transition-colors"
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

				<div className="bg-black/60 backdrop-blur-2xl rounded-xl p-1 flex border border-white/20">
					<button
						onClick={() => onTabChange('drivers')}
						className={`px-5 py-2 rounded-lg transition-all text-sm font-semibold uppercase tracking-[0.14em] ${
							activeTab === 'drivers' ?
								'bg-red-600 text-white shadow-lg shadow-red-600/20'
							:	'text-gray-400 hover:text-white hover:bg-white/5'
						}`}
					>
						Drivers
					</button>
					<button
						onClick={() => onTabChange('constructors')}
						className={`px-5 py-2 rounded-lg transition-all text-sm font-semibold uppercase tracking-[0.14em] ${
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
