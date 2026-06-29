<?php

namespace App\Http\Controllers\ProgramHead;

class SectionController extends \App\Http\Controllers\Dean\SectionController
{
    protected function deanPortalKey(): string
    {
        return 'programhead';
    }
}
