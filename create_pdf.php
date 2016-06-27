<?php
function rand_string( $length ) {
  $chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  $size=strlen($chars);
  for($i=0; $i<$length; $i++){
    $str.=$chars[rand(0,$size-1)];
  }
  return $str;
}

$top=$_POST["dim"]["top"];
$left=$_POST["dim"]["left"];
$width=$_POST["dim"]["width"];
$height=$_POST["dim"]["height"];
$sHeight=$_POST["dim"]["sHeight"];
$ngroot=$_POST["root"];
$viewport_w=$width+$left;
$viewport_h=$height+$top;
// create a temporary file for phantomjs
$out_file=rand_string(40);
$phantom_input="/tmp/".$out_file.".js";
$png_file="/tmp/ng_tiles/".$out_file.".png";
$pdf_file="/tmp/ng_tiles/".$out_file.".pdf";
$fh=fopen($phantom_input, 'w') or die("can't open file");
fwrite($fh,"var page=require('webpage').create();\n");
fwrite($fh,"page.clipRect={top:".$top.",left:".$left.",width:".$width.",height:".$sHeight."};\n");
fwrite($fh,"page.viewportSize={width:".$viewport_w.",height:".$viewport_h."};\n");
fwrite($fh,"page.settings.userAgent='SpecialAgent';\n");
foreach($_POST["cookies"] as $key=>$value){
	fwrite($fh,"phantom.addCookie({\n");
  fwrite($fh,"  'name':'".$key."',\n");
  fwrite($fh,"  'value':'".$value."',\n");
  fwrite($fh,"  'domain':'localhost',\n");
  fwrite($fh,"  'path':'".$ngroot."'\n");
  fwrite($fh,"});\n");
}
if($_POST["localstorage"]){
	fwrite($fh, "page.onInitialized=function(){\n");
  fwrite($fh, " page.evaluate(function(){\n");
  foreach($_POST["localstorage"] as $key=>$value){
    fwrite($fh, "  localStorage.setItem(\"".$key."\",".$value.")");
  }  
  fwrite($fh,"});\n};\n"); 
}
fwrite($fh,"page.open('http://localhost".$ngroot."/main.html',"."function(s){\n");
fwrite($fh, " window.setTimeout(function(){\n");
fwrite($fh, "   page.render('".$png_file."',{quality:80});\n");
fwrite($fh, "   phantom.exit();\n");
fwrite($fh, " },200);\n");
fwrite($fh, "});\n");
fclose($fh);

$output=array();
$cmd="./phantomjs ".$phantom_input;
exec($cmd, $output);
unlink($phantom_input);
$cmd="convert ".$png_file." ".$pdf_file;
exec($cmd, $output);
//$cmd="convert -crop ".$width."x".$height."+0+0 ".$pdf_file." ".$pdf_file;
//exec($cmd, $output);
$output_string="{\"path\":\"".$pdf_file."\"}";
print $output_string;
?>
