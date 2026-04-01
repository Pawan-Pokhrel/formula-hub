function Skeleton({ className = '' }) {
	return <div className={`rounded-xl bg-white/6 animate-pulse ${className}`} />;
}

export default function RaceLoadingSkeleton() {
	return (
		<div className="px-4 md:px-8 lg:px-12 pb-12 pt-2 animate-fade-in">
			<div className="max-w-[1600px] mx-auto space-y-4">
				<Skeleton className="h-20 rounded-2xl border border-white/10" />

				<div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
					<div className="space-y-4">
						<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/2 p-4 space-y-2">
							<Skeleton className="h-8" />
							{Array.from({ length: 8 }).map((_, idx) => (
								<Skeleton
									key={idx}
									className="h-9"
								/>
							))}
						</div>
						<Skeleton className="h-80 rounded-2xl border border-white/10" />
					</div>

					<div className="space-y-4">
						<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/2 p-5 space-y-3">
							<Skeleton className="h-14" />
							<Skeleton className="h-24" />
							<Skeleton className="h-20" />
						</div>
						<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/2 p-4 space-y-2">
							<Skeleton className="h-4 w-32" />
							{Array.from({ length: 5 }).map((_, idx) => (
								<Skeleton
									key={idx}
									className="h-9"
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
