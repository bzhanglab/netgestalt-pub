<?php
//header("Content-Type", "application/json");

//$input = file_get_contents('php://input');
//$_POST = json_decode($input);
//print_r($_POST);

$trackfile=$_POST['track_file'];
$samplefeatures=$_POST['sample_features'];
$sampleheight=$_POST['sample_height'];
$pixelperfeature=$_POST['pixel_per_feature'];
$totalfeaturecount=$_POST['total_feature_count'];

$debug=false;
if($debug){
  $debugout = fopen("/tmp/image_gen_sample_heatmap_debug.out","w");
}

$cmd="bin/sample_heatmap ";
$cmd.=" --track-file \"".$trackfile;
$cmd.="\" --sample-features \"".$samplefeatures;
$cmd.="\" --sample-height \"".$sampleheight;
$cmd.="\" --pixel-per-feature \"".$pixelperfeature;
$cmd.="\" --total-feature-count \"".$totalfeaturecount."\"";

$output=array();
exec($cmd, $output);
if($debug){
   fwrite($debugout, $cmd);
}

/* output:
  {
     "src": ["xXXXXXX","yyyy","zzzzz"],
     "samples": "abcdef"
  }
*/
$count=$output[0];

if($count!=0){
	$json_string.="{\"src\":[";
	for($i=0; $i<$count; $i++){
		$json_string.="\"".$output[$i+1]."\"";
		if($i!=$count-1){
			$json_string.=",";
		}
	}
	$json_string.="],\"samples\":\"";
	$json_string.=$output[1+$count];
	$json_string.="\"}";

	print $json_string;
}
else{
	$json_string.="{\"src\":[],\"samples\":\"";
	$json_string.=$output[1];
	$json_string.="\"}";

	print $json_string;
}
if($debug){
  fclose($debugout);
}
?>
