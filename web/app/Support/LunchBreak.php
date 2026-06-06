<?php

namespace App\Support;

use Carbon\CarbonInterface;

class LunchBreak
{
    public const LUNCH_TIME = '12:00:00';

    public const AFTERNOON_START_TIME = '13:00:00';

    public static function lunchAt(CarbonInterface $day): CarbonInterface
    {
        return self::applyTimeOnDay($day, self::LUNCH_TIME);
    }

    public static function afternoonStartAt(CarbonInterface $day): CarbonInterface
    {
        return self::applyTimeOnDay($day, self::AFTERNOON_START_TIME);
    }

    public static function isWithinLunchBreakWindow(CarbonInterface $moment): bool
    {
        $lunchAt = self::lunchAt($moment);
        $afternoonStart = self::afternoonStartAt($moment);

        return $moment->gte($lunchAt) && $moment->lt($afternoonStart);
    }

    public static function lunchTimeLabel(): string
    {
        return self::lunchAt(now())->format('g:i A');
    }

    public static function afternoonStartLabel(): string
    {
        return self::afternoonStartAt(now())->format('g:i A');
    }

    /**
     * @return array<string, string>
     */
    public static function toStatusPayload(): array
    {
        return [
            'lunch_time' => '12:00',
            'lunch_time_label' => self::lunchTimeLabel(),
            'afternoon_start_time' => '13:00',
            'afternoon_start_label' => self::afternoonStartLabel(),
            'policy_message' => sprintf(
                'Morning sessions auto time-out at %s for lunch. Time in again at %s. Time out manually when you finish in the afternoon.',
                self::lunchTimeLabel(),
                self::afternoonStartLabel(),
            ),
        ];
    }

    private static function applyTimeOnDay(CarbonInterface $day, string $time): CarbonInterface
    {
        [$hour, $minute, $second] = array_pad(explode(':', $time), 3, '00');

        return $day->copy()->startOfDay()->setTime(
            (int) $hour,
            (int) $minute,
            (int) $second,
        );
    }
}
