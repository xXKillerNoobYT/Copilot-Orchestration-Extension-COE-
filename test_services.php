<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

try {
    $loopScheduler = app()->make(App\Services\LoopSchedulerService::class);
    echo "LoopSchedulerService: OK\n";
} catch (Throwable $e) {
    echo "LoopSchedulerService ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

try {
    $agentSwitch = app()->make(App\Services\AgentSwitchService::class);
    echo "AgentSwitchService: OK\n";
} catch (Throwable $e) {
    echo "AgentSwitchService ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
