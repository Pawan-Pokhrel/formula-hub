import { FaBolt, FaHeadset, FaTrophy } from 'react-icons/fa';

export default function Stats() {
	return (
		<section className="py-24 px-6 md:px-20 bg-linear-to-r from-red-900/20 to-black text-center">
			<h2 className="text-5xl font-extrabold uppercase mb-16 tracking-widest">
				Performance Metrics
			</h2>
			<div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
				<div className="p-8 rounded-2xl bg-black/50 border border-red-500/20 shadow-xl">
					<FaTrophy
						size={50}
						className="mx-auto  text-red-500 mb-4"
					/>
					<h3 className="text-4xl font-bold">500+</h3>
					<p className="text-gray-400 text-lg">Races Analyzed</p>
				</div>

				<div className="p-8 rounded-2xl bg-black/50 border border-red-500/20 shadow-xl">
					<FaBolt
						size={50}
						className="mx-auto  text-red-500 mb-4"
					/>
					<h3 className="text-4xl font-bold">1ms</h3>
					<p className="text-gray-400 text-lg">Data Latency</p>
				</div>

				<div className="p-8 rounded-2xl bg-black/50 border border-red-500/20 shadow-xl">
					<FaHeadset
						size={50}
						className="mx-auto  text-red-500 mb-4"
					/>
					<h3 className="text-4xl font-bold">24/7</h3>
					<p className="text-gray-400 text-lg">Support</p>
				</div>
			</div>
		</section>
	);
}
