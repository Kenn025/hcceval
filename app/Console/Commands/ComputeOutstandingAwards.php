<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ComputeOutstandingAwards extends Command
{
    protected $signature = 'eval:outstanding {--academic-year= : Target academic_year.id (defaults to active cycle)} {--limit=5 : Top N per category}';

    protected $description = 'Compute outstanding teachers / chairs / programs / strands from current ratings and store into overall_ratings';

    public function handle(): int
    {
        $academicYearId = $this->option('academic-year')
            ? (int) $this->option('academic-year')
            : DB::table('academic_year')->where('is_activated', 1)->orderByDesc('from_year')->value('id');

        if (! $academicYearId) {
            $this->error('No academic year provided or active.');
            return self::FAILURE;
        }

        $limit = max(1, (int) $this->option('limit'));
        $branches = DB::table('branch')->where('is_activated', 1)->where('is_deleted', 0)->pluck('id');

        foreach ($branches as $branchId) {
            $outstandingTeacher = $this->topTeachers($academicYearId, $branchId, $limit);
            $outstandingChair   = $this->topChairs($academicYearId, $branchId, $limit);
            $outstandingProgram = $this->topPrograms($academicYearId, $branchId, $limit);
            $outstandingStrand  = $this->topStrands($academicYearId, $branchId, $limit);

            $row = DB::table('overall_ratings')
                ->where('branch_id', $branchId)
                ->where('academic_year_id', $academicYearId)
                ->first();

            $payload = [
                'outstanding_teacher' => json_encode($outstandingTeacher),
                'outstanding_chair'   => json_encode($outstandingChair),
                'outstanding_program' => json_encode($outstandingProgram),
                'outstanding_strand'  => json_encode($outstandingStrand),
                'updated_at'          => now(),
            ];

            if ($row) {
                DB::table('overall_ratings')->where('id', $row->id)->update($payload);
            } else {
                DB::table('overall_ratings')->insert(array_merge($payload, [
                    'branch_id'        => $branchId,
                    'academic_year_id' => $academicYearId,
                    'is_activated'     => 1,
                    'is_deleted'       => 0,
                    'created_at'       => now(),
                ]));
            }

            $this->info("Branch #{$branchId}: wrote awards (" . count($outstandingTeacher) . " teachers, " . count($outstandingChair) . " chairs).");
        }

        return self::SUCCESS;
    }

    private function topTeachers(int $academicYearId, int $branchId, int $limit): array
    {
        return DB::table('ratings_subject as rs')
            ->join('employee as e', 'rs.employee_id', '=', 'e.id')
            ->where('rs.academic_year_id', $academicYearId)
            ->where('e.branch_id', $branchId)
            ->select(
                'e.id',
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as score")
            )
            ->groupBy('e.id', 'e.firstname', 'e.lastname')
            ->orderByDesc('score')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'score' => round((float) $r->score, 2)])
            ->toArray();
    }

    private function topChairs(int $academicYearId, int $branchId, int $limit): array
    {
        return DB::table('ratings_head as rh')
            ->join('employee as e', 'rh.employee_id', '=', 'e.id')
            ->where('rh.academic_year_id', $academicYearId)
            ->where('e.branch_id', $branchId)
            ->select(
                'e.id',
                DB::raw("CONCAT(e.firstname, ' ', e.lastname) as name"),
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rh.overall_ratings, '$.average'))) as score")
            )
            ->groupBy('e.id', 'e.firstname', 'e.lastname')
            ->orderByDesc('score')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'score' => round((float) $r->score, 2)])
            ->toArray();
    }

    private function topPrograms(int $academicYearId, int $branchId, int $limit): array
    {
        return DB::table('ratings_subject as rs')
            ->join('employee as e', 'rs.employee_id', '=', 'e.id')
            ->join('program as p', 'p.id', '=', 'e.program_id')
            ->where('rs.academic_year_id', $academicYearId)
            ->where('e.branch_id', $branchId)
            ->select(
                'p.id',
                'p.name',
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as score")
            )
            ->groupBy('p.id', 'p.name')
            ->orderByDesc('score')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'score' => round((float) $r->score, 2)])
            ->toArray();
    }

    private function topStrands(int $academicYearId, int $branchId, int $limit): array
    {
        return DB::table('ratings_subject as rs')
            ->join('employee as e', 'rs.employee_id', '=', 'e.id')
            ->join('strand as s', 's.id', '=', 'e.strand_id')
            ->where('rs.academic_year_id', $academicYearId)
            ->where('e.branch_id', $branchId)
            ->select(
                's.id',
                's.name',
                DB::raw("AVG(JSON_UNQUOTE(JSON_EXTRACT(rs.overall_ratings, '$.average'))) as score")
            )
            ->groupBy('s.id', 's.name')
            ->orderByDesc('score')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'score' => round((float) $r->score, 2)])
            ->toArray();
    }
}
