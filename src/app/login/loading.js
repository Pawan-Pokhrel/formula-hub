export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-center overflow-hidden">
			<div className="fixed inset-0 bg-black/86 z-0" />
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute top-24 right-12 h-60 w-60 rounded-full bg-red-600/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
			</div>

			<div className="relative z-10 min-h-screen flex items-center justify-center px-6">
				<div className="w-full max-w-md rounded-2xl border border-white/10 bg-linear-to-b from-white/8 to-white/3 backdrop-blur-xl p-7 space-y-5">
					<div className="h-7 w-40 rounded-lg bg-white/10 animate-pulse" />
					<div className="h-4 w-56 rounded-md bg-white/6 animate-pulse" />

					<div className="space-y-3 pt-2">
						<div className="h-11 w-full rounded-xl bg-white/6 border border-white/10 animate-pulse" />
						<div className="h-11 w-full rounded-xl bg-white/6 border border-white/10 animate-pulse" />
					</div>

					<div className="h-11 w-full rounded-xl bg-red-600/25 border border-red-500/40 animate-pulse" />
				</div>
			</div>
		</div>
	);
}
