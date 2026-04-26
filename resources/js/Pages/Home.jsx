import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import HomeDesignGenerated from './HomeDesignGenerated';
import SecretTeamCard from '@/Components/SecretTeamCard';
import '../../css/homepage-design.css';

export default function Home({ stats = [], headerLinks = [] }) {
    const [showSecretTeamCard, setShowSecretTeamCard] = useState(false);
    const secretSequence = useRef(['h', 'e', 's', 'o', 'y', 'a', 'm']);
    const typedSequence = useRef([]);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/assets/audio/pota-pota-dance.mp3');
            audioRef.current.loop = true;
        }
        const audio = audioRef.current;
        if (showSecretTeamCard) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
        return () => {
            audio.pause();
        };
    }, [showSecretTeamCard]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            if (event.key === 'Escape') {
                setShowSecretTeamCard(false);
                typedSequence.current = [];
                return;
            }

            const key = event.key.length === 1 ? event.key.toLowerCase() : '';

            if (!key) {
                return;
            }

            typedSequence.current.push(key);

            if (typedSequence.current.length > secretSequence.current.length) {
                typedSequence.current.shift();
            }

            if (typedSequence.current.join('') === secretSequence.current.join('')) {
                setShowSecretTeamCard(true);
                typedSequence.current = [];
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    // Mobile easter egg — 5 quick taps on the brand "MCH-PEMS" reveals the secret card.
    useEffect(() => {
        const TAP_WINDOW_MS = 700;
        const TAPS_REQUIRED = 5;
        let taps = 0;
        let lastTap = 0;

        const isBrandTarget = (target) => {
            let el = target;
            for (let depth = 0; el && depth < 4; depth++) {
                const text = (el.textContent ?? '').trim();
                if (text === 'MCH-PEMS') {
                    return true;
                }
                el = el.parentElement;
            }
            return false;
        };

        const handleTap = (event) => {
            if (!isBrandTarget(event.target)) return;

            const now = Date.now();
            taps = now - lastTap > TAP_WINDOW_MS ? 1 : taps + 1;
            lastTap = now;

            if (taps >= TAPS_REQUIRED) {
                taps = 0;
                setShowSecretTeamCard(true);
            }
        };

        document.addEventListener('click', handleTap, true);
        return () => document.removeEventListener('click', handleTap, true);
    }, []);

    return (
        <>
            <Head title="Holy Cross College - Evaluation System" />
            {showSecretTeamCard && (
                <div
                    className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowSecretTeamCard(false)}
                >
                    <div className="flex min-h-full items-start justify-center px-4 py-8 sm:items-center sm:py-12">
                        <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-[980px]">
                            <SecretTeamCard />
                        </div>
                    </div>
                </div>
            )}
            <HomeDesignGenerated
                loginUrl={route('login')}
                loginSubmitUrl={route('login.submit')}
                registerUrl={route('register')}
                stats={stats}
                headerLinks={headerLinks}
            />
        </>
    );
}
