export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-center overflow-hidden">
			<div className="fixed inset-0 bg-black/85 z-0" />

			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute top-16 left-12 h-64 w-64 rounded-full bg-red-600/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
				<div className="absolute bottom-12 right-12 h-72 w-72 rounded-full bg-white/5 blur-3xl animate-[pulse_5s_ease-in-out_infinite]" />
			</div>

			<div className="relative z-10 min-h-screen flex items-center justify-center px-6">
				<div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/4 backdrop-blur-xl p-8 space-y-6">
					<div className="h-8 w-56 rounded-lg bg-white/10 animate-pulse" />
					<div className="space-y-3">
						<div className="h-4 w-full rounded-md bg-white/5 animate-pulse" />
						<div className="h-4 w-10/12 rounded-md bg-white/5 animate-pulse" />
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
						{Array.from({ length: 3 }).map((_, idx) => (
							<div
								key={idx}
								className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse"
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
