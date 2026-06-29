<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

trait ResolvesDeanPortalPresentation
{
    protected function deanPortalKey(): string
    {
        return 'deans';
    }

    protected function deanPortalRender(string $page, array $props = []): Response
    {
        return Inertia::render("{$this->deanPortalKey()}/{$page}", $props);
    }

    protected function deanPortalRedirect(string $route, array $parameters = []): RedirectResponse
    {
        return redirect()->route("{$this->deanPortalKey()}.{$route}", $parameters);
    }
}
