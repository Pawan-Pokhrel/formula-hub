import SafeImage from '@/components/common/SafeImage';
import {
  getCountryCode,
  getTrackImagePath,
} from '@/components/schedule/scheduleHelpers';
import { FaCog, FaMapMarkerAlt } from 'react-icons/fa';

export default function StrategyHeader({
	raceData,
	showConfig,
	onToggleConfig,
}) {
	const race = raceData?.circuit_info;
	const trackImage = race ? getTrackImagePath({ event: race.event }) : null;
	const countryCode = race ? getCountryCode(race.country || '') : null;

	return (
		<div className="px-6 md:px-12 pt-4 pb-2">
			<div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md max-w-[1600px] mx-auto px-4 py-4 md:px-6 md:py-5">
				{trackImage && (
					<SafeImage
						src={trackImage}
						alt="Circuit"
						fill
						sizes="(max-width: 1600px) 100vw, 1600px"
						hideOnError
						className="object-cover opacity-25"
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-r from-red-100/10 via-red-200/10 to-black/80" />

				<div className="relative flex items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-3">
							<span className="bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
								Strategy Command Center
							</span>
						</h1>

						{race && (
							<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-300">
								<span className="px-2.5 py-1 rounded-full border border-white/15 bg-white/10 uppercase tracking-wider font-semibold">
									{race.event}
								</span>
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 bg-white/10">
									<FaMapMarkerAlt className="text-red-400" />
									{race.circuit}, {race.country}
								</span>
								{countryCode && (
									<span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/15 bg-white/10">
										<SafeImage
											src={`/images/flags/${countryCode}.png`}
											alt={race.country}
											width={20}
											height={14}
											hideOnError
											className="h-3.5 w-5 rounded-xs object-cover"
										/>
										{race.year}
									</span>
								)}
							</div>
						)}
					</div>

					<button
						onClick={onToggleConfig}
						className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-all text-sm"
					>
						<FaCog className="text-gray-300" />
						{showConfig ? 'Hide Setup' : 'Race Setup'}
					</button>
				</div>
			</div>
		</div>
	);
}
