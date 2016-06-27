function NameTrack(trackMeta, datatype, url, refProtein, browser, browserParams) {
    Track.call(this, trackMeta.isUserTrack, trackMeta.isUploadTrack, trackMeta.label, trackMeta.key, datatype,
               false, browserParams.changeCallback);
    this.brwsr=browser;
    this.view= browser.view;
    this.refProtein = refProtein;
    this.baseUrl = (browserParams.baseUrl ? browserParams.baseUrl : "");
    this.maxNameLen=12;
    this.data=[];
    this.trunData=[];  // truncated names
    this.truncated=[];  // true or false
    this.load(this.baseUrl+url);
}

NameTrack.prototype=new Track("");

//  TODO:  does not need to load, already loaded as Ruler
NameTrack.prototype.loadSuccess = function(o) {
    // pass the input and assign to an object "data"
    var lines=o.split("\n"); 
    var size=0;
    for(var i=0; i<lines.length; i++){
    // skip lines start with #
      if(!lines[i].match("^\s*\#")){
        // the format of name:  XXXX,id
        var items=lines[i].split(",");
        this.data[size]=items[0];
        if(items[0].length>this.maxNameLen){
          var sliced=items[0].slice(0,this.maxNameLen-1);
          sliced=sliced+"\\";
          this.trunData[size]=sliced;
          this.truncated[size]=true;
        }
        else{
         this.trunData[size]=items[0];
         this.truncated[size]=false;
        }
        size++;
      }
    }
    if(debug){
     console.log("data.size="+this.data.length);
    }
    this.setLoaded();
};

NameTrack.prototype.setViewInfo = function(heightUpdate, numBlocks,
                                            trackDiv, labelDiv,
                                            widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, [heightUpdate, numBlocks,
                                             trackDiv, labelDiv,
                                             widthPct, widthPx, scale]);
    this.trackDiv=trackDiv;
    this.setLabel(this.key);
};


NameTrack.prototype.fillBlock = function(blockIndex, block,
                                          leftBlock, rightBlock,
                                          leftBase, rightBase,
                                          scale, stripeWidth,
                                          containerStart, containerEnd, 
                                          first, last, firstStartBase) {
  block.style.cursor="auto";
  var blockWidth = rightBase - leftBase;
  if(this.view.curZoom==this.view.zoomLevels.length-1){
    var blockX=[];
    var trunBlockX=[];
    for(var i=leftBase; i<rightBase; i++){
      blockX.push(this.brwsr.view.ruler[i]);
      trunBlockX.push(this.trunData[i]);
    }
    //console.log("leftBase="+leftBase+" rightBase="+rightBase);
    //console.log(blockX);
    var geneWidth=this.view.zoomLevels[this.view.zoomLevels.length-1];
    for(var n=0; n<blockWidth; n++){
      // calcuating the left and right padding
      var leftpadding, rightpadding;
      var whitespace;
      whitespace=geneWidth-this.view.seqHeight-1; // 1px for the right border
      if(whitespace%2==0){
        leftpadding=rightpadding=whitespace/2;
      }
      else{
        leftpadding=(whitespace-1)/2;
        rightpadding=leftpadding+1;
      }
      var textCssText;
      if(!$.browser.msie){
       textCssText={'-webkit-transform': 'rotate(-90deg)', '-moz-transform': 'rotate(-90deg)'};
      }
      else{
       //textCssText="filter: progid:DXImageTransform.Microsoft.BasicImage(rotation=3);";
       textCssText={'-ms-transform': 'rotate(-90deg)'};

      }
      //textCssText=textCssText+"padding-left:"+leftpadding+";padding-right:"+rightpadding+";";
      var mywidth=geneWidth-1;
      var myheight=this.maxNameLen*this.view.charWidth;
      var mymargintop=0.5*(myheight-mywidth);
      var mymarginleft=-(0.5*(myheight-mywidth-this.view.charWidth-2)); // 2 is for border width
      //var mymarginleft=-0.5*mymargintop;
			//console.log(mymarginleft);
      //textCssText=textCssText+"width:"+myheight+"px;height:"+mywidth+"px;margin-left:"+mymarginleft+"px;display:inline-block;font-family:monospace;letter-spacing:0px;margin-top:"+mymargintop+"px;";
      textCssText['width']=myheight+'px';
			textCssText['height']=mywidth+'px';
			textCssText['margin-left']=mymarginleft+'px';
			textCssText['display']='inline-block';
			textCssText['font-family']='monospace';
			textCssText['letter-spacing']='0px';
			textCssText['margin-top']=mymargintop+'px';
      var geneNameDiv;
      var geneNameDivCss;
      geneNameDivCss={'top':'10px','width':mywidth+'px','height':myheight+"px"};
      if(n==0)
        geneNameDivCss['border-left-style']='none';
      geneNameDiv=$("<div>").css((geneNameDivCss)).addClass("gene-name"); 
      var namewithoutspace=blockX[n];
      if(namewithoutspace){
        namewithoutspace.replace(/ /g,'^^');
        var geneNameTextDiv=$("<div>").css(textCssText).html(trunBlockX[n]);
				geneNameTextDiv.attr("id", "name_"+namewithoutspace);
        // if the name is truncated, show full name if mouse over.
        $(geneNameTextDiv).appendTo($(geneNameDiv));
        $(geneNameDiv).appendTo(block)
        if(this.truncated[leftBase+n]){ 
					$(geneNameTextDiv).bind('mouseover', this.showFullName);
					$(geneNameTextDiv).bind('mouseout', this.hideFullName);
        }
      }
    }   
   this.heightUpdate(myheight, blockIndex);
 }
};

NameTrack.prototype.clear = function() {
    Track.prototype.clear.apply(this);
};

NameTrack.prototype.endZoom = function(destScale, destBlockBases) {
    Track.prototype.clear.apply(this);
};

NameTrack.prototype.showFullName=function(evt){
 var targetid=evt.target.id;
 var name=targetid.slice(5);
 name.replace(/^^/g,' ');
 balloon17394.showTooltip(evt, name);
// tooltip.show(name);
};

NameTrack.prototype.hideFullName=function(evt){
//  tooltip.hide();
};

/*
NameTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
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
		delete this.tileToImage[im.tileNum];
	    }
	}
    }
};
*/
