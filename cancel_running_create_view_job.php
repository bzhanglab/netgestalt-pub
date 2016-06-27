<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/cancel_running_create_view_job.out","w");
}

$sqs_bin="/usr/local/bin/";


if(isset($_POST)){
	$job_id=$_POST["job_id"];
	$orig_cct_path=$_POST["orig_cct_path"];
	$orig_tsi_path=$_POST["orig_tsi_path"];
	$output=array();
	exec($sqs_bin."qdel -nd ".$job_id, $output);

	// should delete the raw cct tsi file at this point
	// should delete the raw cct tsi file at this point
	if(file_exists($orig_cct_path)){
		unlink($orig_cct_path);
	}
	if(file_exists($orig_tsi_path)){
		unlink($orig_tsi_path);
	}
	if($debug){
		fwrite($debugout, $job_id."\n");
		fwrite($debugout, print_r($output, true));
	}

	if($debug){
		fclose($debugout);
	}
}
?>
