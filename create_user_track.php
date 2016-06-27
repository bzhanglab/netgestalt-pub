<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/create_user_track_debug.out","w");
}

function rand_string( $length ) {
	$chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";	

	$size=strlen($chars);
	for($i=0; $i<$length; $i++){
		$str.=$chars[rand(0,$size-1)];
	}
	return $str;
}

$cmd="scripts/prepare_tracks.py";
$user_int_dir="int_data/user/tracks";
$real_user_int_dir="/tmp/ng_int_data";
$symlink_user_int_data="int_data";
if(isset($_POST)){
	$random_s=rand_string(5);
	$track_file_base_name=time()."_".$random_s;
  $track_type=$_POST["trackType"];
  $network_type=$_POST["networkType"];
  $track_name=$_POST["trackName"];
	$current_network=$_POST["currentNetwork"];
	$gene_string=$_POST["geneString"];
  
	if(!is_dir($real_user_int_track)){
		mkdir($real_user_int_track, 0755, true);
	}
	if(!is_link($symlink_user_int_data)) {
		symlink($real_user_int_dir, $symlink_user_int_data);
	}
	$gene_string=rtrim($gene_string,"|");
	$gene_string=str_replace("|","\t",$gene_string);
  if(!is_dir($user_int_dir)){
    mkdir($user_int_dir, 0755, true);
  }
  $track_file_name=$track_file_base_name.".".$track_type;
  $int_track_file = $user_int_dir."/".$track_file_name;
  
  $fh = fopen($int_track_file, 'w');   
  fwrite($fh, $track_name."\t".$track_name."\t".$gene_string);
  fclose($fh);
  if(strcmp($network_type,"system")==0){
    $cmd.=" --usertrack --network=";
  }
  else{
    $cmd.=" --usertrack --usernetwork --network=";
  }
  $root=getcwd();
  $cmd=$cmd.$current_network." --track=".$track_file_name." --tracktype=".$track_type." -r ".$root;
  if($debug){
    fwrite($debugout, $cmd."\n");
  }
  $output=array();
  exec($cmd, $output);
  if($debug){
    fwrite($debugout, print_r($output,true));
  }
  $len=(count($output)-1)/3;
  // output:
  //   type 
  //   url_1
  //   int_url_1
  //   name_1
  //   url_2
  //   int_url_2
  //   name_2
  // .....
  // don't need type and name
	$output_string="{\"type\":\"".$track_type."\",\"url\":[";
	//$output_string="{\"url\":[";
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
	$output_string.="]}";
  // output names is not used in this case ( only for uploaded tracks)
	print $output_string;
}
  if($debug){
    fclose($debugout);
  }
?>
