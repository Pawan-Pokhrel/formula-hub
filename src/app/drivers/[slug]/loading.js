import Link from 'next/link';

function PulseCard({ className = '' }) {
	return (
		<div
			className={`rounded-2xl border border-white/12 bg-white/6 animate-pulse ${className}`}
		/>
	);
}

export default function DriverDetailLoading() {
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1300px] mx-auto pb-12">
				<Link
					href="/drivers"
					className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors mb-5"
				>
					Back to Drivers
				</Link>

				<div className="mb-4 rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
					<div className="h-[54px] rounded-xl bg-white/8 animate-pulse" />
				</div>

				<PulseCard className="h-[420px] rounded-3xl" />

				<div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
					<PulseCard className="h-[230px]" />
					<PulseCard className="h-[230px]" />
				</div>

				<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
					<PulseCard className="h-[180px]" />
					<PulseCard className="h-[180px]" />
				</div>
			</div>
		</div>
	);
}
