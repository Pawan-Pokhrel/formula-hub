'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

// If no client ID configured, we provide a dummy string so the provider doesn't crash the app.
// The actual Google login button will fail if clicked without a real client ID configured.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'unconfigured-client-id';

export default function GoogleAuthWrapper({ children }) {
	return (
		<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
			{children}
		</GoogleOAuthProvider>
	);
}
