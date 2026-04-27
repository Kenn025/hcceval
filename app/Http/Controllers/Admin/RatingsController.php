<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\EmployeeDepartment;
use App\Models\Program;
use App\Models\Strand;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

    private function activeAcademicYear(): ?object
    {
        return DB::table('academic_year')
            ->select('id', 'from_year', 'to_year', 'term')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->orderByDesc('id')
            ->first();
    }

    private function ratingsAcademicYearId(Request $request): ?int
    {
        $archiveAcademicYearId = $request->integer('archive_academic_year_id');

        if ($archiveAcademicYearId) {
            return $archiveAcademicYearId;
        }

        if (trim((string) $request->input('school_year', '')) !== '') {
            return null;
        }

        return $this->activeAcademicYear()?->id;
    }

    private function academicYearFromLabel(?string $label): ?object
    {
        $label = trim((string) $label);

        if ($label === '') {
            return $this->activeAcademicYear();
        }

        return DB::table('academic_year')
            ->select('id', 'from_year', 'to_year')
            ->whereRaw("CONCAT(from_year, '-', to_year) = ?", [$label])
            ->orderByDesc('is_activated')
            ->orderByDesc('id')
            ->first();
    }

    private function academicYearFromId(?int $id): ?object
    {
        if (! $id) {
            return $this->activeAcademicYear();
        }

        return DB::table('academic_year')
            ->select('id', 'from_year', 'to_year')
            ->where('id', $id)
            ->first();
    }

    private function peerQuestionnaireTypeId(): ?int
    {
        return $this->questionnaireTypeIdByCode('QTYPE-PEER');
    }

    private function questionnaireTypeIdByCode(string $code): ?int
    {
        if (! Schema::hasTable('questionnaire_type')) {
            return null;
        }

        $id = DB::table('questionnaire_type')
            ->where('code', $code)
            ->value('id');

        return $id ? (int) $id : null;
    }

    public function subjectRatings(Request $request)
    {
        $request->merge(['school_year' => '']);
        $subjectRatingContext = $this->subjectRatingContext($request);
        $request->merge([
            'branch_id' => $subjectRatingContext['selectedBranchId'],
            'department_id' => $subjectRatingContext['selectedDepartmentId'],
            'program_id' => $subjectRatingContext['selectedProgramId'],
            'strand_id' => $subjectRatingContext['selectedStrandId'],
        ]);
        $ratings = $this->subjectQuery($request)
            ->orderByDesc('rs.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'subject',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => '',
                'branch_id' => $subjectRatingContext['selectedBranchId'],
                'department_id' => $subjectRatingContext['selectedDepartmentId'],
                'program_id' => $subjectRatingContext['selectedProgramId'],
                'strand_id' => $subjectRatingContext['selectedStrandId'],
            ],
            'schoolYears' => $this->schoolYears(),
            'subjectRatingContext' => $subjectRatingContext,
        ]);
    }

    public function peerRatings(Request $request)
    {
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');
        $departmentGroup = $request->input('department_group', '');
        $programGroup = $request->input('program_group', '');
        $strandGroup = $request->input('strand_group', '');
        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        $ratings = $this->peerQuery($request)
            ->paginate($perPage)
            ->withQueryString();

        $ratings = $this->attachLatestPeerRatings(
            $ratings,
            $this->academicYearFromLabel($request->input('school_year')),
            $this->peerQuestionnaireTypeId(),
        );

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'peer',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => $request->input('school_year', ''),
                'branch_id' => $branchId,
                'department_group' => $departmentGroup,
                'program_group' => $programGroup,
                'strand_group' => $strandGroup,
                'per_page' => $perPage,
            ],
            'schoolYears' => $this->schoolYears(),
            'branches' => Branch::query()
                ->select('id', 'name', 'code')
                ->where('is_deleted', 0)
                ->where('code', '!=', 'OVERALL')
                ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
                ->orderBy('name')
                ->get(),
            'departments' => Department::query()
                ->select('id', 'name', 'code', 'branch_id', 'is_activated')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($query) => $query->where('branch_id', $scopedId))
                ->orderBy('name')
                ->get(),
            'programs' => Program::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($query) => $query->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'strands' => Strand::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($query) => $query->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
            'selectedBranchId' => $branchId ? (int) $branchId : null,
            'scopedBranchId' => $scopedId,
        ]);
    }

    public function employeeRatings(Request $request)
    {
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');
        $employeeDepartmentId = $request->input('employee_department_id', '');
        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        $ratings = $this->employeeQuery($request)
            ->orderByDesc('re.id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'employee',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => $request->input('school_year', ''),
                'branch_id' => $branchId,
                'employee_department_id' => $employeeDepartmentId,
                'per_page' => $perPage,
            ],
            'schoolYears' => $this->schoolYears(),
            'branches' => Branch::query()
                ->select('id', 'name', 'code')
                ->where('is_deleted', 0)
                ->where('code', '!=', 'OVERALL')
                ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
                ->orderBy('name')
                ->get(),
            'departments' => EmployeeDepartment::query()
                ->select('id', 'name', 'code', 'branch_id', 'is_activated')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($query) => $query->where('branch_id', $scopedId))
                ->orderBy('name')
                ->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
            'selectedBranchId' => $branchId ? (int) $branchId : null,
            'scopedBranchId' => $scopedId,
        ]);
    }

    public function subjectArchives(Request $request)
    {
        $archiveYearId = $request->integer('archive_year_id');
        $folders = $this->subjectArchiveFolders($request);

        if (! $archiveYearId) {
            return Inertia::render('Admin/Ratings', [
                'ratings'    => $this->paginateCollection(collect(), $request),
                'ratingType' => 'subject',
                'filters'    => [
                    'search' => $request->input('search', ''),
                    'school_year' => '',
                    'archive_year_id' => '',
                    'archive_mode' => true,
                ],
                'schoolYears' => $this->schoolYears(),
                'subjectRatingContext' => null,
                'subjectArchiveContext' => [
                    'folders' => $folders,
                    'selectedFolder' => null,
                ],
            ]);
        }

        $selectedFolder = collect($folders)->firstWhere('id', $archiveYearId);
        abort_unless($selectedFolder, 404);

        $request->merge([
            'school_year' => $selectedFolder['school_year'],
            'archive_academic_year_id' => $archiveYearId,
        ]);

        $subjectRatingContext = $this->subjectRatingContext($request);
        $request->merge([
            'branch_id' => $subjectRatingContext['selectedBranchId'],
            'department_id' => $subjectRatingContext['selectedDepartmentId'],
            'program_id' => $subjectRatingContext['selectedProgramId'],
            'strand_id' => $subjectRatingContext['selectedStrandId'],
        ]);
        $ratings = $this->subjectQuery($request)
            ->orderByDesc('rs.id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'subject',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => $selectedFolder['school_year'],
                'archive_year_id' => $archiveYearId,
                'archive_mode' => true,
                'branch_id' => $subjectRatingContext['selectedBranchId'],
                'department_id' => $subjectRatingContext['selectedDepartmentId'],
                'program_id' => $subjectRatingContext['selectedProgramId'],
                'strand_id' => $subjectRatingContext['selectedStrandId'],
            ],
            'schoolYears' => $this->schoolYears(),
            'subjectRatingContext' => $subjectRatingContext,
            'subjectArchiveContext' => [
                'folders' => $folders,
                'selectedFolder' => $selectedFolder,
            ],
        ]);
    }

    public function peerArchives(Request $request)
    {
        $archiveYearId = $request->integer('archive_year_id');
        $folders = $this->peerArchiveFolders($request);

        if (! $archiveYearId) {
            return Inertia::render('Admin/Ratings', [
                'ratings'    => $this->paginateCollection(collect(), $request, 15),
                'ratingType' => 'peer',
                'filters'    => [
                    'search' => $request->input('search', ''),
                    'school_year' => '',
                    'archive_year_id' => '',
                    'archive_mode' => true,
                ],
                'schoolYears' => $this->schoolYears(),
                'branches' => collect(),
                'departments' => collect(),
                'programs' => collect(),
                'strands' => collect(),
                'isBranchAdmin' => $this->isBranchAdmin(),
                'selectedBranchId' => null,
                'scopedBranchId' => $this->scopedBranchId(),
                'peerArchiveContext' => [
                    'folders' => $folders,
                    'selectedFolder' => null,
                ],
            ]);
        }

        $selectedFolder = collect($folders)->firstWhere('id', $archiveYearId);
        abort_unless($selectedFolder, 404);

        $request->merge([
            'school_year' => $selectedFolder['school_year'],
            'archive_academic_year_id' => $archiveYearId,
        ]);

        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');
        $departmentGroup = $request->input('department_group', '');
        $programGroup = $request->input('program_group', '');
        $strandGroup = $request->input('strand_group', '');
        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        $ratings = $this->peerArchiveRatings($request, $archiveYearId, $perPage);

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'peer',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => $selectedFolder['school_year'],
                'archive_year_id' => $archiveYearId,
                'archive_mode' => true,
                'branch_id' => $branchId,
                'department_group' => $departmentGroup,
                'program_group' => $programGroup,
                'strand_group' => $strandGroup,
                'per_page' => $perPage,
            ],
            'schoolYears' => $this->schoolYears(),
            'branches' => Branch::query()
                ->select('id', 'name', 'code')
                ->where('is_deleted', 0)
                ->where('code', '!=', 'OVERALL')
                ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
                ->orderBy('name')
                ->get(),
            'departments' => Department::query()
                ->select('id', 'name', 'code', 'branch_id', 'is_activated')
                ->where('is_deleted', 0)
                ->where('is_activated', 1)
                ->when($scopedId, fn ($query) => $query->where('branch_id', $scopedId))
                ->orderBy('name')
                ->get(),
            'programs' => Program::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($query) => $query->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'strands' => Strand::query()
                ->select('id', 'name', 'department_id')
                ->where('is_deleted', 0)
                ->when($scopedId, fn ($query) => $query->whereHas('department', fn ($department) => $department->where('branch_id', $scopedId)))
                ->orderBy('name')
                ->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
            'selectedBranchId' => $branchId ? (int) $branchId : null,
            'scopedBranchId' => $scopedId,
            'peerArchiveContext' => [
                'folders' => $folders,
                'selectedFolder' => $selectedFolder,
            ],
        ]);
    }

    public function headArchives(Request $request)
    {
        $archiveYearId = $request->integer('archive_year_id');
        $folders = $this->headArchiveFolders($request);

        if (! $archiveYearId) {
            return Inertia::render('Admin/Ratings', [
                'ratings'    => $this->paginateCollection(collect(), $request, 15),
                'ratingType' => 'head',
                'filters'    => [
                    'search' => $request->input('search', ''),
                    'school_year' => '',
                    'archive_year_id' => '',
                    'archive_mode' => true,
                ],
                'schoolYears' => $this->schoolYears(),
                'headArchiveContext' => [
                    'folders' => $folders,
                    'selectedFolder' => null,
                ],
            ]);
        }

        $selectedFolder = collect($folders)->firstWhere('id', $archiveYearId);
        abort_unless($selectedFolder, 404);

        $request->merge([
            'school_year' => $selectedFolder['school_year'],
            'archive_academic_year_id' => $archiveYearId,
        ]);

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $this->schoolHeadSubmissionRatings($request),
            'ratingType' => 'head',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => $selectedFolder['school_year'],
                'archive_year_id' => $archiveYearId,
                'archive_mode' => true,
            ],
            'schoolYears' => $this->schoolYears(),
            'headArchiveContext' => [
                'folders' => $folders,
                'selectedFolder' => $selectedFolder,
            ],
        ]);
    }

    public function employeeArchives(Request $request)
    {
        $archiveYearId = $request->integer('archive_year_id');
        $folders = $this->employeeArchiveFolders($request);

        if (! $archiveYearId) {
            return Inertia::render('Admin/Ratings', [
                'ratings'    => $this->paginateCollection(collect(), $request, 15),
                'ratingType' => 'employee',
                'filters'    => [
                    'search' => $request->input('search', ''),
                    'school_year' => '',
                    'archive_year_id' => '',
                    'archive_mode' => true,
                ],
                'schoolYears' => $this->schoolYears(),
                'employeeArchiveContext' => [
                    'folders' => $folders,
                    'selectedFolder' => null,
                ],
            ]);
        }

        $selectedFolder = collect($folders)->firstWhere('id', $archiveYearId);
        abort_unless($selectedFolder, 404);

        $request->merge([
            'school_year' => $selectedFolder['school_year'],
            'archive_academic_year_id' => $archiveYearId,
        ]);

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $this->employeeSubmissionRatings($request),
            'ratingType' => 'employee',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => $selectedFolder['school_year'],
                'archive_year_id' => $archiveYearId,
                'archive_mode' => true,
            ],
            'schoolYears' => $this->schoolYears(),
            'employeeArchiveContext' => [
                'folders' => $folders,
                'selectedFolder' => $selectedFolder,
            ],
        ]);
    }

    public function headRatings(Request $request)
    {
        $scopedId = $this->scopedBranchId();
        $branchId = $scopedId ?? $request->input('branch_id');
        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;
        $request->merge(['per_page' => $perPage]);

        $ratings = $this->schoolHeadSubmissionRatings($request);

        return Inertia::render('Admin/Ratings', [
            'ratings'    => $ratings,
            'ratingType' => 'head',
            'filters'    => [
                'search' => $request->input('search', ''),
                'school_year' => $request->input('school_year', ''),
                'branch_id' => $branchId,
                'per_page' => $perPage,
            ],
            'schoolYears' => $this->schoolYears(),
            'branches' => Branch::query()
                ->select('id', 'name', 'code')
                ->where('is_deleted', 0)
                ->where('code', '!=', 'OVERALL')
                ->when($scopedId, fn ($query) => $query->where('id', $scopedId))
                ->orderBy('name')
                ->get(),
            'isBranchAdmin' => $this->isBranchAdmin(),
            'selectedBranchId' => $branchId ? (int) $branchId : null,
            'scopedBranchId' => $scopedId,
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
        $rows = $this->schoolHeadSubmissionRatings($request, false);
        $this->recordExport($request, 'school-head-ratings', $rows->count());

        return $this->streamCsv('school-head-ratings', ['#', 'School Head', 'Rating', 'Responses', 'School Year'], $rows, fn ($r) => [
            $r->rating_id, $r->teacher_name,
            $r->overall_rating ? number_format((float) $r->overall_rating, 2) : '',
            $r->submission_count ?? 0,
            $r->school_year,
        ]);
    }

    public function exportBranch(Request $request): StreamedResponse
    {
        $rows = $this->branchQuery($request)->orderByDesc('rb.id')->get();
        $this->recordExport($request, 'branch-ratings', $rows->count());

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
        $academicYearId = $this->ratingsAcademicYearId($request);

        return DB::table('ratings_head as rh')
            ->leftJoin('employee as e', 'rh.employee_id', '=', 'e.id')
            ->leftJoin('academic_year as ay', 'rh.academic_year_id', '=', 'ay.id')
            ->select(
                'rh.id as rating_id',
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as teacher_name"),
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(rh.overall_ratings, '$.average')) as overall_rating"),
                'rh.submission_count',
                'rh.item_ratings',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->when($academicYearId, fn ($q) => $q->where('rh.academic_year_id', $academicYearId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('e.firstname', 'like', "%{$search}%")
                    ->orWhere('e.lastname', 'like', "%{$search}%");
            }))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    private function schoolHeadSubmissionRatings(Request $request, bool $paginate = true): LengthAwarePaginator|Collection
    {
        $search = trim((string) $request->input('search', ''));
        $schoolYear = trim((string) $request->input('school_year', ''));
        $archiveAcademicYearId = $request->integer('archive_academic_year_id');
        $academicYearId = $archiveAcademicYearId ?: $this->ratingsAcademicYearId($request);
        $branchId = $this->scopedBranchId() ?? $request->input('branch_id');
        $questionnaireTypeId = $this->questionnaireTypeIdByCode('QTYPE-HEAD');

        if (
            ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasColumn('evaluation_submissions', 'teacher_id')
            || ! Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id')
            || ! $questionnaireTypeId
        ) {
            $items = collect();
            return $paginate ? $this->paginateCollection($items, $request) : $items;
        }

        $rows = DB::table('evaluation_submissions as es')
            ->leftJoin('teacher as t', 'es.teacher_id', '=', 't.id')
            ->leftJoin('academic_year as ay', 'es.academic_year_id', '=', 'ay.id')
            ->select(
                'es.id',
                'es.teacher_id',
                'es.questionnaire_id',
                'es.answers',
                DB::raw("TRIM(CONCAT(t.firstname, ' ', COALESCE(t.middlename, ''), ' ', t.lastname)) as teacher_name"),
                DB::raw("COALESCE(t.role, 'School Head') as teacher_role"),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester'
            )
            ->where('es.questionnaire_type_id', $questionnaireTypeId)
            ->when($academicYearId, fn ($query) => $query->where('es.academic_year_id', $academicYearId))
            ->when($branchId, fn ($query) => $query->where('t.branch_id', $branchId))
            ->when($schoolYear, fn ($query) => $query->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->when($search, fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('t.firstname', 'like', "%{$search}%")
                    ->orWhere('t.lastname', 'like', "%{$search}%")
                    ->orWhere('t.role', 'like', "%{$search}%");
            }))
            ->orderByDesc('es.id')
            ->get();

        $questionnaireDetails = $this->peerQuestionnaireDetails(
            $rows->pluck('questionnaire_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all()
        );

        $items = $rows
            ->groupBy(fn (object $row) => ((int) $row->teacher_id) . ':' . ((int) $row->questionnaire_id) . ':' . ($row->school_year ?? ''))
            ->map(function (Collection $rows) use ($questionnaireDetails) {
                $first = $rows->first();
                $questionBuckets = [];

                $rows->each(function (object $row) use (&$questionBuckets) {
                    $answers = json_decode((string) ($row->answers ?? '[]'), true);

                    if (! is_array($answers)) {
                        return;
                    }

                    foreach ($answers as $answer) {
                        $questionId = (int) ($answer['question_id'] ?? 0);
                        $rating = $answer['rating'] ?? null;

                        if (! $questionId || ! is_numeric($rating)) {
                            continue;
                        }

                        $questionBuckets[$questionId] ??= [];
                        $questionBuckets[$questionId][] = (float) $rating;
                    }
                });

                $questionRatings = collect($questionBuckets)
                    ->mapWithKeys(fn (array $values, int $questionId) => [
                        (string) $questionId => [
                            'average' => count($values) ? round(array_sum($values) / count($values), 2) : null,
                            'count' => count($values),
                        ],
                    ])
                    ->all();
                $averages = collect($questionRatings)->pluck('average')->filter(fn ($value) => $value !== null);
                $questionnaireId = $first->questionnaire_id ? (int) $first->questionnaire_id : null;

                return (object) [
                    'rating_id' => $first->id,
                    'teacher_id' => $first->teacher_id,
                    'teacher_name' => $first->teacher_name ?: 'School Head',
                    'teacher_role' => $first->teacher_role ?: 'School Head',
                    'overall_rating' => $averages->isNotEmpty() ? round($averages->avg(), 2) : null,
                    'submission_count' => $rows->count(),
                    'school_year' => $first->school_year,
                    'semester' => $first->semester,
                    'questionnaire_id' => $questionnaireId,
                    'questionnaire' => $questionnaireId ? ($questionnaireDetails[$questionnaireId] ?? null) : null,
                    'question_ratings' => $questionRatings,
                ];
            })
            ->sortByDesc('rating_id')
            ->values();

        return $paginate ? $this->paginateCollection($items, $request) : $items;
    }

    private function employeeSubmissionRatings(Request $request, bool $paginate = true): LengthAwarePaginator|Collection
    {
        $search = trim((string) $request->input('search', ''));
        $schoolYear = trim((string) $request->input('school_year', ''));
        $archiveAcademicYearId = $request->integer('archive_academic_year_id');
        $academicYearId = $archiveAcademicYearId ?: $this->ratingsAcademicYearId($request);
        $branchId = $this->scopedBranchId();
        $questionnaireTypeId = $this->questionnaireTypeIdByCode('QTYPE-EMPLOYEE');

        if (
            ! Schema::hasTable('evaluation_submissions')
            || ! Schema::hasColumn('evaluation_submissions', 'employee_id')
            || ! Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id')
            || ! $questionnaireTypeId
        ) {
            $items = collect();
            return $paginate ? $this->paginateCollection($items, $request) : $items;
        }

        $rows = DB::table('evaluation_submissions as es')
            ->leftJoin('employee as e', 'es.employee_id', '=', 'e.id')
            ->leftJoin('employee_department as ed', 'e.employee_department_id', '=', 'ed.id')
            ->leftJoin('academic_year as ay', 'es.academic_year_id', '=', 'ay.id')
            ->select(
                'es.id',
                'es.employee_id',
                'es.questionnaire_id',
                'es.answers',
                DB::raw("TRIM(CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname)) as teacher_name"),
                DB::raw("COALESCE(e.role, 'Employee') as teacher_role"),
                'ed.name as department_name',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester'
            )
            ->where('es.questionnaire_type_id', $questionnaireTypeId)
            ->whereNotNull('es.employee_id')
            ->when($academicYearId, fn ($query) => $query->where('es.academic_year_id', $academicYearId))
            ->when($branchId, fn ($query) => $query->where('e.branch_id', $branchId))
            ->when($schoolYear, fn ($query) => $query->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->when($search, fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('e.firstname', 'like', "%{$search}%")
                    ->orWhere('e.lastname', 'like', "%{$search}%")
                    ->orWhere('e.role', 'like', "%{$search}%")
                    ->orWhere('ed.name', 'like', "%{$search}%");
            }))
            ->orderByDesc('es.id')
            ->get();

        $questionnaireDetails = $this->peerQuestionnaireDetails(
            $rows->pluck('questionnaire_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all()
        );

        $items = $rows
            ->groupBy(fn (object $row) => ((int) $row->employee_id) . ':' . ((int) $row->questionnaire_id) . ':' . ($row->school_year ?? ''))
            ->map(function (Collection $rows) use ($questionnaireDetails) {
                $first = $rows->first();
                $questionBuckets = [];

                $rows->each(function (object $row) use (&$questionBuckets) {
                    $answers = json_decode((string) ($row->answers ?? '[]'), true);

                    if (! is_array($answers)) {
                        return;
                    }

                    foreach ($answers as $answer) {
                        $questionId = (int) ($answer['question_id'] ?? 0);
                        $rating = $answer['rating'] ?? null;

                        if (! $questionId || ! is_numeric($rating)) {
                            continue;
                        }

                        $questionBuckets[$questionId] ??= [];
                        $questionBuckets[$questionId][] = (float) $rating;
                    }
                });

                $questionRatings = collect($questionBuckets)
                    ->mapWithKeys(fn (array $values, int $questionId) => [
                        (string) $questionId => [
                            'average' => count($values) ? round(array_sum($values) / count($values), 2) : null,
                            'count' => count($values),
                        ],
                    ])
                    ->all();
                $averages = collect($questionRatings)->pluck('average')->filter(fn ($value) => $value !== null);
                $questionnaireId = $first->questionnaire_id ? (int) $first->questionnaire_id : null;

                return (object) [
                    'rating_id' => $first->id,
                    'employee_id' => $first->employee_id,
                    'teacher_name' => $first->teacher_name ?: 'Employee',
                    'teacher_role' => $first->teacher_role ?: 'Employee',
                    'department_name' => $first->department_name,
                    'overall_rating' => $averages->isNotEmpty() ? round($averages->avg(), 2) : null,
                    'submission_count' => $rows->count(),
                    'school_year' => $first->school_year,
                    'semester' => $first->semester,
                    'questionnaire_id' => $questionnaireId,
                    'questionnaire' => $questionnaireId ? ($questionnaireDetails[$questionnaireId] ?? null) : null,
                    'question_ratings' => $questionRatings,
                ];
            })
            ->sortByDesc('rating_id')
            ->values();

        return $paginate ? $this->paginateCollection($items, $request) : $items;
    }

    private function paginateCollection(Collection $items, Request $request, int $defaultPerPage = 20): LengthAwarePaginator
    {
        $perPage = $request->integer('per_page', $defaultPerPage);
        $perPage = in_array($perPage, [10, 15, 20, 25, 50, 100], true) ? $perPage : $defaultPerPage;
        $page = max(1, $request->integer('page', 1));

        return new LengthAwarePaginator(
            $items->forPage($page, $perPage)->values(),
            $items->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );
    }

    private function branchQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId();
        $academicYearId = $this->ratingsAcademicYearId($request);

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
            ->when($academicYearId, fn ($q) => $q->where('rb.academic_year_id', $academicYearId))
            ->when($search, fn ($q) => $q->where('b.name', 'like', "%{$search}%"))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    public function exportSubject(Request $request): StreamedResponse
    {
        $rows = $this->subjectQuery($request)->orderByDesc('rs.id')->get();
        $this->recordExport($request, 'subject-ratings', $rows->count());

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
        $rows = $this->attachLatestPeerRatings(
            $this->peerQuery($request)->get(),
            $this->academicYearFromLabel($request->input('school_year')),
            $this->peerQuestionnaireTypeId(),
        );
        $this->recordExport($request, 'peer-ratings', $rows->count());

        return $this->streamCsv('peer-ratings', [
            '#', 'Teacher', 'Department', 'Program / Strand', 'Rating', 'Responses', 'School Year',
        ], $rows, fn ($r) => [
            $r->rating_id, $r->teacher_name, $r->department_name, $r->program_name ?: $r->strand_name,
            $r->overall_rating ? number_format((float) $r->overall_rating, 2) : '',
            $r->submission_count ?? 0,
            $r->school_year,
        ]);
    }

    public function exportEmployee(Request $request): StreamedResponse
    {
        $rows = $this->employeeQuery($request)->orderByDesc('re.id')->get();
        $this->recordExport($request, 'employee-ratings', $rows->count());

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
            ->leftJoin('employee as e', 'rs.employee_id', '=', 'e.id')
            ->leftJoin('academic_year as ay', 'rs.academic_year_id', '=', 'ay.id')
            ->select(
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as teacher_name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as avg_rating"),
                DB::raw('COUNT(rs.id) as count'),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->groupBy('e.id', 'e.firstname', 'e.lastname', 'ay.from_year', 'ay.to_year')
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

        AuditLogger::record('report.printed', 'ratings_summary', null, [
            'report' => 'ratings-summary',
            'title' => 'Ratings Summary',
            'school_year' => $schoolYear ?: 'All School Years',
            'record_count' => $subject->count() + $peer->count() + $employee->count(),
        ], $request);

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
        $requestedBranchId = $request->integer('branch_id');
        $departmentId = $request->integer('department_id');
        $programId = $request->integer('program_id');
        $strandId = $request->integer('strand_id');
        $selectedBranchId = $branchId ?: $requestedBranchId;
        $archived   = $request->boolean('archived');
        $academicYearId = $this->ratingsAcademicYearId($request);

        return DB::table('ratings_subject as rs')
            ->leftJoin('employee as e', 'rs.employee_id', '=', 'e.id')
            ->leftJoin('subject as s', 'rs.subject_id', '=', 's.id')
            ->leftJoin('department as d', 's.department_id', '=', 'd.id')
            ->leftJoin('academic_year as ay', 'rs.academic_year_id', '=', 'ay.id')
            ->select(
                'rs.id as rating_id',
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as teacher_name"),
                's.name as subject_name',
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average')) as overall_rating"),
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
                'ay.term as semester'
            )
            ->where('rs.is_archived', $archived ? 1 : 0)
            ->when($academicYearId, fn ($q) => $q->where('rs.academic_year_id', $academicYearId))
            ->when($selectedBranchId, fn ($q) => $q->where('d.branch_id', $selectedBranchId))
            ->when($departmentId, fn ($q) => $q->where('s.department_id', $departmentId))
            ->when($programId, fn ($q) => $q->where('s.program_id', $programId))
            ->when($strandId, fn ($q) => $q->where('s.strand_id', $strandId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('e.firstname', 'like', "%{$search}%")
                    ->orWhere('e.lastname', 'like', "%{$search}%")
                    ->orWhere('s.name', 'like', "%{$search}%");
            }))
            ->when($schoolYear, fn ($q) => $q->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));
    }

    private function subjectArchiveFolders(Request $request): array
    {
        if (! Schema::hasTable('academic_year') || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $branchId = $this->scopedBranchId();
        $activeAcademicYearId = $this->activeAcademicYear()?->id;
        $subjectTypeId = $this->questionnaireTypeIdByCode('QTYPE-SUBJECT');

        return DB::table('academic_year as ay')
            ->join('evaluation_submissions as es', 'es.academic_year_id', '=', 'ay.id')
            ->leftJoin('subject as s', 'es.subject_id', '=', 's.id')
            ->leftJoin('department as d', 's.department_id', '=', 'd.id')
            ->select(
                'ay.id',
                'ay.from_year',
                'ay.to_year',
                'ay.term',
                DB::raw('COUNT(es.id) as submission_count'),
                DB::raw('COUNT(DISTINCT es.subject_id) as subject_count')
            )
            ->whereNotNull('es.subject_id')
            ->when($subjectTypeId, fn ($query) => $query->where('es.questionnaire_type_id', $subjectTypeId))
            ->when($activeAcademicYearId, fn ($query) => $query->where('ay.id', '!=', $activeAcademicYearId))
            ->when($branchId, fn ($query) => $query->where('d.branch_id', $branchId))
            ->groupBy('ay.id', 'ay.from_year', 'ay.to_year', 'ay.term')
            ->orderByDesc('ay.from_year')
            ->orderByDesc('ay.to_year')
            ->orderByDesc('ay.id')
            ->get()
            ->map(fn (object $period) => [
                'id' => (int) $period->id,
                'key' => (string) $period->id,
                'school_year' => "{$period->from_year}-{$period->to_year}",
                'term' => $period->term,
                'label' => trim("{$period->from_year}-{$period->to_year} {$period->term}"),
                'submission_count' => (int) $period->submission_count,
                'subject_count' => (int) $period->subject_count,
            ])
            ->all();
    }

    private function peerArchiveFolders(Request $request): array
    {
        if (! Schema::hasTable('academic_year') || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $branchId = $this->scopedBranchId();
        $activeAcademicYearId = $this->activeAcademicYear()?->id;
        $peerTypeId = $this->peerQuestionnaireTypeId();

        if (! $peerTypeId || ! Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id')) {
            return [];
        }

        return DB::table('academic_year as ay')
            ->join('evaluation_submissions as es', 'es.academic_year_id', '=', 'ay.id')
            ->leftJoin('teacher as t', 'es.teacher_id', '=', 't.id')
            ->select(
                'ay.id',
                'ay.from_year',
                'ay.to_year',
                'ay.term',
                DB::raw('COUNT(es.id) as submission_count'),
                DB::raw('COUNT(DISTINCT es.teacher_id) as teacher_count')
            )
            ->where('es.questionnaire_type_id', $peerTypeId)
            ->when($activeAcademicYearId, fn ($query) => $query->where('ay.id', '!=', $activeAcademicYearId))
            ->when($branchId, fn ($query) => $query->where('t.branch_id', $branchId))
            ->groupBy('ay.id', 'ay.from_year', 'ay.to_year', 'ay.term')
            ->orderByDesc('ay.from_year')
            ->orderByDesc('ay.to_year')
            ->orderByDesc('ay.id')
            ->get()
            ->map(fn (object $period) => [
                'id' => (int) $period->id,
                'key' => (string) $period->id,
                'school_year' => "{$period->from_year}-{$period->to_year}",
                'term' => $period->term,
                'label' => trim("{$period->from_year}-{$period->to_year} {$period->term}"),
                'submission_count' => (int) $period->submission_count,
                'record_count' => (int) $period->teacher_count,
            ])
            ->all();
    }

    private function headArchiveFolders(Request $request): array
    {
        if (! Schema::hasTable('academic_year') || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $branchId = $this->scopedBranchId();
        $activeAcademicYearId = $this->activeAcademicYear()?->id;
        $headTypeId = $this->questionnaireTypeIdByCode('QTYPE-HEAD');

        if (! $headTypeId || ! Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id')) {
            return [];
        }

        return DB::table('academic_year as ay')
            ->join('evaluation_submissions as es', 'es.academic_year_id', '=', 'ay.id')
            ->leftJoin('teacher as t', 'es.teacher_id', '=', 't.id')
            ->select(
                'ay.id',
                'ay.from_year',
                'ay.to_year',
                'ay.term',
                DB::raw('COUNT(es.id) as submission_count'),
                DB::raw('COUNT(DISTINCT es.teacher_id) as teacher_count')
            )
            ->where('es.questionnaire_type_id', $headTypeId)
            ->when($activeAcademicYearId, fn ($query) => $query->where('ay.id', '!=', $activeAcademicYearId))
            ->when($branchId, fn ($query) => $query->where('t.branch_id', $branchId))
            ->groupBy('ay.id', 'ay.from_year', 'ay.to_year', 'ay.term')
            ->orderByDesc('ay.from_year')
            ->orderByDesc('ay.to_year')
            ->orderByDesc('ay.id')
            ->get()
            ->map(fn (object $period) => [
                'id' => (int) $period->id,
                'key' => (string) $period->id,
                'school_year' => "{$period->from_year}-{$period->to_year}",
                'term' => $period->term,
                'label' => trim("{$period->from_year}-{$period->to_year} {$period->term}"),
                'submission_count' => (int) $period->submission_count,
                'record_count' => (int) $period->teacher_count,
            ])
            ->all();
    }

    private function employeeArchiveFolders(Request $request): array
    {
        if (! Schema::hasTable('academic_year') || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $branchId = $this->scopedBranchId();
        $activeAcademicYearId = $this->activeAcademicYear()?->id;
        $employeeTypeId = $this->questionnaireTypeIdByCode('QTYPE-EMPLOYEE');

        if (! $employeeTypeId || ! Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id')) {
            return [];
        }

        return DB::table('academic_year as ay')
            ->join('evaluation_submissions as es', 'es.academic_year_id', '=', 'ay.id')
            ->leftJoin('employee as e', 'es.employee_id', '=', 'e.id')
            ->select(
                'ay.id',
                'ay.from_year',
                'ay.to_year',
                'ay.term',
                DB::raw('COUNT(es.id) as submission_count'),
                DB::raw('COUNT(DISTINCT es.employee_id) as employee_count')
            )
            ->where('es.questionnaire_type_id', $employeeTypeId)
            ->when($activeAcademicYearId, fn ($query) => $query->where('ay.id', '!=', $activeAcademicYearId))
            ->when($branchId, fn ($query) => $query->where('e.branch_id', $branchId))
            ->groupBy('ay.id', 'ay.from_year', 'ay.to_year', 'ay.term')
            ->orderByDesc('ay.from_year')
            ->orderByDesc('ay.to_year')
            ->orderByDesc('ay.id')
            ->get()
            ->map(fn (object $period) => [
                'id' => (int) $period->id,
                'key' => (string) $period->id,
                'school_year' => "{$period->from_year}-{$period->to_year}",
                'term' => $period->term,
                'label' => trim("{$period->from_year}-{$period->to_year} {$period->term}"),
                'submission_count' => (int) $period->submission_count,
                'record_count' => (int) $period->employee_count,
            ])
            ->all();
    }

    private function peerArchiveRatings(Request $request, int $academicYearId, int $perPage): LengthAwarePaginator
    {
        $peerTypeId = $this->peerQuestionnaireTypeId();

        if (! Schema::hasTable('evaluation_submissions') || ! Schema::hasColumn('evaluation_submissions', 'questionnaire_type_id') || ! $peerTypeId) {
            return $this->paginateCollection(collect(), $request, $perPage);
        }

        $branchId = $this->scopedBranchId() ?? $request->input('branch_id');
        $departmentGroup = strtolower(trim((string) $request->input('department_group', '')));
        $programGroup = strtolower(trim((string) $request->input('program_group', '')));
        $strandGroup = strtolower(trim((string) $request->input('strand_group', '')));
        $search = trim((string) $request->input('search', ''));

        $rows = DB::table('evaluation_submissions as es')
            ->leftJoin('teacher as t', 'es.teacher_id', '=', 't.id')
            ->leftJoin('branch as b', 't.branch_id', '=', 'b.id')
            ->leftJoin('department as d', 't.department_id', '=', 'd.id')
            ->leftJoin('program as p', 't.program_id', '=', 'p.id')
            ->leftJoin('strand as s', 't.strand_id', '=', 's.id')
            ->leftJoin('academic_year as ay', 'es.academic_year_id', '=', 'ay.id')
            ->select(
                'es.id',
                'es.teacher_id',
                'es.questionnaire_id',
                'es.answers',
                't.branch_id',
                't.department_id',
                't.program_id',
                't.strand_id',
                DB::raw("TRIM(CONCAT(t.firstname, ' ', COALESCE(t.middlename, ''), ' ', t.lastname)) as teacher_name"),
                DB::raw("COALESCE(t.role, 'Teacher') as teacher_role"),
                'b.name as branch_name',
                'd.name as department_name',
                'd.code as department_code',
                'p.name as program_name',
                's.name as strand_name',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->where('es.academic_year_id', $academicYearId)
            ->where('es.questionnaire_type_id', $peerTypeId)
            ->whereNotNull('es.teacher_id')
            ->when($branchId, fn ($query) => $query->where('t.branch_id', $branchId))
            ->when($departmentGroup !== '', fn ($query) => $query->whereRaw('LOWER(TRIM(COALESCE(d.name, ""))) = ?', [$departmentGroup]))
            ->when($programGroup !== '', fn ($query) => $query->whereRaw('LOWER(TRIM(COALESCE(p.name, ""))) = ?', [$programGroup]))
            ->when($strandGroup !== '', fn ($query) => $query->whereRaw('LOWER(TRIM(COALESCE(s.name, ""))) = ?', [$strandGroup]))
            ->when($search, fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('t.firstname', 'like', "%{$search}%")
                    ->orWhere('t.lastname', 'like', "%{$search}%")
                    ->orWhere('d.name', 'like', "%{$search}%")
                    ->orWhere('p.name', 'like', "%{$search}%")
                    ->orWhere('s.name', 'like', "%{$search}%");
            }))
            ->orderByDesc('es.id')
            ->get();

        $questionnaireDetails = $this->peerQuestionnaireDetails(
            $rows->pluck('questionnaire_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all()
        );

        $items = $rows
            ->groupBy(fn (object $row) => ((int) $row->teacher_id) . ':' . ((int) $row->questionnaire_id))
            ->map(function (Collection $rows) use ($questionnaireDetails) {
                $first = $rows->first();
                $questionBuckets = [];

                $rows->each(function (object $row) use (&$questionBuckets) {
                    $answers = json_decode((string) ($row->answers ?? '[]'), true);

                    if (! is_array($answers)) {
                        return;
                    }

                    foreach ($answers as $answer) {
                        $questionId = (int) ($answer['question_id'] ?? 0);
                        $rating = $answer['rating'] ?? null;

                        if (! $questionId || ! is_numeric($rating)) {
                            continue;
                        }

                        $questionBuckets[$questionId] ??= [];
                        $questionBuckets[$questionId][] = (float) $rating;
                    }
                });

                $questionRatings = collect($questionBuckets)
                    ->mapWithKeys(fn (array $values, int $questionId) => [
                        (string) $questionId => [
                            'average' => count($values) ? round(array_sum($values) / count($values), 2) : null,
                            'count' => count($values),
                        ],
                    ])
                    ->all();
                $questionnaireId = $first->questionnaire_id ? (int) $first->questionnaire_id : null;
                $questionnaire = $questionnaireId ? ($questionnaireDetails[$questionnaireId] ?? null) : null;

                return (object) [
                    'rating_id' => $first->id,
                    'teacher_id' => $first->teacher_id,
                    'branch_id' => $first->branch_id,
                    'department_id' => $first->department_id,
                    'program_id' => $first->program_id,
                    'strand_id' => $first->strand_id,
                    'teacher_name' => $first->teacher_name ?: 'Teacher',
                    'teacher_role' => $first->teacher_role ?: 'Teacher',
                    'branch_name' => $first->branch_name,
                    'department_name' => $first->department_name,
                    'department_code' => $first->department_code,
                    'program_name' => $first->program_name,
                    'strand_name' => $first->strand_name,
                    'overall_rating' => $this->weightedPeerOverall($questionnaire, $questionRatings),
                    'submission_count' => $rows->count(),
                    'school_year' => $first->school_year,
                    'questionnaire_id' => $questionnaireId,
                    'questionnaire' => $questionnaire,
                    'question_ratings' => $questionRatings,
                ];
            })
            ->sortByDesc('rating_id')
            ->values();

        return $this->paginateCollection($items, $request, $perPage);
    }

    private function subjectRatingContext(Request $request): array
    {
        $scopedBranchId = $this->scopedBranchId();
        $requestedBranchId = $request->integer('branch_id');
        $requestedDepartmentId = $request->integer('department_id');
        $requestedProgramId = $request->integer('program_id');
        $requestedStrandId = $request->integer('strand_id');
        $search = trim((string) $request->input('search', ''));
        $schoolYear = trim((string) $request->input('school_year', ''));
        $archiveAcademicYearId = $request->integer('archive_academic_year_id');
        $archived = $request->boolean('archived');
        $academicYearId = $archiveAcademicYearId ?: $this->ratingsAcademicYearId($request);

        $branches = DB::table('branch')
            ->select('id', 'name', 'code')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->where('code', '!=', 'OVERALL')
            ->when($scopedBranchId, fn ($query) => $query->where('id', $scopedBranchId))
            ->orderBy('name')
            ->get();

        $selectedBranchId = $scopedBranchId
            ?? ($branches->contains('id', $requestedBranchId) ? $requestedBranchId : $branches->first()?->id);

        $departments = DB::table('department')
            ->select('id', 'name', 'code', 'branch_id')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($selectedBranchId, fn ($query) => $query->where('branch_id', $selectedBranchId))
            ->orderBy('name')
            ->get()
            ->map(function (object $department) {
                $department->education_type = $this->departmentEducationType($department);
                $department->education_label = $this->educationTypeLabel($department->education_type);

                return $department;
            });

        $selectedDepartmentId = $departments->contains('id', $requestedDepartmentId)
            ? $requestedDepartmentId
            : $departments->first()?->id;

        $selectedDepartment = $departments->firstWhere('id', $selectedDepartmentId);
        $educationType = $selectedDepartment?->education_type ?? 'college';

        $programs = DB::table('program')
            ->select('id', 'name', 'code', 'department_id')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($selectedDepartmentId, fn ($query) => $query->where('department_id', $selectedDepartmentId))
            ->orderBy('name')
            ->get();

        $strands = DB::table('strand')
            ->select('id', 'name', 'code', 'department_id')
            ->where('is_deleted', 0)
            ->where('is_activated', 1)
            ->when($selectedDepartmentId, fn ($query) => $query->where('department_id', $selectedDepartmentId))
            ->orderBy('name')
            ->get();

        $selectedProgramId = $educationType === 'college'
            ? ($programs->contains('id', $requestedProgramId) ? $requestedProgramId : $programs->first()?->id)
            : null;
        $selectedStrandId = $educationType === 'shs'
            ? ($strands->contains('id', $requestedStrandId) ? $requestedStrandId : $strands->first()?->id)
            : null;

        $subjects = DB::table('subject as s')
            ->leftJoin('program as p', 's.program_id', '=', 'p.id')
            ->leftJoin('strand as st', 's.strand_id', '=', 'st.id')
            ->select(
                's.id',
                's.code',
                's.name',
                's.type',
                's.department_id',
                's.program_id',
                's.strand_id',
                's.teacher_id',
                'p.name as program_name',
                'st.name as strand_name'
            )
            ->where('s.is_deleted', 0)
            ->where('s.is_activated', 1)
            ->when($selectedDepartmentId, fn ($query) => $query->where('s.department_id', $selectedDepartmentId))
            ->when($selectedProgramId, fn ($query) => $query->where('s.program_id', $selectedProgramId))
            ->when($selectedStrandId, fn ($query) => $query->where('s.strand_id', $selectedStrandId))
            ->orderBy('s.name')
            ->get();

        $ratings = $this->subjectSubmissionRatings($subjects->pluck('id')->all(), $schoolYear, $academicYearId)
            ->groupBy('subject_id');

        $assignedTeacherIds = $subjects
            ->flatMap(fn (object $subject) => $this->decodeIdList($subject->teacher_id))
            ->unique()
            ->values();

        $teacherNames = DB::table('teacher')
            ->select('id', DB::raw("TRIM(CONCAT(firstname, ' ', COALESCE(middlename, ''), ' ', lastname)) as name"), DB::raw("COALESCE(role, 'Teacher') as role"))
            ->whereIn('id', $assignedTeacherIds)
            ->get()
            ->keyBy('id');

        $subjectItems = $subjects->map(function (object $subject) use ($ratings, $teacherNames) {
            $teacherCards = collect();
            $subjectLevelRating = ($ratings[$subject->id] ?? collect())->firstWhere('employee_id', null);

            foreach ($this->decodeIdList($subject->teacher_id) as $teacherId) {
                $matchingRating = ($ratings[$subject->id] ?? collect())->firstWhere('employee_id', $teacherId) ?? $subjectLevelRating;
                $teacher = $teacherNames[$teacherId] ?? null;

                $teacherCards->push($this->subjectTeacherCard($teacherId, $teacher?->name, $teacher?->role, $matchingRating));
            }

            foreach (($ratings[$subject->id] ?? collect()) as $rating) {
                if ($rating->employee_id === null) {
                    continue;
                }

                if ($teacherCards->contains(fn (array $card) => (int) ($card['teacher_id'] ?? 0) === (int) $rating->employee_id)) {
                    continue;
                }

                $teacherCards->push($this->subjectTeacherCard($rating->employee_id, $rating->teacher_name, $rating->teacher_role, $rating));
            }

            return [
                'id' => $subject->id,
                'code' => $subject->code,
                'name' => $subject->name,
                'type' => $subject->type,
                'program_name' => $subject->program_name,
                'strand_name' => $subject->strand_name,
                'teacher_count' => $teacherCards->count(),
                'teachers' => $teacherCards->values(),
            ];
        })
            ->when($search, fn ($items) => $items->filter(function (array $subject) use ($search) {
                $needle = strtolower($search);
                $subjectText = strtolower(($subject['name'] ?? '') . ' ' . ($subject['code'] ?? ''));
                $teacherMatches = collect($subject['teachers'])->contains(
                    fn (array $teacher) => str_contains(strtolower($teacher['teacher_name'] ?? ''), $needle)
                );

                return str_contains($subjectText, $needle) || $teacherMatches;
            }))
            ->values();

        return [
            'branches' => $branches,
            'departments' => $departments,
            'programs' => $programs,
            'strands' => $strands,
            'selectedBranchId' => $selectedBranchId,
            'selectedDepartmentId' => $selectedDepartmentId,
            'selectedProgramId' => $selectedProgramId,
            'selectedStrandId' => $selectedStrandId,
            'educationType' => $educationType,
            'educationLabel' => $this->educationTypeLabel($educationType),
            'subjects' => $subjectItems,
            'scopedBranchId' => $scopedBranchId,
        ];
    }

    private function subjectSubmissionRatings(array $subjectIds, string $schoolYear = '', ?int $academicYearId = null): Collection
    {
        $subjectIds = collect($subjectIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($subjectIds->isEmpty() || ! Schema::hasTable('evaluation_submissions')) {
            return collect();
        }

        $hasTeacherId = Schema::hasColumn('evaluation_submissions', 'teacher_id');
        $subjectTypeId = $this->questionnaireTypeIdByCode('QTYPE-SUBJECT');
        $selects = [
            'es.id',
            'es.subject_id',
            'es.questionnaire_id',
            'es.answers',
            DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year"),
            'ay.term as semester',
        ];

        if ($hasTeacherId) {
            $selects[] = 'es.teacher_id';
            $selects[] = DB::raw("TRIM(COALESCE(CONCAT(t.firstname, ' ', COALESCE(t.middlename, ''), ' ', t.lastname), CONCAT(e.firstname, ' ', COALESCE(e.middlename, ''), ' ', e.lastname))) as teacher_name");
            $selects[] = DB::raw("COALESCE(t.role, e.role, 'Teacher') as teacher_role");
        } else {
            $selects[] = DB::raw('NULL as teacher_id');
            $selects[] = DB::raw('NULL as teacher_name');
            $selects[] = DB::raw("'Teacher' as teacher_role");
        }

        $query = DB::table('evaluation_submissions as es')
            ->leftJoin('academic_year as ay', 'es.academic_year_id', '=', 'ay.id')
            ->select($selects)
            ->whereIn('es.subject_id', $subjectIds->all())
            ->when($subjectTypeId, fn ($query) => $query->where('es.questionnaire_type_id', $subjectTypeId))
            ->when($academicYearId, fn ($query) => $query->where('es.academic_year_id', $academicYearId))
            ->when($schoolYear, fn ($query) => $query->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]));

        if ($hasTeacherId) {
            $query
                ->leftJoin('teacher as t', 'es.teacher_id', '=', 't.id')
                ->leftJoin('employee as e', 'es.teacher_id', '=', 'e.id')
                ->whereNotNull('es.teacher_id');
        }

        $rows = $query->get();
        $questionnaireDetails = $this->peerQuestionnaireDetails(
            $rows
                ->pluck('questionnaire_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all()
        );

        return $rows
            ->groupBy(fn (object $row) => ((int) $row->subject_id) . ':' . ((int) $row->teacher_id))
            ->map(function (Collection $rows) use ($questionnaireDetails) {
                $first = $rows->first();
                $questionBuckets = [];

                $ratings = $rows->flatMap(function (object $row) use (&$questionBuckets) {
                    $answers = json_decode((string) ($row->answers ?? '[]'), true);

                    if (! is_array($answers)) {
                        return [];
                    }

                    return collect($answers)->map(function ($answer) use (&$questionBuckets) {
                        $questionId = (int) ($answer['question_id'] ?? 0);
                        $rating = $answer['rating'] ?? null;

                        if (! $questionId || ! is_numeric($rating)) {
                            return null;
                        }

                        $questionBuckets[$questionId] ??= [];
                        $questionBuckets[$questionId][] = (float) $rating;

                        return (float) $rating;
                    })->filter(fn ($rating) => $rating !== null)->all();
                });
                $questionRatings = collect($questionBuckets)
                    ->mapWithKeys(fn (array $values, int $questionId) => [
                        (string) $questionId => [
                            'average' => count($values) ? round(array_sum($values) / count($values), 2) : null,
                            'count' => count($values),
                        ],
                    ])
                    ->all();
                $questionnaireId = $first->questionnaire_id ? (int) $first->questionnaire_id : null;

                return (object) [
                    'rating_id' => $first->id ?? null,
                    'subject_id' => $first->subject_id ?? null,
                    'employee_id' => $first->teacher_id ?? null,
                    'submission_count' => $rows->count(),
                    'teacher_name' => $first->teacher_name ?? null,
                    'teacher_role' => $first->teacher_role ?? 'Teacher',
                    'overall_rating' => $ratings->isNotEmpty() ? round($ratings->avg(), 2) : null,
                    'school_year' => $first->school_year ?? null,
                    'semester' => $first->semester ?? null,
                    'questionnaire_id' => $questionnaireId,
                    'questionnaire' => $questionnaireId ? ($questionnaireDetails[$questionnaireId] ?? null) : null,
                    'question_ratings' => $questionRatings,
                ];
            })
            ->values();
    }

    private function decodeIdList(mixed $value): array
    {
        if (is_string($value)) {
            $value = json_decode($value, true) ?: [];
        }

        return collect($value ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function subjectTeacherCard(?int $teacherId, ?string $name, ?string $role, ?object $rating): array
    {
        return [
            'teacher_id' => $teacherId,
            'teacher_name' => trim((string) $name) ?: 'Unassigned teacher',
            'teacher_role' => $role ?: 'Teacher',
            'rating_id' => $rating->rating_id ?? null,
            'overall_rating' => $rating?->overall_rating !== null ? (float) $rating->overall_rating : null,
            'submission_count' => (int) ($rating->submission_count ?? 0),
            'school_year' => $rating->school_year ?? null,
            'semester' => $rating->semester ?? null,
            'questionnaire_id' => $rating->questionnaire_id ?? null,
            'questionnaire' => $rating->questionnaire ?? null,
            'question_ratings' => $rating->question_ratings ?? [],
        ];
    }

    private function departmentEducationType(object $department): string
    {
        $label = strtolower(($department->name ?? '') . ' ' . ($department->code ?? ''));

        return match (true) {
            str_contains($label, 'senior high') || str_contains($label, 'shs') => 'shs',
            str_contains($label, 'junior high') || str_contains($label, 'jhs') => 'jhs',
            str_contains($label, 'elementary') || str_contains($label, 'elem') || str_contains($label, 'grade school') => 'elementary',
            default => 'college',
        };
    }

    private function educationTypeLabel(string $type): string
    {
        return match ($type) {
            'shs' => 'Senior High',
            'jhs' => 'Junior High',
            'elementary' => 'Elementary',
            default => 'College',
        };
    }

    private function peerQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId() ?? $request->input('branch_id');
        $departmentGroup = strtolower(trim((string) $request->input('department_group', '')));
        $programGroup  = strtolower(trim((string) $request->input('program_group', '')));
        $strandGroup  = strtolower(trim((string) $request->input('strand_group', '')));
        $archived   = $request->boolean('archived');
        $academicYearId = $this->ratingsAcademicYearId($request);

        $baseRatingQuery = DB::table('ratings_peer as rp')
            ->leftJoin('academic_year as ay', 'rp.academic_year_id', '=', 'ay.id')
            ->whereColumn('rp.teacher_id', 't.id')
            ->where('rp.is_archived', $archived ? 1 : 0)
            ->when($academicYearId, fn ($query) => $query->where('rp.academic_year_id', $academicYearId))
            ->when($schoolYear, fn ($query) => $query->whereRaw("CONCAT(ay.from_year, '-', ay.to_year) = ?", [$schoolYear]))
            ->orderByDesc('ay.from_year')
            ->orderByDesc('ay.to_year')
            ->orderByDesc('rp.id');

        return DB::table('teacher as t')
            ->leftJoin('branch as b', 't.branch_id', '=', 'b.id')
            ->leftJoin('department as d', 't.department_id', '=', 'd.id')
            ->leftJoin('program as p', 't.program_id', '=', 'p.id')
            ->leftJoin('strand as s', 't.strand_id', '=', 's.id')
            ->select(
                't.id as teacher_id',
                't.branch_id',
                't.department_id',
                't.program_id',
                't.strand_id',
                DB::raw("CONCAT(t.firstname, ' ', t.lastname) as teacher_name"),
                't.firstname',
                't.middlename',
                't.lastname',
                't.role',
                'b.name as branch_name',
                'd.name as department_name',
                'd.code as department_code',
                'p.name as program_name',
                's.name as strand_name'
            )
            ->where('t.is_deleted', 0)
            ->whereRaw('LOWER(COALESCE(t.role, "")) NOT LIKE ?', ['%program chair%'])
            ->when($branchId, fn ($q) => $q->where('t.branch_id', $branchId))
            ->when($departmentGroup !== '', fn ($q) => $q->whereRaw('LOWER(TRIM(COALESCE(d.name, ""))) = ?', [$departmentGroup]))
            ->when($programGroup !== '', fn ($q) => $q->whereRaw('LOWER(TRIM(COALESCE(p.name, ""))) = ?', [$programGroup]))
            ->when($strandGroup !== '', fn ($q) => $q->whereRaw('LOWER(TRIM(COALESCE(s.name, ""))) = ?', [$strandGroup]))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('t.firstname', 'like', "%{$search}%")
                    ->orWhere('t.lastname', 'like', "%{$search}%")
                    ->orWhere('d.name', 'like', "%{$search}%")
                    ->orWhere('p.name', 'like', "%{$search}%")
                    ->orWhere('s.name', 'like', "%{$search}%");
            }))
            ->orderBy('t.lastname')
            ->orderBy('t.firstname');
    }

    private function attachLatestPeerRatings(iterable $rows, ?object $academicYear, ?int $questionnaireTypeId): iterable
    {
        if ($rows instanceof LengthAwarePaginator) {
            $collection = $rows->getCollection();
            $rows->setCollection($this->attachLatestPeerRatingsToCollection($collection, $academicYear, $questionnaireTypeId));

            return $rows;
        }

        $collection = $rows instanceof Collection ? $rows : collect($rows);

        return $this->attachLatestPeerRatingsToCollection($collection, $academicYear, $questionnaireTypeId);
    }

    private function attachLatestPeerRatingsToCollection(Collection $rows, ?object $academicYear, ?int $questionnaireTypeId): Collection
    {
        if ($rows->isEmpty()) {
            return $rows;
        }

        $teacherAssignments = $this->resolvePeerQuestionnaireAssignments($rows, $academicYear, $questionnaireTypeId);
        $latestRatings = $this->latestPeerSubmissionRatings($teacherAssignments, $academicYear, $questionnaireTypeId);
        $questionnaireDetails = $this->peerQuestionnaireDetails(
            collect($teacherAssignments)
                ->pluck('questionnaire_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all()
        );
        $questionAverages = $this->peerQuestionAverages($teacherAssignments, $academicYear, $questionnaireTypeId);
        $schoolYearLabel = $academicYear ? $academicYear->from_year . '-' . $academicYear->to_year : null;

        return $rows->map(function ($row) use ($teacherAssignments, $latestRatings, $questionnaireDetails, $questionAverages, $schoolYearLabel) {
            $teacherId = (int) ($row->teacher_id ?? 0);
            $assignment = $teacherAssignments[$teacherId] ?? null;
            $questionnaireId = $assignment['questionnaire_id'] ?? null;
            $rating = $questionnaireId ? ($latestRatings[$teacherId . ':' . $questionnaireId] ?? null) : null;
            $detailKey = $questionnaireId ? ($teacherId . ':' . $questionnaireId) : null;
            $questionnaire = $questionnaireId ? ($questionnaireDetails[$questionnaireId] ?? null) : null;
            $questionRatings = $detailKey ? ($questionAverages[$detailKey] ?? []) : [];

            $row->rating_id = $rating['submission_id'] ?? null;
            $row->overall_rating = $this->weightedPeerOverall($questionnaire, $questionRatings);
            $row->submission_count = $rating['submission_count'] ?? 0;
            $row->school_year = $rating ? ($rating['school_year'] ?? $schoolYearLabel) : null;
            $row->questionnaire_id = $questionnaireId;
            $row->questionnaire = $questionnaire;
            $row->question_ratings = $questionRatings;

            return $row;
        });
    }

    private function resolvePeerQuestionnaireAssignments(Collection $rows, ?object $academicYear, ?int $questionnaireTypeId): array
    {
        if ($rows->isEmpty() || ! $academicYear || ! $questionnaireTypeId || ! Schema::hasTable('questionnaire_distribution') || ! Schema::hasTable('questionnaires')) {
            return [];
        }

        $branchIds = $rows->pluck('branch_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $distributions = DB::table('questionnaire_distribution as qd')
            ->join('questionnaires as q', 'q.id', '=', 'qd.questionnaire_id')
            ->select('qd.branch_id', 'qd.questionnaire_id', 'qd.items')
            ->where('qd.is_deleted', 0)
            ->where('q.is_deleted', 0)
            ->where('q.questionnaire_type_id', $questionnaireTypeId)
            ->where(function ($query) use ($academicYear) {
                $query->where('qd.academic_year_id', (int) $academicYear->id)
                    ->orWhereNull('qd.academic_year_id');
            })
            ->when(! empty($branchIds), fn ($query) => $query->whereIn('qd.branch_id', $branchIds))
            ->orderByRaw('CASE WHEN qd.academic_year_id IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('qd.id')
            ->get();

        $assignments = [];

        foreach ($rows as $row) {
            $teacherId = (int) ($row->teacher_id ?? 0);

            if (! $teacherId) {
                continue;
            }

            foreach ($distributions as $distribution) {
                if ((int) ($distribution->branch_id ?? 0) !== (int) ($row->branch_id ?? 0)) {
                    continue;
                }

                $items = json_decode($distribution->items ?? '{}', true) ?: [];

                if ((int) ($items['department_id'] ?? 0) !== (int) ($row->department_id ?? 0)) {
                    continue;
                }

                $questionnaireId = $this->matchPeerQuestionnaireIdForTeacher($row, $items, (int) $distribution->questionnaire_id);

                if ($questionnaireId) {
                    $assignments[$teacherId] = [
                        'questionnaire_id' => $questionnaireId,
                        'branch_id' => (int) ($row->branch_id ?? 0),
                    ];
                    break;
                }
            }
        }

        return $assignments;
    }

    private function matchPeerQuestionnaireIdForTeacher(object $teacher, array $items, int $defaultQuestionnaireId): ?int
    {
        $departmentKind = $this->peerDepartmentKind($teacher->department_name ?? null, $teacher->department_code ?? null);
        $customGroups = collect($items['custom_scope_groups'] ?? [])
            ->filter(fn ($group) => ! empty($group['questionnaire_id']))
            ->values();

        if ($departmentKind === 'college') {
            $programId = (int) ($teacher->program_id ?? 0);

            if (! $programId) {
                return null;
            }

            foreach ($customGroups as $group) {
                $scopeIds = collect($group['subject_ids'] ?? [])->map(fn ($id) => (int) $id)->all();

                if (in_array($programId, $scopeIds, true)) {
                    return (int) $group['questionnaire_id'];
                }
            }

            $programIds = collect($items['program_ids'] ?? [])->map(fn ($id) => (int) $id)->all();

            return in_array($programId, $programIds, true) ? $defaultQuestionnaireId : null;
        }

        if ($departmentKind === 'senior-high') {
            $strandId = (int) ($teacher->strand_id ?? 0);

            if (! $strandId) {
                return null;
            }

            foreach ($customGroups as $group) {
                $scopeIds = collect($group['subject_ids'] ?? [])->map(fn ($id) => (int) $id)->all();

                if (in_array($strandId, $scopeIds, true)) {
                    return (int) $group['questionnaire_id'];
                }
            }

            $strandIds = collect($items['strand_ids'] ?? [])->map(fn ($id) => (int) $id)->all();

            return in_array($strandId, $strandIds, true) ? $defaultQuestionnaireId : null;
        }

        return $defaultQuestionnaireId;
    }

    private function peerDepartmentKind(?string $name, ?string $code): string
    {
        $name = strtolower(trim((string) $name));
        $code = strtolower(trim((string) $code));

        if (str_contains($name, 'college') || str_contains($code, 'col')) {
            return 'college';
        }

        if (str_contains($name, 'senior high') || str_contains($code, 'shs')) {
            return 'senior-high';
        }

        if (str_contains($name, 'junior high') || str_contains($code, 'jhs')) {
            return 'junior-high';
        }

        return 'elementary';
    }

    private function latestPeerSubmissionRatings(array $teacherAssignments, ?object $academicYear, ?int $questionnaireTypeId): array
    {
        if (empty($teacherAssignments) || ! $academicYear || ! $questionnaireTypeId || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $teacherIds = array_values(array_unique(array_map('intval', array_keys($teacherAssignments))));
        $questionnaireIds = array_values(array_unique(array_map(
            fn ($assignment) => (int) ($assignment['questionnaire_id'] ?? 0),
            array_values($teacherAssignments)
        )));
        $branchIds = array_values(array_unique(array_map(
            fn ($assignment) => (int) ($assignment['branch_id'] ?? 0),
            array_values($teacherAssignments)
        )));

        $rows = DB::table('evaluation_submissions')
            ->select('id', 'branch_id', 'academic_year_id', 'questionnaire_id', 'teacher_id', 'answers')
            ->where('academic_year_id', (int) $academicYear->id)
            ->where('questionnaire_type_id', $questionnaireTypeId)
            ->whereIn('teacher_id', $teacherIds)
            ->whereIn('questionnaire_id', $questionnaireIds)
            ->whereIn('branch_id', $branchIds)
            ->orderByDesc('id')
            ->get();

        $matched = [];

        foreach ($rows as $row) {
            $teacherId = (int) ($row->teacher_id ?? 0);
            $questionnaireId = (int) ($row->questionnaire_id ?? 0);
            $branchId = (int) ($row->branch_id ?? 0);
            $assignment = $teacherAssignments[$teacherId] ?? null;

            if (! $assignment || (int) ($assignment['questionnaire_id'] ?? 0) !== $questionnaireId || (int) ($assignment['branch_id'] ?? 0) !== $branchId) {
                continue;
            }

            $key = $teacherId . ':' . $questionnaireId;
            $questionRatings = $this->peerQuestionRatingsFromAnswers($row->answers);

            if (! isset($matched[$key])) {
                $matched[$key] = [
                    'submission_id' => (int) $row->id,
                    'school_year' => $academicYear->from_year . '-' . $academicYear->to_year,
                    'submission_count' => 0,
                    'question_totals' => [],
                ];
            }

            $matched[$key]['submission_count']++;

            foreach ($questionRatings as $questionId => $rating) {
                $matched[$key]['question_totals'][$questionId]['sum'] = ($matched[$key]['question_totals'][$questionId]['sum'] ?? 0) + $rating;
                $matched[$key]['question_totals'][$questionId]['count'] = ($matched[$key]['question_totals'][$questionId]['count'] ?? 0) + 1;
            }
        }

        foreach ($matched as $key => $payload) {
            unset($matched[$key]['question_totals']);
        }

        return $matched;
    }

    private function peerQuestionnaireDetails(array $questionnaireIds): array
    {
        $questionnaireIds = collect($questionnaireIds)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (empty($questionnaireIds) || ! Schema::hasTable('questionnaires') || ! Schema::hasTable('question')) {
            return [];
        }

        $rows = DB::table('questionnaires as q')
            ->leftJoin('questionnaire_type as qt', 'qt.id', '=', 'q.questionnaire_type_id')
            ->select('q.id', 'q.code', 'q.title', 'q.items', 'q.comments', 'q.notes', 'qt.name as questionnaire_type_name')
            ->whereIn('q.id', $questionnaireIds)
            ->where('q.is_deleted', 0)
            ->get();

        $questionIds = $rows
            ->flatMap(function ($row) {
                $items = json_decode($row->items ?? '{}', true) ?: [];
                $comments = json_decode($row->comments ?? '[]', true) ?: [];

                $scaleIds = collect($items['scale_questions'] ?? [])
                    ->flatMap(fn ($group) => collect($group['questions'] ?? [])
                        ->map(fn ($question) => is_array($question) ? (int) ($question['question_id'] ?? 0) : (int) $question));

                $commentIds = collect(data_get($items, 'comment_section.questions', []))
                    ->map(fn ($question) => is_array($question) ? (int) ($question['question_id'] ?? 0) : (int) $question);

                return $scaleIds->merge($commentIds)->merge(collect($comments)->map(fn ($id) => (int) $id));
            })
            ->filter()
            ->unique()
            ->values()
            ->all();

        $questionMap = DB::table('question')
            ->select('id', 'description')
            ->whereIn('id', $questionIds)
            ->get()
            ->keyBy('id');

        return $rows->mapWithKeys(function ($row) use ($questionMap) {
            $items = json_decode($row->items ?? '{}', true) ?: [];
            $legacyComments = json_decode($row->comments ?? '[]', true) ?: [];

            $scaleQuestions = collect($items['scale_questions'] ?? [])
                ->map(function ($group) use ($questionMap) {
                    return [
                        'class_name' => $group['class_name'] ?? '',
                        'weight_percentage' => isset($group['weight_percentage']) ? (int) $group['weight_percentage'] : null,
                        'questions' => collect($group['questions'] ?? [])
                            ->map(function ($question) use ($questionMap) {
                                $questionId = is_array($question) ? (int) ($question['question_id'] ?? 0) : (int) $question;

                                return [
                                    'question_id' => $questionId,
                                    'description' => data_get($questionMap->get($questionId), 'description') ?? "Question #{$questionId}",
                                ];
                            })
                            ->filter(fn ($question) => ! empty($question['question_id']))
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all();

            $commentSection = collect(data_get($items, 'comment_section.questions', []))
                ->map(function ($question) use ($questionMap) {
                    $questionId = is_array($question) ? (int) ($question['question_id'] ?? 0) : (int) $question;

                    return [
                        'question_id' => $questionId,
                        'description' => data_get($questionMap->get($questionId), 'description') ?? "Question #{$questionId}",
                    ];
                })
                ->filter(fn ($question) => ! empty($question['question_id']))
                ->values()
                ->all();

            if (empty($commentSection) && ! empty($legacyComments)) {
                $commentSection = collect($legacyComments)
                    ->map(function ($questionId) use ($questionMap) {
                        $questionId = (int) $questionId;

                        return [
                            'question_id' => $questionId,
                            'description' => data_get($questionMap->get($questionId), 'description') ?? "Question #{$questionId}",
                        ];
                    })
                    ->filter(fn ($question) => ! empty($question['question_id']))
                    ->values()
                    ->all();
            }

            return [(int) $row->id => [
                'id' => (int) $row->id,
                'questionnaire_code' => $row->code,
                'title' => $row->title,
                'questionnaire_type_name' => $row->questionnaire_type_name,
                'notes' => $row->notes,
                'scale_questions' => $scaleQuestions,
                'comment_section' => $commentSection,
            ]];
        })->all();
    }

    private function peerQuestionAverages(array $teacherAssignments, ?object $academicYear, ?int $questionnaireTypeId): array
    {
        if (empty($teacherAssignments) || ! $academicYear || ! $questionnaireTypeId || ! Schema::hasTable('evaluation_submissions')) {
            return [];
        }

        $teacherIds = array_values(array_unique(array_map('intval', array_keys($teacherAssignments))));
        $questionnaireIds = array_values(array_unique(array_map(
            fn ($assignment) => (int) ($assignment['questionnaire_id'] ?? 0),
            array_values($teacherAssignments)
        )));
        $branchIds = array_values(array_unique(array_map(
            fn ($assignment) => (int) ($assignment['branch_id'] ?? 0),
            array_values($teacherAssignments)
        )));

        $rows = DB::table('evaluation_submissions')
            ->select('id', 'branch_id', 'questionnaire_id', 'teacher_id', 'answers')
            ->where('academic_year_id', (int) $academicYear->id)
            ->where('questionnaire_type_id', $questionnaireTypeId)
            ->whereIn('teacher_id', $teacherIds)
            ->whereIn('questionnaire_id', $questionnaireIds)
            ->whereIn('branch_id', $branchIds)
            ->orderByDesc('id')
            ->get();

        $aggregates = [];

        foreach ($rows as $row) {
            $teacherId = (int) ($row->teacher_id ?? 0);
            $questionnaireId = (int) ($row->questionnaire_id ?? 0);
            $branchId = (int) ($row->branch_id ?? 0);
            $assignment = $teacherAssignments[$teacherId] ?? null;

            if (! $assignment || (int) ($assignment['questionnaire_id'] ?? 0) !== $questionnaireId || (int) ($assignment['branch_id'] ?? 0) !== $branchId) {
                continue;
            }

            $key = $teacherId . ':' . $questionnaireId;
            $answers = json_decode((string) ($row->answers ?? '[]'), true);

            if (! is_array($answers)) {
                continue;
            }

            foreach ($answers as $answer) {
                $questionId = (int) ($answer['question_id'] ?? 0);
                $rating = $answer['rating'] ?? null;

                if (! $questionId || ! is_numeric($rating)) {
                    continue;
                }

                $aggregates[$key][$questionId]['sum'] = ($aggregates[$key][$questionId]['sum'] ?? 0) + (float) $rating;
                $aggregates[$key][$questionId]['count'] = ($aggregates[$key][$questionId]['count'] ?? 0) + 1;
            }
        }

        return collect($aggregates)
            ->map(function ($questions) {
                return collect($questions)
                    ->mapWithKeys(function ($stats, $questionId) {
                        $count = (int) ($stats['count'] ?? 0);
                        $sum = (float) ($stats['sum'] ?? 0);

                        return [(string) $questionId => [
                            'average' => $count > 0 ? round($sum / $count, 2) : null,
                            'responses' => $count,
                        ]];
                    })
                    ->all();
            })
            ->all();
    }

    private function peerOverallFromAnswers($answers): ?float
    {
        $ratings = collect($this->peerQuestionRatingsFromAnswers($answers))->values();

        if ($ratings->isEmpty()) {
            return null;
        }

        return round($ratings->avg(), 2);
    }

    private function peerQuestionRatingsFromAnswers($answers): array
    {
        $items = json_decode((string) $answers, true);

        if (! is_array($items)) {
            return [];
        }

        return collect($items)
            ->filter(fn ($answer) => ! empty($answer['question_id']) && isset($answer['rating']) && is_numeric($answer['rating']))
            ->mapWithKeys(fn ($answer) => [(int) $answer['question_id'] => (float) $answer['rating']])
            ->all();
    }

    private function weightedPeerOverall(?array $questionnaire, array $questionRatings): ?float
    {
        $scaleGroups = collect($questionnaire['scale_questions'] ?? []);

        if ($scaleGroups->isEmpty()) {
            $flatRatings = collect($questionRatings)
                ->pluck('average')
                ->filter(fn ($value) => $value !== null)
                ->map(fn ($value) => (float) $value)
                ->values();

            return $flatRatings->isNotEmpty() ? round($flatRatings->avg(), 2) : null;
        }

        $weightedTotal = 0.0;
        $usedWeight = 0.0;

        foreach ($scaleGroups as $group) {
            $questions = collect($group['questions'] ?? []);
            $groupRatings = $questions
                ->map(function ($question) use ($questionRatings) {
                    $questionId = (int) ($question['question_id'] ?? 0);
                    $entry = $questionRatings[(string) $questionId] ?? $questionRatings[$questionId] ?? null;

                    return $entry['average'] ?? null;
                })
                ->filter(fn ($value) => $value !== null)
                ->map(fn ($value) => (float) $value)
                ->values();

            if ($groupRatings->isEmpty()) {
                continue;
            }

            $weight = (float) ($group['weight_percentage'] ?? 0);
            $groupAverage = (float) $groupRatings->avg();

            if ($weight > 0) {
                $weightedTotal += $groupAverage * ($weight / 100);
                $usedWeight += $weight;
            } else {
                $weightedTotal += $groupAverage;
                $usedWeight += 100;
            }
        }

        if ($usedWeight <= 0) {
            return null;
        }

        if ($usedWeight > 100) {
            return round($weightedTotal / ($usedWeight / 100), 2);
        }

        return round($weightedTotal, 2);
    }

    private function employeeQuery(Request $request)
    {
        $search     = $request->input('search', '');
        $schoolYear = $request->input('school_year', '');
        $branchId   = $this->scopedBranchId() ?? $request->input('branch_id');
        $employeeDepartmentId = $request->input('employee_department_id', '');
        $archived   = $request->boolean('archived');
        $academicYearId = $this->ratingsAcademicYearId($request);

        return DB::table('ratings_employee as re')
            ->where('re.is_archived', $archived ? 1 : 0)
            ->leftJoin('employee as e', 're.employee_id', '=', 'e.id')
            ->leftJoin('employee_department as ed', 'e.employee_department_id', '=', 'ed.id')
            ->leftJoin('academic_year as ay', 're.academic_year_id', '=', 'ay.id')
            ->select(
                're.id as rating_id',
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as teacher_name"),
                'ed.name as department_name',
                DB::raw("JSON_UNQUOTE(JSON_EXTRACT(re.overall_ratings, '$.average')) as overall_rating"),
                're.submission_count',
                're.item_ratings',
                DB::raw("CONCAT(ay.from_year, '-', ay.to_year) as school_year")
            )
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->when($academicYearId, fn ($q) => $q->where('re.academic_year_id', $academicYearId))
            ->when($employeeDepartmentId, fn ($q) => $q->where('e.employee_department_id', $employeeDepartmentId))
            ->when($search, fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('e.firstname', 'like', "%{$search}%")
                    ->orWhere('e.lastname', 'like', "%{$search}%")
                    ->orWhere('ed.name', 'like', "%{$search}%");
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

    private function recordExport(Request $request, string $report, int $recordCount): void
    {
        AuditLogger::record('report.exported', $report, null, [
            'report' => $report,
            'school_year' => $request->input('school_year') ?: 'All School Years',
            'record_count' => $recordCount,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_group',
                'program_group',
                'strand_group',
                'employee_department_id',
            ]),
        ], $request);
    }
}
