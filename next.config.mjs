/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

function toRemotePattern(urlValue) {
	try {
		const parsed = new URL(urlValue);
		return {
			protocol: parsed.protocol.replace(':', ''),
			hostname: parsed.hostname,
			port: parsed.port || '',
			pathname: '/**',
		};
	} catch {
		return null;
	}
}

const apiPattern = toRemotePattern(apiUrl);

const nextConfig = {
	reactCompiler: true,
	experimental: {
		staleTimes: {
			dynamic: 30,
			static: 180,
		},
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'lh3.googleusercontent.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: '**.googleusercontent.com',
				pathname: '/**',
			},
			{ protocol: 'http', hostname: 'localhost', pathname: '/**' },
			{ protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
			{ protocol: 'https', hostname: 'localhost', pathname: '/**' },
			{ protocol: 'https', hostname: '127.0.0.1', pathname: '/**' },
			...(apiPattern ? [apiPattern] : []),
		],
	},
};

export default nextConfig;
