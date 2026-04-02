export default function TeamDetailLoading() {
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1400px] mx-auto pb-12">
				<div className="h-8 w-44 rounded-lg bg-white/10" />
				<div className="mt-5 h-[360px] rounded-3xl bg-white/8 animate-pulse" />
				<div className="mt-4 h-[220px] rounded-3xl bg-white/8 animate-pulse" />
				<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="h-[200px] rounded-2xl bg-white/8 animate-pulse" />
					<div className="h-[200px] rounded-2xl bg-white/8 animate-pulse" />
				</div>
			</div>
		</div>
	);
}
