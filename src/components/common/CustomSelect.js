import { useEffect, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

export default function CustomSelect({
	label,
	value,
	onChange,
	options,
	placeholder = 'Select...',
	disabled = false,
	renderOption = (opt) => opt.label || opt.value || opt,
	getOptionValue = (opt) => opt.value || opt,
	className = '',
}) {
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef(null);

	// Close on outside click
	useEffect(() => {
		function handleClickOutside(event) {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const selectedOption = options.find((opt) => getOptionValue(opt) === value);

	return (
		<div className={`relative ${className}`} ref={wrapperRef}>
			{label && (
				<label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">
					{label}
				</label>
			)}
			<button
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={`w-full flex items-center justify-between bg-white/5 border ${isOpen ? 'border-red-600/50 ring-1 ring-red-600/20' : 'border-white/10'} rounded-xl px-4 py-3 text-white text-sm transition-all focus:outline-none focus:border-red-600/50 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed`}
			>
				<span className={!selectedOption ? 'text-gray-400' : 'truncate'}>
					{selectedOption ? renderOption(selectedOption) : placeholder}
				</span>
				<FaChevronDown
					className={`text-gray-500 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
				/>
			</button>

			{isOpen && (
				<ul className="absolute z-50 w-full mt-2 py-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
					{options.map((opt, idx) => {
						const optValue = getOptionValue(opt);
						const isSelected = optValue === value;
						return (
							<li
								key={idx}
								onClick={() => {
									onChange(optValue);
									setIsOpen(false);
								}}
								className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${isSelected ? 'bg-red-600/20 text-red-100 border-l-2 border-red-500 pl-[14px]' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
							>
								{renderOption(opt)}
							</li>
						);
					})}
					{options.length === 0 && (
						<li className="px-4 py-3 text-sm text-gray-500 text-center">
							No options available
						</li>
					)}
				</ul>
			)}
		</div>
	);
}
