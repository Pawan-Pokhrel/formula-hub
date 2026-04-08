import React from 'react';
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

function PaceTooltip({ active, payload, label }) {
	if (active && payload && payload.length) {
		return (
			<div className="bg-black/90 border border-white/20 p-3 rounded shadow-xl backdrop-blur-md">
				<p className="text-gray-300 font-bold mb-1 border-b border-white/10 pb-1 uppercase tracking-wider text-[10px]">
					Lap {label}
				</p>
				{payload.map((entry, index) => (
					<p
						key={index}
						style={{ color: entry.color }}
						className="text-xs font-black"
					>
						{entry.name}: {Number(entry.value || 0).toFixed(3)}s
					</p>
				))}
				{payload.length === 2 && (
					<p className="text-[10px] text-gray-400 mt-2 italic">
						Delta: {payload[0].value - payload[1].value > 0 ? '+' : ''}
						{(payload[0].value - payload[1].value).toFixed(3)}s
					</p>
				)}
			</div>
		);
	}
	return null;
}

/**
 * PaceDegradationChart visualises driver pace vs field median for recent laps.
 */
export default function PaceDegradationChart({ telemetryData, cliffLap }) {
	const formattedData = React.useMemo(() => {
		if (!Array.isArray(telemetryData)) return [];
		return telemetryData
			.filter((row) => row && Number.isFinite(Number(row.lap)))
			.map((row) => ({
				lap: Number(row.lap),
				driverPace: Number(row.driverPace),
				fieldPace: Number(row.fieldPace),
			}))
			.filter(
				(row) =>
					Number.isFinite(row.driverPace) && Number.isFinite(row.fieldPace)
			);
	}, [telemetryData]);

	if (!formattedData || formattedData.length === 0) {
		return (
			<div className="text-gray-500 text-xs italic">
				No telemetry data available for pace degradation tracking...
			</div>
		);
	}

	// Calculate the bounds to make the chart look zoomed-in on the exact delta
	const allTimes = formattedData
		.map((d) => d.driverPace)
		.concat(formattedData.map((d) => d.fieldPace))
		.filter(Boolean);
	const minTime = Math.min(...allTimes) - 0.5;
	const maxTime = Math.max(...allTimes) + 1.0;

	return (
		<div className="h-64 w-full pt-4">
			<ResponsiveContainer
				width="100%"
				height="100%"
			>
				<LineChart
					data={formattedData}
					margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="#ffffff15"
						vertical={false}
					/>
					<XAxis
						dataKey="lap"
						stroke="#ffffff50"
						tick={{ fill: '#ffffff80', fontSize: 10 }}
						tickMargin={10}
						minTickGap={20}
					/>
					<YAxis
						domain={[minTime, maxTime]}
						stroke="#ffffff50"
						tick={{ fill: '#ffffff80', fontSize: 10 }}
						tickFormatter={(val) => val.toFixed(1)}
						width={40}
					/>
					<Tooltip content={<PaceTooltip />} />
					<Legend
						wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
						iconType="circle"
					/>

					{cliffLap && (
						<ReferenceLine
							x={cliffLap}
							stroke="#ef4444"
							strokeDasharray="5 5"
							label={{
								position: 'top',
								value: 'TYRE CLIFF',
								fill: '#ef4444',
								fontSize: 10,
								fontWeight: 'bold',
							}}
						/>
					)}

					<Line
						type="monotone"
						name="Driver Pace"
						dataKey="driverPace"
						stroke="#3b82f6"
						strokeWidth={3}
						dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }}
						activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
					/>

					<Line
						type="monotone"
						name="Field Median"
						dataKey="fieldPace"
						stroke="#9ca3af"
						strokeWidth={2}
						strokeDasharray="4 4"
						dot={false}
						activeDot={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
