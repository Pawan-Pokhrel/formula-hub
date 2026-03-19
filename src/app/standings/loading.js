export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white pt-20 px-6 md:px-12 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center overflow-hidden">
			<div className="fixed inset-0 bg-black/84 z-0" />
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute top-12 left-12 h-72 w-72 rounded-full bg-red-600/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
			</div>

			<div className="relative z-10 max-w-[1400px] mx-auto pt-4 space-y-6">
				<div className="flex justify-between items-center">
					<div className="h-9 w-64 rounded-lg bg-white/10 animate-pulse" />
					<div className="h-10 w-36 rounded-xl bg-white/8 border border-white/10 animate-pulse" />
				</div>

				<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 p-4 space-y-3">
					<div className="h-10 rounded-xl bg-white/8 animate-pulse" />
					{Array.from({ length: 10 }).map((_, idx) => (
						<div
							key={idx}
							className="h-14 rounded-xl bg-white/6 border border-white/10 animate-pulse"
							style={{ opacity: 1 - idx * 0.05 }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
