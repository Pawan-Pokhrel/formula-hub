import {
	ROUGH_CONSTRUCTOR_ORDER_2026,
} from '@/lib/data/constructorStandingsRough';
import { DRIVER_CATALOG } from '@/lib/data/driversCatalog';

function getTeamColor(teamName) {
	const match = DRIVER_CATALOG.find((driver) => driver.teamName === teamName);
	return match?.teamColor || '#6B7280';
}

function darkenHexColor(hexColor, factor = 0.55) {
	const raw = String(hexColor || '').trim().replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#1F2937';
	const toHex = (value) => value.toString(16).padStart(2, '0');
	const r = Math.max(0, Math.min(255, Math.round(parseInt(raw.slice(0, 2), 16) * factor)));
	const g = Math.max(0, Math.min(255, Math.round(parseInt(raw.slice(2, 4), 16) * factor)));
	const b = Math.max(0, Math.min(255, Math.round(parseInt(raw.slice(4, 6), 16) * factor)));
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgba(hexColor, alpha) {
	const raw = String(hexColor || '').trim().replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(31,41,55,${alpha})`;
	const r = parseInt(raw.slice(0, 2), 16);
	const g = parseInt(raw.slice(2, 4), 16);
	const b = parseInt(raw.slice(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

export default function DriversLoading() {
	const skeletonCards = ROUGH_CONSTRUCTOR_ORDER_2026.flatMap((teamName) => [
		{ teamName, slot: 1, color: getTeamColor(teamName) },
		{ teamName, slot: 2, color: getTeamColor(teamName) },
	]);

	return (
		<div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 lg:px-20 bg-[url('/images/FormulaHub-BG.png')] bg-cover bg-fixed bg-center">
			<div className="fixed inset-0 bg-black/90 z-0" />
			<div className="relative z-10 max-w-[1800px] mx-auto pb-12">
				<div className="mb-6 md:mb-8">
					<h1 className="text-3xl md:text-4xl font-black uppercase tracking-wide text-white/90">
						F1 Drivers 2026
					</h1>
					<p className="mt-2 text-sm text-gray-300 max-w-2xl">
						Loading drivers...
					</p>
				</div>

				<div className="mb-7 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
					<div className="h-[52px] rounded-2xl bg-white/6" />
					<div className="h-[52px] rounded-2xl bg-white/6" />
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
					{skeletonCards.map((teamOption) => (
						<div
							key={`loading-${teamOption.teamName}-${teamOption.slot}`}
							className="relative h-72 rounded-xl overflow-hidden"
							style={{
								background: `linear-gradient(120deg, ${hexToRgba(darkenHexColor(teamOption.color, 0.52), 0.18)} 0%, ${hexToRgba(darkenHexColor(teamOption.color, 0.44), 0.16)} 58%, rgba(8,8,10,0.62) 100%)`,
							}}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
