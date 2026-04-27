<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <style>
            html,
            body {
                background-color: #e0e5ec;
            }

            html.hcceval-dark,
            body.hcceval-dark {
                background-color: #1a1a2e;
                color: #eaeaea;
            }
        </style>

        <script>
            (function () {
                try {
                    var isDark = localStorage.getItem('hcceval-theme-mode') === 'dark';
                    if (isDark) {
                        document.documentElement.classList.add('hcceval-dark');
                    } else {
                        document.documentElement.classList.remove('hcceval-dark');
                    }
                } catch (e) {
                    document.documentElement.classList.remove('hcceval-dark');
                }
            })();
        </script>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        <script>
            if (document.documentElement.classList.contains('hcceval-dark')) {
                document.body.classList.add('hcceval-dark');
            }
        </script>
        @inertia
    </body>
</html>
