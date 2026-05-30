<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'address',
        'contact_person',
        'contact_email',
        'contact_phone',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Department, $this>
     */
    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    /**
     * @return HasMany<Supervisor, $this>
     */
    public function supervisors(): HasMany
    {
        return $this->hasMany(Supervisor::class);
    }
}
