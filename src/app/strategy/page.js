import { Suspense } from 'react';
import StrategyPageClient from '@/components/strategy/StrategyPageClient';

function StrategySkeleton() {
	return (
		<div className="min-h-screen bg-black text-white pt-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/80 z-0" />
			<div className="relative z-10 px-6 md:px-12 pt-8 max-w-[1600px] mx-auto space-y-4">
				<div className="h-10 w-72 animate-pulse rounded-xl bg-white/8" />
				<div className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
				<div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
			</div>
		</div>
	);
}

export default function StrategyPage() {
	return (
		<Suspense fallback={<StrategySkeleton />}>
			<StrategyPageClient />
		</Suspense>
	);
}
