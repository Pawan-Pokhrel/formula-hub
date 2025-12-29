'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
	FaArrowRight,
	FaBolt,
	FaCarSide,
	FaChartLine,
	FaFlagCheckered,
	FaGlobe,
	FaHeadset,
	FaTachometerAlt,
	FaTrophy,
	FaUsers,
} from 'react-icons/fa';

export default function HomePage() {
	return (
		<div className="bg-linear-to-b from-gray-900 to-black text-white overflow-x-hidden font-sans">
			{/* Navbar */}
			<nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md shadow-lg shadow-red-900/20">
				<div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
					<motion.h1
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8 }}
						className="text-2xl font-bold uppercase tracking-wider  text-white"
					>
						F1 Analytics Pro
					</motion.h1>
					<div className="flex gap-6">
						<Link
							href="/dashboard"
							className="hover: text-white transition text-lg font-medium"
						>
							Dashboard
						</Link>
						<Link
							href="/features"
							className="hover: text-white transition text-lg font-medium"
						>
							Features
						</Link>
						<Link
							href="/about"
							className="hover: text-white transition text-lg font-medium"
						>
							About
						</Link>
						<Link
							href="/contact"
							className="hover: text-white transition text-lg font-medium"
						>
							Contact
						</Link>
					</div>
				</div>
			</nav>

			{/* Hero Section with Premium F1 Driver/Car Background */}
			<section
				className="relative flex flex-col items-center justify-center text-center h-screen px-6 bg-cover bg-center bg-no-repeat pt-20"
				style={{
					backgroundImage:
						"url('https://source.unsplash.com/random/1920x1080/?formula1,driver,racing,car,speed')",
					backgroundBlendMode: 'overlay',
					backgroundColor: 'rgba(0, 0, 0, 0.6)',
				}}
			>
				<div className="absolute inset-0 bg-linear-to-b from-transparent to-black/90" />
				<motion.h1
					initial={{ opacity: 0, y: 50 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1.2, ease: 'easeOut' }}
					className="relative text-6xl md:text-9xl font-extrabold tracking-wide uppercase z-10 leading-tight"
				>
					Elite F1 Analytics
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 1 }}
					className="relative mt-8 max-w-4xl text-xl md:text-3xl text-gray-300 z-10 font-light italic"
				>
					Unlock the pinnacle of motorsport intelligence: Real-time telemetry,
					AI-driven strategies, and immersive visualizations for the ultimate
					Formula 1 experience.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 1, duration: 0.8 }}
					className="relative mt-12 flex flex-col md:flex-row gap-6 z-10"
				>
					<Link
						href="/dashboard"
						className="flex items-center gap-3 bg-red-600 hover:bg-red-700 transition-all px-10 py-5 rounded-full font-bold text-xl uppercase shadow-2xl shadow-red-600/50 hover:shadow-red-600/70"
					>
						Access Dashboard <FaArrowRight size={24} />
					</Link>

					<Link
						href="/demo"
						className="border-2 border-red-500 hover:border-red-600 hover:bg-red-600/10 transition-all px-10 py-5 rounded-full font-bold text-xl uppercase"
					>
						Watch Demo
					</Link>
				</motion.div>

				{/* Premium Animated Checkered Flag */}
				<motion.div
					initial={{ x: '-100%' }}
					animate={{ x: '100%' }}
					transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
					className="absolute bottom-0 h-16 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgyMHYyMEgweiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0wIDBoMjB2MjBIMHoiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')] opacity-50"
				/>
			</section>

			{/* Premium Features Section with Subtle F1 Background */}
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
				<motion.h2
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 1 }}
					className="text-5xl md:text-7xl font-extrabold text-center mb-20 uppercase tracking-widest  text-white"
				>
					Unrivaled Features
				</motion.h2>
				<div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
						className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm"
					>
						<FaTachometerAlt
							size={60}
							className=" text-red-500"
						/>
						<h3 className="text-3xl font-bold uppercase">
							Precision Telemetry
						</h3>
						<p className="text-gray-300 text-center text-lg font-light">
							Harness live data streams for speed, G-forces, and engine metrics
							with sub-second accuracy.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm"
					>
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
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.4 }}
						className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm"
					>
						<FaChartLine
							size={60}
							className=" text-red-500"
						/>
						<h3 className="text-3xl font-bold uppercase">AI Strategy Engine</h3>
						<p className="text-gray-300 text-center text-lg font-light">
							Simulate scenarios, optimize pit stops, and gain edges with
							machine learning insights.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.6 }}
						className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm"
					>
						<FaFlagCheckered
							size={60}
							className=" text-red-500"
						/>
						<h3 className="text-3xl font-bold uppercase">Race Simulations</h3>
						<p className="text-gray-300 text-center text-lg font-light">
							Run hyper-realistic races with variable conditions for strategy
							refinement.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.8 }}
						className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm"
					>
						<FaUsers
							size={60}
							className=" text-red-500"
						/>
						<h3 className="text-3xl font-bold uppercase">Global Community</h3>
						<p className="text-gray-300 text-center text-lg font-light">
							Connect with experts, share analyses, and collaborate in real-time
							forums.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 1 }}
						className="flex flex-col items-center gap-6 p-10 bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 transition-all backdrop-blur-sm"
					>
						<FaGlobe
							size={60}
							className=" text-red-500"
						/>
						<h3 className="text-3xl font-bold uppercase">Worldwide Coverage</h3>
						<p className="text-gray-300 text-center text-lg font-light">
							Data from every grand prix, team, and driver across seasons and
							continents.
						</p>
					</motion.div>
				</div>
			</section>

			{/* Stats Section for Premium Feel */}
			<section className="py-24 px-6 md:px-20 bg-linear-to-r from-red-900/20 to-black text-center">
				<motion.h2
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 1 }}
					className="text-5xl font-extrabold uppercase mb-16 tracking-widest"
				>
					Performance Metrics
				</motion.h2>
				<div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
						className="p-8 rounded-2xl bg-black/50 border border-red-500/20 shadow-xl"
					>
						<FaTrophy
							size={50}
							className="mx-auto  text-red-500 mb-4"
						/>
						<h3 className="text-4xl font-bold">500+</h3>
						<p className="text-gray-400 text-lg">Races Analyzed</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="p-8 rounded-2xl bg-black/50 border border-red-500/20 shadow-xl"
					>
						<FaBolt
							size={50}
							className="mx-auto  text-red-500 mb-4"
						/>
						<h3 className="text-4xl font-bold">1ms</h3>
						<p className="text-gray-400 text-lg">Data Latency</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.4 }}
						className="p-8 rounded-2xl bg-black/50 border border-red-500/20 shadow-xl"
					>
						<FaHeadset
							size={50}
							className="mx-auto  text-red-500 mb-4"
						/>
						<h3 className="text-4xl font-bold">24/7</h3>
						<p className="text-gray-400 text-lg">Support</p>
					</motion.div>
				</div>
			</section>

			{/* Call to Action Section */}
			<section className="py-32 px-6 md:px-20 bg-red-700/90 text-center relative overflow-hidden">
				<div className="absolute inset-0 bg-[radial-linear(circle_at_50%_50%,rgba(255,0,0,0.2),transparent)]" />
				<motion.h2
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 1 }}
					className="text-5xl md:text-7xl font-extrabold uppercase mb-10 tracking-widest relative z-10"
				>
					Elevate Your F1 Game
				</motion.h2>
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 1, delay: 0.3 }}
					className="max-w-3xl mx-auto text-2xl text-white/80 mb-12 relative z-10 font-light"
				>
					Join the elite circle of F1 analysts and enthusiasts who trust our
					platform for unparalleled insights.
				</motion.p>
				<Link
					href="/signup"
					className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 transition-all px-12 py-6 rounded-full font-bold text-xl uppercase shadow-2xl shadow-black/50 relative z-10"
				>
					Sign Up Today <FaArrowRight size={24} />
				</Link>
			</section>

			{/* Footer */}
			<footer className="py-12 px-6 md:px-20 bg-black text-center text-gray-500">
				<div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
					<p className="text-lg">
						&copy; 2025 F1 Analytics Pro. All rights reserved.
					</p>
					<div className="flex gap-8 text-lg">
						<Link
							href="/privacy"
							className="hover: text-white transition"
						>
							Privacy Policy
						</Link>
						<Link
							href="/terms"
							className="hover: text-white transition"
						>
							Terms of Service
						</Link>
						<Link
							href="/contact"
							className="hover: text-white transition"
						>
							Contact Us
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
