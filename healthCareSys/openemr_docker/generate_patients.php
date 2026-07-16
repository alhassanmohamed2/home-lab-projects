<?php
/**
 * Quick Patient Generator for FHIR Testing
 * Run inside container: php generate_patients.php
 */

if (php_sapi_name() !== 'cli') {
    die("CLI only");
}

$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_URI'] = '/';
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$_SESSION['site_id'] = 'default';
$_SESSION['authUser'] = 'admin';

// Strict bypass variables for globals.php
$ignoreAuth = true;
$ignoreAuth_onsite_portal = true;
$GLOBALS['ignore_auth'] = true; // Legacy backup

require_once 'interface/globals.php';
// library/sql.inc.php is included by globals.php
require_once 'library/patient.inc';

$PROV_ID = 1; // Admin
$COUNT = 50;

function uuidv4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); 
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); 
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function rand_date($start_year = 1950, $end_year = 2000) {
    $timestamp = mt_rand(strtotime("$start_year-01-01"), strtotime("$end_year-12-31"));
    return date("Y-m-d", $timestamp);
}

function sqlInsertManual($table, $data) {
    $fields = array_keys($data);
    $values = array_values($data);
    $q = "INSERT INTO $table (" . implode(',', $fields) . ") VALUES (" . implode(',', array_fill(0, count($values), '?')) . ")";
    $res = sqlStatement($q, $values);
    $id_row = sqlQuery("SELECT LAST_INSERT_ID() as id");
    return $id_row['id'];
}

$names_m = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles'];
$names_f = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
$surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

$problems = ['Hypertension', 'Diabetes Mellitus Type 2', 'Asthma', 'Hyperlipidemia', 'GERD', 'Anxiety', 'Depression'];
$meds = ['Lisinopril 10mg', 'Metformin 500mg', 'Albuterol Inhaler', 'Atorvastatin 20mg', 'Omeprazole 20mg', 'Sertraline 50mg'];
$allergies = ['Penicillin', 'Sulfa Drugs', 'Peanuts', 'Shellfish', 'Latex', 'Bee Stings'];

$max_row = sqlQuery("SELECT MAX(pid) as m FROM patient_data");
$start_pid = ($max_row['m'] ?? 0) + 1;

echo "Generating $COUNT patients starting at PID $start_pid...\n";

for ($i = 0; $i < $COUNT; $i++) {
    $current_pid = $start_pid + $i;
    $sex = (mt_rand(0, 1) ? 'Male' : 'Female');
    $fname = ($sex == 'Male' ? $names_m[array_rand($names_m)] : $names_f[array_rand($names_f)]);
    $lname = $surnames[array_rand($surnames)];
    $dob = rand_date();
    $uuid = uuidv4();
    
    // 1. Patient Data
    // Note: pubpid is usually set by sqlInsertPatient usually, but we do manual strict insert
    
    $table_id = sqlInsertManual('patient_data', [
        'pid' => $current_pid,
        'pubpid' => $current_pid,
        'fname' => $fname,
        'lname' => $lname,
        'sex' => $sex,
        'DOB' => $dob,
        'date' => date('Y-m-d H:i:s'),
        'providerID' => $PROV_ID,
        'uuid' => $uuid
    ]);
    
    // Use the manual PID for references
    $pid = $current_pid;
    
    echo "Created Patient: $fname $lname (PID: $pid)\n";
    
    // 2. Encounter
    $enc_date = date('Y-m-d H:i:s');
    $encounter_id = sqlInsertManual('form_encounter', [
        'date' => $enc_date,
        'pid' => $pid,
        'provider_id' => $PROV_ID,
        'encounter' => $pid . time(), // unique enough
        'reason' => 'Routine Checkup'
    ]);
    
    // 3. Vitals (form_vitals)
    sqlInsertManual('form_vitals', [
        'date' => $enc_date,
        'pid' => $pid,
        'user' => 'admin',
        'bps' => mt_rand(110, 150),
        'bpd' => mt_rand(70, 90),
        'weight' => mt_rand(150, 250),
        'height' => mt_rand(60, 75),
        'pulse' => mt_rand(60, 100),
        'temperature' => mt_rand(97, 99) . '.' . mt_rand(0,9),
        'activity' => 1
    ]);
    
    // 4. Clinical Notes / Lists
    // Problem
    sqlInsertManual('lists', [
        'date' => $enc_date,
        'pid' => $pid,
        'type' => 'medical_problem',
        'title' => $problems[array_rand($problems)],
        'begdate' => rand_date(2010, 2023),
        'outcome' => 0
    ]);
    
    // Medication
    sqlInsertManual('lists', [
        'date' => $enc_date,
        'pid' => $pid,
        'type' => 'medication',
        'title' => $meds[array_rand($meds)],
        'begdate' => rand_date(2020, 2024),
        'outcome' => 0
    ]);
    
    // Allergy (50% chance)
    if (mt_rand(0, 1)) {
        sqlInsertManual('lists', [
            'date' => $enc_date,
            'pid' => $pid,
            'type' => 'allergy',
            'title' => $allergies[array_rand($allergies)],
            'begdate' => rand_date(2010, 2020),
            'outcome' => 0
        ]);
    }
}

echo "Generation Complete.\n";
