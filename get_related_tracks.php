<?php
//header("Content-Type", "application/json");

$input = file_get_contents('php://input');
$_POST = json_decode($input);

$debug=false;
if($debug){
  $debugout = fopen("/tmp/get_related_track_debug.out","w");
}

$network=$_POST->network;
$trackLabel=$_POST->trackLabel;
$trackType=$_POST->trackType;
$category=$_POST->category;
$intUrl=$_POST->trackIntFile;
$networkType=$_POST->networkType;
$ng_root=getcwd();
$user_module_cat=$_POST->userModuleCat;
$fdrCutoff=$_POST->fdrCutoff;
$trackUrl=$_POST->trackUrl;

$cmd="bin/get_related_tracks ";
$cmd.=$ng_root;
$cmd.=" --network ".$network;
$cmd.=" --track-label ".$trackLabel;
$cmd.=" --track-type ".$trackType;
$cmd.=" --network-type ".$networkType;
$cmd.=" --track-category ".$category;
$cmd.=" --int-url ".$intUrl;
$cmd.=" --track-url ".$trackUrl;
$cmd.=" --fdr-cutoff ".$fdrCutoff;
$cmd.=" --user-module-category ".$user_module_cat;

#$cmd="bin/get_related_tracks --network human_HPRD_walktrap_30 --track-label cellbody --track-type sbt";

//print $cmd;
$output=array();
exec($cmd, $output);
if($debug){
  fwrite($debugout, $cmd);
}

if(count($output)==0){
  print "{\"related\":\"\"}";
  exit;  
}

$count=$output[0];
$json_string="{\"related\":[";
for($i=0; $i<$count; $i++){
  $json_string.="{\"label\":\"".$output[$i*4+1]."\",";
  $json_string.="\"fdr\":\"".$output[$i*4+2]."\",";
  $json_string.="\"metric\":\"".$output[$i*4+3]."\",";
  $json_string.="\"gene_string\":\"".$output[$i*4+4]."\"}";
  if($i!=$count-1)
   $json_string.=",";
}
$json_string.="]}";

print $json_string;

 if($debug){
    fclose($debugout);
  }
?>
