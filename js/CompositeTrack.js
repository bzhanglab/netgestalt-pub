function CompositeTrack(trackMeta, datatype, url, refGene, browser, browserParams) {
    Track.call(this, false, trackMeta.isUploadTrack, trackMeta.label, trackMeta.key, datatype,
               false, browserParams.changeCallback);
    this.brwsr=browser;
    this.view=browser.view;
    this.refGene = refGene;
    this.dataType = trackMeta.datatype;
    this.samples = trackMeta.samples;
    this.sampleArray = this.samples.split(' ');
    this.addedSampleFeatures=[];
    this.maxSampleFeatures=8; // maximum number of features to be displayed
    //console.debug(this.samples);
    this.imageGeneratorUrl="image_gen.php";
    this.subTrackHeight=0; // height in px for each subtrack
    this.subTrackCount=0;
    this.toggleSortOrder=0;  // 0: low to high, 1: high to low
    this.sampleSortOrder=[];
    this.sortPos=undefined; //for sample sorting
    this.commonSampleIndices=undefined;
    this.sortedCommonSamples=undefined;
	// for collapsed.js
		this.sortedSampleIndiceString="";
		this.int_url=trackMeta["int_url"];
    this.first=-1;
    this.last=-1;
    this.startBase=-1;
    this.bpPerBlock=-1;
    this.pxPerBp=-1;
    this.containerStart=-1;
    this.containerEnd=-1;
		this.origMaxVal=null;
		this.origMinVal=null;
		// for visualization only
		this.colorscale_l=null;
		this.colorscale_r=null;
		this.colorScheme="BWR"; // only for CCT, color scheme, blue-white-red (BWR) or blue-yellow-red (BYR) or blue-cream-red (BCR) or green-black-red (GKR)
		this.geneWiseTrans=0; // gene wise data transformation. 0-"none", 1-"substracting mean", 2-"substracting median"
		this.sampleInfoFile=trackMeta.sampleinfo; // does the track come with sample information file (tsi)?
		this.EPS=1.0e-6;
		this.gppCutoff=3;
//  this.imageClass='';
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
    //console.debug(this.trackUrl);
    //console.debug(this.blockToImage);
    this.imgErrorHandler = function(ev) {
        var img = ev.target || ev.srcElement;
        img.style.display = "none";
        return false;
    };
    this.setLoaded();
}

CompositeTrack.prototype = new Track("");

CompositeTrack.prototype.loadSuccess=function(o){
};

CompositeTrack.prototype.setLabel=function(newHTML){
 if (this.label === undefined) return;

 if (this.labelHTML == newHTML) return;
 this.labelHTML = newHTML;
// this.label.innerHTML = newHTML; 
 this.labelHeight = this.label.offsetHeight;
 /* disabled for now 
 var sampleIcon=$("<div/>");
 sampleIcon.addClass("track_icon");
 var sampleIconImg=$("<img/>",{
  src:"images/sample.png",
  id: "icon_sample_"+this.label.id,
  height:"14px"
  }).appendTo(sampleIcon);
 sampleIcon.appendTo($(this.label));
 $(sampleIcon).css({'float':'left',"padding-left":"0px", "padding-right":"5px"});
 */
 var labelTextDiv=$("<div/>").appendTo(this.label);
 $(labelTextDiv).css({'display':'inline'});
 $(labelTextDiv).text(newHTML);
};

CompositeTrack.prototype.setViewInfo = function(heightUpdate, numBlocks,
                                            trackDiv, labelDiv,
                                            widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, [heightUpdate, numBlocks,
                                             trackDiv, labelDiv,
                                             widthPct, widthPx, scale]);
    this.setLabel(this.key);
};

CompositeTrack.prototype.getZoom = function(scale){
   if(scale>=1)  //e.g. 3.43 ==> 4
     return Math.ceil(scale);
   else  // e.g. 0.134 ==> 0.2 to avoid large image size, otherwise, 0.134 ==> 1 (pixelspergene)
     return Math.ceil(scale*10)/10;
};

CompositeTrack.prototype.findImage = function(zoom, startBase, endBase, sortPos, commonIndices, sortedCommonSamples, upper, lower, geneWiseTrans, colorScheme){
    // now search the array 
    var filteredImage;
    if(this.blockToImage.length===undefined)
      return undefined;
    //console.debug("sortPos="+sortPos);
		for(var i=0; i<this.blockToImage.length; i++){
			var item=this.blockToImage[i];
			if(upper==null && lower==null){
				if(item["upper"]==upper && item["lower"]==lower && item["geneWiseTrans"]==geneWiseTrans && item["colorScheme"]==colorScheme && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==startBase && item["endBase"]==endBase && item["sortPos"]==sortPos && Util.arraysAreEqual(item["commonIndices"], commonIndices) && Util.arraysAreEqualInOrder(item["sortedCommonSamples"],sortedCommonSamples)){
					filteredImage=item;
					break;
				}
			}
			else{
				if(Math.abs(item["upper"]-upper)<this.EPS && Math.abs(item["lower"]-lower)<this.EPS && item["geneWiseTrans"]==geneWiseTrans && item["colorScheme"]==colorScheme && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==startBase && item["endBase"]==endBase && item["sortPos"]==sortPos && Util.arraysAreEqual(item["commonIndices"], commonIndices) && Util.arraysAreEqualInOrder(item["sortedCommonSamples"],sortedCommonSamples)){
					filteredImage=item;
					break;
				}
			}
		}
    if(filteredImage){
      return filteredImage;
    }
    else{
      //console.debug("not found");
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
CompositeTrack.prototype.setImages = function(o, sortedCommonSamples){
  var trackUrl=o["trackUrl"];
  //console.debug("returned "+trackUrl);
  var zoom=o["zoom"];
	var upper=o["upper"];
	var lower=o["lower"];
	var geneWiseTrans=o["geneWiseTrans"];
	var colorScheme=o["colorScheme"];
  var sortPos=o["sortPos"];
  var commonIndices=o["commonIndices"];
  this.sampleSortOrder=o["sortOrder"];
  var i;
  // var oldSortedCommonSamples=this.brwsr.view.sortedCommonSamples.slice(0);
  if(this.sampleSortOrder.length!=0 && commonIndices!=''){
    // set the globle view.sortedCommonSamples ( an array of sorted sample names)
    this.brwsr.view.sortedCommonSamples=[];
    var commonIndicesArray=commonIndices.split(",").map(Number);
    var commonSampleSize=commonIndicesArray.length;
    for(i=0; i<commonSampleSize; i++){
      this.brwsr.view.sortedCommonSamples.push(this.sampleArray[this.sampleSortOrder[i]]);
    }
  }
 //console.debug(this.brwsr.view.sortedCommonSamples);
  //console.debug(this.blockToImage);
  var imageArray=o["blocks"];
  ////console.debug(imageArray);
	for(i=0; i<imageArray.length; i++){
		var imageObj={};
		imageObj["zoom"]=zoom;
		imageObj["trackUrl"]=trackUrl;
		imageObj["startBase"]=imageArray[i]["startBase"];
		imageObj["endBase"]=imageArray[i]["endBase"];
		imageObj["src"]=imageArray[i]["src"];
		imageObj["sortPos"]=sortPos;
		// covert comma separated string to array
		if(commonIndices==''){
			imageObj["commonIndices"]=undefined;
		}
		else{
			//console.debug("setting commonIndices");
			imageObj["commonIndices"]=commonIndices.split(",").map(Number);
		}
		/*
		if(sortedCommonSamples && sortedCommonSamples.length==0){
		imageObj["sortedCommonSamples"]=undefined;
		}
		else{
		//console.debug("setting sortedcommonIndices");
		imageObj["sortedCommonSamples"]=sortedCommonSamples;
		}
		*/
		/*
		if(sortedCommonSamples && sortedCommonSamples.length==0){
		imageObj["sortedCommonSamples"]=undefined;
		}
		else{
		imageObj["sortedCommonSamples"]=oldSortedCommonSamples;
		}
		*/
		imageObj["sortedCommonSamples"]=sortedCommonSamples;
		//console.debug(imageObj);
		//console.debug("zoom="+zoom);
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
		imageObj["geneWiseTrans"]=geneWiseTrans;
		imageObj["colorScheme"]=colorScheme;
		this.blockToImage.push(imageObj);
		/*
		var len=this.blockToImage.length;
		if(len==undefined)
		this.blockToImage[0]=imageObj;
	else
		this.blockToImage[len]=imageObj;
		*/
	}
  //console.debug(this.blockToImage);
};

CompositeTrack.prototype.loadImageSuccess=function(o, sortedCommonSamples){
  // multiple block images have been generated
  //console.debug(o);
  this.setImages(o, sortedCommonSamples);
  if(this.subTrackCount==0)
    this.subTrackCount=o["subTrackCount"];
  if(this.subTrackHeight==0)
    this.subTrackHeight=o["subTrackHeight"];
};

CompositeTrack.prototype.loadImageFail=function(o){
   this.empty=true;
};

/* sample can be sorted by position (a specific gene -- when user shift+click the image) 
   or by a assigned sample order (when user maninuplating sample heatmap, the samples 
   are sorted by the feature(s) value)
   these two cases are mutual exclusive.
   Now we have 3 cases:
    1. No sort ( order by the original data)
    2. sort by specific gene
    3. use predefined sample order (from sample heatmap area)
*/ 
CompositeTrack.prototype.getImage = function(blockIndex, zoom, startBase, endBase, first, last, 
    firstStartBase, sortPos, commonIndices, sortedCommonSamples, img, upper, lower, geneWiseTrans, colorScheme) {
 //console.debug(commonIndices);
  if(firstStartBase<=0) 
    firstStartBase=0;
  ////console.debug(commonIndices);
  var curTrack=this;
	var mybasename, myid;
 // search for the image
  //console.debug("!!!!!!!zoom="+zoom+" startBase="+startBase+" endBase="+endBase+" sortPos="+sortPos+" firstStartBase="+firstStartBase+" first="+first+" last="+last);
  var foundImage = this.findImage(zoom, startBase, endBase, sortPos, commonIndices, sortedCommonSamples, upper, lower, geneWiseTrans, colorScheme);
  if(foundImage){
	  mybasename=basename(foundImage["src"]);
	  myid=mybasename.substr(0, mybasename.lastIndexOf('.')) || mybasename;
	  $(img).attr({"src":foundImage["src"],"id":myid});
	  $(img).css({"height":curTrack.subTrackCount*curTrack.subTrackHeight+"px"});
		$(img).mousemove(curTrack.mouseMoveHandler(startBase, curTrack.pxPerBp, curTrack.subTrackHeight, $(img).attr('id')));
    //$(img).mouseout(curTrack.mouseOutHandler);
	  //$(img).click(curTrack.mouseClickHandler(startBase, curTrack.pxPerBp, $(img).attr('id')));
		curTrack.heightUpdate(curTrack.subTrackHeight*curTrack.subTrackCount, blockIndex);
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
		// just get one tile 
      var filteredItem;
			for(j=0; j<this.blockToImage.length; j++){
				var item=this.blockToImage[j];
				if(upper==null&&lower==null){
					if(item["upper"]==upper && item["lower"]==lower && item["geneWiseTrans"]==geneWiseTrans && item["colorScheme"]==colorScheme && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==startBase && item["endBase"]==endBase && item["sortPos"]==sortPos && Util.arraysAreEqual(item["commonIndices"], commonIndices) && Util.arraysAreEqualInOrder(item["sortedCommonSamples"],sortedCommonSamples)){
						filteredImage=item;
						break;
					}
				}
				else{
					if(Math.abs(item["upper"]-upper)<this.EPS && Math.abs(item["lower"]-lower)<this.EPS && item["geneWiseTrans"]==geneWiseTrans && item["colorScheme"]==colorScheme && item["zoom"]==zoom && item["trackUrl"]==this.trackUrl && item["startBase"]==startBase && item["endBase"]==endBase && item["sortPos"]==sortPos && Util.arraysAreEqual(item["commonIndices"], commonIndices) && Util.arraysAreEqualInOrder(item["sortedCommonSamples"],sortedCommonSamples)){
						filteredImage=item;
						break;
					}
				}
			}
      if(!filteredItem){
        obj={"startBase":startBase,
          "endBase": endBase,
          "zoom":zoom
        };
        toCreate[i]=obj;
        i++;
      }
    var commonIndiceString=(commonIndices===undefined ? '' :commonIndices.toString());
    var sortedCommonSampleIndiceString='';
    // if we are rendering a linked track (but not clicked), we need to 
    // look at brwsr.view.sortedCommonSamples, if it is not empty, 
    // need to pass it to track2png (as a string)
    var tempArray=[];
    if(sortedCommonSamples && sortedCommonSamples.length!=0){
      for(i=0; i<sortedCommonSamples.length; i++){
        tempArray.push($.inArray(sortedCommonSamples[i],this.sampleArray)); 
      }
      sortedCommonSampleIndiceString=tempArray.map(String).join(',');
    }
   //console.debug("sortedCommonSampleIndiceString="+sortedCommonSampleIndiceString);
	 var arg;
	 if(this.dataType=="cct" && upper!=null && lower!=null){
		 arg={"trackfile": this.trackUrl,
			 "tracktype": this.dataType,
			 "pixelspergene": zoom,
			 "sortpos": sortPos,
			 "commonindices": commonIndiceString,
			 "sortedcommonindices":sortedCommonSampleIndiceString,
			 "blocks": toCreate,
			 "upper":upper,
			 "lower":lower,
			 "genewisetrans":geneWiseTrans,
			 "colorscheme":colorScheme,
			 "gppcutoff":this.gppCutoff
		 };
	 }
	 else{
		 arg={"trackfile": this.trackUrl,
			 "tracktype": this.dataType,
			 "pixelspergene": zoom,
			 "sortpos": sortPos,
			 "commonindices": commonIndiceString,
			 "sortedcommonindices":sortedCommonSampleIndiceString,
			 "blocks": toCreate,
       "genewisetrans":geneWiseTrans,
			 "colorscheme":colorScheme,
			 "gppcutoff":this.gppCutoff
		 };
	 }
	 var handleData=function(context, result, img, upper, lower, geneWiseTrans, colorScheme){
	    var mybasename, myid;
      curTrack.loadImageSuccess(result, sortedCommonSamples);
      // at this point, either found image or a new image has been created
      foundImage = context.findImage(zoom, startBase, endBase, sortPos, commonIndices, sortedCommonSamples, upper, lower, geneWiseTrans, colorScheme);
	    mybasename=basename(foundImage["src"]);
	    myid=mybasename.substr(0, mybasename.lastIndexOf('.')) || mybasename;
			$(img).attr({"src":foundImage["src"],"id":myid});
			$(img).css({"height":result.subTrackCount*result.subTrackHeight+"px"});
			$(img).mousemove(context.mouseMoveHandler(startBase, context.pxPerBp, result.subTrackHeight, $(img).attr('id')));
      //$(img).mouseout(context.mouseOutHandler);
			$(img).click(context.mouseClickHandler(startBase, context.pxPerBp, $(img).attr('id')));
			context.heightUpdate(result.subTrackHeight*result.subTrackCount, blockIndex);
	 };
   $.ajax({
      context: this,
      type:"POST",
      url: this.imageGeneratorUrl,
      //data: JSON.stringify(arg),
      data: arg,
      //dataType:"json",
      beforeSend:function(){
        $("body").addClass("loading"); 
        $("#mymodal").css({'display':'block'});
      },  
      complete:function(){
        $("body").removeClass("loading"); 
        $("#mymodal").css({'display':'none'});
      },  
      success: function(o){
			  var result=$.parseJSON(o);
			  handleData(this,result, img, upper, lower, geneWiseTrans, colorScheme);
      },  
      error: function(textStatus){
          curTrack.loadImageFail();
        }   
     }); 
  }
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
CompositeTrack.prototype.fillBlock = function(blockIndex, block,
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

  var zoom = this.getZoom(scale);
  var brwsr=this.brwsr;
  var track=this;
  var blockWidth = rightBase - leftBase;
  // generate all the blocks (including invisible ones)
  var newFirstStartBase=containerStart;
  var newFirst=0;
  var newLast=(containerEnd-containerStart)/blockWidth-1;
	var upper=this.colorscale_r;
	var lower=this.colorscale_l;
	var geneWiseTrans=this.geneWiseTrans;
	var colorScheme=this.colorScheme;
	var im=$("<img/>");
  this.getImage(blockIndex, zoom, leftBase, rightBase, newFirst, newLast, 
                       newFirstStartBase, sortPos, commonIndices, sortedCommonSamples,im, upper, lower, geneWiseTrans, colorScheme);
//	$(im).addClass(this.imageClass);
	$(im).css({"position":"absolute","left":"0px","width":"100%","top":"0px"});
	//$(im).css({"position":"absolute","left":"0px","width":$(block).css('width')+"px","top":"0px", "height":this.subTrackCount*this.subTrackHeight+"px"});

	/*
  im.className=this.imageClass;
  im.style.position = "absolute";
  im.style.left = "0px";
  im.style.width = "100%";
  im.style.top = "0px";
  im.style.height = this.subTrackCount*this.subTrackHeight + "px";
	*/
  $(im).appendTo($(block));
  //this.heightUpdate(this.subTrackHeight*this.subTrackCount, blockIndex);
};

CompositeTrack.prototype.mouseClickHandler=function(leftBase, pxPerBp, imageID){
  var brwsr=this.brwsr;
  //console.debug("clicking....");
//  console.debug(brwsr.view.ruler[a+b]);
  return function(event){
    if(event.shiftKey){
			/* remove comment to enable linked sorted / shift-click sort
      var mousepos=this.getXY(event, imageID);     
      this.sortPos=Math.round((mousepos[0]-mousepos[0]%pxPerBp)/pxPerBp)+leftBase;
      if(brwsr.linkedTrackNames.length<2 || (brwsr.linkedTrackNames.length >= 2
            && $.inArray(this.name, brwsr.linkedTrackNames)==-1)){
        this.showRange(this.first, this.last, this.startBase, this.bpPerBlock, this.pxPerBp, 
            this.containerStart, this.containerEnd, this.sortPos);
      }
      else{  // one of the linked tracks is shift-clicked
        brwsr.view.sortedCommonSamples=[];
        var alltracks=brwsr.view.tracks;
        //find the common sample names for the linked tracks
        var commonSampleIndices=this.linkedTracksCommonSamples(); 
        //console.debug(commonSampleIndices);
        //console.debug(commonSampleIndices.length);
        var allTrackNames=[];
        for(var i=0; i<alltracks.length; i++){
          allTrackNames.push(alltracks[i].name);
        }
        var index;
        // sort the clicked track first to obtain the order of common samples 
        // and then pass the order to the other linnked tracks
        index=$.inArray(this.name, allTrackNames);
        alltracks[index].sortPos=this.sortPos;
        alltracks[index].commonSampleIndices=commonSampleIndices[this.name];
        alltracks[index].sortedCommonSampleIndices=[];
       //console.debug(commonSampleIndices[this.name]);
        alltracks[index].showRange(this.first, this.last, this.startBase, this.bpPerBlock, 
            this.pxPerBp, this.containerStart, this.containerEnd, this.sortPos, commonSampleIndices[this.name]);
        // at this point, the order is set (a global variable: brwsr.view.sortedCommonSamples)
       //console.debug(brwsr.view.sortedCommonSamples);
        for(i=0; i<brwsr.linkedTrackNames.length; i++){
          if(brwsr.linkedTrackNames[i]!=this.name){
            index=$.inArray(brwsr.linkedTrackNames[i], allTrackNames);
            alltracks[index].sortPos=this.sortPos;
            alltracks[index].commonSampleIndices=commonSampleIndices[brwsr.linkedTrackNames[i]];
            alltracks[index].sortedCommonSamples=brwsr.view.sortedCommonSamples;
            alltracks[index].showRange(this.first, this.last, this.startBase, this.bpPerBlock, this.pxPerBp, this.containerStart, this.containerEnd, this.sortPos, commonSampleIndices[brwsr.linkedTrackNames[i]], brwsr.view.sortedCommonSamples);
          }
        }
       brwsr.view.sortedCommonSamples=[];
      }
			*/
    }
  }
};

// Find out the common samples among all linked tracks
CompositeTrack.prototype.linkedTracksCommonSamples=function(){
  var brwsr=this.brwsr;
  var alltracks=brwsr.view.tracks;
  var sampleArrays=[];
  for(var i=0; i<alltracks.length; i++){
    if($.inArray(alltracks[i].name, brwsr.linkedTrackNames)!=-1){
      sampleArrays.push(alltracks[i].sampleArray);
    }
  }
  var indexObj={};
  var indexArr=Util.arrayIntersection(sampleArrays);
  var j=0;
  for(var i=0; i<alltracks.length; i++){
    if($.inArray(alltracks[i].name, brwsr.linkedTrackNames)!=-1){
      indexObj[alltracks[i].name]=indexArr[j];
      j++;
    }
  }
  return indexObj;
};

CompositeTrack.prototype.mouseOutHandler=function(event){
   //balloon17394.hideTooltip(1);
};

CompositeTrack.prototype.mouseMoveHandler=function(leftBase, pxPerBp, subTrackHeight, imageID){
  var brwsr=this.brwsr;
	var track=this;
  return function(event){
    // don't show tooltip whhile dragging
    if (brwsr.view.dragging) return;
    var mousepos=track.getXY(event, imageID);     
    var index=Math.round((mousepos[1]-mousepos[1]%subTrackHeight)/subTrackHeight);
    if(track.sampleSortOrder.length!=0){
      if(index<track.subTrackCount && index>=0){
        balloon17394.showTooltip(event, "Name: "+brwsr.view.ruler[Math.round((mousepos[0]-mousepos[0]%pxPerBp)/pxPerBp)+leftBase]+"<br>Index: "+Math.round((mousepos[1]-mousepos[1]%subTrackHeight)/subTrackHeight)+"<br>Sample: "+ track.sampleArray[track.sampleSortOrder[Math.round((mousepos[1]-mousepos[1]%subTrackHeight)/subTrackHeight)]]);
      }
    }
    else{
      if(index<track.subTrackCount && index>=0){
        balloon17394.showTooltip(event, "Name: "+brwsr.view.ruler[Math.round((mousepos[0]-mousepos[0]%pxPerBp)/pxPerBp)+leftBase]+"<br>Index: "+Math.round((mousepos[1]-mousepos[1]%subTrackHeight)/subTrackHeight)+"<br>Sample: "+ track.sampleArray[Math.round((mousepos[1]-mousepos[1]%subTrackHeight)/subTrackHeight)]);
      }
    }
  };
}; 

/*
CompositeTrack.prototype.findPosition=function(oElement) {
  if(typeof( oElement.offsetParent ) != "undefined") {
    for(var posX = 0, posY = 0; oElement; oElement = oElement.offsetParent) {
      posX += oElement.offsetLeft;
      posY += oElement.offsetTop;
    }
    return [ posX-this.brwsr.view.elem.scrollLeft, posY-this.brwsr.view.elem.scrollTop];
  }
  else {
    return [oElement.x-this.brwsr.view.elem.scrollLeft, oElement.y-this.brwsr.view.elem.scrollTop];
  }
};
*/

CompositeTrack.prototype.getXY=function(e, imgID) {
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
}

/*
CompositeTrack.prototype.startZoom = function(destScale, destStart, destEnd) {
    if (this.empty) return;
    this.blockToImage = {};
    console.debug("destScale="+destScale+" destStart="+destStart+" destEnd="+destEnd);
    this.getImage(0, this.getZoom(destScale), destStart, destEnd);
};

*/
CompositeTrack.prototype.endZoom = function(destScale, destBlockBases) {
    Track.prototype.clear.apply(this);
};

CompositeTrack.prototype.clear = function() {
    Track.prototype.clear.apply(this);
    //this.blockToImage = [];
};

CompositeTrack.prototype.isBigCytoscapeWebEnabled=function(min, max){
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

CompositeTrack.prototype.getBigCytoscapeDrawOption=function(min, max){
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
  for(i=minVisible; i<=maxVisible; i++){
    visible.push(ruler[i])
  } 
  
  var data={};
  data['nodes']=[];
  data['edges']=[];
  for(i=0; i<visible.length; i++){
    data['nodes'].push({'id':visible[i], 'label':visible[i]});
  }
  for(i=0; i<visible.length; i++){
    for(j=i+1; j<visible.length; j++){
      if(edges[visible[i]] && edges[visible[i]][visible[j]]){
        data['edges'].push({'id':visible[i]+'_to_'+visible[j], 'target':visible[i], 'source':visible[j]});
      }
    }
  }
  var visual_style={
   'global': {
     'tooltipDelay': 500
   },
   'nodes': {
       'labelVerticalAnchor':'bottom',
       'labelFontWeight':'bold',
       'color':"#88c353",
       'tooltipText': "<b>${label}</b>"
       },  
   'edges':{
       'color':"#D3BCA5",
       'width':4
     }   
   };  
  network_json['data']=data;
  network_json['dataSchema']={
       nodes: [ { name: "id", type: "string" },
                { name: "label", type: "string" }
              ],  
       edges: [ { name: "label", type: "string" },
                { name: "id", type: "string" }
              ]   
  };  
  draw_option['network']=network_json;
  draw_option['visualStyle']=visual_style;
  draw_option['nodeTooltipsEnabled']=true;
  return draw_option;
};

/*
CompositeTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
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


/* input: a list of sample names
   output: the index array of positions relative to the original samples
  e.g. 
    original samples: [A B C]
    orderedSamples: [B C A];
  then output is [1 2 0]
*/
CompositeTrack.prototype.getSortedSampleOrder=function(sortedSamples){
  var original=this.sampleArray;
  var sorted=sortedSamples;
  var i;
  var results=[];
  for(i=0; i<sorted.length; i++){
    results.push($.inArray(sorted[i], original));
  }
  return results;
};


/* test if the track sample info file exists */
/*
CompositeTrack.prototype.isSampleInfoAvailable=function(){
	var myintUrl=this.int_url;
	// remove file extension
	myintUrl=myintUrl.replace(/\.[^/.]+$/, "");
	var all_features_url=myintUrl+".all_features";
  return Util.checkFileExistsOnServer(all_features_url);
};
*/
