'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CenterSnapRollerClient.module.css';

const ITEM_WIDTH_PX = 196;
const NAV_DELAY_MS = 110;
const PROGRAMMATIC_GUARD_MS = 260;
const DRAG_CLICK_THRESHOLD_PX = 6;

function getNearestIndex(viewport, nodes) {
	const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;

	nodes.forEach((node, index) => {
		if (!node) return;
		const nodeCenter = node.offsetLeft + node.offsetWidth / 2;
		const distance = Math.abs(nodeCenter - centerX);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	});

	return nearestIndex;
}

export default function CenterSnapRollerClient({ items, activeId, ariaLabel }) {
	const router = useRouter();
	const pathname = usePathname();
	const viewportRef = useRef(null);
	const itemRefs = useRef([]);
	const navTimerRef = useRef(null);
	const guardTimerRef = useRef(null);
	const isProgrammaticScrollRef = useRef(false);
	const isPointerDownRef = useRef(false);
	const isDraggingRef = useRef(false);
	const dragStartXRef = useRef(0);
	const dragStartScrollLeftRef = useRef(0);
	const pressedIndexRef = useRef(null);
	const [isDragging, setIsDragging] = useState(false);
	const [viewportWidth, setViewportWidth] = useState(0);

	const safeItems = useMemo(
		() => (Array.isArray(items) ? items.filter(Boolean) : []),
		[items]
	);
	const activeIndex = useMemo(() => {
		const idx = safeItems.findIndex((item) => item.id === activeId);
		return idx >= 0 ? idx : 0;
	}, [safeItems, activeId]);
	const [centeredIndex, setCenteredIndex] = useState(activeIndex);

	useEffect(() => {
		setCenteredIndex(activeIndex);
	}, [activeIndex]);

	function centerIndex(index, behavior = 'auto') {
		const viewport = viewportRef.current;
		const target = itemRefs.current[index];
		if (!viewport || !target) return;

		isProgrammaticScrollRef.current = true;
		viewport.scrollTo({
			left: target.offsetLeft - (viewport.clientWidth - target.offsetWidth) / 2,
			behavior,
		});

		if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
		guardTimerRef.current = setTimeout(() => {
			isProgrammaticScrollRef.current = false;
		}, PROGRAMMATIC_GUARD_MS);
	}

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		setViewportWidth(viewport.clientWidth || 0);

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			setViewportWidth(entry.contentRect.width || 0);
		});
		observer.observe(viewport);

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!safeItems.length) return;
		const frame = window.requestAnimationFrame(() =>
			centerIndex(activeIndex, 'auto')
		);
		const timer = window.setTimeout(() => centerIndex(activeIndex, 'auto'), 96);

		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timer);
			if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
		};
	}, [activeIndex, safeItems, viewportWidth]);

	useEffect(() => {
		function handleResize() {
			centerIndex(activeIndex, 'auto');
		}
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [activeIndex]);

	useEffect(() => {
		return () => {
			if (navTimerRef.current) clearTimeout(navTimerRef.current);
			if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
		};
	}, []);

	if (!safeItems.length) return null;

	function navigateToIndex(index) {
		const item = safeItems[index];
		if (!item) return;
		if (item.id === activeId) return;
		if (pathname === item.href) return;
		router.push(item.href);
	}

	function handleItemClick(index) {
		if (isDraggingRef.current) return;
		const item = safeItems[index];
		if (!item) return;
		setCenteredIndex(index);
		centerIndex(index, 'smooth');
		navigateToIndex(index);
	}

	function handleScroll() {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const nearestIndex = getNearestIndex(viewport, itemRefs.current);
		setCenteredIndex(nearestIndex);

		if (isProgrammaticScrollRef.current) return;
		if (isPointerDownRef.current) return;
		if (navTimerRef.current) clearTimeout(navTimerRef.current);

		navTimerRef.current = setTimeout(
			() => navigateToIndex(nearestIndex),
			NAV_DELAY_MS
		);
	}

	function handlePointerDown(event) {
		if (event.button !== undefined && event.button !== 0) return;
		const viewport = viewportRef.current;
		if (!viewport) return;
		isPointerDownRef.current = true;
		isDraggingRef.current = false;
		setIsDragging(false);
		const target = event.target;
		const itemNode =
			target && typeof target.closest === 'function' ?
				target.closest('[data-roller-index]')
			:	null;
		pressedIndexRef.current =
			itemNode ? Number(itemNode.getAttribute('data-roller-index')) : null;
		dragStartXRef.current = event.clientX;
		dragStartScrollLeftRef.current = viewport.scrollLeft;
	}

	function handlePointerMove(event) {
		if (!isPointerDownRef.current) return;
		const viewport = viewportRef.current;
		if (!viewport) return;
		const deltaX = event.clientX - dragStartXRef.current;
		if (Math.abs(deltaX) > DRAG_CLICK_THRESHOLD_PX) {
			isDraggingRef.current = true;
			setIsDragging(true);
		}
		if (!isDraggingRef.current) return;
		viewport.scrollLeft = dragStartScrollLeftRef.current - deltaX;
		event.preventDefault();
	}

	function handlePointerUp(event) {
		if (!isPointerDownRef.current) return;
		const wasDragging = isDraggingRef.current;
		isPointerDownRef.current = false;
		isDraggingRef.current = false;
		setIsDragging(false);
		const pressedIndex =
			Number.isInteger(pressedIndexRef.current) ?
				pressedIndexRef.current
			:	null;
		pressedIndexRef.current = null;
		const viewport = viewportRef.current;
		if (viewport) {
			if (!wasDragging && pressedIndex !== null) {
				setCenteredIndex(pressedIndex);
				centerIndex(pressedIndex, 'smooth');
				navigateToIndex(pressedIndex);
				return;
			}
			const nearestIndex = getNearestIndex(viewport, itemRefs.current);
			setCenteredIndex(nearestIndex);
			centerIndex(nearestIndex, 'smooth');
			if (wasDragging) navigateToIndex(nearestIndex);
		}
	}

	const sideSpacerPx = Math.max(0, viewportWidth / 2 - ITEM_WIDTH_PX / 2);

	return (
		<div
			className={styles.shell}
			aria-label={ariaLabel || 'Page roller'}
		>
			<div className={styles.edgeLeft} />
			<div className={styles.edgeRight} />
			<div
				ref={viewportRef}
				className={`${styles.viewport} ${isDragging ? styles.dragging : ''}`}
				onScroll={handleScroll}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				onPointerLeave={handlePointerUp}
			>
				<div className={styles.track}>
					<div
						className={styles.spacer}
						style={{ width: `${sideSpacerPx}px` }}
					/>
					{safeItems.map((item, index) => {
						const distance = Math.abs(index - centeredIndex);
						const isCentered = distance === 0;
						const isActivePage = item.id === activeId;
						const isHighlighted = isCentered || isActivePage;
						const opacity =
							isHighlighted ? 1
							: distance === 1 ? 0.64
							: distance === 2 ? 0.42
							: 0.28;
						const scale =
							isHighlighted ? 1
							: distance === 1 ? 0.94
							: distance === 2 ? 0.88
							: 0.84;

						return (
							<button
								key={item.id}
								type="button"
								data-roller-index={index}
								ref={(node) => {
									itemRefs.current[index] = node;
								}}
								onClick={() => handleItemClick(index)}
								className={styles.item}
								style={{
									width: `${ITEM_WIDTH_PX}px`,
									maxWidth: `${ITEM_WIDTH_PX}px`,
									opacity,
									transform: `scale(${scale})`,
									borderColor:
										isHighlighted ?
											`rgba(255,255,255,0.72)`
										:	`rgba(255,255,255,0.2)`,
									background:
										isHighlighted ?
											`linear-gradient(120deg, ${item.color}66 0%, ${item.color}2E 100%)`
										:	'rgba(0,0,0,0.35)',
								}}
							>
								{item.logo ?
									<span className={styles.logoWrap}>
										<Image
											src={item.logo}
											alt={item.label}
											fill
											className={styles.logo}
										/>
									</span>
								:	<span
										className={styles.dot}
										style={{ backgroundColor: item.color }}
									/>
								}
								<span className={styles.label}>{item.label}</span>
								{item.meta && <span className={styles.meta}>{item.meta}</span>}
							</button>
						);
					})}
					<div
						className={styles.spacer}
						style={{ width: `${sideSpacerPx}px` }}
					/>
				</div>
			</div>
			<div className={styles.centerMarker} />
		</div>
	);
}
