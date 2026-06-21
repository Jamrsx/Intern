<?php

use Illuminate\Support\Facades\Schema;

it('creates intern tracking tables', function () {
    $tables = [
        'roles',
        'courses',
        'course_majors',
        'sections',
        'companies',
        'departments',
        'students',
        'supervisors',
        'document_types',
        'student_documents',
        'time_logs',
        'student_placement_histories',
        'student_face_profiles',
        'ojt_schedules',
    ];

    foreach ($tables as $table) {
        expect(Schema::hasTable($table))->toBeTrue("Expected table [{$table}] to exist.");
    }

    expect(Schema::hasColumns('users', ['role_id', 'is_active']))->toBeTrue();
});
