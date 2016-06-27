<?php
/*
  create a cct track based on gene_string and module level 
  and then simulate the function of user uploading a track
*/
$debug=false;
$valueGeneInModule=0.1;
$valueGeneInModule_Neg=-0.1;
$nonEnrichedGene='NA';
if($debug){
  $debugout = fopen("/tmp/create_all_related_module_track_debug.out","w");
}
/*
function search_array($array, $key, $value){
	$results=array();
	if(is_array($array)) {
		if(isset($array[$key]) && $array[$key]==$value) {
			$results[]=$array;
		}
		foreach($array as $subarray) {
			$results=array_merge($results, search($subarray, $key, $value));
		}
	}
	return $results;
}
*/

function rand_string( $length ) {
	$chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";	

	$size=strlen($chars);
	for($i=0; $i<$length; $i++){
		$str.=$chars[rand(0,$size-1)];
	}
	return $str;
}

function get_track_name($basename,$track_type){
  $random_s=rand_string(5);
  $track_file_base_name=time()."_".$random_s;
  $track_file_name=$track_file_base_name.".".$track_type;
  // return both file name,full path, full path without extension
  return array($track_file_name, $basename."/".$track_file_name, $basename."/".$track_file_base_name);
}

$cmd="scripts/prepare_tracks.py";
$user_int_dir="int_data/user/tracks";
$real_user_int_dir="/tmp/ng_int_data";
$symlink_user_int_data="int_data";
if(isset($_POST)){
	if($debug){
		fwrite($debugout, print_r($_POST, true));
	}
	// create a temp cct file and then "upload" to the server
	// reading from module file
	$cct_file_name="/tmp/".rand_string(40);
	$cct_file=fopen($cct_file_name,"w");
	$ruler=$_POST["ruler"];  
	if($debug){
		fwrite($debugout, print_r($ruler, true));
	}
	// find out the total number of level (not including level 0)
	// read from module file
	$module_string=file_get_contents($_POST["allModules"]);
	$modules=json_decode($module_string, true);
	if($debug){
		fwrite($debugout, print_r($modules, true));
	}
	$totalLevel=-1;
	foreach($modules as $module){
		if(intval($module["level"])>$totalLevel){
			$totalLevel=$module["level"];
		} 
	}
	if($debug){
		fwrite($debugout, $totalLevel);
	}
	fwrite($cct_file,"genesymbol\t");
	for($i=1; $i<=$totalLevel; $i++){
		fwrite($cct_file,"Level_$i");
		if($i!=$totalLevel)
			fwrite($cct_file,"\t");
	}
	fwrite($cct_file,"\n");
	$trackData=array();
	// initialize to all 0
	for($i=1; $i<=$totalLevel; $i++){
		$trackData[$i]=array_fill(0, count($ruler), $nonEnrichedGene);
	} 
  if($debug){
    fwrite($debugout, print_r($_POST["geneString"],true));
  }
	foreach($_POST["geneString"] as $data){
		// parse the label to find out which level 
    $module_name=$data["module_name"];
//  $found=search_array($modules, "name", $module_name);
		$start=$data["start"];
    $end=$data["end"];
    $curLevel=$data["level"];
	  if($debug){
		  fwrite($debugout, "start:".$start."\n");
		  fwrite($debugout, "end:".$end."\n");
	  }
    if($data["metric"]>0){
      $trackVal=$valueGeneInModule;
    }
    else{
      $trackVal=$valueGeneInModule_Neg;
    }
		for($k=$start; $k<=$end; $k++){
			$trackData[intval($curLevel)][$k-1]=$trackVal;
		}
	}
	if($debug){
		fwrite($debugout, print_r($trackData, true));
	}
	for($i=0; $i<count($ruler); $i++){
		fwrite($cct_file, $ruler[$i]."\t");
		for($j=1; $j<=$totalLevel; $j++){
			fwrite($cct_file, $trackData[$j][$i]);
			if($j!=$totalLevel){
				fwrite($cct_file,"\t");
			}
		}
		fwrite($cct_file, "\n");
	}
	fclose($cct_file);


	$cmd="scripts/prepare_tracks.py";
	$user_int_dir="int_data/user/tracks";
	$current_network=$_POST["currentNetwork"];
	$network_type=$_POST["networkType"]; 
	$track_label=$_POST["trackName"];
	$track_type=$_POST["trackType"];
	$root=getcwd();
	$fn=get_track_name($root."/".$user_int_dir,$track_type);
	if(!copy($cct_file_name, $fn[1])){
		print "{\"message\":\"Error\"}";
		exit;
	}
	if(strcmp($network_type,"system")==0){
		$cmd.=" --usertrack --network=";
	}
	else{
		$cmd.=" --usertrack --usernetwork --network=";
	}
	// for now, no sample info file
	$sample_info=0;
	$cmd=$cmd.$current_network." --track=".$fn[0]." --tracklabel=\"".$track_label."\" --tracktype=".$track_type." -r ".$root;
	if($sample_info==1){
		$cmd=$cmd." --sampleinfo";
	}
	$output=array();
	if($debug){
		fwrite($debugout, $cmd);
	}
	exec($cmd,$output);
	$output_string="{\"message\":\"OK\",\"type\":\"".$output[0]."\",";
	$output_string.="\"url\":[";
	$output_string=$output_string."\"".$output[1]."\"";
	$output_string.="],\"int_url\":[";
	$output_string=$output_string."\"".$output[2]."\"";
	$output_string.="],\"name\":[";
	$output_string=$output_string."\"".$output[3]."\"";
	if($sample_info==1){
		$output_string.="],\"sampleinfo\":[1";
	}
	$output_string.="], \"samples\":[";
	$output_string=$output_string."\"".$output[4]."\"";
	$output_string.="]}";
	if($debug){
		fwrite($debugout, $output_string);
	}
	print $output_string;  

	unlink($cct_file_name);
}
if($debug){
  fclose($debugout);
}
?>
