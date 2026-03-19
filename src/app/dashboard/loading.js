export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white pt-20 px-6 md:px-12 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center overflow-hidden">
			<div className="fixed inset-0 bg-black/84 z-0" />
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute top-16 left-8 h-72 w-72 rounded-full bg-red-600/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
			</div>

			<div className="relative z-10 max-w-[1400px] mx-auto space-y-6 pt-4">
				<div className="h-9 w-56 rounded-lg bg-white/10 animate-pulse" />

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, idx) => (
						<div
							key={idx}
							className="h-28 rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 animate-pulse"
						/>
					))}
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 p-5 space-y-3">
						<div className="h-5 w-40 rounded-md bg-white/8 animate-pulse" />
						<div className="h-44 rounded-xl bg-white/6 animate-pulse" />
					</div>
					<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 p-5 space-y-3">
						<div className="h-5 w-44 rounded-md bg-white/8 animate-pulse" />
						<div className="h-44 rounded-xl bg-white/6 animate-pulse" />
					</div>
				</div>

				<div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 p-5 space-y-3">
					<div className="h-5 w-52 rounded-md bg-white/8 animate-pulse" />
					<div className="h-72 rounded-xl bg-white/6 animate-pulse" />
				</div>
			</div>
		</div>
	);
}
