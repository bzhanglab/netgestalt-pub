var balloon17486             = new Balloon;
   balloon17486.padding         = 10;
   balloon17486.shadow          = 0;
   balloon17486.stemHeight      = 20;
   balloon17486.stemOverlap     = 1;
   balloon17486.stem            = true;
   balloon17486.fontColor       = 'black';
   balloon17486.fontFamily      = 'Arial, sans-serif';
   balloon17486.fontSize        = '9pt';
   balloon17486.images          = 'images/balloon17486';
   balloon17486.balloonImage    = 'balloon.png';
   balloon17486.upLeftStem      = 'up_left.png';
   balloon17486.upRightStem     = 'up_right.png';
   balloon17486.downLeftStem    = 'down_left.png';
   balloon17486.downRightStem   = 'down_right.png';
   balloon17486.closeButton     = 'close.png';
   balloon17486.ieImage         = null;
   balloon17486.configured      = true;
   balloon17486.displayTime     = 3000;

function CollapsedPage(){
  this.indices=window.opener.collapsedParam.indices;
  /*
  console.log(window.opener);                                                                                                   
  console.log(this.indices);
  */
  this.brwsr=window.opener.b;
  this.imageGeneratorUrl="image_gen_collapsed.php";
  // console.log(this.brwsr);
  this.trackLabelIDs=[];
	this.trackTitleVisible=true;
  this.sampleHeatMapDivWidth=250;
	this.sampleHeatMapTitleHeight=100;
  this.leftPaneVisible=false;
	this.sstDividerHeight=2; // 2px
  this.sampleHeatmapVisible=false;
}

CollapsedPage.prototype.rendering=function(){
  var cp=this;
  var widthTest=$('<div>');
  widthTest.attr({
    id: 'widthTest'
  });
	widthTest.addClass('sequence');
  //console.log(widthTest);
  $('body').append(widthTest);
  // monospaced font, letter and number occupy same amount of horizontal space
  var widthText="12345678901234567890123456789012345678901234567890";
  $('#widthTest').text(widthText);  
  /*
  console.log(widthText.length);
  console.log($('#widthTest'));
  console.log($('body'));
  */
  var charWidth=$('#widthTest').width() /widthText.length;
  var seqHeight=$('#widthTest').height();
  this.seqHeight=seqHeight;
  this.charWidth=charWidth;
  /*
  console.log("charWidth="+charWidth);
  console.log("seqHeight="+seqHeight);
  console.log("windowWidth="+$(window).width());
  console.log("winHeight="+$(window).height());
  */
  $('#widthTest').remove();
  var logoDiv=$('<div>').attr({'id':'logodiv'}).css({'width':'100%'});
  $('body').append(logoDiv);
  var logo=$("<img>",{src:"images/logo2.png", id:"nglogo", height:"50px"});
  $('#logodiv').append(logo);
  var buttons=$('<div>').attr({'id':'buttons'}).css({"position":"fixed"}).appendTo($('body'));
  var toggleLeftPane=$("<div>").attr({id:"toggleleftpane"}).html("Show sample heatmap").addClass("togglediv");
	buttons.append(toggleLeftPane);
/*
	$(toggleLeftPane).click(function(){
	if(cp.leftPaneVisible){
			$(toggleLeftPane).text("Show left pane");
      cp.leftPaneVisible=false;
		}
		else{
			$(toggleLeftPane).text("Hide left pane");
      cp.leftPaneVisible=true;
		}
	});
*/
	var toggleTrackTitle=$("<div>").attr({id:"toggletracktitle"}).addClass("togglediv").css({"margin-left":"150px"});
  $(toggleTrackTitle).html("Hide track title");
	$(toggleTrackTitle).click(function(){
	  if(cp.trackTitleVisible){
			$(".track-label").css({'visibility':'hidden'});
			$(toggleTrackTitle).text("Show track title");
      cp.trackTitleVisible=false;
		}
		else{
			$(".track-label").css({'visibility':'visible'});
			$(toggleTrackTitle).text("Hide track title");
      cp.trackTitleVisible=true;
		}
	});
	buttons.append(toggleTrackTitle);
	var container=$('<div>').attr({"id":"container"}).appendTo($('body'));
	var leftPane=$('<div>').attr({"id":"leftpane"}).html("").appendTo(container);
	leftPane.css({'margin-left': (-1*cp.sampleHeatMapDivWidth)+'px'}); 
	$("#toggleleftpane").click(function(){
		var curwidth=$("#leftpane").offset(); 
    //console.log(curwidth);
		if(curwidth.left>=0) //compare margin-left value
		{
      $("#leftpane").css({"margin-left": (-1*cp.sampleHeatMapDivWidth)+'px'});
      $(".class_sample_heatmap_container").css({"margin-left": (-1*cp.sampleHeatMapDivWidth)+'px'});
      $("#cp_container").animate({marginLeft:0},300);
      cp.sampleHeatmapVisible=false;
			$(this).html('Show sample heatmap'); //change text of button
		}else{
      $("#cp_container").animate({marginLeft: cp.sampleHeatMapDivWidth+'px'},300);
			setTimeout(function(){
				$("#leftpane").css({"margin-left":0});
				$(".class_sample_heatmap_container").css({"margin-left":0});
			},300);
      cp.sampleHeatmapVisible=true;
			$(this).html('Hide sample heatmap'); //change text of button
		}
	});
  var scrollContainer=$('<div>');
  cp.scrollContainer=scrollContainer;
  scrollContainer.attr({
     id:"cp_container"
  });
  //scrollContainer.css({'position':'absolute','left':'0px','top':'0px'});
  $(container).append(scrollContainer);
  var nameDiv=$('<div>');
  cp.nameDiv=nameDiv;
  nameDiv.attr({ 'id':"collapsed_name" });
  //nameDiv.css({'clear':'both', 'overflow-x':'hidden'});
  nameDiv.css({'overflow-x':'hidden'});
  $('#cp_container').append(nameDiv);
/*
  $(window).scroll(function(){
    $('#collapsed_name').css('top',$(window).scrollTop());
  });
*/
  cp.zoomLevel=2*seqHeight;
  // add Name track first 
  cp.addNameTrack();
  // add all existing tracks
  var tracks=cp.brwsr.view.tracks;
  // create a div for vertical scroll.
  vScrollContainer=$('<div>');
  vScrollContainer.attr({'id':'vScrollContainer'});
  vScrollContainer.css({'clear':'both','overflow':'visible', 'position':'relative'});
  $('#cp_container').append(vScrollContainer);
  cp.addTracks(tracks);
  for(var i=0; i<cp.trackLabelIDs.length;i++){
    $(window).scroll(function(){
				$(".track-label").css('left',$(window).scrollLeft());
				$(".class_sample_heatmap").css('left',$(window).scrollLeft());
    });
  }
//	 $('#vScrollContainer').append($("<div>").css({'position':'relative','padding-top':'20px','margin-top':'5px','clear':'both','height':'5px'}));
	//update logodiv length (if the container becomes longer that the screen size)
	//$("#logodiv").width($("#cp_container").width());
	$("#logodiv").width("500px");
	$("#logodiv").css({"position":"fixed"});
};

CollapsedPage.prototype.addTracks=function(tracks){
// each track is rendered as a image
  //console.log(tracks);
  var cp=this;
  var sampleHeatMapDivWidth=cp.sampleHeatMapDivWidth;
	var sampleHeatMapTitleHeight=cp.sampleHeatMapTitleHeight;
  var currentTrack;
  var track_padding_top=20;
  var image_margin_top=30;
  var mytop=parseInt($("#cp_container").css("top"))+cp.nameTrackHeight+(track_padding_top+image_margin_top);
	for(var i=0; i<tracks.length; i++){
		currentTrack=tracks[i]; 
		if(currentTrack.key.toUpperCase()=="NAME") //skip name track, already added
			continue;
		// request image from the server
		var imobj=cp.getImage(currentTrack);
		var imgid=currentTrack.key.replace(/\s/g, '');
		// put the image into the right location
		var trackdiv=$('<div>');
		var trackdivID='track-'+imgid;
		trackdiv.attr({'id':trackdivID});
		trackdiv.css({'position':'relative','padding-top':track_padding_top+'px'});
		trackdiv.appendTo('#vScrollContainer');
		var labeldiv=$('<div>');
		var labeldivID='label-'+imgid;
		labeldiv.addClass('track-label');
		labeldiv.attr({'id':labeldivID});
		var label_margin_top=10;
		var label_margin_bottom=10;
		labeldiv.css({'font-size':'12px','position':'absolute', 'margin-top':label_margin_top+'px','margin-bottom':label_margin_bottom+'px', 'white-space':'nowrap'});
		labeldiv.text(currentTrack.key);
		labeldiv.appendTo('#'+Util.jqSelector(trackdivID));
		cp.trackLabelIDs.push(labeldivID); 
		var labelOuterWidth=labeldiv.outerWidth();
		if(trackdiv.outerWidth()<labelOuterWidth)
			trackdiv.width(labelOuterWidth);
		/*
		var helper=function(id){
		return function(){
		$(window).scroll(function(){
		$('#'+id).css('left',$(window).scrollLeft());
		});
		};
		};
		helper(labeldivID);
		*/
		/*
		$(window).scroll(function(){
		$('#'+labeldivID).css('left',$(window).scrollLeft());
		});
		*/
		var labelheight=labeldiv.outerHeight();
		var imgdiv=$('<div>');
		imgdiv.attr({'id':'collapsed_div_'+imgid});
		//imgdiv.css({'margin-top':'20px','position':'relative', 'top':labelheight+'px'});
		imgdiv.css({'margin-top':image_margin_top+'px','position':'relative'});
		imgdiv.appendTo('#'+Util.jqSelector(trackdivID));
		//imgdiv.appendTo('#'+labeldivID);
		var img=$('<img>');
		img.attr({'src':imobj.src,'id':'collapsed_'+imgid});
		img.appendTo('#collapsed_div_'+Util.jqSelector(imgid));
		// set the div height equal to image height
		track=currentTrack;
		imgdiv.css({"height":imobj.subTrackCount*imobj.subTrackHeight+"px"});
		img.css({"height":imobj.subTrackCount*imobj.subTrackHeight+"px"});
		if(track.dataType=="sst"){
		  img.css({"width":cp.indices.length*cp.zoomLevel+"px"});
		}
		// if track is composite (cct,cbt), then create a sample heatmap div 
		if(track.dataType=="cct" || track.dataType=="cbt" || track.dataType=="sst"){
			//console.log(track.sortedCommonSamples);
			//console.log(track.sampleArray);
			var tempArray=[];
			var sortedCommonSampleIndiceString;
			if(track.sortedCommonSamples && track.sortedCommonSamples.length!=0){
				for(j=0; j<track.sortedCommonSamples.length; j++){
					tempArray.push($.inArray(track.sortedCommonSamples[j],track.sampleArray));
				}
				sortedCommonSampleIndiceString=tempArray.map(String).join(',');
				track.sortedCommonSampleIndiceString=sortedCommonSampleIndiceString;
			}
			//console.log(sortedCommonSampleIndiceString);
			var sampleHeatMapContainer=$("<div>").attr('id',"sample_heatmap_"+track.name+"_container").addClass("class_sample_heatmap_container");
			$(sampleHeatMapContainer).css({"position":"absolute", "background":"transparent", "z-index":100, "width":sampleHeatMapDivWidth+"px", "visibility":"visible", "margin-left":(-1*sampleHeatMapDivWidth)+'px'});
			var sampleHeatMapDiv = $("<div>").attr('id',"sample_heatmap_"+track.name).addClass("class_sample_heatmap");
			$(sampleHeatMapDiv).css({"position":"absolute", "top":"0px", "right":"0px","z-index":100, "background-color": "#FFF", "border-style":"solid", "border-color":"#8CC63F", "border-width":"1px","height":"0px", "width":sampleHeatMapDivWidth-2+"px", "visibility":"visible"});
			$(sampleHeatMapDiv).appendTo($(sampleHeatMapContainer));
			if(track.dataType!="sst"){
				var sampleHeatMapTitleDivID="sample_heatmap_title_"+track.name;
				var sampleHeatMapTitleDiv = $("<div>").attr('id', sampleHeatMapTitleDivID);
				$(sampleHeatMapTitleDiv).css({"position":"absolute", "top":"0px", "right":"0px","z-index":100, "background-color": "#FFF", "border-style":"solid", "border-color":"#8CC63F", "border-width":"1px","height":sampleHeatMapTitleHeight+"px", "width":sampleHeatMapDivWidth+"px", "border-top-style":"none", "visibility":"hidden"});
				$(sampleHeatMapTitleDiv).appendTo($(sampleHeatMapContainer));
				// create an icon for show/hide feature titles
				var showFeatureTitleDivID="sample_heatmap_"+track.name+"_show_feature_title";
				var showFeatureTitle=$("<div>").attr("id", showFeatureTitleDivID);
				$(showFeatureTitle).css({"position":"absolute","left":"5px","bottom":"5px","margin-top":"5px","visibility":"hidden"});
				var showFeatureTitleIconID=showFeatureTitleDivID+"_icon";
				var showFeatureTitleIcon=$("<img>").attr({"id":showFeatureTitleIconID,"src":"images/downarrow.png", "width":"10px","height":"10px"});
				$(showFeatureTitleIcon).appendTo($(showFeatureTitle));
				$(showFeatureTitle).appendTo($(sampleHeatMapDiv));
				// toggle icon to show/hide title div
				function showFeatureTitleClickHandler(mytoppos){
					var cur_track=track;
					return function(){
						$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css({"top":mytoppos-2+"px"});
						if($("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css("visibility")!="hidden"){
							$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css({"visibility":"hidden"});
							$(showFeatureTitleIcon).attr({"src":"images/downarrow.png"});
						}
						else{
							$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css({"visibility":"visible"});
							$(showFeatureTitleIcon).attr({"src":"images/uparrow.png"});
							cp.showSampleHeatmapTitles(cur_track, sampleHeatMapTitleDivID, Math.floor(230/track.maxSampleFeatures));
						}
					}
				};
				$(showFeatureTitle).click(showFeatureTitleClickHandler(mytop+track.height+2)); // 2 is the top and bottom border width
			}
			$(sampleHeatMapContainer).appendTo($('body'));
			$(sampleHeatMapDiv).css({"height": track.height-2+"px", "top":mytop+"px"}); // 2 is the top and bottom border width
			cp.addSampleHeatmapFeatures(track);
			if(track.addedSampleFeatures.length>0){
				$(showFeatureTitle).css("visibility","visible");
				$(showFeatureTitleIcon).attr("src","images/downarrow.png");
			}
		}
    else{  // for other track type, add blank div
			var sampleHeatMapContainer=$("<div>").attr('id',"sample_heatmap_"+track.name+"_container").addClass("class_sample_heatmap_container");
			$(sampleHeatMapContainer).css({"position":"absolute", "background":"transparent", "z-index":100, "width":sampleHeatMapDivWidth+"px", "visibility":"visible", "margin-left":(-1*sampleHeatMapDivWidth)+'px'});
			var sampleHeatMapDiv = $("<div>").attr('id',"sample_heatmap_"+track.name).addClass("class_sample_heatmap");
			$(sampleHeatMapDiv).css({"position":"absolute", "top":"0px", "right":"0px","z-index":100, "background-color": "#FFF", "border-style":"solid", "border-color":"#FFF", "border-width":"1px","height":"0px", "width":sampleHeatMapDivWidth-2+"px", "visibility":"visible"});
			$(sampleHeatMapDiv).appendTo($(sampleHeatMapContainer));
			$(sampleHeatMapContainer).appendTo($('body'));
			$(sampleHeatMapDiv).css({"height": track.height-2+"px", "top":mytop+"px"}); // 2 is the top and bottom border width
    }
		mytop+=track.height+track_padding_top+image_margin_top;
	}
};


CollapsedPage.prototype.addSampleHeatmapFeatures=function(track){
	if(track.dataType!="sst"){ // cct or cbt
		var cp=this;
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
		var myintUrl=track.int_url;
		// remove file extension
		myintUrl=myintUrl.replace(/\.[^/.]+$/, "");
		// sample info db now in int_data
		//arg.track_file=track.trackUrl;
		arg.track_file=myintUrl;
		arg.sample_features=features_to_be_visualized;
		arg.sample_height=track.subTrackHeight;
		var mywidth=cp.sampleHeatMapDivWidth-20;
		arg.pixel_per_feature=Math.floor(mywidth/track.maxSampleFeatures);
		arg.total_feature_count=track.maxSampleFeatures;
		var imgObj, all_images, count;
		var sortedSamples;
		if(features_to_be_visualized!=""){
			imgObj=getImage(track,arg);
			all_images=imgObj.src;
			count=all_images.length;
			sortedSamples=imgObj.samples.slice(0,-1).split(',');
			track.sortedCommonSamples=sortedSamples;
		}
		else{  // restore the original sample order
			sortedSamples=track.sampleArray;
			track.sortedCommonSamples=sortedSamples;
		}
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
			image_id="sample_heatmap_"+track.name+"__"+i+"__feature_img"+Util.randomString(10);
			// may not like image id with special character such as # or %
			sample_heatmap_img=$("<img>").attr({"src":all_images[count-1-i], "id":image_id});
			$(sample_heatmap_img).css({'margin-top':'0px','height':track.height-2+'px'}); // 2 is the top and bottom border width
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
				var sample_value=cp.brwsr.view.getSampleValue(track, cur_sample, myfeature);
				balloon17486.showTooltip(e, "<b>Feature</b>:"+myfeature+"<br><b>Sample</b>:"+cur_sample+"<br><b>Value</b>:"+sample_value);
			}); 
		}
     if(!count){
       $("<div>").html("No feature added").css({"margin":"auto","left":"20px","top":"10px","position":"absolute"}).appendTo($("#sample_heatmap_"+Util.jqSelector(track.name)));
     }
	}
	else{  //sst
		var sampleCount=track.sampleArray.length;
		var sample_heatmap_div_container_id="sample_heatmap_"+track.name+"_container";
		var sample_heatmap_div_container=$("#"+Util.jqSelector(sample_heatmap_div_container_id)).first();
		var sample_heatmap_div_id="sample_heatmap_"+track.name;
		var sample_heatmap_div=$("#"+Util.jqSelector(sample_heatmap_div_id)).first();
			$("#"+Util.jqSelector(sample_heatmap_div_id)+" .sstSampleName").empty();
			var i=0;
			for(i=0; i<sampleCount; i++){
				//console.log(track.sampleArray[i]);
				if(i%2==0){
					$(sample_heatmap_div).append($("<div>").html(track.sampleArray[i]).css({"font-size":"12px","font-family":"sans-serif","top":i*(track.height-2)/sampleCount+"px","height":(track.height-2)/sampleCount+"px","position":"absolute","right":"5px","background-color":"#E9DED3","width":"245px","text-align":"right","line-height":(track.height-2)/sampleCount+"px"}).addClass("sstSampleName"));
				}
				else{
					$(sample_heatmap_div).append($("<div>").html(track.sampleArray[i]).css({"font-size":"12px","font-family":"sans-serif","top":i*(track.height-2)/sampleCount+"px","height":(track.height-2)/sampleCount+"px","position":"absolute","right":"5px","width":"245px","text-align":"right","line-height":(track.height-2)/sampleCount+"px"}).addClass("sstSampleName"));
				}
			}
	}
};

// get the image location generated on the server side
CollapsedPage.prototype.getImage=function(track){
	var cp=this;
	var brwsr=cp.brwsr; 
	var zoom=cp.zoomLevel;
	var arg;
	//console.log(track.key);
	//console.log(brwsr.currentNetwork);
	//console.log(brwsr.trackData);
	var currentTrackInfo=cp.searchTrackData(brwsr.trackData, track.name, brwsr.currentNetwork);
	//console.log(currentTrackInfo);
	// convert data array to string;
	//console.log(currentTrackInfo);
	arg={ 
		"trackfile":currentTrackInfo[0].url,
		"tracktype":track.dataType,
		"pixelspergene":zoom,
		"indices":cp.indices.toString()
	};
	// data transformed?
  if(track.dataType=="cct"){
    arg["genewisetrans"]=track.geneWiseTrans;
    arg["colorscheme"]=track.colorScheme;
		if(track.colorscale_l!=null && track.colorscale_r!=null){
		  arg["upper"]=track.colorscale_r;
			arg["lower"]=track.colorscale_l;
		}
	}
	if(track.dataType=="cct" || track.dataType=="cbt"){
	  if(track.sortedSampleIndiceString && track.sortedSampleIndiceString!=""){
      arg["sortedSampleIndiceString"]=track.sortedSampleIndiceString;
		}
	}
	if(track.dataType=="sct"){
    if(track.yaxis_top!=null && track.yaxis_bottom!=null){
		  arg["upper"]=track.yaxis_top;
			arg["lower"]=track.yaxis_bottom;
		}
	}
	//console.log(arg);
	$.ajax({
		type: "POST",
		url: cp.imageGeneratorUrl,
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
	//console.log(ts.responseText);
	}
	});
  return image;
};

CollapsedPage.prototype.addNameTrack=function(){
	var cp=this;
	var b=cp.brwsr;
	var o=cp.searchTrackData(b.trackData, 'name', b.currentNetwork);
	var maxNameLen=8;
	// add a left blank div to cover the name track when scrolling
	var blankContainer=$("<div>").attr('id',"blank_name_div_container").addClass("class_sample_heatmap_container");
	$(blankContainer).css({"position":"absolute", "background":"transparent", "z-index":100, "width":cp.sampleHeatMapDivWidth+"px", "visibility":"visible", "margin-left":(-1*cp.sampleHeatMapDivWidth)+'px'});
	var blankDiv = $("<div>").attr('id',"blank_name_div").addClass("class_sample_heatmap");
	$(blankDiv).css({"position":"absolute", "top":"0px", "right":"0px","z-index":100, "background-color": "#FFF", "border-style":"solid", "border-color":"#FFF", "border-width":"1px","height":"0px", "width":cp.sampleHeatMapDivWidth-2+"px", "visibility":"visible"});
	$(blankDiv).appendTo($(blankContainer));
	$(blankContainer).appendTo($('body'));
	$(blankDiv).css({"top": parseInt($("#cp_container").css("top"))+"px","height":maxNameLen*cp.charWidth+"px"}); // 2 is the top and bottom border width
	var loadSuccess=function(data){
		var lines=data.split("\n"); 
		var size=0;
		var names=[];
		var trunData=[];
		var truncated=[];
		for(var i=0; i<lines.length; i++){
			// skip lines start with #
			if(lines[i]!="" && !lines[i].match("^\s*\#")){
				//format:  XXXX,id
				var items=lines[i].split(",");
				names[size]=items[0];
				if(items[0].length>maxNameLen){
					var sliced=items[0].slice(0,maxNameLen-1);
					sliced=sliced+"\\";
					trunData[size]=sliced;
					truncated[size]=true;
				}
				else{
					trunData[size]=items[0];
					truncated[size]=false;
				}
				size++;
			}
		}
		//console.log(size);
		var total=0;
		var leftpadding, rightpadding;
		var whitespace;
		var textCss={};
		if(!$.browser.msie){
			textCss["-webkit-transform"]="rotate(-90deg)";
			textCss["-moz-transform"]="rotate(-90deg)";
		}
		else{
			textCss["-ms-transform"]="rotate(-90deg)";
		}
		var n;
		//console.log(cp.indices);
		for(var k=0; k<cp.indices.length;k++){
			n=cp.indices[k]; 
			var geneWidth=cp.zoomLevel;
			whitespace=geneWidth-cp.seqHeight-1; // 1px for the right border
			if(whitespace%2==0){
				leftpadding=rightpadding=whitespace/2;
			}
			else{
				leftpadding=(whitespace-1)/2;
				rightpadding=leftpadding+1;
			}
			var mywidth=geneWidth-1;
			var myheight=maxNameLen*cp.charWidth;
			if(cp["nameTrackHeight"]==undefined){
				cp["nameTrackHeight"]=myheight;  
			}
			var mymargintop=0.5*(myheight-mywidth);
			var mymarginleft=-0.5*mymargintop;
			textCss["width"]=myheight+"px";
			textCss["height"]=mywidth+"px";
			textCss["margin-left"]=mymarginleft+"px";
			textCss["margin-top"]=mymargintop+"px";
			var geneNameDiv;
			var geneNameDivCss={};
			geneNameDivCss["top"]="10px";
			geneNameDivCss["width"]=mywidth+"px";
			geneNameDivCss["height"]=myheight+"px";
			geneNameDiv=$('<div>');
			$(geneNameDiv).addClass("gene-name");
			$(geneNameDiv).css(geneNameDivCss);
			var namewithoutspace=names[n];
			if(namewithoutspace){
				namewithoutspace.replace(/ /g,'^^');
				var geneNameTextDiv=$('<div>');
				$(geneNameTextDiv).attr({id:"name_"+namewithoutspace});
				$(geneNameTextDiv).addClass("cp-gene-name-text");
				$(geneNameTextDiv).text(trunData[n]);
				$(geneNameTextDiv).css(textCss);
				$(geneNameDiv).append(geneNameTextDiv);
				$(cp.nameDiv).append(geneNameDiv);
				total++;
				// if the name is truncated, show full name if mouse over.
				if(truncated[n]){
					$(geneNameTextDiv).qtip({
						content:names[n],
						//position: {target:$(geneNameTextDiv), adjust:{x:-40}}
						position: {target:'mouse', adjust:{x:20}}
					});
				}
			}
		}
		//update container width
		//console.log(total);
		//$(cp.nameDiv).css({width:total*30+'px'});
		$(cp.nameDiv).css({width:total*(2*cp.seqHeight)+'px'});
	};
	$.ajax({
		type: "GET",
		async: false,
		url: o[0].url,
		data: null, // Don't add any data to the URL.
		dataType:"text", 
		success: loadSuccess
	});
};

// search trackInfo array to match label and network name
// should match at most 1 object.
CollapsedPage.prototype.searchTrackData=function(a,l,n){
  return $.grep(a, function(e,i){
    if(e.label==l && e.network==n)
      return e;
   });
};


CollapsedPage.prototype.showSampleHeatmapTitles=function(track, sampleHeatMapTitleDivID, titleWidth){
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
