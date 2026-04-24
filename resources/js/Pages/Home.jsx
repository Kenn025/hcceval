import React from 'react';
import { Head } from '@inertiajs/react';
import HomeDesignGenerated from './HomeDesignGenerated';
import '../../css/homepage-design.css';

export default function Home() {
    return (
        <>
            <Head title="Holy Cross College - Evaluation System" />
            <HomeDesignGenerated loginUrl={route('login')} />
        </>
    );
}
