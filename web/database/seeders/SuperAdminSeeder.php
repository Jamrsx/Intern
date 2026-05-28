<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $role = Role::query()->where('name', 'super_admin')->first();

        if ($role === null) {
            $this->command?->error('Super Admin role not found. Run RoleSeeder first.');

            return;
        }

        $email = (string) env('SUPER_ADMIN_EMAIL', 'superadmin@occ.edu.ph');

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => (string) env('SUPER_ADMIN_NAME', 'Super Admin'),
                'password' => (string) env('SUPER_ADMIN_PASSWORD', 'password'),
                'role_id' => $role->id,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        $this->command?->info("Super Admin seeded: {$email}");
    }
}
