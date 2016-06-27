<?php
class SearchTrack{
  private $track_info;
  private $max_results = 50;

  public function SearchTrack($d, $t){
    $this->track_info="data/".$t."/info/".$d."/trackInfo.js";
  }

  public function read_track_info($n){
    $json=file_get_contents($this->track_info);
    //$json=str_replace('trackInfo = ','',$json);
    $data=json_decode($json);
    $newdata=Array();
    // remove ann_XXX_module category for other system networks.
		foreach ($data as $value){
			foreach ($value as $key=>$v){
				if($key=="category"){
          if(!(preg_match("/ann_(.*)_module/",$v, $match) && $match[1]!=$n)){ 
						array_push($newdata, $value);
					}
				}
			}
		}
   return $newdata;
 } 

  public function compare_key_length($a, $b){
    if(strlen($a->{'key'})<strlen($b->{'key'}))
      return -1;
    else if(strlen($a->{'key'})>strlen($b->{'key'})) 
      return 1;
    else
      return 0;
  } 

  public function compare_category($a, $b){
    strnatcmp($a->{'category'}, $b->{'category'});
  } 

  public function query($q, $n){
    $data=$this->read_track_info($n);
    $allmatched=array();
    $output = "{\"query\":\"$q\",\"results\":[";
    if($q){
      $found 	= 0;
      $keys=array(); 
      for($i=0; $i<count($data); $i++){
        array_push($keys, $data[$i]->{"key"});
      }
      if(empty($keys)){
        echo '<h1>Not Found</h1>';
        die;
      }
      for($i=0; $i<count($keys); $i++){
        $key=$keys[$i];
        $network=$data[$i]->{"network"};
        if(preg_match("/$q/i",$key) && preg_match("/^$n$/i",$network)){
          array_push($allmatched, $data[$i]);
          if($found++>$this->max_results){
            break;
          }
        }
      }
      // sort the results by category first, then by the length of keys
      usort($allmatched, array($this, 'compare_category'));
      usort($allmatched, array($this, 'compare_key_length'));
    }
    if(count($allmatched)>=1){
      for($i=0; $i<count($allmatched)-1; $i++){
        $key=$allmatched[$i]->{"key"};
        $label=$allmatched[$i]->{"label"};
        $url=$allmatched[$i]->{"url"};
        $category=$allmatched[$i]->{"category"};
        $type=$allmatched[$i]->{"type"};
        $output.=  "{\"title\":\"$key\",\"label\":\"$label\",\"url\":\"$url\",\"description\":\"\", \"category\":\"$category\",\"type\":\"$type\"},\n";
      }
        $key=$allmatched[$i]->{"key"};
        $label=$allmatched[$i]->{"label"};
        $url=$allmatched[$i]->{"url"};
        $category=$allmatched[$i]->{"category"};
        $type=$allmatched[$i]->{"type"};
        $output.=  "{\"title\":\"$key\",\"label\":\"$label\",\"url\":\"$url\",\"description\":\"\", \"category\":\"$category\",\"type\":\"$type\"}]}";
   }
   else{
     $output.="]}";
   }
    return $output;
  }
}
?>
