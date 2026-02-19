'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';
import Navbar from './Navbar';

export default function ClientLayout({ children }) {
	const pathname = usePathname();
	const isAuthPage = pathname === '/login' || pathname === '/register';

	return (
		<>
			{!isAuthPage && <Navbar />}
			{children}
			{!isAuthPage && <Footer />}
		</>
	);
}
