import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function CustomLogin({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Holy Cross College - Login" />
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-4">
                <div className="bg-white bg-opacity-95 rounded-xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-blue-900 mb-2">Holy Cross College</h1>
                        <div className="text-blue-700 mb-2">Login to your account</div>
                        <div className="w-12 h-1 bg-yellow-400 rounded mx-auto mb-2"></div>
                    </div>
                    {status && (
                        <div className="mb-4 text-sm font-medium text-green-600">{status}</div>
                    )}
                    <form onSubmit={submit} autoComplete="off">
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-semibold text-blue-900 mb-1">Email</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="w-full px-4 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoComplete="username"
                                onChange={e => setData('email', e.target.value)}
                                required
                            />
                            {errors.email && <div className="text-red-600 text-xs mt-1">{errors.email}</div>}
                        </div>
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-semibold text-blue-900 mb-1">Password</label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="w-full px-4 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoComplete="current-password"
                                onChange={e => setData('password', e.target.value)}
                                required
                            />
                            {errors.password && <div className="text-red-600 text-xs mt-1">{errors.password}</div>}
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={e => setData('remember', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-blue-900">Remember me</span>
                            </label>
                            {canResetPassword && (
                                <a href={route('password.request')} className="text-xs text-blue-700 hover:underline">Forgot your password?</a>
                            )}
                        </div>
                        <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg shadow transition" disabled={processing}>
                            Log in
                        </button>
                    </form>
                </div>
            </div>
        </GuestLayout>
    );
}
