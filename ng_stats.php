<?php
$debug=true;
if($debug){
	$debugout = fopen("/tmp/ng_stats_debug.out","w");
}

function rand_string($length) {
	$chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

	$size=strlen($chars);
	for($i=0; $i<$length; $i++){
		$str.=$chars[rand(0,$size-1)];
	}
	return $str;
}

function get_track_name($basename,$track_type){
	$random_s=rand_string(5);
	$track_file_base_name=time()."_".$random_s;
	$track_file_name=$track_file_base_name.".".$track_type;
	// return both file name,full path, full path without extension
	return array($track_file_name, $basename."/".$track_file_name, $basename."/".$track_file_base_name);
}

$ng_root=getcwd();
$user_int_dir="int_data/user/tracks";

if(isset($_POST)){
  $analysis_level=$_POST["analysisLevel"];
	if(isset($_POST["moduleInfo"])){
		$module_info=$_POST["moduleInfo"];
	}
	else{
		$module_info=NULL;
	}
  $max_module_size=$_POST["maxModuleSize"];
  $current_network=$_POST["currentNetwork"];
  $network_type=$_POST["networkType"];
	$trackName=$_POST["trackName"];
	$trackDB=$_POST["trackDB"];
	$sampleDB=$_POST["sampleDB"];
	$featureName=$_POST["featureName"];
	$testKind=$_POST["kind"];
	$testDirection=$_POST["direction"];
	$testMethod=$_POST["method"];
  $fdrAdjust=$_POST["fdradjust"];
	$testCutoff=$_POST["cutoff"];
	$testOutput=$_POST["output"];
  $testOutputArray=explode(",",$testOutput);
  $survivalPval=$_POST["survivalPval"];
	if(isset($_POST["moduleName"])){
		$moduleName=$_POST["moduleName"]; // only for gene level test if set
	}
	else{
    $moduleName=NULL;
	}
	if($debug){
		fwrite($debugout, $testMethod."\n");
		fwrite($debugout, $testOutput."\n");
		fwrite($debugout, $module_info."\n");
		fwrite($debugout, $max_module_size."\n");
	}
  // if we are performing module level analysis, first check if
  // the module information is available
  // if the module info file (which will always be present) 
  // contains only 1 module, 
  if($analysis_level=="_module"){
    //$module_file_loc  
    if(file_exists($module_info)){
      $modules=json_decode(file_get_contents($module_info));
      if($debug){
			  fwrite($debugout, print_r(count($modules), true));
      }
      if(count($modules)<2){  // at least 1 module should be there
        print "{\"message\":\"NO_ENOUGH_MODULES\"}";
        exit;
      }
    }
    else{ 
      print "{\"message\":\"NO_MODULE_INFO_FILE\"}";
      exit;
    }
  }
	$cmd="bin/ng_stats ";
	$cmd.=$ng_root;
	$cmd.=" --analysis-level \"".$analysis_level."\"";
	if($analysis_level=="_module"){
		$cmd.=" --max-module-size ".$max_module_size;
		$cmd.=" --module-info-file ".$module_info;
		$cmd.=" --test-cutoff ".$testCutoff;
		if($survivalPval!=""){
			$cmd.=" --survival-pval ".$survivalPval;
		}
	}
  $cmd.=" --fdr-adjust ".$fdrAdjust;
	$cmd.=" --track-name \"".$trackName."\"";
	$cmd.=" --track-db ".$trackDB;
	$cmd.=" --sample-db ".$sampleDB;
	$cmd.=" --feature-name \"".$featureName."\"";
	$cmd.=" --test-kind \"".$testKind."\"";
  if($testDirection!=""){
	  $cmd.=" --test-direction ".$testDirection;
  }
  if($testMethod!=""){
	  $cmd.=" --test-method \"".$testMethod."\"";
  }
	if($analysis_level=="_gene"){
		$cmd.=" --test-output \"".$testOutput."\"";
    if(!is_null($moduleName)){
		  $cmd.=" --module-name \"".$moduleName."\"";
    }
    if(!is_null($module_info)){
		  $cmd.=" --module-info-file \"".$module_info."\"";
    }
	}

	if($debug){
		fwrite($debugout, $cmd);
	}

	$output=array();
	exec($cmd, $output);
  
	if($analysis_level=="_gene"){
		if(count($output)!=2 || $output[0]=="Error"){
			print "{\"message\":\"ERROR\"}";
			exit(1);
		} 
		// the sct track data are in a file 
		// "upload" it 
		// print $output[0];  
		$sct_track_file=$output[0];
		// how many tracks are we creating?
		$count=(int)$output[1];
		if($debug){
			fwrite($debugout, $count."\n");
		}
		$fh=fopen($sct_track_file,"r");
		$fhs=array();
		$track_type="sct";
		for($i=0; $i<$count;$i++){
			$fn=get_track_name($ng_root."/".$user_int_dir, $track_type);
			$tf=fopen($fn[1],"w");
			array_push($fhs, $tf);
			$all_track_file_names.=$fn[0];
			if($i!=$count-1)
				$all_track_file_names.=",";
		}
		if($debug){
			fwrite($debugout, $all_track_file_names."\n");
		}
		$firstline=true;
		while(!feof($fh)){
			$line=trim(fgets($fh));
			$items=preg_split('/\t/',$line);
			if($firstline){
				for($i=0; $i<$count; $i++){
					if(!$moduleName){
						//  fwrite($fhs[$i],$items[0]."\t".$items[$i+1]."_".rand_string(5)."\n");
						//$tmpTrackName="Gene_".$featureName."_".$testMethod;
						$tmpTrackName="Gene_".$trackName."_".$featureName."_".$testMethod;
						if($testKind){
							$tmpTrackName=$tmpTrackName."_".$testKind;
						}
            $tmpTrackName=$tmpTrackName."_".$testOutputArray[$i];
						if($fdrAdjust=="yes"){
							$tmpTrackName=$tmpTrackName."_fdr";
						}
						else{
							$tmpTrackName=$tmpTrackName."_nofdr";
						}
					  fwrite($fhs[$i],$items[0]."\t".$tmpTrackName."\n");
					}
          else{
            $tmpTrackName=$moduleName."_".$featureName."_".$testMethod;
            if($testKind){
             $tmpTrackName=$tmpTrackName."_".$testKind;
            }
					  fwrite($fhs[$i],$items[0]."\t".$tmpTrackName."\n");
          }
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

		$cmd="scripts/prepare_tracks.py";
		if(strcmp($network_type,"system")==0){
			$cmd.=" --usertrack --network=";
		}
		else{
			$cmd.=" --usertrack --usernetwork --network=";
		}
		if(strcmp($track_type,"sbt")==0 || strcmp($track_type,"sct")==0){
			// tracklabel is only for cbt and cct, ignored for sbt and sct.
			$cmd=$cmd.$current_network." --track=".$all_track_file_names." --tracktype=".$track_type." -r ".$ng_root;
			$output=array();
			if($debug){
				fwrite($debugout, $cmd);
			}
			exec($cmd,$output);
			if($debug){
				fwrite($debugout, print_r($output, true));
			}
			$len=(count($output)-1)/3;
			if($len>0){
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
			}
			else{
				$output_string="{\"message\":\"ERROR\"}";
			}
			print $output_string;
		}
	}
	else{
		// module level analysis results
		if($debug){
      fwrite($debugout, "\noutput:\n");
			fwrite($debugout, count($output));
      fwrite($debugout, "\n\n");
		}
		if(count($output)<=1){ 
			// no significant module
			$output_string="{\"message\":\"NO_SIG_MODULE\"}";
		}
    else if($output[0]=="Error"){
			$output_string="{\"message\":\"ERROR\"}";
    }
		else{
			$cnt=intval($output[0]);
			if($debug){
				fwrite($debugout, $cnt."\n");
			}
			$output_string="{\"message\":\"OK\", \"feature_name\":\"".$featureName."\",\"fdr_adjust\":\"".$fdrAdjust."\",\"num_of_sig_modules\":".$cnt.",\"names\":[";
			for($i=0; $i<$cnt; $i++){
				$output_string=$output_string."\"".$output[4*$i+1]."\"";
				if($i!=$cnt-1){
					$output_string.=",";
				}
			}
			$output_string.="],\"pvals\":[";
			for($i=0; $i<$cnt; $i++){
				$output_string=$output_string."\"".$output[4*$i+2]."\"";
				if($i!=$cnt-1){
					$output_string.=",";
				}
			}
			$output_string.="],\"adj_pvals\":[";
			for($i=0; $i<$cnt; $i++){
				$output_string=$output_string."\"".$output[4*$i+3]."\"";
				if($i!=$cnt-1){
					$output_string.=",";
				}
			}
			$output_string.="],\"metric\":[";
			for($i=0; $i<$cnt; $i++){
				$output_string=$output_string."\"".$output[4*$i+4]."\"";
				if($i!=$cnt-1){
					$output_string.=",";
				}
			}
			$output_string.="]}";
		}
		print $output_string;
		if($debug){
			fwrite($debugout, $output_string."\n");
		}
	}
}

if($debug){
	fclose($debugout);
}
?>
