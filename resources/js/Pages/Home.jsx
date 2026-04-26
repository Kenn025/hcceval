import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import HomeDesignGenerated from './HomeDesignGenerated';
import SecretTeamCard from '@/Components/SecretTeamCard';
import '../../css/homepage-design.css';

export default function Home({ stats = [] }) {
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

    return (
        <>
            <Head title="Holy Cross College - Evaluation System" />
            {showSecretTeamCard && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowSecretTeamCard(false)}
                >
                    <div onClick={(event) => event.stopPropagation()} className="relative">
                        <SecretTeamCard />
                    </div>
                </div>
            )}
            <HomeDesignGenerated
                loginUrl={route('login')}
                loginSubmitUrl={route('login.submit')}
                registerUrl={route('register')}
                stats={stats}
            />
        </>
    );
}
