'use client';

import SafeImage from '@/components/common/SafeImage';
import { getCachedAvatarObjectUrl } from '@/lib/avatar/avatarCache';
import { useEffect, useRef, useState } from 'react';

export default function CachedAvatarImage({
	src,
	alt,
	className = '',
	referrerPolicy = 'no-referrer',
	sizes = '100vw',
	...props
}) {
	const [cachedAvatar, setCachedAvatar] = useState({
		source: '',
		objectUrl: '',
	});
	const objectUrlRef = useRef(null);

	useEffect(() => {
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = null;
		}

		if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
			return undefined;
		}

		const controller = new AbortController();
		let disposed = false;

		getCachedAvatarObjectUrl(src, { signal: controller.signal })
			.then((cachedSrc) => {
				if (disposed || !cachedSrc) {
					return;
				}
				objectUrlRef.current = cachedSrc;
				setCachedAvatar({
					source: src,
					objectUrl: cachedSrc,
				});
			})
			.catch(() => {});

		return () => {
			disposed = true;
			controller.abort();
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
		};
	}, [src]);

	const displaySrc =
		cachedAvatar.source === src && cachedAvatar.objectUrl ?
			cachedAvatar.objectUrl
		:	src || '';

	if (!displaySrc) {
		return null;
	}

	return (
		<SafeImage
			src={displaySrc}
			alt={alt}
			fill
			sizes={sizes}
			unoptimized
			referrerPolicy={referrerPolicy}
			className={className}
			{...props}
		/>
	);
}
