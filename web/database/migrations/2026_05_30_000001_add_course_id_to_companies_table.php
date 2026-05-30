<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('companies', 'course_id')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->foreignId('course_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('courses')
                    ->nullOnDelete();
            });

            $companyCourseMap = DB::table('students')
                ->join('sections', 'students.section_id', '=', 'sections.id')
                ->whereNotNull('students.company_id')
                ->select('students.company_id', DB::raw('MIN(sections.course_id) as course_id'))
                ->groupBy('students.company_id')
                ->get();

            foreach ($companyCourseMap as $row) {
                DB::table('companies')
                    ->where('id', $row->company_id)
                    ->whereNull('course_id')
                    ->update(['course_id' => $row->course_id]);
            }
        }

        if (! $this->courseNameUniqueIndexExists()) {
            Schema::table('companies', function (Blueprint $table) {
                $table->unique(['course_id', 'name']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if ($this->courseNameUniqueIndexExists()) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropUnique(['course_id', 'name']);
            });
        }

        if (Schema::hasColumn('companies', 'course_id')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropConstrainedForeignId('course_id');
            });
        }
    }

    private function courseNameUniqueIndexExists(): bool
    {
        return collect(Schema::getIndexes('companies'))
            ->contains(fn (array $index) => $index['unique'] === true
                && collect($index['columns'])->sort()->values()->all() === ['course_id', 'name']);
    }
};
