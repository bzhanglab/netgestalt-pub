<?php

$debug=false;
if($debug){
	$debugout = fopen("/tmp/upload_track_debug.out","w");
}

include 'check_track_error.php';

function get_track_name($basename,$track_type){
	$random_s=rand_string(5);
	$track_file_base_name=time()."_".$random_s;
	$track_file_name=$track_file_base_name.".".$track_type;
  // return both file name,full path, full path without extension
  return array($track_file_name, $basename."/".$track_file_name, $basename."/".$track_file_base_name);
}

function check_sbt_all_genes($sbt_file){
	$fh=fopen($sbt_file,"r");
	$has_error=false;
	$detail_msg="The following line(s) contains genes not listed in the first line:<br>";
	$line_no=1;
	$line=rtrim(fgets($fh),"\r\n"); // skip the first line
  $items=explode("\t",$line);
  if(!preg_match("/[Aa]ll/",$items[0])){
    return array("noerror","");
  }
  $allgenes=array_slice($items,2);
	while(!feof($fh)){
		if($line!=""){
			$line=fgets($fh);
			$line=rtrim($line, "\r\n");
			$items=explode("\t",$line);
			$cur_genes=array_slice($items,2);
      $diff=array_diff($cur_genes, $allgenes);
      if(!empty($diff)){
				$cur_msg="line #".($line_no+1).": ";
				$has_error=true;
        foreach($diff as $value){
          $cur_msg.=($value." ");
        }
				$detail_msg.=($cur_msg."<br>");
			}
			$line_no++;
		}
	}
	fclose($fh);
	if($has_error){
		return array("error",$detail_msg);
	}
	else{
		return array("noerror","");
	}
}

function check_cbt_values($cbt_file){
	$fh=fopen($cbt_file,"r");
	$has_error=false;
	$detail_msg="cbt file contains bad values in the following line(s):<br>";
	$line_no=1;
	$line=fgets($fh); // skip the first line
	while(!feof($fh)){
		if($line!=""){
			$line=fgets($fh);
			$line=rtrim($line, "\r\n");
			$items=explode("\t",$line);
			array_shift($items);
			$newline=implode("",$items);
			if(preg_match("/([^01])/",$newline,$matches)){
				if($debug){
					fwrite($debugout, $newline);
				}
				$has_error=true;
				$cur_msg="line #".($line_no+1);
				$detail_msg.=($cur_msg."<br>");
			}
			$line_no++;
		}
	}
	fclose($fh);
	if($has_error){
		return array("error",$detail_msg);
	}
	else{
		return array("noerror","");
	}
}


function check_overlapping_genes($track_file, $track_type){
  global $ruler_array;
	global $debug, $debugout;
	// for sbt, genes starts with the third item of each row
	$fh=fopen($track_file,"r");
  $allgenes=array();
	if(strcmp($track_type,"sbt")==0){
    // for sbt, remove lines that does not overlap with ruler
    // if none of the lines overlap with ruler, report error
    $tmp_track_file=$track_file."_tmp";
    $fh2=fopen($tmp_track_file,"w");
    $has_error=false;
    $has_overlapping_track=false;
		while(!feof($fh)){
			$line=fgets($fh);
			if($line!=""){
				$line=rtrim($line, "\r\n");
				$names=explode("\t",$line); 
				$allgenes=array_slice($names,2);
				// check every sbt track
				$result=array_intersect($ruler_array,$allgenes);
				if($debug){
					fwrite($debugout, print_r("check_overlapping_genes",true));
					fwrite($debugout, print_r($ruler_array,true));
					fwrite($debugout, print_r("reading line",true));
					fwrite($debugout, print_r($line,true));
				}
				if(empty($result)){
					$has_error=true;
				}
				else{
					$has_overlapping_track=true;
					fwrite($fh2, $line."\n");
				}
			}
		}
	  fclose($fh);
	  fclose($fh2);
    if($has_error){
      exec("mv -f ".$tmp_track_file." ".$track_file);   
    }
    else{
      exec("rm -f ".$tmp_track_file);
    }
    return $has_overlapping_track;
	} 
	else{ // sct, cbt, cct, sst 
		// collect first column items to an array
		$line=fgets($fh); //skip the first line
		while(!feof($fh)){
			$line=fgets($fh);
			if($line!=""){
				$line=rtrim($line,"\r\n");
				$names=explode("\t",$line);
				array_push($allgenes, $names[0]);
			}
		} 
	  fclose($fh);
    $result=array_intersect($ruler_array,$allgenes);
    if(empty($result)){
		  return false;
    }
    return true;
	}
}

$cmd="scripts/prepare_tracks.py";
$user_int_dir="int_data/user/tracks";
$real_user_int_dir="/tmp/ng_int_data";
$symlink_user_int_data="int_data";
$root=getcwd();
$track_label="";
$sample_info=0;

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
  if(!is_dir($user_int_dir)){
    mkdir($user_int_dir, 0755, true);
  }
  $current_network=$_POST["currentNetwork"];
  $network_type=$_POST["networkType"];
  $ruler_array=json_decode($_POST["ruler"]);
  $organism=$_POST["organism"];
  $map_to_gene_symbol=$_POST["mapToGeneSymbol"];
  $id_type=$_POST["idType"];
  // map_to_gene_symbol selection is displayed in the UI as "blank" for avoiding confusion
  // but its actually value should be "True"
  if($id_type=="hgnc_symbol" || $id_type=="NULL"){
    $map_to_gene_symbol="False";
  }
	if($debug){
		fwrite($debugout, print_r($_POST, true));
	}
	// just move user uploaded tracks into user_int_dir
	// user file name must have extension:
	// .sbt, .sct, .cbt, .cct, .sst
	// or .sbt.txt, .sct.txt, .cbt.txt, .cct.txt, .sst.txt
	// if file name has extension "txt", remove it to reveal the real extension
  $file_prefix="/tmp/ng_";
	$path_parts=pathinfo($_FILES["userUploadFile"]["name"]);
  if($debug){
    fwrite($debugout, print_r($path_parts, true));
  }
	if(strcmp($path_parts["extension"],"txt")==0){
		$_FILES["userUploadFile"]["name"]=$path_parts["filename"];
	  $path_parts=pathinfo($_FILES["userUploadFile"]["name"]);
	}
  $orig_track_name=$path_parts["filename"];
  $track_base_name=basename($_FILES["userUploadFile"]["tmp_name"]);
	$track_type=$path_parts["extension"];
  $track_file=$file_prefix.$track_base_name.".".$track_type;
  if(!move_uploaded_file($_FILES["userUploadFile"]["tmp_name"], $track_file)){
    print "{\"message\":\"Error\"}";
    exit;
  }
  // dealing with multiple tracks in a file ( for sbt and sct only, does NOT support multiple cbt or cct or sst in a 
  // user uploaded file)
  $all_track_file_names="";
  $count=0;
  $index=0;
  $first_line_ignore=false;
	if($debug){
		fwrite($debugout, $track_type."\n");
    fwrite($debugout, $track_file."\n");
	} 
  // sometimes file many contain \r as line separator
  //exec("tr '\r' '\n' <".$tmp_file." >".$tmp_file."_tmp");
  //exec("mv -f ".$tmp_file."_tmp "."$tmp_file");
  exec("dos2unix -q ".$track_file);

  // Gene symbol mapping if necessary
	if($map_to_gene_symbol=="True"){
		$map_cmd="bin/map_to_symbol";
		$map_cmd.=" --input-file ".$track_file;
		$map_cmd.=" --organism \"".$organism."\"";
		if($track_type=="sbt" || $track_type=="sct"){
			$input_type=$track_type;
		} 
		else if($track_type=="cbt" || $track_type=="cct"){
			$input_type="matrix";
		}
		$map_cmd.=" --input-type ".$input_type;
		$map_cmd.=" --id-type ".$id_type;
		$old_track_file=$track_file;
		$track_file=$old_track_file."_mapped";
		$map_cmd.=" --output-file ".$track_file; 
		$map_cmd_output=array();
		if($debug){
			fwrite($debugout, $map_cmd);
		}
		exec($map_cmd, $map_cmd_output);
		if(file_exists($old_track_file)){
			unlink($old_track_file);
		}
		// check error
		$map_cmd_error="";
		for($i=0; $i<count($map_cmd_output); $i++){
			$map_cmd_error.=($map_cmd_output[$i]."\n");
		}
		if(!empty($map_cmd_error)){
			print "{\"message\":\"Error mapping ID to symbol\",\"detail\":\"".base64_encode($map_cmd_error)."\"}";
			exit;
		}
		if($debug){
			fwrite($debugout, "mapping done\n");
		}
	}

  // check sct, cbt, cct, sst for consistent column number
  $ret=check_column_number($track_file,$track_type);
  list($ret_code, $ret_detail)=$ret;
  if($ret_code=="error"){
    print "{\"message\":\"Column number not match\",\"detail\":\"".base64_encode($ret_detail)."\"}";
    exit;
  }
	if($debug){
		fwrite($debugout, "check_column_number done\n");
	}
  // check for special characters and duplicated gene names (all track types) 
  $ret=check_special_characters($track_file,$track_type);
  list($ret_code, $ret_detail)=$ret;
  if($ret_code=="error"){
    print "{\"message\":\"Special characters\",\"detail\":\"".base64_encode($ret_detail)."\"}";
    exit;
  }
	if($debug){
		fwrite($debugout, "check_special_character done\n");
	}
  $ret=check_duplicated_genes($track_file,$track_type);
  list($ret_code, $ret_detail)=$ret;
  if($ret_code=="error"){
    print "{\"message\":\"Gene duplicated\",\"detail\":\"".base64_encode($ret_detail)."\"}";
    exit;
  }
	if($debug){
		fwrite($debugout, "check_duplicated_genes done\n");
	}
  // check overlapping genes (track genes and network genes)
  if(!check_overlapping_genes($track_file,$track_type)){
    print "{\"message\":\"No overlapping genes\"}";
    exit;
  }
	if($debug){
		fwrite($debugout, "check_overlapping_genes done\n");
	}
	if(strcmp($track_type,"sbt")==0){
    // if the first line contains "All All.....", check if the all the genes in the following lines 
    // are included in the first line
    $ret=check_sbt_all_genes($track_file);
    list($ret_code, $ret_detail)=$ret;
		if($ret_code=="error"){
			print "{\"message\":\"SBT all genes error\",\"detail\":\"".base64_encode($ret_detail)."\"}";
			exit;
		} 
 // check number of tracks in the uploaded file and separate them into individual track, move them into intermediate data directory
 // for sbt, if the first line starts with "All[Tab]All....", then this line must be included in each individual track
		$fh=fopen($track_file,"r");
		while(!feof($fh)){
      $line=fgets($fh);
      if(preg_match("/^[Aa]ll\t/",$line)){
        $first_line_ignore=true;
        $line_starts_with_all=$line;
      }
      else{
        $count+=1; 
      }
		}
    if($count-1>3){
      print "{\"message\":\"Too many tracks\"}";
      fclose($fh);
      exit;
    }
    if($debug){
      fwrite($debugout, "abc");
      fwrite($debugout,$line_starts_with_all);
    }
		rewind($fh);
    while(!feof($fh)){
      if($index==$count-1)
        break;
      $line=trim(fgets($fh));
      if(preg_match("/^[Aa]ll\t/",$line)){
        continue;  
      }
      $fn=get_track_name($root."/".$user_int_dir,$track_type);
      $tf=fopen($fn[1], "w");
     /*
      // this file is used during enrichment analysis
      if($first_line_ignore){
        $fn_all=$fn[1].".all";
        $fn_all_f=fopen($fn_all,"w");
        $all_genes=preg_split('/\t/',$line_starts_with_all);
        array_splice($all_genes, 0, 2); 
        fwrite($fn_all_f, implode("\t",$all_genes));
        fclose($fn_all_f);
      }
*/
      $items=preg_split('/\t/',$line);
      // add a random string to user track name
      $items[0]=$items[0]."_".rand_string(5);
      $items[0]=remove_special($items[0]);
      $newline=implode("\t",$items);
      if($first_line_ignore){
        fwrite($tf,$line_starts_with_all);
      }
      fwrite($tf,$newline);
      $index+=1;
      $all_track_file_names.=$fn[0];
      if($index!=$count)
        $all_track_file_names.=",";
      fclose($tf);
    }
    fclose($fh);
	}
  else if(strcmp($track_type,"sct")==0){
		$fh=fopen($track_file,"r");
    $line=trim(fgets($fh));
    // check how many tracks 
    $count=count(preg_split('/\t/',$line));
    $count-=1;
    if($count>3){
      print "{\"message\":\"Too many tracks\"}";
      fclose($fh);
      exit;
    }
    rewind($fh);
    // split the file into single tracks
    // open all files
    $fhs=array();
    for($i=0; $i<$count;$i++){
      $fn=get_track_name($root."/".$user_int_dir,$track_type);
      $tf=fopen($fn[1],"w");
      array_push($fhs, $tf);
      $all_track_file_names.=$fn[0]; 
      if($i!=$count-1)
        $all_track_file_names.=",";
    }
    $firstline=true;
		while(!feof($fh)){
			$line=trim(fgets($fh));
			$items=preg_split('/\t/',$line);
			if($firstline){
				for($i=0; $i<$count; $i++){
          $items[$i+1]=remove_special($items[$i+1]);
					fwrite($fhs[$i],$items[0]."\t".$items[$i+1]."_".rand_string(5)."\n");
				}
        $firstline=false;
			}
			else{
				for($i=0; $i<$count; $i++){
					fwrite($fhs[$i],$items[0]."\t".$items[$i+1]."\n");
				}
			}
		}
    for($i=0;$i<count;$i++)
      fclose($fhs[$i]);
    fclose($fh);
  }
	else{ // just copy for cbt,cct,sst
    // for cbt, first check if the data value fields only contains 0, 1 
		if(strcmp($track_type,"cbt")==0){
			$ret=check_cbt_values($track_file);
			list($ret_code, $ret_detail)=$ret;
			if($ret_code=="error"){
				print "{\"message\":\"CBT value error\",\"detail\":\"".base64_encode($ret_detail)."\"}";
				exit;
			}
		}
		$track_label=$orig_track_name;
		$track_label=$track_label."_".rand_string(5);
		$fn=get_track_name($root."/".$user_int_dir,$track_type);
		if(!rename($track_file, $fn[1])){
			if($debug){
				fwrite($debugout, $track_file."\n");
				fwrite($debugout, $fn[1]."\n");
				fwrite($debugout, "moving tmp file error....\n");
			}
			print "{\"message\":\"Error\"}";
			exit;
		}
		// check if the column have duplicated sample names
		if($debug){
			fwrite($debugout, $fn[1]."....".$track_type."\n");
		}
   $ret=check_duplicated_samples($fn[1],$track_type);
   list($ret_code, $ret_detail)=$ret;
		if($debug){
			fwrite($debugout, $ret_code);
		}
   if($ret_code=="error"){
      print "{\"message\":\"Samples duplicated\",\"detail\":\"".base64_encode($ret_detail)."\"}";
			exit;
		}
		// track sample information file
	 if(!empty($_FILES['userUploadSampleInfoFile']['name'])) {
     $tmp_sample_info_file=$_FILES["userUploadSampleInfoFile"]["tmp_name"];
		 $ret=check_column_number($tmp_sample_info_file,"tsi");
		 list($ret_code, $ret_detail)=$ret;
		 if($ret_code=="error"){
			 print "{\"message\":\"Column number not match\",\"detail\":\"".base64_encode($ret_detail)."\"}";
			 exit;
		 }
		 // check special characters and duplicated samples
		 $ret=check_special_characters($tmp_sample_info_file,"tsi");
		 list($ret_code,$ret_detail)=$ret;
		 if($ret_code=="error"){
			 print "{\"message\":\"Special characters\",\"detail\":\"".base64_encode($ret_detail)."\"}";
			 exit;
		 }
		 // check duplicate sample feature names
		 $ret=check_barcode($tmp_sample_info_file);
		 list($ret_code,$ret_detail)=$ret;
		 if($ret_code=="error"){
			 print "{\"message\":\"Duplicated sample feature\",\"detail\":\"".base64_encode($ret_detail)."\"}";
			 exit;
		 }
		 $ret=check_duplicated_samples($tmp_sample_info_file,"tsi");
		 list($ret_code,$ret_detail)=$ret;
		 if($ret_code=="error"){
			 print "{\"message\":\"Samples duplicated\",\"detail\":\"".base64_encode($ret_detail)."\"}";
			 exit;
		 } 
		 $ret=check_invalid_data($tmp_sample_info_file);
		 list($ret_code,$ret_detail)=$ret;
		 if($ret_code=="error"){
			 print "{\"message\":\"Invalid data in tsi\",\"detail\":\"".base64_encode($ret_detail)."\"}";
			 exit;
		 } 
		if($debug){
			fwrite($debugout, "OK");
		}
		 if(!move_uploaded_file($tmp_sample_info_file, $fn[2].".tsi")){
			 print "{\"message\":\"Error\"}";
			 exit;
		 }
		 // check if sample names in the two files matched
     $ret=check_samples_match($fn[1],$fn[2].".tsi");
     list($ret_code,$ret_detail)=$ret;
     if($ret_code=="error"){
			 print "{\"message\":\"Samples not match\", \"detail\":\"".base64_encode($ret_detail)."\"}";
			 exit;
		 }
		 $sample_info=1;
	 }
		$all_track_file_names=$fn[0];
	}

 
	// check file size, if large than 10M  we will not process
	// file limit can be set in php.ini
	//if(filesize("$trackdir_full"."/raw_data/raw_track_data/".$_FILES["userUploadFile"]["name"])>10485760){
	//  echo "File too large";
	//  exit;
	//}
  if(strcmp($network_type,"system")==0){
		$cmd.=" --usertrack --network=";
  }
  else{
		$cmd.=" --usertrack --usernetwork --network=";
  }
	if(strcmp($track_type,"sbt")==0 || strcmp($track_type,"sct")==0){
		// tracklabel is only for cbt and cct, ignored for sbt and sct.
		$cmd=$cmd.$current_network." --track=".$all_track_file_names." --tracktype=".$track_type." -r ".$root;
		$output=array();
    if($debug){
      fwrite($debugout, $cmd);
    }
		exec($cmd,$output); 
    if($debug){
      fwrite($debugout, print_r($output, true));
    }
		$len=(count($output)-1)/3;
		$output_string="{\"message\":\"OK\",\"type\":\"".$output[0]."\",";
		$output_string.="\"url\":[";
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
		$output_string.="],\"name\":[";
		for($i=0; $i<$len; $i++){
			$output_string=$output_string."\"".$output[3*$i+3]."\"";
			if($i!=$len-1)
				$output_string.=",";
		}
		$output_string.="]}";
    if($debug){
      fwrite($debugout, $output_string);
    }
		print $output_string;
	}
	else{
		// tracklabel is only for cbt,cct and sst, ignored for sbt and sct.
		$cmd=$cmd.$current_network." --track=".$all_track_file_names." --tracklabel=".$track_label." --tracktype=".$track_type." -r ".$root;
    if($sample_info==1){
      $cmd=$cmd." --sampleinfo";
    }
		$output=array();
		exec($cmd,$output); 
    if($debug){
      fwrite($debugout, $cmd);
    }
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
	}
  // remove the uploaded track file from /tmp
		if(file_exists($track_file)){
			unlink($track_file);
		}
}
  if($debug){
    fclose($debugout);
  }
?>
