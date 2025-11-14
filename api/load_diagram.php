<?php
// api/load_diagram.php

header('Content-Type: application/json; charset=utf-8');

// Optional: name parameter
$name = isset($_GET['name']) ? $_GET['name'] : 'default';
$name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name);

$filePath = __DIR__ . '/../data/diagrams/' . $name . '.json';

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Diagram not found']);
    exit;
}

$json = file_get_contents($filePath);
if ($json === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to read file']);
    exit;
}

$data = json_decode($json, true);
if ($data === null) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Corrupted JSON']);
    exit;
}

echo json_encode([
    'ok' => true,
    'diagram' => $data
]);
