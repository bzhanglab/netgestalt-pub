<?php
$filepath=$_GET["path"];
$fsize=filesize($filepath)*.0009765625; //KB
if($fsize<1024){
  $fsize=round($fsize,2);
  echo $fsize." KB";
}
else{
  $fsize=round($fsize*.0009765625,2);
  echo $fsize. "MB";
}
?>
