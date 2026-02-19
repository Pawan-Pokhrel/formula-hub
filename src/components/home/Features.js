import {
	FaCarSide,
	FaChartLine,
	FaFlagCheckered,
	FaGlobe,
	FaTachometerAlt,
	FaUsers,
} from 'react-icons/fa';

export default function Features() {
	return (
		<section
			className="py-32 px-6 md:px-20 relative"
			style={{
				backgroundImage:
					"url('https://source.unsplash.com/random/1920x1080/?formula1,circuit,track')",
				backgroundAttachment: 'fixed',
				backgroundSize: 'cover',
				backgroundBlendMode: 'multiply',
				backgroundColor: 'rgba(0, 0, 0, 0.85)',
			}}
		>
			<h2 className="text-5xl md:text-7xl font-extrabold text-center mb-20 uppercase tracking-widest  text-white">
				Unrivaled Features
			</h2>
			<div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
				<div className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm">
					<FaTachometerAlt
						size={60}
						className=" text-red-500"
					/>
					<h3 className="text-3xl font-bold uppercase">Precision Telemetry</h3>
					<p className="text-gray-300 text-center text-lg font-light">
						Harness live data streams for speed, G-forces, and engine metrics
						with sub-second accuracy.
					</p>
				</div>

				<div className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm">
					<FaCarSide
						size={60}
						className=" text-red-500"
					/>
					<h3 className="text-3xl font-bold uppercase">
						Dynamic Track Mapping
					</h3>
					<p className="text-gray-300 text-center text-lg font-light">
						Visualize circuits in 3D with real-time driver tracking and
						predictive trajectories.
					</p>
				</div>

				<div className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm">
					<FaChartLine
						size={60}
						className=" text-red-500"
					/>
					<h3 className="text-3xl font-bold uppercase">AI Strategy Engine</h3>
					<p className="text-gray-300 text-center text-lg font-light">
						Simulate scenarios, optimize pit stops, and gain edges with machine
						learning insights.
					</p>
				</div>

				<div className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm">
					<FaFlagCheckered
						size={60}
						className=" text-red-500"
					/>
					<h3 className="text-3xl font-bold uppercase">Race Simulations</h3>
					<p className="text-gray-300 text-center text-lg font-light">
						Run hyper-realistic races with variable conditions for strategy
						refinement.
					</p>
				</div>

				<div className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm">
					<FaUsers
						size={60}
						className=" text-red-500"
					/>
					<h3 className="text-3xl font-bold uppercase">Global Community</h3>
					<p className="text-gray-300 text-center text-lg font-light">
						Connect with experts, share analyses, and collaborate in real-time
						forums.
					</p>
				</div>

				<div className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm">
					<FaGlobe
						size={60}
						className=" text-red-500"
					/>
					<h3 className="text-3xl font-bold uppercase">Worldwide Coverage</h3>
					<p className="text-gray-300 text-center text-lg font-light">
						Data from every grand prix, team, and driver across seasons and
						continents.
					</p>
				</div>
			</div>
		</section>
	);
}
