export default function FlagBanner({ currentFlags }) {
	if (!currentFlags?.length) return null;

	return (
		<div className="animate-pulse">
			{currentFlags.map((flag, idx) => (
				<div
					key={`${flag.type}-${flag.lap}-${idx}`}
					className={`px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide text-center ${
						flag.type === 'SC' ?
							'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
						: flag.type === 'VSC' ?
							'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
						:	'bg-red-600/20 text-red-400 border border-red-500/40'
					}`}
				>
					{flag.type === 'SC' ?
						'\uD83D\uDFE1 SAFETY CAR DEPLOYED'
					: flag.type === 'VSC' ?
						'\uD83D\uDFE1 VIRTUAL SAFETY CAR'
					:	'\uD83D\uDD34 RED FLAG'}{' '}
					\u2014 {flag.message}
				</div>
			))}
		</div>
	);
}
