// components/Navbar.js
'use client';

import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaFlagCheckered } from 'react-icons/fa';

const NAV_ITEMS = [
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/profile', label: 'Profile', requiresAuth: true },
	{ href: '/schedule', label: 'Schedule' },
	{ href: '/standings', label: 'Standings' },
	{ href: '/drivers', label: 'Drivers' },
	{ href: '/compare', label: 'Compare' },
	{ href: '/telemetry', label: 'Telemetry' },
	{ href: '/track', label: 'Track', requiresAuth: true },
	{ href: '/predict', label: 'Predict', requiresAuth: true },
	{ href: '/strategy', label: 'Strategy', requiresAuth: true },
];

function isRouteActive(pathname, href) {
	if (!pathname) return false;
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { isAuthenticated, user, logout } = useAuth();

	const handleProtectedNavigation = (event, item) => {
		if (isAuthenticated || !item.requiresAuth) return;
		event.preventDefault();
		setIsOpen(false);
		toast.error(`Please log in to access ${item.label}.`);
		router.push(`/login?next=${encodeURIComponent(item.href)}`);
	};

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
			<div className="px-6 py-3.5 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="h-11 w-11 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center">
						<FaFlagCheckered className="text-xl text-red-500" />
					</div>
					<Link
						href="/"
						className="text-2xl md:text-3xl font-bold tracking-wide text-white hover:text-red-200 transition-colors duration-300 cursor-pointer"
					>
						FormulaHub
					</Link>
				</div>

				<div className="hidden lg:flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1.5">
					{NAV_ITEMS.map((item) => {
						const active = isRouteActive(pathname, item.href);

						return (
							<Link
								key={item.href}
								href={item.href}
								prefetch={true}
								onClick={(event) => handleProtectedNavigation(event, item)}
								className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out cursor-pointer hover:-translate-y-px ${
									active ? 'text-red-200' : (
										'text-gray-200 hover:text-white hover:bg-white/10'
									)
								}`}
							>
								<span className="inline-flex items-center gap-1.5">
									{item.label}
								</span>
								<span
									className={`absolute left-2 right-2 bottom-1 h-0.5 rounded-full bg-red-400 transition-opacity duration-300 ${
										active ? 'opacity-100' : 'opacity-0'
									}`}
								/>
							</Link>
						);
					})}
				</div>

				<div className="hidden md:flex items-center gap-3">
					{isAuthenticated ?
						<>
							<div className="hidden lg:block text-right">
								<p className="text-xs text-white font-semibold">
									{user?.fullName || 'Driver'}
								</p>
								<p className="text-[10px] text-gray-400">
									{user?.username || user?.email}
								</p>
							</div>
							<button
								type="button"
								onClick={logout}
								className="px-4 py-2 rounded-full border border-white/15 text-sm font-semibold text-white hover:bg-white/10 transition-all duration-300 cursor-pointer"
							>
								Logout
							</button>
						</>
					:	<>
							<Link
								href="/login"
								className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
									isRouteActive(pathname, '/login') ?
										'bg-white/10 text-white'
									:	'text-gray-200 hover:text-white hover:bg-white/10'
								}`}
								prefetch={true}
							>
								Login
							</Link>
							<Link
								href="/register"
								className="bg-linear-to-r from-red-600 to-red-700 px-4 py-2 rounded-full font-bold text-white hover:from-red-500 hover:to-red-600 transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 cursor-pointer"
								prefetch={true}
							>
								Register
							</Link>
						</>
					}
				</div>

				<button
					className="md:hidden relative h-10 w-10 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors duration-300 focus:outline-none cursor-pointer"
					onClick={() => setIsOpen(!isOpen)}
					aria-label="Toggle menu"
				>
					<span
						className={`absolute left-1/2 top-[11px] h-0.5 w-5 -translate-x-1/2 bg-white transition-all duration-300 ${
							isOpen ? 'translate-y-1.5 rotate-45' : ''
						}`}
					/>
					<span
						className={`absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 bg-white transition-all duration-300 ${
							isOpen ? 'opacity-0' : 'opacity-100'
						}`}
					/>
					<span
						className={`absolute left-1/2 bottom-[11px] h-0.5 w-5 -translate-x-1/2 bg-white transition-all duration-300 ${
							isOpen ? '-translate-y-1.5 -rotate-45' : ''
						}`}
					/>
				</button>
			</div>

			{isOpen && (
				<div className="lg:hidden px-6 pb-5 pt-1 animate-fade-in">
					<div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl p-3 flex flex-col gap-1.5">
						{NAV_ITEMS.map((item) => {
							const active = isRouteActive(pathname, item.href);

							return (
								<Link
									key={item.href}
									href={item.href}
									prefetch={true}
									onClick={(event) => {
										handleProtectedNavigation(event, item);
										if (!event.defaultPrevented) setIsOpen(false);
									}}
									className={`relative px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
										active ? 'text-red-200' : (
											'text-gray-200 hover:bg-white/10 hover:text-white'
										)
									}`}
								>
									<span className="inline-flex items-center gap-1.5">
										{item.label}
									</span>
									<span
										className={`absolute left-3.5 right-3.5 bottom-1 h-0.5 rounded-full bg-red-400 transition-opacity duration-300 ${
											active ? 'opacity-100' : 'opacity-0'
										}`}
									/>
								</Link>
							);
						})}

						<div className="my-1 h-px bg-white/10" />

						{isAuthenticated ?
							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									logout();
								}}
								className="mt-1 bg-white/10 px-4 py-2.5 rounded-xl font-bold text-white hover:bg-white/15 transition-all duration-300 text-center cursor-pointer"
							>
								Logout
							</button>
						:	<>
								<Link
									href="/login"
									prefetch={true}
									onClick={() => setIsOpen(false)}
									className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
										isRouteActive(pathname, '/login') ?
											'bg-white/10 text-white'
										:	'text-gray-200 hover:bg-white/10 hover:text-white'
									}`}
								>
									Login
								</Link>
								<Link
									href="/register"
									prefetch={true}
									onClick={() => setIsOpen(false)}
									className="mt-1 bg-linear-to-r from-red-600 to-red-700 px-4 py-2.5 rounded-xl font-bold text-white hover:from-red-500 hover:to-red-600 transition-all duration-300 text-center cursor-pointer"
								>
									Register
								</Link>
							</>
						}
					</div>
				</div>
			)}
		</nav>
	);
}
