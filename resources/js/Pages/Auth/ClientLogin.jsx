import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function ClientLogin({ status, error }) {
  const { data, setData, post, processing, errors } = useForm({
    identifier: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    post(route('portal.login.submit'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a2718] via-[#0f3d24] to-[#145530] p-4">
      <Head title="Holy Cross College - Portal Login" />

      <div className="relative z-10 bg-white/95 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0f3d24] to-[#1e6e40] px-10 py-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l9-4 9 4-9 4-9-4Z" />
                <path d="M7 10.5v4.5c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" />
              </svg>
            </div>
          </div>
          <h1 className="font-serif text-2xl font-light text-white tracking-wide mb-1">
            Holy Cross <span className="italic text-[#a8e0bc]">College</span>
          </h1>
          <p className="text-xs uppercase tracking-wider text-[#a8e0bc99] mt-1">Student &amp; Faculty Portal</p>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#6ec98f] to-transparent mx-auto mt-3" />
        </div>

        {/* Body */}
        <div className="p-8">
          {(status || error) && (
            <div className="bg-[#e05c5c14] border border-[#e05c5c40] rounded px-3 py-2 text-sm text-[#e05c5c] flex items-center gap-2 mb-4">
              <span className="inline-block w-2 h-2 rounded-full bg-[#e05c5c] shrink-0" />
              {error || status}
            </div>
          )}

          <form onSubmit={submit} autoComplete="off">
            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wider text-[#2a5a38] mb-1" htmlFor="identifier">
                Student No. / Employee No. / Email
              </label>
              <input
                className="w-full bg-[#eef8f2] border border-[#c8e8d4] rounded px-4 py-3 text-base text-[#0d2a18] focus:bg-white focus:border-[#3d9a60] focus:outline-none focus:ring-2 focus:ring-[#3d9a60]/20 transition placeholder:text-[#6aaa84]"
                type="text"
                id="identifier"
                name="identifier"
                placeholder="Enter your ID or email"
                required
                autoComplete="username"
                value={data.identifier}
                onChange={e => setData('identifier', e.target.value)}
              />
              {errors.identifier && <div className="text-red-600 text-xs mt-1">{errors.identifier}</div>}
            </div>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wider text-[#2a5a38] mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full bg-[#eef8f2] border border-[#c8e8d4] rounded px-4 py-3 text-base text-[#0d2a18] focus:bg-white focus:border-[#3d9a60] focus:outline-none focus:ring-2 focus:ring-[#3d9a60]/20 transition placeholder:text-[#6aaa84] pr-12"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={data.password}
                  onChange={e => setData('password', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6aaa84] hover:text-[#1e6e40] focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width={20} height={20} stroke="currentColor" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 5.7A11.5 11.5 0 0 1 12 5.5c6.7 0 10.5 6.5 10.5 6.5a17.2 17.2 0 0 1-4.1 4.8" />
                      <path d="M6.7 6.7A17.7 17.7 0 0 0 1.5 12s3.8 6.5 10.5 6.5c1.7 0 3.2-.4 4.5-1" />
                      <path d="M9.9 9.9A3.2 3.2 0 0 0 9 12a3 3 0 0 0 3 3c.8 0 1.5-.3 2.1-.9" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width={20} height={20} stroke="currentColor" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1.5 12s3.8-6.5 10.5-6.5S22.5 12 22.5 12s-3.8 6.5-10.5 6.5S1.5 12 1.5 12Z" />
                      <circle cx="12" cy="12" r="3.25" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <div className="text-red-600 text-xs mt-1">{errors.password}</div>}
            </div>

            <button
              className="w-full bg-gradient-to-br from-[#3d9a60] to-[#1e6e40] text-white rounded px-4 py-3 font-semibold mt-4 shadow-lg hover:from-[#1e6e40] hover:to-[#3d9a60] transition disabled:opacity-60"
              type="submit"
              disabled={processing}
            >
              {processing ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center px-8 py-5 border-t border-[#c8e8d4]">
          <a href="mailto:ict@holycross.edu.ph" className="text-[#6aaa84] text-sm hover:text-[#1e6e40] transition">
            Forgot Password?
          </a>
        </div>
      </div>
    </div>
  );
}
