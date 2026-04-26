import React, { useState } from 'react';

const teamMembers = [
    {
        name: 'Don',
        tagline: 'Focus, Learn, Grow',
        img: '/assets/team/member1.jpg',
        socials: {
            facebook: 'https://www.facebook.com/don.galo.agus.2024',
            instagram: 'https://www.instagram.com/donlicioso/',
            gmail: '#',
        },
    },
    {
        name: 'Jael',
        tagline: 'Create, Innovate, Elevate',
        img: '/assets/team/member2.png',
        socials: {
            facebook: 'https://www.facebook.com/jayl.millanes',
            instagram: 'https://www.instagram.com/asianboi.jael/',
            gmail: '#',
        },
    },
    {
        name: 'Kenneth',
        tagline: 'Think. Build. Succeed',
        img: '/assets/team/member3.png',
        socials: {
            facebook: 'https://www.facebook.com/kenneth.francisco.908132',
            instagram: 'https://www.instagram.com/ken_frncsc/',
            gmail: '#',
        },
    },
    {
        name: 'Mike',
        tagline: 'Design, Code, Deliver',
        img: '/assets/team/member4.png',
        socials: {
            facebook: 'https://www.facebook.com/mikeangelo.nazareno.3',
            instagram: 'https://www.instagram.com/halimaw.maglambing/',
            gmail: '#',
        },
    },
];

function Avatar({ member }) {
    const [hasImageError, setHasImageError] = useState(false);
    const initials = member.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="relative flex flex-col items-center text-center">
            <div className="absolute top-3 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(255,82,82,0.85)_0%,_rgba(255,133,27,0.72)_45%,_rgba(255,197,94,0.52)_70%,_rgba(255,255,255,0)_100%)] blur-sm" />
            <div className="relative z-10 flex h-[138px] w-[138px] items-center justify-center rounded-full border-[6px] border-white bg-white shadow-[0_20px_40px_rgba(244,149,28,0.28)]">
                {hasImageError ? (
                    <div className="flex h-[122px] w-[122px] items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-600">
                        {initials}
                    </div>
                ) : (
                    <img
                        src={member.img}
                        alt={member.name}
                        className="h-[122px] w-[122px] rounded-full object-cover"
                        onError={() => setHasImageError(true)}
                    />
                )}
            </div>
            <h3 className="mt-7 text-[18px] font-bold text-slate-800">{member.name}</h3>
            <p className="mt-1 text-[14px] text-slate-500">{member.tagline}</p>
            <div className="mt-4 flex items-center justify-center gap-3">
                <SocialIcon href={member.socials.facebook} label={`${member.name} Facebook`} variant="facebook" />
                <SocialIcon href={member.socials.instagram} label={`${member.name} Instagram`} variant="instagram" />
                <SocialIcon href={member.socials.gmail} label={`${member.name} Gmail`} variant="gmail" />
            </div>
        </div>
    );
}

function SocialIcon({ href, label, variant }) {
    const styles = {
        facebook: 'bg-[#1877F2]',
        instagram: 'bg-[radial-gradient(circle_at_30%_107%,_#fdf497_0%,_#fdf497_5%,_#fd5949_45%,_#d6249f_60%,_#285AEB_90%)]',
        gmail: 'bg-white',
    };

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-transform duration-200 hover:scale-105 ${styles[variant]}`}
        >
            {variant === 'facebook' && (
                <svg className="h-5 w-5" fill="white" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V5.1c-.2 0-.9-.1-1.8-.1-2.6 0-4.2 1.6-4.2 4.4V11H7v3h3v7h3.5Z" />
                </svg>
            )}
            {variant === 'instagram' && (
                <svg className="h-5 w-5" fill="white" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3Zm0 1.8A3 3 0 0 0 4.8 7.8v8.4a3 3 0 0 0 3 3h8.4a3 3 0 0 0 3-3V7.8a3 3 0 0 0-3-3H7.8Zm8.9 1.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 1.8A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3Z" />
                </svg>
            )}
            {variant === 'gmail' && (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M3.2 6.7 12 13.3l8.8-6.6A2.2 2.2 0 0 0 18.9 5H5.1A2.2 2.2 0 0 0 3.2 6.7Z" />
                    <path fill="#34A853" d="M20.8 6.7 12 13.3v5.9h6.9a2 2 0 0 0 1.9-2V6.7Z" />
                    <path fill="#4285F4" d="M3.2 6.7v10.5a2 2 0 0 0 1.9 2H12v-5.9L3.2 6.7Z" />
                    <path fill="#FBBC04" d="M20.8 6.7v.3L12 13.6 3.2 7v-.3L12 13.3l8.8-6.6Z" />
                </svg>
            )}
        </a>
    );
}

export default function SecretTeamCard() {
    return (
        <div className="w-[min(92vw,980px)] overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#4f63d8_0%,#4b7ae0_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="px-6 py-5 text-center text-white sm:px-10 sm:py-6">
                <h2 className="text-3xl font-bold sm:text-[38px]">Meet The Super Team</h2>
            </div>

            <div className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(231,239,255,0.98)_65%,_rgba(223,234,255,1)_100%)] px-6 py-8 sm:px-10 sm:py-10">
                <p className="text-center text-[22px] font-bold text-slate-800">Full Stack Developers</p>

                <div className="mt-8 grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
                    {teamMembers.map((member) => (
                        <Avatar key={member.name} member={member} />
                    ))}
                </div>

                <div className="mx-auto mt-10 max-w-3xl text-center text-[18px] leading-10 text-slate-600 sm:text-[19px]">
                    We&apos;re Don, Jael, Kenneth, and Mike, full stack developers with a passion for
                    building seamless, scalable, and reliable web applications. With expertise in both front-end and
                    back-end development, we focus on solving complex problems and turning ideas into effective digital
                    solutions.
                </div>
            </div>
        </div>
    );
}
