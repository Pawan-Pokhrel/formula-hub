'use client';

import { useAuth } from '@/providers/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Navbar from './Navbar';

const AUTH_PAGES = ['/login', '/register'];
const PROTECTED_PREFIXES = ['/profile', '/track', '/predict', '/strategy'];
const REDIRECT_DELAY_MS = 2200;

function isProtectedPath(pathname) {
	return PROTECTED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

export default function ClientLayout({ children }) {
	const pathname = usePathname();
	const router = useRouter();
	const { isAuthenticated, isLoading } = useAuth();
	const isAuthPage = AUTH_PAGES.includes(pathname);
	const requiresAuth = isProtectedPath(pathname);
	const redirectedPathRef = useRef('');
	const [redirectingToLogin, setRedirectingToLogin] = useState(false);

	useEffect(() => {
		if (isLoading) return;

		if (requiresAuth && !isAuthenticated) {
			// Start the redirect sequence with a delay
			setRedirectingToLogin(true);

			const timer = setTimeout(() => {
				if (redirectedPathRef.current !== pathname) {
					toast('Please log in to continue to this area.');
					redirectedPathRef.current = pathname;
				}
				router.replace(`/login?next=${encodeURIComponent(pathname)}`);
			}, REDIRECT_DELAY_MS);

			return () => clearTimeout(timer);
		}

		setRedirectingToLogin(false);
		redirectedPathRef.current = '';

		if (isAuthPage && isAuthenticated) {
			router.replace('/dashboard');
		}
	}, [isAuthenticated, isAuthPage, isLoading, pathname, requiresAuth, router]);

	// Show a full-screen loading overlay while auth session is being checked
	if (isLoading && (requiresAuth || isAuthPage)) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<LoadingOverlay message="Loading your session" />
			</div>
		);
	}

	// Show page content behind a redirect overlay before navigating to login
	if (requiresAuth && !isAuthenticated) {
		return (
			<>
				<Navbar />
				<div style={{ filter: 'blur(6px)', pointerEvents: 'none', opacity: 0.4 }}>
					{children}
				</div>
				{/* <Footer /> */}
				<RedirectOverlay visible={redirectingToLogin} />
			</>
		);
	}

	return (
		<>
			{!isAuthPage && <Navbar />}
			{children}
			{/* {!isAuthPage && <Footer />} */}
		</>
	);
}

/* ─── Loading overlay (session check) ─── */
function LoadingOverlay({ message }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: '24px',
			}}
		>
			{/* Spinner */}
			<div
				style={{
					width: 48,
					height: 48,
					border: '3px solid rgba(255,255,255,0.1)',
					borderTop: '3px solid #e11d48',
					borderRadius: '50%',
					animation: 'clSpin 0.8s linear infinite',
				}}
			/>
			<span
				style={{
					fontSize: '0.8rem',
					letterSpacing: '0.2em',
					textTransform: 'uppercase',
					color: '#9ca3af',
				}}
			>
				{message}
			</span>

			<style>{`
				@keyframes clSpin {
					to {
						transform: rotate(360deg);
					}
				}
			`}</style>
		</div>
	);
}

/* ─── Redirect overlay (shown over blurred page before login redirect) ─── */
function RedirectOverlay({ visible }) {
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 9999,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'rgba(0, 0, 0, 0.7)',
				backdropFilter: 'blur(12px)',
				WebkitBackdropFilter: 'blur(12px)',
				opacity: visible ? 1 : 0,
				transition: 'opacity 0.5s ease',
				pointerEvents: visible ? 'auto' : 'none',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: '28px',
					padding: '48px',
					borderRadius: '20px',
					border: '1px solid rgba(255,255,255,0.08)',
					background: 'rgba(255,255,255,0.04)',
				}}
			>
				{/* Lock icon */}
				<div
					style={{
						width: 56,
						height: 56,
						borderRadius: '50%',
						background: 'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						animation: 'rlPulse 1.8s ease-in-out infinite',
					}}
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="white"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
				</div>

				<div style={{ textAlign: 'center' }}>
					<p
						style={{
							color: 'white',
							fontSize: '1.1rem',
							fontWeight: 600,
							margin: '0 0 8px 0',
						}}
					>
						Authentication Required
					</p>
					<p
						style={{
							color: '#9ca3af',
							fontSize: '0.85rem',
							margin: 0,
							letterSpacing: '0.04em',
						}}
					>
						Redirecting you to login…
					</p>
				</div>

				{/* Progress bar */}
				<div
					style={{
						width: 200,
						height: 3,
						borderRadius: 3,
						background: 'rgba(255,255,255,0.1)',
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							height: '100%',
							borderRadius: 3,
							background: 'linear-gradient(90deg, #e11d48, #fb7185)',
							animation: visible
								? `rlProgress ${REDIRECT_DELAY_MS}ms linear forwards`
								: 'none',
						}}
					/>
				</div>
			</div>

			<style>{`
				@keyframes rlProgress {
					from {
						width: 0%;
					}
					to {
						width: 100%;
					}
				}
				@keyframes rlPulse {
					0%,
					100% {
						transform: scale(1);
						box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4);
					}
					50% {
						transform: scale(1.05);
						box-shadow: 0 0 20px 8px rgba(225, 29, 72, 0.15);
					}
				}
			`}</style>
		</div>
	);
}
