import { getTeamLogoPath } from '@/components/schedule/scheduleHelpers';
import { getCarImage } from '@/utils/f1_images';
import Image from 'next/image';
import {
	getRacePointsByPosition,
	getTeamCardBackground,
	getTelemetryCardTexturePattern,
	getTelemetryDriverImage,
	getTelemetryMetric,
} from './telemetryUiUtils';

const PODIUM_LAYOUT = [2, 1, 3];

function PodiumCard({
	row,
	emphasized = false,
	sessionType = 'race',
	seasonYear,
}) {
	if (!row) {
		return (
			<div className="h-56 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4" />
		);
	}

	const teamLogo = getTeamLogoPath(row.team_name);
	const driverImage = getTelemetryDriverImage(row.driver_code, seasonYear);
	const carImage = getCarImage(row.team_name);
	const accent = row.team_color || '#6B7280';
	const metric = getTelemetryMetric(row, sessionType);
	const points =
		sessionType === 'race' ? getRacePointsByPosition(row.position) : 0;

	return (
		<div
			className={`relative overflow-hidden rounded-2xl border border-white/15 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md ${
				emphasized ? 'md:-translate-y-4 md:scale-[1.035]' : ''
			}`}
			style={{ background: getTeamCardBackground(accent) }}
		>
			<div
				className="pointer-events-none absolute inset-0 opacity-35"
				style={{
					backgroundImage: getTelemetryCardTexturePattern(),
					backgroundSize: '22px 22px, 100% 100%, 180px 100%',
				}}
			/>
			<div className="mb-4 flex items-center justify-between">
				<span className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-xs font-bold tracking-[0.18em] text-white">
					P{row.position}
				</span>
				{teamLogo && (
					<div className="relative h-10 w-10 shrink-0 rounded-lg bg-black/20 p-1">
						<Image
							src={teamLogo}
							alt={row.team_name}
							fill
							sizes="40px"
							className="object-contain p-1"
						/>
					</div>
				)}
			</div>

			<div className="flex items-center gap-3">
				<div className="relative h-24 w-24 overflow-hidden rounded-xl bg-white/8">
					{driverImage && (
						<Image
							src={driverImage}
							alt={row.driver_name}
							fill
							sizes="96px"
							className="object-cover object-top"
						/>
					)}
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
						{row.driver_code || row.driver_name}
					</p>
					<p className="text-xl font-black leading-tight text-white">
						{row.driver_name}
					</p>
					<p className="text-sm text-zinc-300">{row.team_name}</p>
				</div>
				<div className="relative ml-auto hidden h-9 w-28 md:block">
					{carImage && (
						<Image
							src={carImage}
							alt={`${row.team_name} car`}
							fill
							sizes="112px"
							className="object-contain opacity-95"
						/>
					)}
				</div>
			</div>

			<div className="mt-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2">
				<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
					{metric.primaryLabel}
				</p>
				<div className="mt-1 flex items-center justify-between gap-3">
					<div>
						<p
							className={`text-sm font-bold ${metric.retired ? 'text-red-400' : 'text-zinc-100'}`}
						>
							{metric.primaryValue}
						</p>
						{metric.secondaryLabel && (
							<p className="text-[11px] text-zinc-300">
								{metric.secondaryLabel}: {metric.secondaryValue}
							</p>
						)}
					</div>
					{sessionType === 'race' && (
						<div className="rounded-lg border border-red-300/35 bg-red-500/18 px-3 py-1.5 text-center">
							<p className="text-xl font-black leading-none text-red-100">
								+{points}
							</p>
							<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-200">
								pts
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function PodiumTop3({ rows, sessionType = 'race', seasonYear }) {
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
					sessionType={sessionType}
					seasonYear={seasonYear}
				/>
			))}
		</div>
	);
}
