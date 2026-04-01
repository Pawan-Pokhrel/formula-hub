import {
	getDriverImagePath,
	getTeamLogoPath,
} from '@/components/schedule/scheduleHelpers';
import Image from 'next/image';

const PODIUM_LAYOUT = [2, 1, 3];

function PodiumCard({ row, emphasized = false }) {
	if (!row) {
		return (
			<div className="h-48 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4" />
		);
	}

	const teamLogo = getTeamLogoPath(row.team_name);
	const driverImage = getDriverImagePath(row.driver_code);
	const accent = row.team_color || '#6B7280';

	return (
		<div
			className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/45 p-4 ${
				emphasized ? 'md:-translate-y-3 md:scale-[1.02]' : ''
			}`}
		>
			<div
				className="absolute left-0 top-0 h-full w-1"
				style={{ backgroundColor: accent }}
			/>
			<div className="mb-4 flex items-center justify-between">
				<span className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-xs font-bold tracking-[0.18em] text-white">
					P{row.position}
				</span>
				{teamLogo && (
					<Image
						src={teamLogo}
						alt={row.team_name}
						width={28}
						height={28}
						className="h-7 w-7 rounded-full bg-white/10 p-1"
					/>
				)}
			</div>

			<div className="flex items-center gap-3">
				<div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-white/8">
					{driverImage && (
						<Image
							src={driverImage}
							alt={row.driver_name}
							fill
							sizes="64px"
							className="object-cover"
						/>
					)}
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
						{row.driver_code || row.driver_name}
					</p>
					<p className="text-xl font-black text-white">{row.driver_name}</p>
					<p className="text-sm text-zinc-400">{row.team_name}</p>
				</div>
			</div>

			<p className="mt-3 text-xs text-zinc-400">
				{row.time ||
					row.best_lap ||
					row.q3 ||
					row.gap_to_pole ||
					'Official result'}
			</p>
		</div>
	);
}

export default function PodiumTop3({ rows }) {
	if (!rows || rows.length === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
				Top 3 results will appear here when a session is available.
			</div>
		);
	}

	const rowByPosition = new Map(rows.map((row) => [row.position, row]));

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
			{PODIUM_LAYOUT.map((position) => (
				<PodiumCard
					key={position}
					row={rowByPosition.get(position)}
					emphasized={position === 1}
				/>
			))}
		</div>
	);
}
