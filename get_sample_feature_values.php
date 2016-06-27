<?php

$sampledb=$_POST['sampledb'];
$feature=$_POST['feature'];

$cmd="bin/get_sample_feature_values ";
$cmd.=" --sample-db \"".$sampledb;
$cmd.="\" --feature \"".$feature."\"";

$output=array();
exec($cmd, $output);
$i=0;
$len=count($output);
foreach ($output as $val){
	print $val;
  if($i<$len-1){
    print "####";
  }
  $i++;
}
?>
