import Image from 'next/image';

import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';

const TEAM_COLOR_HEX = {
	'red bull': '#3671C6',
	'red bull racing': '#3671C6',
	mclaren: '#FF8000',
	ferrari: '#E8002D',
	mercedes: '#27F4D2',
	'aston martin': '#229971',
	alpine: '#FF87BC',
	williams: '#64C4FF',
	rb: '#6692FF',
	'racing bulls': '#6692FF',
	'kick sauber': '#52E252',
	sauber: '#52E252',
	'haas f1 team': '#B6BABD',
	haas: '#B6BABD',
	cadillac: '#1E3D6B',
	audi: '#9CA3AF',
};

function getTeamColorHex(teamName) {
	if (!teamName) return '#6b7280';
	const normalized = String(teamName).trim().toLowerCase();
	if (TEAM_COLOR_HEX[normalized]) return TEAM_COLOR_HEX[normalized];
	for (const [name, color] of Object.entries(TEAM_COLOR_HEX)) {
		if (normalized.includes(name)) return color;
	}
	return '#6b7280';
}

function hexToRgba(hex, alpha) {
	const clean = String(hex).replace('#', '').trim();
	const full =
		clean.length === 3 ?
			clean
				.split('')
				.map((ch) => ch + ch)
				.join('')
		:	clean;
	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);
	if ([r, g, b].some((v) => Number.isNaN(v)))
		return `rgba(107,114,128,${alpha})`;
	return `rgba(${r},${g},${b},${alpha})`;
}

function getPositionClasses(position) {
	if (position === 1)
		return 'bg-yellow-400/15 text-yellow-300 border-yellow-400/35';
	if (position === 2) return 'bg-zinc-300/15 text-zinc-200 border-zinc-300/30';
	if (position === 3)
		return 'bg-amber-700/20 text-amber-300 border-amber-500/35';
	return 'bg-white/5 text-gray-300 border-white/15';
}

export default function StandingsTable({ activeTab, rows }) {
	const hasRows = rows.length > 0;

	return (
		<div className="bg-linear-to-br from-black/55 via-neutral-900/55 to-red-950/25 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/20 shadow-2xl animate-fade-in">
			<div className="overflow-x-auto">
				<table className="w-full text-left">
					<thead className="bg-black/70 text-gray-300 uppercase text-[11px] tracking-[0.14em]">
						<tr>
							<th className="px-4 md:px-6 py-4">Pos</th>
							<th className="px-4 md:px-6 py-4">
								{activeTab === 'drivers' ? 'Driver' : 'Team'}
							</th>
							{activeTab === 'drivers' && (
								<th className="px-4 md:px-6 py-4">Team</th>
							)}
							<th className="px-4 md:px-6 py-4">Wins</th>
							<th className="px-4 md:px-6 py-4 text-right">Points</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{rows.map((item) => (
							<tr
								key={`${activeTab}-${item.position}`}
								className="hover:bg-white/8 transition-colors group"
							>
								<td className="px-4 md:px-6 py-4 w-20">
									<span
										className={`inline-flex w-8 h-8 items-center justify-center rounded-full border text-xs font-black ${getPositionClasses(item.position)}`}
									>
										{item.position}
									</span>
								</td>
								<td className="px-4 md:px-6 py-4 font-medium text-base md:text-lg">
									{activeTab === 'drivers' ?
										<div
											className="flex items-center gap-3 min-w-0 rounded-xl border border-white/15 px-3 py-2"
											style={{
												background: `linear-gradient(135deg, ${hexToRgba(getTeamColorHex(item.team_name), 0.28)} 0%, rgba(0,0,0,0.35) 75%)`,
											}}
										>
											{item.driver_code && (
												<div
													className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0 border border-white/10 shadow-lg relative"
													style={{
														backgroundColor: hexToRgba(
															getTeamColorHex(item.team_name),
															0.35
														),
													}}
												>
													<Image
														src={getDriverImagePath(item.driver_code)}
														alt={item.driver_name}
														fill
														className="object-cover object-top"
														onError={(e) => {
															e.currentTarget.style.display = 'none';
														}}
													/>
												</div>
											)}
											<div className="min-w-0">
												<p className="font-bold truncate">{item.driver_name}</p>
												<p className="text-xs text-gray-400 md:hidden truncate">
													{item.team_name}
												</p>
											</div>
										</div>
									:	<div
											className="inline-flex w-[320px] max-w-full items-center gap-3 rounded-xl border border-white/15 px-3 py-2 md:w-[360px]"
											style={{
												background: `linear-gradient(135deg, ${hexToRgba(getTeamColorHex(item.team_name), 0.3)} 0%, rgba(0,0,0,0.35) 75%)`,
											}}
										>
											{getTeamLogoPath(item.team_name) && (
												<div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
													<Image
														src={getTeamLogoPath(item.team_name)}
														alt={item.team_name}
														fill
														className="object-contain"
														onError={(e) => {
															e.currentTarget.style.display = 'none';
														}}
													/>
												</div>
											)}
											<p className="min-w-0 flex-1 truncate font-bold">
												{item.team_name}
											</p>
										</div>
									}
								</td>
								{activeTab === 'drivers' && (
									<td className="px-4 md:px-6 py-4 text-gray-400 text-sm md:text-base">
										<div className="inline-flex items-center gap-2">
											{getTeamLogoPath(item.team_name) && (
												<div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-sm">
													<Image
														src={getTeamLogoPath(item.team_name)}
														alt={item.team_name}
														fill
														className="object-contain"
														onError={(e) => {
															e.currentTarget.style.display = 'none';
														}}
													/>
												</div>
											)}
											<span>{item.team_name}</span>
										</div>
									</td>
								)}
								<td className="px-4 md:px-6 py-4 text-white/80 font-medium">
									{item.wins}
								</td>
								<td className="px-4 md:px-6 py-4 text-right font-black text-red-400 text-lg tabular-nums">
									{item.points}
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{!hasRows && (
					<div className="text-center py-12 text-gray-500">
						No data available for this season yet.
					</div>
				)}
			</div>
		</div>
	);
}
