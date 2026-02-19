'use client';

import authApi from '@/lib/api/authApi';
import { yupResolver } from '@hookform/resolvers/yup';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FiArrowLeft, FiLock, FiMail } from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import * as yup from 'yup';

const schema = yup.object().shape({
	email: yup
		.string()
		.required('Email is required')
		.email('Invalid email format'),
	password: yup.string().required('Password is required'),
});

export default function LoginPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isDirty },
		getValues,
	} = useForm({
		resolver: yupResolver(schema),
		mode: 'onChange',
	});

	const handleLogin = async (data) => {
		setIsSubmitting(true);
		try {
			const response = await authApi.login(data);

			if (response.success) {
				toast.success(response.message || 'Welcome back!');
				localStorage.setItem('token', response.token);
				router.push('/dashboard');
			}
		} catch (err) {
			const msg =
				err.response?.data?.detail ||
				err.message ||
				'Login failed. Please check your credentials.';
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
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
						{/* <div className="flex items-center gap-4 mb-4">
							<div className="h-16 w-16 rounded-xl bg-red-600 flex items-center justify-center shadow-2xl">
								<Image
									src="/images/formulahub-logo.png" // Keep your logo or update if needed
									alt="FormulaHub Logo"
									width={40}
									height={40}
									className="rounded"
								/>
							</div>
						</div> */}
						<h1 className="text-4xl font-bold text-white tracking-wide">
							Formula<span className="text-red-500">Hub</span>
						</h1>
						<p className="text-white/70 mt-2 text-lg">
							Welcome back to the grid
						</p>
					</div>

					<div className="rounded-2xl bg-white/5 backdrop-brightness-75 backdrop-blur-md border border-white/10 p-10 shadow-2xl">
						<div className="text-center mb-8">
							<h2 className="text-3xl font-bold text-white">Sign In</h2>
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
											: getValues('password') && !errors.password
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

							{/* Forgot Password Link */}
							<div className="flex justify-end">
								<a
									href="/forgot-password"
									className="text-sm text-red-500 hover:text-red-400 underline transition"
								>
									Forgot password?
								</a>
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
					</div>
				</div>
			</div>
		</>
	);
}
