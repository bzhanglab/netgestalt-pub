<?php
//header("Content-Type", "application/json");

//$input = file_get_contents('php://input');
//$_POST = json_decode($input);
//print_r($_POST);

$debug=false;
if($debug){
  $debugout = fopen("/tmp/image_gen_collapsed_debug.out","w");
}
$trackfile=$_POST['trackfile'];
$trackstring=$_POST['trackstring'];
$pixelspergene=$_POST['pixelspergene'];
$tracktype=$_POST['tracktype'];
$indices=$_POST['indices'];
if($debug){
	fwrite($debugout, $indices);
	fwrite($debugout, "\n");
}
/**
 *  call track2png_collapse to generate png image
 */
$trackheight=2; # height in pixel per subtrack

if($tracktype=="cbt" || $tracktype=="cct" || $tracktype=="sct" || $tracktype=="sst"){
	$cmd="bin/track2png_collapse ";
	$cmd.=" --track-file \"".$trackfile;
	$cmd.="\" --track-height \"".$trackheight;
	$cmd.="\" --pixels-per-gene \"".$pixelspergene;
	$cmd.="\" --track-type \"".$tracktype;
	$cmd.="\" --indices-string \"".$indices."\"";
	if($tracktype=="cct" || $tracktype=="sct"){
		$upper=$_POST["upper"];
		$lower=$_POST["lower"];
		if((!is_null($upper)) && (!is_null($lower))){
			$cmd.=" --upper \"".$upper;
			$cmd.="\" --lower \"".$lower."\"";
		}
		if($tracktype=="cct" || $tracktype=="sst"){
			$gene_wise_trans=$_POST["genewisetrans"];
      $color_scheme=$_POST["colorscheme"];
			$cmd.=" --gene-wise-trans ".$gene_wise_trans;
      $cmd.=" --color-scheme \"".$color_scheme."\"";
		}
	}
 if($tracktype=="cct" || $tracktype=="cbt" || $tracktype=="sst"){
   $sortedSampleIndiceString=$_POST['sortedSampleIndiceString'];
   if(!is_null($sortedSampleIndiceString)){
      $cmd.=" --sorted-sample-indices ".$sortedSampleIndiceString;
   }
 }
}
elseif($tracktype=="sbt"){
  $cmd="bin/track2png_collapse ";
  if($trackfile)
    $cmd.=" --track-file \"".$trackfile;
  elseif($trackstring){
    $cmd.=" --track-string \"".$trackstring; 
  }
  $cmd.="\" --track-height ".$trackheight;
  $cmd.=" --pixels-per-gene \"".$pixelspergene;
  $cmd.="\" --track-type \"".$tracktype;
  $cmd.="\" --indices-string \"".$indices."\"";
}

$output=array();
if($debug){
	fwrite($debugout, $cmd);
}
exec($cmd, $output);

/* output:
  o:{
     "src":"xXXXXXX",
     "subTrackCount":"XX",
     "subTrackHeight":"XX"
     }
*/

/*
$output[0]="abc";
$output[1]="1";
$output[2]="25";
*/

$json_string.="{\"src\":\"";
$json_string.=$output[0];
$json_string.="\", \"subTrackCount\":\"";
$json_string.=$output[1];
$json_string.="\", \"subTrackHeight\":\"";
$json_string.=$output[2];
$json_string.="\"}";

print $json_string;
if($debug){
    fclose($debugout);
}
?>
