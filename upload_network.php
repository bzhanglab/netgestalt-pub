<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/ng_upload_network_debug.out","w");
}

include "generate_view_from_msm.php";

function rand_string($length) {
	$chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";	

	$size=strlen($chars);
	for($i=0; $i<$length; $i++){
		$str.=$chars[rand(0,$size-1)];
	}
	return $str;
}

function get_network_name($basename){
	$random_s=rand_string(5);
	$network_name=time()."_".$random_s;
  return array($network_name, $basename."/".$network_name);
}

$cmd="scripts/prepare_tracks.py";
$user_int_dir="int_data/user/networks";
$user_int_track_dir="int_data/user/tracks";
$real_user_int_dir="/tmp/ng_int_data";
$symlink_user_int_data="int_data";

$root=getcwd();

if(isset($_POST)){
	if(!is_dir($real_user_int_track)){
		mkdir($real_user_int_track, 0755, true);
	}
	if(!is_link($symlink_user_int_data)) {
		symlink($real_user_int_dir, $symlink_user_int_data);
	}
	if(!is_dir($user_int_dir)){
		mkdir($user_int_dir, 0755, true);
	}
	// move user uploaded network file into intermediate location
	$path_parts=pathinfo($_FILES["userUploadNetworkFile"]["name"]);
	if(strcmp($path_parts["extension"],"txt")==0){
		$_FILES["userUploadNetworkFile"]["name"]=$path_parts["filename"];
		$path_parts=pathinfo($_FILES["userUploadNetworkFile"]["name"]);
	}
	$ext=$path_parts["extension"];
	if(strcmp($ext,"nsm")!=0 && strcmp($ext,"msm")!=0){
		print "{\"message\":\"Wrong file type.\"}";
		exit;
	}
	// get the network name from the file name
	$user_network_name=basename($_FILES["userUploadNetworkFile"]["name"],".".$ext)."_".rand_string(5);
	// check user network name for special characters
	if(preg_match('/[\'\/~`\!@#\$%\^&\*\(\)\+=\{\}\[\]\|;:"\<\>,\.\?\\\]/', $user_network_name)){
		print "{\"message\":\"Network file name cannot contain special characters.\"}";
		exit;
	}
	if(strcmp($ext,"nsm")==0){
		$fn=get_network_name($root."/".$user_int_dir);
		$network_names=$fn[0];
		if(!is_dir($fn[1])){
			mkdir($fn[1], 0755, true);
		}
		// first copy the original file if user later want to download 
		$copied_file=$fn[1]."/".$fn[0].".".$ext;
		exec("cp ".$_FILES["userUploadNetworkFile"]["tmp_name"]." ".$copied_file);
		exec("chmod 644 ".$copied_file);
		$fh=fopen($_FILES["userUploadNetworkFile"]["tmp_name"],"r");
		// process the uploaded file,  separated the file  (separted by a line starting with "##" into three: .rul, .hmi., .net (optional)
		// check if the file has at least two sections;
		$ruler_exist=FALSE;
		$hmi_exist=FALSE;
		$section_count=0;
		while(!feof($fh)){
			$line=fgets($fh);
			if(preg_match("/^(#)+\s*ruler/i",$line)){
				$ruler_exist=TRUE;
				$section_count++;
			}
			if(preg_match("/^(#)+\s*hmi/i",$line)){
				$hmi_exist=TRUE;
				$section_count++;
			}
			if(preg_match("/^(#)+\s*network/i",$line)){
				$section_count++;
			}
		}
		if(!($ruler_exist && $hmi_exist)){
			print "{\"message\":\"Uploaded network file should contain .rul, .hmi and optionally .net sections.\"}";
			exit;
		}
		rewind($fh);
		$current_section=0;
		# open files for write
		$output_fh=array();
		$rul_fh=fopen($fn[1]."/".$fn[0].".rul", "w");
		array_push($output_fh, $rul_fh);
		$hmi_fh=fopen($fn[1]."/".$fn[0].".hmi", "w");
		array_push($output_fh, $hmi_fh);
		if($section_count==3){  // $section_count= 2 or 3
			$net_fh=fopen($fn[1]."/".$fn[0].".net","w");
			array_push($output_fh, $net_fh);
		}
		while(!feof($fh)){
			$line=fgets($fh);
			if(preg_match("/^(#)+/",$line)){
				$current_section++;
				continue;
			}
			fwrite($output_fh[$current_section-1], $line);
		}
		fclose($fh);
		fclose($rul_fh);
		fclose($hmi_fh);
		if($section_count==3)
			fclose($net_fh);
    # TODO 
    # if nsm has mapping_status section, need to pass that information
    # for now mapping_status=0 (for backward compatibility)
		$cmd.=" --mapping_status=0 --usernetwork --network=";
		$cmd=$cmd.$fn[0].",".$user_network_name." -r ".$root." --view=network_view";
		$output=array(); 
		if($debug){
			fwrite($debugout, $cmd."\n");
		}
		exec($cmd,$output);
		print "{\"message\":\"OK\",".$output[0]."}";
		if($debug){
			fwrite($debugout, "{\"message\":\"OK\",".$output[0]."}");
		}
	}
	else if(strcmp($ext,"msm")==0){
    create_msm($_FILES["userUploadNetworkFile"]["tmp_name"], $user_network_name);
	}
}
if($debug){
  fclose($debugout);
}
?>
