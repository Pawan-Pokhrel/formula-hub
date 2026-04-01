export default function StandingsLoadingSkeleton() {
	return (
		<div className="rounded-2xl border border-white/20 bg-black/60 p-5 space-y-3 animate-fade-in backdrop-blur-2xl">
			<div className="h-11 rounded-xl bg-white/10 animate-pulse" />
			{Array.from({ length: 8 }).map((_, i) => (
				<div
					key={i}
					className="h-14 rounded-xl bg-white/8 animate-pulse"
				/>
			))}
		</div>
	);
}
