import { Geist, Geist_Mono, Poppins } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import ClientLayout from '../components/ClientLayout';
import { AuthProvider } from '../providers/AuthProvider';
import GoogleAuthWrapper from '../providers/GoogleAuthWrapper';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const poppins = Poppins({
	weight: ['400', '500', '600', '700'],
	subsets: ['latin'],
	variable: '--font-poppins',
});

export const metadata = {
	title: 'FormulaHub — F1 Analytics & Strategy',
	description:
		'Your premium F1 command center. Live standings, race predictions, pit strategy simulations, and track analytics.',
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${poppins.className} antialiased`}
			>
				<GoogleAuthWrapper>
				<AuthProvider>
					<ClientLayout>
						<Toaster
							position="top-right"
							gutter={10}
							containerStyle={{
								top: 20,
								right: 20,
							}}
							toastOptions={{
							duration: 3500,
							style: {
								maxWidth: '420px',
								padding: '14px 20px',
								borderRadius: '14px',
								fontSize: '0.84rem',
								fontWeight: 500,
								fontFamily: 'var(--font-poppins), Poppins, sans-serif',
								letterSpacing: '0.01em',
								lineHeight: 1.45,
								color: '#f5f5f5',
								background:
									'linear-gradient(135deg, rgba(38, 40, 50, 0.96) 0%, rgba(28, 28, 36, 0.97) 100%)',
								backdropFilter: 'blur(20px) saturate(180%)',
								WebkitBackdropFilter: 'blur(20px) saturate(180%)',
								border: '1px solid rgba(255, 255, 255, 0.13)',
								boxShadow:
									'0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 20px rgba(255, 255, 255, 0.03)',
							},
							success: {
								iconTheme: {
									primary: '#34d399',
									secondary: '#0f1117',
								},
								style: {
									borderLeft: '3px solid rgba(52, 211, 153, 0.7)',
									boxShadow:
										'0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(52, 211, 153, 0.1), 0 0 24px rgba(52, 211, 153, 0.06)',
								},
							},
							error: {
								iconTheme: {
									primary: '#f87171',
									secondary: '#0f1117',
								},
								style: {
									borderLeft: '3px solid rgba(248, 113, 113, 0.7)',
									boxShadow:
										'0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(248, 113, 113, 0.1), 0 0 24px rgba(248, 113, 113, 0.06)',
								},
							},
						}}
						/>
						{children}
					</ClientLayout>
				</AuthProvider>
				</GoogleAuthWrapper>
			</body>
		</html>
	);
}
