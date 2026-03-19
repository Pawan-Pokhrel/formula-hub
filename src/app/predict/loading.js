export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white pt-20 px-6 md:px-12 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center overflow-hidden">
			<div className="fixed inset-0 bg-black/84 z-0" />
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute top-12 right-10 h-64 w-64 rounded-full bg-red-600/18 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
			</div>

			<div className="relative z-10 max-w-5xl mx-auto space-y-5 pt-4">
				<div className="h-9 w-64 rounded-lg bg-white/10 animate-pulse" />

				<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
					<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 p-6 space-y-4">
						<div className="h-5 w-40 rounded-md bg-white/8 animate-pulse" />
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{Array.from({ length: 4 }).map((_, idx) => (
								<div
									key={idx}
									className="h-11 rounded-xl bg-white/6 border border-white/10 animate-pulse"
								/>
							))}
						</div>
						<div className="h-12 rounded-xl bg-red-600/25 border border-red-500/40 animate-pulse" />
						<div className="h-56 rounded-xl bg-white/6 animate-pulse" />
					</div>

					<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 p-5 space-y-3">
						<div className="h-5 w-32 rounded-md bg-white/8 animate-pulse" />
						{Array.from({ length: 5 }).map((_, idx) => (
							<div
								key={idx}
								className="h-12 rounded-xl bg-white/6 animate-pulse"
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
