<?php
// api/delete_diagram.php

header('Content-Type: application/json; charset=utf-8');

// Diagram name via GET or POST
$name = isset($_REQUEST['name']) ? $_REQUEST['name'] : null;

if ($name === null || $name === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing name']);
    exit;
}

// Sanitize file name
$name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name);

$filePath = __DIR__ . '/../data/diagrams/' . $name . '.json';

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Diagram not found']);
    exit;
}

if (!unlink($filePath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to delete']);
    exit;
}

echo json_encode(['ok' => true, 'deleted' => $name]);


