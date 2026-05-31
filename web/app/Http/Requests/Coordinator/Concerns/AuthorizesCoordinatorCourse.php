<?php

namespace App\Http\Requests\Coordinator\Concerns;

trait AuthorizesCoordinatorCourse
{
    protected function coordinatorCourseId(): ?int
    {
        return $this->user()?->coordinatorCourse()?->id;
    }

    protected function coordinatorSectionId(): ?int
    {
        return $this->user()?->activeCoordinatorSection()?->id;
    }

    protected function isCoordinatorWithCourse(): bool
    {
        return ($this->user()?->hasRole('coordinator') ?? false)
            && $this->coordinatorSectionId() !== null;
    }
}
