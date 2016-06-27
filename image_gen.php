<?php
//header("Content-Type", "application/json");

//$input = file_get_contents('php://input');
//$_POST = json_decode($input);

//print_r($_POST);
//$myFile = "/tmp/testFile.txt";
//$fh = fopen($myFile, 'w');
$debug=true;
if($debug){
  $debugout = fopen("/tmp/trackpng_debug.out","w");
}

$trackfile=$_POST["trackfile"];
$trackstring=$_POST["trackstring"];
$sbtcolors=$_POST["sbtcolors"];
$pixelspergene=$_POST["pixelspergene"];
$tracktype=$_POST["tracktype"];
$usertrackurl=$_POST["usertrackurl"];
$blocks=$_POST["blocks"];
$gppcutoff=$_POST["gppcutoff"];
if(isset($_POST["sortpos"]))
  $sortpos=$_POST["sortpos"];
if(isset($_POST["commonindices"]))
  $commonindices=$_POST["commonindices"];
if(isset($_POST["sortedcommonindices"]))
  $sortedcommonindices=$_POST["sortedcommonindices"];
$start="";
$end="";
$count=0;
foreach($blocks as $i => $value){
  $start=$start.$_POST["blocks"][$i]["startBase"]." ";
  $end=$end.$_POST["blocks"][$i]["endBase"]." ";
  $count++;
}

/**
 *  call track2png to generate png image
 */
$trackheight=2; # height in pixel per subtrack

if($tracktype=="cbt" || $tracktype=="cct" || $tracktype=="sst"){
  $cmd="bin/track2png ";
  $cmd.=" \"".$start."\"";
  $cmd.=" \"".$end."\"";
  $cmd.=" --track-file ".$trackfile;
  $cmd.=" --track-height ".$trackheight;
  $cmd.=" --pixels-per-gene \"".$pixelspergene;
  $cmd.="\" --track-type ".$tracktype;
  $cmd.=" --sort-pos ".$sortpos;
  $cmd.=" --common-indices '".$commonindices."'";
  $cmd.=" --sorted-common-indices '".$sortedcommonindices."'";
	if($tracktype=="cct"){
		$upper=$_POST["upper"];
		$lower=$_POST["lower"];
		if((!is_null($upper)) && (!is_null($lower))){
			$cmd.=" --upper \"".$upper;
			$cmd.="\" --lower \"".$lower."\"";
		}
	}
  if($tracktype=="cbt"){
    $cmd.=" --gpp-cutoff ".$gppcutoff;
   }
   $gene_wise_trans=$_POST["genewisetrans"];
   $color_scheme=$_POST["colorscheme"];
   $cmd.=" --gene-wise-trans ".$gene_wise_trans;
   $cmd.=" --color-scheme ".$color_scheme;
   if($tracktype=="sst" && $debug){
       fwrite($debugout, $cmd);
   }
}
elseif($tracktype=="sct"){
  $upper=$_POST["upper"];
  $lower=$_POST["lower"];
  $cmd="bin/track2png ";
  $cmd.=" \"".$start."\"";
  $cmd.=" \"".$end."\"";
  $cmd.=" --track-file ".$trackfile;
  $cmd.=" --track-height ".$trackheight;
  $cmd.=" --pixels-per-gene \"".$pixelspergene;
  $cmd.="\" --track-type ".$tracktype;
  if((!is_null($upper)) && (!is_null($lower))){
		$cmd.=" --upper \"".$upper;
		$cmd.="\" --lower \"".$lower."\"";
	}
 // fwrite($fh, $cmd);
}
elseif($tracktype=="sbt"){
  $cmd="bin/track2png ";
  $cmd.=" \"".$start."\"";
  $cmd.=" \"".$end."\"";
  if($trackfile)
    $cmd.=" --track-file ".$trackfile;
  elseif($trackstring)
    $cmd.=" --track-string ".$trackstring;
  $cmd.=" --track-height ".$trackheight;
  $cmd.=" --pixels-per-gene \"".$pixelspergene;
  $cmd.="\" --track-type ".$tracktype;
  $cmd.=" --gpp-cutoff ".$gppcutoff;
  if($sbtcolors)
    $cmd.=" --sbt-colors \"".$sbtcolors."\"";
}

//print $cmd;
$output=array();
exec($cmd, $output);
if($debug){
	fwrite($debugout, $cmd);
}

/*
 o:{ "zoom": "XX", 
     "trackUrl": "XX", 
     "blocks": [{"startBase":xx, "endBase":xx, "src":xx, "sortPos":xx}, {"startBase":yy, "endBase":yy, "src":yy, "sortPos":??}...], 
     "subTrackCount":"XX", 
     "subTrackHeight":"XX"
     "sortPos":"XX"
    }
*/

$newcount=$output[0];

$json_string.="{\"zoom\":\"";
$json_string.=$pixelspergene;
if($tracktype=="sct" || $tracktype=="cct"){
  if(!is_null($upper)){
    $json_string.="\", \"upper\":\"";
    $json_string.=$upper;
  }
  if(!is_null($lower)){
    $json_string.="\", \"lower\":\"";
    $json_string.=$lower;
  }
}
if($tracktype=="cct" || $tracktype=="cbt" || $tracktype=="sst"){
  $json_string.="\", \"geneWiseTrans\":\"";
  $json_string.=$gene_wise_trans;
  $json_string.="\", \"colorScheme\":\"";
  $json_string.=$color_scheme;
}
$json_string.="\", \"trackUrl\":\"";
if($trackfile)
  $json_string.=$trackfile;
else
  $json_string.=$usertrackurl; 
$json_string.="\", \"commonIndices\":\"";
$json_string.=$commonindices;
$json_string.="\", \"blocks\":[";
for($i=0; $i<$newcount; $i++){
  $json_string.="{\"startBase\":\"".$output[$i*3+1]."\",";
  $json_string.="\"endBase\":\"".$output[$i*3+2]."\",";
  $json_string.="\"src\":\"".$output[$i*3+3]."\"}";
  if($i!=$newcount-1)
    $json_string.=",";
}
$json_string.="],";
$json_string.=" \"subTrackCount\":\"";
$json_string.=$output[3*$newcount+1];
$json_string.="\", \"subTrackHeight\":\"";
$json_string.=$output[3*$newcount+2];
$json_string.="\", \"sortPos\":\"";
$json_string.=$output[3*$newcount+3];
$json_string.="\", \"sortOrder\": ";
if($sortpos==-1){
 $json_string.="[]";
}
else{
  $orderarray=explode(",",$output[3*$newcount+4]);
  $json_string.="[";
  for($i=0; $i<count($orderarray)-1; $i++){
    $json_string.=$orderarray[$i];
    $json_string.=",";
  }
  $json_string.=$orderarray[$i];
  $json_string.="]";
}
$json_string.="}";

print $json_string;
if($debug){
  fclose($debugout);
}
?>
