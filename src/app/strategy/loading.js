function SkeletonBlock({ className = '' }) {
	return (
		<div
			className={`relative overflow-hidden rounded-xl bg-white/5 ${className}`}
		>
			<div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent animate-[pulse_1.8s_ease-in-out_infinite]" />
		</div>
	);
}

export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white pt-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center overflow-hidden">
			<div className="fixed inset-0 bg-black/82 z-0" />

			{/* ambient lighting to make skeleton feel less flat */}
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute -top-24 -left-12 h-72 w-72 rounded-full bg-red-600/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
				<div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl animate-[pulse_5s_ease-in-out_infinite]" />
			</div>

			<div className="relative z-10 px-6 md:px-12 pb-12 pt-4">
				<div className="max-w-[1600px] mx-auto space-y-4">
					{/* Header skeleton */}
					<div className="flex items-center justify-between py-2">
						<div className="space-y-2">
							<SkeletonBlock className="h-8 w-72 rounded-lg" />
							<SkeletonBlock className="h-3 w-96 rounded-md animate-[pulse_2.2s_ease-in-out_infinite]" />
						</div>
						<SkeletonBlock className="h-10 w-32 rounded-lg" />
					</div>

					{/* Setup panel skeleton */}
					<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/6 to-white/2 p-6 backdrop-blur-xl">
						<div className="grid grid-cols-1 md:grid-cols-[200px_1fr_180px] gap-6 items-end">
							<div className="space-y-2">
								<SkeletonBlock className="h-3 w-14 rounded-md" />
								<SkeletonBlock className="h-12 w-full" />
							</div>
							<div className="space-y-2">
								<SkeletonBlock className="h-3 w-20 rounded-md animate-[pulse_2.1s_ease-in-out_infinite]" />
								<SkeletonBlock className="h-12 w-full" />
							</div>
							<SkeletonBlock className="h-12 w-full rounded-xl bg-red-600/25 animate-[pulse_1.4s_ease-in-out_infinite]" />
						</div>
					</div>

					{/* Playback + layout skeleton */}
					<SkeletonBlock className="h-20 w-full rounded-2xl border border-white/10" />

					<div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
						<div className="space-y-4">
							<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/2 overflow-hidden">
								<div className="h-10 border-b border-white/10 px-4 flex items-center">
									<SkeletonBlock className="h-3 w-56 rounded-md" />
								</div>
								<div className="p-4 space-y-2">
									{Array.from({ length: 10 }).map((_, idx) => (
										<SkeletonBlock
											key={idx}
											className={`h-9 w-full rounded-lg ${
												idx % 2 === 0 ?
													'animate-[pulse_1.7s_ease-in-out_infinite]'
												:	'animate-[pulse_2.4s_ease-in-out_infinite]'
											}`}
										/>
									))}
								</div>
							</div>

							<SkeletonBlock className="h-80 w-full rounded-2xl border border-white/10" />
						</div>

						<div className="space-y-4">
							<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/2 p-5 space-y-4">
								<SkeletonBlock className="h-14 w-full rounded-lg" />
								<SkeletonBlock className="h-28 w-full rounded-xl animate-[pulse_1.6s_ease-in-out_infinite]" />
								<SkeletonBlock className="h-24 w-full rounded-xl" />
								<SkeletonBlock className="h-20 w-full rounded-xl animate-[pulse_2.3s_ease-in-out_infinite]" />
							</div>

							<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/2 p-4 space-y-2">
								<SkeletonBlock className="h-4 w-28 rounded-md" />
								{Array.from({ length: 5 }).map((_, idx) => (
									<SkeletonBlock
										key={idx}
										className="h-9 w-full rounded-lg"
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
