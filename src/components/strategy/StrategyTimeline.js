import { useEffect, useRef } from 'react';

import { COMPOUND_COLORS, COMPOUND_SHORT } from './constants';

export default function StrategyTimeline({
	raceData,
	currentLap,
	selectedDriver,
}) {
	const canvasRef = useRef(null);
	const containerRef = useRef(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container || !raceData) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const rect = container.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		const width = rect.width;
		const height = rect.height;
		ctx.clearRect(0, 0, width, height);

		const drivers = raceData.drivers || {};
		const laps = raceData.driver_laps || {};
		const totalLaps = raceData.circuit_info?.total_laps || 60;

		// Keep the chart readable: top 10 plus currently selected driver.
		const sortedAbbrs = Object.keys(drivers).sort((a, b) => {
			const lastLapA = laps[a]?.[laps[a]?.length - 1];
			const lastLapB = laps[b]?.[laps[b]?.length - 1];
			return (lastLapA?.pos || 99) - (lastLapB?.pos || 99);
		});

		let visibleDrivers = sortedAbbrs.slice(0, 10);
		if (selectedDriver && !visibleDrivers.includes(selectedDriver)) {
			visibleDrivers = [...visibleDrivers.slice(0, 9), selectedDriver];
		}

		const LEFT = 60;
		const TOP = 30;
		const RIGHT = 20;
		const BOTTOM = 30;
		const plotW = width - LEFT - RIGHT;
		const plotH = height - TOP - BOTTOM;
		const rowH = Math.min(28, plotH / visibleDrivers.length);

		ctx.strokeStyle = 'rgba(255,255,255,0.04)';
		ctx.lineWidth = 1;
		const gridStep = Math.ceil(totalLaps / 10);

		for (let lap = 0; lap <= totalLaps; lap += gridStep) {
			const x = LEFT + (lap / totalLaps) * plotW;
			ctx.beginPath();
			ctx.moveTo(x, TOP - 5);
			ctx.lineTo(x, TOP + visibleDrivers.length * rowH + 5);
			ctx.stroke();

			ctx.fillStyle = 'rgba(255,255,255,0.3)';
			ctx.font = '9px monospace';
			ctx.textAlign = 'center';
			ctx.fillText(`L${lap}`, x, TOP - 10);
		}

		visibleDrivers.forEach((abbr, idx) => {
			const y = TOP + idx * rowH;
			const driverLaps = laps[abbr] || [];
			const isSelected = abbr === selectedDriver;
			const driverInfo = drivers[abbr] || {};

			ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
			ctx.font = isSelected ? 'bold 10px sans-serif' : '10px sans-serif';
			ctx.textAlign = 'right';
			ctx.fillText(abbr, LEFT - 8, y + rowH / 2 + 3);

			ctx.fillStyle = driverInfo.color || '#666';
			ctx.fillRect(LEFT - 5, y + 4, 3, rowH - 8);

			let stintStart = 0;
			let currentCompound = null;

			for (let i = 0; i <= driverLaps.length; i += 1) {
				const lapData = driverLaps[i];
				const compound = lapData?.compound;

				if (compound !== currentCompound || i === driverLaps.length) {
					if (currentCompound && i > stintStart) {
						const x1 = LEFT + (stintStart / totalLaps) * plotW;
						const x2 = LEFT + (i / totalLaps) * plotW;
						const barH = rowH - 8;
						const color = COMPOUND_COLORS[currentCompound] || '#666';

						const gradient = ctx.createLinearGradient(
							x1,
							y + 4,
							x1,
							y + 4 + barH
						);
						gradient.addColorStop(0, `${color}${isSelected ? 'cc' : '88'}`);
						gradient.addColorStop(1, `${color}${isSelected ? '66' : '44'}`);
						ctx.fillStyle = gradient;

						ctx.beginPath();
						ctx.roundRect(x1, y + 4, x2 - x1, barH, 3);
						ctx.fill();

						if (isSelected) {
							ctx.strokeStyle = color;
							ctx.lineWidth = 1;
							ctx.beginPath();
							ctx.roundRect(x1, y + 4, x2 - x1, barH, 3);
							ctx.stroke();
						}

						if (x2 - x1 > 25) {
							ctx.fillStyle = '#fff';
							ctx.font = '8px sans-serif';
							ctx.textAlign = 'center';
							ctx.fillText(
								COMPOUND_SHORT[currentCompound] || '?',
								(x1 + x2) / 2,
								y + rowH / 2 + 3
							);
						}
					}

					stintStart = i;
					currentCompound = compound;
				}
			}
		});

		if (currentLap > 0) {
			const x = LEFT + (currentLap / totalLaps) * plotW;
			ctx.strokeStyle = '#dc2626';
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 3]);

			ctx.beginPath();
			ctx.moveTo(x, TOP - 5);
			ctx.lineTo(x, TOP + visibleDrivers.length * rowH + 5);
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.fillStyle = '#dc2626';
			ctx.beginPath();
			ctx.roundRect(x - 14, TOP + visibleDrivers.length * rowH + 8, 28, 14, 4);
			ctx.fill();

			ctx.fillStyle = '#fff';
			ctx.font = 'bold 9px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(
				`L${currentLap}`,
				x,
				TOP + visibleDrivers.length * rowH + 18
			);
		}
	}, [raceData, currentLap, selectedDriver]);

	return (
		<div className="bg-linear-to-b from-white/5 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
			<h3 className="text-xs uppercase tracking-[0.15em] text-gray-500 font-medium mb-3">
				Strategy Timeline
			</h3>
			<div
				ref={containerRef}
				className="w-full"
				style={{ height: '320px' }}
			>
				<canvas
					ref={canvasRef}
					className="w-full h-full"
				/>
			</div>
		</div>
	);
}
