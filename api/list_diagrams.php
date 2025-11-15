<?php
header('Content-Type: application/json');

$dir = __DIR__ . '/../data/diagrams';
if (!is_dir($dir)) {
    echo json_encode(['ok' => false, 'error' => 'Directory not found']);
    exit;
}

$files = glob($dir . '/*.json');
$names = array_map(function ($path) {
    return basename($path, '.json');
}, $files);

echo json_encode([
    'ok' => true,
    'names' => array_values($names),
]);
