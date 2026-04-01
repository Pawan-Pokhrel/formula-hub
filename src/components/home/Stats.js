import { FaChartBar, FaClock, FaCogs } from 'react-icons/fa';

const STATS = [
	{
		value: '6',
		label: 'Integrated analytics modules',
		help: 'Schedule, standings, track, prediction, strategy, dashboard',
		icon: FaCogs,
	},
	{
		value: '2021-2026',
		label: 'Race data range in project',
		help: 'Replay and model workflows backed by multi-season files',
		icon: FaChartBar,
	},
	{
		value: '< 1 min',
		label: 'To run first scenario',
		help: 'Open predict or strategy and start simulating immediately',
		icon: FaClock,
	},
];

export default function Stats() {
	return (
		<section className="px-6 py-20 md:px-10 lg:px-16">
			<div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-linear-to-b from-zinc-800/25 via-black/75 to-black/80 p-7 md:p-10">
				<div className="mb-8">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
						Value Snapshot
					</p>
					<h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
						Built To Be Fast, Practical, And Decision-Focused
					</h2>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{STATS.map((item) => {
						const Icon = item.icon;

						return (
							<div
								key={item.label}
								className="rounded-2xl border border-white/10 bg-white/3 p-5"
							>
								<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-500/10 text-amber-200">
									<Icon size={16} />
								</div>
								<p className="text-3xl font-extrabold tracking-tight text-white">
									{item.value}
								</p>
								<p className="mt-1 text-sm font-medium text-zinc-100">
									{item.label}
								</p>
								<p className="mt-2 text-sm leading-relaxed text-zinc-400">
									{item.help}
								</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
