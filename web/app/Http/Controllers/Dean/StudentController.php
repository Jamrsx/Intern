<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('deans/students');
    }
}
