<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/ng_download_debug.out","w");
}

function rand_string( $length ) {
  $chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  $size=strlen($chars);
  for($i=0; $i<$length; $i++){
    $str.=$chars[rand(0,$size-1)];
  }
  return $str;
}

$outdir="data/tiles/";
//var_dump($_POST["input_data"]);
$obj=json_decode($_POST["input_data"], true);
$filepath=$obj["path"];
$ruler=$obj["ruler"];
$type=$obj["type"]; // sbt, sct, cbt, cct
$name=$obj["name"]; 
if($debug){
  fwrite($debugout, print_r($obj,true));
}
// need to modify the file: add the gene names as the first column, also remove comments

$file=fopen($filepath, "r") or exit("Unable to open file!");
// relative path to ng root
$outfilename=$outdir.rand_string(40);
$outfile=fopen($outfilename,"w") or exit("Unable to create file!");

// there is an extra line of sample names
/*
if($type=="cbt" || $type=="cct"){
  array_unshift($ruler,"");
}
*/

$len=0;
if($type=="sbt" || $type=="sct"){
	$index=0;
	while(!feof($file)){
		// if line starts with "#" then skip
		$line=fgets($file);
		if(substr($line,0,1)=="#")
			continue;
		fwrite($outfile, $line); 
		//fwrite($outfile, $ruler[$index]."\t".$line); 
		$index++;
		fwrite($outfile, "\n"); 
	}
}
else{  // for composite track, no need to add ruler as first column 
	$first=true;
	$orig_data=array();
	while(!feof($file)){
		$line=fgets($file);
		if($first){
			$len=count(explode("\t",$line));
			$first=false;
			fwrite($outfile, $line);  // write the first line (header)
		}
		// save the original data in an associative array
		$gene_name=strtok($line, "\t");
		$value=strtok("");
		$orig_data[$gene_name]=$value;
	}
  $na=join("\t",array_fill(0,$len-1,"NA"));
	for($i=0; $i<count($ruler); $i++){
		if(array_key_exists($ruler[$i],$orig_data)){
			fwrite($outfile, $ruler[$i]."\t".$orig_data[$ruler[$i]]); 
		}
		else{ 
      fwrite($outfile, $ruler[$i]."\t".$na."\n");
		}
	}
  // if there is tsi file, we need to make it a zip file
	if(array_key_exists("tsi", $obj)){
		$tsi_file_name=$outdir.rand_string(40);
		// tsi is in the same directory as the composite track
		$info=pathinfo($filepath);
		$tsi_file_path=$info['dirname']."/".$info['filename'].".tsi";
    if($debug){
      fwrite($debugout,$tsi_file_path."\n");
    }
    $zip_file_path=$outdir.rand_string(40).".zip";
		copy($tsi_file_path, $tsi_file_name); 
		$zip = new ZipArchive();
		$zip->open($zip_file_path, ZipArchive::CREATE);
		$zip->addFile($outfilename, $name.".".$type.".txt");
		$zip->addFile($tsi_file_name, $name.".tsi.txt");
		$zip->close();
    header('Content-disposition: attachment; filename="'.$name.'.zip"');
    header('Content-type: application/zip, application/octet-stream');
    readfile($zip_file_path);
    exit;
	}
}

fclose($file);
fclose($outfile);

header('Content-Description: File Transfer');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-disposition: attachment; filename="'.$name.".".$type.'.txt"');
header('Content-type: text/plain');
header('Content-Length: '.filesize($outfilename));

readfile($outfilename);

if($debug){
 fclose($debugout);
}
?>
