<?php

namespace App\Concerns;

use App\Models\Section;
use App\Support\DeanPortalScope;

trait AuthorizesDeanPortal
{
    protected function authorizedForDeanPortal(): bool
    {
        $user = $this->user();

        return $user !== null
            && DeanPortalScope::isPortalUser($user)
            && DeanPortalScope::course($user) !== null;
    }

    protected function sectionInDeanPortalScope(Section $section): bool
    {
        $user = $this->user();

        return $user !== null && DeanPortalScope::sectionBelongsToScope($user, $section);
    }
}
