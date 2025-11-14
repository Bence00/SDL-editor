<?php
// api/save_diagram.php

// Allow JSON POST from same origin
header('Content-Type: application/json; charset=utf-8');

// Simple CORS for dev; tighten in prod if needed
// header('Access-Control-Allow-Origin: http://localhost:8000');

$raw = file_get_contents('php://input');
if ($raw === false) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No input']);
    exit;
}

$data = json_decode($raw, true);
if ($data === null) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

// Very light validation – adjust as needed
if (!isset($data['nodes']) || !is_array($data['nodes'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing nodes']);
    exit;
}
if (!isset($data['edges']) || !is_array($data['edges'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing edges']);
    exit;
}

// Optional: name parameter to support multiple diagrams
$name = isset($_GET['name']) ? $_GET['name'] : 'default';
$name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name); // sanitize

$baseDir = __DIR__ . '/../data/diagrams';
if (!is_dir($baseDir)) {
    mkdir($baseDir, 0777, true);
}

$filePath = $baseDir . '/' . $name . '.json';

// Pretty-print for easier debugging
$json = json_encode($data, JSON_PRETTY_PRINT);
if ($json === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to encode JSON']);
    exit;
}

if (file_put_contents($filePath, $json) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to write file']);
    exit;
}

echo json_encode(['ok' => true, 'file' => $name . '.json']);
