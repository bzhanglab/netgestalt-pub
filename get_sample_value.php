<?php
//header("Content-Type", "application/json");

//$input = file_get_contents('php://input');
//$_POST = json_decode($input);
//print_r($_POST);

$trackfile=$_POST['track_file'];
$feature=$_POST['feature'];
$sample=$_POST['sample'];

$cmd="bin/get_sample_value ";
$cmd.=" --track-file \"".$trackfile;
$cmd.="\" --sample-name \"".$sample;
$cmd.="\" --feature \"".$feature."\"";

$output=array();
exec($cmd, $output);

print $output[0];
?>
