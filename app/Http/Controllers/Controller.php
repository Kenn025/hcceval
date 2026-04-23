<?php

namespace App\Http\Controllers;

abstract class Controller
{
    protected function adminRole(): string
    {
        return session('admin_role', 'admin');
    }

    protected function adminBranchId(): ?int
    {
        $id = session('admin_branch_id');
        return $id !== null ? (int) $id : null;
    }

    protected function isSuperAdmin(): bool
    {
        return $this->adminRole() === 'superadmin';
    }

    protected function isOverallAdmin(): bool
    {
        return $this->adminRole() === 'overalladmin';
    }

    protected function isBranchAdmin(): bool
    {
        return $this->adminRole() === 'admin';
    }

    /** Returns the branch_id to enforce if this is a branch admin, or null for full access. */
    protected function scopedBranchId(): ?int
    {
        return $this->isBranchAdmin() ? $this->adminBranchId() : null;
    }
}
