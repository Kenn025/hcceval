<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();

        $ratings = DB::table('ratings_subject as rs')
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
            ->when($branchId, fn ($q) => $q->where('t.branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('t.firstname', 'like', "%{$search}%")
                    ->orWhere('t.lastname', 'like', "%{$search}%")
                    ->orWhere('s.name', 'like', "%{$search}%");
            }))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->orderByDesc('rs.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'subject',
            'filters'    => ['search' => $search, 'school_year' => $schoolYear],
            'schoolYears' => $this->schoolYears(),
        ]);
    }

    public function peerRatings(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();

        $ratings = DB::table('ratings_peer as rp')
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
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->orderByDesc('rp.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'peer',
            'filters'    => ['search' => $search, 'school_year' => $schoolYear],
            'schoolYears' => $this->schoolYears(),
        ]);
    }

    public function employeeRatings(Request $request)
    {
        $search   = $request->input('search', '');
        $branchId = $this->scopedBranchId();

        $ratings = DB::table('ratings_employee as re')
            ->leftJoin('employees as e', 're.employee_id', '=', 'e.id')
            ->leftJoin('academic_year as ay', 're.academic_year_id', '=', 'ay.id')
            ->select(
                're.id as rating_id',
                DB::raw("CONCAT(e.first_name, ' ', e.last_name) as teacher_name"),
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(re.overall_ratings, '$.average')) as overall_rating"),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('e.first_name', 'like', "%{$search}%")
                    ->orWhere('e.last_name', 'like', "%{$search}%");
            }))
            ->orderByDesc('re.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'employee',
            'filters'    => ['search' => $search, 'school_year' => ''],
            'schoolYears' => [],
        ]);
    }

    public function subjectArchives(Request $request)
    {
        return $this->subjectRatings($request);
    }

    public function peerArchives(Request $request)
    {
        return $this->peerRatings($request);
    }
}
