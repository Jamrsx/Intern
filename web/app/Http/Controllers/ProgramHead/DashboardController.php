<?php

namespace App\Http\Controllers\ProgramHead;

class DashboardController extends \App\Http\Controllers\Dean\DashboardController
{
    protected function deanPortalKey(): string
    {
        return 'programhead';
    }
}
