import { Suspense } from 'react';
import PredictPageClient from './PredictPageClient';
import Loading from './loading';

export default function PredictPage() {
	return (
		<Suspense fallback={<Loading />}>
			<PredictPageClient />
		</Suspense>
	);
}
