<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class SupervisorController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('deans/supervisors');
    }
}
