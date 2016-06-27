<?php

function rand_string($length) {
  $chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  $size=strlen($chars);
  for($i=0; $i<$length; $i++){
    $str.=$chars[rand(0,$size-1)];
  }
  return $str;
}

// only allow a-z, A-Z, 0-9, '-','_', replace everything else with "_"
function remove_special($str){
  $str=preg_replace('/[^a-zA-Z0-9\-_]/s', '_', $str);
  return $str;
}

function check_barcode($sample_file){
	$fh=fopen($sample_file,"r");
	$has_error=false;
	$detail_msg="duplicated sample feature(s):<br>";
	$line=fgets($fh);
	$line=rtrim($line, "\r\n");
	$features=explode("\t",$line);
	array_shift($features);
  $count_array=array_count_values($features);
  $duplicates=array();
  foreach ($count_array as $k => $v) {
    if($v>1){
      array_push($duplicates, $k);
    }
  }
  $cnt=count($duplicates);
  if($cnt>0){
    $has_error=true;
    $dup_features="";
    for($i=0; $i<$cnt; $i++){
      $dup_features.=($duplicates[$i]);
      if($i!=$cnt-1){
        $dup_features.=",";
      }
    }
    $detail_msg.=($dup_features."<br>");
  }
  fclose($fh);
  if($has_error){
    return array("error",$detail_msg);
  }
  else{
    return array("noerror","");
  }
}

// check composite track (cbt,cct,sst) file first line (sample names) contains duplicates
// check tsi sample information.
// return TRUE if contains duplicates
function check_duplicated_samples($track_file, $track_type){
	global $debug, $debugout;
	if($debug){
		fwrite($debugout, $track_file."....".$track_type);
	}
	$fh=fopen($track_file,"r");
	$has_error=false;
	$detail_msg=$track_type." file:<br>";
	if(strcmp($track_type,"tsi")!=0){
		$line=fgets($fh);
		$line=rtrim($line, "\r\n");
		$samples=explode("\t",$line);
		array_shift($samples);
	}
	else{ //tsi: first column starting the 3rd row
		$samples=array();
		// skip the first 2 rows
		$line=fgets($fh);
		$line=fgets($fh);
		while(!feof($fh)){
			$line=fgets($fh);
			if($line!=""){
				$line=rtrim($line,"\r\n");
				$names=explode("\t",$line);
        // check for the optional 3rd line (feature categories)
        if(preg_match("/category/i",$names[0])){
          continue;
        }
				array_push($samples, $names[0]);
			}
		}
	}
	$count_array=array_count_values($samples);
	$duplicates=array();
	foreach ($count_array as $k => $v) {
		if($v>1){
			array_push($duplicates, $k);
		}
	}
	if($debug){
		fwrite($debugout, "xxxxx\n");
		fwrite($debugout, print_r($samples, true));
		fwrite($debugout, print_r($duplicates, true));
		fwrite($debugout, print_r(count($duplicates), true));
	}
	if(count($duplicates)>0){
		$has_error=true;
		$dup_samples="";
		foreach ($duplicates as $smple){
			$dup_samples.=($smple." ");
		}
		$detail_msg.=($dup_samples."<br>");
	}
	fclose($fh);
	if($has_error){
		if($debug){
			fwrite($debugout, $detail_msg);
		}
		return array("error",$detail_msg);
	}
	else{
		return array("noerror","");
	}
}

function check_column_number($track_file, $track_type){
	global $debug, $debugout;
  if($track_type=="sbt"){
    return false;
  }
  $fh=fopen($track_file,"r");
  $first_line_item_cnt=-1; // compare every other line with first line
  $line_no=0;
	while(!feof($fh)){
		$line=fgets($fh);
		if($line!=""){
			$line=rtrim($line, "\r\n");
			$items=explode("\t",$line); 
			$col_cnt=count($items);
			if($first_line_item_cnt==-1){
				$first_line_item_cnt=$col_cnt;
				$line_no++;
				continue;
			}
			else if($col_cnt!=$first_line_item_cnt){
				$detail_msg=$track_type." file:<br>Number of fields in first line: ".$first_line_item_cnt."<br>";
				$detail_msg.=("Number of fields in line #".($line_no+1).": ".$col_cnt);
				return array("error", $detail_msg); 
			}
			else{
				$last_col_cnt=$col_cnt;
			}
		}
   $line_no++;
	}  
  return array("noerror", "");
}

// only allow a-z, A-Z, 0-9, '-','_','." for sample or gene names
function check_special_characters($track_file, $track_type){
	global $debug, $debugout;
	if($debug){
		fwrite($debugout, "in check_special_characters....\n") or die('fwrite failed');
		fwrite($debugout, $track_file."\n");
    fwrite($debugout, $track_type."\n");
	} 
	// for sbt or tsi, just search the whole file
	$fh=fopen($track_file,"r") or die('cannot open file');
	$has_error=false;
	$detail_msg=$track_type." file:<br>";
	$line_no=0;
	if($debug){
    if(!$fh){
		  fwrite($debugout, "cannot open file\n");
    }
	} 
	if(strcmp($track_type,"sbt")==0 || strcmp($track_type,"tsi")==0){
		while(!feof($fh)){
			$line=fgets($fh);
			if($debug){
				fwrite($debugout, $line);
			} 
			if($line!=""){
				$line=rtrim($line, "\r\n");
				// search the whole line
				if(preg_match_all("/([^a-zA-Z0-9\|\-_\. \,\(\)\t])/",$line,$matches)){
					$matches=$matches[0];
					//				$matches=array_slice($matches[0],1);
					if($debug){
						fwrite($debugout, print_r($matches,true));
					}
					$has_error=true;
					$matched_chars=array();
					foreach($matches as $matched){
						array_push($matched_chars, $matched);
					}  
					$matched_chars=array_unique($matched_chars);
					$cur_msg="line #".($line_no+1).":";
					foreach($matched_chars as $matched_char){
						$cur_msg.=($matched_char." ");
					}
					$detail_msg.=($cur_msg."<br>");
				}
				$line_no++;
			}
		}
		if($debug){
			fwrite($debugout, "check_special_characters: done\n");
		} 
	} 
	else{ // cbt, cct, sst
		while(!feof($fh)){
			$line=fgets($fh);
			if($line!=""){
				$line=rtrim($line, "\r\n");
				if($line_no!=0){ 
					// search the whole line
					$items=explode("\t",$line);
					$line=$items[0];
				}
				if(preg_match_all("/([^a-zA-Z0-9\|\-_\. \t])/",$line,$matches)){
					$matches=$matches[0];
					if($debug){
						fwrite($debugout, $line);
						fwrite($debugout, print_r($matches,true));
					}
					$has_error=true;
					$matched_chars=array();
					foreach($matches as $matched){
						array_push($matched_chars, $matched);
					}
					$matched_chars=array_unique($matched_chars);
					$cur_msg="line #".($line_no+1).":";
					foreach($matched_chars as $matched_char){
						$cur_msg.=($matched_char." ");
					}
					$detail_msg.=($cur_msg."<br>");
				} 
				$line_no++;
			}
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

function check_duplicated_genes($track_file, $track_type){
	// for sbt, genes starts with the third item of each row
	$fh=fopen($track_file,"r");
	$allgenes=array();
  $has_error=false;
  $detail_msg=$track_type." file:<br>";
	if(strcmp($track_type,"sbt")==0){
		$line_no=0;
		while(!feof($fh)){
			$line=fgets($fh);
			$line=rtrim($line, "\r\n");
			$names=explode("\t",$line); 
			$allgenes=array_slice($names,2);
			// check every sbt track
			$count_array=array_count_values($allgenes);
			$duplicates=array();
			foreach ($count_array as $k => $v) {
				if($v>1){
					array_push($duplicates, $k);
				}
			}
			if(count($duplicates)>0){
				$has_error=true;
				$dup_genes="line #".($line_no+1).":";
				foreach ($duplicates as $gene){
					$dup_genes.=($gene." ");
				}
				$detail_msg.=($dup_genes."<br>");
			}
			$line_no++;
		}
	} 
	else{ // sct, cbt, cct, sst 
		// collect first column items to an array
		$line=fgets($fh); //skip the first line
		while(!feof($fh)){
			$line=fgets($fh);
			$line=rtrim($line,"\r\n");
			$names=explode("\t",$line);
			array_push($allgenes, $names[0]);
		} 
		$count_array=array_count_values($allgenes);
		$duplicates=array();
		foreach ($count_array as $k => $v) {
			if($v>1){
				array_push($duplicates, $k);
			}
		}
		if(count($duplicates)>0){
			$has_error=true;
			foreach ($duplicates as $gene){
				$dup_genes.=($gene." ");
			}
			$detail_msg.=($dup_genes);
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

// check cbt, cct or sst, tsi file to see if the samples match
function check_samples_match($track_file, $sample_file){
	// in track file, the sample names are stored in the first row (delimted by tab,  starting from second item)
	// in tsi file, sample names are stored in the first column, starting from the 3rd row
  global $debug, $debugout;
	$f1=fopen($track_file,"r");
	$line=fgets($f1);
	$line=rtrim($line, "\r\n");
	fclose($f1);
	$sample1=explode("\t",$line);
	array_shift($sample1);
	if($debug){
		fwrite($debugout, print_r($sample1,true));
		fwrite($debugout, count($sample1));
	}
	$f2=fopen($sample_file,"r");
	$sample2=array();
	// skip the first two rows
	$currentLine=fgets($f2);
	$currentLine=fgets($f2);
	while (!feof($f2)) {
		$currentLine=fgets($f2) ;
	  $currentLine=rtrim($currentLine, "\r\n");
		$currentLine=explode("\t",$currentLine);
		if($currentLine[0]!=""){
      if(preg_match("/category/i",$currentLine[0])){  // optional feature category line
        continue;
      }
			array_push($sample2, $currentLine[0]);
		}
	}   
	fclose($f2);
	if($debug){
		fwrite($debugout, print_r($sample2,true));
    fwrite($debugout, print_r(array_merge($sample1, $sample2),true));
    fwrite($debugout, print_r(array_intersect($sample1, $sample2),true));
		fwrite($debugout, count($sample2));
	}
	if($debug){
    fwrite($debugout, count(array_diff(array_merge($sample1, $sample2), array_intersect($sample1, $sample2))));
	}
	if(count(array_diff(array_merge($sample1, $sample2), array_intersect($sample1, $sample2)))!=0) {
    $detail_msg="";
    $intersect=array_intersect($sample1, $sample2);
    $onlyin1=array_diff($sample1, $intersect);
    $onlyin2=array_diff($sample2, $intersect);
    $detail_msg.="Only in track file: <span style='color:blue'>";
    foreach($onlyin1 as $item){
      $detail_msg.=($item." ");
    }
    $detail_msg.="</span><br>";
    $detail_msg.="Only in sample information file: <span style='color:blue'>";
    foreach($onlyin2 as $item){
      $detail_msg.=($item." ");
    }
    $detail_msg.="</span>";
		return array("error", $detail_msg);
	}
	else{
		return array("noerror","");
	}
}

// check if there are invalid data in tsi file
function check_invalid_data($sample_file){
	global $debug, $debugout;
	if($debug){
		fwrite($debugout, $track_file."....".$track_type);
	}
// check the data type on second line
  $fh=fopen($sample_file,"r");
  $types=array("BIN","CON","CAT","SUR");
  $line=fgets($fh);
  $line=fgets($fh);
  $line=rtrim($line,"\r\n");
  $input_types=explode("\t",$line);
  array_shift($input_types);
  foreach($input_types as $item){
    if(!in_array($item,$types)){  
      return array("error", "data type ".$item." not supported");
    }
  }
 $data=array();
 $index=0;
 foreach($input_types as $item){
   $data[$index]=array();
   $index++;
 }
$feature_category_exists=False;
// test the optional category line
 $line=fgets($fh);
 $line=rtrim($line,"\r\n");
 $all_items=explode("\t",$line);
 if(preg_match("/category/i",$all_items[0])){
   $feature_category_exists=True;
 }
 fseek($fh, 0);
 $line=fgets($fh);
 $line=fgets($fh);
 if($feature_category_exists){
	 $line=fgets($fh);
 }
 // read data into a big array 
 while(!feof($fh)){
	 $line=fgets($fh);
	 $line=rtrim($line, "\r\n");
	 if($line!=""){
		 if($debug){
			 fwrite($debugout, print_r($line,true));
			 fwrite($debugout, "xxxx\n");
		 }
		 $items=explode("\t",$line);
		 array_shift($items);
		 $cur_index=0; 
		 foreach($items as $cur_item){
			 array_push($data[$cur_index], $cur_item);
			 $cur_index++;
		 }
	 } 
 }
 fclose($fh);
 if($debug){
   fwrite($debugout, print_r($data,true));
 }
  // check BIN type: can only have 2 unique values
 $index=0;
 foreach($input_types as $type){
	 if($type=="BIN"){
     if($debug){
       fwrite($debugout, print_r($data[$index],true));
     }
		 $cur_cnt=count(array_unique($data[$index]));
     // check to see if there is "NA"
     $has_na=in_array("na",$data[$index]) || in_array("NA",$data[$index]);
     if($has_na){
      $cur_cnt--;  // NA does not count as unique value required for binary type
     }
		 if($cur_cnt!=2){
			 return array("error", "column ".($index+2).": Binary type must have 2 distinct values, current column contains ".$cur_cnt); 
		 }
	 }
   else if($type=="CON"){
     $row=0;
     foreach($data[$index] as $val){
       if(strcmp(strtoupper($val),"NA")==0){
         $row++;
         continue;
       }
       if(!preg_match('/^-?\d+(,\d+)*(\.\d+([eE]-?\d+)?)?$/',$val)){
			   return array("error", $val." is not a valid number.");
       }
       $row++;
     }
   }
	 else if($type=="SUR"){  // format with "XX,XX"
		 $row=0;
		 foreach($data[$index] as $val){
			 if(!preg_match('/^.+,.+$/',$val)){
			   return array("error", $val." is not a valid SUR type value (must be in the format of X,Y).");
			 }
			 $row++;
		 }
	 }
	 $index++;
 }
 return array("noerror","");
}

?>
