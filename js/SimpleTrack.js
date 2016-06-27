// SimpleTrack (binary or continous)
function SimpleTrack(trackMeta, datatype, url, refGene, browser, browserParams, fillColors) {
    Track.call(this, trackMeta.isUserTrack, trackMeta.isUploadTrack, trackMeta.label, trackMeta.key, datatype,
               false, browserParams.changeCallback);
	  if(fillColors==undefined || fillColors.length==0)
		   this.fillColors=undefined;
		else
		  this.fillColors=fillColors;
    this.brwsr=browser;
    this.view=browser.view;
    this.refGene = refGene;
    this.highlightColorIndex=-1;
    this.highlighted=false;
    this.data=[];
    this.dataType=trackMeta.datatype;
    this.imageGeneratorUrl="image_gen.php";
    this.subTrackHeight=0; // height in px for each subtrack
    this.subTrackCount=0;
    this.first=-1;
    this.last=-1;
    this.startBase=-1;
    this.bpPerBlock=-1;
    this.pxPerBp=-1;
    this.containerStart=-1;
    this.containerEnd=-1;
		this.int_url=trackMeta["int_url"];
    // track's true max and min values
		this.origMaxVal=null;
		this.origMinVal=null;
		// set by user when do data transforming
		this.yaxis_top=null;
		this.yaxis_bottom=null;
		this.EPS=1.0e-6; // for compare floats;
		this.gppCutoff=3; // for SBT, if current genes per pixel > ggpCutoff, union data within a neighborhood before rending the image for better clearity
    //this.imageClass='';
    /* [ 
        {"zoom":xx, "trackUrl":xx, "startBase": xx, "endBase": yy, "src": zz, "sortPos":??, 
          "commonIndices":??, "sort}, 
        {...},
        {...}
       ]
    */
    this.blockToImage=new Array();
    this.baseUrl = (browserParams.baseUrl ? browserParams.baseUrl : "");
    this.trackUrl = this.baseUrl+url;
    this.imgErrorHandler = function(ev) {
        var img = ev.target || ev.srcElement;
        img.style.display = "none";
				return false;
    };
		//console.log(trackMeta.label+": "+url);
    this.load(this.baseUrl + url);
}

SimpleTrack.prototype = new Track("");

SimpleTrack.prototype.loadSuccess = function(o) {                                                      
    // pass the input and assign to an object "data"
    var lines=o.split("\n"); 
    var size=0;
		var tmp;
    if(this.dataType=="sbt"){
      for(var i=0; i<lines.length-1; i++){
        // skip lines start with #
        if(!lines[i].match("^\s*\#")){
				  tmp=parseInt(lines[i]);
					if(isNaN(tmp))
					  this.data[size]=0;
				  else
            this.data[size]=tmp;
          size++;
        }   
      }   
    }
    else if(this.dataType=="sct"){
      for(var i=0; i<lines.length-1; i++){
        // skip lines start with #
        if(!lines[i].match("^\s*\#")){
				  tmp=parseFloat(lines[i]*1.0);
					if(isNaN(tmp)){
            this.data[size]='NA';
				  }
					else if(tmp==Number.POSITIVE_INFINITY){
					  this.data[size]=Number.MAX_VALUE;
					}
					else if(tmp==Number.NEGATIVE_INFINITY){
					  this.data[size]=-1.0*Number.MAX_VALUE;
					}
					else{
            this.data[size]=tmp;
					}
          size++;
        }   
      }   
      var sortNumber=function(a,b){
        return a - b;
      }   
			// exlude "NA" before sorting
      var newarray=[];
			var cur_data;
			for(i=0; i<this.data.length; i++){
        cur_data=this.data[i];
				if(!isNaN(cur_data))
				  newarray.push(cur_data);
			}
      newarray.sort(sortNumber);
      var max=newarray[newarray.length-1];
      var min=newarray[0];
      var abs_max=Math.abs(max);
      var abs_min=Math.abs(min);
			this.origMaxVal=max;
			this.origMinVal=min;
			this.filterMax=max;
			this.filterMin=min;
			this.filterOriginalData=this.data;
      var temp_value;
      if(abs_max>abs_min){
        temp_value=abs_max;
			}
      else if(abs_max<abs_min){
        temp_value=abs_min;
			}
      else{
        temp_value=abs_max;
		  }
      this.max=temp_value;
      this.min=-1.0*temp_value;
    }
    else{
      return; 
    }
    this.setLoaded();
};

SimpleTrack.prototype.setViewInfo = function(heightUpdate, numBlocks,
                                            trackDiv, labelDiv,
                                            widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, [heightUpdate, numBlocks,
                                             trackDiv, labelDiv,
                                             widthPct, widthPx, scale]);
    this.setLabel(this.key);
};

SimpleTrack.prototype.getZoom = function(scale){
  if(scale>=1)  //e.g. 3.43 ==> 4
    return Math.ceil(scale);
  else  // e.g. 0.134 ==> 0.2 to avoid large image size, otherwise, 0.134 ==> 1 (pixelspergene)
    return Math.ceil(scale*10)/10;
};

SimpleTrack.prototype.findImage = function(zoom, startBase, endBase, upper, lower){
    // now search the array 
    // console.debug(zoom+" "+startBase+" "+endBase);
    var filteredImage;
    if(this.blockToImage.length===undefined)
      return undefined;
    //console.debug("sortPos="+sortPos);
		for(var i=0; i<this.blockToImage.length; i++){
			var item=this.blockToImage[i];
			//console.debug(item["zoom"]+" "+item["startBase"]+" "+item["endBase"]);
			if(upper==null&&lower==null){
				if(item["upper"]==upper && item["lower"]==lower && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==startBase && item["endBase"]==endBase){
					filteredImage=item;
					break;
				}
			}
			else{
				if(Math.abs(item["upper"]-upper)<this.EPS && Math.abs(item["lower"]-lower)<this.EPS && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==startBase && item["endBase"]==endBase){
					filteredImage=item;
					break;
				}
			}
		}
    if(filteredImage){
      return filteredImage;
    }
    else{
      return undefined;
    }
};

/*
 o:{ "zoom":XX, 
     "trackUrl":XX, 
     "blocks": [{"startBase":xx, "endBase":xx, "src":xx}, {"startBase":yy, "endBase":yy, "src":yy}...], 
     "subTrackCount":XX, 
     "subTrackHeight":XX
    }
*/
SimpleTrack.prototype.setImages = function(o){
  var trackUrl=o["trackUrl"];
  //console.debug("returned "+trackUrl);
  var zoom=o["zoom"];
  var i;
 //console.debug(this.brwsr.view.sortedCommonSamples);
  //console.debug(this.blockToImage);
  var imageArray=o["blocks"];
	var upper=o["upper"];
	var lower=o["lower"];
	var len=imageArray.length;
  ////console.debug(imageArray);
  for(i=0; i<len; i++){
     var imageObj={};
     imageObj["zoom"]=zoom;
     imageObj["trackUrl"]=trackUrl;
     imageObj["startBase"]=imageArray[i]["startBase"];
     imageObj["endBase"]=imageArray[i]["endBase"];
     imageObj["src"]=imageArray[i]["src"];
		 if(upper!=null){
       imageObj["upper"]=parseFloat(upper);
		 }
		 else{
       imageObj["upper"]=null;
		 }
		 if(lower!=null){
       imageObj["lower"]=parseFloat(lower);
		 }
		 else{
       imageObj["lower"]=null;
		 }
     this.blockToImage.push(imageObj);
  }
};

SimpleTrack.prototype.loadImageSuccess=function(data){
  // multiple block images have been generated
	var o=$.parseJSON(data);
  this.setImages(o);
  if(this.subTrackCount==0)
    this.subTrackCount=o["subTrackCount"];
  if(this.subTrackHeight==0)
    this.subTrackHeight=o["subTrackHeight"];
};

SimpleTrack.prototype.loadImageFail=function(){
   this.empty=true;
};

SimpleTrack.prototype.getImage = function(blockIndex, zoom, startBase, endBase, first, last, firstStartBase, upper, lower) {
  if(firstStartBase<=0) 
    firstStartBase=0;
  var curTrack=this;
 // search for the image
  var foundImage = this.findImage(zoom, startBase, endBase, upper, lower);
  var img=document.createElement("img");
  if(foundImage){
    img.setAttribute("src", foundImage["src"]); 
		var mybasename=basename(foundImage["src"]);
		// jquery does not like id name with special character such as "." and "/"
    img.setAttribute("id", mybasename.substr(0, mybasename.lastIndexOf('.')) || mybasename); 
    return img;
  }
  else{
		$(img).bind("onerror", this.imgErrorHandler);
    // find out which blocks in the range of [first, last] need to be generated
    /* toCreate:
          { 0: {"startBase":xx, "endBase": xx, "zoom":xx},
            1: { ....},
            ....
          }
     */
    var toCreate={};
    var blockWidth=endBase-startBase;
    var id, obj;
    var i=0,j;
    for(id=first; id<=last; id++){
      var filteredItem;
			for(j=0; j<this.blockToImage.length; j++){
				var item=this.blockToImage[j];
				if(upper==null&&lower==null){
					if(item["upper"]==upper && item["lower"]==lower && item["zoom"]==zoom && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==(firstStartBase+(id-first)*blockWidth) && item["endBase"]==(firstStartBase+(id-first+1)*blockWidth)){
						filteredImage=item;
					  break;
					}
				}
				else{
					if(Math.abs(item["upper"]-upper)<this.EPS && Math.abs(item["lower"]-lower)<this.EPS && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==(firstStartBase+(id-first)*blockWidth) && item["endBase"]==(firstStartBase+(id-first+1)*blockWidth)){
						filteredImage=item;
					  break;
					}
				}
			}
      if(!filteredItem){
        obj={"startBase":firstStartBase+(id-first)*blockWidth,
          "endBase": firstStartBase+(id-first+1)*blockWidth,
          "zoom":zoom
        };
        toCreate[i]=obj;
        i++;
      }
    }
   var arg;
   if(this.dataType=="sct"){
		 if(upper!=null && lower!=null){
			 arg={"trackfile": this.trackUrl,
				 "tracktype": this.dataType,
				 "pixelspergene": zoom,
				 "blocks": toCreate,
				 "upper":upper,
				 "lower":lower
			 };
		 }
			else{
				arg={"trackfile": this.trackUrl,
					"tracktype": this.dataType,
					"pixelspergene": zoom,
					"blocks": toCreate
				};
			}
   }
	 else if(this.dataType=="sbt"){
		 arg={  "trackfile": this.trackUrl,
			 "tracktype": this.dataType,
			 "pixelspergene": zoom,
			 "blocks": toCreate,
			 "gppcutoff":this.gppCutoff
		 };
		 // user binary track can display color
		 if(this.fillColors==undefined){
			 arg={   "trackfile": this.trackUrl,
				 "tracktype": this.dataType,
				 "pixelspergene": zoom,
				 "blocks": toCreate,
			   "gppcutoff":this.gppCutoff
			 };
		 }
		 else{
			 var color_string="";
			 for(var i=0; i<this.fillColors.length; i++){
				 color_string+=this.fillColors[i];
				 if(i!=this.fillColors.lenggth-1)
					 color_string+="_";
			 }
			 arg={
				 "trackfile": this.trackUrl,
				 "tracktype": this.dataType,
				 "pixelspergene": zoom,
				 "blocks": toCreate,
				 "sbtcolors":color_string,
   			 "gppcutoff":this.gppCutoff
			 };
		 }
	 }
    $.ajax({
		  type: "POST",
		  url:this.imageGeneratorUrl,
			async:false,
			data: arg,
			success: function(o) { curTrack.loadImageSuccess(o);},
			error: function() { curTrack.loadImageFail();}
		});
   
  // at this point, either found image or a new image has been created
    foundImage = this.findImage(zoom, startBase, endBase, upper, lower);
    img.setAttribute("src", foundImage["src"]); 
		var mybasename=basename(foundImage["src"]);
		img.setAttribute("id", mybasename.substr(0, mybasename.lastIndexOf('.')) || mybasename);
  }
  return img;
};

/*
 if sortPos == -1,  generating the original track (no sorting)
 if sortPos != -1,  user just shift-clicked on one of the track
    if commonIndices and sortedCommonSamples are both empty:
       single track sort by the sample values on gene position sortPos
    if commonIndices is not empty && sortedCommonSample is empty
       linked sort, the current track is being shift clicked (primary track), 
    if commonIndices is empty && sortedCommonSample is not empty
       linked sort, other track is being shift clicked

 commonIndices: an array of the indicies of the samples that are common to
                all linked tracks.
 sortedCommonSamples: an array of the names of the sorted samples (by the 
                value in the primary track) that are 
                common to all linked tracks.
*/
SimpleTrack.prototype.fillBlock = function(blockIndex, block,
                                          leftBlock, rightBlock,
                                          leftBase, rightBase,
                                          scale, stripeWidth,
                                          containerStart, containerEnd,
                                          first, last, firstStartBase, sortPos, 
                                          commonIndices, sortedCommonSamples) {
  if(leftBase<0 || rightBase<0) 
    return;
  if(leftBase+1>this.brwsr.view.ruler.length)
    return;

  block.style.cursor="auto"; 
  this.first=first;
  this.last=last;
  this.startBase=firstStartBase;
  this.bpPerBlock=Math.round(this.view.stripeWidth / this.view.pxPerBp);
  this.pxPerBp=scale;
  this.containerStart=containerStart;
  this.containerEnd=containerEnd;

  // Note: if sortPos is undefined, commonIndices must be also undefined
  if(sortPos===undefined)
    sortPos=-1;

  var zoom=this.getZoom(scale);
  //console.debug("zoom="+zoom);
  var brwsr=this.brwsr;
  var track=this;
  var blockWidth = rightBase - leftBase;
  // generate all the blocks (including invisible ones)
  var newFirstStartBase=containerStart;
  var newFirst=0;
  var newLast=(containerEnd-containerStart)/blockWidth-1;
	var upper=this.yaxis_top;
	var lower=this.yaxis_bottom;
  var im=this.getImage(blockIndex, zoom, leftBase, rightBase, newFirst, newLast, newFirstStartBase, upper, lower);
  //im.className=this.imageClass;
  im.style.position = "absolute";
  im.style.left = "0px";
  im.style.width = "100%";
  im.style.top = "0px";
  im.style.height = this.subTrackCount*this.subTrackHeight + "px";
  block.appendChild(im);
	$(im).mousemove(track.mouseMoveHandler(track, leftBase, this.pxPerBp, this.subTrackHeight, im.id));
	$(im).mouseout(track.mouseOutHandler);
  this.heightUpdate(this.subTrackHeight*this.subTrackCount, blockIndex);
};

SimpleTrack.prototype.mouseOutHandler=function(event){
//  balloon17394.hideTooltip(1);
};

SimpleTrack.prototype.mouseMoveHandler=function(track, leftBase, pxPerBp, subTrackHeight, imageID){
  var brwsr=this.brwsr;
  return function(event){
    // don't show tooltip whhile dragging
    if (brwsr.view.dragging) return;
    var mousepos=track.getXY(event, imageID);     
    //balloon17394.hideTooltip(1);
    if(track.dataType=='sbt'){
      var pos=Math.round((mousepos[0]-mousepos[0]%pxPerBp)/pxPerBp)+leftBase;
      if(track.data[pos]==1)
       balloon17394.showTooltip(event, brwsr.view.ruler[pos]);
    }
    else if(track.dataType=='sct')
      balloon17394.showTooltip(event, "Name: "+brwsr.view.ruler[Math.round((mousepos[0]-mousepos[0]%pxPerBp)/pxPerBp)+leftBase]+"<br>Value: "+track.data[Math.round((mousepos[0]-mousepos[0]%pxPerBp)/pxPerBp)+leftBase]);
  };
}; 

SimpleTrack.prototype.getXY=function(e, imgID) {
  var posX=0;
  var posY=0;
  var imgPos=[];
  var myImg=$("#"+Util.jqSelector(imgID));
  var pos=myImg.offset();
  imgPos.push(pos["left"]);
  imgPos.push(pos["top"]);
  var topBorderWidth=$(myImg).css("border-top-width").replace(/[^-\d\.]/g, ''); // get numeric part only
  if (!e) var e=window.event;
  if (e.pageX || e.pageY) {
    posX=e.pageX;
    posY=e.pageY;
  }
	else if (e.clientX || e.clientY) {
		posX=e.clientX+document.body.scrollLeft
		+document.documentElement.scrollLeft;
		posY=e.clientY+document.body.scrollTop
		+document.documentElement.scrollTop;
	}
  posX=posX-imgPos[0];
  // need to minus the window border
  posY=posY-imgPos[1]-topBorderWidth;
  return [posX, posY];
};

SimpleTrack.prototype.endZoom = function(destScale, destBlockBases) {
    Track.prototype.clear.apply(this);
};

SimpleTrack.prototype.clear = function() {
    Track.prototype.clear.apply(this);
    //this.blockToImage = [];
};

SimpleTrack.prototype.isCytoscapeWebEnabled=function(min, max){
  var i, count=0;
	var minVisible, maxVisible;
  
  if(typeof(this.view.currentModuleStartBp)!="undefined"){
    minVisible=this.view.currentModuleStartBp;
    maxVisible=this.view.currentModuleEndBp;
  }	
	else{
    minVisible=min;
		maxVisible=max;
	}
  minVisible--;
	maxVisible--;
	// sct does not apply
	/*
  if(this.dataType=='sct'){
    for(i=minVisible; i<=maxVisible; i++){
      count++;
    }
  }
  else if(this.dataType=='sbt'){
	*/
  if(this.dataType=='sbt'){
    for(i=minVisible; i<=maxVisible; i++){
      if(this.data[i]==1) 
        count++;
    }
  }
  if(count>=2 && count<=this.brwsr.maxCytoscapeWebSize){
    return true;
  }
  else{
    return false;
  }
};


SimpleTrack.prototype.isBigCytoscapeWebEnabled=function(min, max){
  var i, count=0;
	var minVisible, maxVisible;
  
  if(typeof(this.view.currentModuleStartBp)!="undefined"){
    minVisible=this.view.currentModuleStartBp;
    maxVisible=this.view.currentModuleEndBp;
  }	
	else{
    minVisible=min;
		maxVisible=max;
	}
	count=maxVisible-minVisible+1;
  if(count>=2 && count<=this.brwsr.maxCytoscapeWebSize){
    return true;
  }
  else{
    return false;
  }
};


SimpleTrack.prototype.getCytoscapeDrawOption=function(min, max){
  var i,j;
  var draw_option={};
  var network_json={};
  var ruler=this.view.ruler;
  var edges=this.brwsr.networkData;
	var minVisible, maxVisible;
 
  if(typeof(this.view.currentModuleStartBp)!="undefined"){
    minVisible=this.view.currentModuleStartBp;
    maxVisible=this.view.currentModuleEndBp;
  } 
	else{
    minVisible=min;
		maxVisible=max;
	}
	minVisible--;
	maxVisible--;
  var visible=[];
  var colors=[];
  if(this.dataType=='sct'){
    for(i=minVisible; i<=maxVisible; i++){
      visible.push(ruler[i])
    } 
  }
  else if (this.dataType=='sbt'){
    for(i=minVisible; i<=maxVisible; i++){
      if(this.data[i]==1)
        visible.push(ruler[i])
    }
    if(this.fillColors instanceof Array){
			for(i=minVisible; i<=maxVisible; i++){
				if(this.data[i]==1)
					colors.push(this.fillColors[i]);
			}
    }
  }
  var data={};
  data['nodes']=[];
  data['edges']=[];
  for(i=0; i<visible.length; i++){
    if(this.dataType=='sbt')
      data['nodes'].push({'id':visible[i], 'label':visible[i]});
    else{
		  if(!isNaN(this.data[minVisible+i])) 
        data['nodes'].push({'id':visible[i], 'label':visible[i], 'value':this.data[minVisible+i], 'displayText': this.data[minVisible+i].toString(), 'colorValue':'#'+Util.computeColor(this.data[minVisible+i], this.max, this.min)});
		  else
        data['nodes'].push({'id':visible[i], 'label':visible[i], 'value':0, 'displayText':'NA', 'colorValue':'#a9a9a9'});
	  }
  }
  for(i=0; i<visible.length; i++){
    for(j=i+1; j<visible.length; j++){
      if(edges[visible[i]] && edges[visible[i]][visible[j]]){
        data['edges'].push({'id':visible[i]+'_to_'+visible[j], 'target':visible[i], 'source':visible[j]});
      }
    }
  }
  
 var visual_style; 
 if(this.dataType=='sbt'){
   visual_style={
     'global': {
       'tooltipDelay': 500
     },
     'nodes': {
       'labelVerticalAnchor':'bottom',
       'labelFontWeight':'bold',
       'tooltipText': "<b>${label}</b>"
     },  
     'edges':{
       'color':"#D3BCA5",
       'width':4
     }   
   };  
	 if(!(this.fillColors instanceof Array)){
	   visual_style['nodes']['color']="#88c353";
	  }
	 else{
	    //prepare color setting
    var color_entries=[];
    for(i=0; i<visible.length; i++){
      color_entries.push({'attrValue':visible[i], 'value':colors[i]});
    }   
     var color_setting={
       'discreteMapper':{
         'attrName':'id',
         'entries': color_entries
        }
     };  
      visual_style['nodes']['color']=color_setting; 
   }
   network_json['data']=data;
   network_json['dataSchema']={
nodes: [ { name: "id", type: "string" },
       { name: "label", type: "string" }
       ],  
         edges: [ { name: "label", type: "string" },
         { name: "id", type: "string" }
       ]   
   };
 }
 else if(this.dataType=='sct'){
   visual_style={
     'global': {
       'tooltipDelay': 500 
     },  
     'nodes': {
       'labelVerticalAnchor':'bottom',
       'labelFontWeight':'bold',
       'color': { passthroughMapper: { attrName: "colorValue"}},
       /*
          'size': { defaultValue: 12, 
          continuousMapper: { attrName: "value", 
          minValue: this.min, 
          maxValue: this.max
          } 
          },
        */
       'tooltipText': "<b>${label}</b>: ${displayText}"
     },
     'edges':{
       'color':"#D3BCA5",
       'width':4
     }   
   };  
   network_json['data']=data;
   network_json['dataSchema']={
      nodes: [ { name: "id", type: "string" },
       { name: "label", type: "string" },
       { name: "value", type: "number" },
			 { name: "displayText", type: "string"},
       { name: "colorValue", type:"string"}
       ],  
         edges: [ { name: "label", type: "string" },
         { name: "id", type: "string" }
       ]   
   };  
 }  
  draw_option['network']=network_json;
  draw_option['visualStyle']=visual_style;
  draw_option['nodeTooltipsEnabled']=true;
  return draw_option;
};

SimpleTrack.prototype.getBigCytoscapeDrawOption=function(min, max){
  var i,j;
  var draw_option={};
  var network_json={};
  var ruler=this.view.ruler;
  var edges=this.brwsr.networkData;
	var minVisible, maxVisible;
 
  if(typeof(this.view.currentModuleStartBp)!="undefined"){
    minVisible=this.view.currentModuleStartBp;
    maxVisible=this.view.currentModuleEndBp;
  } 
	else{
    minVisible=min;
		maxVisible=max;
	}
	minVisible--;
	maxVisible--;
  var visible=[];
  var colors=[];
  for(i=minVisible; i<=maxVisible; i++){
    visible.push(ruler[i])
  } 
  if (this.dataType=='sbt'){
    if(this.fillColors instanceof Array){
			for(i=minVisible; i<=maxVisible; i++){
				if(this.data[i]==1)
					colors.push(this.fillColors[i]);
				else
				  colors.push("#FFFFFF");
			}
    }
		else{
      for(i=minVisible; i<=maxVisible; i++){
        if(this.data[i]==1)
				  colors.push("#88c353");
				else
				  colors.push("#FFFFFF");
			}
		}
  }
  var data={};
  data['nodes']=[];
  data['edges']=[];
  for(i=0; i<visible.length; i++){
    if(this.dataType=='sbt')
      data['nodes'].push({'id':visible[i], 'label':visible[i]});
    else{
		  if(!isNaN(this.data[minVisible+i])) 
        data['nodes'].push({'id':visible[i], 'label':visible[i], 'value':this.data[minVisible+i], 'displayText': this.data[minVisible+i].toString(), 'colorValue':'#'+Util.computeColor(this.data[minVisible+i], this.max, this.min)});
		  else
        data['nodes'].push({'id':visible[i], 'label':visible[i], 'value':0, 'displayText':'NA', 'colorValue':'#a9a9a9'});
	  }
  }
  for(i=0; i<visible.length; i++){
    for(j=i+1; j<visible.length; j++){
      if(edges[visible[i]] && edges[visible[i]][visible[j]]){
        data['edges'].push({'id':visible[i]+'_to_'+visible[j], 'target':visible[i], 'source':visible[j]});
      }
    }
  }
  
 var visual_style; 
 if(this.dataType=='sbt'){
   visual_style={
     'global': {
       'tooltipDelay': 500
     },
     'nodes': {
       'labelVerticalAnchor':'bottom',
       'labelFontWeight':'bold',
       'tooltipText': "<b>${label}</b>"
     },  
     'edges':{
       'color':"#D3BCA5",
       'width':4
     }   
   };  
	  //prepare color setting
    var color_entries=[];
    for(i=0; i<visible.length; i++){
      color_entries.push({'attrValue':visible[i], 'value':colors[i]});
    }   
     var color_setting={
       'discreteMapper':{
         'attrName':'id',
         'entries': color_entries
        }
     };  
      visual_style['nodes']['color']=color_setting; 
   network_json['data']=data;
   network_json['dataSchema']={
    nodes: [ { name: "id", type: "string" },
       { name: "label", type: "string" }
       ],  
         edges: [ { name: "label", type: "string" },
         { name: "id", type: "string" }
       ]   
   };
 }
 else if(this.dataType=='sct'){
   visual_style={
     'global': {
       'tooltipDelay': 500 
     },  
     'nodes': {
       'labelVerticalAnchor':'bottom',
       'labelFontWeight':'bold',
       'color': { passthroughMapper: { attrName: "colorValue"}},
       /*
          'size': { defaultValue: 12, 
          continuousMapper: { attrName: "value", 
          minValue: this.min, 
          maxValue: this.max
          } 
          },
        */
       'tooltipText': "<b>${label}</b>: ${displayText}"
     },
     'edges':{
       'color':"#D3BCA5",
       'width':4
     }   
   };  
   network_json['data']=data;
   network_json['dataSchema']={
      nodes: [ { name: "id", type: "string" },
       { name: "label", type: "string" },
       { name: "value", type: "number" },
			 { name: "displayText", type: "string"},
       { name: "colorValue", type:"string"}
       ],  
         edges: [ { name: "label", type: "string" },
         { name: "id", type: "string" }
       ]   
   };  
 }  
  draw_option['network']=network_json;
  draw_option['visualStyle']=visual_style;
  draw_option['nodeTooltipsEnabled']=true;
  return draw_option;
};

SimpleTrack.prototype.isCollapseEnabled=function(min, max){
  var i, count=0;
  var minVisible, maxVisible;
  var enabled=[];
  if(typeof(this.view.currentModuleStartBp)!="undefined"){
    minVisible=this.view.currentModuleStartBp;
    maxVisible=this.view.currentModuleEndBp;
  }
  else{
    minVisible=min;
    maxVisible=max;
  }
  for(i=minVisible-1; i<maxVisible; i++){
    if(this.data[i]==1){
      count++;
      enabled.push(i);
    }
  }

  if(count!=0){
    //console.log(enabled);
    return enabled;
  }
  else{
    return [];
  }
};

/*
SimpleTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
                                         containerStart, containerEnd) {
    if (!(sourceBlock && destBlock)) return;

    var children = sourceBlock.childNodes;
    var destLeft = destBlock.startBase;
    var destRight = destBlock.endBase;
    var im;
    for (var i = 0; i < children.length; i++) {
	im = children[i];
	if ("startBase" in im) {
	    //if sourceBlock contains an image that overlaps destBlock,
	    if ((im.startBase < destRight)
		&& ((im.startBase + im.baseWidth) > destLeft)) {
		//move image from sourceBlock to destBlock
		im.style.left = (100 * ((im.startBase - destLeft) / (destRight - destLeft))) + "%";
		destBlock.appendChild(im);
	    } else {
		delete this.blockToImage[im.tileNum];
	    }
	}
    }
};
*/
