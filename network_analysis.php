<?php
// for binary track: expand the current gene set based on "analysis type"
//  1. all neighbors
//  2. 
// 
//
$debug=false;
$cmd="bin/network_analysis ";
$ng_root=getcwd();
if($debug){
	$debugout = fopen("/tmp/network_analysis_debug.out","w");
}

if(isset($_POST)){
  $network_type=$_POST["networkType"];
  $current_network=$_POST["currentNetwork"];
  $analysis_type=$_POST["analysisType"];
  $new_track_name=$_POST["newTrackName"];
  $track_int_url=$_POST["trackIntUrl"];
	$network_data_url=$_POST['networkDataUrl'];
  $ruler_url=$_POST['rulerUrl'];
  $cut_off=$_POST['fdrCutoff'];
	if($debug){
		fwrite($debugout, $analysis_type."\n");
		fwrite($debugout, $track_int_url."\n");
		fwrite($debugout, $network_data_url."\n");
	}
}

if($analysis_type=="na_all_neighbors"){
  $cmd=$cmd.$ng_root;
	$cmd.=" --analysis-type \"".$analysis_type."\"";
	$cmd.=" --new-track-name \"".$new_track_name."\"";
	$cmd.=" --network-url \"".$network_data_url."\"";
	$cmd.=" --ruler-url \"".$ruler_url."\"";
	$cmd.=" --track-int-url \"".$track_int_url."\"";
	$output=array();
	exec($cmd, $output);
	if($debug){
		fwrite($debugout, $cmd."\n");
	}
}
else if($analysis_type=="na_enriched_neighbors" || $analysis_type=="na_enriched_seeds"){
	$cmd=$cmd.$ng_root; 
	$cmd.=" --analysis-type \"".$analysis_type."\"";
	$cmd.=" --new-track-name \"".$new_track_name."\"";
	$cmd.=" --cutoff \"".$cut_off."\"";
	$cmd.=" --network-url \"".$network_data_url."\"";
	$cmd.=" --ruler-url \"".$ruler_url."\"";
	$cmd.=" --track-int-url \"".$track_int_url."\"";
	$output=array();
	if($debug){
		fwrite($debugout, $cmd."\n");
	}
	exec($cmd, $output);
	// return the location of newly create track
	// now needs to "upload" to the system
}  
else{


}
 // if the result track is empty
  if($output[0]=="NULL"){
		$output_string="{\"message\":\"NULL\"}";
  }
	else{
		$cmd="scripts/prepare_tracks.py";
		if(strcmp($network_type,"system")==0){
			$cmd.=" --usertrack";
		}
		else{
			$cmd.=" --usertrack --usernetwork";
		}
		// this is sbt
		$cmd=$cmd." --network=".$current_network." --track=".$output[0]." --tracktype=sbt -r ".$ng_root;
		if(count($output)==2){
			$mycolor=$output[1];
		}
		$output=array();
		if($debug){
			fwrite($debugout, $cmd);
		}
		exec($cmd,$output);
		if($debug){
			fwrite($debugout, print_r($output, true));
		}
		$len=(count($output)-1)/3;
		$output_string="{\"message\":\"OK\",\"type\":\"".$output[0]."\",";
		if(isset($mycolor)){
			$output_string.="\"color\":\"";
			$output_string.=$mycolor;
			$output_string.="\",";
		}
		$output_string.="\"url\":[";
		for($i=0; $i<$len; $i++){
			$output_string=$output_string."\"".$output[3*$i+1]."\"";
			if($i!=$len-1)
				$output_string.=",";
		}
		$output_string.="],\"int_url\":[";
		for($i=0; $i<$len; $i++){
			$output_string=$output_string."\"".$output[3*$i+2]."\"";
			if($i!=$len-1)
				$output_string.=",";
		}
		$output_string.="],\"name\":[";
		for($i=0; $i<$len; $i++){
			$output_string=$output_string."\"".$output[3*$i+3]."\"";
			if($i!=$len-1)
				$output_string.=",";
		}
		$output_string.="]}";
		if($debug){
			fwrite($debugout, $output_string);
		}
		if($debug){
			fwrite($debugout, $cmd);
			fwrite($debugout, $output[0]);
		}
	}
		print $output_string;
if($debug){
	fclose($debugout);
}
?>
