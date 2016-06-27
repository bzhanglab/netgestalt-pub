<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/ng_create_view_debug.out","w");
}

include 'check_track_error.php';

function report_error_details($details){
  $encoded=base64_encode($details);
  return "{\"status\":\"Error\",\"details\":\"".$encoded."\"}"; 
}

$cmd="bin/create_view ";
$real_user_int_dir="/tmp/ng_int_data";
$user_int_dir="int_data/user/";
$sqs_bin="/usr/local/bin/";

$ng_root=getcwd();

if(isset($_POST)){
	if($debug){
/*
		fwrite($debugout, $_POST["organism"]."\n");
		fwrite($debugout, $_POST["collapse_to_symbol"]."\n");
		fwrite($debugout, $_POST["meanPer"]."\n");
		fwrite($debugout, $_POST["varPer"]."\n");
		fwrite($debugout, $_POST["matNetMethod"]."\n");
		fwrite($debugout, $_POST["moduleSigMethod"]."\n");
		fwrite($debugout, $_POST["collapse_mode"]."\n");
		fwrite($debugout, $_POST["corrType"]."\n");
		fwrite($debugout, $_POST["networkType"]."\n");
		fwrite($debugout, $_POST["valueThr"]."\n");
		fwrite($debugout, $_POST["rankBest"]."\n");
		fwrite($debugout, $_POST["fdrMethod"]."\n");
		fwrite($debugout, $_POST["fdrth"]."\n");
		fwrite($debugout, $_POST["minModule"]."\n");
		fwrite($debugout, $_POST["stepIte"]."\n");
		fwrite($debugout, $_POST["maxStep"]."\n");
		fwrite($debugout, $_POST["modularityThr"]."\n");
		fwrite($debugout, $_POST["zRandomNum"]."\n");
		fwrite($debugout, $_POST["permuteNum"]."\n");
		fwrite($debugout, $_POST["ranSig"]."\n");
		fwrite($debugout, $_POST["edgeThr"]."\n");
		fwrite($debugout, $_POST["nodeThr"]."\n");
*/
	}
	$path_parts=pathinfo($_FILES["userCreateViewCctFile"]["name"]);
	$orig_cct_name=$path_parts["filename"];
	$ext=$path_parts["extension"];
  if(strcmp($ext,"txt")==0){
    $path_parts=pathinfo($orig_cct_name);
	  $orig_cct_name=$path_parts["filename"];
	  $ext=$path_parts["extension"];
  }
	if(strcmp($ext,"cct")!=0){
		print report_error_details("Wrong expression data file type.");
		exit;
	}
	$cct_base=basename($_FILES["userCreateViewCctFile"]["tmp_name"]);
  // userCreateViewTsiFile is optional
	if(file_exists($_FILES['userCreateViewTsiFile']['tmp_name']) && is_uploaded_file($_FILES['userCreateViewTsiFile']['tmp_name'])) {
		$path_parts=pathinfo($_FILES["userCreateViewTsiFile"]["name"]);
		$orig_tsi_name=$path_parts["filename"];
		$ext=$path_parts["extension"];
		if(strcmp($ext,"txt")==0){
			$path_parts=pathinfo($orig_tsi_name);
			$orig_tsi_name=$path_parts["filename"];
			$ext=$path_parts["extension"];
		}
		if(strcmp($ext,"tsi")!=0){
			print report_error_details("Wrong sample annotation file type.");
			exit;
		}
		$tsi_base=basename($_FILES["userCreateViewTsiFile"]["tmp_name"]);
	}

	$file_prefix="/tmp/ng_";
	$cct_file=$file_prefix.$cct_base.".cct";
	if(file_exists($_FILES['userCreateViewTsiFile']['tmp_name']) && is_uploaded_file($_FILES['userCreateViewTsiFile']['tmp_name'])) {
		$tsi_file=$file_prefix.$tsi_base.".tsi";
	}
	$out_file_path=$user_int_dir."msm/";
	if(!file_exists($out_file_path)){
		mkdir($out_file_path,0775,true);
	}
	$msm_file=$out_file_path.$cct_base;
	if(!move_uploaded_file($_FILES["userCreateViewCctFile"]["tmp_name"], $cct_file)){
		print report_error_details("Error moving cct file");
		exit;
	}
	if(file_exists($_FILES['userCreateViewTsiFile']['tmp_name']) && is_uploaded_file($_FILES['userCreateViewTsiFile']['tmp_name'])) {
		if(!move_uploaded_file($_FILES["userCreateViewTsiFile"]["tmp_name"], $tsi_file)){
			print report_error_details("Error moving tsi file");
			exit;
		}
	}

	// error checking
	// check cct for inconsistent column number
	$ret=check_column_number($cct_file,"cct");
	list($ret_code, $ret_detail)=$ret;
	if($ret_code=="error"){
		print report_error_details("Column number not match.<br>".$ret_detail);
		exit;
	}
	// check for special characters and duplicated gene names
	$ret=check_special_characters($cct_file,"cct");
	list($ret_code, $ret_detail)=$ret;
	if($ret_code=="error"){
		print report_error_details("CCT file contains special characters.<br>".$ret_detail);
		exit;
	}
	$ret=check_duplicated_genes($cct_file,"cct");
	list($ret_code, $ret_detail)=$ret;
	if($ret_code=="error"){
		print report_error_details("CCT file contains duplicated genes.<br>".$ret_detail);
		exit;
	}
	$ret=check_duplicated_samples($cct_file,"cct");
	list($ret_code, $ret_detail)=$ret;
	if($ret_code=="error"){
		print report_error_details("CCT file contains duplicated sample names.<br>".$ret_detail);
		exit;
	}
	// tsi
	if(file_exists($_FILES['userCreateViewTsiFile']['tmp_name']) && is_uploaded_file($_FILES['userCreateViewTsiFile']['tmp_name'])) {
		$ret=check_column_number($tsi_file,"tsi");
		list($ret_code, $ret_detail)=$ret;
		if($ret_code=="error"){
			print report_error_details("Column number not match.<br>".$ret_detail);
			exit;
		}
		// check special characters and duplicated samples
		$ret=check_special_characters($tsi_file,"tsi");
		list($ret_code,$ret_detail)=$ret;
		if($ret_code=="error"){
			print report_error_details("TSI file contains special characters.<br>".$ret_detail);
			exit;
		}
		// check duplicate sample feature names
		$ret=check_barcode($tsi_file);
		list($ret_code,$ret_detail)=$ret;
		if($ret_code=="error"){
			print report_error_details("TSI file contains duplicated sample features.<br>".$ret_detail);
			exit;
		}
		$ret=check_duplicated_samples($tsi_file,"tsi");
		list($ret_code,$ret_detail)=$ret;
		if($ret_code=="error"){
			print report_error_details("TSI file contains duplicated sample names.<br>".$ret_detail);
			exit;
		}
		$ret=check_invalid_data($tsi_file);
		list($ret_code,$ret_detail)=$ret;
		if($ret_code=="error"){
			print report_error_details("Invalid data in tsi.<br>".$ret_detail);
			exit;
		}
		// check if sample names in the two files matched
		$ret=check_samples_match($cct_file, $tsi_file);
		list($ret_code,$ret_detail)=$ret;
		if($ret_code=="error"){
			print report_error_details("Samples do not match in cct and tsi files.<br>".$ret_detail);
			exit;
		}
	}

	if(!isset($tsi_file)){
		$tsi_file="NULL";
	}
	$cmd.=" ".$ng_root." ".$cct_file." ".$tsi_file." ".$msm_file;
	//$cmd.=" ".$ng_root." \"no\" ".$tsi_file." ".$msm_file;
	$cmd.=(" --organism \"".$_POST["organism"]."\"");
	$cmd.=(" --id-type \"".$_POST["id_type"]."\"");
	$cmd.=(" --collapse-to-symbol \"".$_POST["collapse_to_symbol"]."\"");
	$cmd.=(" --na-per \"".$_POST["naPer"]."\"");
	$cmd.=(" --mean-per \"".$_POST["meanPer"]."\"");
	$cmd.=(" --var-per \"".$_POST["varPer"]."\"");
	$cmd.=(" --mat-net-method \"".$_POST["matNetMethod"]."\"");
	$cmd.=(" --module-sig-method \"".$_POST["moduleSigMethod"]."\"");
	$cmd.=(" --collapse-mode \"".$_POST["collapse_mode"]."\"");
	$cmd.=(" --corr-type \"".$_POST["corrType"]."\"");
	$cmd.=(" --network-type \"".$_POST["networkType"]."\"");
	$cmd.=(" --value-thr \"".$_POST["valueThr"]."\"");
	$cmd.=(" --rank-best \"".$_POST["rankBest"]."\"");
	$cmd.=(" --fdr-method \"".$_POST["fdrMethod"]."\"");
	$cmd.=(" --fdr-thr \"".$_POST["fdrth"]."\"");
	$cmd.=(" --min-module \"".$_POST["minModule"]."\"");
	$cmd.=(" --step-ite \"".$_POST["stepIte"]."\"");
	$cmd.=(" --max-step \"".$_POST["maxStep"]."\"");
	$cmd.=(" --modularity-thr \"".$_POST["modularityThr"]."\"");
	$cmd.=(" --z-random-num \"".$_POST["zRandomNum"]."\"");
	$cmd.=(" --permute-num \"".$_POST["permuteNum"]."\"");
	$cmd.=(" --ran-sig \"".$_POST["ranSig"]."\"");
	$cmd.=(" --idnum-thr \"".$_POST["idNumThr"]."\"");
	if($debug){
		fwrite($debugout, $cmd."\n");
	}
  // submit job to the queue (SQS)
	$job_file_path=$user_int_dir."jobs/";
	if(!file_exists($job_file_path)){
		mkdir($job_file_path,0775,true);
	}
 // create job files
  $job_file_name=rand_string(40).".sqs";
  $job_file_name_abs=$ng_root."/".$job_file_path.$job_file_name;
  $job_file_handle=fopen($job_file_path.$job_file_name,"w");
  $job_file_out=$job_file_name_abs.".out";
  $cmd=$ng_root."/".$cmd." >>".$job_file_out." 2>&1";
  fwrite($job_file_handle,"#!/bin/bash\n\n");
  fwrite($job_file_handle,"printf \"start_time:\">".$job_file_out."\n");
  fwrite($job_file_handle,"date +%s>>".$job_file_out."\n");
  fwrite($job_file_handle, $cmd."\n");
  fwrite($job_file_handle,"printf \"end_time:\">>".$job_file_out."\n");
  fwrite($job_file_handle,"date +%s>>".$job_file_out."\n");
  fclose($job_file_handle);
 // qsub requires the absolute path of the job file
 // my choose "-d " to delete the job file 
	$output=array();
  exec($sqs_bin."qsub -q netgestalt ".$job_file_name_abs, $output);
  // return the job ID to the client 
  print "{\"status\":\"Submit_Ok\",\"job_id\":\"".$output[0]."\",\"orig_cct_path\":\"".$cct_file."\",\"orig_tsi_path\":\"".$tsi_file."\",\"output_file\":\"".$job_file_out."\",\"msm_file\":\"".$msm_file."\",\"orig_cct_name\":\"".$orig_cct_name."\"}";
	if($debug){
		fclose($debugout);
	}
}
?>
