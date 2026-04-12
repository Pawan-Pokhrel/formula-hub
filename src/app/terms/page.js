export const metadata = {
	title: 'Terms of Service | FormulaHub',
	description: 'Terms of Service and conditions for using FormulaHub.',
};

import { FaFileContract } from 'react-icons/fa';

export default function TermsOfServicePage() {
	return (
		<main className="relative min-h-screen bg-[#050507] pt-32 pb-24 px-6 sm:px-12 md:px-24 overflow-hidden">
			{/* Wind patterns background (reused from Hero) */}
			<div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-cover bg-center" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M54.627 0l.83.83-28.285 28.284-5.656-5.656L48.97 0h5.656zm-11.314 0L15.029 28.284l5.657 5.657L48.97 5.657 43.313 0zm-11.313 0L3.715 28.284l5.657 5.657L37.657 5.657 32 0zM20.686 0L0 20.686v5.657L26.343 5.657 20.686 0zM0 32l28.284 28.284 5.657-5.656L5.656 26.343 0 32zm0-11.314l39.598 39.598 5.657-5.656L5.656 15.029 0 20.686zm0-11.313L50.912 60h5.657L0 3.715v5.657zM60 15.03L15.03 60h5.656L60 20.686v-5.657zm0-11.314L26.343 60h5.657L60 9.373V3.715zm0-3.715L37.657 60h5.657L60 0v0z\\' fill=\\'%23ffffff\\' fill-opacity=\\'1\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E')" }} />

			<div className="relative z-10 mx-auto max-w-4xl">
				{/* Header Section */}
				<div className="mb-14 border-b border-white/10 pb-10">
					<div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/10 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-red-500 uppercase mb-6 shadow-[0_0_15px_rgba(220,38,38,0.15)]">
						<FaFileContract /> Legal Documentation
					</div>
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-none drop-shadow-lg">
						Terms of <span className="text-[#ff1e1e]">Service</span>
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
								<span className="text-[#ff1e1e]">01.</span> Acceptance of Terms and Conditions
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									By accessing, browsing, registering for, or otherwise utilizing the FormulaHub platform, its associated APIs, mobile applications, or digital infrastructure (collectively referred to as "the Service"), you hereby acknowledge that you have read, comprehensively understood, and unequivocally agree to be bound by these Terms of Service ("Terms"). If you do not agree with any provision of these Terms, you must immediately cease all access to and use of the Service. 
								</p>
								<p>
									The Service is provided strictly for personal, non-commercial, and informational use. Any unauthorized automated scraping, corporate syndication, real-time broadcast integration, or commercial redistribution of the data pipelines provided within the Service categorically violates these Terms. FormulaHub reserves the absolute right, exercised at its sole discretion, to modify, amend, or completely overhaul these Terms at any time without prior individualized notice. Continued access or utilization of the Service following such periodic updates inherently constitutes your binding acceptance of the revised Terms.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">02.</span> Account Registration and Security Obligations
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									In order to utilize certain advanced features of the Service—including but not limited to interactive dashboards, real-time telemetry visualizations, and customized race prediction algorithms—you may be required to register a user account. You solemnly declare that all information supplied during the registration process is accurate, current, and complete. 
								</p>
								<p>
									You are exclusively responsible for safeguarding the confidentiality of your account credentials, including passwords and cryptographic authorization tokens. FormulaHub explicitly disclaims any and all liability for losses, damages, or breaches resulting from your failure to maintain account security. In the event of an unauthorized breach of your account, you agree to notify FormulaHub technical support immediately. We retain the unilateral right to suspend, terminate, or indefinitely restrict your access if we reasonably suspect fraudulent, abusive, or insecure activity originating from your account.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">03.</span> Intellectual Property and Content Ownership
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									FormulaHub operates as an independent, third-party analytical tool and maintains absolutely no official affiliation, endorsement, or sponsorship with the Fédération Internationale de l'Automobile (FIA), Formula One World Championship Limited, or any of their respective subsidiaries, operating entities, or participating racing teams. 
								</p>
								<p>
									All F1-related intellectual property, including statistical data, driver likenesses, team logos, racing liveries, and circuit maps utilized within the Service are deployed strictly under the doctrine of Fair Use for the explicit purposes of informational reporting, commentary, and statistical analysis. The proprietary codebases, UI/UX designs, predictive machine learning models, and organizational architecture of the FormulaHub platform remain the exclusive intellectual property of FormulaHub. You are expressly prohibited from reverse-engineering, decompiling, reproducing, or attempting to extract the source code of the Service.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">04.</span> Limitation of Liability and Disclaimers
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE JURISPRUDENCE, THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. FormulaHub explicitly disclaims all warranties of merchantability, fitness for a particular purpose, and non-infringement.
								</p>
								<p>
									Under no circumstances, including but not limited to negligence, shall FormulaHub, its founders, developers, or affiliates be liable for any direct, indirect, incidental, special, punitive, or consequential damages—including loss of profits, data corruption, or operational interruptions—arising out of or in connection with your utilization of the platform. We do not guarantee continuous, uninterrupted, or perfectly accurate transmission of live telemetry or standing data, and reliance upon such data for financial, betting, or professional racing purposes is done entirely at your own risk.
								</p>
							</div>
						</section>

						<section className="group">
							<h2 className="text-lg font-bold uppercase tracking-wide text-white mb-3 flex items-center gap-3 transition-colors group-hover:text-red-100">
								<span className="text-[#ff1e1e]">05.</span> Governing Law and Dispute Resolution
							</h2>
							<div className="space-y-4 text-justify">
								<p>
									These Terms and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with standard international law governing digital services. Any disputes, claims, or controversies arising out of or relating to these Terms shall be resolved through binding, confidential arbitration, waiving any right to participate in a class-action lawsuit.
								</p>
							</div>
						</section>
					</div>
				</div>
			</div>
		</main>
	);
}
