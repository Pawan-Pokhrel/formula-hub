export const metadata = {
	title: 'Privacy Policy | FormulaHub',
	description: 'Privacy Policy explaining how FormulaHub handles your data.',
};

import { FaShieldAlt } from 'react-icons/fa';

export default function PrivacyPolicyPage() {
	return (
		<main className="relative min-h-screen bg-[#050507] pt-32 pb-24 px-6 sm:px-12 md:px-24 overflow-hidden">
			{/* Wind patterns background (reused from Hero) */}
			<div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-cover bg-center" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M54.627 0l.83.83-28.285 28.284-5.656-5.656L48.97 0h5.656zm-11.314 0L15.029 28.284l5.657 5.657L48.97 5.657 43.313 0zm-11.313 0L3.715 28.284l5.657 5.657L37.657 5.657 32 0zM20.686 0L0 20.686v5.657L26.343 5.657 20.686 0zM0 32l28.284 28.284 5.657-5.656L5.656 26.343 0 32zm0-11.314l39.598 39.598 5.657-5.656L5.656 15.029 0 20.686zm0-11.313L50.912 60h5.657L0 3.715v5.657zM60 15.03L15.03 60h5.656L60 20.686v-5.657zm0-11.314L26.343 60h5.657L60 9.373V3.715zm0-3.715L37.657 60h5.657L60 0v0z\\' fill=\\'%23ffffff\\' fill-opacity=\\'1\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E')" }} />

			<div className="relative z-10 mx-auto max-w-4xl">
				{/* Header Section */}
				<div className="mb-14 border-b border-white/10 pb-10">
					<div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/10 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-red-500 uppercase mb-6 shadow-[0_0_15px_rgba(220,38,38,0.15)]">
						<FaShieldAlt /> Data Protection
					</div>
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-none drop-shadow-lg">
						Privacy <span className="text-[#ff1e1e]">Policy</span>
					</h1>
					<p className="mt-5 text-zinc-400 text-[13px] font-bold tracking-[0.1em] uppercase">
						Effective Date: April 2026 <span className="mx-2 text-[#ff1e1e]">•</span> Revision 1.0
					</p>
				</div>

				{/* Content layout with red racing line */}
				<div className="relative pl-6 md:pl-10">
					{/* Glowing red accent line on the left */}
					<div className="absolute top-0 bottom-0 left-0 w-[2px] bg-linear-to-b from-[#ff1e1e] via-[#ff1e1e]/40 to-transparent shadow-[0_0_10px_rgba(255,30,30,0.8)]" />

					<div className="space-y-12 text-zinc-400 leading-relaxed text-[13px] sm:text-[14px] font-normal drop-shadow-md pb-12">
						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">01.</span> Aggregation of Identifiable Information
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									FormulaHub strictly adheres to the principle of data minimization in accordance with modern global privacy frameworks. When you establish a user profile, authenticate via an integrated third-party identity provider, or navigate our interactive motorsport portals, we systematically collect only the specific data points requisite for sustained service delivery. This explicit data collection encompasses your verified email address, chosen cryptographic identity tokens, user-defined handles, and voluntarily provided profile imagery. 
								</p>
								<p>
									Furthermore, to continually optimize the latency and accuracy of our analytical platform, our edge infrastructure autonomously gathers anonymized telemetric metadata. This includes, but is not limited to, generalized geographical IP mapping, device and browser heuristics, bandwidth constraints, and granular engagement session timelines. This passive data collection is executed utilizing secure, stateless protocols designed to prevent individualized user fingerprinting.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">02.</span> Utilization and Processing of Data
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									The information synthesized by FormulaHub is rigorously siloed and explicitly utilized to maintain continuous authentication validation, dynamically render personalized statistical dashboards, and execute our internal predictive machine learning models. We categorically refrain from selling, renting, or arbitrarily licensing your personal identifiable information (PII) to external data brokers or unauthorized third-party marketing syndicates.
								</p>
								<p>
									In the rare event we employ third-party cloud infrastructure providers (e.g., Supabase, Vercel) for database storage or edge computing, such entities operate strictly under exhaustive Data Processing Agreements (DPAs) which legally prohibit them from accessing, inspecting, or repurposing your raw data. Your data is strictly a logistical necessity for the algorithmic execution of the FormulaHub environment.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">03.</span> Cryptographic and Infrastructural Protection
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									FormulaHub deploys aggressive security protocols to intercept unauthorized access attempts. All interactions between your client device and our cloud infrastructure are secured via industry-standard Transport Layer Security (TLS 1.3). Sensitive credentials, particularly passwords, are never stored in plaintext; they are asynchronously hashed utilizing bcrypt algorithms with high computational work factors, thereby rendering database extraction functionally obsolete for direct credential theft.
								</p>
								<p>
									However, you acknowledge that the transmission of data across decentralized internet nodes inherently carries theoretical risk. While we implement bank-grade encryption at rest and in transit, FormulaHub cannot legally guarantee absolute, impervious security against highly sophisticated, state-sponsored, or zero-day cryptographic exploitations. You therefore utilize the Service acknowledging this inherent constraint.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">04.</span> Delegated OAuth Authentications
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									The Service supports delegated authentication paradigms, notably Google Workspace Single Sign-On (SSO). By electing to authenticate via these external pathways, you authorize FormulaHub to securely request and store authorized identity payloads directly from the provider. Usage of these decentralized identity federations is governed entirely by the independent Privacy Policies established by those external corporations (e.g., Google LLC). FormulaHub claims no liability for the data processing activities executed upstream by your selected SSO provider before the payload reaches our infrastructure.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">05.</span> Irrevocable User Rights and Deletion
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									You retain sovereign control over your account data. At any given moment, you maintain the irrevocable right to alter, obfuscate, or entirely eradicate your digital footprint from the FormulaHub database. Upon initiating an account deletion request within your Profile Settings, an automated cascading deletion protocol is triggered across our relational databases. 
								</p>
								<p>
									This process permanently purges your primary records, authentication hashes, and associated telemetry. Please note that residual fragments of non-identifying, heavily anonymized aggregate statistics used strictly for macro-level system analysis may persist indefinitely, as they no longer technically qualify as Personal Data under governing legal definitions.
								</p>
							</div>
						</section>
					</div>
				</div>
			</div>
		</main>
	);
}
