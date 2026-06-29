<?php

namespace App\Http\Controllers\ProgramHead;

class CoordinatorController extends \App\Http\Controllers\Dean\CoordinatorController
{
    protected function deanPortalKey(): string
    {
        return 'programhead';
    }
}
