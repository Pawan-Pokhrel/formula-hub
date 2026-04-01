'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableWidget({ id, className, children }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`${className} ${isDragging ? 'z-40 opacity-90' : ''}`}
		>
			{children({
				dragHandleProps: { ...attributes, ...listeners },
				isDragging,
			})}
		</div>
	);
}
