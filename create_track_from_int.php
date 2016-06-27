<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/create_track_from_int_debug.out","w");
}

$cmd="scripts/prepare_tracks.py";
$root=getcwd();
$track_label="";

if(isset($_POST)){
	$system_or_user_track=$_POST["type"];  //system or user track?
	$system_or_user_network=$_POST["ntype"];  //system or user network?
	$current_network=$_POST["currentNetwork"];
	$int_file_path=$_POST["int_url"];
	$path_parts=pathinfo($int_file_path);
	$track_type=$path_parts["extension"];  // sbt, sct, cbt, cct
	$all_track_file_names=basename($int_file_path);

	if(strcmp($system_or_user_track,"user")==0){
    if(strcmp($system_or_user_network,"system")==0){
			$cmd.=" --usertrack --network=";
    }
    else{
		  $cmd.=" --usertrack --usernetwork --network=";
    }
		if(strcmp($track_type,"sbt")==0 || strcmp($track_type,"sct")==0){
			// tracklabel is only for cbt and cct, ignored for sbt and sct.
			$cmd=$cmd.$current_network." --track=".$all_track_file_names." --tracktype=".$track_type." -r ".$root;
			$output=array();
			exec($cmd,$output); 
			$output_string="{\"message\":\"OK\",\"type\":\"".$output[0]."\",";
			$output_string.="\"url\":[";
			$output_string=$output_string."\"".$output[1]."\"";
			$output_string.="],\"int_url\":[";
			$output_string=$output_string."\"".$output[2]."\"";
			$output_string.="],\"name\":[";
			$output_string=$output_string."\"".$output[3]."\"";
			$output_string.="]}";
			print $output_string;
		}
		else{
			// tracklabel is only for cbt and cct, ignored for sbt and sct.
			$cmd=$cmd.$current_network." --track=".$all_track_file_names." --tracklabel=".$track_label." --tracktype=".$track_type." -r ".$root;
			$output=array();
			exec($cmd,$output); 
			$output_string="{\"message\":\"OK\",\"type\":\"".$output[0]."\",";
			$output_string.="\"url\":[";
			$output_string=$output_string."\"".$output[1]."\"";
			$output_string.="],\"int_url\":[";
			$output_string=$output_string."\"".$output[2]."\"";
			$output_string.="],\"name\":[";
			$output_string=$output_string."\"".$output[3]."\"";
			$output_string.="], \"samples\":[";
			$output_string=$output_string."\"".$output[4]."\"";
			$output_string.="]}";
			print $output_string;
		}
	}
	else{ // generate system track for user network from intermediate file 
		if(strcmp($track_type,"sbt")==0 || strcmp($track_type,"sct")==0){
			$cmd.=" --usernetwork --network=";
			// tracklabel is only for cbt and cct, ignored for sbt and sct.
			$cmd=$cmd.$current_network." --track=".$all_track_file_names." --tracktype=".$track_type." -r ".$root;
			$output=array();
			exec($cmd,$output); 
			$output_string="{\"message\":\"OK\",\"type\":\"".$output[0]."\",";
			#$output_string="{\"message\":\"".$cmd."\",\"type\":\"".$output[0]."\",";
			$output_string.="\"url\":[";
			$output_string=$output_string."\"".$output[1]."\"";
			$output_string.="],\"int_url\":[";
			$output_string=$output_string."\"".$output[2]."\"";
			$output_string.="],\"name\":[";
			$output_string=$output_string."\"".$output[3]."\"";
			$output_string.="]}";
			print $output_string;
		}
		else{
			$cmd.=" --usernetwork --network=";
			// tracklabel is only for cbt and cct, ignored for sbt and sct.
			$cmd=$cmd.$current_network." --track=".$all_track_file_names." --tracklabel=".$track_label." --tracktype=".$track_type." -r ".$root;
			$output=array();
			exec($cmd,$output); 
			$output_string="{\"message\":\"OK\",\"type\":\"".$output[0]."\",";
			$output_string.="\"url\":[";
			$output_string=$output_string."\"".$output[1]."\"";
			$output_string.="],\"int_url\":[";
			$output_string=$output_string."\"".$output[2]."\"";
			$output_string.="],\"name\":[";
			$output_string=$output_string."\"".$output[3]."\"";
			$output_string.="], \"samples\":[";
			$output_string=$output_string."\"".$output[4]."\"";
			$output_string.="]}";
			print $output_string;
		}
	}
}

if($debug){
  fwrite($debugout, $cmd."\n");
  fwrite($debugout, print_r($output,true));
  fwrite($debugout, "\n");
  fwrite($debugout, $output_string);
}

if($debug){
    fclose($debugout);
}
?>
