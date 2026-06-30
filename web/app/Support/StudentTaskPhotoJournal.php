<?php

namespace App\Support;

use App\Models\Student;
use App\Models\TimeLog;
use App\Models\TimeLogTaskPhoto;
use App\Services\TimeLogTaskPhotoService;
use Illuminate\Support\Carbon;

class StudentTaskPhotoJournal
{
    /**
     * @param  callable(TimeLogTaskPhoto): string  $imageUrlResolver
     * @return list<array<string, mixed>>
     */
    public static function forStudent(Student $student, callable $imageUrlResolver): array
    {
        $logs = TimeLog::query()
            ->where('student_id', $student->id)
            ->whereHas(
                'taskPhotos',
                fn ($query) => $query->where('status', TimeLogTaskPhoto::STATUS_SUBMITTED),
            )
            ->with(['taskPhotos' => fn ($query) => $query
                ->where('status', TimeLogTaskPhoto::STATUS_SUBMITTED)
                ->orderBy('id')])
            ->orderByDesc('time_in')
            ->get();

        /** @var array<string, array<string, mixed>> $byDate */
        $byDate = [];

        foreach ($logs as $log) {
            $dateKey = $log->time_in->toDateString();
            $sessionPeriod = $log->session_period
                ?? TimeLogTaskPhotoService::resolveSessionPeriod($log->time_in);

            if (! isset($byDate[$dateKey])) {
                $byDate[$dateKey] = [
                    'date' => $dateKey,
                    'date_label' => Carbon::parse($dateKey)->format('F j, Y'),
                    'sessions' => [],
                ];
            }

            $byDate[$dateKey]['sessions'][] = [
                'time_log_id' => $log->id,
                'session_period' => $sessionPeriod,
                'session_label' => $sessionPeriod === 'morning'
                    ? 'Morning session'
                    : 'Afternoon session',
                'time_in' => $log->time_in->toIso8601String(),
                'time_out' => $log->time_out?->toIso8601String(),
                'time_in_label' => $log->time_in->format('g:i A'),
                'time_out_label' => $log->time_out?->format('g:i A'),
                'photos' => $log->taskPhotos
                    ->map(fn (TimeLogTaskPhoto $photo) => [
                        'id' => $photo->id,
                        'original_filename' => $photo->original_filename,
                        'mime_type' => $photo->mime_type,
                        'file_size' => $photo->file_size,
                        'submitted_at' => $photo->submitted_at?->toIso8601String(),
                        'image_url' => $imageUrlResolver($photo),
                    ])
                    ->values()
                    ->all(),
            ];
        }

        $days = array_values($byDate);

        usort($days, fn (array $left, array $right) => strcmp($right['date'], $left['date']));

        foreach ($days as &$day) {
            usort(
                $day['sessions'],
                function (array $left, array $right): int {
                    if ($left['session_period'] === $right['session_period']) {
                        return strcmp($left['time_in'], $right['time_in']);
                    }

                    return $left['session_period'] === 'morning' ? -1 : 1;
                },
            );
        }
        unset($day);

        return $days;
    }
}
