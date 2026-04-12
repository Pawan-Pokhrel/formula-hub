'use client';

import authApi from '@/lib/api/authApi';
import { getApiErrorMessage } from '@/lib/errors/getApiErrorMessage';
import { useAuth } from '@/providers/AuthProvider';
import { yupResolver } from '@hookform/resolvers/yup';
import { useGoogleLogin } from '@react-oauth/google';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import {
	FiArrowLeft,
	FiCheck,
	FiImage,
	FiLock,
	FiMail,
	FiPhone,
	FiUpload,
	FiUser,
} from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import * as yup from 'yup';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/utils/cropImage';

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
	avatarUrl: yup.string().nullable().optional(),
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
				onVerified(response.token);
			}
		} catch (err) {
			toast.error(getApiErrorMessage(err, 'Verification failed.'));
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
			toast.error(getApiErrorMessage(err, 'Failed to resend code.'));
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
					isCodeComplete && !isVerifying ?
						'bg-red-600 hover:bg-red-700 hover:shadow-2xl hover:shadow-red-600/30'
					:	'bg-white/15 cursor-not-allowed'
				}`}
			>
				{isVerifying ?
					<>
						<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
						Verifying...
					</>
				:	<>
						<FiCheck className="text-lg" />
						Verify Email
					</>
				}
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
						resendCooldown > 0 || isResending ?
							'text-white/30 cursor-not-allowed'
						:	'text-red-400 hover:text-red-300 cursor-pointer'
					}`}
				>
					{isResending ?
						'Sending...'
					: resendCooldown > 0 ?
						`Resend code in ${resendCooldown}s`
					:	'Resend code'}
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
	const { register: registerUser, loginWithToken, googleAuth } = useAuth();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [isAvatarUploading, setIsAvatarUploading] = useState(false);
	const [avatarPreview, setAvatarPreview] = useState('');

	// Crop modal states
	const [cropSrc, setCropSrc] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

	// Verification step state
	const [showVerification, setShowVerification] = useState(false);
	const [registeredEmail, setRegisteredEmail] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isDirty },
		getValues,
		reset,
		setValue,
		watch,
	} = useForm({
		resolver: yupResolver(schema),
		mode: 'onChange',
	});

	const avatarUrl = watch('avatarUrl');

	useEffect(() => {
		if (!avatarUrl) {
			setAvatarPreview('');
			return;
		}
		setAvatarPreview(avatarUrl);
	}, [avatarUrl]);

	const handleAvatarUpload = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type?.startsWith('image/')) {
			toast.error('Please choose an image file.');
			event.target.value = '';
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error('Image must be 5MB or smaller.');
			event.target.value = '';
			return;
		}

		setCropSrc(URL.createObjectURL(file));
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		event.target.value = '';
	};

	const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleCropConfirm = async () => {
		if (!cropSrc || !croppedAreaPixels) return;
		setIsAvatarUploading(true);
		
		try {
			const croppedBlob = await getCroppedImg(cropSrc, croppedAreaPixels);
			const fileToUpload = new File([croppedBlob], `avatar.jpg`, {
				type: 'image/jpeg',
			});

			const response = await authApi.uploadAvatar(fileToUpload);
			const uploadedUrl = response?.avatarUrl || '';
			if (!uploadedUrl) {
				throw new Error('Upload finished but no image URL was returned.');
			}

			setValue('avatarUrl', uploadedUrl, {
				shouldDirty: true,
				shouldValidate: true,
			});
			setAvatarPreview(uploadedUrl);
			toast.success('Profile picture uploaded successfully!');
			setCropSrc(null); // Close the cropper
		} catch (err) {
			toast.error(getApiErrorMessage(err, 'Failed to crop and upload image.'));
		} finally {
			setIsAvatarUploading(false);
		}
	};

	const handleCropCancel = () => {
		setCropSrc(null);
	};

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
			toast.error(
				getApiErrorMessage(err, 'Registration failed. Please try again.')
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleVerified = async (token) => {
		toast.success('Account activated! Redirecting to dashboard...');
		if (token) {
			await loginWithToken(token);
		}
		setTimeout(() => router.push('/dashboard'), 1200);
	};

	const loginWithGoogle = useGoogleLogin({
		scope: 'openid profile email',
		onSuccess: async (tokenResponse) => {
			setIsGoogleLoading(true);
			try {
				const res = await googleAuth(tokenResponse.access_token);
				if (res.success) {
					toast.success(res.message || 'Google signup successful!');
					router.push('/dashboard');
				}
			} catch (err) {
				toast.error(getApiErrorMessage(err, 'Google signup failed.'));
			} finally {
				setIsGoogleLoading(false);
			}
		},
		onError: () => {
			toast.error('Google signup was canceled or failed.');
		},
	});

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
					<div className="flex flex-col items-center mb-4">
						<h1 className="text-4xl font-bold text-white tracking-wide">
							Formula<span className="text-red-500">Hub</span>
						</h1>
						<p className="text-white/70 text-[15px] mt-1">
							{showVerification ?
								'Almost there — verify your email'
							:	'Join the ultimate F1 community'}
						</p>
					</div>

					<div className="rounded-2xl bg-white/5 backdrop-blur-xl backdrop-brightness-80 border border-white/10 px-8 py-5 shadow-2xl">
						{showVerification ?
							<VerificationStep
								email={registeredEmail}
								onVerified={handleVerified}
								onBack={handleBackToRegister}
							/>
						:	<>
								<div className="text-center mb-4">
									<h2 className="text-2xl font-bold text-white">
										Create Account
									</h2>
									<p className="text-white/60 text-sm mt-1">
										Get access to exclusive F1 insights
									</p>
								</div>

								<form
									onSubmit={handleSubmit(handleRegister)}
									className="space-y-4"
								>
									<input
										type="hidden"
										{...register('avatarUrl')}
									/>
									{/* Full Name */}
									<div>
										<label className="block text-sm font-medium text-white mb-2">
											Full Name
										</label>
										<div
											className={`flex gap-4 items-center rounded-xl border transition ${
												errors.fullName ? 'border-red-500'
												: getValues('fullName') && !errors.fullName ?
													'border-red-600'
												:	'border-white/30'
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
													errors.email ? 'border-red-500'
													: getValues('email') && !errors.email ?
														'border-red-600'
													:	'border-white/30'
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
													errors.phoneNumber ? 'border-red-500'
													: getValues('phoneNumber') && !errors.phoneNumber ?
														'border-red-600'
													:	'border-white/30'
												} ${
													isDirty && getValues('phoneNumber') ? 'bg-red-900/10'
													:	''
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

									{/* Username & Avatar Row */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* Username (Optional) */}
										<div>
											<label className="block text-sm font-medium text-white mb-2">
												Username{' '}
												<span className="text-white/50 font-normal">
													(optional)
												</span>
											</label>
											<div
												className={`flex gap-4 items-center rounded-xl border border-white/30 transition ${
													isDirty && getValues('username') ? 'bg-red-900/10' : ''
												}`}
											>
												<FiUser className="ml-3 text-white/60 text-lg" />
												<input
													{...register('username')}
													placeholder="Choose a username"
													className="w-full px-2 py-3.5 bg-transparent rounded-r-xl text-white placeholder-white/40 outline-none"
													onChange={(e) => register('username').onChange(e)}
												/>
											</div>
										</div>

										{/* Profile Image (Optional) */}
										<div>
											<label className="block text-sm font-medium text-white mb-2">
												Profile Picture{' '}
												<span className="text-white/50 font-normal">
													(optional)
												</span>
											</label>
											
											<label
												className={`relative flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed transition-all p-1.5 ${
													isAvatarUploading
														? 'border-red-500/50 bg-red-900/10 opacity-70'
														: 'border-white/30 bg-black/35 hover:border-red-500/50 hover:bg-white/5'
												}`}
												onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
												onDrop={(e) => {
													e.preventDefault();
													e.stopPropagation();
													if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
														handleAvatarUpload({ target: { files: e.dataTransfer.files } });
													}
												}}
											>
												<input
													type="file"
													accept="image/*"
													onChange={handleAvatarUpload}
													disabled={isAvatarUploading}
													className="hidden"
												/>
												
												{avatarPreview ? (
													<div className="flex w-full items-center gap-3 pl-1">
														<div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/20 bg-black/40">
															<Image
																src={avatarPreview}
																alt="Profile preview"
																fill
																unoptimized
																className="object-cover"
															/>
														</div>
														<div className="flex-1 truncate">
															<p className="truncate text-xs font-semibold text-emerald-300">
																Image Uploaded
															</p>
															<p className="truncate text-[10px] text-white/50 leading-tight">
																Click or drag to change
															</p>
														</div>
													</div>
												) : (
													<div className="flex w-full items-center gap-3 pl-1">
														<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/60">
															<FiUpload className="text-base" />
														</div>
														<div className="flex-1 truncate">
															<p className="truncate text-sm font-medium text-white/80">
																{isAvatarUploading ? 'Uploading...' : 'Upload Image'}
															</p>
															<p className="truncate text-[10px] text-white/40 leading-tight">
																Drag & drop or browse
															</p>
														</div>
													</div>
												)}
											</label>
										</div>
									</div>

									{/* Passwords */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-white mb-2">
												Password
											</label>
											<div
												className={`flex gap-4 items-center rounded-xl border transition ${
													errors.password ? 'border-red-500'
													: getValues('password') && !errors.password ?
														'border-red-600'
													:	'border-white/30'
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
													{showPassword ?
														<LuEyeOff size={20} />
													:	<LuEye size={20} />}
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
													errors.confirmPassword ? 'border-red-500'
													: (
														getValues('confirmPassword') &&
														!errors.confirmPassword
													) ?
														'border-red-600'
													:	'border-white/30'
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
													{showConfirmPassword ?
														<LuEyeOff size={20} />
													:	<LuEye size={20} />}
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
										disabled={!isValid || isSubmitting || isAvatarUploading}
										className={`w-full py-5 rounded-xl font-semibold text-white transition cursor-pointer ${
											isValid && !isSubmitting && !isAvatarUploading ?
												'bg-red-600 hover:bg-red-700 hover:shadow-2xl hover:shadow-red-600/30'
											:	'bg-white/20 cursor-not-allowed'
										}`}
									>
										{isAvatarUploading ?
											'Uploading Image...'
										: isSubmitting ?
											'Creating Account...'
										:	'Create Account'}
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
										onClick={() => loginWithGoogle()}
										disabled={isGoogleLoading}
										className={`w-full flex items-center justify-center gap-3 py-4 border border-white/30 rounded-xl text-white hover:bg-white/10 transition cursor-pointer ${
											isGoogleLoading ? 'opacity-70 cursor-not-allowed' : ''
										}`}
									>
										{isGoogleLoading ?
											<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										:	<FcGoogle size={22} />}
										{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
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
						}
					</div>
				</div>
			</div>

			{/* Crop Modal */}
			{cropSrc && (
				<div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
					<div className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
						<div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
							<h3 className="text-white font-bold text-lg">Crop Profile Picture</h3>
							<button onClick={handleCropCancel} className="text-white/50 hover:text-white transition cursor-pointer text-2xl font-light leading-none">
								&times;
							</button>
						</div>
						<div className="relative h-[350px] w-full bg-black">
							<Cropper
								image={cropSrc}
								crop={crop}
								zoom={zoom}
								aspect={1}
								cropShape="round"
								showGrid={false}
								onCropChange={setCrop}
								onCropComplete={onCropComplete}
								onZoomChange={setZoom}
							/>
						</div>
						<div className="p-5 bg-black/50 space-y-5">
							<div>
								<div className="flex justify-between items-center mb-2">
									<p className="text-xs text-white/50 uppercase tracking-widest font-bold">Zoom</p>
									<p className="text-xs text-white/50 font-medium">{Math.round(zoom * 100)}%</p>
								</div>
								<input
									type="range"
									value={zoom}
									min={1}
									max={3}
									step={0.1}
									aria-label="Zoom"
									className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
									onChange={(e) => setZoom(Number(e.target.value))}
								/>
							</div>
							<div className="flex gap-3">
								<button
									type="button"
									onClick={handleCropCancel}
									className="flex-1 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition cursor-pointer"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleCropConfirm}
									disabled={isAvatarUploading}
									className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
								>
									{isAvatarUploading && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
									{isAvatarUploading ? 'Uploading...' : 'Confirm'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
