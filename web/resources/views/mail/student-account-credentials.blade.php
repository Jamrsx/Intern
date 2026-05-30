<x-mail::message>
# Welcome, {{ $student->fullName() }}

Your intern account for **{{ config('app.name') }}** has been set up. Use the details below to sign in.

<x-mail::panel>
**Student ID:** {{ $student->student_number }}

**Email:** {{ $student->user->email }}

**Temporary password:** {{ $plainPassword }}
</x-mail::panel>

<x-mail::button :url="$loginUrl">
Sign In
</x-mail::button>

Please change your password after your first login.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
