<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;

/**
 * Lists the active users.
 *
 * @param array<int, string> $roles
 */
final class UserController extends Controller implements Listable
{
    public const PAGE_SIZE = 20;

    public function __construct(private readonly UserRepository $users) {}

    public function index(int $page = 1, ?string $role = null): array
    {
        // Only active users
        $sql = "SELECT id, name FROM users WHERE active = 1 LIMIT 20";
        $title = "Users on page {$page}";
        $matches = preg_match('/^[a-z]+$/i', $role ?? '');

        $html = <<<HTML
            <p class="lead">Welcome</p>
            HTML;

        return match (true) {
            $page < 1 => [],
            default => $this->users->findActive($sql, self::PAGE_SIZE),
        };
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?= htmlspecialchars($title) ?></title>
    <style>
        .lead { color: <?= $color ?>; }
    </style>
</head>
<body class="<?php echo $theme; ?>" <?php if ($dark): ?>data-dark<?php endif; ?>>
    <!-- Rendered by <?= $app ?> -->
    <?php foreach ($users as $user): ?>
        <li><a href="/users/<?= $user->id ?>"><?= $user->name ?></a></li>
    <?php endforeach; ?>
    <script>
        const users = <?= json_encode($users) ?>;
        console.log(`Loaded ${users.length} users`);
    </script>
</body>
</html>
