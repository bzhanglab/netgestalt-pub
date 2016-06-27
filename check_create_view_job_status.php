<?php
$debug=false;
if($debug){
  $debugout = fopen("/tmp/check_create_view_job_status_debug.out","w");
}

function report_error_details($details){
  return "{\"status\":\"Error\",\"details\":\"".$details."\"}";
}

$sqs_bin="/usr/local/bin/";

$ng_root=getcwd();

if(isset($_POST)){
  if($_POST["status"]=="Cancelled"){
    print "{\"status\":\"Cancelled\"}";
  }
	else{
		$job_id=$_POST["job_id"];
		$output_file=$_POST["output_file"];
		$msm_file=$_POST["msm_file"];
		$orig_cct_name=$_POST["orig_cct_name"];
		$orig_cct_path=$_POST["orig_cct_path"];
		$orig_tsi_path=$_POST["orig_tsi_path"];
		// query job status
		$output=array();
		// example output from qstat
		// " 26      shiz ..hiz/test_sqs/test.job  4      Aug 12 16:26 2014 Running  1   5863"
		//exec($sqs_bin."qstat | grep \"".$job_id." \"| sed \"-e s/^[ ]*//\" | tr -s \" \" | cut -d \" \" -f 10", $output);
		exec($sqs_bin."qstat | grep '".$job_id." '| grep -o 'Running\|Queued\|Holding'", $output);

		if($debug){
			fwrite($debugout, $job_id."\n");
			fwrite($debugout, $output_file."\n");
			fwrite($debugout, $msm_file."\n");
			fwrite($debugout, $orig_cct_name."\n");
			fwrite($debugout, print_r($output, true));
		}
		// Queued or Running
		if(strcmp($output[0],"")!=0){
			print "{\"status\":\"".$output[0]."\"}";
		}
		// if it does not show up in qstat, first check if the output file exists
		else{
			if(!file_exists($output_file)){
				print "{\"status\":\"Unknown\"}";
			}
			else{
				// if status is "DONE", then examine the output file
        // read the file into an array
				$output=file($output_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
/*
			// filter out empty entries
			$output=array_filter($output, function($a){
				return is_string($a) && trim($a) !== "";
			});
 */
				if($debug){
					fwrite($debugout, print_r($output,true));
				}
        // search for "Processing completed" which indicates a success.
        for($i=0; $i<count($output); $i++){
          if(strcmp($output[$i],"Processing completed!")==0){
            break;
          }
        }
        if($i>=count($output)){
					print report_error_details(base64_encode("&bull; ".implode(";<br>&bull; ",$output)));
        }
				else{ 
         // job completed successfully, print out used time, network nodes/edges number and number of modules found
         if($debug){
           fwrite($debugout, print_r($output, true));
         }         
         $start_time=-1;
         $end_time=-1;
         $time_used="unknown";
         $num_of_modules="unknown";
         $num_of_nodes="unknown";
         $num_of_edges="unknown";
         foreach($output as $line){
           if(preg_match("/^start_time:(\d*)/",$line, $matches)){
             $start_time=$matches[1];
           }
           else if(preg_match("/^end_time:(\d*)/",$line, $matches)){
             $end_time=$matches[1];
						 if($end_time-$start_time>0){
							 $time_used_arr=explode(":",gmdate("H:i:s", $end_time-$start_time));
							 $time_used=$time_used_arr[0]." Hr ".$time_used_arr[1]." Min ".$time_used_arr[2]." Sec";
						 }
             if($debug){
               fwrite($debugout, $time_used."\n");
             }
           }
           else if(preg_match("/(\d*) nodes and (\d*) edges/", $line, $matches)){
             $num_of_nodes=$matches[1]; 
             $num_of_edges=$matches[2];
             if($debug){
               fwrite($debugout, $num_of_nodes." ".$num_of_edges."\n");
             }
           }
           else if(preg_match("/NetSAM identified (\d*) modules/", $line, $matches)){
             $num_of_modules=$matches[1]; 
             if($debug){
               fwrite($debugout, $num_of_nodes." ".$num_of_edges."\n");
             }
           }
         }
					print "{\"status\":\"Done\",\"time_used\":\"".$time_used."\",\"num_of_nodes\":\"".$num_of_nodes."\",\"num_of_edges\":\"".$num_of_edges."\",\"num_of_modules\":\"".$num_of_modules."\",\"msm\":\"".$msm_file.".msm\",\"orig_cct_name\":\"".$orig_cct_name."\"}"; // extension added by R script.
				}
			}
			// should delete the raw cct tsi file at this point
			if(file_exists($orig_cct_path)){
				unlink($orig_cct_path);
			}
			if(file_exists($orig_tsi_path)){
				unlink($orig_tsi_path);
			}
		}
	}
	if($debug){
		fclose($debugout);
	}
}
?>
