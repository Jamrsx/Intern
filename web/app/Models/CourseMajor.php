<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseMajor extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'course_id',
        'name',
        'code',
        'program_head_name',
        'sort_order',
    ];

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
