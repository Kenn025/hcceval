<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Evaluation Summary Report — {{ $schoolYear }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
        .header { border-bottom: 3px double #1e3a8a; padding-bottom: 12px; margin-bottom: 24px; }
        .header h1 { margin: 0 0 4px; color: #1e3a8a; font-size: 22px; }
        .header .meta { color: #64748b; font-size: 12px; }
        section { margin-bottom: 28px; page-break-inside: avoid; }
        section h2 { font-size: 15px; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f1f5f9; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .empty { color: #94a3b8; font-style: italic; font-size: 12px; }
        .actions { margin-bottom: 16px; }
        .actions button { background: #1e3a8a; color: #fff; border: 0; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
        @media print { .actions { display: none; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="actions">
        <button onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="header">
        <h1>Holy Cross College — Evaluation Summary Report</h1>
        <div class="meta">School Year: <strong>{{ $schoolYear }}</strong> &nbsp;·&nbsp; Generated: {{ $generated }}</div>
    </div>

    <section>
        <h2>Subject (Teacher–Subject) Ratings</h2>
        @if ($subjects->isEmpty())
            <p class="empty">No subject ratings available for this period.</p>
        @else
            <table>
                <thead>
                    <tr><th>#</th><th>Teacher</th><th>School Year</th><th class="num">Submissions</th><th class="num">Average</th></tr>
                </thead>
                <tbody>
                    @foreach ($subjects as $i => $r)
                        <tr>
                            <td>{{ $i + 1 }}</td>
                            <td>{{ $r->teacher_name ?: '—' }}</td>
                            <td>{{ $r->school_year ?: '—' }}</td>
                            <td class="num">{{ $r->count }}</td>
                            <td class="num">{{ number_format((float) $r->avg_rating, 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </section>

    <section>
        <h2>Peer Ratings</h2>
        @if ($peers->isEmpty())
            <p class="empty">No peer ratings available for this period.</p>
        @else
            <table>
                <thead>
                    <tr><th>#</th><th>Teacher</th><th class="num">Submissions</th><th class="num">Average</th></tr>
                </thead>
                <tbody>
                    @foreach ($peers as $i => $r)
                        <tr>
                            <td>{{ $i + 1 }}</td>
                            <td>{{ $r->teacher_name ?: '—' }}</td>
                            <td class="num">{{ $r->count }}</td>
                            <td class="num">{{ number_format((float) $r->avg_rating, 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </section>

    <section>
        <h2>Employee Ratings</h2>
        @if ($employees->isEmpty())
            <p class="empty">No employee ratings available for this period.</p>
        @else
            <table>
                <thead>
                    <tr><th>#</th><th>Employee</th><th class="num">Submissions</th><th class="num">Average</th></tr>
                </thead>
                <tbody>
                    @foreach ($employees as $i => $r)
                        <tr>
                            <td>{{ $i + 1 }}</td>
                            <td>{{ $r->employee_name ?: '—' }}</td>
                            <td class="num">{{ $r->count }}</td>
                            <td class="num">{{ number_format((float) $r->avg_rating, 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </section>
</body>
</html>
