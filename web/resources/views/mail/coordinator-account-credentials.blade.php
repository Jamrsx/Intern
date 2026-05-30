<x-mail::message>
# Welcome, {{ $coordinator->name }}

Your coordinator account for **{{ config('app.name') }}** has been set up. Use the details below to sign in.

<x-mail::panel>
**Email:** {{ $coordinator->email }}

@if($sectionName)
**Section:** {{ $sectionName }}
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
