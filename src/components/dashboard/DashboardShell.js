'use client';

export default function DashboardShell({
	widgetIds,
	renderWidget,
	spanMap = {},
	layoutMode = 'grid',
}) {
	const safeIds = Array.isArray(widgetIds) ? widgetIds : [];
	const isOddCount = safeIds.length % 2 === 1;

	if (layoutMode === 'race-ops') {
		const podiumId = safeIds.find((id) => id === 'last-race');
		const secondRowIds = safeIds.filter(
			(id) => id === 'next-race' || id === 'upcoming-sessions'
		);

		return (
			<div className="flex h-full w-full flex-col gap-5">
				{podiumId && (
					<div className="w-full min-h-0 md:min-h-[430px]">
						{renderWidget(podiumId)}
					</div>
				)}
				<div className="flex min-h-0 w-full flex-col gap-5 md:flex-row md:h-[26rem]">
					{secondRowIds.map((widgetId) => (
						<div
							key={widgetId}
							className="min-h-0 w-full md:w-1/2"
						>
							{renderWidget(widgetId)}
						</div>
					))}
				</div>
			</div>
		);
	}

	if (layoutMode === 'overview-manual') {
		const kpiId = safeIds.find((id) => id === 'kpis');
		const favoritesId = safeIds.find((id) => id === 'championship-pulse');
		const constructorId = safeIds.find((id) => id === 'constructor-battle');

		return (
			<div className="flex h-full w-full min-h-0 flex-col gap-5">
				{kpiId && <div className="w-full">{renderWidget(kpiId)}</div>}
				<div className="grid w-full min-h-0 flex-1 grid-cols-1 gap-5 md:grid-cols-2">
					{favoritesId && (
						<div className="min-h-0 w-full">{renderWidget(favoritesId)}</div>
					)}
					{constructorId && (
						<div className="min-h-0 w-full">{renderWidget(constructorId)}</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="grid h-full w-full grid-cols-1 gap-5 md:grid-cols-2 md:auto-rows-fr">
			{safeIds.map((widgetId, index) => {
				const isLast = index === safeIds.length - 1;
				const fallbackSpan = isOddCount && isLast ? 'md:col-span-2' : '';
				return (
					<div
						key={widgetId}
						className={`min-h-0 ${fallbackSpan} ${spanMap[widgetId] || ''}`}
					>
						{renderWidget(widgetId)}
					</div>
				);
			})}
		</div>
	);
}
