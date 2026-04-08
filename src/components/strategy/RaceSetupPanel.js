import { FaPlay } from 'react-icons/fa';
import CustomSelect from '@/components/common/CustomSelect';
import { getCountryFlag } from '@/utils/flags';

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
	const safeCircuits = Array.isArray(circuits) ? circuits : [];
	
	const seasonOptions = Array.from({ length: 8 }, (_, i) => currentYear - i).map((y) => ({
		value: y,
		label: `${y} Season`
	}));

	const circuitOptions = safeCircuits.map((c) => ({
		value: c.round,
		label: `R${c.round} ${c.event}`,
		country: c.country || c.circuit || c.event
	}));

	return (
		<div className="px-6 md:px-12 py-4 animate-fade-in">
			<div className="max-w-[1600px] mx-auto">
				<div className="bg-linear-to-b from-white/6 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
					<div className="grid grid-cols-1 md:grid-cols-[200px_1fr_180px] gap-6 items-end">
						<CustomSelect
							label="Season"
							value={year}
							onChange={onYearChange}
							options={seasonOptions}
							getOptionValue={(opt) => opt.value}
							renderOption={(opt) => opt.label}
						/>

						<CustomSelect
							label="Grand Prix"
							value={selectedRound}
							onChange={onRoundChange}
							options={circuitOptions}
							disabled={circuitsLoading}
							placeholder={circuitsLoading ? 'Loading circuits...' : 'Select Grand Prix'}
							getOptionValue={(opt) => opt.value}
							renderOption={(opt) => (
								<span className="flex items-center gap-2">
									<span className="text-lg leading-none">{getCountryFlag(opt.country)}</span>
									<span>{opt.label}</span>
								</span>
							)}
						/>

						<button
							onClick={onLoadRace}
							disabled={!selectedRound || loading}
							className="flex items-center justify-center gap-2 px-6 py-[13px] rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-red-600/20 disabled:shadow-none"
						>
							{loading ?
								<>
									<div className="h-2.5 w-2.5 rounded-full bg-white/80 animate-pulse" />
									Preparing race
								</>
							: !selectedRound ? <>Select a Race</> :	<>
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
