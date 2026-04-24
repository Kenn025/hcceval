import { Head, useForm } from '@inertiajs/react';

export default function ClientForgotPassword({ status, error }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (e) => {
        e.preventDefault();
        post(route('portal.password.email'));
    };

    return (
        <>
            <Head title="Forgot Password" />
            <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0b1729' }}>
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
                    <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Enter your email and we'll send you a reset link.
                    </p>

                    {status && (
                        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</div>
                    )}
                    {error && (
                        <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
                    )}

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Email address</label>
                            <input
                                type="email"
                                required
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="you@example.com"
                            />
                            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {processing ? 'Sending…' : 'Send reset link'}
                        </button>
                        <a href={route('portal.login')} className="block text-center text-sm text-slate-500 hover:text-slate-700">
                            Back to login
                        </a>
                    </form>
                </div>
            </div>
        </>
    );
}
