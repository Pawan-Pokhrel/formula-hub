export const WIDGET_REGISTRY = [
	{
		id: 'kpis',
		title: 'KPI Grid',
		visible: true,
		defaultPosition: 0,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 1 },
		dataDependencies: ['schedule', 'trackSchedule', 'nextRace'],
		layoutClassName: 'md:col-span-2 lg:col-span-3 xl:col-span-4 xl:row-start-1',
	},
	{
		id: 'next-race',
		title: 'Next Race Window',
		visible: true,
		defaultPosition: 1,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['nextRace'],
		layoutClassName: 'md:col-span-2 lg:col-span-3 xl:col-span-5 xl:row-start-1',
	},
	{
		id: 'championship-pulse',
		title: 'Championship Pulse',
		visible: true,
		defaultPosition: 2,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['driverStandings', 'constructorStandings'],
		layoutClassName: 'md:col-span-2 lg:col-span-6 xl:col-span-3 xl:row-start-1',
	},
	{
		id: 'title-fight',
		title: 'Title Fight Ladder',
		visible: true,
		defaultPosition: 3,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['driverStandings'],
		layoutClassName: 'md:col-span-2 lg:col-span-4 xl:col-span-5 xl:row-start-2',
	},
	{
		id: 'constructor-battle',
		title: 'Constructor Power Index',
		visible: true,
		defaultPosition: 4,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['constructorStandings'],
		layoutClassName: 'md:col-span-2 lg:col-span-2 xl:col-span-3 xl:row-start-2',
	},
	{
		id: 'upcoming-sessions',
		title: 'Upcoming Sessions',
		visible: true,
		defaultPosition: 5,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['schedule', 'trackSchedule'],
		layoutClassName: 'md:col-span-2 lg:col-span-6 xl:col-span-4 xl:row-start-2',
	},
	{
		id: 'last-race',
		title: 'Last Race Snapshot',
		visible: true,
		defaultPosition: 6,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['lastRace'],
		layoutClassName:
			'md:col-span-2 lg:col-span-6 xl:col-span-12 xl:row-start-3',
	},
	{
		id: 'weekend-status',
		title: 'Weekend Intel',
		visible: true,
		defaultPosition: 7,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['weekendBrief'],
		layoutClassName: 'md:col-span-2 lg:col-span-6 xl:col-span-12',
	},
	{
		id: 'session-results',
		title: 'Last Session Results',
		visible: true,
		defaultPosition: 8,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['weekendBrief'],
		layoutClassName: 'md:col-span-2 lg:col-span-6 xl:col-span-12',
	},
	{
		id: 'starting-grid',
		title: 'Starting Grid',
		visible: true,
		defaultPosition: 9,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['weekendBrief'],
		layoutClassName: 'md:col-span-1 lg:col-span-3 xl:col-span-6',
	},
	{
		id: 'f1-news',
		title: 'F1 News Wire',
		visible: true,
		defaultPosition: 10,
		minSize: { cols: 1, rows: 1 },
		maxSize: { cols: 12, rows: 2 },
		dataDependencies: ['f1News'],
		layoutClassName: 'md:col-span-1 lg:col-span-3 xl:col-span-6',
	},
];

export const DEFAULT_WIDGET_ORDER = WIDGET_REGISTRY.slice()
	.sort((a, b) => a.defaultPosition - b.defaultPosition)
	.map((w) => w.id);

export function getWidgetRegistryMap() {
	return Object.fromEntries(
		WIDGET_REGISTRY.map((widget) => [widget.id, widget])
	);
}
