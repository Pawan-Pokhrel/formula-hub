export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white pt-20 px-6 md:px-12 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center overflow-hidden">
			<div className="fixed inset-0 bg-black/84 z-0" />
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-red-600/18 blur-3xl animate-[pulse_4.3s_ease-in-out_infinite]" />
			</div>

			<div className="relative z-10 max-w-[1400px] mx-auto pt-4 space-y-6">
				<div className="flex justify-between items-center">
					<div className="h-9 w-56 rounded-lg bg-white/10 animate-pulse" />
					<div className="h-10 w-40 rounded-xl bg-white/8 border border-white/10 animate-pulse" />
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{Array.from({ length: 12 }).map((_, idx) => (
						<div
							key={idx}
							className="h-36 rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 p-3 space-y-2"
						>
							<div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
							<div className="h-16 rounded-lg bg-white/6 animate-pulse" />
							<div className="h-3 w-4/5 rounded bg-white/8 animate-pulse" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
