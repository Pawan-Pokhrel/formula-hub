import Link from 'next/link';

export default function Footer() {
	return (
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
	);
}
