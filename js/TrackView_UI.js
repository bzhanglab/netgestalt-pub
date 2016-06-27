function Animation(subject, callback, time) {
  //subject: what's being animated
  //callback: function to call at the end of the animation
  //time: time for the animation to run
  if (subject === undefined) return;
  //don't want a zoom and a slide going on at the same time
  if ("animation" in subject) subject.animation.stop();
  this.index = 0;
  this.time = time;
  this.subject = subject;
  this.callback = callback;
  var myAnim = this;
  this.animFunction = function() { myAnim.animate(); };
  // number of milliseconds between frames (e.g., 33ms at 30fps)
  this.animID = setTimeout(this.animFunction, 33);
  this.frames = 0;
  subject.animation = this;
}

Animation.prototype.animate = function () {
  if (this.finished) {
    this.stop();
    return;
  }

  // number of milliseconds between frames (e.g., 33ms at 30fps)
  var nextTimeout = 33;
  var elapsed = 0;
  if (!("startTime" in this)) {
    this.startTime = (new Date()).getTime();
} else {
  elapsed = (new Date()).getTime() - this.startTime;
  //set the next timeout to be the average of the
  //frame times we've achieved so far.
  //The goal is to avoid overloading the browser
  //and getting a jerky animation.
  nextTimeout = Math.max(33, elapsed / this.frames);
}

if (elapsed < this.time) {
  this.step(elapsed / this.time);
  this.frames++;
} else {
  this.step(1);
  this.finished = true;
  //console.log("final timeout: " + nextTimeout);
}
this.animID = setTimeout(this.animFunction, nextTimeout);
};

Animation.prototype.stop = function() {
  clearTimeout(this.animID);
  delete this.subject.animation;
  this.callback(this);
};

function Slider(view, callback, time, distance) {
  Animation.call(this, view, callback, time);
  this.slideStart = view.getX();
  this.slideDistance = distance;
}

Slider.prototype = new Animation();

Slider.prototype.step = function(pos) {
  var newX = (this.slideStart -
    (this.slideDistance *
      //cos will go from 1 to -1, we want to go from 0 to 1
      ((-0.5 * Math.cos(pos * Math.PI)) + 0.5))) | 0;

      newX = Math.max(Math.min(this.subject.maxLeft - this.subject.offset, newX),
      this.subject.minLeft - this.subject.offset);
      this.subject.setX(newX);
};

function Zoomer(scale, toScroll, callback, time, zoomLoc) {
  Animation.call(this, toScroll, callback, time);
  this.toZoom = toScroll.zoomContainer;
  var cWidth = this.toZoom.clientWidth;

  this.initialWidth = cWidth;

  // the container width when zoomFraction is 0
  this.width0 = cWidth * Math.min(1, scale);
  // the container width when zoomFraction is 1
  var width1 = cWidth * Math.max(1, scale);
  this.distance = width1 - this.width0;
  this.zoomingIn = scale > 1;
  //this.zoomLoc = zoomLoc;
  this.center =
  (toScroll.getX() + (toScroll.elem.clientWidth * zoomLoc))
  / toScroll.scrollContainer.clientWidth;

  // initialX and initialLeft can differ when we're scrolling
  // using scrollTop and scrollLeft
  this.initialX = this.subject.getX();
  this.initialLeft = parseInt($(this.toZoom).css("left"));
};

Zoomer.prototype = new Animation();

Zoomer.prototype.step = function(pos) {
  var zoomFraction = this.zoomingIn ? pos : 1 - pos;
  var newWidth =
  ((zoomFraction * zoomFraction) * this.distance) + this.width0;
  var newLeft = (this.center * this.initialWidth) - (this.center * newWidth);
  $(this.toZoom).css("width",newWidth+"px");
  $(this.toZoom).css("left",(this.initialLeft+newLeft)+"px");
  var forceRedraw = this.toZoom.offsetTop;
  this.subject.updateTrackLabels(this.initialX - newLeft);
};

TrackView.prototype.moduleLevelKeyDown=function(evt){
  console.log(evt.keyCode);
};

TrackView.prototype.resetAllModuleColors=function(){
  var view=this;
	var moduleColors=view.moduleColors;
	for(var prop in moduleColors){
		$("div[title=\""+prop+"\"]").css("background-color",moduleColors[prop]);
	}
};

TrackView.prototype.moduleLevelOver=function(evt){
  var view=this;
	var o=view.brwsr.moduleData;
	var moduleColors=view.moduleColors;
  view.currentHLModuleName=$(evt.target).attr("title");
  view.resetAllModuleColors();
	$("div[title=\""+view.currentHLModuleName+"\"]").css("background-color","red");
	if(view.currentShownModuleName){
    $("div[title=\""+view.currentShownModuleName+"\"]").css("background-color", "purple");
	}
	var id=evt.target.id.slice(17);
	balloon17394.showTooltip(evt, "<b>Level:  </b>"+o[id]["level"]+"<br>"+"<b>Module:  </b>"+o[id]["order"]+"<br><b>Position: </b>"+(o[id]["start"]-1)+" -- "+(o[id]["end"]-1)+"<br><br>Hold down Shift key while mouseover to show more details.");
	// diffrent class show different format of module information
	if(ng_logo.currentClass=="network_view"){
		// display differently depending on the amount of information
		if(o[id]["AssociatedFeatures"] || o[id]["Related GO Terms"]){
			if($("#moduleInfoTooltipDiv").length!=0){
			   $("#moduleInfoTooltipDiv").remove();
			 }
				var moduleInfoTooltipDiv=$("<div>").attr("id","moduleInfoTooltipDiv").css({"display":"none"}).html("");
				$("body").append(moduleInfoTooltipDiv);
				$("#moduleInfoTooltipDiv").css("width","400px");
			if(!evt.shiftKey){
			  return;
			}
			else{
				balloon17394.nukeTooltip();
			}
			view.resetAllModuleColors();
      view.currentShownModuleName=view.currentHLModuleName;
      $("div[title=\""+view.currentShownModuleName+"\"]").css("background-color", "purple");
			var i,j;
			var colModelArr=[];
			var searchArr=[];
			var features=o[id]["AssociatedFeatures"];
			var cur_header;
			var tmp_item;
			var table_width=520;
			// for now only the following columns names has "NUM" type, others have "TXT" type, this is used for sorting
			if(features){
				var feature_arr;
				var feature_headers=[];
				$("#moduleInfoTooltipDiv").html("<b>Level:  </b>"+o[id]["level"]+"<br>"+"<b>Module:  </b>"+o[id]["order"]+"<br><b>Position: </b>"+(o[id]["start"]-1)+" -- "+(o[id]["end"]-1));
				$("#moduleInfoTooltipDiv").append("<hr><div style='margin:5px 0px 5px 0px; font-weight:bold;'>Associated Features</div>");
				$("#moduleInfoTooltipDiv").append("<table id='moduleInfoFeaturesFlexMe' style='display: block'></table>");
				feature_arr=features.split(";");
				// get feature headers once
				var first_feature_arr=feature_arr[0].split("|"); 
				for(i=0; i<first_feature_arr.length; i++){
					cur_header=first_feature_arr[i].split(":")[0];
					feature_headers.push(cur_header);
					colModelArr.push({display:cur_header, width: Math.round(table_width/first_feature_arr.length)-10, name:cur_header, sortable:true, align:'center'});
					searchArr.push({display:cur_header,name:cur_header});
				}
				// construct the actual data for the table
				var feature_data={};
				feature_data["page"]=1;
				feature_data["total"]=feature_arr.length;
        feature_data["rows"]=[];
				var cur_row;
				var cur_cell;
				var tmp_features;
				for(i=0; i<feature_arr.length; i++){
				  cur_row={};
					cur_row["id"]=i;
				  cur_cell=[];	
          tmp_features=feature_arr[i].split("|");
          for(j=0; j<tmp_features.length; j++){
            tmp_item=tmp_features[j].split(":")[1];
						if(!tmp_item){
							tmp_item="NA";
						}
						cur_cell.push(tmp_item);
					}
					cur_row["cell"]=cur_cell;
				  feature_data["rows"].push(cur_row);	
				}
				$("#moduleInfoFeaturesFlexMe").flexigrid({
					dataType: 'json',
					colModel: colModelArr,
				//	searchitems : searchArr,
					sortname: feature_headers[0],
					sortorder: "asc",
			//		usepager: true,
		//			useRp: true,
					nowrap: false,
					showToggleBtn: false,
				//	rp: 10, 
					resizable:false,
			//		width: 520,
					height: 150 
				});   
			}
			else{
				$("#moduleInfoTooltipDiv").html("<b>Level:  </b>"+o[id]["level"]+"<br>"+"<b>Module:  </b>"+o[id]["order"]+"<br><b>Position: </b>"+(o[id]["start"]-1)+" -- "+(o[id]["end"]-1));
				$("#moduleInfoTooltipDiv").append("<hr><div style='margin:5px 0px 5px 0px; font-weight:bold;'>Associated Features</div>");
				$("#moduleInfoTooltipDiv").append("<div style='margin:5px 0px 10px 0px; color:red;'>None</div>");
			}
			$("#moduleInfoFeaturesFlexMe").flexAddData(feature_data);
			var goterms=o[id]["Related GO Terms"];
			colModelArr=[];
			if(goterms){
				var goterms_arr;
				var goterms_headers=[];
				$("#moduleInfoTooltipDiv").append("<div style='margin:5px 0px 5px 0px; font-weight:bold;'>Associated GO Terms</div>");
				$("#moduleInfoTooltipDiv").append("<table id='moduleInfoGoTermsFlexMe' style='display: block'></table>");
				goterms_arr=goterms.split(";");
				// get goterms headers once
				var first_goterms_arr=goterms_arr[0].split("|"); 
				var cur_header;
				var table_width=520;
				for(i=0; i<first_goterms_arr.length; i++){
					cur_header=first_goterms_arr[i].split(":")[0];
					if(cur_header.toUpperCase()=="GOID"){
					  continue;
					}
					goterms_headers.push(cur_header);
					// 10 px -- cell left, right padding
					colModelArr.push({display:cur_header, width: Math.round(table_width/(first_goterms_arr.length-1))-10, name:cur_header, sortable:true, align:'center'});
				}
				// construct the actual data for the table
				var goterms_data={};
				goterms_data["page"]=1;
				goterms_data["total"]=goterms_arr.length;
				goterms_data["rows"]=[];
				var cur_row;
				var cur_cell;
				var tmp_goterms;
				var tmp_items;
				var cur_goid;
				var goIDs=[]; // hold the GO ID's, used to create urls for each
				for(i=0; i<goterms_arr.length; i++){
					tmp_goterms=goterms_arr[i].split("|");
					// get GOIDs first
					for(j=0; j<tmp_goterms.length; j++){
						tmp_items=tmp_goterms[j].split(":");
						cur_header=tmp_items[0]; //format: GOID:GO:XXXXXX
						if(cur_header.toUpperCase()=="GOID"){
							cur_goid=tmp_items[2]; 
							goIDs.push(cur_goid);
						}
					}
				}
				for(i=0; i<goterms_arr.length; i++){
					cur_row={};
					cur_row["id"]=i;
					cur_cell=[];	
					tmp_goterms=goterms_arr[i].split("|");
					for(j=0; j<tmp_goterms.length; j++){
					  tmp_items=tmp_goterms[j].split(":");
						cur_header=tmp_items[0]; 
						if(cur_header.toUpperCase()=="GOID"){
						  continue; //format: GOID:GO:XXXXXX;
						}
						else if(cur_header.toUpperCase()=="GONAME"){
						  tmp_item=tmp_goterms[j].split(":")[1];
							tmp_item="<a target='_blank' href='http://amigo.geneontology.org/amigo/term/"+"GO:"+goIDs[i]+"'>"+tmp_item+"</a>";
						}
						else{
							tmp_item=tmp_goterms[j].split(":")[1];
							if(!tmp_item){
								tmp_item="NA";
							}
						}
						cur_cell.push(tmp_item);
					}
					cur_row["cell"]=cur_cell;
					goterms_data["rows"].push(cur_row);	
				}
				$("#moduleInfoGoTermsFlexMe").flexigrid({
					dataType: 'json',
					colModel: colModelArr,
				//searchitems : searchArr,
					sortname: goterms_headers[0],
					sortorder: "asc",
	//				usepager: true,
		//			useRp: true,
					nowrap: false,
   				showToggleBtn: false,
	//				rp: 10, 
					resizable:false,
				//	width: 520,
					height: 150 
				});   
				$("#moduleInfoGoTermsFlexMe").flexAddData(goterms_data);
			}
		}  
		else{ // No feature/go term information
	    balloon17394.showTooltip(evt, "<b>Level:  </b>"+o[id]["level"]+"<br>"+"<b>Module:  </b>"+o[id]["order"]+"<br><b>Position: </b>"+(o[id]["start"]-1)+" -- "+(o[id]["end"]-1));
			return;
		}
	}
	else{ // views other than network view, e.g. pathway view
		$("#moduleInfoTooltipDiv").html("<b>Name:   </b>"+o[id]["name"]+"<br><b>Position: </b>"+(o[id]["start"]-1)+" -- "+(o[id]["end"]-1));  
		return;
	}
	$("#moduleInfoTooltipDiv").dialog({
		autoOpen:false,
		title:"Module Information",
		show: "fade",
		hide: "fade",
		position: [evt.clientX+20, evt.clientY+20],
    resizable: false,
		width:550,
		close: function(event, ui){
			view.resetAllModuleColors();
			view.currentShownModuleName=null;
      $("#moduleInfoTooltipDiv").dialog("destroy").remove();
		}
	}); 
	$("#moduleInfoTooltipDiv").dialog("open");
	if($("#moduleInfoGoTermsFlexMe").length>0){
		$("#moduleInfoGoTermsFlexMe tr").each(function() {
        $("a:visited", this).css("color","black");
				var st=parseFloat($(this).find("td").eq(3).text());
				if(st>0.25){
           $(this).css("color", "black");
        }
        else if(st>=0.05 && st<=0.25){
          $(this).css("color","#800000");
          $("a", this).css("color","#800000");
        }
				else{
          $(this).css("color","red");
          $("a", this).css("color","red");
        }
	});
	}
}

TrackView.prototype.moduleLevelOut=function(evt){
  var view=this;
  view.resetAllModuleColors();
	if(view.currentShownModuleName){
    $("div[title=\""+view.currentShownModuleName+"\"]").css("background-color", "purple");
	}
};


// module level position starts with 1 not 0
TrackView.prototype.moduleLevelClicked=function(evt){
  var myid=evt.target.id;
  //console.log(evt);
  myid=myid.replace("module-sub-level-","");
  var startbp=parseInt(this.brwsr.moduleData[myid]["start"]);
  var endbp=parseInt(this.brwsr.moduleData[myid]["end"]);
  //console.log("startbp="+startbp+" endbp="+endbp);
  var locString=Util.addCommas(startbp)+" .. "+Util.addCommas(endbp-1);
	this.setLocation(this.brwsr.networkInfo, startbp, endbp);
  // also insert a line under the location trapzoid to indicate the module range 
  // append the div to navbox
  var navbox=$("#navbox");
  if($(this.indicator).length>0){
    $(this.indicator).remove();
    delete  this.currentModuleStartBp;
    delete this.currentModuleEndBp;
  }
  //var centerbp=(startbp+endbp)/2;
  //var pxDist = this.bpToPx(centerbp);
  // var containerWidth = this.stripeCount * this.stripeWidth;
  //var stripesLeft = Math.floor((pxDist-(containerWidth / 2)) / this.stripeWidth);
  //var offset=stripesLeft*this.stripeWidth;
  //var centerPos=pxDist-offset-(this.dim.width/2);
  var startPos=(startbp-1-this.minVisible())*this.pxPerBp;
  var mywidth=(endbp-startbp+1)*this.pxPerBp;
  var indicator=$("<div>").attr("id","indicator");
  this.indicator=indicator;
  this.currentModuleStartBp=startbp;
  this.currentModuleEndBp=endbp;
  $(indicator).css({"background-color":"red",
    "position":"relative",
    "height":"2px",
    "left":startPos+"px",
    "width":mywidth+"px"});
  $(navbox).append($(indicator));
  Util.stopEvent(evt);
	// to updated track icon activation status
  this.showVisibleBlocks(true);
};

/* moves the view by (distance times the width of the view) pixels */
TrackView.prototype.slide = function(distance) {
  if (this.animation) this.animation.stop();
  this.trimVertical();
  // slide for an amount of time that's a function of the distance being
  // traveled plus an arbitrary extra 200 milliseconds so that
  // short slides aren't too fast (200 chosen by experimentation)
  new Slider(this,
    this.afterSlide,
    Math.abs(distance) * this.dim.width * this.slideTimeMultiple + 200,
  distance * this.dim.width);
};


TrackView.prototype.thumbMoved=function(mover) {
  var pxLeft=parseInt($(this.locationThumb).css("left"));
  var pxWidth=parseInt($(this.locationThumb).css("width"));
	$(this.locationThumb).css("top","0px");
  var pxCenter=pxLeft+(pxWidth/2);
  this.centerAtBase(((pxCenter/this.overviewBox.w)*(this.ref.end-this.ref.start))+this.ref.start);
};

TrackView.prototype.showWait = function() {
  var oldCursors = [];
  for (var i = 0; i < this.waitElems.length; i++) {
    oldCursors[i] = this.waitElems[i].style.cursor;
    this.waitElems[i].style.cursor = "wait";
  }
  this.prevCursors.push(oldCursors);
};

TrackView.prototype.showDone = function() {
  var oldCursors = this.prevCursors.pop();
  for (var i = 0; i < this.waitElems.length; i++) {
    this.waitElems[i].style.cursor = oldCursors[i];
  }
};

TrackView.prototype.trimVertical = function(y) {
  if (y === undefined) y = this.getY();
  var trackBottom;
  var trackTop = this.topSpace;
  var bottom = y + this.dim.height;
  for (var i = 0; i < this.tracks.length; i++) {
    if (this.tracks[i].shown) {
      trackBottom = trackTop + this.trackHeights[i];
      if (!((trackBottom > y) && (trackTop < bottom))) {
        this.tracks[i].hideAll();
      }
      trackTop = trackBottom + this.trackPadding;
    }
  }
};

TrackView.prototype.zoomIn = function(e, zoomLoc, steps) {
  if (this.animation) return;
  if (zoomLoc === undefined) zoomLoc = 0.5;
  if (steps === undefined) steps = 1;
  steps = Math.min(steps, (this.zoomLevels.length - 1) - this.curZoom);
  if (0 == steps) return;

  this.showWait();
  var pos = this.getPosition();
  this.trimVertical(pos.y);

  var scale = this.zoomLevels[this.curZoom + steps] / this.pxPerBp;
  var fixedBp = this.pxToBp(pos.x + this.offset + (zoomLoc * this.dim.width));
  this.curZoom += steps;
  this.pxPerBp = this.zoomLevels[this.curZoom];
  this.maxLeft = (this.pxPerBp * this.ref.end) - this.dim.width;

  for (var track = 0; track < this.tracks.length; track++)
    this.tracks[track].startZoom(this.pxPerBp,
      fixedBp - ((zoomLoc * this.dim.width)
      / this.pxPerBp),
      fixedBp + (((1 - zoomLoc) * this.dim.width)
      / this.pxPerBp));
      var thisObj = this;
      // Zooms take an arbitrary 700 milliseconds, which feels about right
      // to me, although if the zooms were smoother they could probably
      // get faster without becoming off-putting. -MS
      new Zoomer(scale, this,
        function() {thisObj.zoomUpdate(zoomLoc, fixedBp);},
      700, zoomLoc);
};

TrackView.prototype.zoomOut = function(e, zoomLoc, steps) {
  if (this.animation) return;
  if (steps === undefined) steps = 1;
  steps = Math.min(steps, this.curZoom);
  if (0 == steps) return;

  this.showWait();
  var pos = this.getPosition();
  this.trimVertical(pos.y);
  if (zoomLoc === undefined) zoomLoc = 0.5;
  var scale = this.zoomLevels[this.curZoom - steps] / this.pxPerBp;
  var edgeDist = this.bpToPx(this.ref.end) - (this.offset + pos.x + this.dim.width);
  //zoomLoc is a number on [0,1] that indicates
  //the fixed point of the zoom
  zoomLoc = Math.max(zoomLoc, 1 - (((edgeDist * scale) / (1 - scale)) / this.dim.width));
  edgeDist = pos.x + this.offset - this.bpToPx(this.ref.start);
  zoomLoc = Math.min(zoomLoc, ((edgeDist * scale) / (1 - scale)) / this.dim.width);
  var fixedBp = this.pxToBp(pos.x + this.offset + (zoomLoc * this.dim.width));
  this.curZoom -= steps;
  this.pxPerBp = this.zoomLevels[this.curZoom];
  if(debug4){
    console.log("pxPerBp:"+this.pxPerBp);
  }

  for (var track = 0; track < this.tracks.length; track++)
    this.tracks[track].startZoom(this.pxPerBp,
      fixedBp - ((zoomLoc * this.dim.width)
      / this.pxPerBp),
      fixedBp + (((1 - zoomLoc) * this.dim.width)
      / this.pxPerBp));

      //YAHOO.log("centerBp: " + centerBp + "; estimated post-zoom start base: " + (centerBp - ((zoomLoc * this.dim.width) / this.pxPerBp)) + ", end base: " + (centerBp + (((1 - zoomLoc) * this.dim.width) / this.pxPerBp)));
      this.minLeft = this.pxPerBp * this.ref.start;

      var thisObj = this;
      // Zooms take an arbitrary 700 milliseconds, which feels about right
      // to me, although if the zooms were smoother they could probably
      // get faster without becoming off-putting. -MS
      new Zoomer(scale, this,
        function() {thisObj.zoomUpdate(zoomLoc, fixedBp);},
      700, zoomLoc);
};

TrackView.prototype.zoomUpdate = function(zoomLoc, fixedBp) {
  var view=this;
  var eWidth = view.elem.clientWidth;
  var centerPx = view.bpToPx(fixedBp) - (zoomLoc * eWidth) + (eWidth / 2);
  view.stripeWidth = view.stripeWidthForZoom(view.curZoom);
  $(view.scrollContainer).css("width",(view.stripeCount*view.stripeWidth)+"px");
  $(view.zoomContainer).css("width",(view.stripeCount*view.stripeWidth)+"px");
  var centerStripe = Math.round(centerPx / view.stripeWidth);
  var firstStripe = (centerStripe - ((view.stripeCount) / 2)) | 0;
  view.offset = firstStripe * view.stripeWidth;
  view.maxOffset = view.bpToPx(view.ref.end) - view.stripeCount * view.stripeWidth;
  view.maxLeft = view.bpToPx(view.ref.end) - view.dim.width;
  view.minLeft = view.bpToPx(view.ref.start);
  $(view.zoomContainer).css("left","0px");
  view.setX((centerPx - view.offset) - (eWidth / 2));
  $.each(view.uiTracks, function(index, track) { track.clear(); });
  for (var track = 0; track < view.tracks.length; track++)
    view.tracks[track].endZoom(view.pxPerBp, Math.round(view.stripeWidth / view.pxPerBp));
  //YAHOO.log("post-zoom start base: " + this.pxToBp(this.offset + this.getX()) + ", end base: " + this.pxToBp(this.offset + this.getX() + this.dim.width));
  view.showVisibleBlocks(true);
  view.showDone();
  if(debug4){
    console.log("zoomUpdate done");
  }
  view.showCoarse();
  // add a name track when we hit the final zoom level
  // the acutal track data used is the ruler track
  if(view.curZoom==view.zoomLevels.length-1){
    var exists=false;
    if(view.tracks.length==0){
      exists=true;
    }
    else{
      for(var i=0; i<view.tracks.length; i++){
        if(view.tracks[i].name=="name"){
          exists=true;
          break;
      }    
    }    
    }
    if(!exists)
      view.addThisTrack("name");
  }
  else{
    // if there is a name track, remove it, also remove from cookie
    $("#zoomContainer").children().each(function(index, child){
		   if($(this)[0].id=="track_name"){
         view.removeThisTrack("name");  
				 return false; //break out of each
			 }
		});
  }
};

TrackView.prototype.scrollUpdate = function() {
  if(debug6){
    console.log("scrollUpdate()");
  }
  var x = this.getX();
  if(debug6){
    console.log("x="+x);
  }
  var numStripes = this.stripeCount;
  var cWidth = numStripes * this.stripeWidth;
  var eWidth = this.dim.width;
  //dx: horizontal distance between the centers of
  //this.scrollContainer and this.elem
  var dx = (cWidth / 2) - ((eWidth / 2) + x);
  //If dx is negative, we add stripes on the right, if positive,
  //add on the left.
  //We remove stripes from the other side to keep cWidth the same.
  //The end goal is to minimize dx while making sure the surviving
  //stripes end up in the same place.
  var dStripes = (dx / this.stripeWidth) | 0;
  if(debug6){
    console.log("dStripes="+dStripes);
  }
  if (0 == dStripes) return;
  var newOffset = this.offset - (dStripes * this.stripeWidth);
  if(debug6){
    console.log("oldOffset="+this.offset+" newOffset="+newOffset);
  }
  if (this.offset == newOffset) return;
  this.offset = newOffset;
  this.trackIterate(function(track) { track.moveBlocks(dStripes); });
  var newX = x + (dStripes * this.stripeWidth);
  this.updateTrackLabels(newX);
  this.rawSetX(newX);
  var firstVisible = (newX / this.stripeWidth) | 0;
  if(debug6){
    console.log("this.dim.width="+this.dim.width+", this.offset="+this.offset);
    console.log("this.stripeCount="+this.stripeCount);
    console.log("x="+x+", dx="+dx+", stripeWidth="+this.stripeWidth);
    console.log("dStripes="+dStripes);
    console.log("newOffset="+newOffset);
    console.log("newX="+newX+", firstVisible="+firstVisible);
  }
};

TrackView.prototype.trackHeightUpdate = function(trackName, height) {
  var y = this.getY();
  if (! trackName in this.trackIndices) return;
  if(debug4){
    console.log("..........trackName="+trackName+",height="+height);
  }
  var track = this.trackIndices[trackName];
  if (Math.abs(height - this.trackHeights[track]) < 1) return;

  //console.log("trackHeightUpdate: " + trackName + " " + this.trackHeights[track] + " -> " + height);
  // if the bottom of this track is a above the halfway point,
  // and we're not all the way at the top,
  if ((((this.trackTops[track] + this.trackHeights[track]) - y)
    <  (this.dim.height / 2))
  && (y > 0) ) {
    // scroll so that lower tracks stay in place on screen
    this.setY(y + (height - this.trackHeights[track]));
    //console.log("track " + trackName + ": " + this.trackHeights[track] + " -> " + height + "; y: " + y + " -> " + this.getY());
  }
  this.trackHeights[track] = height;
  this.tracks[track].div.style.height = (height + this.trackPadding) + "px";
  var nextTop = this.trackTops[track];
  if (this.tracks[track].shown) nextTop += height + this.trackPadding;
  for (var i = track + 1; i < this.tracks.length; i++) {
    this.trackTops[i] = nextTop;
    this.tracks[i].div.style.top = nextTop + "px";
    if (this.tracks[i].shown)
      nextTop += this.trackHeights[i] + this.trackPadding;
  }
  this.containerHeight = Math.max(nextTop, this.getY() + this.dim.height);
  //$(this.scrollContainer).css("height",this.containerHeight+"px");
  $(this.scrollContainer).css("height","100%");
};

TrackView.prototype.createCollapsedPage=function(indices){
 // parameter for the collapsed page
  collapsedParam={};
  collapsedParam.indices=indices;
  collapsedParam.reloaded=false;
  var j = window.open('collapse.html');
};

TrackView.prototype.filterTrackSubmitButtonClicked=function(cur_min, cur_max, label, data){
  // may overlap with createUserEnterTrackNameDiv() in NGBrowser.js
  var view=this;
  var brwsr=view.brwsr;
	var allSctFilterInputs=$("input", $("#visibleBalloonElement"));
  // for some reason, get value by input id does not work, only work with index
  var errormsg='';
  var errorBackgroundColor='#FFB6C1';
  var abs_max=Math.abs(cur_max);
  var abs_min=Math.abs(cur_min);
  var temp_value;
  if(abs_max>abs_min)
    temp_value=abs_max;
  else if(abs_max<abs_min)    
    temp_value=abs_min;
  else
    temp_value=abs_max;
  var csmax=temp_value;                                                                                                      
  var csmin=-1.0*temp_value;
  var addFilteredTrack=function(userTrackName,filteredData){
    var gene_string='';
    var colors=[];
    for(var j=0; j<filteredData.length; j++){
      if(!isNaN(filteredData[j])){
        if(filteredData[j]!=0){
          gene_string=gene_string+brwsr.view.ruler[j]+'|';
          colors[j]='#'+Util.computeColor(filteredData[j], csmax, csmin);
        }
        else{
          colors[j]='#FFF';
        }
      }
      else{
        colors[j]='#FFF';
      }
    }     
    brwsr.currentUserTrackType="sbt";                                                                       
    brwsr.gene_string=gene_string;  
    brwsr.trackColor=colors;
    var children=$("#zoomContainer").children();
    for(var i=0; i<children.length; i++){
      // check duplicated user track name  
      if(brwsr.userTrackNameAlreadyExist(children.get(i).id, userTrackName)) {
        errormsg+="Track with same title already exist.<br/>";
        return errormsg;
      }
    }
    var networkType=brwsr.currentNetworkType();
    var myCurrentNetwork;
    if(networkType=="system")
      myCurrentNetwork=brwsr.currentNetwork;
    else
      myCurrentNetwork=ng_logo.allNetworks[brwsr.currentNetwork]["directory"];
    $('form#sctfilterform').ajaxSubmit(
     {
       data:{
        'currentNetwork':myCurrentNetwork,
        'trackType': brwsr.currentUserTrackType,
        'networkType':networkType,
        'geneString':brwsr.gene_string,
        'trackName':userTrackName
       },
       success: function(responseText){
          var result=$.parseJSON(responseText);
          var userTrack={};
          userTrack.url=result.url[0];
          userTrack.int_url=result.int_url[0];
          userTrack.network=brwsr.currentNetwork;
          userTrack.type='SimpleTrack';
          userTrack.datatype=brwsr.currentUserTrackType;
          userTrack.key=userTrackName;
          userTrack.label=userTrackName.replace(/ /g,"");
          userTrack.name=userTrack.label;
          userTrack.link='NULL';
          userTrack.catergory='User Track';
          userTrack.isUserTrack=true;
          // no longer need geneString
          // userTrack.geneString=brwsr.gene_string;
          userTrack.trackColor=brwsr.trackColor;
          brwsr.trackData.push(userTrack);
          // save userTrack into localStorage 
          if(typeof(localStorage)!='undefined') {
            // if already exists in localStorage, update it ( insert the new url corresponding to the network )
            var objString=localStorage.getItem(userTrack.label);
            if(objString){
              var tempObj=$.parseJSON(objString);
              tmpObj[url][brwsr.currentNetwork]=userTrack.url;
              tmpObj["trackColor"][b.currentNetwork]=userTrack.trackColor;
              localStorage.setItem(userTrack.label, JSON.stringify(tmpObj));
            }
            else{
              var localStorageTrackObj={};
              $.extend(localStorageTrackObj, userTrack); // make a copy, not a reference
              var urlObj={};
              urlObj[brwsr.currentNetwork]=userTrack.url;
              localStorageTrackObj.url=urlObj;
              var trackColorObj={};
              trackColorObj[b.currentNetwork]=userTrack.trackColor;
              localStorageTrackObj.trackColor=trackColorObj;
              delete localStorageTrackObj.network;  
              localStorage.setItem(userTrack.label, JSON.stringify(localStorageTrackObj));
            }
          }    
          var evt={};
          evt.target={};
          evt.target.id=userTrack.label;
          brwsr.gene_string='';
          brwsr.trackColor=[];
          brwsr.stbox.addTrack(evt);
       }
     });
     return "";
  };
  if(Util.SCTFilterRadioButtonChecked(0)){  //radio button 1 
    var box1value=parseFloat(Util.getSCTFilterInputValueByIndex(1)); 
    if(!(box1value<=cur_max && box1value>=cur_min)){
      var box1=allSctFilterInputs.eq(1);
      box1.css("background-color",errorBackgroundColor);
      errormsg+='Please enter a valid number.<br/>';
    }
  }
  else if(Util.SCTFilterRadioButtonChecked(2)){  //radio button 2 
    var box2value=parseFloat(Util.getSCTFilterInputValueByIndex(3)); 
    if(!(box2value<=cur_max && box2value>=cur_min)){
      var box2=allSctFilterInputs.eq(3);
      box2.css("background-color",errorBackgroundColor);
      errormsg+='Please enter a valid number.<br/>';
    }
  }
  else if(Util.SCTFilterRadioButtonChecked(4)){ //radio button 3
    var box3value=parseFloat(Util.getSCTFilterInputValueByIndex(5)); 
    var box4value=parseFloat(Util.getSCTFilterInputValueByIndex(6)); 
    var error=0;
    if(box3value>cur_max || box3value<cur_min){
      var box3=allSctFilterInputs.eq(5); 
      box3.css("background-color",errorBackgroundColor);
      error=1;
    }
    if(box4value<cur_min || box4value>cur_max){
      var box4=allSctFilterInputs.eq(6);
      box4.css("background-color",errorBackgroundColor);
      error=1;
    }
    if(box4value < box3value){
      var box3=allSctFilterInputs.eq(5);
      box3.style.backgroundColor=errorBackgroundColor;
      box3.css("background-color",errorBackgroundColor);
      var box4=allSctFilterInputs.eq(6);
      box4.css("background-color",errorBackgroundColor);
      error=1;
    }
    if(error==1){
      errormsg+='Please enter a valid number.<br/>';
    }
  }
  else if(Util.SCTFilterRadioButtonChecked(7)){ //button 4
    var box5value=parseFloat(Util.getSCTFilterInputValueByIndex(8)); 
    var box6value=parseFloat(Util.getSCTFilterInputValueByIndex(9)); 
    var error=0;
    if(box5value>cur_max || box5value<cur_min){
      var box5=allSctFilterInputs.eq(8);
      box5.css("background-color",errorBackgroundColor);
      error=1;
    }
    if(box6value<cur_min || box6value>cur_max){
      var box6=allSctFilterInputs.eq(9);
      box6.css("background-color",errorBackgroundColor);
      error=1;
    }
    if(box5value > box6value){
      var box5=allSctFilterInputs.eq(8);
      box5.css("background-color",errorBackgroundColor);
      var box6=allSctFilterInputs.eq(9);
      box6.css("background-color",errorBackgroundColor);
      error=1;
    }
    if(error==1){
      errormsg+='Please enter a valid number.<br/>';
    }
  }
  var userTrackNameValue=Util.getSCTFilterInputValueByIndex(10);
  if(userTrackNameValue==''){
    errormsg+="Track title cannot be empty.<br/>";
  }
  else if(userTrackNameValue.match(/[^a-zA-Z0-9-_ ]/g)!=null){
    errormsg+="Track title can only contain a-z, A-Z, 0-9, space,'-' and '_'.<br/>";
  }
  if(errormsg!=''){
    $("#sctfiltererror").html(errormsg);
    $("#sctfiltererror").css({"color":"red", "display":"block"});
    return -1;
  }
  else{
    // no error we can call function to add the track
    // first need to filter the data
    var f_data=[]; //filtered data
    var i;
    if(Util.SCTFilterRadioButtonChecked(0)){
      for(i=0; i<data.length; i++){
        if(data[i]!='NA'){
          if(data[i]<box1value){
            f_data.push(data[i]);
          }
          else{
            f_data.push(0);
          }
        }
        else{
          f_data.push('NA');
        }
      }
    }
    else if(Util.SCTFilterRadioButtonChecked(2)){
      for(i=0; i<data.length; i++){
        if(data[i]!='NA'){
          if(data[i]>box2value){
            f_data.push(data[i]);
          }
          else{
            f_data.push(0);
          }
        }
        else{
          f_data.push('NA');
        }
      }
    }
    else if(Util.SCTFilterRadioButtonChecked(4)){
      for(i=0; i<data.length; i++){
        if(data[i]!='NA'){
          if(data[i]>box3value && data[i]<box4value){
            f_data.push(data[i]);
          }
          else{
            f_data.push(0);
          }
        }
        else{
          f_data.push('NA');
        }
      }
    }
    else{
      for(i=0; i<data.length; i++){
        if(data[i]!='NA'){
          if(data[i]<box5value || data[i]>box6value){
            f_data.push(data[i]);
          }
          else{
            f_data.push(0);
          }
        }
        else{
          f_data.push('NA');
        }
      }
    }
    var msg=addFilteredTrack(userTrackNameValue,f_data);
    if(msg==''){
      return 0;
    }
    else{
      $("#sctfiltererror").html(msg);
      $("#sctfiltererror").css({"color":"red", "display":"block"});
      return -1;
    }
  }
};

TrackView.prototype.showLinkedPage=function(event){
  var mytitle;
  var targetid=event.target.id;           
  var link;
  //label_XXXXX
  if(targetid.slice(0,6)=="label_"){
    mytitle=targetid.slice(6);
    // get info from trackInfo
		var result=queryTrackDataByLabel(thsis.brwsr.trackData, mytitle);
    for(var i=0; i<result.length; i++){
      if(result[i]["network"]==this.brwsr.currentNetwork)
        break;
    }
    link=result[i]["link"];
    window.open(link);
  }
};


TrackView.prototype.showSampleHeatmapTitles=function(track, sampleHeatMapTitleDivID, titleWidth){
 // add title to the sample heatmap title div
  var cur_name;
  var cur_title_div;
  var feature_len=track.addedSampleFeatures.length;
  var display_name;
  var title_div;
  $("#"+Util.jqSelector(sampleHeatMapTitleDivID)).empty();
  for(i=0; i<feature_len; i++){
    cur_name=track.addedSampleFeatures[feature_len-1-i];
    cur_title_div=$("<div>").attr("id",sampleHeatMapTitleDivID+"_"+cur_name);
    $(cur_title_div).css({"position":"relative","height":$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).height()+"px", "width":titleWidth+"px", "float":"right"});
    if(i%2==0){
      $(cur_title_div).css("background-color","#E9DED3");
    }
    $(cur_title_div).appendTo($("#"+Util.jqSelector(sampleHeatMapTitleDivID)));
    display_name=cur_name.replace(/_/g,' ');
    title_div=$("<div>").css({"width":$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).height()+"px", "height":titleWidth+"px"}).text(display_name).addClass("sample-heatmap-title");
    $(title_div).appendTo($(cur_title_div));
  }
};

// update the sample heatmap according to the current selected features (also consider the order of added features)
TrackView.prototype.updateFeatureInSampleHeatMap=function(track, featureName, width, showFeatureTitleDivID, showFeatureTitleIconID, sampleHeatMapTitleDivID){
  var view=this;
  // if we already have maximum size displayed, using least recently used (LRU) rule to remove the oldest from the view
  if(track.addedSampleFeatures.length==track.maxSampleFeatures){
    track.addedSampleFeatures.shift();
  }

  if(featureName!="")
    track.addedSampleFeatures.push(featureName);
  
  // in track.addedSampleFeatures: a,b,c,,,,
  // pass to sample_heatmap as ,,,,c,b,a
  var features_to_be_visualized="";
  var i;
  for(i=0; i<track.addedSampleFeatures.length; i++){
    features_to_be_visualized+=track.addedSampleFeatures[i];
    if(i!=track.addedSampleFeatures.length-1)
      features_to_be_visualized+=",";
  }
  // generate the sample heatmap image    
  var getImage=function(track,arg){
    $.ajax({
      type: "POST",
      url: "image_gen_sample_heatmap.php",
      data: arg,
      dataType:"json", 
      async: false,
      success: function(data,textStatus){
        if(textStatus=='success'){
           // return the image object
           image=data;
        }
      },
      error: function(ts){
        console.log(ts.responseText);
      }
    });
    return image; 
  };
  var arg={};
	/*
	var result=queryTrackDataByLabel(view.brwsr.trackData, track.name);
	console.log(result);
	console.log(view.brwsr.currentNetwork);
	for(var k=0; k<result.length; k++){
		if(result[k]["network"]==view.brwsr.currentNetwork)
			break;
	}
  var myintUrl=result[k]["int_url"];
	*/
	var myintUrl=track.int_url;
  // remove file extension
  myintUrl=myintUrl.replace(/\.[^/.]+$/, "");
	// sample info db now in int_data
  //arg.track_file=track.trackUrl;
  arg.track_file=myintUrl;
  arg.sample_features=features_to_be_visualized;
  arg.sample_height=track.subTrackHeight;
  arg.pixel_per_feature=Math.floor(width/track.maxSampleFeatures);
  arg.total_feature_count=track.maxSampleFeatures;
  var imgObj, all_images, count;
  var sortedSamples;
  if(features_to_be_visualized!=""){
    imgObj=getImage(track,arg);
    all_images=imgObj.src;
    count=all_images.length;
    sortedSamples=imgObj.samples.slice(0,-1).split(',');
    track.sortedCommonSamples=sortedSamples;
		// for collapse
		track.sortedSampleIndiceString=track.getSortedSampleOrder(sortedSamples).join();
  }
  else{  // restore the original sample order
    sortedSamples=track.sampleArray;
    track.sortedCommonSamples=sortedSamples;
		// for collapse
		track.sortedSampleIndiceString="";
  }
  // place the image to the right place
  // if already has a image, remove it first
  // remove all previous images
  /*
  $("#sample_heatmap_"+track.name+" img").each(function(){
   if($(this).attr('id')!=undefined && $(this).attr('id').match(/feature_img/)){
    $(this).remove();
   }
  });
  */
  $("#sample_heatmap_"+Util.jqSelector(track.name)+"_sortable").remove();
  // add the images
  var image_id, sample_heatmap_img;
  var li_id;
  var contextmenu_list_id;
  //create a sortable list
  var sample_sortable_id="sample_heatmap_"+track.name+"_sortable";
  var sample_sortable=$("<ul>").attr({"id":sample_sortable_id});
  $(sample_sortable).css({"list-style-type":"none", "margin":0, "padding":0});
  $(sample_sortable).appendTo($("#sample_heatmap_"+Util.jqSelector(track.name)));
  // put all cur_feature_name into an object to avoid error caused by special characters
  var feature_names={};
  var cur_feature_name;
  for(i=0; i<count; i++){
    feature_names[i]=track.addedSampleFeatures[count-1-i]; 
  }
  for(i=0; i<count; i++){
    var cur_feature_name=track.addedSampleFeatures[count-1-i];
    //li_id="sample_heatmap_"+track.name+"__"+cur_feature_name+"__li";
    li_id="sample_heatmap_"+track.name+"__"+i+"__li";
    $("<li>").attr({"id":li_id}).appendTo($(sample_sortable));
    $("#"+Util.jqSelector(li_id)).css({'float':'right', 'display':'inline'});
    //image_id="sample_heatmap_"+track.name+"__"+cur_feature_name+"__feature_img"+Util.randomString(10);
    image_id="sample_heatmap_"+track.name+"__"+i+"__feature_img"+Util.randomString(10);
    // may not like image id with special character such as # or %
    sample_heatmap_img=$("<img>").attr({"src":all_images[count-1-i], "id":image_id});
    $(sample_heatmap_img).css({'margin-top':'-34px'});
    $("#"+Util.jqSelector(li_id)).append($(sample_heatmap_img));
    $("#"+Util.jqSelector(image_id)).mousemove(function(e){ 
        //var parentOffset = $(this).parent().offset(); 
        var offset = $(this).offset(); 
        //or $(this).offset(); if you really just want the current element's offset
        // for some reason, firefox return fractional pixel
        var relX = Math.round(e.pageX - offset.left);
        var relY = Math.round(e.pageY - offset.top-0.5);
        var ordered_samples_string=imgObj.samples.slice(0,-1); //remove the last character(",")
        var ordered_samples=ordered_samples_string.split(",");
        //var myfeature=$(this).attr("id").split("__")[1];
        var myfeature=feature_names[parseInt($(this).attr("id").split("__")[1])];
        var cur_sample=ordered_samples[Math.floor(relY/track.subTrackHeight)];
        var sample_value=view.getSampleValue(track, cur_sample, myfeature);
        balloon17394.showTooltip(e, "<b>Feature</b>:"+myfeature+"<br><b>Sample</b>:"+cur_sample+"<br><b>Value</b>:"+sample_value);
     });
    // for each image add right click context menu
     //contextmenu_list_id="sample_heat_map_"+track.name+"__"+cur_feature_name+"__contextmenu_list";
     contextmenu_list_id="sample_heat_map_"+track.name+"__"+i+"__contextmenu_list";
		 if($("#"+Util.jqSelector(contextmenu_list_id)).length==0){
			 //var contextmenu_list= $('<ul/>', {id: contextmenu_list_id}).append($('<li/>', {html:"<a href='#' id='"+contextmenu_list_id+"_href'>Remove feature</a>"}));
			 var contextmenu_list= $('<ul>', {id: contextmenu_list_id}).append($('<li>', {html:"<a id='"+contextmenu_list_id+"_href'>Remove feature</a>"}));
			 contextmenu_list.addClass("jqcontextmenu");
			 contextmenu_list.appendTo($("body"));
		 }
      $("#"+Util.jqSelector(image_id)).addcontextmenu(contextmenu_list_id);
      // check if the event handler is already there
      var $evt=$("#"+Util.jqSelector(contextmenu_list_id)+"_href").data("events");
      if($evt && $evt.click){
        $("#"+Util.jqSelector(contextmenu_list_id)+"_href").unbind('click');
      }
      if($evt==undefined || $evt.click==undefined){
        $("#"+Util.jqSelector(contextmenu_list_id)+"_href").off("click");
        $("#"+Util.jqSelector(contextmenu_list_id)+"_href").click(function(event){
          var myfeatureid=parseInt(event.target.id.split("__")[1]);
					//console.log(track.addedSampleFeatures);
          //var idx=$.inArray(myfeature,track.addedSampleFeatures);
					//console.log(idx);
          track.addedSampleFeatures.splice(track.addedSampleFeatures.length-1-myfeatureid,1);
          view.updateFeatureInSampleHeatMap(track,"", 230, showFeatureTitleDivID, showFeatureTitleIconID, sampleHeatMapTitleDivID);
          if(track.addedSampleFeatures.length==0){
            $("#"+Util.jqSelector(showFeatureTitleDivID)).css({"visibility":"hidden"});
            $("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css({"visibility":"hidden"});
            $("#"+Util.jqSelector(showFeatureTitleIconID)).attr({"src":"images/downarrow.png"});
          }
        });
    }
  }
  $("#"+Util.jqSelector(sample_sortable_id)).sortable({
     helper: 'clone',
     tolerance: 'pointer',
     axis: 'x',
     placeholder: 'sortable-placeholder',
     containment: 'parent',
     start: function(event, ui) {
              ui.item.bind("mouseover.prevent",
                  function(event) { event.preventDefault(); });
     },
     stop: function(event, ui) {
        setTimeout(function(){ui.item.unbind("mouseover.prevent");}, 300);
        // sort the samples
        // set the track.addedSampleFeature to the new order 
        track.addedSampleFeatures=[];
        $.each($(this).sortable("toArray"), function(idx,elem){
           //track.addedSampleFeatures.unshift(elem.split("__")[1]);
           track.addedSampleFeatures.unshift(feature_names[parseInt(elem.split("__")[1])]);
          });
        view.updateFeatureInSampleHeatMap(track,"", 230, showFeatureTitleDivID, showFeatureTitleIconID, sampleHeatMapTitleDivID);
      }
  });
  $("#"+Util.jqSelector(sample_sortable_id)).disableSelection();
//  $("<div>").css({"clear":"both"}).appendTo($("#sample_heatmap_"+track.name));
  if(track.addedSampleFeatures.length>0){
   $("#"+Util.jqSelector(showFeatureTitleDivID)).css({"visibility":"visible"});
  }
  // if title div is visible, update it
  if($("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css("visibility")=="visible"){
   view.showSampleHeatmapTitles(track, sampleHeatMapTitleDivID, Math.floor(230/track.maxSampleFeatures));
  }
  // once the heatmap div is updated, generate new image for the track itself based on
  // the new sample order 
   track.sortPos=-2; //anything other than -1 should be OK
   track.showRange(track.first, track.last, track.startBase, track.bpPerBlock, 
                   track.pxPerBp, track.containerStart, track.containerEnd, track.sortPos, 
                   '', sortedSamples);
  // hide the drop down list
  $("#sample_feature_select_div_"+Util.jqSelector(track.name)).remove();
};

TrackView.prototype.getSampleValue=function(track, sampleName, feature){
  var value;
  var arg={};
  //arg.track_file=track.trackUrl;
	// need to remove extension
  arg.track_file=(track.int_url).slice(0, -4);
  arg.sample=sampleName;
  arg.feature=feature;
  $.ajax({
    type: "POST",
    url: "get_sample_value.php",
    data: arg,
    async: false,
    success: function(data,textStatus){
      if(textStatus=='success'){
         value=data;
      }
    },
    error: function(ts){
      console.log(ts.responseText);
    }
  });
  return value; 
};

TrackView.prototype.showRelatedTracks=function(o){
  var view=this;
	view.relatedTracksShown=true;
  if(this.brwsr.linkedTracksFormShown)
    this.brwsr.toggleLinkedFormDiv('linkedtracksformdiv', this.brwsr.linked_plusminus);
  if(!this.brwsr.relatedTracksFormShown)
    this.brwsr.toggleRelatedTracksFormDiv('relatedtracksformdiv',this.brwsr.related_plusminus);
  // display form div and hide default message
	if($("#relatedtracksformdiv").css("display")=="none"){
    $("#relatedtracksformdiv").css("display","block");
	}
	$("#defaultrelatedmsg").css("display","none");
  // create table
  var results=o["related"];
  this.relatedTracksNumber=results.length;
  var mytable=$("#related_track_table_0");
  if(mytable.length){
    mytable.remove();;
    $("#relatedtrackstablewrapper").remove();
  }
  var related_table_0=document.createElement('table');
  related_table_0.setAttribute('id', 'related_track_table_0');
  related_table_0.setAttribute('width','100%');
  //create table body
  var tbo=document.createElement('tbody');
  var row=new Array();
  var cell=new Array();
  var header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.appendChild(document.createTextNode('Original Track'));
  myspan.style.fontStyle='italic';
  myspan.style.fontWeight='bold';
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.appendChild(document.createTextNode(this.relatedTrackSource));
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);
	$(header).mouseover(function(event){
    balloon17394.showTooltip(event, view.relatedTrackSource);
  });

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
	if(this.myRelatedTracksTooltipRadioButtons){
		myspan.innerHTML='<br/>Enriched Tracks in <span style="color:#A67c52">'+this.myRelatedTracksTooltipRadioButtons+'</span>';
	}
	else{
		myspan.innerHTML='<br/>Enriched Network Modules</span>';
	}
  // myspan.appendChild(document.createTextNode('Target Category'));
  myspan.style.fontStyle='italic';
  myspan.style.fontWeight='bold';
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.innerHTML="(Total: <span style='color:#a67c52'><b>"+this.relatedTracksNumber+"</b></span>)";
  if(results.length>0){
    if(view.curRelatedTracksCategory.match(/module/g)){
      //myspan.innerHTML+="&nbsp;&nbsp;<a style=\"color:#ff0000;\" href=\"#\" id=\"addallrelatedmodules\"><b>Add all related modules</b></a>";
      myspan.innerHTML+="&nbsp;&nbsp;<a style=\"color:#ff0000;text-decoration:underline;\" id=\"addallrelatedmodules\"><b>Add all related modules</b></a>";
    }
  }
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  related_table_0.appendChild(tbo);
	this.brwsr.relatedTracksFormDiv.empty();
  this.brwsr.relatedTracksFormDiv.append($(related_table_0));

if(results.length>0){
    var tablewrapperdiv=document.createElement('div');
    tablewrapperdiv.setAttribute('id', 'relatedtrackstablewrapper');

    var related_table=document.createElement('table');
    related_table.setAttribute('id', 'related_track_table');
    related_table.setAttribute('width','100%');
    related_table.setAttribute('cellpadding','0');
    related_table.setAttribute('cellspacing','0');
    related_table.setAttribute('border','0');
    related_table.setAttribute('class','tinytable');

    var thd=document.createElement('thead');
    header=document.createElement('tr');
    cell[0]=document.createElement('th');
    cell[0].setAttribute('width','50%');
    cell[0].setAttribute('id','relatedTrackTableHeaderCell0');
    var myh3=document.createElement('h3');
    myh3.innerHTML='Track';
    cell[0].appendChild(myh3);
    header.appendChild(cell[0]);

    cell[1]=document.createElement('th');
    cell[1].setAttribute('width','30%');
    cell[1].setAttribute('id','relatedTrackTableHeaderCell1');
    myh3=document.createElement('h3');
    myh3.innerHTML='p_adjust';
    cell[1].appendChild(myh3);
    var addCellMouseOverHandler=function(cellid){
      return function(evt){
        balloon17394.showTooltip(evt, 'FDR adjusted p-value');
      };
    };
    cell[1].onmouseover=addCellMouseOverHandler('relatedTrackTableHeaderCell1');
    header.appendChild(cell[1]);

    cell[2]=document.createElement('th');
    cell[2].setAttribute('width','20%');
    cell[2].setAttribute('id','relatedTrackTableHeaderCell2');
    myh3=document.createElement('h3');
    // text should change based on the source track type: Enrichment Ration of K-S Statistic
    if(this.relatedTrackSourceType=='sbt'){
      myh3.innerHTML='ER';
      var addCellMouseOverHandler=function(cellid){
        return function(evt){
          balloon17394.showTooltip(evt, 'Enrichment Ratio');
        };
      };
      cell[2].onmouseover=addCellMouseOverHandler('relatedTrackTableHeaderCell2');
    }
    else if(this.relatedTrackSourceType=='sct'){
      myh3.innerHTML='Stat';
      var addCellMouseOverHandler=function(cellid){
        return function(evt){
          balloon17394.showTooltip(evt, 'K-S Statistic');
        };
      };
      cell[2].onmouseover=addCellMouseOverHandler('relatedTrackTableHeaderCell2');
    } 

    cell[2].appendChild(myh3);
    header.appendChild(cell[2]);

    thd.appendChild(header);
    related_table.appendChild(thd);
    tbo=document.createElement('tbody');
    var row=new Array();
		var tmpfloat, tmpnewfloat;
    for(i=0; i<results.length; i++){
      row[i]=document.createElement('tr');
      cell[0]=document.createElement('td');
      cell[0].setAttribute('width','50%');
      var label=results[i]['label'];
			var myresults=queryTrackDataByLabel(this.brwsr.trackData,label);
      for(var k=0; k<myresults.length; k++){
        if(myresults[k]["network"]==this.brwsr.currentNetwork)
          break;
      }
      var key=myresults[k]["key"];
      cont=document.createTextNode(key);
      cell[0].appendChild(cont);
      cell[0].setAttribute('label',label);
      row[i].appendChild(cell[0]);

      cell[1]=document.createElement('td');
      cell[1].setAttribute('width','30%');
			tmpfloat=parseFloat(results[i]['fdr']);
      tmpnewfloat=tmpfloat.toPrecision(3);
      cont=document.createTextNode(tmpnewfloat);
      cell[1].appendChild(cont);
      row[i].appendChild(cell[1]);

      cell[2]=document.createElement('td');
      cell[2].setAttribute('width','20%');
			tmpfloat=parseFloat(results[i]['metric']);
      tmpnewfloat=tmpfloat.toPrecision(3);
      cont=document.createTextNode(tmpnewfloat);
      cell[2].appendChild(cont);
      row[i].appendChild(cell[2]);

      tbo.appendChild(row[i]);
    }
    related_table.appendChild(tbo);
    tablewrapperdiv.appendChild(related_table);
    //table footer
    var tablefooterdiv=document.createElement("div");
    tablefooterdiv.setAttribute('id','tablefooter');
    var tablenavdiv=document.createElement("div");
    tablenavdiv.setAttribute('id', 'tablenav');
    tablenavdiv.innerHTML='<img id="tableFirstPage" src="js/TinyTable/images/first.gif" width="14" height="14" alt="First Page"/><img id="tablePrevPage" src="js/TinyTable/images/previous.gif" width="14" height="14" alt="Previous Page"/> <img id="tableNextPage" src="js/TinyTable/images/next.gif" width="14" height="14" alt="Next Page" /> <img id="tableLastPage" src="js/TinyTable/images/last.gif" width="14" height="14" alt="Last Page" />';
    tablefooterdiv.appendChild(tablenavdiv);
    var tablelocdiv=document.createElement("div");
    tablelocdiv.setAttribute('id', 'tablelocation');
    tablelocdiv.innerHTML='<div> <select id="relatedtrackspageselection"> <option value="5">5</option> <option value="10" selected="selected">10</option> <option value="20">20</option> <option value="50">50</option> <option value="100">100</option> </select> <span>Entries Per Page <i>Page</i></span> <span id="currentpage"></span> <i>of</i> <span id="pagelimit"></span></div>';
    tablefooterdiv.appendChild(tablelocdiv);
    tablewrapperdiv.appendChild(tablefooterdiv); 
    this.brwsr.relatedTracksFormDiv.append($(tablewrapperdiv));
    sorter = new TINY.table.sorter("sorter");
    sorter.head = "head";
    sorter.asc = "asc";
    sorter.desc = "desc"; 
    sorter.even = "evenrow";
    sorter.odd = "oddrow";
    sorter.evensel = "evenselected";
    sorter.oddsel = "oddselected";
    sorter.paginate = true;
    sorter.currentid = "currentpage";
    sorter.limitid = "pagelimit";
    sorter.init("related_track_table",1);
    this.sorter=sorter;
    $("#relatedtrackspageselection").on("change", $.proxy(function(){
      var relatedtrackspageslc=$("#relatedtrackspageselection"); 
      var view=this;
      view.sorter.size(relatedtrackspageslc.val());
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    }, view));
    $("#relatedTrackTableHeaderCell2").on("click", $.proxy(function(){
      view=this; 
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    }, view));
    $("#relatedTrackTableHeaderCell1").on("click",$.proxy(function(){
      view=this; 
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    },view));
    $("#relatedTrackTableHeaderCell0").on("click", $.proxy(function(){
      view=this; 
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    }, view));
    $("#tableFirstPage").on("click", $.proxy(function(){
      view=this; 
      view.sorter.move(-1,true);
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    },view));
    $("#tablePrevPage").on("click", $.proxy(function(){
      view=this; 
      view.sorter.move(-1);
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    }, view));
    $("#tableNextPage").on("click", $.proxy(function(){
      view=this; 
      view.sorter.move(1);
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    }, view));
    $("#tableLastPage").on("click", $.proxy(function(){
      view=this; 
      view.sorter.move(1,true);
      view.addRelatedTracksTableTdHandler('related_track_table', results);
    }, view));
    this.addRelatedTracksTableTdHandler('related_track_table', results);

    var link=$("#addallrelatedmodules");
    if(link.length){
      this.addAllRelatedModulesHandler('addallrelatedmodules', results);    
		}
  }
  // close the computing related track dialog
	$("#computingRelatedTracksDialog").dialog("close");
};

TrackView.prototype.showSigModules=function(o, myData){
  var view=this;
	view.sigModulesShown=true;
	/*
  if(this.brwsr.linkedTracksFormShown)
    this.brwsr.toggleLinkedFormDiv('linkedtracksformdiv', this.brwsr.linked_plusminus);
	*/
  if(!this.brwsr.sigModulesFormShown)
    this.brwsr.toggleSigModulesFormDiv('sigmodulesformdiv',this.brwsr.sigmodules_plusminus);
  // display form div and hide default message
	if($("#sigmodulesformdiv").css("display")=="none"){
    $("#sigmodulesformdiv").css("display","block");
	}
	$("#defaultsigmodulesmsg").css("display","none");
  // create table
  var results=o;
  this.sigModuleNumber=results["num_of_sig_modules"]
  var mytable=$("#sigmodule_table_0");
  if(mytable.length){
    mytable.remove();;
    $("#sigmodulestablewrapper").remove();
  }
  var sigmodules_table_0=document.createElement('table');
  sigmodules_table_0.setAttribute('id', 'sigmodules_table_0');
  sigmodules_table_0.setAttribute('width','100%');
  //create table body
  var tbo=document.createElement('tbody');
  var row=new Array();
  var cell=new Array();


  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
	myspan.innerHTML='Significant Network Modules</span>';
  // myspan.appendChild(document.createTextNode('Target Category'));
  myspan.style.fontStyle='italic';
  myspan.style.fontWeight='bold';
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.innerHTML="(Total: <span style='color:#a67c52'><b>"+results['num_of_sig_modules']+"</b></span>)";
  myspan.innerHTML+="&nbsp;&nbsp;<a style=\"color:#ff0000;text-decoration:underline;\" id=\"addallsigmodules\"><b>Add all significant modules</b></a>";
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  sigmodules_table_0.appendChild(tbo);
	this.brwsr.sigModulesFormDiv.empty();
  this.brwsr.sigModulesFormDiv.append($(sigmodules_table_0));

if(results['num_of_sig_modules']>0){
    var tablewrapperdiv=document.createElement('div');
    tablewrapperdiv.setAttribute('id', 'sigmodulestablewrapper');

    var sigmodules_table=document.createElement('table');
    sigmodules_table.setAttribute('id', 'sigmodules_table');
    sigmodules_table.setAttribute('width','100%');
    sigmodules_table.setAttribute('cellpadding','0');
    sigmodules_table.setAttribute('cellspacing','0');
    sigmodules_table.setAttribute('border','0');
    sigmodules_table.setAttribute('class','tinytable');

    var thd=document.createElement('thead');
    header=document.createElement('tr');
    cell[0]=document.createElement('th');
    cell[0].setAttribute('width','50%');
    cell[0].setAttribute('id','sigModulesTableHeaderCell0');
    var myh3=document.createElement('h3');
    myh3.innerHTML='Module Name';
    cell[0].appendChild(myh3);
    header.appendChild(cell[0]);

    cell[1]=document.createElement('th');
    cell[1].setAttribute('width','30%');
    cell[1].setAttribute('id','sigModulesTableHeaderCell1');
    myh3=document.createElement('h3');
		if(results['fdr_adjust']=="yes"){
			myh3.innerHTML='p_adjust';
		}
		else{
			myh3.innerHTML='pval';
		}
    cell[1].appendChild(myh3);
    var addCellMouseOverHandler=function(cellid){
      return function(evt){
				if(results['fdr_adjust']=="yes"){
					balloon17394.showTooltip(evt, 'FDR adjusted p-value');
				}
      };
    };
    cell[1].onmouseover=addCellMouseOverHandler('sigModulesTableHeaderCell1');
    header.appendChild(cell[1]);

    cell[2]=document.createElement('th');
    cell[2].setAttribute('width','20%');
    cell[2].setAttribute('id','sigModulesTableHeaderCell2');
    myh3=document.createElement('h3');
    myh3.innerHTML='stats';
    cell[2].appendChild(myh3);
    var addCellMouseOverHandler2=function(cellid){
      return function(evt){
        balloon17394.showTooltip(evt, 'For survival analysis, this is log(hazard). For other tests, this is the test statistic.');
      };
    };
    cell[2].onmouseover=addCellMouseOverHandler2('sigModulesTableHeaderCell2');
    header.appendChild(cell[2]);

    thd.appendChild(header);
    sigmodules_table.appendChild(thd);
    tbo=document.createElement('tbody');
    var row=new Array();
    for(i=0; i<results['num_of_sig_modules']; i++){
      row[i]=document.createElement('tr');
      cell[0]=document.createElement('td');
      cell[0].setAttribute('width','50%');
      var label=results['names'][i];
			/*
			var found=Util.searchArrayByKey(view.brwsr.moduleData,label,"name");
			var displayName;
			displayName=view.brwsr.currentNetwork+"_Level"+view.brwsr.moduleData[found]["level"]+"_Module"+view.brwsr.moduleData[found]["name"]+"_"+view.brwsr.moduleData[found]["best"];
			*/
      cont=document.createTextNode(label);
      cell[0].appendChild(cont);
      cell[0].setAttribute('label',label);
      row[i].appendChild(cell[0]);

      cell[1]=document.createElement('td');
      cell[1].setAttribute('width','30%');
			if(results['fdr_adjust']=="yes"){
				var tmpfloat=parseFloat(results['adj_pvals'][i]);
				var tmpnewfloat=tmpfloat.toPrecision(3);
				cont=document.createTextNode(tmpnewfloat.toString());
			}
			else{
			  // limit the digits to display
				var tmpfloat=parseFloat(results['pvals'][i]);
				var tmpnewfloat=tmpfloat.toPrecision(3);
				cont=document.createTextNode(tmpnewfloat.toString());
			}
      cell[1].appendChild(cont);
      row[i].appendChild(cell[1]);

      cell[2]=document.createElement('td');
      cell[2].setAttribute('width','20%');
			var tmpfloat=parseFloat(results['metric'][i]);
			var tmpnewfloat=tmpfloat.toPrecision(3);
      cont=document.createTextNode(tmpnewfloat);
      cell[2].appendChild(cont);
      row[i].appendChild(cell[2]);

      tbo.appendChild(row[i]);
    }
    sigmodules_table.appendChild(tbo);
    tablewrapperdiv.appendChild(sigmodules_table);
    //table footer
    var tablefooterdiv=document.createElement("div");
    tablefooterdiv.setAttribute('id','sigmodulestablefooter');
    var tablenavdiv=document.createElement("div");
    tablenavdiv.setAttribute('id', 'sigmodulestablenav');
    tablenavdiv.innerHTML='<img id="sigmodulestableFirstPage" src="js/TinyTable/images/first.gif" width="14" height="14" alt="First Page"/><img id="sigmodulestablePrevPage" src="js/TinyTable/images/previous.gif" width="14" height="14" alt="Previous Page"/> <img id="sigmodulestableNextPage" src="js/TinyTable/images/next.gif" width="14" height="14" alt="Next Page" /> <img id="sigmodulestableLastPage" src="js/TinyTable/images/last.gif" width="14" height="14" alt="Last Page" />';
    tablefooterdiv.appendChild(tablenavdiv);
    var tablelocdiv=document.createElement("div");
    tablelocdiv.setAttribute('id', 'sigmodulestablelocation');
    tablelocdiv.innerHTML='<div> <select id="sigmodulespageselection"> <option value="5">5</option> <option value="10" selected="selected">10</option> <option value="20">20</option> <option value="50">50</option> <option value="100">100</option> </select> <span>Entries Per Page <i>Page</i></span> <span id="sigmodulescurrentpage"></span> <i>of</i> <span id="sigmodulespagelimit"></span></div>';
    tablefooterdiv.appendChild(tablelocdiv);
    tablewrapperdiv.appendChild(tablefooterdiv); 
    this.brwsr.sigModulesFormDiv.append($(tablewrapperdiv));
    sorter2 = new TINY.table.sorter("sorter2");
    sorter2.head = "head";
    sorter2.asc = "asc";
    sorter2.desc = "desc"; 
    sorter2.even = "evenrow";
    sorter2.odd = "oddrow";
    sorter2.evensel = "evenselected";
    sorter2.oddsel = "oddselected";
    sorter2.paginate = true;
    sorter2.currentid = "sigmodulescurrentpage";
    sorter2.limitid = "sigmodulespagelimit";
    sorter2.init("sigmodules_table",1);
    this.sigmodulessorter=sorter2;
    $("#sigmodulestableFirstPage").on("click", $.proxy(function(){
      view=this; 
      view.sigmodulessorter.move(-1,true);
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    },view));
    $("#sigmodulestablePrevPage").on("click", $.proxy(function(){
      view=this; 
      view.sigmodulessorter.move(-1);
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    }, view));
    $("#sigmodulestableNextPage").on("click", $.proxy(function(){
      view=this; 
      view.sigmodulessorter.move(1);
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    }, view));
    $("#sigmodulestableLastPage").on("click", $.proxy(function(){
      view=this; 
      view.sigmodulessorter.move(1,true);
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    }, view));
    $("#sigmodulespageselection").on("change", $.proxy(function(){
      var sigmodulespageslc=$("#sigmodulespageselection"); 
      var view=this;
      view.sigmodulessorter.size(sigmodulespageslc.val());
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    }, view));
    var link=$("#addallsigmodules");
    if(link.length){
      this.addAllSigModulesHandler('addallsigmodules', results);    
		}
    $("#sigModulesTableHeaderCell2").on("click",$.proxy(function(){
      view=this; 
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    },view));
    $("#sigModulesTableHeaderCell1").on("click",$.proxy(function(){
      view=this; 
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    },view));
    $("#sigModulesTableHeaderCell0").on("click", $.proxy(function(){
      view=this; 
      view.addSigModulesTableTdHandler('sigmodules_table', results, myData);
    }, view));
  }
   this.addSigModulesTableTdHandler('sigmodules_table', results, myData);


  var sigmodules_table_1=document.createElement('table');
  sigmodules_table_1.setAttribute('id', 'sigmodules_table_1');
  sigmodules_table_1.setAttribute('width','100%');
  //create table body
  var tbo=document.createElement('tbody');
  var row=new Array();
  var cell=new Array();

  var header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.appendChild(document.createTextNode('Original Track'));
  myspan.style.fontStyle='italic';
  myspan.style.fontWeight='bold';
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.appendChild(document.createTextNode(this.currentSigModuleTrack));
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);
  $(header).mouseover(function(event){
		balloon17394.showTooltip(event, view.currentSigModuleTrack);
	});

  var header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
	myspan.innerHTML='<br>Feature Name';
  myspan.style.fontStyle='italic';
  myspan.style.fontWeight='bold';
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.appendChild(document.createTextNode(myData["featureName"]));
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);
  $(header).mouseover(function(event){
		balloon17394.showTooltip(event, myData["featureName"]);
	});

  var header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
	myspan.innerHTML='<br>Test Name/Method';
  myspan.style.fontStyle='italic';
  myspan.style.fontWeight='bold';
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
	var myMethod=myData["method"];
	if(!myMethod){
	  myMethod="NA";
	}
  myspan.appendChild(document.createTextNode(myData["kind"]+"/"+myMethod));
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  var header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
	myspan.innerHTML='<br>Pval adjusted? / Cutoff';
  myspan.style.fontStyle='italic';
  myspan.style.fontWeight='bold';
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);

  header=document.createElement('tr');
  cell[0]=document.createElement('td');
  myspan=document.createElement('span');
  myspan.appendChild(document.createTextNode(myData["fdradjust"]+"/"+myData["cutoff"]));
  cell[0].appendChild(myspan);
  header.appendChild(cell[0]);
  tbo.appendChild(header);
  sigmodules_table_1.appendChild(tbo);
  this.brwsr.sigModulesFormDiv.append($(sigmodules_table_1));

  // close the computing dialog
	$("#computingNGStatsDialog").dialog("close");
};

TrackView.prototype.addAllRelatedModulesHandler=function(id, results){
  var brwsr=this.brwsr;
  // if results length =0; disable the link
  var link=$("#"+Util.jqSelector(id));
  if(results.length==0){
    link.css({"color":"#808080", "text-decoration":"none"});
  }
  var createClickHandler=function(id){
    return function(event){
		/*
      var new_gene_string=""; // this is the combined gene strings from all the modules
      var length=results[0]['gene_string'].split('_').length;
      var mycombinedarray=Array();
      while(length--)
        mycombinedarray.push(0);
      for(var i=0; i<results.length; i++){
        var myarray=results[i]['gene_string'].split('_');
        for(var j=0; j<myarray.length; j++){
          mycombinedarray[j]+=parseInt(myarray[j]);
        }
      }
      //    console.log(mycombinedarray);
      for(var j=0; j<mycombinedarray.length; j++){
        if(mycombinedarray[j]>=1)
          new_gene_string=new_gene_string+brwsr.view.ruler[j]+"|";
      }
			*/
      // all related tracks are added as one single cct
      // pass all the results, not just gene string for cct
			// for consistency, the passed data is still call gene_string.
		  var d={};	
			d["related"]=results;
			//console.log(d);
      brwsr.gene_string=d;
      brwsr.currentUserTrackType="cct";
			brwsr.currentUserTrackAllSigModules=false;
      brwsr.userEnterTrackNameDialog("relatedtrackstablewrapper");
  };
};
link.on("click",createClickHandler(id));
};

TrackView.prototype.addAllSigModulesHandler=function(id, results){
  var brwsr=this.brwsr;
  // if results length =0; disable the link
  var link=$("#"+Util.jqSelector(id));
  var createClickHandler=function(id){
    return function(event){
			// reorganize the results;
      var newresults=new Array(results["num_of_sig_modules"]);
			var i;
			for(i=0; i<results["num_of_sig_modules"]; i++){
			   newresults[i]={"module_name":"","fdr":""};
			}
			var found;
			for(i=0; i<results["num_of_sig_modules"]; i++){
        newresults[i]["module_name"]=results["names"][i];
        newresults[i]["fdr"]=results["adj_pvals"][i];
        newresults[i]["pval"]=results["pvals"][i];
        newresults[i]["metric"]=results["metric"][i];
   		  found=Util.searchArrayByKey(brwsr.moduleData, newresults[i]["module_name"],"name");
        newresults[i]["start"]=brwsr.moduleData[found]["start"]; 
				newresults[i]["end"]=brwsr.moduleData[found]["end"]; 
				newresults[i]["level"]=brwsr.moduleData[found]["level"]; 
			}
      brwsr.gene_string=newresults;   // the "gene_string" name is not accurate 
      brwsr.currentUserTrackType="cct"; 
			brwsr.currentUserTrackAllSigModules=true;
      brwsr.userEnterTrackNameDialog("sigmodulestablewrapper");
  };
};
link.on("click",createClickHandler(id));
};

TrackView.prototype.addRelatedTracksTableTdHandler=function(tableid, results){
  var brwsr=this.brwsr;
  var table=document.getElementById(tableid);
  var rows=table.getElementsByTagName("tr");
  var view=this;
  for(i=1; i<rows.length; i++){
    var currentRow=table.rows[i];
    var createClickHandler=function(row){
      return function(event){
        var cell=row.getElementsByTagName("td")[0];
        var label=cell.getAttribute('label');
        for(var j=0; j<results.length; j++){
          if(results[j]['label']==label)
            break;
        }
        var gene_string=results[j]['gene_string'];
        var new_gene_string_array=gene_string.split('_');
        var new_gene_string="";
        for(j=0;j<new_gene_string_array.length;j++){
          if(new_gene_string_array[j]==1)
             new_gene_string=new_gene_string+brwsr.view.ruler[j]+"|";
        }
        brwsr.gene_string=new_gene_string; 
        //brwsr.currentUserTrackType=brwsr.view.relatedTrackSourceType;
        // for now, all related tracks are added as sbt
        brwsr.currentUserTrackType="sbt";
        brwsr.userEnterTrackNameDialog("relatedtrackstablewrapper");
    };
  };
  var createMouseOverHandler=function(row){
    return function(evt){
      var cell=row.getElementsByTagName("td")[0];
      var key=$(cell).html();
      balloon17394.showTooltip(evt,"<b>Track Name:</b> "+key+"<br/>Click to add track");
  };

  };
  currentRow.onclick=createClickHandler(currentRow);
  currentRow.onmouseover=createMouseOverHandler(currentRow);
  }
};

TrackView.prototype.addSigModulesTableTdHandler=function(tableid, results, testInfo){
  var brwsr=this.brwsr;
  var table=document.getElementById(tableid);
  var rows=table.getElementsByTagName("tr");
  var view=this;
	//console.log(results);
	for(i=1; i<rows.length; i++){
		var currentRow=table.rows[i];
		var createClickHandler=function(row){
			return function(event){
				var cell=row.getElementsByTagName("td")[0];
				var label=cell.getAttribute('label');
				/*
				for(var j=0; j<results.length; j++){
				if(results[j]['label']==label)
				break;
				}
				var gene_string=results[j]['gene_string'];
				var new_gene_string_array=gene_string.split('_');
				var new_gene_string="";
				for(j=0;j<new_gene_string_array.length;j++){
				if(new_gene_string_array[j]==1)
				new_gene_string=new_gene_string+brwsr.view.ruler[j]+"|";
				}
				brwsr.gene_string=new_gene_string; 
				//brwsr.currentUserTrackType=brwsr.view.relatedTrackSourceType;
				// for now, all related tracks are added as sbt
				brwsr.currentUserTrackType="sbt";
				brwsr.userEnterTrackNameDialog("relatedtrackstablewrapper");
				*/
//        view.statsTest("_gene",currentNetwork, networkType, track.name, trackDB, sample_db, selected_feature, test_kind, null, null, test_output, test_cutoff, test_sur_val);
        var currentNetwork=testInfo.currentNetwork;
				var networkType=testInfo.networkType;
				var trackName=testInfo.trackName;
				var trackDB=testInfo.trackDB;
				var sample_db=testInfo.sampleDB;
				var selected_feature=testInfo.featureName;
				var test_kind=testInfo.kind;
				var test_method=testInfo.method;
				var test_direction=testInfo.direction;
				var test_cutoff=null;  // not applicable here
				var test_sur_val=testInfo.survivalPval;
				var test_output;
				if(test_sur_val){
				 test_output=[test_sur_val+"_minuslogp"];  // only need this output for now
				}
				else{
				 test_output=["-logp"];  // only need this output for now
				}
        view.statsTest("_gene",currentNetwork, networkType, trackName, trackDB, sample_db, selected_feature, test_kind, test_method, test_direction, test_output, "no", test_cutoff, test_sur_val, label);
//			console.log(testInfo);
			};
		};
		var createMouseOverHandler=function(row, b){
			return function(evt){
				var brwsr=b;
				var cell=row.getElementsByTagName("td")[0];
				var key=$(cell).html();
				var found=Util.searchArrayByKey(brwsr.moduleData,key,"name");
				var displayName;
				displayName=brwsr.currentNetwork+"_Level"+brwsr.moduleData[found]["level"]+"_Module"+brwsr.moduleData[found]["name"]+"_"+brwsr.moduleData[found]["best"];
				balloon17394.showTooltip(evt,"<b>Module Name:</b> "+displayName+"<br><b>Start:</b>"+brwsr.moduleData[found]["start"]+"<br><b>End:</b>"+brwsr.moduleData[found]["end"]+"<br>Click to add as a track");
			};
		};
		currentRow.onclick=createClickHandler(currentRow);
		currentRow.onmouseover=createMouseOverHandler(currentRow, brwsr);
	}
};

TrackView.prototype.getRelatedTracks=function(targetid, category, fdrCutoff){
	var pattern1=/^icon_related_label_/;
	var pattern2=/^icon_network_analysis_label_/;
	var view=this;
	var label;
	if(targetid.match(pattern1)){
		label=targetid.slice(19);
	}
	else if(targetid.match(pattern2)){
		label=targetid.slice(28);
	}
	var result=queryTrackDataByLabel(this.brwsr.trackData, label);
	for(var i=0; i<result.length; i++){
		if(result[i]["network"]==this.brwsr.currentNetwork)
			break;
	 }
		var type=result[i]["datatype"]; // sbt or sct?
		var key=result[i]["key"];
		var intUrl=result[i]["int_url"];
		var trackUrl=result[i]["url"];
		this.relatedTrackSource=key;
		this.relatedTrackSourceType=type;
		var networkType=view.brwsr.currentNetworkType();  // system or user?
		var myCurrentNetwork;
		var user_module_category=0;
		if(networkType=="system")
			myCurrentNetwork=view.brwsr.currentNetwork;
		else{
			myCurrentNetwork=ng_logo.allNetworks[view.brwsr.currentNetwork]["directory"];
			if(category==view.brwsr.currentNetwork+"_module"){
				category=myCurrentNetwork;
				user_module_category=1;
			}
		}
		var arg={
			"network": myCurrentNetwork,
			"trackLabel": label,
			"trackType": type,
			"networkType":networkType,
			"category": category,
			"trackIntFile":intUrl,
			"trackUrl":trackUrl,
			"fdrCutoff":fdrCutoff,
			"userModuleCat":user_module_category
		};
		$.ajax({
			type:"POST",
			url:view.brwsr.relatedTracksUrl,
			dataType:"json",
			data: JSON.stringify(arg),
			async: true,
			success: function(o) {view.currentRelatedTrack=label; view.showRelatedTracks(o);}
		});
		if($("#computingRelatedTracksDialog").length==0){
			$("<div>").attr("id", "computingRelatedTracksDialog").appendTo($("body")).css({"display":"none","background-image":"url(images/loading-green.gif)","background-position":"center center","background-repeat":"no-repeat"});
		}
		view.computingRelatedTracksDialog=$("#computingRelatedTracksDialog").dialog({
			open: function(event, ui) { $(".noclose .ui-dialog-titlebar-close").hide(); },  // disable close button
			dialogClass: "noclose",
			title: "Calculating ...",
			height: 100,
			width: 200,
			modal: true,
			draggable: false,
			closeOnEscape: false
		});
};

// event handler for network analysis
TrackView.prototype.networkAnalysis=function(targetid, in_data){
  var brwsr=this.brwsr;
  var pattern=/^icon_network_analysis_label_/;
  var analysis_type=in_data['analysis_type'];
	var fdr=in_data['fdr'];
	var new_track_name=in_data['new_track_name'];
  var view=this;
  if(targetid.match(pattern)){
    var label=targetid.slice(28);
		var result=queryTrackDataByLabel(this.brwsr.trackData, label);
    for(var i=0; i<result.length; i++){
      if(result[i]["network"]==this.brwsr.currentNetwork)
        break;
    }
    var type=result[i]["datatype"]; // sbt or sct?
    var key=result[i]["key"];
    var label=result[i]["label"];
    var intUrl=result[i]["int_url"];
    var trackUrl=result[i]["url"];
      
		var baseurl= (brwsr.dataRoot?brwsr.dataRoot:"");
	  result=queryTrackDataByNetwork(brwsr.trackData, brwsr.currentNetwork);
	  var rel_url=result[0]['url'];
	  var ruler_url=baseurl+rel_url;

    var networkType=view.brwsr.currentNetworkType();  // system or user?
    var myCurrentNetwork;
    if(networkType=="system"){
      myCurrentNetwork=view.brwsr.currentNetwork;
		}
    else{
      myCurrentNetwork=ng_logo.allNetworks[view.brwsr.currentNetwork]["directory"];
    }
    // read original gene names from the int_url file
    var gene_string;
    var track_genes;
		var input_data={};
		// data input to the network analysis  server side script
    input_data["networkType"]=in_data["networkType"];
		if(networkType=="system"){
			input_data["currentNetwork"]=in_data["currentNetwork"];
		}
		else{
			input_data["currentNetwork"]=ng_logo.allNetworks[in_data["currentNetwork"]]["directory"];
		}
		input_data['analysisType']=analysis_type;
	  input_data['newTrackName']=new_track_name;	
		input_data['trackIntUrl']=intUrl;
		input_data['rulerUrl']=ruler_url;
		input_data['networkDataUrl']=brwsr.networkInfo.network;
		input_data['fdrCutoff']=fdr;
		// pass additional data if necessary
		// find out all neighbors of genes in the current track
			$.ajax({
				type:"POST",
				url:"network_analysis.php",
				dataType:"json", // data type from server
				async:true,
				data:input_data,
				success: function(o) {
					var results=o;
					if(results.message=="OK"){
						// this is the urls for the actual track data
						var tUrls=results.url;
						var tIntUrls=results.int_url;
						var tType=results.type;
						var tNames=results.name;
						// add all tracks
						for(var l=0; l<tUrls.length; l++){
							var userTrack={};
							userTrack.url=tUrls[l];
							userTrack.int_url=tIntUrls[l];
							userTrack.network=brwsr.currentNetwork;
							if(results.type=="sbt" || results.type=="sct"){
								userTrack.type='SimpleTrack';
								// can set color if necessary;
								if(results.color){
								  userTrack.trackColor=results.color.split("_");
								}
								else{
								  userTrack.trackColor=null;
								}
							}
							userTrack.datatype=tType;
							userTrack.key=tNames[l];
							userTrack.label=tNames[l].replace(/ /g,"");
							userTrack.name=userTrack.label;
							userTrack.link='NULL';
							userTrack.catergory='User Track';
							userTrack.isUserTrack=true;
							userTrack.isUploadTrack=false;
							brwsr.trackData.push(userTrack);
							// save userTrack into localStorage
							if(typeof(localStorage)!='undefined') {
								// if already exists in localStorage, update it ( insert the new url corresponding to the network )
								var objString=localStorage.getItem(userTrack.label);
								if(objString){
									var tmpObj=$.parseJSON(objString);
									tmpObj["url"][brwsr.currentNetwork]=userTrack.url;
									tmpObj["trackColor"][brwsr.currentNetwork]=userTrack.trackColor;
									localStorage.setItem(userTrack.label, JSON.stringify(tmpObj));
								}
								else{
									var localStorageTrackObj={};
									$.extend(localStorageTrackObj, userTrack); // make a copy, not a reference
									var urlObj={};
									urlObj[brwsr.currentNetwork]=userTrack.url;
									localStorageTrackObj.url=urlObj;
									var trackColorObj={};
									trackColorObj[brwsr.currentNetwork]=userTrack.trackColor;
									localStorageTrackObj.trackColor=trackColorObj;
									delete localStorageTrackObj.network;
									localStorage.setItem(userTrack.label, JSON.stringify(localStorageTrackObj));
								}
							}
							var evt={};
							evt.target={};
							evt.target.id=userTrack.label;
							brwsr.stbox.addTrack(evt);
						}
					  $("#computingNetworkAnalysisDialog").dialog("close");
					}
					else if(results.message=="NULL"){
					  $("#computingNetworkAnalysisDialog").dialog("close");
						$("#computingNetworkAnalysisEmptyTrackDialog").dialog({
							height: 100,
							width: 200,
							modal: true,
							draggable: false,
							closeOnEscape: true
						});
          }
				},
				error: function() { console.log("error performing statistical analysis"); }
			});
		if($("#computingNetworkAnalysisDialog").length==0){
  		 $("<div>").attr("id", "computingNetworkAnalysisDialog").appendTo($("body")).css({"display":"none","background-image":"url(images/loading-green.gif)","background-position":"center center","background-repeat":"no-repeat"});
  		 $("<div>").attr("id", "computingNetworkAnalysisEmptyTrackDialog").appendTo($("body")).css({"display":"none","background-position":"center center"}).html("<p>No significant genes.</p>");
		} 
		view.computingNetworkAnalysisDialog=$("#computingNetworkAnalysisDialog").dialog({
			open: function() { $(".noclose .ui-dialog-titlebar-close").hide(); },  // disable close button
      dialogClass: "noclose", 
			title: "Calculating ...",
			height: 100,
			width: 200,
			modal: true,
			draggable: false,
			closeOnEscape: false
		});
	}
};

TrackView.prototype.removeTrack=function(id){
	// if the tooltip is visible, hide it
	box17395.nukeTooltip();
	/*
	var event=window.event || e;
	var mytarget=event.target || event.srcElement;
	var targetid=mytarget.id;           
	// icon_delete_label_XXXX
	var pattern=/^icon_delete_/;
	*/
	var targetid=id;
	var pattern=/^icon_delete_/;
	if(targetid.match(pattern)){
		//console.log(event.target.id);
		var label=targetid.slice(18);
		//console.log(label);
		$("#dropdown_label_"+Util.jqSelector(label)).remove();
		$("#track_"+Util.jqSelector(label)).remove();
		// also remove from cookie
		this.brwsr.removeTrackFromLocalStorage(this.brwsr.container.id, label, this.brwsr.currentNetwork);
		// remove from view.trackLables 
		for(var idx=0; idx<this.trackLabels.length; idx++) {
			if(this.trackLabels[idx]['id']==('label_'+label))
				break;
		}
		this.trackLabels.splice(idx,1);
		var result=queryTrackDataByLabel(this.brwsr.trackData, label);
		for(var i=0; i<result.length; i++){
			if(result[i]["network"]==this.brwsr.currentNetwork)
				break;
		}
		var toBeRemoved=result[i];
		//if it is a user track, remove from brwsr.userTracks, brwsr.trackData
		//console.log(this.brwsr.trackData.length);
		if(toBeRemoved.isUserTrack){
			for(var k=this.brwsr.trackData.length-1; k>=0; k--){
				if(this.brwsr.trackData[k].label==toBeRemoved.label){
					// console.log("find old user track with same label");
					break;
				}
			}    
			// console.log("delete use track");
			this.brwsr.trackData.splice(k,1);
			delete this.brwsr.userTracks[toBeRemoved.label];
			// console.log(this.brwsr.trackData.length);
			// also remove from localStorage
			if(typeof(localStorage)!='undefined') {
				localStorage.removeItem(label);
			}
		}
		// remove from locaStorage if it is ann_XXX_module track on a user network
		if(toBeRemoved.category && toBeRemoved.category.match(/ann_(.*)_module/)){
			if(typeof(localStorage)!='undefined') {
				if(localStorage.getItem(label))
					localStorage.removeItem(label);
			}
		}
		if(toBeRemoved.datatype=='cbt'||toBeRemoved.datatype=='cct'){
			this.brwsr.removeTrackFromLinkedTracksForm(toBeRemoved.label, toBeRemoved.key);
			this.brwsr.removeTrackFromSigModuleDiv(toBeRemoved.label, toBeRemoved.key);
		}
		else if(toBeRemoved.datatype=='sbt'){
			this.brwsr.removeTrackFromRelatedTracks(toBeRemoved.label, toBeRemoved.key);
			this.brwsr.removeTrackFromVennTracksForm(toBeRemoved.label, toBeRemoved.key);
			this.brwsr.removeTrackFromCoVisForm(toBeRemoved.label, toBeRemoved.key);
		}
		else if(toBeRemoved.datatype=='sct'){
			this.brwsr.removeTrackFromRelatedTracks(toBeRemoved.label, toBeRemoved.key);
			this.brwsr.removeTrackFromCoVisForm(toBeRemoved.label, toBeRemoved.key);
		}
		var key=toBeRemoved["key"];
		if(debug){
			console.log("label="+label+",key="+key);
		}
	this.updateTrackList();
	var curTrackListKeyString;
	if(typeof(localStorage)!="undefined"){
		curTrackListKeyString=localStorage.getItem(this.brwsr.container.id+"-track-keys");
	}
	if(curTrackListKeyString){
		var curKeys=$.parseJSON(curTrackListKeyString);  // will be an array
		if(curKeys.length>0){
			$("#menu_track_clear").removeClass("menu_disabled");
			$("#menu_track_clear").click(
				function() {
					box17395.nukeTooltip();
					brwsr.clearAllTracksDialog("open");
				});
				$("#locategenebox").prop('disabled', false);
				$("#locategenebox").val("");
				this.brwsr.hideLeftPaneHint();
				$(this.brwsr.hideTrackTitleIcon).css("display", "block"); 
		}
		else{ 
			$("#menu_track_clear").addClass("menu_disabled");
			$("#menu_track_clear").off();
			$("#locategenebox").prop('disabled', true);
			$("#locategenebox").val("Add track to enable...");
			this.brwsr.showLeftPaneHint();
			$(this.brwsr.hideTrackTitleIcon).css("display", "none"); 
		}
	}

    // if it is a composite track, also remove the sample heatmap div
    if(toBeRemoved.type=="CompositeTrack"){
      var sample_heatmap_container="sample_heatmap_"+toBeRemoved.key+"_container";   
      // unbind all contexmenu list click event handler
      var contextmenu_id="sample_heat_map_"+toBeRemoved.key;
      var contextmenu_id_end="__contextmenu_list_href";
      $('ul').filter(function() { return this.id.match(contextmenu_id+".*"+contextmenu_id_end)}).unbind('click');;
      // if it is visible, update the visible count
      var sample_heatmap="#sample_heatmap_"+Util.jqSelector(toBeRemoved.key);   
      if($(sample_heatmap).css("visibility")=="visible"){
         this.brwsr.visibleSampleAnnotationCount--;  
         if(this.brwsr.visibleSampleAnnotationCount==0){
           this.brwsr.showLeftPane(); 
         }
      }
      $("#"+Util.jqSelector(sample_heatmap_container)).remove(); 
      $("#sample_feature_select_div_"+Util.jqSelector(toBeRemoved.key)).remove();
			$("#stats_select_div_"+Util.jqSelector(toBeRemoved.key)).remove();
			if(this.currentSigModuleTrack==toBeRemoved.key){
   			$("#sigmodulesformdiv").empty();
   			$("#sigmodulesformdiv").css("display","none");
				$("#defaultsigmodulesmsg").css("display","block");
			}
    }
    // update the visible sample heatmap 
    this.updateVisibleSampleHeatmap();

    //delete all the handlers
    delete this.cytoScapeMouseOverHandlers['icon_graph_label_'+toBeRemoved.label];
    delete this.cytoScapeClickHandlers['icon_graph_label_'+toBeRemoved.label];  
    delete this.cytoScapeMouseOverHandlers['icon_graph_big_label_'+toBeRemoved.label];
    delete this.cytoScapeClickHandlers['icon_graph_big_label_'+toBeRemoved.label];  
    delete this.trackInfoMouseOverHandlers['icon_info_label_'+toBeRemoved.label];  
    delete this.trackInfoClickHandlers['icon_info_label_'+toBeRemoved.label];  
    delete this.trackDeleteMouseOverHandlers['icon_delete_label_'+toBeRemoved.label];  
    delete this.trackDeleteClickHandlers['icon_delete_label_'+toBeRemoved.label];  
    delete this.trackExportMouseOverHandlers['icon_export_label_'+toBeRemoved.label];  
    delete this.trackExportClickHandlers['icon_export_label_'+toBeRemoved.label];  
    delete this.trackCollapseMouseOverHandlers['icon_collapse_label_'+toBeRemoved.label];  
    delete this.trackCollapseClickHandlers['icon_collapse_label_'+toBeRemoved.label];  
    delete this.getRelatedTracksClickHandlers['icon_related_label_'+toBeRemoved.label];
    delete this.getRelatedTracksMouseOverHandlers['icon_related_label_'+toBeRemoved.label];
    delete this.networkAnalysisClickHandlers['icon_network_analysis_label_'+toBeRemoved.label];
    delete this.networkAnalysisMouseOverHandlers['icon_network_analysis_label_'+toBeRemoved.label];
    delete this.dtClickHandlers['icon_transform_label_'+toBeRemoved.label];
    delete this.dtMouseOverHandlers['icon_transform_label_'+toBeRemoved.label];
    delete this.SCT_FilterMouseOverHandlers['icon_filter_label_'+toBeRemoved.label];
    delete this.SCT_FilterClickHandlers['icon_filter_label_'+toBeRemoved.label];
    delete this.compsiteSampleHeatMouseOverHandlers['icon_sample_label_'+toBeRemoved.label];
    delete this.compsiteSampleHeatClickHandlers['icon_sample_label_'+toBeRemoved.label];
    delete this.statsMouseOverHandlers['icon_stats_label_'+toBeRemoved.label];
    delete this.statsClickHandlers['icon_stats_label_'+toBeRemoved.label];

    if(event.stopPropagation)
      event.stopPropagation();
  }
};

TrackView.prototype.updateVisibleSampleHeatmap=function(){
   // TO BE IMPLEMENTED
   return;
};


TrackView.prototype.statsFeatureSelectChanged=function(track, sample_db, allfeatures){
	var view=this;
	var networkType=view.brwsr.currentNetworkType();
	var currentNetwork=view.brwsr.currentNetwork;
	//console.log(networkType);
	//console.log(currentNetwork);
	// the the selected feature's type: Binary? Category? Continuous?
  var selected_feature=$('#'+Util.jqSelector(track.name)+'_stats_feature_select').val();
  var analysis_levels=["_module","_gene"];
  var feature_type=allfeatures[selected_feature]['type'];
  var arg={};
	var mystatsGoButton=$("#statsGoButton");
	mystatsGoButton.addClass("disabledbutton");  // disabled first
	mystatsGoButton.off("click");
  arg.sampledb=sample_db;
  arg.feature=selected_feature;
	var stats_css={"background-color":"#e2e2e2","border":"1px solid #e2e2e2","border-radius":"5px","padding":"3px","margin-bottom":"5px"};
  $("#visibleBalloonElement #statsselectsurvival_pval_module_text").css("display","none");
  $("#visibleBalloonElement #statsselectsurvival_pval_module").css("display","none");
	if(feature_type=="BIN"){ // binary, t-test
		// get the values for this feature 
		$.ajax({
			url:"get_sample_feature_values.php",
			type:"POST",
      data:arg,
			dataType:"text",
			async:false,
			success: function(o) { 
				var n=o.split("####");
				var n_uniq=n.unique().sort(); 
				for(var k=0; k< analysis_levels.length; k++){
					var selected_level=analysis_levels[k];
					$("#visibleBalloonElement #statsselecttest"+selected_level).empty();
					$("#visibleBalloonElement #statsselectfdradjust"+selected_level).empty();
					$("#visibleBalloonElement #statsoutputtracks"+selected_level).empty();
					var stats_bin_direction=$("<div>").attr({"id":"stats_bin_direction"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselecttest"+selected_level));
					$(stats_bin_direction).append($("<input>").attr({"type":"radio","name":"stats_bin_direction_radio"+selected_level,"value":"0"}));
					$(stats_bin_direction).append($("<label>").html(n_uniq[0]+" vs. "+n_uniq[1]));
					$(stats_bin_direction).append($("<br>"));
					$(stats_bin_direction).append($("<input>").attr({"type":"radio","name":"stats_bin_direction_radio"+selected_level, "value":"1"}));
					$(stats_bin_direction).append($("<label>").html(n_uniq[1]+" vs. "+n_uniq[0]));
					var stats_bin_tests=$("<div>").attr({"id":"stats_bin_tests"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselecttest"+selected_level));
					$(stats_bin_tests).append($("<input>").attr({"type":"radio","name":"stats_bin_tests_radio"+selected_level,"value":"ttest"}));
					$(stats_bin_tests).append($("<label>").html("t-test"));
					$(stats_bin_tests).append($("<br>"));
					$(stats_bin_tests).append($("<input>").attr({"type":"radio","name":"stats_bin_tests_radio"+selected_level,"value":"wilcoxon"}));
					$(stats_bin_tests).append($("<label>").html("Wilcoxon rank-sum test"));
					if(selected_level=="_gene"){
						var stats_bin_output=$("<div>").attr({"id":"stats_bin_output"+selected_level}).css(stats_css).css("margin-bottom","20px").appendTo($("#visibleBalloonElement #statsoutputtracks"+selected_level));
						$(stats_bin_output).append($("<input>").attr({"type":"checkbox","name":"stats_bin_output_ckbox"+selected_level,"value":"-logp"}));
						$(stats_bin_output).append($("<label>").html("-log p-value"));
						$(stats_bin_output).append($("<br>"));
						$(stats_bin_output).append($("<input>").attr({"type":"checkbox","name":"stats_bin_output_ckbox"+selected_level,"value":"stat"}));
						$(stats_bin_output).append($("<label>").html("test statistic"));
					}
					var stats_select_fdradjust=$("<div>").attr({"id":"stats_select_fdr_adjust"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselectfdradjust"+selected_level));
					$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"yes"}));
					$(stats_select_fdradjust).append($("<label>").html("Yes"));
					$(stats_select_fdradjust).append($("<br>"));
					$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"no"}));
					$(stats_select_fdradjust).append($("<label>").html("No"));
					view.updateStatsGoButtonPos();
					var checkAllRequired_bin=function(){
						var current_selected_level=$('#stats_module_gene_level_select').val();
						if($('#visibleBalloonElement input:radio[name="stats_bin_direction_radio'+current_selected_level+'"]').is(':checked') && $('#visibleBalloonElement input:radio[name="stats_bin_tests_radio'+current_selected_level+'"]').is(':checked') && (($('#visibleBalloonElement #stats_bin_output'+current_selected_level).length==0) || $('#visibleBalloonElement input:checkbox[name="stats_bin_output_ckbox'+current_selected_level+'"]').is(':checked')) && ($('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]').is(':checked'))) {
							$("#statsGoButton").removeClass("disabledbutton");
							$("#statsGoButton").off("click");
							$("#statsGoButton").click(function(){
								//console.log("statsGoButton clicked");
								// perform the selected test
								var trackDB=track.trackUrl+".db";
								var test_direction=$('#visibleBalloonElement input:radio[name="stats_bin_direction_radio'+current_selected_level+'"]:checked').val(); 
								//console.log(test_direction);
								var test_kind=$('#visibleBalloonElement input:radio[name="stats_bin_tests_radio'+current_selected_level+'"]:checked').val();
								var test_fdr_adjust=$('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]:checked').val();
								var test_cutoff=$('#visibleBalloonElement #stats_select_cutoff_sel'+current_selected_level).val();
								var test_output=[];
								$('#visibleBalloonElement input:checkbox[name="stats_bin_output_ckbox'+current_selected_level+'"]:checked').each(function() {
									test_output.push($(this).val());
								});
								var new_track_files=view.statsTest(current_selected_level, currentNetwork, networkType, track.name, trackDB, sample_db, selected_feature, test_kind, null, test_direction, test_output, test_fdr_adjust, test_cutoff, null);
								box17395.nukeTooltip();
							});
						}
						else{
							$("#statsGoButton").addClass("disabledbutton");
							$("#statsGoButton").off("click");
						}
					};
					$("#stats_bin_direction"+selected_level).click(function() {checkAllRequired_bin();});
					$("#stats_bin_tests"+selected_level).click(function() {checkAllRequired_bin();});
				  $("#stats_select_fdr_adjust"+selected_level).click(function() {checkAllRequired_bin();});
					if(selected_level=="_gene"){
						$("#stats_bin_output"+selected_level).click(function() {checkAllRequired_bin();});
					}
				}
       },
			error: function() { 
         console.log("cannot get feature valueerror downloading file"); 
       }
		}); 
	}
	else if(feature_type=="CON"){  // correlation test
		for(var k=0; k< analysis_levels.length; k++){
			var selected_level=analysis_levels[k];
			$("#visibleBalloonElement #statsselecttest"+selected_level).empty();
			$("#visibleBalloonElement #statsselectfdradjust"+selected_level).empty();
			$("#visibleBalloonElement #statsoutputtracks"+selected_level).empty();
			var stats_con_tests=$("<div>").attr({"id":"stats_con_tests"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselecttest"+selected_level));
			$(stats_con_tests).append($("<input>").attr({"type":"radio","name":"stats_con_tests_radio"+selected_level,"value":"cor"}));
			$(stats_con_tests).append($("<label>").html("correlation test"));
			$("<div>").html("Select a method:").css({"margin":"10px 0 10px 0"}).appendTo($("#visibleBalloonElement #statsselecttest"+selected_level));
			var stats_con_method=$("<div>").attr({"id":"stats_con_method"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselecttest"+selected_level));
			$(stats_con_method).append($("<input>").attr({"type":"radio","name":"stats_con_method_radio"+selected_level,"value":"pearson"}));
			$(stats_con_method).append($("<label>").html("pearson"));
			/*
			$(stats_con_method).append($("<br>"));
			$(stats_con_method).append($("<input>").attr({"type":"radio","name":"stats_con_method_radio","value":"kendall"}));
			$(stats_con_method).append($("<label>").html("kendall"));
			*/
			$(stats_con_method).append($("<br>"));
			$(stats_con_method).append($("<input>").attr({"type":"radio","name":"stats_con_method_radio"+selected_level,"value":"spearman"}));
			$(stats_con_method).append($("<label>").html("spearman"));
			if(selected_level=="_gene"){
				var stats_con_output=$("<div>").attr({"id":"stats_con_output"+selected_level}).css(stats_css).css("margin-bottom","20px").appendTo($("#visibleBalloonElement #statsoutputtracks"+selected_level));
				$(stats_con_output).append($("<input>").attr({"type":"checkbox","name":"stats_con_output_ckbox"+selected_level,"value":"-logp"}));
				$(stats_con_output).append($("<label>").html("-log p-value"));
				$(stats_con_output).append($("<br>"));
				$(stats_con_output).append($("<input>").attr({"type":"checkbox","name":"stats_con_output_ckbox"+selected_level,"value":"stat"}));
				$(stats_con_output).append($("<label>").html("test statistic"));
			}
			var stats_select_fdradjust=$("<div>").attr({"id":"stats_select_fdr_adjust"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselectfdradjust"+selected_level));
			$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"yes"}));
			$(stats_select_fdradjust).append($("<label>").html("Yes"));
			$(stats_select_fdradjust).append($("<br>"));
			$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"no"}));
			$(stats_select_fdradjust).append($("<label>").html("No"));
			view.updateStatsGoButtonPos();
			checkAllRequired_con=function(){
				var current_selected_level=$('#stats_module_gene_level_select').val();
				if($('#visibleBalloonElement input:radio[name="stats_con_tests_radio'+current_selected_level+'"]').is(':checked')
					&& $('#visibleBalloonElement input:radio[name="stats_con_method_radio'+current_selected_level+'"]').is(':checked')
				&& ( ($('#visibleBalloonElement #stats_con_output'+current_selected_level).length==0) || $('#visibleBalloonElement input:checkbox[name="stats_con_output_ckbox'+current_selected_level+'"]').is(':checked'))
				&& ($('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]').is(':checked'))) {
					$("#statsGoButton").removeClass("disabledbutton");
					$("#statsGoButton").off("click");
					$("#statsGoButton").click(function(){
						// perform the selected test
						var trackDB=track.trackUrl+".db";
						var test_kind=$('#visibleBalloonElement input:radio[name="stats_con_tests_radio'+current_selected_level+'"]:checked').val();
						var test_method=$('#visibleBalloonElement input:radio[name="stats_con_method_radio'+current_selected_level+'"]:checked').val();
						var test_fdr_adjust=$('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]:checked').val();
						var test_cutoff=$('#visibleBalloonElement #stats_select_cutoff_sel'+current_selected_level).val();
						var test_output=[];
						$('#visibleBalloonElement input:checkbox[name="stats_con_output_ckbox'+current_selected_level+'"]:checked').each(function() {
							test_output.push($(this).val());
						});
						var new_track_files=view.statsTest(current_selected_level, currentNetwork, networkType, track.name, trackDB, sample_db, selected_feature, test_kind, test_method, null, test_output, test_fdr_adjust, test_cutoff, null);
						box17395.nukeTooltip();
					});
				}
				else{
					$("#statsGoButton").addClass("disabledbutton");
					$("#statsGoButton").off("click");
				}
			};
			$("#stats_con_tests"+selected_level).click(function() { checkAllRequired_con();});
			$("#stats_con_method"+selected_level).click(function() { checkAllRequired_con();});
			$("#stats_select_fdr_adjust"+selected_level).click(function() {checkAllRequired_con();});
			if(selected_level=="_gene"){
				$("#stats_con_output"+selected_level).click(function() {  checkAllRequired_con();});
			}
		}
	}
	else if(feature_type=="CAT"){  // anova
		for(var k=0; k< analysis_levels.length; k++){
			var selected_level=analysis_levels[k];
			$("#visibleBalloonElement #statsselecttest"+selected_level).empty();
			$("#visibleBalloonElement #statsselectfdradjust"+selected_level).empty();
			$("#visibleBalloonElement #statsoutputtracks"+selected_level).empty();
			var stats_cat_tests=$("<div>").attr({"id":"stats_cat_tests"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselecttest"+selected_level));
			$(stats_cat_tests).append($("<input>").attr({"type":"radio","name":"stats_cat_tests_radio"+selected_level,"value":"anova"}));
			$(stats_cat_tests).append($("<label>").html("anova"));
			$(stats_cat_tests).append($("<br>"));
			$(stats_cat_tests).append($("<input>").attr({"type":"radio","name":"stats_cat_tests_radio"+selected_level,"value":"kruskal"}));
			$(stats_cat_tests).append($("<label>").html("kruskal test"));
			if(selected_level=="_gene"){
				var stats_cat_output=$("<div>").attr({"id":"stats_cat_output"+selected_level}).css(stats_css).css("margin-bottom","20px").appendTo($("#visibleBalloonElement #statsoutputtracks"+selected_level));
				$(stats_cat_output).append($("<input>").attr({"type":"checkbox","name":"stats_cat_output_ckbox"+selected_level,"value":"-logp"}));
				$(stats_cat_output).append($("<label>").html("-log p-value"));
			}
			var stats_select_fdradjust=$("<div>").attr({"id":"stats_select_fdr_adjust"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselectfdradjust"+selected_level));
			$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"yes"}));
			$(stats_select_fdradjust).append($("<label>").html("Yes"));
			$(stats_select_fdradjust).append($("<br>"));
			$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"no"}));
			$(stats_select_fdradjust).append($("<label>").html("No"));
			/*
			$(stats_cat_output).append($("<br>"));
			$(stats_cat_output).append($("<input>").attr({"type":"checkbox","name":"stats_cat_output_ckbox","value":"stat"}));
			$(stats_cat_output).append($("<label>").html("test statistic"));
			*/
			view.updateStatsGoButtonPos();
			var checkAllRequired_cat=function(){
				var current_selected_level=$('#stats_module_gene_level_select').val();
				if($('#visibleBalloonElement input:radio[name="stats_cat_tests_radio'+current_selected_level+'"]').is(':checked')
					&& ( ($('#visibleBalloonElement #stats_cat_output'+current_selected_level).length==0) || $('#visibleBalloonElement input:checkbox[name="stats_cat_output_ckbox'+current_selected_level+'"]').is(':checked'))
				&& ($('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]').is(':checked'))) {
					$("#statsGoButton").removeClass("disabledbutton");
					$("#statsGoButton").off("click");
					$("#statsGoButton").click(function(){
						// perform the selected test
						var trackDB=track.trackUrl+".db";
						var test_kind=$('#visibleBalloonElement input:radio[name="stats_cat_tests_radio'+current_selected_level+'"]:checked').val();
						var test_method=$('#visibleBalloonElement input:radio[name="stats_cat_method_radio'+current_selected_level+'"]:checked').val();
						var test_fdr_adjust=$('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]:checked').val();
						var test_cutoff=$('#visibleBalloonElement #stats_select_cutoff_sel'+current_selected_level).val();
						var test_output=[];
						$('#visibleBalloonElement input:checkbox[name="stats_cat_output_ckbox'+current_selected_level+'"]:checked').each(function() {
							test_output.push($(this).val());
						});
						var new_track_files=view.statsTest(current_selected_level, currentNetwork, networkType, track.name, trackDB, sample_db, selected_feature, test_kind, null, null, test_output, test_fdr_adjust, test_cutoff, null);
						box17395.nukeTooltip();
					});
				}
				else{
					$("#statsGoButton").addClass("disabledbutton");
					$("#statsGoButton").off("click");
				}
			};
			$("#stats_cat_tests"+selected_level).click(function() {checkAllRequired_cat();});
			$("#stats_cat_method"+selected_level).click(function() {checkAllRequired_cat();});
			$("#stats_select_fdr_adjust"+selected_level).click(function() {checkAllRequired_cat();});
			if(selected_level=="_gene"){
				$("#stats_cat_output"+selected_level).click(function() {checkAllRequired_cat();});
			}
		}
	}
	else if(feature_type=="SUR"){  // anova
		for(var k=0; k< analysis_levels.length; k++){
			var selected_level=analysis_levels[k];
			$("#visibleBalloonElement #statsselecttest"+selected_level).empty();
			$("#visibleBalloonElement #statsselectfdradjust"+selected_level).empty();
			$("#visibleBalloonElement #statsoutputtracks"+selected_level).empty();
			$("#visibleBalloonElement #statsselectsurvival_pval_module_text").css("display","block");
			$("#visibleBalloonElement #statsselectsurvival_pval_module").css("display","block");
			var stats_sur_tests=$("<div>").attr({"id":"stats_sur_tests"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselecttest"+selected_level));
			$(stats_sur_tests).append($("<input>").attr({"type":"radio","name":"stats_sur_tests_radio"+selected_level,"value":"coxph"}));
			$(stats_sur_tests).append($("<label>").html("survival (proportional hazards)"));
			if(selected_level=="_gene"){
				var stats_sur_output=$("<div>").attr({"id":"stats_sur_output"+selected_level}).css(stats_css).css("margin-bottom","20px").appendTo($("#visibleBalloonElement #statsoutputtracks"+selected_level));
				$(stats_sur_output).append($("<input>").attr({"type":"checkbox","id":"stats_sur_output_ckbox_hazard"+selected_level,"name":"stats_sur_output_ckbox"+selected_level,"value":"hazard"}));
				$(stats_sur_output).append($("<label for='stats_sur_output_ckbox_hazard"+selected_level+"'>").html("hazard ratio"));
				$(stats_sur_output).append($("<br>"));
				$(stats_sur_output).append($("<input>").attr({"type":"checkbox", "id":"stats_sur_output_ckbox_logtest_minuslogp"+selected_level,"name":"stats_sur_output_ckbox"+selected_level,"value":"logtest_minuslogp"}));
				$(stats_sur_output).append($("<label for='stats_sur_output_ckbox_logtest_minuslogp"+selected_level+"'>").html("signed logtest -log(pvalue)"));
				$(stats_sur_output).append($("<br>"));
				$(stats_sur_output).append($("<input>").attr({"type":"checkbox","id":"stats_sur_output_ckbox_sctest_minuslogp"+selected_level, "name":"stats_sur_output_ckbox"+selected_level,"value":"sctest_minuslogp"}));
				$(stats_sur_output).append($("<label for='stats_sur_output_ckbox_sctest_minuslogp"+selected_level+"'>").html("signed sctest -log(pvalue)"));
				$(stats_sur_output).append($("<br>"));
				$(stats_sur_output).append($("<input>").attr({"type":"checkbox","id":"stats_sur_output_ckbox_waldtest_minuslogp"+selected_level, "name":"stats_sur_output_ckbox"+selected_level,"value":"waldtest_minuslogp"}));
				$(stats_sur_output).append($("<label for='stats_sur_output_ckbox_waldtest_minuslogp"+selected_level+"'>").html("signed waldtest -log(pvalue)"));
			}
			var stats_select_fdradjust=$("<div>").attr({"id":"stats_select_fdr_adjust"+selected_level}).css(stats_css).appendTo($("#visibleBalloonElement #statsselectfdradjust"+selected_level));
			$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"yes"}));
			$(stats_select_fdradjust).append($("<label>").html("Yes"));
			$(stats_select_fdradjust).append($("<br>"));
			$(stats_select_fdradjust).append($("<input>").attr({"type":"radio","name":"stats_fdr_adjust_radio"+selected_level,"value":"no"}));
			$(stats_select_fdradjust).append($("<label>").html("No"));
			/*
			$(stats_sur_output).append($("<br>"));
			$(stats_sur_output).append($("<input>").attr({"type":"checkbox","name":"stats_sur_output_ckbox","value":"stat"}));
			$(stats_sur_output).append($("<label>").html("test statistic"));
			*/
			view.updateStatsGoButtonPos();
			var checkAllRequired_sur=function(){
				var current_selected_level=$('#stats_module_gene_level_select').val();
				if(current_selected_level=="_gene"){
					if($('#visibleBalloonElement input:checkbox[name="stats_sur_output_ckbox'+current_selected_level+'"]:checked').length==3){
						$('#visibleBalloonElement input:checkbox[name="stats_sur_output_ckbox'+current_selected_level+'"]:not(:checked)').attr('disabled', 'disabled');
						$('#visibleBalloonElement input:checkbox[name="stats_sur_output_ckbox'+current_selected_level+'"]:not(:checked)').map(function() {
							$('label[for='+$(this).attr('id')+current_selected_level+']').css({color:'gray'});
						});
					}
					else{
						$('#visibleBalloonElement input:checkbox[name="stats_sur_output_ckbox'+current_selected_level+'"]:not(:checked)').removeAttr('disabled');
						$('#visibleBalloonElement input:checkbox[name="stats_sur_output_ckbox'+current_selected_level+'"]:not(:checked)').map(function() {
							$('label[for='+$(this).attr('id')+current_selected_level+']').css({color:'black'});
						});
					}
				}
				if($('#visibleBalloonElement input:radio[name="stats_sur_tests_radio'+current_selected_level+'"]').is(':checked')
					&& (($('#visibleBalloonElement #stats_sur_output'+current_selected_level).length==0) || $('#visibleBalloonElement input:checkbox[name="stats_sur_output_ckbox'+current_selected_level+'"]').is(':checked'))
				&& ($('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]').is(':checked'))) {
					$("#statsGoButton").removeClass("disabledbutton");
					$("#statsGoButton").off("click");
					$("#statsGoButton").click(function(){
						// perform the selected test
						var trackDB=track.trackUrl+".db";
						var test_kind=$('#visibleBalloonElement input:radio[name="stats_sur_tests_radio'+current_selected_level+'"]:checked').val();
						var test_fdr_adjust=$('#visibleBalloonElement input:radio[name="stats_fdr_adjust_radio'+current_selected_level+'"]:checked').val();
						var test_cutoff=$('#visibleBalloonElement #stats_select_cutoff_sel'+current_selected_level).val();
						var test_sur_val=$('#visibleBalloonElement #stats_select_survival_pval_sel'+current_selected_level).val();
						var test_output=[];
						$('#visibleBalloonElement input:checkbox[name="stats_sur_output_ckbox'+current_selected_level+'"]:checked').each(function() {
							test_output.push($(this).val());
						});
						var new_track_files=view.statsTest(current_selected_level, currentNetwork, networkType, track.name, trackDB, sample_db, selected_feature, test_kind, null, null, test_output, test_fdr_adjust, test_cutoff, test_sur_val);
						box17395.nukeTooltip();
					});
				}
				else{
					$("#statsGoButton").addClass("disabledbutton");
					$("#statsGoButton").off("click");
				}
			};
			$("#stats_sur_tests"+selected_level).click(function() {checkAllRequired_sur();});
			$("#stats_select_fdr_adjust"+selected_level).click(function() {checkAllRequired_sur();});
			if(selected_level=="_gene"){
				$("#stats_sur_output"+selected_level).click(function() {checkAllRequired_sur();});
			}
		}
	}
	else{  // TODO: for future types
		$("#visibleBalloonElement #statsselecttest"+selected_level).empty();
		$("#visibleBalloonElement #statsselectfdradjust"+selected_level).empty();
		$("#visibleBalloonElement #statsoutputtracks"+selected_level).empty();
		view.updateStatsGoButtonPos();
		$("#statsGoButton").addClass("disabledbutton");
		$("#statsGoButton").off("click");
	}
	// add fdr selection dropdown 
	for(var k=0; k< analysis_levels.length; k++){
		var selected_level=analysis_levels[k];
		if(selected_level=="_module"){
			var stats_select_cutoff=$("#visibleBalloonElement #statsselectcutoff"+selected_level);
			stats_select_cutoff.empty();
			var stats_select_cutoff_sel = $('<select>').attr({'id':'stats_select_cutoff_sel'+selected_level}).appendTo(stats_select_cutoff);
			stats_select_cutoff_sel.append($("<option>").attr('value','0.01').text('0.01').addClass('option-odd'));
			stats_select_cutoff_sel.append($("<option>").attr('value','0.02').text('0.02').addClass('option-even'));
			stats_select_cutoff_sel.append($("<option>").attr('value','0.05').text('0.05').addClass('option-odd'));
			stats_select_cutoff_sel.append($("<option>").attr('value','0.1').text('0.1').addClass('option-even'));
			stats_select_cutoff_sel.append($("<option>").attr('value','0.2').text('0.2').addClass('option-odd'));
			stats_select_cutoff_sel.append($("<option>").attr({'value':'0.5','selected':true}).text('0.5').addClass('option-even'));
//		stats_select_fdr_sel.chosen();
			var stats_select_survival_pval=$("#visibleBalloonElement #statsselectsurvival_pval"+selected_level);
			stats_select_survival_pval.empty();
			if(feature_type=="SUR"){
				var stats_select_survival_pval_sel = $('<select>').attr({'id':'stats_select_survival_pval_sel'+selected_level}).appendTo(stats_select_survival_pval);
				stats_select_survival_pval_sel.append($("<option>").attr({'value':'logtest','selected':true}).text('Likelihood ratio test').addClass('option-odd'));
				stats_select_survival_pval_sel.append($("<option>").attr('value','waldtest').text('Wald test').addClass('option-even'));
				stats_select_survival_pval_sel.append($("<option>").attr('value','sctest').text('Score test').addClass('option-odd'));
			}
			view.updateStatsGoButtonPos();
		}
	}
};

// perform statistical test when user submit via track dropdown "statistics" menu
TrackView.prototype.statsTest=function(analysis_level, currentNetwork, networkType, trackName, trackDB, sample_db, feature_name, test_kind, test_method, test_direction, test_output, test_fdr_adjust, test_cutoff, test_survival_pval, moduleName){
  var mydata={};
  var b=this.brwsr;
	var view=this;
	var myCurrentNetwork;
	if(networkType=="system"){
		myCurrentNetwork=b.currentNetwork;
	}
	else{
		myCurrentNetwork=ng_logo.allNetworks[b.currentNetwork]["directory"];
	}
	mydata['analysisLevel']=analysis_level;  // _gene or _module
	mydata['moduleInfo']=view.brwsr.networkInfo.module_info;
	mydata['maxModuleSize']=view.brwsr.maxStatModuleSize;
	mydata['currentNetwork']=myCurrentNetwork;
	mydata['networkType']=networkType;
	mydata['trackName']=trackName;
	mydata['trackDB']=trackDB;
	mydata['sampleDB']=sample_db;
	mydata['featureName']=feature_name;
	mydata['kind']=test_kind;
	mydata['direction']=test_direction;
	mydata['method']=test_method;
	mydata['fdradjust']=test_fdr_adjust; // "Yes" or "No"
	mydata['output']=test_output.toString();
	mydata['cutoff']=test_cutoff;
	mydata['survivalPval']=test_survival_pval;  // logtest, waldtest or sctest
	if(moduleName){
		mydata['moduleName']=moduleName;   // null unless we are doing gene_level analysis on a siginificant module (found by module level test)
	}
	var stats_error_handler=function(message){
		$("#computingNGStatsDialog").dialog("close");
		var display_info;
		if(message=="ERROR"){
			display_info="Unknown error!";
		}
		else if(message=="NO_ENOUGH_MODULES"){
			display_info="Not enough modules!";
		}
		else if(message=="NO_MODULE_INFO_FILE"){
			display_info="Not module information found!";
		}
		else if(message=="NO_SIG_MODULE"){
			display_info="No siginificant modules found!";
		}
		if($("#computingNGStatsErrorDialog").length==0){
			$("<div>").attr("id", "computingNGStatsErrorDialog").appendTo($("body")).css({"display":"none", "color":"red"});
		}
		$("#computingNGStatsErrorDialog").html(display_info);
		view.computingNGStatsErrorDialog=$("#computingNGStatsErrorDialog").dialog({
			title: "Error",
			height: 100,
			width: 300,
			modal: true,
			draggable: false,
			closeOnEscape: false
		});
		$("#sigmodulesformdiv").empty();
		$("#sigmodulesformdiv").css("display","none");
		$("#defaultsigmodulesmsg").css("display","block");
	};
	$.ajax({
    type:"POST",
		url:"ng_stats.php",
		dataType:"json", // data type from server
		async:true,
		data:mydata,
		success: function(o) { 
			var results=o;
			if(analysis_level=="_gene"){
				if(results.message=="OK"){
					// this is the urls for the actual track data
					var tUrls=results.url;
					var tIntUrls=results.int_url;
					var tType=results.type;
					var tNames=results.name;
					// add all tracks
					for(var l=0; l<tUrls.length; l++){
						var userTrack={};
						userTrack.url=tUrls[l];
						userTrack.int_url=tIntUrls[l];
						//userTrack.network=myCurrentNetwork;
						userTrack.network=b.currentNetwork;
						if(results.type=="sbt" || results.type=="sct"){
							userTrack.type='SimpleTrack';
							userTrack.trackColor=null;
						}
						userTrack.datatype=tType;
						userTrack.key=tNames[l];
						userTrack.label=tNames[l].replace(/ /g,"");
						userTrack.name=userTrack.label;
						userTrack.link='NULL';
						userTrack.catergory='User Track';
						userTrack.isUserTrack=true;
						userTrack.isUploadTrack=false;
						b.trackData.push(userTrack);
						// save userTrack into localStorage
						if(typeof(localStorage)!='undefined') {
							// if already exists in localStorage, update it ( insert the new url corresponding to the network )
							var objString=localStorage.getItem(userTrack.label);
							if(objString){
								var tmpObj=$.parseJSON(objString);
								tmpObj["url"][myCurrentNetwork]=userTrack.url;
								tmpObj["trackColor"][myCurrentNetwork]=userTrack.trackColor;
								localStorage.setItem(userTrack.label, JSON.stringify(tmpObj));
							}
							else{
								var localStorageTrackObj={};
								$.extend(localStorageTrackObj, userTrack); // make a copy, not a reference
								var urlObj={};
								urlObj[myCurrentNetwork]=userTrack.url;
								localStorageTrackObj.url=urlObj;
								var trackColorObj={};
								trackColorObj[myCurrentNetwork]=userTrack.trackColor;
								localStorageTrackObj.trackColor=trackColorObj;
								delete localStorageTrackObj.network;
								localStorage.setItem(userTrack.label, JSON.stringify(localStorageTrackObj));
							}
						}
						var evt={};
						evt.target={};
						evt.target.id=userTrack.label;
						b.stbox.addTrack(evt);
					}	
					$("#computingNGStatsDialog").dialog("close");
				}	
				else{
					stats_error_handler(results.message);
				}
			}
			else{ // output from module level analysis
				// the output significant modules will be displayed in the left pane
				results=o;
				if(results.message=="OK"){
				  view.currentSigModuleTrack=trackName; 
					if(results.num_of_sig_modules>0){
				    view.showSigModules(o, mydata); 
					}
				}
				else{
					stats_error_handler(results.message);
				}
				$("#computingNGStatsDialog").dialog("close");
			}
		},
		error: function(o) {
	    stats_error_handler(o.message);
			}
	});
	if($("#computingNGStatsDialog").length==0){
		$("<div>").attr("id", "computingNGStatsDialog").appendTo($("body")).css({"display":"none","background-image":"url(images/loading-green.gif)","background-position":"center center","background-repeat":"no-repeat"});
	}
  this.computingNGStatsDialog=$("#computingNGStatsDialog").dialog({
    open: function(event, ui) { $(".noclose .ui-dialog-titlebar-close").hide(); },  // disable close button
    title: "Calculating ...",
		dialogClass: "noclose",
    height: 100,
    width: 200,
    modal: true,
    draggable: false,
    closeOnEscape: false
  });
};

TrackView.prototype.updateStatsGoButtonPos=function(){
  var mystatsGoButton=$("#statsGoButton");
	mystatsGoButton.css({"display":"block"});
  var balloonTop=box17395.getLoc('visibleBalloonElement','y1');
  var balloonRight= box17395.getLoc('visibleBalloonElement','x2');
  var margin=Math.round(box17395.padding/2);
  var myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
  var mystatsGoButtonWidth=parseInt(mystatsGoButton.css("width"));
  var mystatsGoButtonHeight=parseInt(mystatsGoButton.css("height"));
  var mystatsGoButtonPaddingX=parseInt(mystatsGoButton.css("padding-left"))+parseInt(mystatsGoButton.css("padding-right"));
  var mystatsGoButtonPaddingY=parseInt(mystatsGoButton.css("padding-top"))+parseInt(mystatsGoButton.css("padding-bottom"));
  var mystatsGoButtonBorderX=parseInt(mystatsGoButton.css("border-left-width"))+parseInt(mystatsGoButton.css("border-left-width"));
  var mystatsGoButtonBorderY=parseInt(mystatsGoButton.css("border-bottom-width"))+parseInt(mystatsGoButton.css("border-top-width"));
  mystatsGoButton.css("top", (balloonTop+margin+myTooltipDivHeight-mystatsGoButtonHeight-mystatsGoButtonPaddingY-mystatsGoButtonBorderY)+'px');
  mystatsGoButton.css("left", (balloonRight-margin-mystatsGoButtonWidth-mystatsGoButtonPaddingX-mystatsGoButtonBorderX-5)+'px');
};
