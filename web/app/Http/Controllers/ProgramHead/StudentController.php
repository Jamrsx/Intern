<?php

namespace App\Http\Controllers\ProgramHead;

class StudentController extends \App\Http\Controllers\Dean\StudentController
{
    protected function deanPortalKey(): string
    {
        return 'programhead';
    }
}
