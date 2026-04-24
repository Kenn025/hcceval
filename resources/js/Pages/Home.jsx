import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppIcon from '@/Components/AppIcon';

export default function Home() {
    return (
        <>
            <Head title="Holy Cross College — Evaluation System" />
            <div className="min-h-screen bg-[#f0f4f9] text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
                {/* FLOATING NAVBAR */}
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl">
                    <nav className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] rounded-[2rem] px-6 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-200">
                                H
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-black tracking-tight text-slate-800 uppercase">HCC-EVAL</p>
                                <p className="text-[10px] text-slate-400 font-medium">Evaluation System</p>
                            </div>
                        </div>

                        <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full">
                            {['Home', 'Features', 'Roles', 'How It Works', 'FAQ'].map((item) => (
                                <button key={item} className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors rounded-full hover:bg-white hover:shadow-sm">
                                    {item}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <Link href={route('login')} className="hidden sm:block px-6 py-2.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-all rounded-full hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100">
                                Sign In
                            </Link>
                            <Link href={route('login')} className="bg-blue-600 text-white px-8 py-3 rounded-full text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95 uppercase tracking-wider">
                                Get Started
                            </Link>
                        </div>
                    </nav>
                </div>

                {/* HERO / PROCESS SECTION */}
                <main className="pt-48 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
                    <div className="inline-flex items-center px-6 py-2 rounded-full bg-white border border-slate-100 shadow-sm text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-8">
                        The Process
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl font-black text-slate-800 tracking-tight mb-6">
                        How It <span className="text-blue-600">Works</span>
                    </h1>
                    
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mb-20 leading-relaxed">
                        Simple evaluation process in four steps designed for efficiency and total confidentiality.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                        {[
                            { step: '01', title: 'Register', desc: 'Secure login through your institutional account.', icon: 'students', color: 'text-rose-500', bg: 'bg-rose-50' },
                            { step: '02', title: 'Configure', desc: 'Set up evaluation parameters and criteria.', icon: 'dashboard', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                            { step: '03', title: 'Evaluate', desc: 'Complete forms with our intuitive interface.', icon: 'check-circle', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                            { step: '04', title: 'Analyze', desc: 'View comprehensive reports and insights.', icon: 'ratings', color: 'text-blue-500', bg: 'bg-blue-50' },
                        ].map((item, i) => (
                            <div key={item.step} className="group bg-white/70 backdrop-blur-md border border-white/50 rounded-[3rem] p-10 flex flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300">
                                <div className={`w-20 h-20 rounded-full ${item.bg} ${item.color} flex items-center justify-center shadow-inner mb-8 transition-transform group-hover:scale-110`}>
                                    <AppIcon name={item.icon} className="w-10 h-10" />
                                </div>
                                <span className={`text-2xl font-black ${item.color} mb-2`}>{item.step}</span>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </main>

                {/* STATS FLOATER */}
                <div className="pb-20 px-6 max-w-4xl mx-auto">
                    <div className="bg-slate-800 rounded-[3rem] p-12 text-white flex flex-wrap justify-center gap-12 shadow-2xl">
                        {[
                            { num: '4', label: 'Core Areas' },
                            { num: '5m', label: 'Completion Time' },
                            { num: '100%', label: 'Confidential' },
                            { num: '∞', label: 'Impact' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-4xl font-black mb-1">{stat.num}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FOOTER HINT */}
                <footer className="py-10 text-center flex flex-col items-center gap-4">
                     <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                        <AppIcon name="shield" className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">Secure & Encrypted</span>
                     </div>
                </footer>
            </div>
        </>
    );
}
