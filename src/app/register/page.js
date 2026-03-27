'use client';

import authApi from '@/lib/api/authApi';
import { useAuth } from '@/providers/AuthProvider';
import { yupResolver } from '@hookform/resolvers/yup';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import {
	FiArrowLeft,
	FiCheck,
	FiLock,
	FiMail,
	FiPhone,
	FiUser,
} from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import * as yup from 'yup';

const schema = yup.object().shape({
	fullName: yup
		.string()
		.required('Full name is required')
		.matches(/^[a-zA-Z\s'-]+$/, 'Invalid name format'),
	email: yup
		.string()
		.required('Email is required')
		.email('Invalid email format'),
	phoneNumber: yup.string().required('Phone number is required'),
	username: yup.string().optional(),
	password: yup
		.string()
		.required('Password is required')
		.min(8, 'Minimum 8 characters')
		.matches(/\d/, 'Must contain at least one number')
		.matches(
			/[!@#$%^&*(),.?":{}|<>]/,
			'Must contain at least one special character'
		),
	confirmPassword: yup
		.string()
		.oneOf([yup.ref('password')], 'Passwords must match')
		.required('Confirm password is required'),
	agreeTerms: yup
		.boolean()
		.oneOf([true], 'You must accept the terms and conditions')
		.required(),
});

// ── Verification Code Input ──────────────────────────────────────────

const CODE_LENGTH = 6;

function VerificationCodeInput({ value, onChange, disabled }) {
	const inputsRef = useRef([]);

	const handleChange = (index, e) => {
		const val = e.target.value.replace(/\D/g, '');
		if (!val) return;

		const newCode = value.split('');
		newCode[index] = val[val.length - 1]; // take last digit
		const joined = newCode.join('');
		onChange(joined);

		// Auto-focus next
		if (index < CODE_LENGTH - 1) {
			inputsRef.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (index, e) => {
		if (e.key === 'Backspace') {
			e.preventDefault();
			const newCode = value.split('');
			if (newCode[index]) {
				newCode[index] = ' ';
				onChange(newCode.join(''));
			} else if (index > 0) {
				newCode[index - 1] = ' ';
				onChange(newCode.join(''));
				inputsRef.current[index - 1]?.focus();
			}
		}
		if (e.key === 'ArrowLeft' && index > 0) {
			inputsRef.current[index - 1]?.focus();
		}
		if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
			inputsRef.current[index + 1]?.focus();
		}
	};

	const handlePaste = (e) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
		if (pasted.length === 0) return;
		const padded = pasted.padEnd(CODE_LENGTH, ' ');
		onChange(padded);
		const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
		inputsRef.current[focusIndex]?.focus();
	};

	return (
		<div className="flex items-center justify-center gap-2.5 sm:gap-3">
			{Array.from({ length: CODE_LENGTH }).map((_, i) => (
				<input
					key={i}
					ref={(el) => {
						inputsRef.current[i] = el;
					}}
					type="text"
					inputMode="numeric"
					maxLength={1}
					disabled={disabled}
					value={value[i]?.trim() || ''}
					onChange={(e) => handleChange(i, e)}
					onKeyDown={(e) => handleKeyDown(i, e)}
					onPaste={handlePaste}
					className={`
						h-14 w-11 sm:h-16 sm:w-13
						rounded-xl border text-center text-xl sm:text-2xl font-bold
						bg-white/5 text-white outline-none
						transition-all duration-200
						focus:border-red-500 focus:ring-2 focus:ring-red-500/25 focus:bg-white/8
						${
							value[i]?.trim()
								? 'border-red-500/50 bg-red-900/8'
								: 'border-white/20'
						}
						${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
					`}
					autoComplete="one-time-code"
				/>
			))}
		</div>
	);
}

// ── Verification Step Component ──────────────────────────────────────

function VerificationStep({ email, onVerified, onBack }) {
	const [code, setCode] = useState('      ');
	const [isVerifying, setIsVerifying] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	// Cooldown timer for resend
	useEffect(() => {
		if (resendCooldown <= 0) return;
		const timer = setInterval(() => {
			setResendCooldown((prev) => prev - 1);
		}, 1000);
		return () => clearInterval(timer);
	}, [resendCooldown]);

	// Start with an initial 30s cooldown (code was just sent on register)
	useEffect(() => {
		setResendCooldown(30);
	}, []);

	const codeValue = code.replace(/\s/g, '');
	const isCodeComplete = codeValue.length === CODE_LENGTH;

	const handleVerify = useCallback(async () => {
		if (!isCodeComplete || isVerifying) return;
		setIsVerifying(true);
		try {
			const response = await authApi.verifyEmail({ email, code: codeValue });
			if (response.success) {
				toast.success(response.message || 'Email verified!');
				onVerified();
			}
		} catch (err) {
			const msg =
				err.response?.data?.detail ||
				err.message ||
				'Verification failed.';
			toast.error(msg);
		} finally {
			setIsVerifying(false);
		}
	}, [isCodeComplete, isVerifying, email, codeValue, onVerified]);

	// Auto-submit when all 6 digits are entered
	useEffect(() => {
		if (isCodeComplete && !isVerifying) {
			handleVerify();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isCodeComplete]);

	const handleResend = async () => {
		if (isResending || resendCooldown > 0) return;
		setIsResending(true);
		try {
			const response = await authApi.resendCode({ email });
			toast.success(response.message || 'New code sent!');
			setResendCooldown(60);
			setCode('      ');
		} catch (err) {
			const msg =
				err.response?.data?.detail ||
				err.message ||
				'Failed to resend code.';
			toast.error(msg);
		} finally {
			setIsResending(false);
		}
	};

	return (
		<div className="space-y-7">
			{/* Header */}
			<div className="text-center">
				<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 border border-red-500/25">
					<FiMail className="text-red-400 text-2xl" />
				</div>
				<h2 className="text-2xl sm:text-3xl font-bold text-white">
					Verify Your Email
				</h2>
				<p className="text-white/55 mt-3 text-sm leading-relaxed">
					We&apos;ve sent a 6-digit verification code to
				</p>
				<p className="text-white font-semibold text-sm mt-1">{email}</p>
			</div>

			{/* Code Input */}
			<div className="py-2">
				<VerificationCodeInput
					value={code}
					onChange={setCode}
					disabled={isVerifying}
				/>
			</div>

			{/* Verify Button */}
			<button
				type="button"
				onClick={handleVerify}
				disabled={!isCodeComplete || isVerifying}
				className={`w-full py-4 rounded-xl font-semibold text-white transition cursor-pointer flex items-center justify-center gap-2 ${
					isCodeComplete && !isVerifying
						? 'bg-red-600 hover:bg-red-700 hover:shadow-2xl hover:shadow-red-600/30'
						: 'bg-white/15 cursor-not-allowed'
				}`}
			>
				{isVerifying ? (
					<>
						<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
						Verifying...
					</>
				) : (
					<>
						<FiCheck className="text-lg" />
						Verify Email
					</>
				)}
			</button>

			{/* Resend & Timer */}
			<div className="text-center space-y-3">
				<p className="text-white/45 text-xs">
					Didn&apos;t receive the code? Check your spam folder.
				</p>
				<button
					type="button"
					onClick={handleResend}
					disabled={isResending || resendCooldown > 0}
					className={`text-sm font-semibold transition ${
						resendCooldown > 0 || isResending
							? 'text-white/30 cursor-not-allowed'
							: 'text-red-400 hover:text-red-300 cursor-pointer'
					}`}
				>
					{isResending
						? 'Sending...'
						: resendCooldown > 0
						? `Resend code in ${resendCooldown}s`
						: 'Resend code'}
				</button>
			</div>

			{/* Back */}
			<button
				type="button"
				onClick={onBack}
				className="w-full text-center text-white/50 hover:text-white/70 text-sm transition cursor-pointer"
			>
				← Back to registration
			</button>
		</div>
	);
}

// ── Main Registration Page ───────────────────────────────────────────

export default function RegisterPage() {
	const router = useRouter();
	const { register: registerUser } = useAuth();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Verification step state
	const [showVerification, setShowVerification] = useState(false);
	const [registeredEmail, setRegisteredEmail] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isDirty },
		getValues,
		reset,
	} = useForm({
		resolver: yupResolver(schema),
		mode: 'onChange',
	});

	const handleRegister = async (data) => {
		setIsSubmitting(true);
		try {
			const { agreeTerms, confirmPassword, ...payload } = data;

			const response = await registerUser(payload);

			if (response.success) {
				toast.success(response.message || 'Verification code sent!');
				setRegisteredEmail(data.email);
				setShowVerification(true);
			}
		} catch (err) {
			const msg =
				err.response?.data?.detail ||
				err.message ||
				'Registration failed. Please try again.';
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleVerified = () => {
		toast.success('Account activated! Redirecting to login...');
		setTimeout(() => router.push('/login'), 1200);
	};

	const handleBackToRegister = () => {
		setShowVerification(false);
		setRegisteredEmail('');
	};

	return (
		<>
			<div className="relative flex min-h-screen items-center justify-center px-4 py-8 overflow-hidden">
				{/* Full-screen background image */}
				<Image
					src="/images/FormulaHub-BG.png"
					alt="FormulaHub Background"
					fill
					className="object-cover brightness-75 blur-sm"
					priority
				/>

				{/* Dark overlay for readability */}
				<div className="absolute inset-0 bg-black/60" />

				<button
					onClick={() => router.push('/')}
					className="absolute top-8 left-8 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
				>
					<FiArrowLeft className="text-white text-2xl" />
				</button>

				<div className="relative z-10 w-full max-w-3xl">
					{/* Logo & Title */}
					<div className="flex flex-col items-center mb-6">
						<h1 className="text-4xl font-bold text-white tracking-wide">
							Formula<span className="text-red-500">Hub</span>
						</h1>
						<p className="text-white/70 text-lg">
							{showVerification
								? 'Almost there — verify your email'
								: 'Join the ultimate F1 community'}
						</p>
					</div>

					<div className="rounded-2xl bg-white/5 backdrop-blur-xl backdrop-brightness-80 border border-white/10 px-10 py-8 shadow-2xl">
						{showVerification ? (
							<VerificationStep
								email={registeredEmail}
								onVerified={handleVerified}
								onBack={handleBackToRegister}
							/>
						) : (
							<>
								<div className="text-center mb-6">
									<h2 className="text-3xl font-bold text-white">
										Create Account
									</h2>
									<p className="text-white/60 mt-2">
										Get access to exclusive F1 insights and discussions
									</p>
								</div>

								<form
									onSubmit={handleSubmit(handleRegister)}
									className="space-y-5.5"
								>
									{/* Full Name */}
									<div>
										<label className="block text-sm font-medium text-white mb-2">
											Full Name
										</label>
										<div
											className={`flex gap-4 items-center rounded-xl border transition ${
												errors.fullName
													? 'border-red-500'
													: getValues('fullName') && !errors.fullName
													? 'border-red-600'
													: 'border-white/30'
											} ${isDirty && getValues('fullName') ? 'bg-red-900/10' : ''}`}
										>
											<FiUser className="ml-4 text-white/60" />
											<input
												{...register('fullName')}
												placeholder="Enter your full name"
												className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none rounded-r-xl"
												onChange={(e) => register('fullName').onChange(e)}
											/>
										</div>
										{errors.fullName && (
											<p className="text-red-400 text-xs mt-1">
												{errors.fullName.message}
											</p>
										)}
									</div>

									{/* Email & Phone */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<label className="block text-sm font-medium text-white mb-2">
												Email
											</label>
											<div
												className={`flex gap-4 items-center rounded-xl border transition ${
													errors.email
														? 'border-red-500'
														: getValues('email') && !errors.email
														? 'border-red-600'
														: 'border-white/30'
												} ${isDirty && getValues('email') ? 'bg-red-900/10' : ''}`}
											>
												<FiMail className="ml-4 text-white/60" />
												<input
													{...register('email')}
													type="email"
													placeholder="your@email.com"
													className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none rounded-r-xl"
													onChange={(e) => register('email').onChange(e)}
												/>
											</div>
											{errors.email && (
												<p className="text-red-400 text-xs mt-1">
													{errors.email.message}
												</p>
											)}
										</div>

										<div>
											<label className="block text-sm font-medium text-white mb-2">
												Phone Number
											</label>
											<div
												className={`flex gap-4 items-center rounded-xl border transition ${
													errors.phoneNumber
														? 'border-red-500'
														: getValues('phoneNumber') && !errors.phoneNumber
														? 'border-red-600'
														: 'border-white/30'
												} ${
													isDirty && getValues('phoneNumber') ? 'bg-red-900/10' : ''
												}`}
											>
												<FiPhone className="ml-4 text-white/60" />
												<input
													{...register('phoneNumber')}
													type="tel"
													placeholder="+1234567890"
													className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none rounded-r-xl"
												/>
											</div>
											{errors.phoneNumber && (
												<p className="text-red-400 text-xs mt-1">
													{errors.phoneNumber.message}
												</p>
											)}
										</div>
									</div>

									{/* Username (Optional) */}
									<div>
										<label className="block text-sm font-medium text-white mb-2">
											Username{' '}
											<span className="text-white/50 font-normal">(optional)</span>
										</label>
										<div
											className={`flex gap-4 items-center rounded-xl border border-white/30 transition ${
												isDirty && getValues('username') ? 'bg-red-900/10' : ''
											}`}
										>
											<FiUser className="ml-4 text-white/60" />
											<input
												{...register('username')}
												placeholder="Choose a username"
												className="w-full px-4 py-4 bg-transparent rounded-r-xl text-white placeholder-white/40 outline-none"
												onChange={(e) => register('username').onChange(e)}
											/>
										</div>
									</div>

									{/* Passwords */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<label className="block text-sm font-medium text-white mb-2">
												Password
											</label>
											<div
												className={`flex gap-4 items-center rounded-xl border transition ${
													errors.password
														? 'border-red-500'
														: getValues('password') && !errors.password
														? 'border-red-600'
														: 'border-white/30'
												}`}
											>
												<FiLock className="ml-4 text-white/60" />
												<input
													type={showPassword ? 'text' : 'password'}
													{...register('password')}
													placeholder="Create strong password"
													className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none"
													onChange={(e) => register('password').onChange(e)}
												/>
												<button
													type="button"
													onClick={() => setShowPassword(!showPassword)}
													className="px-4 text-white/60 hover:text-white transition cursor-pointer"
												>
													{showPassword ? (
														<LuEyeOff size={20} />
													) : (
														<LuEye size={20} />
													)}
												</button>
											</div>
											{errors.password && (
												<p className="text-red-400 text-xs mt-1">
													{errors.password.message}
												</p>
											)}
										</div>

										<div>
											<label className="block text-sm font-medium text-white mb-2">
												Confirm Password
											</label>
											<div
												className={`flex items-center rounded-xl border transition ${
													errors.confirmPassword
														? 'border-red-500'
														: getValues('confirmPassword') &&
														  !errors.confirmPassword
														? 'border-red-600'
														: 'border-white/30'
												}`}
											>
												<FiLock className="ml-4 text-white/60" />
												<input
													type={showConfirmPassword ? 'text' : 'password'}
													{...register('confirmPassword')}
													placeholder="Confirm your password"
													className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none"
													onChange={(e) =>
														register('confirmPassword').onChange(e)
													}
												/>
												<button
													type="button"
													onClick={() =>
														setShowConfirmPassword(!showConfirmPassword)
													}
													className="px-4 text-white/60 hover:text-white transition cursor-pointer"
												>
													{showConfirmPassword ? (
														<LuEyeOff size={20} />
													) : (
														<LuEye size={20} />
													)}
												</button>
											</div>
											{errors.confirmPassword && (
												<p className="text-red-400 text-xs mt-1">
													{errors.confirmPassword.message}
												</p>
											)}
										</div>
									</div>

									{/* Terms Checkbox */}
									<div className="flex items-start gap-3">
										<input
											type="checkbox"
											{...register('agreeTerms')}
											className="mt-1 accent-red-600"
										/>
										<label className="text-sm text-white/80">
											I agree to the{' '}
											<a
												href="/terms"
												className="text-red-500 hover:text-red-400 underline transition"
											>
												Terms of Service
											</a>{' '}
											and{' '}
											<a
												href="/privacy"
												className="text-red-500 hover:text-red-400 underline transition"
											>
												Privacy Policy
											</a>
										</label>
									</div>
									{errors.agreeTerms && (
										<p className="text-red-400 text-xs">
											{errors.agreeTerms.message}
										</p>
									)}

									{/* Submit Button */}
									<button
										type="submit"
										disabled={!isValid || isSubmitting}
										className={`w-full py-5 rounded-xl font-semibold text-white transition cursor-pointer ${
											isValid && !isSubmitting
												? 'bg-red-600 hover:bg-red-700 hover:shadow-2xl hover:shadow-red-600/30'
												: 'bg-white/20 cursor-not-allowed'
										}`}
									>
										{isSubmitting ? 'Creating Account...' : 'Create Account'}
									</button>

									{/* Divider */}
									<div className="my-4 flex items-center gap-4 text-white/60">
										<div className="flex-1 border border-gray-100/40"></div>
										<div>or continue with</div>
										<div className="flex-1 border border-gray-100/40"></div>
									</div>

									{/* Google Button */}
									<button
										type="button"
										className="w-full flex items-center justify-center gap-3 py-4 border border-white/30 rounded-xl text-white hover:bg-white/10 transition cursor-pointer"
									>
										<FcGoogle size={22} /> Continue with Google
									</button>

									{/* Login Link */}
									<p className="text-center text-white/70">
										Already have an account?{' '}
										<a
											href="/login"
											className="text-red-500 font-bold hover:text-red-400 underline transition"
										>
											Sign In
										</a>
									</p>
								</form>
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
