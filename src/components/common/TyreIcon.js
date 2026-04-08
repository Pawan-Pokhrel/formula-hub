import React from 'react';
import { COMPOUND_COLORS } from '@/components/strategy/constants';

export default function TyreIcon({ compound, className = "w-5 h-5", sizeLabel = false, forceCircle = false }) {
	if (!compound) return null;
	const name = String(compound).toLowerCase();
	let src = null;
	
	if (name.includes('soft')) src = '/images/tyre/soft.png';
	else if (name.includes('medium')) src = '/images/tyre/medium.png';
	else if (name.includes('hard')) src = '/images/tyre/hard.png';
	else if (name.includes('inter')) src = '/images/tyre/intermediate.png';
	else if (name.includes('wet')) src = '/images/tyre/wet.png';

	if (src && !forceCircle) {
		return (
			<img 
				src={src} 
				alt={compound} 
				className={`object-contain drop-shadow-md ${className}`} 
				title={compound} 
			/>
		);
	}
	
	return (
		<div
			className={`rounded-full border border-black/20 shrink-0 ${className} flex items-center justify-center font-bold`}
			style={{ backgroundColor: COMPOUND_COLORS[compound] || '#666' }}
			title={`${compound} compound`}
		>
			{(sizeLabel || forceCircle) && (
				<span className="flex h-full w-full items-center justify-center text-[10px] mix-blend-difference text-white/90">
					{compound.charAt(0).toUpperCase()}
				</span>
			)}
		</div>
	);
}
