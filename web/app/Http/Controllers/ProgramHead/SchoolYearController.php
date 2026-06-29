<?php

namespace App\Http\Controllers\ProgramHead;

class SchoolYearController extends \App\Http\Controllers\Dean\SchoolYearController
{
    protected function deanPortalKey(): string
    {
        return 'programhead';
    }
}
