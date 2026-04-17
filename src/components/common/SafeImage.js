'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function SafeImage({
	alt,
	fallback = null,
	hideOnError = false,
	...props
}) {
	const [hasError, setHasError] = useState(false);

	if (hasError && hideOnError) {
		return fallback;
	}

	return (
		<Image
			alt={alt}
			onError={() => {
				if (hideOnError) {
					setHasError(true);
				}
			}}
			{...props}
		/>
	);
}
