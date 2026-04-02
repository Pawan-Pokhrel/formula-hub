import { ROUGH_CONSTRUCTOR_ORDER_2026 } from '@/lib/data/constructorStandingsRough';
import { DRIVER_CATALOG } from '@/lib/data/driversCatalog';

function getTeamColor(teamName) {
	const match = DRIVER_CATALOG.find((driver) => driver.teamName === teamName);
	return match?.teamColor || '#6B7280';
}

function darkenHexColor(hexColor, factor = 0.55) {
	const raw = String(hexColor || '')
		.trim()
		.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#1F2937';
	const toHex = (value) => value.toString(16).padStart(2, '0');
	const r = Math.max(
		0,
		Math.min(255, Math.round(parseInt(raw.slice(0, 2), 16) * factor))
	);
	const g = Math.max(
		0,
		Math.min(255, Math.round(parseInt(raw.slice(2, 4), 16) * factor))
	);
	const b = Math.max(
		0,
		Math.min(255, Math.round(parseInt(raw.slice(4, 6), 16) * factor))
	);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgba(hexColor, alpha) {
	const raw = String(hexColor || '')
		.trim()
		.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(31,41,55,${alpha})`;
	const r = parseInt(raw.slice(0, 2), 16);
	const g = parseInt(raw.slice(2, 4), 16);
	const b = parseInt(raw.slice(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

export default function TeamsLoading() {
	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1800px] mx-auto pb-12">
				<div className="mb-7 md:mb-9">
					<h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white/90">
						F1 Teams 2026
					</h1>
					<p className="mt-2 text-base text-gray-300">Loading teams...</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{ROUGH_CONSTRUCTOR_ORDER_2026.map((teamName) => {
						const color = getTeamColor(teamName);
						return (
							<div
								key={`teams-loading-${teamName}`}
								className="relative min-h-[290px] rounded-2xl overflow-hidden animate-pulse"
								style={{
									background: `linear-gradient(120deg, ${hexToRgba(darkenHexColor(color, 0.54), 0.3)} 0%, ${hexToRgba(color, 0.24)} 55%, rgba(6,6,8,0.72) 100%)`,
								}}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
