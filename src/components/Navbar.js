// components/Navbar.js
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { FaFlagCheckered } from 'react-icons/fa';

export default function Navbar() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-red-900/50">
			<div className="px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<FaFlagCheckered className="text-3xl text-red-500" />
					<Link
						href="/"
						className="text-3xl font-bold tracking-wider bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
					>
						FormulaHub
					</Link>
				</div>
				<div className="hidden md:flex items-center gap-6">
					<Link
						href="/dashboard"
						className="text-white hover:text-red-500 transition-colors"
						prefetch={true}
					>
						Dashboard
					</Link>
					<Link
						href="/standings"
						className="text-white hover:text-red-500 transition-colors"
					>
						Standings
					</Link>
					<Link
						href="/track"
						className="text-white hover:text-red-500 transition-colors"
					>
						Track
					</Link>
					<Link
						href="/news"
						className="text-white hover:text-red-500 transition-colors"
					>
						News
					</Link>
					<Link
						href="/login"
						className="text-white hover:text-red-500 transition-colors"
						prefetch={true}
					>
						Login
					</Link>
					<Link
						href="/register"
						className="bg-red-600 px-4 py-2 rounded-full font-bold text-white hover:bg-red-700 transition-colors"
						prefetch={true}
					>
						Register
					</Link>
				</div>
				<button
					className="md:hidden text-white focus:outline-none"
					onClick={() => setIsOpen(!isOpen)}
				>
					<svg
						className="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
			</div>
			{isOpen && (
				<div className="md:hidden px-6 pb-4 flex flex-col gap-4">
					<Link
						href="/dashboard"
						className="text-white hover: text-white transition-colors"
					>
						Dashboard
					</Link>
					<Link
						href="/standings"
						className="text-white hover: text-white transition-colors"
					>
						Standings
					</Link>
					<Link
						href="/track"
						className="text-white hover: text-white transition-colors"
					>
						Track
					</Link>
					<Link
						href="/schedule"
						className="text-white hover: text-white transition-colors"
					>
						Schedule
					</Link>
					<Link
						href="/news"
						className="text-white hover: text-white transition-colors"
					>
						News
					</Link>
					<Link
						href="/login"
						className="text-white hover: text-white transition-colors"
					>
						Login
					</Link>
					<Link
						href="/register"
						className="bg-red-600 px-4 py-2 rounded-full font-bold text-white hover:bg-red-700 transition-colors text-center"
					>
						Register
					</Link>
				</div>
			)}
		</nav>
	);
}
