'use client';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
	FaBolt,
	FaCloudSun,
	FaFlagCheckered,
	FaInfoCircle,
	FaRoad,
	FaStopwatch,
	FaTachometerAlt,
	FaThermometerHalf,
} from 'react-icons/fa';
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

// Dummy data expanded
const driverStandings = [
	{ position: 1, driver: 'VER', points: 354, team: 'Red Bull' },
	{ position: 2, driver: 'LEC', points: 289, team: 'Ferrari' },
	{ position: 3, driver: 'HAM', points: 265, team: 'Mercedes' },
	{ position: 4, driver: 'PER', points: 245, team: 'Red Bull' },
	{ position: 5, driver: 'SAI', points: 220, team: 'Ferrari' },
	{ position: 6, driver: 'NOR', points: 198, team: 'McLaren' },
	{ position: 7, driver: 'RUS', points: 175, team: 'Mercedes' },
	{ position: 8, driver: 'PIA', points: 150, team: 'McLaren' },
	{ position: 9, driver: 'ALO', points: 120, team: 'Aston Martin' },
	{ position: 10, driver: 'STR', points: 95, team: 'Aston Martin' },
];

const teamStandings = [
	{ position: 1, team: 'Red Bull', points: 354 + 245 },
	{ position: 2, team: 'Ferrari', points: 289 + 220 },
	{ position: 3, team: 'Mercedes', points: 265 + 175 },
	{ position: 4, team: 'McLaren', points: 198 + 150 },
	{ position: 5, team: 'Aston Martin', points: 120 + 95 },
];

const raceSchedule = [
	{
		round: 1,
		name: 'Bahrain GP',
		date: 'Mar 2',
		track: 'Sakhir',
		status: 'Completed',
	},
	{
		round: 2,
		name: 'Saudi Arabian GP',
		date: 'Mar 9',
		track: 'Jeddah',
		status: 'Completed',
	},
	{
		round: 3,
		name: 'Australian GP',
		date: 'Mar 23',
		track: 'Melbourne',
		status: 'Completed',
	},
	{
		round: 4,
		name: 'Japanese GP',
		date: 'Apr 7',
		track: 'Suzuka',
		status: 'Upcoming',
	},
	{
		round: 5,
		name: 'Chinese GP',
		date: 'Apr 21',
		track: 'Shanghai',
		status: 'Upcoming',
	},
	// More...
	{
		round: 24,
		name: 'Abu Dhabi GP',
		date: 'Dec 8',
		track: 'Yas Marina',
		status: 'Upcoming',
	},
];

const recentResults = [
	{ race: 'Australian GP', winner: 'LEC', second: 'NOR', third: 'HAM' },
	{ race: 'Saudi Arabian GP', winner: 'VER', second: 'PER', third: 'LEC' },
	{ race: 'Bahrain GP', winner: 'VER', second: 'PER', third: 'SAI' },
];

const pitStopLog = [
	{ lap: 12, driver: 'VER', duration: 2.3, tire: 'Medium' },
	{ lap: 15, driver: 'LEC', duration: 2.5, tire: 'Hard' },
	{ lap: 18, driver: 'HAM', duration: 2.1, tire: 'Soft' },
	// More...
];

const weatherData = {
	temperature: 28,
	condition: 'Dry',
	wind: '5 km/h NW',
	rainChance: 10,
};

const telemetryData = [
	{ time: '0s', speed: 298, throttle: 98, brake: 0, rpm: 11800 },
	{ time: '5s', speed: 312, throttle: 100, brake: 0, rpm: 12100 },
	{ time: '10s', speed: 305, throttle: 95, brake: 15, rpm: 11950 },
	{ time: '15s', speed: 289, throttle: 88, brake: 40, rpm: 11500 },
	{ time: '20s', speed: 278, throttle: 75, brake: 80, rpm: 10800 },
	{ time: '25s', speed: 265, throttle: 60, brake: 95, rpm: 10200 },
	{ time: '30s', speed: 320, throttle: 100, brake: 0, rpm: 12300 },
];

const sectorData = [
	{ driver: 'VER', s1: 25.123, s2: 33.456, s3: 30.877 },
	{ driver: 'LEC', s1: 25.289, s2: 33.612, s3: 30.998 },
	{ driver: 'HAM', s1: 25.334, s2: 33.789, s3: 31.012 },
	{ driver: 'PER', s1: 25.567, s2: 34.001, s3: 31.234 },
];

const tireData = [
	{ name: 'FL', wear: 68, fill: '#ef4444' },
	{ name: 'FR', wear: 72, fill: '#f59e0b' },
	{ name: 'RL', wear: 65, fill: '#10b981' },
	{ name: 'RR', wear: 78, fill: '#dc2626' },
];

const drivers = [
	'VER',
	'LEC',
	'HAM',
	'PER',
	'SAI',
	'NOR',
	'RUS',
	'PIA',
	'ALO',
	'STR',
];

// Core features dummy data
const liveRaceInsights = [
	{ position: 1, driver: 'VER', lap: 45, gap: 'Leader' },
	{ position: 2, driver: 'LEC', lap: 45, gap: '+1.2s' },
	{ position: 3, driver: 'NOR', lap: 45, gap: '+3.5s' },
	// More for top 10
];

const overtakeProbabilities = [
	{ driver: 'LEC on VER', probability: 45 },
	{ driver: 'NOR on LEC', probability: 30 },
	{ driver: 'HAM on NOR', probability: 60 },
];

const trackPositions = [
	{ driver: 'VER', position: 'Straight' },
	{ driver: 'LEC', position: 'Turn 1' },
	// Simplified
];

const pitStrategyPredictions = [
	{
		driver: 'VER',
		strategy: 'Pit on lap 50 for Hard tires',
		benefit: '+2 positions',
	},
	{
		driver: 'LEC',
		strategy: 'Stay out until lap 55',
		benefit: 'Maintain lead',
	},
];

export default function EnhancedF1Dashboard() {
	const [selectedDriver, setSelectedDriver] = useState('VER');
	const [lapTime, setLapTime] = useState(89.456);
	const [selectedRace, setSelectedRace] = useState(
		raceSchedule.find((r) => r.status === 'Upcoming') || raceSchedule[3]
	);

	// Simulate live updates
	useEffect(() => {
		const interval = setInterval(() => {
			setLapTime((prev) => +(prev + (Math.random() - 0.5) * 0.3).toFixed(3));
		}, 800);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="min-h-screen bg-black text-white overflow-hidden">
			<Navbar />
			<main className="py-20 px-4 md:px-6">
				<div className="max-w-screen-2xl mx-auto space-y-12">
					{/* Top Section: Overall F1 Dashboard - For beginners: Explanations */}
					<section className="space-y-6 pt-10">
						<h2 className="text-3xl font-bold  text-white flex items-center gap-2">
							Formula 1 Overview{' '}
							<FaInfoCircle
								className="text-gray-400"
								title="Learn about F1: High-speed racing with teams and drivers competing in global Grands Prix."
							/>
						</h2>
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
							{/* Driver Standings */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								className="bg-linear-to-br from-gray-900 to-black p-6 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
									Driver Standings{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Points earned by drivers over the season; top drivers lead the championship."
									/>
								</h3>
								<div className="overflow-y-auto max-h-80">
									<table className="w-full text-left text-sm">
										<thead>
											<tr className="text-gray-400">
												<th>Pos</th>
												<th>Driver</th>
												<th>Team</th>
												<th>Pts</th>
											</tr>
										</thead>
										<tbody>
											{driverStandings.map((standing) => (
												<tr
													key={standing.driver}
													className={`cursor-pointer hover:bg-gray-800 transition-colors ${
														selectedDriver === standing.driver
															? 'bg-red-900/50'
															: ''
													}`}
													onClick={() => setSelectedDriver(standing.driver)}
												>
													<td className="py-2">{standing.position}</td>
													<td className="font-mono">{standing.driver}</td>
													<td>{standing.team}</td>
													<td className="font-bold">{standing.points}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</motion.div>

							{/* Team Standings */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.1 }}
								className="bg-linear-to-br from-gray-900 to-black p-6 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
									Team Standings{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Combined points from team drivers; determines constructor championship."
									/>
								</h3>
								<div className="overflow-y-auto max-h-80">
									<table className="w-full text-left text-sm">
										<thead>
											<tr className="text-gray-400">
												<th>Pos</th>
												<th>Team</th>
												<th>Pts</th>
											</tr>
										</thead>
										<tbody>
											{teamStandings.map((team) => (
												<tr
													key={team.team}
													className="hover:bg-gray-800 transition-colors"
												>
													<td className="py-2">{team.position}</td>
													<td>{team.team}</td>
													<td className="font-bold">{team.points}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</motion.div>

							{/* Next Race */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.2 }}
								className="bg-linear-to-br from-gray-900 to-black p-6 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
									Next Race{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Upcoming Grand Prix; watch drivers compete on unique tracks."
									/>
								</h3>
								<div className="text-center">
									<p className="text-xl font-bold  text-white">
										{selectedRace.name}
									</p>
									<p className="text-gray-400">Date: {selectedRace.date}</p>
									<p className="text-gray-400">Track: {selectedRace.track}</p>
									<button
										onClick={() =>
											setSelectedRace(
												raceSchedule[raceSchedule.indexOf(selectedRace) + 1] ||
													selectedRace
											)
										}
										className="mt-4 bg-red-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-700"
									>
										View Schedule
									</button>
								</div>
							</motion.div>

							{/* Recent Results */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.3 }}
								className="bg-linear-to-br from-gray-900 to-black p-6 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
									Recent Results{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Outcomes of past races; see who won and podium positions."
									/>
								</h3>
								<div className="space-y-4 text-sm">
									{recentResults.map((result, i) => (
										<div key={i}>
											<p className="font-bold">{result.race}</p>
											<p>1st: {result.winner}</p>
											<p>2nd: {result.second}</p>
											<p>3rd: {result.third}</p>
										</div>
									))}
								</div>
							</motion.div>
						</div>
					</section>

					{/* Driver-Specific Dashboard - Integrated with core features */}
					<section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
						{/* Sidebar: Driver Selector */}
						<motion.aside
							initial={{ x: -100, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							className="lg:col-span-2 space-y-3"
						>
							<h3 className="text-lg font-bold  text-white mb-4 flex items-center gap-2">
								Select Driver{' '}
								<FaInfoCircle
									className="text-gray-400"
									title="Choose a driver to see personalized stats and insights."
								/>
							</h3>
							{drivers.map((driver) => (
								<button
									key={driver}
									onClick={() => setSelectedDriver(driver)}
									className={`w-full text-left px-4 py-3 rounded-lg transition-all font-mono text-xl
                    ${
											selectedDriver === driver
												? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
												: 'bg-gray-900 hover:bg-gray-800 border border-gray-800'
										}`}
								>
									{driver}
								</button>
							))}
						</motion.aside>

						{/* Main Driver Content */}
						<div className="lg:col-span-10 space-y-6">
							<h2 className="text-3xl font-bold  text-white">
								Insights for {selectedDriver}
							</h2>

							{/* Top Row: Quick Stats */}
							<div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
								<motion.div className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl">
									<div className="flex items-center gap-3 mb-4">
										<FaTachometerAlt className="text-red-600" />
										<h3 className="text-xl font-bold">Current Speed</h3>
									</div>
									<div className="text-6xl font-bold font-mono  text-white">
										312 <span className="text-3xl text-gray-400">km/h</span>
									</div>
									<p className="text-green-400 mt-2">+12 km/h from last lap</p>
								</motion.div>

								<motion.div
									transition={{ delay: 0.1 }}
									className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
								>
									<h3 className="text-xl font-bold mb-6 flex items-center gap-3">
										<FaBolt className="text-yellow-500" /> Throttle & Brake
									</h3>
									<div className="space-y-4">
										<div>
											<div className="flex justify-between mb-1">
												<span>Throttle</span>
												<span className="font-mono">98%</span>
											</div>
											<div className="w-full bg-gray-800 rounded-full h-6">
												<div
													className="bg-linear-to-r from-yellow-600 to-green-500 h-6 rounded-full"
													style={{ width: '98%' }}
												/>
											</div>
										</div>
										<div>
											<div className="flex justify-between mb-1">
												<span>Brake</span>
												<span className="font-mono">12%</span>
											</div>
											<div className="w-full bg-gray-800 rounded-full h-6">
												<div
													className="bg-red-600 h-6 rounded-full"
													style={{ width: '12%' }}
												/>
											</div>
										</div>
									</div>
								</motion.div>

								<motion.div
									transition={{ delay: 0.2 }}
									className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
								>
									<h3 className="text-xl font-bold mb-6 flex items-center gap-3">
										<FaThermometerHalf className="text-orange-500" /> Tire Wear{' '}
										<FaInfoCircle
											className="text-gray-400"
											title="Tracks tire degradation; higher wear means slower laps."
										/>
									</h3>
									<ResponsiveContainer
										width="100%"
										height={200}
									>
										<RadialBarChart
											cx="50%"
											cy="50%"
											innerRadius="40%"
											outerRadius="90%"
											data={tireData}
										>
											<RadialBar
												dataKey="wear"
												cornerRadius={10}
												fill="#ef4444"
												background={{ fill: '#1f1f1f' }}
											/>
											<Tooltip
												contentStyle={{
													background: '#111',
													border: '1px solid #333',
												}}
											/>
										</RadialBarChart>
									</ResponsiveContainer>
									<div className="grid grid-cols-4 gap-2 mt-4 text-xs">
										{tireData.map((t) => (
											<div
												key={t.name}
												className="text-center"
											>
												<div
													className="w-4 h-4 rounded mx-auto mb-1"
													style={{ backgroundColor: t.fill }}
												></div>
												<div>{t.name}</div>
												<div className="font-bold">{t.wear}%</div>
											</div>
										))}
									</div>
								</motion.div>

								<motion.div
									transition={{ delay: 0.3 }}
									className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
								>
									<h3 className="text-xl font-bold mb-6 flex items-center gap-3">
										<FaCloudSun className="text-yellow-400" /> Weather{' '}
										<FaInfoCircle
											className="text-gray-400"
											title="Affects grip and strategy; dry is faster."
										/>
									</h3>
									<div className="text-4xl font-bold text-yellow-400">
										{weatherData.temperature}°C
									</div>
									<p className="text-green-400 mt-2">{weatherData.condition}</p>
									<p className="text-gray-400">Wind: {weatherData.wind}</p>
									<p className="text-red-400">
										Rain: {weatherData.rainChance}%
									</p>
								</motion.div>
							</div>

							{/* Core Feature: Simplified Live Race Insights */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.4 }}
								className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
									Live Race Standings{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Real-time race positions and gaps; learn how drivers battle for places."
									/>
								</h3>
								<div className="overflow-x-auto">
									<table className="w-full text-left">
										<thead>
											<tr className="text-gray-400">
												<th>Pos</th>
												<th>Driver</th>
												<th>Lap</th>
												<th>Gap</th>
											</tr>
										</thead>
										<tbody>
											{liveRaceInsights.map((insight) => (
												<tr
													key={insight.position}
													className="hover:bg-gray-800 transition-colors"
												>
													<td className="py-2">{insight.position}</td>
													<td className="font-mono">{insight.driver}</td>
													<td>{insight.lap}</td>
													<td className="font-bold  text-white">
														{insight.gap}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</motion.div>

							{/* Live Telemetry */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.5 }}
								className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
									Live Telemetry{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Speed and engine data; shows how cars perform in real-time."
									/>
								</h3>
								<ResponsiveContainer
									width="100%"
									height={400}
								>
									<AreaChart data={telemetryData}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="#333"
										/>
										<XAxis
											dataKey="time"
											stroke="#888"
										/>
										<YAxis
											yAxisId="left"
											stroke="#888"
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
											stroke="#888"
										/>
										<Tooltip
											contentStyle={{
												background: '#111',
												border: '1px solid #333',
											}}
										/>
										<Area
											yAxisId="left"
											type="monotone"
											dataKey="speed"
											stroke="#ef4444"
											fill="#ef4444"
											fillOpacity={0.6}
											name="Speed (km/h)"
										/>
										<Area
											yAxisId="right"
											type="monotone"
											dataKey="rpm"
											stroke="#10b981"
											fill="#10b981"
											fillOpacity={0.4}
											name="RPM ×100"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</motion.div>

							{/* Core Feature: Overtake Probability Engine */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.6 }}
								className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
									Overtake Probability{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Predicts passing chances based on speed and position; exciting part of F1."
									/>
								</h3>
								<div className="space-y-4">
									{overtakeProbabilities.map((prob, i) => (
										<div
											key={i}
											className="flex justify-between items-center"
										>
											<span>{prob.driver}</span>
											<div className="w-1/2 bg-gray-800 rounded-full h-4">
												<div
													className="bg-green-500 h-4 rounded-full"
													style={{ width: `${prob.probability}%` }}
												/>
											</div>
											<span className="font-bold ml-4">
												{prob.probability}%
											</span>
										</div>
									))}
								</div>
							</motion.div>

							{/* Sector Times, Gaps, Pit Stops */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.7 }}
								className="grid grid-cols-1 lg:grid-cols-3 gap-6"
							>
								<div className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl">
									<h3 className="text-2xl font-bold mb-6">
										Sector Times{' '}
										<FaInfoCircle
											className="text-gray-400"
											title="Lap broken into sectors; faster sectors mean better performance."
										/>
									</h3>
									<ResponsiveContainer
										width="100%"
										height={300}
									>
										<BarChart data={sectorData}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#333"
											/>
											<XAxis
												dataKey="driver"
												stroke="#888"
											/>
											<YAxis stroke="#888" />
											<Tooltip
												contentStyle={{
													background: '#111',
													border: '1px solid #333',
												}}
											/>
											<Bar
												dataKey="s1"
												fill="#ef4444"
												name="Sector 1"
											/>
											<Bar
												dataKey="s2"
												fill="#f59e0b"
												name="Sector 2"
											/>
											<Bar
												dataKey="s3"
												fill="#10b981"
												name="Sector 3"
											/>
											<Legend />
										</BarChart>
									</ResponsiveContainer>
								</div>

								<div className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl">
									<h3 className="text-2xl font-bold mb-6">
										Gap to Leader{' '}
										<FaInfoCircle
											className="text-gray-400"
											title="Time difference to the front; smaller gap means closer race."
										/>
									</h3>
									<div className="space-y-6">
										{[
											'LEC +0.234',
											'HAM +0.567',
											'PER +1.892',
											'SAI +2.101',
										].map((gap, i) => (
											<div
												key={i}
												className="flex justify-between items-center text-xl"
											>
												<span className="font-mono">{gap.split(' ')[0]}</span>
												<span className="text-3xl font-bold  text-white">
													{gap.split(' ')[1]}
												</span>
											</div>
										))}
									</div>
								</div>

								<div className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl">
									<h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
										<FaStopwatch className="text-orange-500" /> Recent Pit Stops{' '}
										<FaInfoCircle
											className="text-gray-400"
											title="Stops for tires or repairs; strategy key to winning."
										/>
									</h3>
									<div className="space-y-4">
										{pitStopLog.map((pit, i) => (
											<div
												key={i}
												className="flex justify-between text-lg"
											>
												<span>
													Lap {pit.lap} - {pit.driver}
												</span>
												<span className="font-mono">
													{pit.duration}s to {pit.tire}
												</span>
											</div>
										))}
									</div>
								</div>
							</motion.div>

							{/* Core Feature: Live Track Map */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.8 }}
								className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
									<FaRoad className="text-blue-500" /> Live Track Map{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Visualizes driver positions on the circuit; helps understand race flow."
									/>
								</h3>
								{/* Simple SVG placeholder for track */}

								<div className="relative h-[450px] w-full">
									<Image
										src="/images/Screenshot 2025-12-12 074102.png"
										alt="Live Track Map"
										layout="fill"
										objectFit="contain"
										className=""
									/>
								</div>
							</motion.div>

							{/* Core Feature: Pitstops Strategy Prediction */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.9 }}
								className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
									Pit Strategy Prediction{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Suggests optimal stops; balances speed and tire life."
									/>
								</h3>
								<div className="space-y-4">
									{pitStrategyPredictions.map((pred, i) => (
										<div
											key={i}
											className="p-4 bg-gray-800 rounded-lg"
										>
											<p className="font-bold">{pred.driver}</p>
											<p>{pred.strategy}</p>
											<p className="text-green-400">Expected: {pred.benefit}</p>
										</div>
									))}
								</div>
							</motion.div>

							{/* Race Schedule */}
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 1.0 }}
								className="bg-linear-to-br from-gray-900 to-black p-8 rounded-2xl border border-red-900/50 shadow-2xl"
							>
								<h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
									<FaFlagCheckered className="text-green-500" /> Full Race
									Schedule{' '}
									<FaInfoCircle
										className="text-gray-400"
										title="Calendar of all Grands Prix; plan your watching."
									/>
								</h3>
								<div className="space-y-4 overflow-y-auto max-h-80">
									{raceSchedule.map((race) => (
										<button
											key={race.round}
											onClick={() => setSelectedRace(race)}
											className={`w-full text-left p-4 rounded-lg transition-all ${
												selectedRace.round === race.round
													? 'bg-red-600 text-white'
													: 'bg-gray-900 hover:bg-gray-800'
											}`}
										>
											<div className="flex justify-between">
												<span>
													Round {race.round}: {race.name} ({race.status})
												</span>
												<span>{race.date}</span>
											</div>
											<p className="text-sm text-gray-400">{race.track}</p>
										</button>
									))}
								</div>
							</motion.div>
						</div>
					</section>
				</div>
			</main>

			{/* Footer */}
			<footer className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-red-900/50 py-3 px-6 backdrop-blur-md">
				<div className="flex justify-between items-center text-sm">
					<div className="flex gap-8">
						<span>
							Track: <strong className=" text-white">Monza</strong>
						</span>
						<span>
							Weather: <strong className="text-yellow-400">28°C Dry</strong>
						</span>
						<span>
							Tire: <strong className="text-orange-500">Soft C4</strong>
						</span>
					</div>
					<div className="text-green-400 font-bold">● All Systems Nominal</div>
				</div>
			</footer>
		</div>
	);
}
