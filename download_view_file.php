<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/ng_download_view_debug.out","w");
}

function rand_string( $length ) {
  $chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  $size=strlen($chars);
  for($i=0; $i<$length; $i++){
    $str.=$chars[rand(0,$size-1)];
  }
  return $str;
}

$int_dir="int_data/user/networks/";
$out_dir="data/tiles/";
$obj=json_decode($_POST["input_data"],true);
$view_dir=$int_dir.$obj["dirname"];
$random_out=rand_string(40);

if($debug){
  fwrite($debugout, $view_dir."\n");
  fwrite($debugout, $outfilename."\n");
  fwrite($debugout, $displayname);
}

if(!file_exists($view_dir)){
  exit("view directory not exist");
}

$view_type=array(".nsm",".msm");
// only one of the types can exist
foreach($view_type as $type){
	$view_file=$view_dir."/".$obj["dirname"].$type;
	if(file_exists($view_file)){
		$outfilename=$out_dir.$random_out.$type.".txt";
		$displayname=$obj["output_name"].$type.".txt";
		exec("cat ".$view_file." >> ".$outfilename);
    break;
	}
}

header('Content-Description: File Transfer');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-disposition: attachment; filename='.$displayname);
header('Content-type: text/plain');
header('Content-Length: '.filesize($outfilename));

readfile($outfilename);

if($debug){
 fclose($debugout);
}
?>
