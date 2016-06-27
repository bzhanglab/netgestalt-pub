<?php

$debug=false;
if($debug){
  $debugout = fopen("/tmp/ng_generate_view_debug.out","w");
}

include 'generate_view_from_msm.php';

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
  return array($network_name, $basename."/".$network_name, $random_s);
}

$cmd="scripts/prepare_tracks.py";
$user_int_dir="int_data/user/networks";
$user_int_track_dir="int_data/user/tracks";

$root=getcwd();

if($debug){
  fwrite($debugout, print_r($_POST, true));
}

if(isset($_POST)){
  create_msm($_POST["msm"], $_POST["orig_cct_name"]);
}

if($debug){
  fclose($debugout);
}
?>
