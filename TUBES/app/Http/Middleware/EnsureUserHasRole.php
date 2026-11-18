<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authorization berbasis role.
 *
 * Pemakaian pada route:  ->middleware('role:admin')  atau  ->middleware('role:admin,user')
 * Role yang tidak cocok mendapat HTTP 403 (JSON untuk request AJAX).
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        abort_unless($user->hasRole(...$roles), 403, 'Anda tidak memiliki hak akses ke halaman ini.');

        return $next($request);
    }
}
