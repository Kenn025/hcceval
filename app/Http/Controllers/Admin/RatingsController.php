<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RatingsController extends Controller
{
    private function schoolYears(): array
    {
        return DB::table('academic_year')
            ->select(DB::raw("CONCAT(from_year, '-', to_year) as label"), 'id')
            ->orderByDesc('from_year')
            ->get()
            ->pluck('label')
            ->toArray();
    }

    public function subjectRatings(Request $request)
    {
        $ratings = $this->subjectQuery($request)
            ->orderByDesc('rs.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'subject',
            'filters'    => ['search' => $request->input('search', ''), 'school_year' => $request->input('school_year', '')],
            'schoolYears' => $this->schoolYears(),
        ]);
    }

    public function peerRatings(Request $request)
    {
        $ratings = $this->peerQuery($request)
            ->orderByDesc('rp.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'peer',
            'filters'    => ['search' => $request->input('search', ''), 'school_year' => $request->input('school_year', '')],
            'schoolYears' => $this->schoolYears(),
        ]);
    }

    public function employeeRatings(Request $request)
    {
        $ratings = $this->employeeQuery($request)
            ->orderByDesc('re.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'employee',
            'filters'    => ['search' => $request->input('search', ''), 'school_year' => $request->input('school_year', '')],
            'schoolYears' => $this->schoolYears(),
        ]);
    }

    public function subjectArchives(Request $request)
    {
        $request->merge(['archived' => true]);
        return $this->subjectRatings($request);
    }

    public function peerArchives(Request $request)
    {
        $request->merge(['archived' => true]);
        return $this->peerRatings($request);
    }

    public function employeeArchives(Request $request)
    {
        $request->merge(['archived' => true]);
        return $this->employeeRatings($request);
    }

    public function headRatings(Request $request)
    {
        $ratings = $this->headQuery($request)
            ->orderByDesc('rh.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'head',
            'filters'    => ['search' => $request->input('search', ''), 'school_year' => $request->input('school_year', '')],
            'schoolYears' => $this->schoolYears(),
        ]);
    }

    public function branchRatings(Request $request)
    {
        $ratings = $this->branchQuery($request)
            ->orderByDesc('rb.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'branch',
            'filters'    => ['search' => $request->input('search', ''), 'school_year' => $request->input('school_year', '')],
            'schoolYears' => $this->schoolYears(),
        ]);
    }

    public function exportHead(Request $request): StreamedResponse
    {
        $rows = $this->headQuery($request)->orderByDesc('rh.id')->get();
        return $this->streamCsv('head-ratings', ['#', 'Evaluatee', 'Rating', 'School Year'], $rows, fn ($r) => [
            $r->rating_id, $r->teacher_name,
            $r->overall_rating ? number_format((float) $r->overall_rating, 2) : '',
            $r->school_year,
        ]);
    }

    public function exportBranch(Request $request): StreamedResponse
    {
        $rows = $this->branchQuery($request)->orderByDesc('rb.id')->get();
        return $this->streamCsv('branch-ratings', ['#', 'Branch', 'Rating', 'Submissions', 'School Year'], $rows, fn ($r) => [
            $r->rating_id, $r->branch_name,
            $r->overall_rating ? number_format((float) $r->overall_rating, 2) : '',
            $r->submission_count ?? 0,
            $r->school_year,
        ]);
    }

    private function headQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();

        return DB::table('ratings_head as rh')
            ->leftJoin('employee as e', 'rh.employee_id', '=', 'e.id')
            ->leftJoin('academic_year as ay', 'rh.academic_year_id', '=', 'ay.id')
            ->select(
                'rh.id as rating_id',
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as teacher_name"),
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(rh.overall_ratings, '$.average')) as overall_rating"),
                'rh.submission_count',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('e.firstname', 'like', "%{$search}%")
                    ->orWhere('e.lastname', 'like', "%{$search}%");
            }))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    private function branchQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();

        return DB::table('ratings_branch as rb')
            ->leftJoin('branch as b', 'rb.branch_id', '=', 'b.id')
            ->leftJoin('academic_year as ay', 'rb.academic_year_id', '=', 'ay.id')
            ->select(
                'rb.id as rating_id',
                'b.name as branch_name',
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(rb.overall_ratings, '$.average')) as overall_rating"),
                'rb.submission_count',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('rb.branch_id', $branchId))
            ->when($search, fn ($q) => $q->where('b.name', 'like', "%{$search}%"))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    public function exportSubject(Request $request): StreamedResponse
    {
        $rows = $this->subjectQuery($request)->orderByDesc('rs.id')->get();
        return $this->streamCsv('subject-ratings', [
            '#', 'Teacher', 'Subject', 'Rating', 'School Year', 'Semester',
        ], $rows, fn ($r) => [
            $r->rating_id, $r->teacher_name, $r->subject_name,
            $r->overall_rating ? number_format((float) $r->overall_rating, 2) : '',
            $r->school_year, $r->semester,
        ]);
    }

    public function exportPeer(Request $request): StreamedResponse
    {
        $rows = $this->peerQuery($request)->orderByDesc('rp.id')->get();
        return $this->streamCsv('peer-ratings', [
            '#', 'Rater', 'Ratee', 'Rating', 'School Year',
        ], $rows, fn ($r) => [
            $r->rating_id, $r->rater_name, $r->ratee_name,
            $r->overall_rating ? number_format((float) $r->overall_rating, 2) : '',
            $r->school_year,
        ]);
    }

    public function exportEmployee(Request $request): StreamedResponse
    {
        $rows = $this->employeeQuery($request)->orderByDesc('re.id')->get();
        return $this->streamCsv('employee-ratings', [
            '#', 'Employee', 'Rating', 'School Year',
        ], $rows, fn ($r) => [
            $r->rating_id, $r->teacher_name,
            $r->overall_rating ? number_format((float) $r->overall_rating, 2) : '',
            $r->school_year,
        ]);
    }

    public function summaryReport(Request $request)
    {
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();

        $subject = DB::table('ratings_subject as rs')
            ->leftJoin('teacher as t', 'rs.teacher_id', '=', 't.id')
            ->leftJoin('academic_year as ay', 'rs.academic_year_id', '=', 'ay.id')
            ->select(
                DB::raw("CONCAT(t.firstname, ' ', t.lastname) as teacher_name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as avg_rating"),
                DB::raw('COUNT(rs.id) as count'),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('t.branch_id', $branchId))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->groupBy('t.id', 't.firstname', 't.lastname', 'ay.from_year', 'ay.to_year')
            ->orderByDesc('avg_rating')
            ->get();

        $peer = DB::table('ratings_peer as rp')
            ->leftJoin('teacher as t', 'rp.teacher_id', '=', 't.id')
            ->leftJoin('academic_year as ay', 'rp.academic_year_id', '=', 'ay.id')
            ->select(
                DB::raw("CONCAT(t.firstname, ' ', t.lastname) as teacher_name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rp.overall_ratings, '$.average'))) as avg_rating"),
                DB::raw('COUNT(rp.id) as count')
            )
            ->when($branchId, fn ($q) => $q->where('t.branch_id', $branchId))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->groupBy('t.id', 't.firstname', 't.lastname')
            ->orderByDesc('avg_rating')
            ->get();

        $employee = DB::table('ratings_employee as re')
            ->leftJoin('employee as e', 're.employee_id', '=', 'e.id')
            ->leftJoin('academic_year as ay', 're.academic_year_id', '=', 'ay.id')
            ->select(
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as employee_name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(re.overall_ratings, '$.average'))) as avg_rating"),
                DB::raw('COUNT(re.id) as count')
            )
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->groupBy('e.id', 'e.firstname', 'e.lastname')
            ->orderByDesc('avg_rating')
            ->get();

        return view('reports.summary', [
            'schoolYear' => $schoolYear ?: 'All School Years',
            'subjects'   => $subject,
            'peers'      => $peer,
            'employees'  => $employee,
            'generated'  => now()->format('F j, Y g:i A'),
        ]);
    }

    public function archive(Request $request, string $type, int $id): RedirectResponse
    {
        [$table] = $this->tableFor($type);
        DB::table($table)->where('id', $id)->update([
            'is_archived' => 1,
            'archived_at' => now(),
            'updated_at'  => now(),
        ]);
        return back()->with('success', 'Rating archived.');
    }

    public function restore(Request $request, string $type, int $id): RedirectResponse
    {
        [$table] = $this->tableFor($type);
        DB::table($table)->where('id', $id)->update([
            'is_archived' => 0,
            'archived_at' => null,
            'updated_at'  => now(),
        ]);
        return back()->with('success', 'Rating restored.');
    }

    private function tableFor(string $type): array
    {
        $map = [
            'subject'  => 'ratings_subject',
            'peer'     => 'ratings_peer',
            'employee' => 'ratings_employee',
            'head'     => 'ratings_head',
            'branch'   => 'ratings_branch',
        ];
        abort_unless(isset($map[$type]), 404);
        return [$map[$type]];
    }

    private function subjectQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();
        $archived   = $request->boolean('archived');

        return DB::table('ratings_subject as rs')
            ->leftJoin('teacher as t', 'rs.teacher_id', '=', 't.id')
            ->leftJoin('subject as s', 'rs.subject_id', '=', 's.id')
            ->leftJoin('academic_year as ay', 'rs.academic_year_id', '=', 'ay.id')
            ->select(
                'rs.id as rating_id',
                DB::raw("CONCAT(t.firstname, ' ', t.lastname) as teacher_name"),
                's.name as subject_name',
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average')) as overall_rating"),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester'
            )
            ->where('rs.is_archived', $archived ? 1 : 0)
            ->when($branchId, fn ($q) => $q->where('t.branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('t.firstname', 'like', "%{$search}%")
                    ->orWhere('t.lastname', 'like', "%{$search}%")
                    ->orWhere('s.name', 'like', "%{$search}%");
            }))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    private function peerQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();
        $archived   = $request->boolean('archived');

        return DB::table('ratings_peer as rp')
            ->where('rp.is_archived', $archived ? 1 : 0)
            ->leftJoin('teacher as t', 'rp.teacher_id', '=', 't.id')
            ->leftJoin('academic_year as ay', 'rp.academic_year_id', '=', 'ay.id')
            ->select(
                'rp.id as rating_id',
                DB::raw("CONCAT(t.firstname, ' ', t.lastname) as rater_name"),
                DB::raw("CONCAT(t.firstname, ' ', t.lastname) as ratee_name"),
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(rp.overall_ratings, '$.average')) as overall_rating"),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('t.branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('t.firstname', 'like', "%{$search}%")
                    ->orWhere('t.lastname', 'like', "%{$search}%");
            }))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    private function employeeQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();
        $archived   = $request->boolean('archived');

        return DB::table('ratings_employee as re')
            ->where('re.is_archived', $archived ? 1 : 0)
            ->leftJoin('employee as e', 're.employee_id', '=', 'e.id')
            ->leftJoin('academic_year as ay', 're.academic_year_id', '=', 'ay.id')
            ->select(
                're.id as rating_id',
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as teacher_name"),
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(re.overall_ratings, '$.average')) as overall_rating"),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('e.firstname', 'like', "%{$search}%")
                    ->orWhere('e.lastname', 'like', "%{$search}%");
            }))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    private function streamCsv(string $basename, array $headers, iterable $rows, callable $map): StreamedResponse
    {
        $filename = $basename . '-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($headers, $rows, $map) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $headers);
            foreach ($rows as $row) {
                fputcsv($out, $map($row));
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
