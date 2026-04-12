'use client';

import { useAuth } from '@/providers/AuthProvider';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';
import Navbar from './Navbar';

const AUTH_PAGES = ['/login', '/register'];
const PROTECTED_PREFIXES = [
	'/profile',
	'/track',
	'/predict',
	'/strategy',
	'/telemetry',
	'/compare',
];
const REDIRECT_DELAY_MS = 1800;

function isProtectedPath(pathname) {
	return PROTECTED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

function getSafeNextPath(nextPath) {
	if (!nextPath || typeof nextPath !== 'string') return '';
	if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return '';
	const lower = nextPath.toLowerCase();
	if (
		AUTH_PAGES.some((page) => lower === page || lower.startsWith(`${page}?`))
	) {
		return '';
	}
	return nextPath;
}

/* ─── Minimal branded loading screen ─── */
function BrandedLoader() {
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 99999,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#000',
			}}
		>
			{/* FormulaHub gradient text */}
			<h1
				style={{
					fontSize: 'clamp(2rem, 5vw, 3.2rem)',
					fontWeight: 900,
					letterSpacing: '-0.02em',
					margin: 0,
					background: 'linear-gradient(135deg, #ffffff 30%, #e11d48 100%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
				}}
			>
				FormulaHub
			</h1>

			{/* Slim animated loading bar */}
			<div
				style={{
					marginTop: 20,
					width: 160,
					height: 2,
					borderRadius: 2,
					background: 'rgba(255,255,255,0.06)',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						height: '100%',
						borderRadius: 2,
						background: 'linear-gradient(90deg, #e11d48, #fb7185, #e11d48)',
						backgroundSize: '200% 100%',
						animation: 'fhShimmer 1.5s ease-in-out infinite',
					}}
				/>
			</div>

			<style>{`
				@keyframes fhShimmer {
					0% { transform: translateX(-100%); }
					100% { transform: translateX(100%); }
				}
			`}</style>
		</div>
	);
}

/* ─── Redirect screen (replaces the old "Authentication Required" overlay) ─── */
function RedirectLoader({ visible }) {
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 9999,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'rgba(0, 0, 0, 0.85)',
				backdropFilter: 'blur(16px)',
				WebkitBackdropFilter: 'blur(16px)',
				opacity: visible ? 1 : 0,
				transition: 'opacity 0.4s ease',
				pointerEvents: visible ? 'auto' : 'none',
			}}
		>
			<h1
				style={{
					fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
					fontWeight: 900,
					letterSpacing: '-0.02em',
					margin: 0,
					background: 'linear-gradient(135deg, #ffffff 30%, #e11d48 100%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
				}}
			>
				FormulaHub
			</h1>

			{/* Timed progress bar */}
			<div
				style={{
					marginTop: 20,
					width: 160,
					height: 2,
					borderRadius: 2,
					background: 'rgba(255,255,255,0.06)',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						height: '100%',
						borderRadius: 2,
						background: 'linear-gradient(90deg, #e11d48, #fb7185)',
						animation:
							visible ?
								`fhProgress ${REDIRECT_DELAY_MS}ms linear forwards`
							:	'none',
					}}
				/>
			</div>

			<style>{`
				@keyframes fhProgress {
					from { width: 0%; }
					to { width: 100%; }
				}
			`}</style>
		</div>
	);
}

export default function ClientLayout({ children }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();
	const { isAuthenticated, isLoading } = useAuth();
	const hasMounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false
	);

	const safePathname = pathname || '';
	const queryString = searchParams.toString();
	const nextParam = searchParams.get('next') || '';
	const isAuthPage = AUTH_PAGES.includes(safePathname);
	const requiresAuth = isProtectedPath(safePathname);
	const redirectedPathRef = useRef('');

	useEffect(() => {
		if (!hasMounted) return;
		if (isLoading) return;

		if (requiresAuth && !isAuthenticated) {
			const requestedPath =
				safePathname + (queryString ? `?${queryString}` : '');

			const timer = setTimeout(() => {
				if (redirectedPathRef.current !== safePathname) {
					toast('Please log in to continue to this area.');
					redirectedPathRef.current = safePathname;
				}
				router.replace(`/login?next=${encodeURIComponent(requestedPath)}`);
			}, REDIRECT_DELAY_MS);

			return () => clearTimeout(timer);
		}

		redirectedPathRef.current = '';

		if (isAuthPage && isAuthenticated) {
			const safeNext = getSafeNextPath(nextParam) || '/dashboard';
			router.replace(safeNext);
		}
	}, [
		hasMounted,
		isAuthenticated,
		isAuthPage,
		isLoading,
		nextParam,
		safePathname,
		queryString,
		requiresAuth,
		router,
	]);

	if (!hasMounted) {
		return <>{children}</>;
	}

	// Branded loading screen while auth session is being checked
	if (isLoading && (requiresAuth || isAuthPage)) {
		return <BrandedLoader />;
	}

	// Redirect screen — clean branded overlay before navigating to login
	if (requiresAuth && !isAuthenticated) {
		return (
			<>
				<Navbar />
				<div
					style={{ filter: 'blur(6px)', pointerEvents: 'none', opacity: 0.3 }}
				>
					{children}
				</div>
				<RedirectLoader visible={requiresAuth && !isAuthenticated} />
			</>
		);
	}

	return (
		<>
			{!isAuthPage && <Navbar />}
			{children}
		</>
	);
}
