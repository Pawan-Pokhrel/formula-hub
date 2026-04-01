'use client';

import { useState } from 'react';
import {
	FaBroadcastTower,
	FaChartPie,
	FaFlagCheckered,
	FaHome,
	FaThumbtack,
	FaTrophy,
} from 'react-icons/fa';

const ICONS = {
	overview: FaHome,
	race: FaFlagCheckered,
	championship: FaTrophy,
	weekend: FaBroadcastTower,
	analytics: FaChartPie,
};

export default function DashboardSidebar({
	items,
	activeId,
	onSelect,
	pinned,
	onTogglePinned,
}) {
	const [hovered, setHovered] = useState(false);
	const expanded = pinned || hovered;

	return (
		<aside
			className={`relative hidden min-h-0 shrink-0 self-stretch overflow-hidden rounded-2xl border border-white/15 bg-black/45 backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col ${
				expanded ? 'w-64' : 'w-20'
			}`}
			onMouseEnter={() => {
				if (!pinned) setHovered(true);
			}}
			onMouseLeave={() => {
				if (!pinned) setHovered(false);
			}}
		>
			<div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
				<div className="inline-flex items-center gap-2">
					<span
						className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-black/35 text-red-200 transition-all ${
							expanded ?
								'opacity-0 max-w-0 overflow-hidden border-transparent bg-transparent'
							:	'opacity-100 max-w-10'
						}`}
					>
						<FaChartPie className="text-sm" />
					</span>
					<p
						className={`text-[10px] font-semibold uppercase tracking-[0.2em] text-red-200/90 transition-opacity ${
							expanded ? 'opacity-100' : 'opacity-0'
						}`}
					>
						Dashboards
					</p>
				</div>
				<button
					type="button"
					onClick={() => onTogglePinned(!pinned)}
					className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 text-sm transition-colors ${
						pinned ?
							'bg-red-500/20 text-red-100 hover:bg-red-500/30'
						:	'bg-black/35 text-gray-300 hover:bg-white/10 hover:text-white'
					}`}
					aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
					title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
				>
					<FaThumbtack />
				</button>
			</div>

			<nav className="flex-1 space-y-2 px-2 py-3">
				{items.map((item) => {
					const Icon = ICONS[item.id] || FaHome;
					const active = activeId === item.id;
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onSelect(item.id)}
							className={`group flex h-11 w-full cursor-pointer items-center rounded-xl border px-3 transition-all duration-300 ${
								active ?
									'border-red-500/35 bg-red-500/15 text-red-50'
								:	'border-transparent text-gray-300 hover:border-white/15 hover:bg-white/6 hover:text-white'
							}`}
							title={item.label}
						>
							<span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
								<Icon className="text-base" />
							</span>
							<span
								className={`ml-3 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ${
									expanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'
								}`}
							>
								{item.label}
							</span>
						</button>
					);
				})}
			</nav>
		</aside>
	);
}
