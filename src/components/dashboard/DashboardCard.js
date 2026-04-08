'use client';

import Image from 'next/image';

export default function DashboardCard({
	title,
	subtitle,
	rightSlot,
	mediaSrc,
	mediaAlt,
	mediaClassName,
	bodyScrollable = true,
	cardClassName = '',
	bodyClassName = '',
	cardStyle,
	fitContent = false,
	fillHeight,
	children,
}) {
	const shouldFillHeight = fillHeight ?? !fitContent;
	const bodyOverflowClass =
		bodyScrollable && shouldFillHeight ? 'overflow-y-auto' : 'overflow-visible';
	const cardHeightClass = shouldFillHeight ? 'h-full' : 'h-fit';
	const bodyFlexClass = shouldFillHeight ? 'flex-1' : '';

	return (
		<div
			className={`group relative flex ${cardHeightClass} flex-col overflow-hidden rounded-2xl border border-white/14 bg-linear-to-br from-zinc-900/45 via-black/70 to-zinc-800/35 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-300 hover:border-red-400/30 hover:shadow-[0_18px_52px_rgba(239,68,68,0.14)] md:p-6 ${cardClassName}`}
			style={cardStyle}
		>
			{mediaSrc && (
				<>
					<div className="pointer-events-none absolute inset-0">
						<div className="absolute inset-0 bg-linear-to-br from-black/70 via-black/50 to-black/75" />
						<Image
							src={mediaSrc}
							alt={mediaAlt || title}
							fill
							className={`object-cover opacity-35 brightness-90 transition-all duration-500 group-hover:scale-105 group-hover:opacity-55 group-hover:brightness-110 ${mediaClassName || ''}`}
						/>
						<div className="absolute inset-0 bg-linear-to-br from-black/65 via-transparent to-black/75" />
					</div>
				</>
			)}
			<div className="relative z-10 mb-4 flex items-start justify-between gap-3">
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-red-100/85">
						{title}
					</p>
					{subtitle && (
						<p className="mt-1 text-sm text-gray-200/90">{subtitle}</p>
					)}
				</div>
				<div className="inline-flex items-center gap-2">{rightSlot}</div>
			</div>
			<div
				className={`relative z-10 ${bodyFlexClass} pr-1 ${bodyOverflowClass} ${bodyClassName}`}
			>
				{children}
			</div>
		</div>
	);
}
