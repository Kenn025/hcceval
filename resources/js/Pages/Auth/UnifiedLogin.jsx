import React, { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../css/homepage-design.css';

export default function UnifiedLogin({ status, error, submitRoute = 'login' }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hcceval-theme-mode') === 'dark';
  });

  const { data, setData, post, processing, errors } = useForm({
    identifier: '',
    password: '',
  });

  useEffect(() => {
    const themeClass = isDarkMode ? 'dark-mode' : 'light-mode';
    document.body.className = themeClass;
    document.body.style.backgroundColor = 'var(--bg-primary)';
    document.body.style.color = 'var(--text-primary)';

    if (typeof window !== 'undefined') {
      localStorage.setItem('hcceval-theme-mode', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  const submit = (e) => {
    e.preventDefault();
    post(route(submitRoute));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Head title="Holy Cross College - Unified Login" />

      <div className="relative w-full max-w-6xl mx-auto flex items-center justify-center">
        <div className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 xl:-translate-x-14 2xl:-translate-x-20">
          <div className="neumorphic-circle login-side-logo w-80 h-80 xl:w-[22rem] xl:h-[22rem] p-6 flex items-center justify-center">
            <div className="login-logo-inner w-[92%] h-[92%] rounded-full flex items-center justify-center">
              <img src="/assets/login/logo-left.png" alt="Left campus logo" className="w-full h-full object-contain scale-[1.12]" />
            </div>
          </div>
        </div>

        <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 xl:translate-x-14 2xl:translate-x-20">
          <div className="neumorphic-circle login-side-logo w-80 h-80 xl:w-[22rem] xl:h-[22rem] p-6 flex items-center justify-center">
            <div className="login-logo-inner w-[92%] h-[92%] rounded-full flex items-center justify-center">
              <img src="/assets/login/logo-right.png" alt="Right campus logo" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <div className="w-full max-w-md neumorphic overflow-hidden">
          <div className="px-6 pt-5 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 neumorphic-btn px-3 py-2 text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              <span aria-hidden="true">&larr;</span>
              <span>Back to Homepage</span>
            </Link>

            <button
              type="button"
              className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
              onClick={() => setIsDarkMode((prev) => !prev)}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="toggle-knob">
                {isDarkMode ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            </button>
          </div>

          <div className="p-8 text-center neumorphic-inset m-4">
            <div className="mx-auto mb-4 h-14 w-14 neumorphic-circle flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-8 w-8" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l9-4 9 4-9 4-9-4Z" />
                <path d="M7 10.5v4.5c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" />
              </svg>
            </div>

            <h1 className="font-serif text-3xl font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              Holy Cross <span style={{ color: 'var(--accent)' }}>College</span>
            </h1>
            <p className="text-xs uppercase tracking-widest mt-2" style={{ color: 'var(--text-secondary)' }}>Unified Login</p>
          </div>

          <div className="px-6 pb-6">
            {(status || error) && (
              <div className="neumorphic-inset px-3 py-2 text-sm mb-4 text-rose-600 dark:text-rose-400">
                {error || status}
              </div>
            )}

            <form onSubmit={submit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }} htmlFor="identifier">
                  Code or Email
                </label>
                <input
                  className="neumorphic-input w-full"
                  type="text"
                  id="identifier"
                  name="identifier"
                  placeholder="Admin, student, teacher, or employee code/email"
                  required
                  autoComplete="username"
                  value={data.identifier}
                  onChange={(e) => setData('identifier', e.target.value)}
                />
                {errors.identifier && <div className="text-red-600 text-xs mt-1">{errors.identifier}</div>}
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Use one login for admin, student, teacher, and employee accounts.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }} htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="neumorphic-input w-full pr-12"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full neumorphic-btn flex items-center justify-center"
                    style={{ color: 'var(--accent)' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.964 9.964 0 012.042-3.368m2.187-1.873A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.052 10.052 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 9L3 3" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <div className="text-red-600 text-xs mt-1">{errors.password}</div>}
              </div>

              <button
                className="w-full neumorphic-btn py-3 font-semibold text-white"
                style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-dark))' }}
                type="submit"
                disabled={processing}
              >
                {processing ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="px-6 pb-6 text-center">
            <a href="mailto:ict@holycross.edu.ph" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Forgot Password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
