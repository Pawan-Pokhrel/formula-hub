export default function WindyBackground() {
	return (
		<div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
			{/* Very dark base with subtle red/gray atmospheric gradients */}
			<div className="absolute inset-0 bg-[#050507]" />
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a0408_0%,transparent_50%)] opacity-70" />
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#111115_0%,transparent_50%)] opacity-70" />

			{/* SVG Windy Background */}
			<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-[0.03]">
				<defs>
					<pattern id="wind_pattern" width="100" height="40" patternUnits="userSpaceOnUse" patternTransform="scale(3)">
						{/* Simulating aerodynamic wind tunnel lines */}
						<path d="M 0 10 Q 30 15 50 10 T 100 10" fill="none" stroke="#ffffff" strokeWidth="0.5" />
						<path d="M 0 25 Q 40 20 60 25 T 100 25" fill="none" stroke="#ffffff" strokeWidth="0.5" />
						<path d="M 0 35 Q 20 38 40 35 T 100 35" fill="none" stroke="#ffffff" strokeWidth="0.5" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#wind_pattern)" />
			</svg>
			
			{/* Fading overlay to mask the bottom and side edges */}
			<div className="absolute inset-0 bg-linear-to-b from-transparent via-[#050507]/20 to-[#050507] pointer-events-none" />
		</div>
	);
}
