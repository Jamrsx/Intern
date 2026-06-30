<?php

namespace App\Support;

use Carbon\CarbonInterface;

class OjtWorkDayCalendar
{
    public const AFTERNOON_END_TIME = '17:00:00';

    /**
     * Work days are consecutive from Monday based on days_per_week.
     * 4 = Mon–Thu, 5 = Mon–Fri, 6 = Mon–Sat, 7 = Mon–Sun.
     */
    public static function isScheduledWeekday(int $daysPerWeek, CarbonInterface $date): bool
    {
        $daysPerWeek = max(1, min(7, $daysPerWeek));
        $isoWeekday = $date->dayOfWeekIso;

        return $isoWeekday >= 1 && $isoWeekday <= $daysPerWeek;
    }

    public static function scheduleLabel(int $daysPerWeek): string
    {
        return match ($daysPerWeek) {
            4 => 'Monday–Thursday',
            5 => 'Monday–Friday',
            6 => 'Monday–Saturday',
            7 => 'Monday–Sunday',
            default => sprintf('Monday + %d days/week', $daysPerWeek),
        };
    }

    public static function afternoonEndAt(CarbonInterface $day): CarbonInterface
    {
        [$hour, $minute, $second] = array_pad(explode(':', self::AFTERNOON_END_TIME), 3, '00');

        return $day->copy()->startOfDay()->setTime(
            (int) $hour,
            (int) $minute,
            (int) $second,
        );
    }

    public static function isAbsenceCutoffReached(CarbonInterface $moment): bool
    {
        if (! $moment->isToday()) {
            return true;
        }

        return $moment->gte(self::afternoonEndAt($moment));
    }
}
