<?php
// Öffentlich: Inhalte der Website (Texte, Projekte) für js/main.js
require __DIR__ . '/lib.php';

ensureStorage();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
readfile(CONTENT . '/data.json');
