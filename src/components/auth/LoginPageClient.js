'use client';

import authApi from '@/lib/api/authApi';
import { getApiErrorMessage } from '@/lib/errors/getApiErrorMessage';
import { useAuth } from '@/providers/AuthProvider';
import { yupResolver } from '@hookform/resolvers/yup';
import { useGoogleLogin } from '@react-oauth/google';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FiArrowLeft, FiCheck, FiLock, FiMail } from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import * as yup from 'yup';

const loginSchema = yup.object().shape({
	email: yup
		.string()
		.required('Email is required')
		.email('Invalid email format'),
	password: yup.string().required('Password is required'),
});

function getSafeNextPath(nextPath) {
	if (!nextPath || typeof nextPath !== 'string') return '/dashboard';
	if (!nextPath.startsWith('/') || nextPath.startsWith('//'))
		return '/dashboard';
	const lower = nextPath.toLowerCase();
	if (lower === '/login' || lower.startsWith('/login?')) return '/dashboard';
	if (lower === '/register' || lower.startsWith('/register?'))
		return '/dashboard';
	return nextPath;
}

/* ─── Verification Code Input (same pattern as register page) ─── */
const CODE_LENGTH = 6;

function VerificationCodeInput({ value, onChange, disabled }) {
	const inputsRef = useRef([]);

	const handleChange = (index, e) => {
		const val = e.target.value.replace(/\D/g, '');
		if (!val) return;
		const newCode = value.split('');
		newCode[index] = val[val.length - 1];
		const joined = newCode.join('');
		onChange(joined);
		if (index < CODE_LENGTH - 1) {
			inputsRef.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (index, e) => {
		if (e.key === 'Backspace') {
			e.preventDefault();
			const newCode = value.split('');
			if (newCode[index]?.trim()) {
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
		const pasted = e.clipboardData
			.getData('text')
			.replace(/\D/g, '')
			.slice(0, CODE_LENGTH);
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
						${value[i]?.trim() ? 'border-red-500/50 bg-red-900/8' : 'border-white/20'}
						${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
					`}
					autoComplete="one-time-code"
				/>
			))}
		</div>
	);
}

/* ─── Forgot Password Flow (inline replacement) ─── */
function ForgotPasswordStep({ onBack }) {
	const [step, setStep] = useState('email'); // 'email' | 'code' | 'newPassword'
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('      ');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	useEffect(() => {
		if (resendCooldown <= 0) return;
		const timer = setInterval(() => setResendCooldown((p) => p - 1), 1000);
		return () => clearInterval(timer);
	}, [resendCooldown]);

	const codeValue = code.replace(/\s/g, '');
	const isCodeComplete = codeValue.length === CODE_LENGTH;

	const handleSendCode = async () => {
		if (!email.trim()) {
			toast.error('Please enter your email address.');
			return;
		}
		setLoading(true);
		try {
			const res = await authApi.forgotPassword({ email: email.trim() });
			toast.success(res?.message || 'Reset code sent if the email exists.');
			setStep('code');
			setResendCooldown(30);
		} catch (err) {
			toast.error(getApiErrorMessage(err, 'Failed to send reset code.'));
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyAndReset = useCallback(async () => {
		if (!isCodeComplete) return;
		if (step === 'code') {
			// Move to password step
			setStep('newPassword');
			return;
		}
	}, [isCodeComplete, step]);

	// Auto-advance when code is complete
	useEffect(() => {
		if (isCodeComplete && step === 'code') {
			setStep('newPassword');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isCodeComplete]);

	const handleResetPassword = async () => {
		if (newPassword.length < 8) {
			toast.error('Password must be at least 8 characters.');
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error('Passwords do not match.');
			return;
		}
		setLoading(true);
		try {
			const res = await authApi.resetPassword({
				email: email.trim(),
				code: codeValue,
				newPassword,
			});
			toast.success(res?.message || 'Password reset successfully!');
			onBack(); // Go back to login form
		} catch (err) {
			toast.error(getApiErrorMessage(err, 'Failed to reset password.'));
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (resendCooldown > 0 || loading) return;
		setLoading(true);
		try {
			await authApi.forgotPassword({ email: email.trim() });
			toast.success('New reset code sent!');
			setResendCooldown(60);
			setCode('      ');
		} catch (err) {
			toast.error(getApiErrorMessage(err, 'Failed to resend code.'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Step: Enter email */}
			{step === 'email' && (
				<>
					<div className="text-center mb-2">
						<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 border border-red-500/25">
							<FiMail className="text-red-400 text-2xl" />
						</div>
						<h2 className="text-3xl font-bold text-white">Reset Password</h2>
						<p className="text-white/55 mt-3 text-sm leading-relaxed">
							Enter your email and we&apos;ll send a verification code
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-white mb-2">
							Email
						</label>
						<div className="flex items-center rounded-xl border border-white/30 transition focus-within:border-red-500">
							<FiMail className="ml-4 text-white/60" />
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="your@email.com"
								className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none"
								onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
							/>
						</div>
					</div>

					<button
						type="button"
						onClick={handleSendCode}
						disabled={loading || !email.trim()}
						className={`w-full py-5 rounded-xl font-semibold text-white transition cursor-pointer flex items-center justify-center gap-2 ${
							!loading && email.trim()
								? 'bg-red-600 hover:bg-red-700 hover:shadow-2xl hover:shadow-red-600/30'
								: 'bg-white/20 cursor-not-allowed'
						}`}
					>
						{loading ? (
							<>
								<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								Sending Code...
							</>
						) : (
							'Send Reset Code'
						)}
					</button>
				</>
			)}

			{/* Step: Enter code */}
			{step === 'code' && (
				<>
					<div className="text-center">
						<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 border border-red-500/25">
							<FiMail className="text-red-400 text-2xl" />
						</div>
						<h2 className="text-2xl sm:text-3xl font-bold text-white">
							Enter Reset Code
						</h2>
						<p className="text-white/55 mt-3 text-sm leading-relaxed">
							We&apos;ve sent a 6-digit code to
						</p>
						<p className="text-white font-semibold text-sm mt-1">{email}</p>
					</div>

					<div className="py-2">
						<VerificationCodeInput
							value={code}
							onChange={setCode}
							disabled={loading}
						/>
					</div>

					{/* Resend */}
					<div className="text-center space-y-3">
						<p className="text-white/45 text-xs">
							Didn&apos;t receive the code? Check your spam folder.
						</p>
						<button
							type="button"
							onClick={handleResend}
							disabled={loading || resendCooldown > 0}
							className={`text-sm font-semibold transition ${
								resendCooldown > 0 || loading
									? 'text-white/30 cursor-not-allowed'
									: 'text-red-400 hover:text-red-300 cursor-pointer'
							}`}
						>
							{loading
								? 'Sending...'
								: resendCooldown > 0
									? `Resend code in ${resendCooldown}s`
									: 'Resend code'}
						</button>
					</div>

					<button
						type="button"
						onClick={handleVerifyAndReset}
						disabled={!isCodeComplete || loading}
						className={`w-full py-4 rounded-xl font-semibold text-white transition cursor-pointer flex items-center justify-center gap-2 ${
							isCodeComplete && !loading
								? 'bg-red-600 hover:bg-red-700 hover:shadow-2xl hover:shadow-red-600/30'
								: 'bg-white/15 cursor-not-allowed'
						}`}
					>
						<FiCheck className="text-lg" />
						Continue
					</button>
				</>
			)}

			{/* Step: Set new password */}
			{step === 'newPassword' && (
				<>
					<div className="text-center mb-2">
						<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 border border-red-500/25">
							<FiLock className="text-red-400 text-2xl" />
						</div>
						<h2 className="text-3xl font-bold text-white">New Password</h2>
						<p className="text-white/55 mt-3 text-sm leading-relaxed">
							Set a new password for your account
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-white mb-2">
							New Password
						</label>
						<div className="flex items-center rounded-xl border border-white/30 transition focus-within:border-red-500">
							<FiLock className="ml-4 text-white/60" />
							<input
								type={showPassword ? 'text' : 'password'}
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Minimum 8 characters"
								className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none"
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
					</div>

					<div>
						<label className="block text-sm font-medium text-white mb-2">
							Confirm Password
						</label>
						<div className="flex items-center rounded-xl border border-white/30 transition focus-within:border-red-500">
							<FiLock className="ml-4 text-white/60" />
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="Confirm your new password"
								className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none"
								onKeyDown={(e) =>
									e.key === 'Enter' && handleResetPassword()
								}
							/>
						</div>
					</div>

					<button
						type="button"
						onClick={handleResetPassword}
						disabled={
							loading ||
							newPassword.length < 8 ||
							newPassword !== confirmPassword
						}
						className={`w-full py-5 rounded-xl font-semibold text-white transition cursor-pointer flex items-center justify-center gap-2 ${
							!loading &&
							newPassword.length >= 8 &&
							newPassword === confirmPassword
								? 'bg-red-600 hover:bg-red-700 hover:shadow-2xl hover:shadow-red-600/30'
								: 'bg-white/20 cursor-not-allowed'
						}`}
					>
						{loading ? (
							<>
								<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								Resetting...
							</>
						) : (
							'Reset Password'
						)}
					</button>
				</>
			)}

			{/* Back to login */}
			<button
				type="button"
				onClick={onBack}
				className="w-full text-center text-white/50 hover:text-white/70 text-sm transition cursor-pointer"
			>
				← Back to Sign In
			</button>
		</div>
	);
}

/* ─── Main Login Page ─── */
export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { login, googleAuth } = useAuth();
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [showForgotPassword, setShowForgotPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isDirty },
		getValues,
	} = useForm({
		resolver: yupResolver(loginSchema),
		mode: 'onChange',
	});

	const handleLogin = async (data) => {
		setIsSubmitting(true);
		try {
			const response = await login(data);
			const nextPath = getSafeNextPath(searchParams.get('next'));

			if (response.success) {
				toast.success(response.message || 'Welcome back!');
				router.replace(nextPath);
			}
		} catch (err) {
			toast.error(
				getApiErrorMessage(err, 'Login failed. Please check your credentials.')
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const loginWithGoogle = useGoogleLogin({
		scope: 'openid profile email',
		onSuccess: async (tokenResponse) => {
			setIsGoogleLoading(true);
			try {
				const res = await googleAuth(tokenResponse.access_token);
				const nextPath = getSafeNextPath(searchParams.get('next'));
				if (res.success) {
					toast.success(res.message || 'Google sign-in successful!');
					router.replace(nextPath);
				}
			} catch (err) {
				toast.error(getApiErrorMessage(err, 'Google sign-in failed.'));
			} finally {
				setIsGoogleLoading(false);
			}
		},
		onError: () => {
			toast.error('Google sign-in was canceled or failed.');
		},
	});

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

				{/* Dark overlay for better text readability */}
				<div className="absolute inset-0 bg-black/60" />

				<button
					onClick={() => router.push('/')}
					className="absolute top-8 left-8 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
				>
					<FiArrowLeft className="text-white text-2xl" />
				</button>

				<div className="relative z-10 w-full max-w-2xl">
					{/* Logo & Title */}
					<div className="flex flex-col items-center mb-10">
						<h1 className="text-4xl font-bold text-white tracking-wide">
							Formula<span className="text-red-500">Hub</span>
						</h1>
						<p className="text-white/70 mt-2 text-lg">
							{showForgotPassword
								? 'Recover your account access'
								: 'Welcome back to the grid'}
						</p>
					</div>

					<div className="rounded-2xl bg-white/5 backdrop-brightness-75 backdrop-blur-md border border-white/10 p-10 shadow-2xl">
						{showForgotPassword ? (
							<ForgotPasswordStep
								onBack={() => setShowForgotPassword(false)}
							/>
						) : (
							<>
								<div className="text-center mb-8">
									<h2 className="text-3xl font-bold text-white">
										Sign In
									</h2>
									<p className="text-white/60 mt-2">
										Access your F1 community account
									</p>
								</div>

								<form
									onSubmit={handleSubmit(handleLogin)}
									className="space-y-6"
								>
									{/* Email */}
									<div>
										<label className="block text-sm font-medium text-white mb-2">
											Email
										</label>
										<div
											className={`flex items-center rounded-xl border transition ${
												errors.email
													? 'border-red-500'
													: getValues('email') && !errors.email
														? 'border-red-600'
														: 'border-white/30'
											} ${isDirty && getValues('email') ? 'bg-white/5' : ''}`}
										>
											<FiMail className="ml-4 text-white/60" />
											<input
												{...register('email')}
												type="email"
												placeholder="your@email.com"
												className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none"
											/>
										</div>
										{errors.email && (
											<p className="text-red-400 text-xs mt-1">
												{errors.email.message}
											</p>
										)}
									</div>

									{/* Password */}
									<div>
										<label className="block text-sm font-medium text-white mb-2">
											Password
										</label>
										<div
											className={`flex items-center rounded-xl border transition ${
												errors.password
													? 'border-red-500'
													: getValues('password') &&
														  !errors.password
														? 'border-red-600'
														: 'border-white/30'
											}`}
										>
											<FiLock className="ml-4 text-white/60" />
											<input
												type={showPassword ? 'text' : 'password'}
												{...register('password')}
												placeholder="Enter your password"
												className="w-full px-4 py-4 bg-transparent text-white placeholder-white/40 outline-none"
											/>
											<button
												type="button"
												onClick={() =>
													setShowPassword(!showPassword)
												}
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

									{/* Forgot Password Link */}
									<div className="flex justify-end">
										<button
											type="button"
											onClick={() => setShowForgotPassword(true)}
											className="text-sm text-red-500 hover:text-red-400 underline transition cursor-pointer"
										>
											Forgot password?
										</button>
									</div>

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
										{isSubmitting ? 'Signing In...' : 'Sign In'}
									</button>

									{/* Divider */}
									<div className="my-6 flex items-center gap-4 text-white/60">
										<div className="flex-1 border border-gray-100/40" />
										<div>or continue with</div>
										<div className="flex-1 border border-gray-100/40" />
									</div>

									{/* Google Button */}
									<button
										type="button"
										onClick={() => loginWithGoogle()}
										disabled={isGoogleLoading}
										className={`w-full flex items-center justify-center gap-3 py-4 border border-white/30 rounded-xl text-white hover:bg-white/10 transition cursor-pointer ${
											isGoogleLoading
												? 'opacity-70 cursor-not-allowed'
												: ''
										}`}
									>
										{isGoogleLoading ? (
											<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										) : (
											<FcGoogle size={22} />
										)}
										{isGoogleLoading
											? 'Connecting...'
											: 'Continue with Google'}
									</button>

									{/* Register Link */}
									<p className="text-center text-white/70 mt-10">
										Don&apos;t have an account?{' '}
										<a
											href="/register"
											className="text-red-500 font-bold hover:text-red-400 underline transition"
										>
											Create Account
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
