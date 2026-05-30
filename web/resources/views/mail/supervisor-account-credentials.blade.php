<x-mail::message>
# Welcome, {{ $supervisor->name }}

Your supervisor account for **{{ config('app.name') }}** has been set up. Use the details below to sign in.

<x-mail::panel>
**Email:** {{ $supervisor->email }}

@if($companyName)
**Company:** {{ $companyName }}
@endif

@if($departmentName)
**Department:** {{ $departmentName }}
@endif

**Temporary password:** {{ $plainPassword }}
</x-mail::panel>

<x-mail::button :url="$loginUrl">
Sign In
</x-mail::button>

Please change your password after your first login.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
