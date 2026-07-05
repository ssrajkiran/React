<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
// Ensure we have 'ids' in GET request
if (!isset($_GET['ids']) || empty($_GET['ids'])) {
    die("No employee IDs received!");
}
/* mysql Connection String Change Here Start*/
$mysqli = new mysqli("localhost",'root','Te@mEr9!','hrms');

// Process Employee IDs
$emp_salary_upload_ids = explode(',', $_GET['ids']);
$emp_salary_upload_ids = array_map('intval', $emp_salary_upload_ids);

// Ensure valid IDs exist
if (empty($emp_salary_upload_ids)) {
    die("Invalid Employee IDs!");
}

// Create placeholders for SQL query
$placeholders = implode(',', array_fill(0, count($emp_salary_upload_ids), '?'));
$types = str_repeat('i', count($emp_salary_upload_ids)); // 'i' for integer


$sql = "SELECT a.id,a.empcode, a.empname, a.doj,b.birthday,a.category,c.designation,d.name, a.department_id, a.email,a.mobileno,b.email as personalmobileno,b.mobile_no, b.gender, a.division_id, a.unit_id, a.employment_type, a.status,b.martialstatus,e.acnumber,e.ifsc,f.pincodetwo, f.addfieldtwo1,f.addfieldtwo2,f.addfieldtwo3, f.addfieldtwo4, f.addfieldtwo5, f.districttwo, f.statetwo FROM emp_details AS a JOIN emp_personaldetails AS b ON a.id=b.empid JOIN designation AS c ON c.id = a.designation_id JOIN department AS d ON d.id = a.department_id JOIN emp_bankdetails AS e ON e.empid = a.id JOIN emp_address AS f ON f.empid = a.id where a.status = 'Active' and a.netsuite_status = 0 and a.id IN ($placeholders)";


$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    die("Prepare failed: " . $mysqli->error);
}
//echo $stmt->error;
// Bind parameters dynamically
$params = [$types];
foreach ($emp_salary_upload_ids as &$id) { // Pass by reference
    $params[] = &$id;
}
call_user_func_array([$stmt, 'bind_param'], $params);

if (!$stmt->execute()) {
    die("Execute failed: " . $stmt->error);
}
$result = $stmt->get_result();

$empDetails = $result;

$oauth_signature_method = "HMAC-SHA256";
$realm = '9785644';
$oauth_consumer_key = "8406c69b0ca560f4644c040135d3bc79eb04b045e48aeff3c846343783c907d2";
$oauth_consumer_secret = "7ca5d9e970025981e232c958806a7c8581646897a472a197a81107d7473d1d37";
$oauth_token = "40f8505889c2fcd763b5e69480ff33711dc356a1bd274520cc64b77923bdee25"; 
$oauth_token_secret = "810855d177be3c11684097c66aa5071b06d09a5fd6e892ec2a3fb35cc30aabf9";
$oauth_version = "1.0";

while($empDetail = $empDetails->fetch_object()){

$oauth_timestamp = time();
$oauth_nonce = time();
$url = "https://9785644.suitetalk.api.netsuite.com/services/rest/record/v1/employee/eid:$empDetail->empcode";
// Base string needs to include all query parameters in the correct order
$params = [
    'oauth_consumer_key' => $oauth_consumer_key,
    'oauth_nonce' => $oauth_nonce,
    'oauth_signature_method' => $oauth_signature_method,
    'oauth_timestamp' => $oauth_timestamp,
    'oauth_token' => $oauth_token,
    'oauth_version' => $oauth_version,
];
$base_string = "GET&" . rawurlencode($url) . "&" . rawurlencode(http_build_query($params, '', '&', PHP_QUERY_RFC3986));
// Correct HMAC signature calculation with the token secret appended
$signing_key = rawurlencode($oauth_consumer_secret) . '&' . rawurlencode($oauth_token_secret);
$oauth_signature = base64_encode(hash_hmac("sha256", $base_string, $signing_key, true));
$oauth_signature = rawurlencode($oauth_signature);

$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  //CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'GET',
 // CURLOPT_POSTFIELDS => json_encode($data),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: OAuth realm="'.$realm.'", oauth_consumer_key="'.$oauth_consumer_key.'", oauth_token="'.$oauth_token.'", oauth_signature_method="'.$oauth_signature_method.'", oauth_timestamp="'.$oauth_timestamp.'", oauth_nonce="'.$oauth_nonce.'", oauth_version="'.$oauth_version.'", oauth_signature="'.$oauth_signature.'"'
  ),
));
$response = curl_exec($curl);
$http_status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

$response_data = json_decode($response, true);

//echo "HTTP Status: " . $http_status . "<br/>";
//echo "Response: " . $response . "<br/>";
//print_r($response_data);


if ($http_status == 200 && !empty($response_data)) {
	//echo "Employee Processed: " . $empDetail->empcode . "<br/>";
	$sqls = "UPDATE `hrms`.`emp_details` SET `netsuite_status` = '1' WHERE `emp_details`.`empcode` = '".$empDetail->empcode."'";		
	if ($mysqli->query($sqls) === TRUE) {
		echo "Record updated successfully for empcode: " . $empDetail->empcode . "<br/>";
	} else {
		echo "Error updating record: " . $mysqli->error . "<br/>";
	}
}else{
	
$mysqlis = new mysqli("localhost",'root','Te@mEr9!','hrms');
/* End */
$sqls = "SELECT a.id,a.empcode, a.empname, a.doj,b.birthday,a.category,c.designation,d.name, a.department_id, a.email,a.mobileno,b.email as personalmobileno,b.mobile_no, b.gender, a.division_id, a.unit_id, a.employment_type, a.status,b.martialstatus,e.acnumber,e.ifsc,f.pincodetwo, f.addfieldtwo1,f.addfieldtwo2,f.addfieldtwo3, f.addfieldtwo4, f.addfieldtwo5, f.districttwo, f.statetwo FROM emp_details AS a JOIN emp_personaldetails AS b ON a.id=b.empid JOIN designation AS c ON c.id = a.designation_id JOIN department AS d ON d.id = a.department_id JOIN emp_bankdetails AS e ON e.empid = a.id JOIN emp_address AS f ON f.empid = a.id where a.status = 'Active' and a.empcode = '".$empDetail->empcode."'";

$empDetailss = $mysqlis->query($sqls);
while($empDetail = $empDetailss->fetch_object()){	
/*echo $empDetail->division_id; echo "-";echo $empDetail->unit_id;
exit();*/
$oauth_timestamp = time();
$oauth_nonce = time();
$urls = "https://9785644.suitetalk.api.netsuite.com/services/rest/record/v1/employee";
// Base string needs to include all query parameters in the correct order
$params = [
    'oauth_consumer_key' => $oauth_consumer_key,
    'oauth_nonce' => $oauth_nonce,
    'oauth_signature_method' => $oauth_signature_method,
    'oauth_timestamp' => $oauth_timestamp,
    'oauth_token' => $oauth_token,
    'oauth_version' => $oauth_version,
];

$base_string = "POST&" . rawurlencode($urls) . "&" . rawurlencode(http_build_query($params, '', '&', PHP_QUERY_RFC3986));
// Correct HMAC signature calculation with the token secret appended
$signing_key = rawurlencode($oauth_consumer_secret) . '&' . rawurlencode($oauth_token_secret);
$oauth_signature = base64_encode(hash_hmac("sha256", $base_string, $signing_key, true));
$oauth_signature = rawurlencode($oauth_signature);
/* api key generation for every time end here */	
	$merge_address = $empDetail->addfieldtwo1 .','.$empDetail->addfieldtwo2 .','.$empDetail->addfieldtwo3 .','.$empDetail->addfieldtwo4 .','.$empDetail->addfieldtwo5;
	//$class = $empDetail->division_id.':'.$empDetail->unit_id;
	if($empDetail->division_id == 3 && $empDetail->unit_id == 1){
	$class = 155;
	}elseif($empDetail->division_id == 10 && $empDetail->unit_id == 2){
	$class = 164;		
	}elseif($empDetail->division_id == 15 && $empDetail->unit_id == 1){
	$class = 101;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 1){
	$class = 1;		
	}elseif($empDetail->division_id == 133 && $empDetail->unit_id == 1){
	$class = 145;		
	}elseif($empDetail->division_id == 23 && $empDetail->unit_id == 1){
	$class = 102;		
	}elseif($empDetail->division_id == 27 && $empDetail->unit_id == 1){
	$class = 147;		
	}elseif($empDetail->division_id == 67 && $empDetail->unit_id == 1){
	$class = 160;		
	}elseif($empDetail->division_id == 69 && $empDetail->unit_id == 1){
	$class = 104;		
	}elseif($empDetail->division_id == 22 && $empDetail->unit_id == 1){
	$class = 166;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 2){
	$class = 2;		
	}elseif($empDetail->division_id == 57 && $empDetail->unit_id == 2){
	$class = 163;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 21){
	$class = 3;		
	}elseif($empDetail->division_id == 146 && $empDetail->unit_id == 21){
	$class = 166;		
	}elseif($empDetail->division_id == 139 && $empDetail->unit_id == 21){
	$class = 169;		
	}elseif($empDetail->division_id == 140 && $empDetail->unit_id == 21){
	$class = 168;		
	}elseif($empDetail->division_id == 138 && $empDetail->unit_id == 21){
	$class = 167;		
	}elseif($empDetail->division_id == 148 && $empDetail->unit_id == 21){
	$class = 170;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 19){
	$class = 3;		
	}elseif($empDetail->division_id == 109 && $empDetail->unit_id == 19){
	$class = 109;		
	}elseif($empDetail->division_id == 110 && $empDetail->unit_id == 19){
	$class = 109;		
	}elseif($empDetail->division_id == 112 && $empDetail->unit_id == 19){
	$class = 110;		
	}elseif($empDetail->division_id == 52 && $empDetail->unit_id == 19){
	$class = 111;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 6){
	$class = 5;		
	}elseif($empDetail->division_id == 75 && $empDetail->unit_id == 6){
	$class = 5;		
	}elseif($empDetail->division_id == 36 && $empDetail->unit_id == 6){
	$class = 5;		
	}elseif($empDetail->division_id == 76 && $empDetail->unit_id == 6){
	$class = 174;		
	}elseif($empDetail->division_id == 51 && $empDetail->unit_id == 6){
	$class = 175;		
	}elseif($empDetail->division_id == 77 && $empDetail->unit_id == 6){
	$class = 179;		
	}elseif($empDetail->division_id == 134 && $empDetail->unit_id == 6){
	$class = 180;		
	}elseif($empDetail->division_id == 53 && $empDetail->unit_id == 7){
	$class = 6;		
	}elseif($empDetail->division_id == 15 && $empDetail->unit_id == 7){
	$class = 116;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 8){
	$class = 7;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 9){
	$class = 8;		
	}elseif($empDetail->division_id == 53 && $empDetail->unit_id == 16){
	$class = 9;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 16){
	$class = 9;		
	}elseif($empDetail->division_id == 23 && $empDetail->unit_id == 16){
	$class = 122;		
	}elseif($empDetail->division_id == 53 && $empDetail->unit_id == 18){
	$class = 10;		
	}elseif($empDetail->division_id == 23 && $empDetail->unit_id == 18){
	$class = 124;		
	}elseif($empDetail->division_id == 74 && $empDetail->unit_id == 20){
	$class = 11;		
	}elseif($empDetail->division_id == 15 && $empDetail->unit_id == 20){
	$class = 125;		
	}elseif($empDetail->division_id == 35 && $empDetail->unit_id == 11){
	$class = 140;		
	}elseif($empDetail->division_id == 106 && $empDetail->unit_id == 11){
	$class = 129;		
	}elseif($empDetail->division_id == 151 && $empDetail->unit_id == 11){
	$class = 130;		
	}elseif($empDetail->division_id == 129 && $empDetail->unit_id == 11){
	$class = 131;		
	}elseif($empDetail->division_id == 120 && $empDetail->unit_id == 11){
	$class = 139;		
	}elseif($empDetail->division_id == 40 && $empDetail->unit_id == 11){
	$class = 141;		
	}elseif($empDetail->division_id == 150 && $empDetail->unit_id == 11){
	$class = 127;		
	}elseif($empDetail->division_id == 38 && $empDetail->unit_id == 11){
	$class = 136;		
	}elseif($empDetail->division_id == 114 && $empDetail->unit_id == 11){
	$class = 135;		
	}elseif($empDetail->division_id == 37 && $empDetail->unit_id == 11){
	$class = 133;		
	}elseif($empDetail->division_id == 41 && $empDetail->unit_id == 11){
	$class = 132;		
	}elseif($empDetail->division_id == 39 && $empDetail->unit_id == 11){
	$class = 138;		
	}elseif($empDetail->division_id == 21 && $empDetail->unit_id == 11){
	$class = 126;		
	}elseif($empDetail->division_id == 31 && $empDetail->unit_id == 11){
	$class = 142;		
	}elseif($empDetail->division_id == 43 && $empDetail->unit_id == 11){
	$class = 137;		
	}elseif($empDetail->division_id == 22 && $empDetail->unit_id == 11){
	$class = 128;		
	}elseif($empDetail->division_id == 44 && $empDetail->unit_id == 11){
	$class = 143;		
	}elseif($empDetail->division_id == 48 && $empDetail->unit_id == 11){
	$class = 134;		
	}elseif($empDetail->division_id == 36 && $empDetail->unit_id == 13){
	$class = 245;		
	}elseif($empDetail->division_id == 36 && $empDetail->unit_id == 14){
	$class = 248;		
	}elseif($empDetail->division_id == 22 && $empDetail->unit_id == 14){
	$class = 247;		
	}elseif($empDetail->division_id == 45 && $empDetail->unit_id == 14){
	$class = 249;		
	}elseif($empDetail->division_id == 19 && $empDetail->unit_id == 19){
	$class = 171;		
	}elseif($empDetail->division_id == 18 && $empDetail->unit_id == 1){
	$class = 157;		
	}elseif($empDetail->division_id == 149 && $empDetail->unit_id == 1){
	$class = 150;		
	}elseif($empDetail->division_id == 63 && $empDetail->unit_id == 2){
	$class = 162;		
	}elseif($empDetail->division_id == 147 && $empDetail->unit_id == 21){
	$class = 166;		
	}else{
	$class ='';			
	}
	/* martial status start*/
	if($empDetail->martialstatus === "Single"){
	$martial_status = 1;
	}elseif($empDetail->martialstatus === "Married"){
	$martial_status = 2;		
	}elseif($empDetail->martialstatus === "Divorced"){
	$martial_status = 3;		
	}elseif($empDetail->martialstatus === "Widowed"){
	$martial_status = 4;			
	}else{
	$martial_status ='';			
	}	
	if($empDetail->category == "International Engineer" || $empDetail->category == "Domestic Engineer" ){
		$engineerrecordsttaus =  true;
	}else{
		$engineerrecordsttaus =  false;		
	}
	/* martial status end*/
	/* employment_type start*/
	$emp_type = $empDetail->employment_type === "Permanent" ? 1 :
            ($empDetail->employment_type === "Contract" ? 2 : null);
	/* status start*/
	if($empDetail->status === "Active"){
	$status =2;
	}elseif($empDetail->status === "Non paid leave"){
	$status =10;		
	}elseif($empDetail->status === "Paid and relieved"){
	$status =12;		
	}elseif($empDetail->status === "Relieved"){
	$status =14;			
	}elseif($empDetail->status === "Transferred"){
	$status =13;		
	}elseif($empDetail->status === "Notice period"){
	$status =11;			
	}elseif($empDetail->status === "Termination"){
	$status =8;		
	}elseif($empDetail->status === "Exit formality inprocess"){
	$status =9;		
	}else{
	$status ='';			
	}
	/*  status end*/	
	/* gender start*/
	if($empDetail->gender === "Male"){
	$gender =1;
	}elseif($empDetail->gender === "Female"){
	$gender =2;		
	}elseif($empDetail->gender === "Others"){
	$gender =3;		
	}else{
	$gender ='';			
	}
	/* gender  end*/	
	/* category start*/
	if($empDetail->category === "HO Staff"){
	$category = 1;
	}elseif($empDetail->category === "BO Staff"){
	$category = 2;		
	}elseif($empDetail->category === "Domestic Engineer"){
	$category = 3;		
	}elseif($empDetail->category === "International Engineer"){
	$category = 4;		
	}else{
	$category ='';			
	}
	/* category  end*/		
	/*department start*/
	if($empDetail->name === "Accounts"){
	$departmentid =1;
	}elseif($empDetail->name === "Admin"){
	$departmentid =2;
	}elseif($empDetail->name === "Administration"){
	$departmentid =3;
	}elseif($empDetail->name === "Agriculture"){
	$departmentid =4;
	}elseif($empDetail->name === "Assembly"){
	$departmentid =5;
	}elseif($empDetail->name === "Asset Management"){
	$departmentid =6;
	}elseif($empDetail->name === "Bengaluru Office"){
	$departmentid =7;
	}elseif($empDetail->name === "Bheema Cafeteria"){
	$departmentid =8;
	}elseif($empDetail->name === "Bhubaneshwar Office"){
	$departmentid =9;
	}elseif($empDetail->name === "BU I / ER"){
	$departmentid =10;
	}elseif($empDetail->name === "Budget Business" || $empDetail->name === "Budget"){
	$departmentid =11;
	}elseif($empDetail->name === "Development" || $empDetail->name === "Business Development"){
	$departmentid =12;
	}elseif($empDetail->name === "Calibration"){
	$departmentid =13;
	}elseif($empDetail->name === "Cell"){
	$departmentid =14;
	}elseif($empDetail->name === "Cheyyar Factory"){
	$departmentid =15;
	}elseif($empDetail->name === "Civil"){
	$departmentid =16;
	}elseif($empDetail->name === "Civil Design"){
	$departmentid =17;
	}elseif($empDetail->name === "Coimbatore Store"){
	$departmentid =18;
	}elseif($empDetail->name === "Commercial"){
	$departmentid =19;
	}elseif($empDetail->name === "Contracts & Marketing"){
	$departmentid =20;
	}elseif($empDetail->name === "Defence Systems"){
	$departmentid =21;
	}elseif($empDetail->name === "Delhi Office"){
	$departmentid =22;
	}elseif($empDetail->name === "Documentation & Control"){
	$departmentid =23;
	}elseif($empDetail->name === "Editorial"){
	$departmentid =24;
	}elseif($empDetail->name === "Electrical Design"){
	$departmentid =25;
	}elseif($empDetail->name === "Electrical Maintenance"){
	$departmentid =26;
	}elseif($empDetail->name === "Energy Saving Solutions"){
	$departmentid =27;
	}elseif($empDetail->name === "Engineers Coordination"){
	$departmentid =28;
	}elseif($empDetail->name === "Erection"){
	$departmentid =29;
	}elseif($empDetail->name === "ERP"){
	$departmentid =30;
	}elseif($empDetail->name === "ERP & Designing"){
	$departmentid =31;
	}elseif($empDetail->name === "Farm"){
	$departmentid =32;
	}elseif($empDetail->name === "Finance"){
	$departmentid =33;
	}elseif($empDetail->name === "Finance and Banking"){
	$departmentid =34;
	}elseif($empDetail->name === "Finance Secretary"){
	$departmentid =35;
	}elseif($empDetail->name === "Floor"){
	$departmentid =36;
	}elseif($empDetail->name === "FLP"){
	$departmentid =37;
	}elseif($empDetail->name === "G Organics"){
	$departmentid =38;
	}elseif($empDetail->name === "Graphics Design"){
	$departmentid =39;
	}elseif($empDetail->name === "Head Office"){
	$departmentid =40;
	}elseif($empDetail->name === "Health Care Department"){
	$departmentid =41;
	}elseif($empDetail->name === "HO"){
	$departmentid =42;
	}elseif($empDetail->name === "HR & IR"){
	$departmentid =43;
	}elseif($empDetail->name === "HSE"){
	$departmentid =44;
	}elseif($empDetail->name === "Hyderabad Office"){
	$departmentid =45;
	}elseif($empDetail->name === "Instrumentation"){
	$departmentid =46;
	}elseif($empDetail->name === "Insurance"){
	$departmentid =47;
	}elseif($empDetail->name === "IR"){
	$departmentid =48;
	}elseif($empDetail->name === "IT"){
	$departmentid =49;
	}elseif($empDetail->name === "Kodaikanal GH"){
	$departmentid =50;
	}elseif($empDetail->name === "Kolkata Office"){
	$departmentid =51;
	}elseif($empDetail->name === "Kovur Factory"){
	$departmentid =52;
	}elseif($empDetail->name === "Kovur GH"){
	$departmentid =53;
	}elseif($empDetail->name === "Legal & IR"){
	$departmentid =54;
	}elseif($empDetail->name === "Logistics"){
	$departmentid =55;
	}elseif($empDetail->name === "Marketing"){
	$departmentid =56;
	}elseif($empDetail->name === "MD House"){
	$departmentid =57;
	}elseif($empDetail->name === "Mechanical Operations"){
	$departmentid =58;
	}elseif($empDetail->name === "Mumbai Office"){
	$departmentid =59;
	}elseif($empDetail->name === "New Delhi Office"){
	$departmentid =60;
	}elseif($empDetail->name === "NO INFORMATION"){
	$departmentid =61;
	}elseif($empDetail->name === "On Boarding"){
	$departmentid =62;
	}elseif($empDetail->name === "Operations" || $empDetail->name ===  "OPTCL"){
	$departmentid =63;
	}elseif($empDetail->name === "Padalam"){
	$departmentid =64;
	}elseif($empDetail->name === "Payroll"){
	$departmentid =65;
	}elseif($empDetail->name === "Personal Secretary"){
	$departmentid =66;
	}elseif($empDetail->name === "PHP Development"){
	$departmentid =67;
	}elseif($empDetail->name === "Pillaipakkam Factory"){
	$departmentid =68;
	}elseif($empDetail->name === "Post Recruitment"){
	$departmentid =69;
	}elseif($empDetail->name === "Principal"){
	$departmentid =70;
	}elseif($empDetail->name === "Printing & Stationery"){
	$departmentid =71;
	}elseif($empDetail->name === "Procurement"){
	$departmentid =72;
	}elseif($empDetail->name === "Product Development"){
	$departmentid =73;
	}elseif($empDetail->name === "Production"){
	$departmentid =74;
	}elseif($empDetail->name === "Products"){
	$departmentid =75;
	}elseif($empDetail->name === "Projects"){
	$departmentid =76;
	}elseif($empDetail->name === "Ramapuram"){
	$departmentid =77;
	}elseif($empDetail->name === "Reception"){
	$departmentid =78;
	}elseif($empDetail->name === "Recruitment"){
	$departmentid =79;
	}elseif($empDetail->name === "Security"){
	$departmentid =80;
	}elseif($empDetail->name === "Service"){
	$departmentid =81;
	}elseif($empDetail->name === "Software Development"){
	$departmentid =82;
	}elseif($empDetail->name === "Solar"){
	$departmentid =83;
	}elseif($empDetail->name === "Statutory Affairs"){
	$departmentid =84;
	}elseif($empDetail->name === "T Nagar GH"){
	$departmentid =85;
	}elseif($empDetail->name === "Taxation"){
	$departmentid =86;
	}elseif($empDetail->name === "Temporary"){
	$departmentid =87;
	}elseif($empDetail->name === "Training"){
	$departmentid =88;
	}elseif($empDetail->name === "Training & Development"){
	$departmentid =89;
	}elseif($empDetail->name === "Vadodara Office"){
	$departmentid =90;
	}elseif($empDetail->name === "VMCPL"){
	$departmentid =91;
	}elseif($empDetail->name === "Web Design"){
	$departmentid =92;
	}elseif($empDetail->name === "Welfare"){
	$departmentid =93;
	}else{
	$departmentid ='';		
	}	
	/*department end*/ 
   $data = [
    "mode" => "create",
    "type" => "employee",
    //"customform" => "366",
    "customform" => "273",
    "subsidiary" => "4",
    "externalid" => $empDetail->empcode,
    "custentity_voltech_engineer" => $engineerrecordsttaus,
    "firstname" => $empDetail->empname,
    "entityid" => $empDetail->empcode,
    "autoname" => false,
    "hiredate" => $empDetail->doj,
    "birthdate" => $empDetail->birthday,
    "title" => $empDetail->designation,
    "department" => $departmentid,
    "class" => $class,
    "email" => $empDetail->email,
    "officephone" => $empDetail->mobileno,
    "custentity_email_personal_voltech" => $empDetail->personalmobileno,
    "mobilephone" => $empDetail->mobile_no,
    "employeestatus" => $status,
    "custentity_voltech_gender" => $gender,
    "maritalstatus" => $martial_status,
    "custentity_vepl_emp_bnk_acc_no" => $empDetail->acnumber,
    "custentity_vepl_emp_ifsc_code" => $empDetail->ifsc,
    "custentity_voltech_category" => $category,
    "custentity_emp_type" => $emp_type,
    "addressbook" => [
        "items" => [
            [
                "defaultaddress" => true,
                "addressbookaddress" => [
                    "country" => "IN",
                    "zip" => $empDetail->pincodetwo,
                    "addressee" => $empDetail->empname,
                    "addr1" => $merge_address,
                    "city" => $empDetail->districttwo,
                    "state" => $empDetail->statetwo
                ]
            ]
        ]
    ]
];
$curls = curl_init();
curl_setopt_array($curls, array(
  CURLOPT_URL => $urls,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode($data),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: OAuth realm="'.$realm.'", oauth_consumer_key="'.$oauth_consumer_key.'", oauth_token="'.$oauth_token.'", oauth_signature_method="'.$oauth_signature_method.'", oauth_timestamp="'.$oauth_timestamp.'", oauth_nonce="'.$oauth_nonce.'", oauth_version="'.$oauth_version.'", oauth_signature="'.$oauth_signature.'"'
  ),
));
$response = curl_exec($curls);
curl_close($curls);
echo $response;

if (!empty($response)) {
    echo "Error: " . $response;
    exit; // Stop execution if an error is present
}
$sqls = "UPDATE `hrms`.`emp_details` SET `netsuite_status` = '1' WHERE `emp_details`.`empcode` = '".$empDetail->empcode."'";		
		if ($mysqli->query($sqls) === TRUE) {
		//	echo "Record updated successfully for empcode: " . $empDetail->empcode . "<br/>";
		} else {
			echo "Error updating record: " . $mysqli->error . "<br/>";
		}


}

}

}
echo '<script>window.location.href = document.referrer;</script>';
//exit();

