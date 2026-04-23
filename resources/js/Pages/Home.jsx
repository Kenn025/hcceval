import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function Home() {
    return (
        <>
            <Head title="Holy Cross College — Academic Evaluation" />
            <div style={{fontFamily: 'DM Sans, sans-serif', background: 'var(--white)', color: 'var(--text-dark)', overflowX: 'hidden'}}>
                {/* HERO SECTION */}
                <div className="hero" style={{minHeight: '100vh', background: 'linear-gradient(160deg, #0a1f3c 0%, #0d2d5e 40%, #1a4a8a 75%, #1e6ab0 100%)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '2rem'}}>
                    {/* Decorative elements */}
                    <div className="ring" style={{position: 'absolute', borderRadius: '50%', border: '1px solid rgba(168, 200, 240, 0.08)', width: 400, height: 400, left: -100, bottom: -100}}></div>
                    <div className="ring" style={{position: 'absolute', borderRadius: '50%', border: '1px solid rgba(168, 200, 240, 0.08)', width: 600, height: 600, left: -200, bottom: -200}}></div>
                    <div className="ring" style={{position: 'absolute', borderRadius: '50%', border: '1px solid rgba(168, 200, 240, 0.08)', width: 800, height: 800, left: -300, bottom: -300}}></div>
                    <div className="hero-cross" style={{position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', width: 380, height: 380, opacity: 0.04}}>
                        <div style={{position: 'absolute', background: '#fff', borderRadius: 4, width: 60, height: '100%', left: '50%', transform: 'translateX(-50%)'}}></div>
                        <div style={{position: 'absolute', background: '#fff', borderRadius: 4, height: 60, width: '100%', top: '30%', transform: 'translateY(-50%)'}}></div>
                    </div>
                    <div className="hero-content" style={{position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 780}}>
                        <div className="badge" style={{display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(168,200,240,0.3)', borderRadius: 40, padding: '7px 20px', fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a8c8f0', marginBottom: '2rem', backdropFilter: 'blur(8px)'}}>
                            <span className="badge-dot" style={{width: 6, height: 6, borderRadius: '50%', background: '#c8a96e', display: 'inline-block', marginRight: 8}}></span>
                            Academic Year 2024 – 2025
                        </div>
                        <h1 style={{fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 300, lineHeight: 1.1, color: '#fff', marginBottom: '0.4rem', letterSpacing: '-0.01em'}}>
                            Holy Cross <span style={{fontStyle: 'italic', color: '#a8c8f0'}}>College</span>
                        </h1>
                        <div className="hero-sub" style={{fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1rem, 2vw, 1.4rem)', fontWeight: 300, color: 'rgba(168,200,240,0.7)', letterSpacing: '0.06em', marginBottom: '2.5rem'}}>
                            Institutional Evaluation Program
                        </div>
                        <div className="divider-gold" style={{width: 60, height: 1, background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)', margin: '0 auto 2.5rem'}}></div>
                        <p className="hero-desc" style={{fontSize: '1rem', fontWeight: 300, color: 'rgba(200,220,245,0.8)', lineHeight: 1.8, maxWidth: 560, margin: '0 auto 3rem'}}>
                            Your thoughtful assessment helps us shape a more excellent, faith-centered, and student-focused learning environment. Every response is valued and confidential.
                        </p>
                        <div className="hero-cta" style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                            <Link href={route('login')} className="btn-primary" style={{background: 'linear-gradient(135deg, #4a90d9, #1a4a8a)', color: '#fff', border: 'none', padding: '14px 36px', borderRadius: 4, fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem', fontWeight: 500, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 8px 30px rgba(26, 74, 138, 0.5)', display: 'flex', alignItems: 'center', gap: 8}}>Login</Link>
                        </div>
                    </div>
                    <div className="scroll-hint" style={{position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'rgba(168,200,240,0.4)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase'}}>
                        <span>Scroll</span>
                        <svg className="scroll-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width: 22, height: 22, color: 'rgba(168,200,240,0.78)', strokeWidth: 1.85}}>
                            <path d="M12 5v14"></path>
                            <path d="m19 12-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
                {/* STATS BAND */}
                <div className="stats-band" style={{background: '#eef5ff', borderTop: '1px solid #ddeeff', borderBottom: '1px solid #ddeeff', padding: '2.5rem 2rem', display: 'flex', justifyContent: 'center', gap: 0}}>
                    {[
                        {num: '4', label: 'Core Areas'},
                        {num: '5', label: 'Min. to Complete'},
                        {num: '100%', label: 'Confidential'},
                        {num: '∞', label: 'Impact'},
                    ].map((stat, i) => (
                        <div className="stat-item" key={stat.label} style={{flex: 1, maxWidth: 200, textAlign: 'center', padding: '0 2rem', borderRight: i < 3 ? '1px solid #ddeeff' : 'none'}}>
                            <div className="stat-num" style={{fontFamily: 'Cormorant Garamond, serif', fontSize: '2.6rem', fontWeight: 300, color: '#1a4a8a', lineHeight: 1}}>{stat.num}</div>
                            <div className="stat-label" style={{fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6a8aaa', marginTop: 6}}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
