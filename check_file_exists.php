<?php

$path=$_POST["path"];
$root=getcwd();

if(is_file($root."/".$path)){
  print "1";
}
else
  print "0";

?>
