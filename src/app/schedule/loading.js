export default function Loading() {
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/82 z-0" />
			<div className="relative z-10 max-w-[1500px] mx-auto space-y-4 animate-fade-in">
				<div className="h-10 w-72 rounded-xl bg-white/10 animate-pulse" />
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
					<div className="h-52 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
					<div className="h-52 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
				</div>
				<div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
					<div className="h-10 rounded-xl bg-white/8 animate-pulse" />
					{Array.from({ length: 9 }).map((_, i) => (
						<div
							key={i}
							className="h-12 rounded-xl bg-white/6 animate-pulse"
						/>
					))}
				</div>
			</div>
		</div>
	);
}
