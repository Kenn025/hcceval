import { Head, useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';

export default function TwoFactorChallenge({ email }) {
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const submit = (e) => {
        e.preventDefault();
        post(route('two-factor.verify'));
    };

    const resend = () => router.post(route('two-factor.send'));

    return (
        <>
            <Head title="Two-Factor Verification" />
            <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0b1729' }}>
                <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
                    <h1 className="text-xl font-bold text-slate-900">Enter verification code</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        We sent a 6-digit code to <strong>{email || 'your email'}</strong>.
                    </p>

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                autoFocus
                                maxLength={6}
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.replace(/\D/g, ''))}
                                placeholder="••••••"
                                className="w-full rounded-lg border border-slate-200 px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:border-blue-500 focus:outline-none"
                            />
                            {errors.code && <p className="mt-1 text-xs text-rose-600">{errors.code}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={processing || data.code.length !== 6}
                            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {processing ? 'Verifying…' : 'Verify & sign in'}
                        </button>
                        <button
                            type="button"
                            onClick={resend}
                            className="block w-full text-center text-xs text-slate-500 hover:text-slate-700"
                        >
                            Didn't receive a code? Resend
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
