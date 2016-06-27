function TrackView(brwsr, elem, stripeWidth, refprotein, zoomLevel) {
  //all coordinates are interbase
  //measure text width for the max zoom level
  var widthTest = $("<div>").addClass("sequence").css("visibility","hidden");
  // monospaced font, letter and number occupy same amount of horizontal space
  var widthText = "12345678901234567890123456789012345678901234567890";
  $(widthTest).append($(document.createTextNode(widthText)));
  $(elem).append($(widthTest));
  this.charWidth = $(widthTest).outerWidth() /widthText.length;
  this.seqHeight = $(widthTest).outerHeight();
  // the number of genes in each stripe at the second to the last zoom level
  this.fullZoomGeneCount=stripeWidth/10;
  // the number of genes in each stripe at the last zoom level
  this.finalZoomGeneCount=stripeWidth/25;
 if(debug){
    console.log("charWidth="+this.charWidth);
    console.log("seqHeight="+this.seqHeight);
  }
  $(widthTest).remove();

  // measure the height of some arbitrary text in whatever font this
  // shows up in (set by an external CSS file)
  var heightTest = $("<div>").addClass("pos-label").css("visibility","hidden");
  $(heightTest).append($(document.createTextNode("42")));
  $(elem).append($(heightTest));
  this.posHeight = $(heightTest).outerHeight();
  // Add an arbitrary 50% padding between the position labels and the
  // topmost track
  if(debug)
    console.log("posHeight="+this.posHeight);
  this.topSpace = 1.5 * this.posHeight;
  $(heightTest).remove();

  this.brwsr=brwsr;
  this.ruler=[];
  //for linked sort: names of sorted common samples
  this.sortedCommonSamples=[]; 
  //the reference genes
  this.ref = refprotein;
  if(debug4){
    console.log("refProtein name: "+this.ref.name);
    console.log("start: "+this.ref.start+", end: "+this.ref.end);
  }
  //current scale, in pixels per bp
  this.pxPerBp = zoomLevel;
  //width, in pixels, of the vertical stripes
  this.stripeWidth = stripeWidth;
  //the page element that the TrackView lives in
  this.elem = elem;
  if(debug){
    console.log("this.elem.clientWidth="+this.elem.clientWidth);
  }
  // the scrollContainer is the element that changes position
  // when the user scrolls
  this.scrollContainer=$("<div>").attr("id","container").css({"position":"absolute","left":"0px","top":"0px", "height":"100%","z-index":"1"});
  $(elem).append($(this.scrollContainer));

  // we have a separate zoomContainer as a child of the scrollContainer.
  // they used to be the same element, but making zoomContainer separate
  // enables it to be narrower than this.elem.
  this.zoomContainer=$("<div>").attr("id","zoomContainer").css({"position":"absolute","left":"0px","top":"0px","height":"100%"});
  $(this.scrollContainer).append($(this.zoomContainer));

  //width, in pixels of the "regular" (not min or max zoom) stripe
  this.regularStripe = stripeWidth;
  //width, in pixels, of stripes at full zoom (based on the sequence
  //character width)
  //The number of characters per stripe is somewhat arbitrarily set
  //at this.fullZoomGeneCount
  this.fullZoomStripe = this.charWidth*this.fullZoomGeneCount;
  // this is the ultimate largest zoom we can have
  // the number of characters (genes) per stripe is set at this.finalZoomGeneCount
  this.finalZoomStripe = this.seqHeight*2*this.finalZoomGeneCount;

  this.overview=$("#overview");
  this.overviewBox=Util.marginBox(this.overview);
  this.tracks = [];
  this.uiTracks = [];
  this.trackIndices = {};

  // event handlers for cytoscape icons
  this.cytoScapeClickHandlers={};
  this.cytoScapeMouseOverHandlers={};
  this.currentCytoScapeDialogId="";
  this.trackInfoMouseOverHandlers={};
  this.trackInfoClickHandlers={};
  this.trackDeleteMouseOverHandlers={};
  this.trackDeleteClickHandlers={};
  this.trackExportMouseOverHandlers={};
  this.trackExportClickHandlers={};
  this.trackCollapseMouseOverHandlers={};
  this.trackCollapseClickHandlers={};
  this.SCT_FilterMouseOverHandlers={};
  this.SCT_FilterClickHandlers={};
  this.getRelatedTracksClickHandlers={};
  this.getRelatedTracksMouseOverHandlers={};
  this.networkAnalysisClickHandlers={};
  this.networkAnalysisMouseOverHandlers={};
	this.networkAnalysisSelectedValue="";
	this.networkAnalysisTrackName="";
	this.enrichedNeighborsFDRValue="";
  this.dtClickHandlers={};
  this.dtMouseOverHandlers={};
  this.compsiteSampleHeatMouseOverHandlers={};
  this.compsiteSampleHeatClickHandlers={};
  this.statsMouseOverHandlers={};
  this.statsClickHandlers={};
	
	//prepare div for "exporting tracks"
	var exportTrackOptions=$("<div>").attr("id","trackExportFormTooltipDiv").css("display","none");
  $(exportTrackOptions)[0].innerHTML="<br><b>&nbsp;What to export?</b><br><br>";
	//$(exportTrackOptions)[0].innerHTML+="&nbsp;<input type='radio' checked='checked' value='export_data' name='myTrackExportRadioButtons'>Raw Data </>(<span id='mytrackexportsize' style='color:red'></span>)<br><br><br>";
	$(exportTrackOptions)[0].innerHTML+="&nbsp;<input type='radio' checked='checked' value='export_data' name='myTrackExportRadioButtons'>Raw Data </><span id='mytrackexportsize' style='color:red'></span><br><br><br>";
//	$(exportTrackOptions)[0].innerHTML+="&nbsp;<input type='radio' value='export_image' name='myTrackExportRadioButtons'>Track Image<br><br><br>";
  $(elem).append($(exportTrackOptions));
  var exportTrackFormSubmitButton=$("<div>").html("<b>Export</b>").attr("id", "trackExportFormSubmitButton").css({"display":"none"}).addClass("submitbutton");
  $("body").append(exportTrackFormSubmitButton);
  this.exportTrackFormSubmitButton=exportTrackFormSubmitButton;

	// prepare div for "data transform"
	var dtDiv=$("<div>").attr("id","dtTooltipDiv").addClass("boxTooltip").css({"display":"none"}).html("");
  $(dtDiv)[0].innerHTML+="<p>&nbsp;Track Max:&nbsp;<span id='dtOrigMax' class='colortext'></span><br/>&nbsp;Track Min:&nbsp;<span id='dtOrigMin' class='colortext'></span><p>";
 //$(dtDiv)[0].innerHTML+="<p id='dtShowCurrentValue' style='display:none'>&nbsp;Current Max:&nbsp;<span id='dtCurMax' style='color:#800080;font-weight:bold'></span><br/>&nbsp;Current Min:&nbsp;<span id='dtCurMin' style='color:#800080;font-weight:bold'></span></p>";
	$(dtDiv)[0].innerHTML+="<div id='dtinputs'></div>";
  //$(dtDiv)[0].innerHTML+="<hr><p><b>&nbsp;Data Truncation</b>&nbsp;(Enter a cutoff value <span id='dtTruncatePurpose'></span>)</p>";
	//$(dtDiv)[0].innerHTML+="&nbsp;<input type='text' id='dtTruncateMaximum'></>";
  $(dtDiv)[0].innerHTML+="<div id='dtError' style='margin-top:10px;color:red;font-weight:bold;margin-left:5px;width:350px;'></div><br>";
  $(elem).append($(dtDiv));
  var dtSubmitButton=$("<div>").html("<b>Update</b>").attr("id", "dtSubmitButton").css({"display":"none"}).addClass("submitbutton disabledbutton");
  $("body").append(dtSubmitButton);
  this.dtSubmitButton=dtSubmitButton;
  var dtResetButton=$("<div>").html("<b>Reset</b>").attr("id", "dtResetButton").css({"display":"none"}).addClass("submitbutton");
  $("body").append(dtResetButton);
  this.dtResetButton=dtResetButton;

	// prepare div for perform statistics
	var statsDiv=$("<div>").attr("id","statsTooltipDiv").addClass("boxTooltip").css({"display":"none"}).html("");
	$(elem).append(statsDiv);
	$(statsDiv).append($("<div>").attr({"id":"statsTooltipWrapper"}).css({"padding":"5px"}));
  $("#statsTooltipWrapper").append($("<p>").html("Please select analysis level:<span style='visibility:hidden'>abc abc abc</span>").css("margin-bottom","40px"));
  //$("#statsTooltipWrapper").append($("<div>").attr({"id":"stats_moduleorgene"}).css({"width":"220px","margin-bottom":"10px"}));
  $("body").append($("<div>").attr({"id":"stats_moduleorgene"}).css({"width":"200px","display":"none"}));
  var stats_module_gene_sel = $('<select>').attr({'data-placeholder':'Select analysis level','id':'stats_module_gene_level_select'}).appendTo($("#stats_moduleorgene"));
  // add a blank option
  stats_module_gene_sel.append($("<option>").attr('value','').text('').addClass('option-odd'));
  stats_module_gene_sel.append($("<option>").attr('value','_module').text('module level').addClass('option-even'));
  stats_module_gene_sel.append($("<option>").attr('value','_gene').text('gene level').addClass('option-odd'));
  $('#stats_module_gene_level_select').chosen({width:"200px",disable_search: true});
  // open the drop down list by defaut
  $('.chosen-container').css({'left':'0px'});
	var view=this;
	var chosen_change_handler=function(){
		var selected_level=$('#stats_module_gene_level_select').val();
		if(selected_level=="_module"){
			$("#visibleBalloonElement #stats_modulelevel").css({"display":"block"}); 
			$("#visibleBalloonElement #stats_genelevel").css({"display":"none"}); 
			$("#visibleBalloonElement #statsselectsurvival_pval_module_text").css("display","none");
      $("#visibleBalloonElement #statsselectsurvival_pval_module").css("display","none");
		}
		else if(selected_level=="_gene"){
			$("#visibleBalloonElement #stats_modulelevel").css({"display":"none"}); 
			$("#visibleBalloonElement #stats_genelevel").css({"display":"block"}); 
		}
		var stats_feature_select_div=$("#stats_select_div_"+Util.jqSelector(view.currentClickedStatsTrackName));
		if(stats_feature_select_div.css("display")=="none"){
			stats_feature_select_div.css({"display":"block"});
		}
		$("#"+Util.jqSelector(view.currentClickedStatsTrackName)+"_stats_feature_select").val("").trigger("chosen:updated");
		$("#visibleBalloonElement #statsselecttest"+selected_level).empty();
		$("#visibleBalloonElement #statsselectcutoff"+selected_level).empty();
		$("#visibleBalloonElement #statsselectfdradjust"+selected_level).empty();
		$("#visibleBalloonElement #statsselectsurvival_pval"+selected_level).empty();
		$("#visibleBalloonElement #statsoutputtracks"+selected_level).empty();
		view.updateStatsGoButtonPos();
		$("#statsGoButton").addClass("disabledbutton");
		$("#statsGoButton").off("click");

		var mystatsGoButton=$("#statsGoButton");
		mystatsGoButton.css({"display":"block"});
		mystatsGoButton.addClass("disabledbutton");  // disabled first
		mystatsGoButton.off("click");
		view.updateStatsGoButtonPos();  
	};
	$('#stats_module_gene_level_select').chosen().change(function(){
	  chosen_change_handler();
	});
  $("#statsTooltipWrapper").append($("<div>").attr({"id":"stats_modulelevel"}).css({"width":"220px","display":"none"}));
  $("#stats_modulelevel").append($("<p>").html("Please select a feature:"));
  $("#stats_modulelevel").append($("<p>").css({"margin-top":"50px"}).html("Select a test:"));
  $("#stats_modulelevel").append($("<div>").attr({"id":"statsselecttest_module"}).css({"width":"220px"}));
 // $("#stats_modulelevel").append($("<p>").attr({"id":"statsselectfdr_title_module"}).css({"display":"none", "margin-top":"10px"}).html("Select FDR cutoff:"));
  $("#stats_modulelevel").append($("<p>").css({"margin-top":"10px","display":"none"}).html("Significance test based on:").attr("id","statsselectsurvival_pval_module_text"));
  $("#stats_modulelevel").append($("<div>").attr({"id":"statsselectsurvival_pval_module"}).css({"width":"220px","display":"none"}));
  $("#stats_modulelevel").append($("<p>").css({"margin-top":"10px"}).html("Perform FDR adjust?"));
  $("#stats_modulelevel").append($("<div>").attr({"id":"statsselectfdradjust_module"}).css({"width":"220px"}));
  $("#stats_modulelevel").append($("<p>").css({"margin-top":"10px"}).html("Select cutoff:"));
  $("#stats_modulelevel").append($("<div>").attr({"id":"statsselectcutoff_module"}).css({"width":"220px"}));
  $("#statsTooltipWrapper").append($("<div>").attr({"id":"stats_genelevel"}).css({"width":"220px","display":"none"}));
  $("#stats_genelevel").append($("<p>").html("Please select a feature:"));
  $("#stats_genelevel").append($("<p>").css({"margin-top":"50px"}).html("Select a test:"));
  $("#stats_genelevel").append($("<div>").attr({"id":"statsselecttest_gene"}).css({"width":"220px"}));
  $("#stats_genelevel").append($("<p>").css({"margin-top":"10px"}).html("Perform FDR adjust?"));
  $("#stats_genelevel").append($("<div>").attr({"id":"statsselectfdradjust_gene"}).css({"width":"220px"}));
//  $("#stats_genelevel").append($("<p>").css({"margin-top":"10px"}).html("Select FDR cutoff:"));
//  $("#stats_genelevel").append($("<div>").attr({"id":"statsselectfdr_gene"}).css({"width":"220px"}));
  $("#stats_genelevel").append($("<p>").html("Output track(s):"));
  $("#stats_genelevel").append($("<div>").attr({"id":"statsoutputtracks_gene"}).css({"width":"220px"}));
  var statsGoButton=$("<div>").html("<b>Go</b>").attr("id","statsGoButton").css({"display":"block"}).addClass("submitbutton disabledbutton");
  $("body").append(statsGoButton);
  this.statsGoButton=statsGoButton;

  // prepare div for "related tracks"
  var relatedOptions=$("<div>").attr("id","relatedTracksFormTooltipDiv").css("display","none");
  $(elem).append($(relatedOptions));
  // find out how many categories should be list
  // search for data/tracks/NETWORK_NAME/ann_***
  this.sbtCategories=[];
  this.getSbtCategories();
  $(relatedOptions)[0].innerHTML="";
  // put related network module first (for now, match name with "module")
  var firstModule=true;
  var firstChecked=true;
  for(var i=0; i<this.sbtCategories.length; i++){
    // only match 
		/* moved to 'network analysis' section
    if(this.sbtCategories[i]==brwsr.currentNetwork+"_module"){
      if(firstModule){
        $(relatedOptions)[0].innerHTML+="<br/><b>Find enriched network modules:</b><br/>";
        $(relatedOptions)[0].innerHTML+="&nbsp;<input type='radio' checked='checked' value="+this.sbtCategories[i]+" name='myRelatedTracksTooltipRadioButtons'>"+this.sbtCategories[i]+"<br/>";
        firstModule=false;
        firstChecked=false;
      }
      else{
        $(relatedOptions)[0].innerHTML+="&nbsp;<input type='radio' value="+this.sbtCategories[i]+" name='myRelatedTracksTooltipRadioButtons'>"+this.sbtCategories[i]+"<br/>";
      }
    }
		*/
  }
  $(relatedOptions)[0].innerHTML+="<br><b>Find related functional tracks:</b><br>";
  for(var i=0; i<this.sbtCategories.length; i++){
    if(this.sbtCategories[i].match(/module/g))
      continue;
    if(firstChecked){
      $(relatedOptions)[0].innerHTML+="&nbsp;<input type='radio' checked='checked' display='inline-block' value="+this.sbtCategories[i]+" name='myRelatedTracksTooltipRadioButtons'>"+this.sbtCategories[i];
      firstChecked=false;
    }
    else{
      $(relatedOptions)[0].innerHTML+="&nbsp;<input type='radio' display='inline-block' value="+this.sbtCategories[i]+" name='myRelatedTracksTooltipRadioButtons'>"+this.sbtCategories[i];
    }
  }
  $(relatedOptions)[0].innerHTML+="<br><div style='margin:10px 0px 5px 15px'><b>Select FDR cutoff:</b></div>";
  $(relatedOptions)[0].innerHTML+="<div style='margin-left:15px'><input type='radio' display='inline-block' value='0.001' name='myRelatedTracksTooltipFDR'>0.001<input type='radio' display='inline-block' value='0.005' name='myRelatedTracksTooltipFDR'>0.005<input type='radio' display='inline-block' value='0.01' name='myRelatedTracksTooltipFDR'>0.01</div>";
  $(relatedOptions)[0].innerHTML+="<div style='margin-left:15px'><input type='radio' display='inline-block' value='0.05' name='myRelatedTracksTooltipFDR'>0.05&nbsp;<input type='radio' display='inline-block' value='0.1' name='myRelatedTracksTooltipFDR'>0.1&nbsp;&nbsp;<input type='radio' display='inline-block' value='0.25' name='myRelatedTracksTooltipFDR'>0.25</div>";
  $(relatedOptions)[0].innerHTML+="<br><br><br>";
  //  relatedOptions.innerHTML += "<br/>&nbsp;<input type='button' id='computeRelatedTracksTooltipButton' name='computeRelatedTracksTooltipButton' value='Search'>";
  //relatedOptions.appendChild(relatedTracksForm);

  // this button is not part of the tooltip box because event handler does not work inside tooltip???
  var relatedTracksFormSubmitButton=$("<div>").html("<b>Search</b>").attr("id", "relatedTracksFormSubmitButton").css("display","none").addClass("submitbutton");
  $("body").append(relatedTracksFormSubmitButton);
  this.relatedTracksFormSubmitButton=relatedTracksFormSubmitButton;

 // network analysis div
 var neOptions=$("<div>").attr("id","networkAnalysisFormTooltipDiv").css({"display":"none","width":"150px"});
  $(neOptions)[0].html="";
	var htmlstring="";
	var mycss='background-color:#e2e2e2;border:1px solid #e2e2e2;border-radius:5px;padding:3px;margin:5px 0px 10px 0px;font-weight:normal;';
  htmlstring+="<div id='na_sbt_sct' style='margin:5px 0px 5px 0px;font-weight:bold;'>Module enrichment<div id='na_sbt_sct_input' style='"+mycss+"'><input type='radio' id='networkAnalysisModuleEnrichment' value='na_module_enrichment' name='myNetworkAnalysisTooltipRadioButtons'><span id='networkAnalysisModuleEnrichmentLabel'>Identify enriched network modules <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(results shown on left pane)</span>";
  htmlstring+="<div id='enrichedModuleFDRcutoff' style='margin-left:15px;display:none;margin-top:5px;'><b>Select FDR cutoff:</b>";
  htmlstring+="<div id='enrichedModuleFDR_1' style='margin-left:15px;font-weight:normal;'><input type='radio' value='0.001' name='enrichedModuleFDR'>0.001<input type='radio' value='0.005' name='enrichedModuleFDR'>0.005<input type='radio' value='0.01' name='enrichedModuleFDR'>0.01</div>";
  htmlstring+="<div id='enrichedModuleFDR_2' style='margin-left:15px;font-weight:normal;'><input type='radio' value='0.05' name='enrichedModuleFDR'>0.05&nbsp;<input type='radio' value='0.1' name='enrichedModuleFDR'>0.1&nbsp;&nbsp;<input type='radio' value='0.25' name='enrichedModuleFDR'>0.25&nbsp;</div></div></div></div>";
  htmlstring+="<div id='na_sbtonly' style='margin-top:10px;font-weight:bold;'>Network expansion";
  htmlstring+="<div style='"+mycss+"'<div id='na_sbtonly_input' style='margin:5px 0px 0px 0px;font-weight:normal;'><input type='radio' id='networkAnalysisAllNeighbor' value='na_all_neighbors' name='myNetworkAnalysisTooltipRadioButtons'><span id='networkAnalysisAllNeighborLabel'>All neighbors (for tracks with &le;"+brwsr.maxTrackSizeForExtension+" genes)</span><br>";
  htmlstring+="<input type='radio' value='na_enriched_neighbors' name='myNetworkAnalysisTooltipRadioButtons'>All enriched neighbors (including seeds)";
  htmlstring+="<div id='enrichedNeighborsFDRcutoff' style='margin-left:15px;margin-top:5px;display:none;'><b>Select FDR cutoff:</b>";
  htmlstring+="<div id='enrichedNeighborsFDR_005' style='margin-left:15px;font-weight:normal;'><input type='radio' display='inline-block' value='0.001' name='enrichedNeighborsFDR'>0.001<input type='radio' display='inline-block' value='0.005' name='enrichedNeighborsFDR'>0.005<input type='radio' display='inline-block' value='0.01' name='enrichedNeighborsFDR'>0.01</div>";
  htmlstring+="<div id='enrichedNeighborsFDR_001' style='margin-left:15px;font-weight:normal;'><input type='radio' display='inline-block' value='0.05' name='enrichedNeighborsFDR'>0.05&nbsp;<input type='radio' display='inline-block' value='0.1' name='enrichedNeighborsFDR'>0.1&nbsp;&nbsp;<input type='radio' display='inline-block' value='0.25' name='enrichedNeighborsFDR'>0.25</div></div>";
//  $(neOptions)[0].innerHTML+="&nbsp;<input type='radio' value='steiner' name='myNetworkAnalysisTooltipRadioButtons'> Steiner trees <br>";
//  $(neOptions)[0].innerHTML+="&nbsp;<input type='radio' value='netwalker' name='myNetworkAnalysisTooltipRadioButtons'> netwalkers <br>";
//  $(neOptions)[0].innerHTML+="&nbsp;<input type='radio' checked='checked' value=steiner name='myNetworkAnalysisTooltipRadioButtons'> Something else<br/>";
  htmlstring+="<div id='na_sbtonly_track_name' style='margin:10px 0px 5px 10px;font-weight:bold;'>Enter new track name";
  htmlstring+="<input type='text' maxlength='64' size='32' id='myNetworkAnalysisNewTrackName' style='display:inline-block;margin-left:10px;'></div></div></div>";
  htmlstring+="<div id='na_sbtonly_2' style='margin-top:10px;font-weight:bold;'>Gene prioritization";
  htmlstring+="<div style='"+mycss+"'<div id='na_sbtonly_2_input' style='margin:5px 0px 0px 0px;font-weight:normal;'><input type='radio' id='networkAnalysisEnrichedSeeds' value='na_enriched_seeds' name='myNetworkAnalysisTooltipRadioButtons'><span id='networkAnalysisEnrichedSeedsLabel'>Enriched seeds</span><br>";
  htmlstring+="<div id='enrichedSeedsFDRcutoff' style='margin-left:15px;display:none;margin-top:5px;'><b>Select FDR cutoff:</b>";
  htmlstring+="<div id='enrichedSeedsFDR_005' style='margin-left:15px;font-weight:normal;'><input type='radio' display='inline-block' value='0.001' name='enrichedSeedsFDR'>0.001<input type='radio' display='inline-block' value='0.005' name='enrichedSeedsFDR'>0.005<input type='radio' display='inline-block' value='0.01' name='enrichedSeedsFDR'>0.01</div>";
  htmlstring+="<div id='enrichedSeedsFDR_001' style='margin-left:15px;font-weight:normal;'><input type='radio' display='inline-block' value='0.05' name='enrichedSeedsFDR'>0.05&nbsp;<input type='radio' display='inline-block' value='0.1' name='enrichedSeedsFDR'>0.1&nbsp;&nbsp;<input type='radio' display='inline-block' value='0.25' name='enrichedSeedsFDR'>0.25</div></div>";
  htmlstring+="<div id='na_sbtonly_2_track_name' style='margin:10px 0px 5px 10px;font-weight:bold;'>Enter new track name";
  htmlstring+="<input type='text' maxlength='64' size='32' id='myNetworkAnalysisNewTrackName2' style='display:inline-block;margin-left:10px;'></div></div></div>";
  htmlstring+="<div id='myNetworkAnalysisTrackNameError' style='margin-bottom:20px;height:10px;'></div></div>";
	$(neOptions)[0].innerHTML=htmlstring;
  $(elem).append($(neOptions));
  var neFormSubmitButton=$("<div>").html("<b>Go</b>").attr("id", "networkAnalysisFormSubmitButton").css({"display":"none"}).addClass("submitbutton");
  if($('#networkAnalysisFormSubmitButton').length==0){
    $("body").append(neFormSubmitButton);
  }
  this.networkAnalysisFormSubmitButton=neFormSubmitButton;

  // prepare for SCT filter div
  var sctFilterDiv=$("<div>").attr("id","SCTFilterTooltipDiv").addClass("boxTooltip").html("<br/><b>Filter:</b><div class='emptydiv'>aaa</div>").css("display","none"); 
// four cases: less than a , great than a, less than a or greater than b, less than b and greater than a
  $(sctFilterDiv)[0].innerHTML+="Track Maximum:&nbsp;<span id='filterMax' class='colortext'></span><br/>Track Minimum:&nbsp;<span id='filterMin' class='colortext'></span><br/><br/><span><b>Please select a range:</b></span><div class='emptydiv'>aaa</div>";
  $(sctFilterDiv)[0].innerHTML+="<div><form id='sctfilterform' method='post' action='create_user_track.php'>&nbsp;<input type='radio' checked='checked' name='sctFilterRadioButton'><span class='sctFilterSpanLeft'>less than</span><input type='text' maxlength='10' class='sctFilterTextinputLeft' id='sctfilterinput1'><br/>&nbsp;<input type='radio' name='sctFilterRadioButton'><span class='sctFilterSpanLeft'>greater than</span><input type='text' maxlength='10' id='sctfilterinput2' class='sctFilterTextinputLeft'><br/>&nbsp;<input type='radio' name='sctFilterRadioButton'><span class='sctFilterSpanLeft'>greater than</span><input type='text' maxlength='10' class='sctFilterTextinputLeft' id='sctfilterinput3'><span class='sctFilterSpanRight'><b><a style='color:red'>and</a></b> less than</span><input type='text' maxlength='10' class='sctFilterTextinputRight' id='sctfilterinput4'><br/>&nbsp;<input type='radio' name='sctFilterRadioButton'><span class='sctFilterSpanLeft'>less than</span><input type='text' maxlength='10' id='sctfilterinput5' class='sctFilterTextinputLeft'><span class='sctFilterSpanRight'><b><a style='color:red'>or</a></b> greater than</span><input type='text' maxlength='10' id='sctfilterinput6'  class='sctFilterTextinputRight'><br/><br/>&nbsp;<input type='text' maxlength='64' id='filterUserTrackTitle' placeholder='Please enter the title for the new track' value=''><br/><br/></form></div><br/><br/><br/><br/>"; 
  $(elem).append($(sctFilterDiv));
  var sctFilterSubmitButton=$("<div>").html("<b>Add Track</b>").attr("id", "SCTFilterSubmitButton").css("display","none").addClass("submitbutton");
  $("body").append(sctFilterSubmitButton);
  this.sctFilterSubmitButton=sctFilterSubmitButton;

  var sctfiltererrordiv=$("<div>").attr("id","sctfiltererror").css("display","none");
  $("body").append(sctfiltererrordiv);

  //set up size state (zoom levels, stripe percentage, etc.)
  this.sizeInit();

  //distance, in pixels, from the beginning of the reference sequence
  //to the beginning of the first active stripe
  //  should always be a multiple of stripeWidth
  this.offset=0;
  //largest value for the sum of this.offset and this.getX()
  //this prevents us from scrolling off the right end of the ref seq
  this.maxLeft=this.bpToPx(this.ref.end) - this.dim.width;
  //smallest value for the sum of this.offset and this.getX()
  //this prevents us from scrolling off the left end of the ref seq
  this.minLeft=this.bpToPx(this.ref.start);
  //distance, in pixels, between each track
  this.trackPadding=20;
  //extra margin to draw around the visible area, in multiples of the visible area
  //0: draw only the visible area; 0.1: draw an extra 10% around the visible area, etc.
  this.drawMargin=0.2;
  //slide distance (pixels) * slideTimeMultiple + 200 = milliseconds for slide
  //1=1 pixel per millisecond average slide speed, larger numbers are slower
  this.slideTimeMultiple=0.8;
  this.trackHeights=[];
  this.trackTops=[];
  this.trackLabels=[];
  this.waitElems=[document.body, elem];
  this.prevCursors=[];
  this.locationThumb=$("<div>").addClass("locationThumb");
  $(this.overview).append($(this.locationThumb));
	$(this.locationThumb).draggable({
	  containment: 'parent',
		cursor: 'move',
		axis:'x',
		stop: $.proxy(this.thumbMoved,this)
	});
  var view = this;
  // This may not be necessary since we are using jquery now.
  var cssScroll = $.browser.msie;
  if (cssScroll) {
    view.x = -parseInt($(view.scrollContainer).css("left"));
    view.y = -parseInt($(view.scrollContainer).css("top"));
    view.getX = function() {
      return view.x;
  };
  view.getY = function() {
    return view.y;
  };
  view.getPosition = function() {
    return { x: view.x, y: view.y };
  };
  view.rawSetX = function(x) {
    $(view.scrollContainer).css("left", -x+"px"); view.x = x;
  };
  view.setX = function(x) {
    view.x = Math.max(Math.min(view.maxLeft - view.offset, x),
    view.minLeft - view.offset);
    view.x = Math.round(view.x);
    view.updateTrackLabels(view.x);
    view.showFine();
    $(view.scrollContainer).css("left",-view.x+"px");
  };
  view.rawSetY = function(y) {
    $(view.scrollContainer).css("top", -y+"px"); view.y = y;
  };
  view.setY = function(y) {
    view.y = Math.min((y < 0 ? 0 : y), view.containerHeight - view.dim.height);
    view.y = Math.round(view.y);
    view.updatePosLabels(view.y);
    $(view.scrollContainer).css("top",-view.y+"px");
  };
  view.rawSetPosition = function(pos) {
    $(view.scrollContainer).css("left",-pos.x+"px");
    $(view.scrollContainer).css("top", -pos.y+"px");
  };
  view.setPosition = function(pos){
    view.x = Math.max(Math.min(view.maxLeft - view.offset, pos.x),
    view.minLeft - view.offset);
    view.y = Math.min((pos.y < 0 ? 0 : pos.y),
    view.containerHeight - view.dim.height);
    view.x = Math.round(view.x);
    view.y = Math.round(view.y);

    view.updateTrackLabels(view.x);
    view.updatePosLabels(view.y);
    view.showFine();

    $(view.scrollContainer).css("left",-view.x+"px");
    $(view.scrollContainer).css("top",-view.y+"px");
  };
} else {
  view.x = $(view.elem).scrollLeft();
  view.y = $(view.elem).scrollTop();
  view.getX = function() {
    return view.x;
};
view.getY = function() {
  return view.y;
};
view.getPosition = function() {
  return { x: view.x, y: view.y };
};
view.rawSetX = function(x) {
  $(view.elem).scrollLeft(x); view.x = x;
};
view.setX = function(x) {
  view.x = Math.max(Math.min(view.maxLeft - view.offset, x),
  view.minLeft - view.offset);
  view.x = Math.round(view.x);
  view.updateTrackLabels(view.x);
  view.showFine();
  $(view.elem).scrollLeft(view.x);
};
view.rawSetY = function(y) {
  $(view.elem).scrollTop(y); view.y = y;
};
view.rawSetPosition = function(pos) {
  $(view.elem).scrollLeft(pos.x); view.x = pos.x;
  $(view.elem).scrollTop(pos.y); view.y = pos.y;
};

view.setY = function(y) {
  view.y = Math.min((y < 0 ? 0 : y),
  view.containerHeight
  - view.dim.height);
  view.y = Math.round(view.y);
  view.updatePosLabels(view.y);
  $(view.elem).scrollTop(view.y);
};
view.setPosition = function(pos) {
  view.x = Math.max(Math.min(view.maxLeft - view.offset, pos.x),
  view.minLeft - view.offset);
  view.y = Math.min((pos.y < 0 ? 0 : pos.y),
  view.containerHeight - view.dim.height);
  view.x = Math.round(view.x);
  view.y = Math.round(view.y);

  view.updateTrackLabels(view.x);
  view.updatePosLabels(view.y);
  view.showFine();

  $(view.elem).scrollLeft(view.x);
  $(view.elem).scrollTop(view.y);
};
}

view.dragEnd = function(event) {
  $.each(view.dragEventHandles, function(idx, value){ $("body").off(value);});
  view.elem.style.cursor = "url(\"css/openhand.cur\"), move";
  document.body.style.cursor = "default";
	Util.stopEvent(event);
  // if dragging very short distance, no update
  if(Math.abs(view.dragStartPos.x-event.clientX)<1 || 
     Math.abs(view.dragStartPos.y-event.clientY)<1){
		 view.dragging = false;
     return;
	}	 
  view.showCoarse();
  view.scrollUpdate();
  view.showVisibleBlocks(true);
  view.dragging = false;
	if(view.mouseguide){
     $('#crosshair-v').css("display","block");
	}
};

view.dragZoomEnd = function(event) {
  view.elem.style.cursor = "url(\"css/openhand.cur\"), move";
  document.body.style.cursor = "default";
  var total=$(view.elem).offset().left;
  var startX=view.dragStartPos.x-total;
  var endX=event.clientX-total;
  var startBp=Math.round(view.minVisible()+view.pxToBp(startX));
  var endBp=Math.round(startBp+view.pxToBp(endX-startX));
  var locString;
  if(startBp<endBp)
    locString=Util.addCommas(startBp)+" .. "+Util.addCommas(endBp);
  else
    locString=Util.addCommas(endBp)+" .. "+Util.addCommas(startBp);
  brwsr.navigateTo(refprotein.name+":"+locString);
  $("#darkRegion1").remove();    
  $("#darkRegion2").remove();    
  $.each(view.dragZoomEventHandles, function(idx,value){ $("body").unbind(value);});
	if(view.mouseguide){
     $('#crosshair-v').css("display","block");
	}
	Util.stopEvent(event);
};

view.dragZoomMove=function(event){
  var width=event.clientX-view.dragStartPos.x;
  var pos={};
	var mypos=$("#dragWindow").offset();
	var mywidth=$("#dragWindow").width();
	pos.x=mypos.left;
	pos.w=mywidth;
  if(width<0){  // wipe right to left
    $("#darkRegion2").css("left", view.dragStartPos.x+"px");
    $("#darkRegion2").css("width", (pos.w-(view.dragStartPos.x-pos.x))+"px");
    $("#darkRegion1").css("width", (event.clientX-pos.x)+"px");
  }
  else{  // wipe left to right
    $("#darkRegion1").css("width", (view.dragStartPos.x-pos.x)+"px");
    $("#darkRegion2").css("left", event.clientX+"px");
    $("#darkRegion2").css("width", (pos.w-(event.clientX-pos.x))+"px");
  }
}

var htmlNode = document.body.parentNode;
var bodyNode = document.body;
//stop the drag if we mouse out of the view
view.checkDragOut = function(event) {
/*
  console.log("mouseout .....");
  if (!(event.relatedTarget || event.toElement)
    || (htmlNode === (event.relatedTarget || event.toElement))
  || (bodyNode === (event.relatedTarget || event.toElement)))
  view.dragEnd(event);
	*/
};

view.dragMove = function(event) {
	view.setPosition({
		x: view.winStartPos.x-(event.clientX-view.dragStartPos.x),
		y: view.winStartPos.y-(event.clientY-view.dragStartPos.y)
	});
	// static track should not change Y-position during dragging
	$("#static_track").offset({"top":view.zoomContainerTop});
	Util.stopEvent(event);
};

view.mouseDown = function(event) {
	if(view.mouseguide){
     $('#crosshair-v').css("display","none");
	}
  // when user is dragging the track label, disable dragging the view
  if($(event.target).hasClass("track-label")){
	  return;
  }
	// for some reason, when click cct or cbt track label (before dragging to resort tracks) , the target is not the label.
  if($(event.target).parent().hasClass("track-label")){
	  return;
  }
	// when click icons in track label div, stop mousedown to avoid conflicting with sortable
  if(event.target.id.match(/icon/g)){
	  $(event.target).parents(".track_delete").show();
		$(event.target).parents(".track-label").unbind("mouseenter mouseleave");
	  return;
  }
	if ("animation" in view) {
		if (view.animation instanceof Zoomer) {
			Util.stopEvent(event);
			return;
		} else {
			view.animation.stop();
		}
	}
  if (Util.isRightButton(event)) return;
	Util.stopEvent(event);
//  if (event.shiftKey || event.ctrlKey) return;        
  view.dragging = true;
	// disable guide if visible
	if(view.mouseguide){
     $('#crosshair-v').css("display","none");
	}
  view.dragStartPos = {x: event.clientX, y: event.clientY};
  view.winStartPos = view.getPosition();
  if(event.altKey){
    $("body").on("mouseup",view.dragZoomEnd);
    $("body").on("mousemove",view.dragZoomMove);
    $("body").on("mouseout",view.dragZoomOut);
    view.dragZoomEventHandles = [ "mouseup","mousemove","mousemout"];
		var pos=$("#dragWindow").offset();
    var mypos={
		           "x": pos.left, 
		           "y": pos.top, 
		           "w": $("#dragWindow").width(),
							 "h": $("#dragWindow").height()
							 };
    var darkRegion1=$("<div>").attr("id", "darkRegion1");
    $(view.zoomContainer).append(darkRegion1);
    darkRegion1.css({"position":"fixed", 
      "top":mypos.y+"px",
      "left":mypos.x+"px",
      "height":mypos.h+"px",
      "width":Math.round(mypos.w/2)+"px",
      "background-color":"rgba(69,69,69,0.5)",
       "z-index":99});
    var darkRegion2=$("<div>").attr("id", "darkRegion2");
    $(view.zoomContainer).append(darkRegion2);
    darkRegion2.css({"position":"fixed", 
      "top":mypos.y+"px",
      "left": (mypos.x+Math.round(mypos.w/2))+"px",
      "height":mypos.h+"px",
      "width":Math.round(mypos.w/2)+"px",
      "background-color":"rgba(69,69,69,0.5)",
      "z-index":99});
    $("body").css("cursor","auto");
    $(view.elem).css("cursor","auto");
  }
  else{
    $("body").on("mouseup",view.dragEnd);
    $("body").on("mousemove",view.dragMove);
    $("body").on("mouseout",view.checkDragOut);
    view.dragEventHandles = ["mouseup","mousemove","mouseout"];
    $("body").css("cursor","url(\"css/closedhand.cur\"), move");
    $(view.elem).css("cursor","url(\"css/closedhand.cur\"), move");
  }
};

$(view.elem).on("mousedown",view.mouseDown);
$(view.elem).on("dblclick",function(event) {
	if (view.dragging) return;
	if ("animation" in view) return;
	var zoomLoc = (event.pageX - $(view.elem).offset().left) / view.dim.width;
	if (event.shiftKey) {
		view.zoomOut(event, zoomLoc, 1);
	} else {
		view.zoomIn(event, zoomLoc, 1);
	}
	Util.stopEvent(event);
});

view.afterSlide = function() {
  view.showCoarse();
  view.scrollUpdate();
  view.showVisibleBlocks(true);
};

view.zoomCallback = function() { view.zoomUpdate(); };

var wheelScrollTimeout = null;
var wheelScrollUpdate = function() {
  view.showVisibleBlocks(true);
  wheelScrollTimeout = null;
};

view.wheelScroll = function(e) {
  var oldY = view.getY();
  // arbitrary 60 pixel vertical movement per scroll wheel event
  var newY = Math.min(Math.max(0, oldY - 60 * Util.wheel(e)),
  view.containerHeight - view.dim.height);
  view.setY(newY);

  //the timeout is so that we don't have to run showVisibleBlocks
  //for every scroll wheel click (we just wait until so many ms
  //after the last one).
  if (wheelScrollTimeout)
    clearTimeout(wheelScrollTimeout);
  // 100 milliseconds since the last scroll event is an arbitrary
  // cutoff for deciding when the user is done scrolling
  // (set by a bit of experimentation)
  wheelScrollTimeout = setTimeout(wheelScrollUpdate, 100);
  Util.stopEvent(e);
};

$(view.scrollContainer).on("mousewheel", view.wheelScroll);
$(view.scrollContainer).on("DOMMouseScroll", view.wheelScroll);

var trackDiv = document.createElement("div");
trackDiv.className = "ui_track";
trackDiv.style.height = this.posHeight + "px";
trackDiv.id = "static_track";
this.staticTrack = new StaticTrack("static_track", "pos-label", this.posHeight);
if(debug){
  console.log("static_track: stripeCount="+this.stripeCount+" stripePercent="+
  this.stripePercent, " posHeight="+this.posHeight);
}
this.staticTrack.setViewInfo(function(height) {}, this.stripeCount,
trackDiv, undefined, this.stripePercent,
this.stripeWidth, this.pxPerBp);
$(this.zoomContainer).append($(trackDiv));
this.waitElems.push(trackDiv);

var gridTrackDiv = document.createElement("div");
gridTrackDiv.className = "ui_track";
gridTrackDiv.style.cssText = "top: 0px; height: 100%;";
gridTrackDiv.id = "gridtrack";
var gridTrack = new GridTrack("gridtrack");
gridTrack.setViewInfo(function(height) {}, this.stripeCount,
gridTrackDiv, undefined, this.stripePercent,
this.stripeWidth, this.pxPerBp);
$(this.zoomContainer).append($(gridTrackDiv));

this.uiTracks = [this.staticTrack, gridTrack];

$.each(this.uiTracks, function(index,track) {
  track.showRange(0, view.stripeCount-1,
    Math.round(view.pxToBp(view.offset)),
    Math.round(view.stripeWidth/view.pxPerBp),
    view.pxPerBp);
});

$(this.zoomContainer).css("padding-top",this.topSpace+"px");

this.addOverviewTrack(new StaticTrack("overview_loc_track", "overview-pos", this.overviewPosHeight));
if(debug){
  console.log("overviewStripes="+this.overviewStripes);
  console.log("overviewBox.w="+this.overviewBox.w);
}
//track.showRange(0, this.overviewStripes, 0, this.overviewStripeBases, this.pxPerBp);
$("#overviewtrack_overview_loc_track")[0].track.showRange(0, this.overviewStripes-1,
  0, this.overviewStripeBases,
  this.overviewBox.w /(this.ref.end - this.ref.start));

document.body.style.cursor = "url(\"css/closedhand.cur\")";
document.body.style.cursor = "default";

  // render the module div
  if(brwsr.moduleData)
    this.addModuleDiv(brwsr);

  this.getRuler();
//  this.showFine();
//  this.showCoarse();
}

TrackView.prototype.instantZoomUpdate = function() {
  $(this.scrollContainer).css("width",(this.stripeCount*this.stripeWidth)+"px");
  $(this.zoomContainer).css("width", (this.stripeCount*this.stripeWidth)+"px");
  this.maxOffset =
  this.bpToPx(this.ref.end) - this.stripeCount * this.stripeWidth;
  this.maxLeft = this.bpToPx(this.ref.end) - this.dim.width;
  this.minLeft = this.bpToPx(this.ref.start);
};

TrackView.prototype.stripeWidthForZoom = function(zoomLevel) {
  if ((this.zoomLevels.length - 2) == zoomLevel) {
    return this.fullZoomStripe;
} else if (zoomLevel == this.zoomLevels.length-1){
  return this.finalZoomStripe;
}else if (0 == zoomLevel) {
  return this.minZoomStripe;
} else {
  return this.regularStripe;
}
};

TrackView.prototype.addModuleDiv=function(){
  var myheight=1;
  var myheight_best=3;
  var mymargin=5;
  var curtop=0;
  var curLevel=-1;                            
  var brwsr=this.brwsr;
  var prevLevelDiv=null;
  var curLevelDiv=null;
  var curSubLevelDiv;
  var o=brwsr.moduleData;
  var divID=0;
  var prevBest=false;
  var myoffset=0;
  var scale=(this.overviewBox.w-myoffset)/(this.ref.end-this.ref.start);
  if(debug4)
    console.log("total pixel: "+(this.overviewBox.w-myoffset));
  var prevEnd;
  var color=["green","orange"];
  var colorIndex=0;
	this.moduleColors={};
  for(var i=0; i<brwsr.moduleData.length; i++){
    if(o[i]["level"]==curLevel){ 
      //var margin=(o[i]["start"]-prevEnd)*scale;
      prevEnd=o[i]["end"];
      var cssObj;
      //cssText="width:"+(o[i]["end"]-o[i]["start"]+1)*scale+"px;margin-left:"+margin+"px;float:left;background-color:"+color[colorIndex%2];
      cssObj={"top":curtop+"px","left":(o[i]["start"]-1)*scale+"px","width":(o[i]["end"]-o[i]["start"]+1)*scale+"px","background-color":color[colorIndex%2]};
      colorIndex++;
      curSubLevelDiv=$("<div>").addClass("module-sub-level").attr("id","module-sub-level-"+divID).attr("title", o[i]["name"]).css(cssObj); 
			this.moduleColors[o[i]["name"]]=color[(colorIndex-1)%2];
      divID++;
      $(curLevelDiv).append($(curSubLevelDiv));
    }
    else{ // create a new level
      if(prevBest){
        curtop+=(mymargin+myheight_best);
      }
      else{
        curtop+=(mymargin+myheight);
      }
      if(prevLevelDiv)
        $(brwsr.moduleDiv).append($(prevLevelDiv));
      colorIndex=0;
      if(o[i]["best"]=='N'){
        curLevelDiv=$("<div>").addClass("module-level");
        prevBest=false;
      }
      else{
        curLevelDiv=$("<div>").addClass("module-level-important");
        prevBest=true;
      }
      cssObj={"top":curtop+"px","left":(o[i]["start"]-1)*scale+"px","width":(o[i]["end"]-o[i]["start"]+1)*scale+"px","background-color":color[colorIndex%2]};
      colorIndex++;
      prevEnd=o[i]["end"];
      curSubLevelDiv=$("<div>").addClass("module-sub-level").attr("id","module-sub-level-"+divID).attr("title", o[i]["name"]).css(cssObj); 
			this.moduleColors[o[i]["name"]]=color[(colorIndex-1)%2];
      $(curLevelDiv).append($(curSubLevelDiv));
      prevLevelDiv=curLevelDiv;
      curLevel++;
      divID++;
    }
  }
  // add the last level
  $(brwsr.moduleDiv).append($(prevLevelDiv));
  	
  var totalHeight=(brwsr.moduelLevelTotalCount-1)*mymargin+brwsr.moduleLevelBestCount*myheight_best+(brwsr.moduelLevelTotalCount-brwsr.moduleLevelBestCount)*myheight;
  $(brwsr.moduleDiv).css("height", totalHeight+"px");
  this.createModuleEvents();
};

TrackView.prototype.createModuleEvents=function(){
  var view=this;
  var moduleData=view.brwsr.moduleData;
  for(var i=0; i<moduleData.length; i++){
    var mydiv=$("#module-sub-level-"+i);
    $(mydiv).on("mouseover",$.proxy(view.moduleLevelOver, view));
    $(mydiv).on("mouseout",$.proxy(view.moduleLevelOut,view));
    $(mydiv).on("click",$.proxy(view.moduleLevelClicked,view));
  }
};

TrackView.prototype.resizeModuleDiv=function(){
  if(this.brwsr.moduleData){
    $("#modulediv").empty();
    this.addModuleDiv();
  }
};

/* load all the gene names */
TrackView.prototype.getRuler= function(){
  var curTrackView = this;
	var brwsr=curTrackView.brwsr;
  var baseurl= (brwsr.dataRoot?brwsr.dataRoot:"");
  var result=queryTrackDataByNetwork(brwsr.trackData, brwsr.currentNetwork);
  var rel_url=result[0]['url'];
  var url=baseurl+rel_url;
  $.ajax({
	  url:url,
		dataType:"text",
		async:false,
		success: function(o) { curTrackView.loadRulerSuccess(o); },
		error: function(xhr, status, error) {curTrackView.loadRulerFail(status, error);}
		});
};

TrackView.prototype.loadRulerSuccess=function(o){
  var lines=o.split("\n"); 
  var size=0;
  for(var i=0; i<lines.length-1; i++){
    // skip lines start with #
    if(!lines[i].match("^\s*\#")){
      var items=lines[i].split(",");
      this.ruler[size]=items[0];
      size++;
  }   
}   
};

TrackView.prototype.loadRulerFail=function(error){
  if(debug){
    console.log("loading ruler failed");
		console.log("status"+status);
		console.log("error"+error);
  }
};

TrackView.prototype.setLocation = function(refseq, startbp, endbp) {
  if(startbp<=0) startbp=1;
  if(startbp === undefined) startbp = this.minVisible();
  if(endbp === undefined) endbp = this.maxVisible();
  if((startbp<refseq.start+1) || (startbp>refseq.end))
    startbp=refseq.start+1;
  if((endbp<refseq.start) || (endbp>refseq.end))
    endbp = refseq.end;

  if(this.ref != refseq) {
    this.ref = refseq;
    var removeTrack=function(track) {
      if (track.div && track.div.parentNode)
        track.div.parentNode.removeChild(track.div);
  };
  $.each(this.tracks, function(index, track){ removeTrack(track); });
  $.each(this.uiTracks, function(index, track) { track.clear(); });
  this.overviewTrackIterate(removeTrack);

  this.addOverviewTrack(new StaticTrack("overview_loc_track", "overview-pos", this.overviewPosHeight));
  this.sizeInit();
  this.setY(0);
  this.containerHeight = this.topSpace;
  }
  this.pxPerBp = Math.min(this.dim.width/(endbp-startbp+1), this.seqHeight*2);
  this.curZoom = Util.findNearest(this.zoomLevels, this.pxPerBp);
  // we may already zoom too much if we arrived at the last level
  if((endbp-startbp+1)*this.zoomLevels[this.curZoom]>this.dim.width){
    this.curZoom--;
  }
  /*
  console.log("this.dim.width="+this.dim.width);
  console.log("this.pxPerBp="+this.pxPerBp);
  console.log("this.curZoom="+this.curZoom);
  */
  if (Math.abs(this.pxPerBp - this.zoomLevels[this.zoomLevels.length - 1]) < 5) {
    //the cookie-saved location is in round bases, so if the saved
    //location was at the highest zoom level, the new zoom level probably
    //won't be exactly at the highest zoom (which is necessary to trigger
        //the sequence track), so we nudge the zoom level to be exactly at
        //the highest level if it's close.
        //Exactly how close is arbitrary; 0.2 was chosen to be close
        //enough that people wouldn't notice if we fudged that much.
        this.pxPerBp = this.zoomLevels[this.zoomLevels.length - 1];
        this.curZoom = this.zoomLevels.length-1;
  }
  // if the curZoom is the final zoom, check to see if the name track is already added
  // if the curZoom is not final zoom, do nothing
  var exists=false;
  /*
  console.log(this.zoomLevels);
  console.log(this.curZoom);
  console.log(this.curZoom);
  console.log(this.zoomLevels.length-1);
  console.log(this.zoomLevels);
  */
  if(this.curZoom==this.zoomLevels.length-1){
    this.pxPerBp=this.zoomLevels[this.curZoom];
    this.stripeWidth = (this.stripeWidthForZoom(this.curZoom) / this.zoomLevels[this.curZoom]) * this.pxPerBp;
    /*
    console.log("this.stripeWidthForZoom(this.curZoom)="+this.stripeWidthForZoom(this.curZoom));
    console.log("this.zoomLevels[this.curZoom]="+this.zoomLevels[this.curZoom]);
    console.log("this.pxPerBp="+this.pxPerBp);
    */
  }
  else{
    // this.pxPerBp=this.zoomLevels[this.curZoom];
    /*
    console.log("this.stripeWidthForZoom(this.curZoom)="+this.stripeWidthForZoom(this.curZoom));
    console.log("this.zoomLevels[this.curZoom]="+this.zoomLevels[this.curZoom]);
    console.log("this.pxPerBp="+this.pxPerBp);
    */
    this.stripeWidth = (this.stripeWidthForZoom(this.curZoom) / this.zoomLevels[this.curZoom]) * this.pxPerBp;
  }
  this.instantZoomUpdate();
  this.centerAtBase((startbp+endbp)/2, true);
  if(this.curZoom==this.zoomLevels.length-1){
    // if there is no actual track, do NOT show name track 
    // this is important for view initalization 
    if(!this.brwsr.isInitialized || this.tracks.length==0){
      exists=true;
    }
    else{
      for(var i=0; i<this.tracks.length; i++){
        if(this.tracks[i].name=="name"){
          exists=true;
          break;
      }  
      }
    }
    if(!exists){
      this.addThisTrack("name");       
    }
  }
  else{
    for(var i=0; i<this.tracks.length; i++){
      if(this.tracks[i].name=="name"){
        exists=true;
        break;
      }  
    }
    if(exists)
      this.removeThisTrack("name");
  }
};


TrackView.prototype.centerAtBase = function(base, instantly) {
  if(debug6){
    console.log("centerAtBase()");
  }
  base = Math.min(Math.max(base, this.ref.start), this.ref.end);
  if (instantly) {
    var pxDist = this.bpToPx(base);
    var containerWidth = this.stripeCount * this.stripeWidth;
    var stripesLeft = Math.floor((pxDist - (containerWidth / 2)) / this.stripeWidth);
    this.offset = stripesLeft * this.stripeWidth;
    this.setX(pxDist - this.offset - (this.dim.width / 2));
    this.trackIterate(function(track) { track.clear(); });
    this.showVisibleBlocks(true);
    this.showCoarse();
} else {
  var startbp = this.pxToBp(this.x + this.offset);
  var halfWidth = (this.dim.width / this.pxPerBp) / 2;
  var endbp = startbp + halfWidth + halfWidth;
  var center = startbp + halfWidth;
  if ((base >= (startbp  - halfWidth))
    && (base <= (endbp + halfWidth))) {
      //we're moving somewhere nearby, so move smoothly
      if (this.animation) this.animation.stop();
      var distance = (center - base) * this.pxPerBp;
      this.trimVertical();
      // slide for an amount of time that's a function of the
      // distance being traveled plus an arbitrary extra 200
      // milliseconds so that short slides aren't too fast
      // (200 chosen by experimentation)
      new Slider(this, this.afterSlide,
        Math.abs(distance) * this.slideTimeMultiple + 200,
      distance);
} else {
  //we're moving far away, move instantly
  this.centerAtBase(base, true);
}
}
};

TrackView.prototype.minVisible = function() {
  var minvisible=this.pxToBp(this.x + this.offset);
	// ref.start starts with 0
	if(minvisible<this.ref.start+1)
	  minvisible=this.ref.start+1;
  return minvisible;
};

TrackView.prototype.maxVisible = function() {
  var maxvisible=this.pxToBp(this.x + this.offset + this.dim.width);
	if(maxvisible>this.ref.end)
	  maxvisible=this.ref.end
	return maxvisible;
};

TrackView.prototype.showFine = function() {
  this.onFineMove(this.minVisible(), this.maxVisible());
};
TrackView.prototype.showCoarse = function() {
  this.onCoarseMove(this.minVisible(), this.maxVisible());
};

TrackView.prototype.onFineMove = function(a,b) {
  this.brwsr.onFineMove(a,b);
};
TrackView.prototype.onCoarseMove = function(a,b) {
  this.brwsr.onCoarseMove(a,b);
};

TrackView.prototype.checkY = function(y) {
  return Math.min((y < 0 ? 0 : y), this.containerHeight - this.dim.height);
};

TrackView.prototype.updatePosLabels = function(newY) {
  if (newY === undefined) newY = this.getY();
  this.staticTrack.div.style.top = newY + "px";
};

TrackView.prototype.updateTrackLabels = function(newX) {
  if (newX === undefined) newX = this.getX();
  for (var i = 0; i < this.trackLabels.length; i++)
    this.trackLabels[i].style.left = newX + "px";
};

TrackView.prototype.pxToBp = function(pixels) {
  return pixels / this.pxPerBp;
};

TrackView.prototype.bpToPx = function(bp) {
  return bp * this.pxPerBp;
};

TrackView.prototype.sizeInit = function() {
  this.dim = {width: this.elem.clientWidth,
    height: this.elem.clientHeight};
    //scale values, in pixels per bp, for all zoom levels
    // when last zoom level is reached, gene name will appear under each track
    //this.zoomLevels = [1/500000, 1/200000, 1/100000, 1/50000, 1/20000, 1/10000, 1/5000, 1/2000, 1/1000, 1/500, 1/200, 1/100, 1/50, 1/20, 1/10, 1/5, 1/2, 1, 2, 5, this.charWidth, this.seqHeight*2];
    this.zoomLevels = [1/500, 1/200, 1/100, 1/50, 1/20, 1/10, 1/5, 1/2, 1, 2, 5, this.charWidth, this.seqHeight*2];
    //make sure we don't zoom out too far
    /*
    if(debug4){
    console.log("ref.end="+this.ref.end);
    console.log("ref.start="+this.ref.start);
    }
    */
    while (((this.ref.end - this.ref.start) * this.zoomLevels[0]) < this.dim.width) {
      this.zoomLevels.shift();
    }
    //console.log(this.dim.width/(this.ref.end-this.ref.start));
    this.zoomLevels.unshift(this.dim.width/(this.ref.end-this.ref.start));
    //width, in pixels, of stripes at min zoom (so the view covers
    //the whole ref seq)
    this.minZoomStripe = this.regularStripe*(this.zoomLevels[0]/this.zoomLevels[1]);
    if(debug4){
      console.log("zoomLevels[0]="+this.zoomLevels[0]);
      console.log("zoomLevels[1]="+this.zoomLevels[1]);
      console.log("minZoomStripe="+this.minZoomStripe);
      console.log("this.pxPerBp="+this.pxPerBp);
    }
    this.curZoom = 0;
    while (this.pxPerBp > this.zoomLevels[this.curZoom])
      this.curZoom++;
    //console.log("this.pxPerBp="+this.pxPerBp);
    //console.log("this.curZoom="+this.curZoom);
    this.maxLeft = this.bpToPx(this.ref.end) - this.dim.width;
    if(debug4){
      console.log("maxLeft="+this.maxLeft);
    }
    delete this.stripePercent;
    //25, 50, 100 don't work as well due to the way scrollUpdate works
    var possiblePercents = [20, 10, 5, 4, 2, 1];
    for (var i = 0; i < possiblePercents.length; i++) {
      // we'll have (100 / possiblePercents[i]) stripes.
      // multiplying that number of stripes by the minimum stripe width
      // gives us the total width of the "container" div.
      // (or what that width would be if we used possiblePercents[i]
        // as our stripePercent)
        // That width should be wide enough to make sure that the user can
        // scroll at least one page-width in either direction without making
        // the container div bump into the edge of its parent element, taking
        // into account the fact that the container won't always be perfectly
        // centered (it may be as much as 1/2 stripe width off center)
        // So, (this.dim.width * 3) gives one screen-width on either side,
        // and we add a regularStripe width to handle the slightly off-center
        // cases.
        // The minimum stripe width is going to be halfway between
        // "canonical" zoom levels; the widest distance between those
        // zoom levels is 2.5-fold, so halfway between them is 0.7 times
        // the stripe width at the higher zoom level
        if(debug){
          console.log("this.dim.width="+this.dim.width);
        }
        if (((100 / possiblePercents[i]) * (this.regularStripe * 0.7))
          > ((this.dim.width * 3) + this.regularStripe)) {
            this.stripePercent = possiblePercents[i];
            break;
          }
    }
    if (this.stripePercent === undefined) {
      console.warn("stripeWidth too small: " + this.stripeWidth + ", " + this.dim.width);
      this.stripePercent = 1;
    }
    var oldX;
    var oldStripeCount = this.stripeCount;
    if (oldStripeCount) oldX = this.getX();
    if(debug){
      console.log("oldStripeCount="+oldStripeCount);
      console.log("oldX="+oldX);
      console.log("stripePercent="+this.stripePercent);
    }
    this.stripeCount = Math.round(100 / this.stripePercent);
    $(this.scrollContainer).css("width",(this.stripeCount*this.stripeWidth)+"px");
    $(this.zoomContainer).css("width", (this.stripeCount*this.stripeWidth)+"px");

    var blockDelta = undefined;
    if (oldStripeCount && (oldStripeCount != this.stripeCount)) {
      blockDelta = Math.floor((oldStripeCount - this.stripeCount) / 2);
      var delta = (blockDelta * this.stripeWidth);
      var newX = this.getX() - delta;
      this.offset += delta;
      this.updateTrackLabels(newX);
      this.rawSetX(newX);
    }
    this.trackIterate(function(track, view) {
      track.sizeInit(view.stripeCount, view.stripePercent, blockDelta);
});

var newHeight=parseInt($(this.scrollContainer).css("height"));
newHeight = (newHeight > this.dim.height ? newHeight : this.dim.height);

if(debug){
  console.log("newHeight="+newHeight+"px");
}
//$(this.scrollContainer).css("height",newHeight+"px");
$(this.scrollContainer).css("height","100%");
this.containerHeight=newHeight;

var refLength = this.ref.end - this.ref.start;
var posSize = document.createElement("div");
posSize.className = "overview-pos";
posSize.appendChild(document.createTextNode(Util.addCommas(this.ref.end)));
posSize.style.visibility="hidden";
$(this.overview).append($(posSize));
// we want the stripes to be at least as wide as the position labels,
// plus an arbitrary 20% padding so it's clear which grid line
// a position label corresponds to.
//var minStripe=posSize.clientWidth*1.2;
var minStripe=posSize.clientWidth*2;
if(debug){
  console.log("minStripe="+minStripe);
}
this.overviewPosHeight=posSize.clientHeight;
if(debug){
  console.log("overviewPosHeight="+this.overviewPosHeight);
}
$(posSize).remove();
for (var n=1; n<30; n++) {
  //http://research.att.com/~njas/sequences/A051109
  // JBrowse uses this sequence (1, 2, 5, 10, 20, 50, 100, 200, 500...)
  // as its set of zoom levels.  That gives nice round numbers for
  // bases per block, and it gives zoom transitions that feel about the
  // right size to me. -MS
  this.overviewStripeBases=(Math.pow(n%3,2)+1)*Math.pow(10, Math.floor(n/3));
  this.overviewStripes=Math.ceil(refLength/this.overviewStripeBases);
  if ((this.overviewBox.w/this.overviewStripes)>minStripe) break;
  if (this.overviewStripes<2) break;
}
//console.log("overviewStripeBases="+this.overviewStripeBases);
var overviewStripePct=100/(refLength/this.overviewStripeBases);
var overviewHeight=0;
this.overviewTrackIterate(function (track, view) {
  track.clear();
  track.sizeInit(view.overviewStripes, overviewStripePct);
  track.showRange(0, view.overviewStripes-1, 0, view.overviewStripeBases, view.overviewBox.w/(view.ref.end-view.ref.start));
 // console.log("track.showRange("+0+","+(view.overviewStripes - 1)+"," +0+","+view.overviewStripeBases+","+view.overviewBox.w/(view.ref.end - view.ref.start)+")");
});
this.updateOverviewHeight();
};   //end of sizeInit()

TrackView.prototype.overviewTrackIterate = function(callback) {
  var iter=0;
  var overviewTrack = this.overview.children().get(0);
  do {
    if (overviewTrack && overviewTrack.track){
      callback(overviewTrack.track, this);
    }
} while (overviewTrack && (overviewTrack = $(overviewTrack).next().get(0)));
};

TrackView.prototype.updateOverviewHeight=function(trackName, height) {
  var overviewHeight=0;
  this.overviewTrackIterate(function (track, view) {
    overviewHeight+=track.height;
});
$(this.overview).css("height",overviewHeight+"px");
this.overviewBox=Util.marginBox($(this.overview));
};

TrackView.prototype.addOverviewTrack=function(track) {
  var refLength=this.ref.end-this.ref.start;
  var overviewStripePct=100/(refLength/this.overviewStripeBases);
  if(debug){
    console.log("overviewStripePct="+overviewStripePct);
  }
  var trackDiv=$("<div>").addClass("track").css("height",this.overviewBox.h+"px");
  // ref starts from 1
  $(trackDiv).css("left",(((-(this.ref.start))/refLength)*this.overviewBox.w)+"px");
  $(trackDiv).attr("id","overviewtrack_"+track.name);
  $(trackDiv).get(0).track=track;
  var view=this;
  var heightUpdate=function(height) {
    view.updateOverviewHeight();
};
track.setViewInfo(heightUpdate, this.overviewStripes, $(trackDiv)[0],
  undefined,
  overviewStripePct,
  this.overviewStripeBases,
  this.pxPerBp);
$(this.overview).append($(trackDiv));
this.updateOverviewHeight();

return trackDiv;
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

TrackView.prototype.showVisibleBlocks = function(updateHeight, pos, startX, endX) {
  /*
  console.log("showVisibleBlocks: caller is " + arguments.callee.caller.toString());
  console.log("showVisibleBlocks: caller caller is " + arguments.callee.caller.caller);
  */
  if (pos === undefined) pos = this.getPosition();
  if (startX === undefined) startX = pos.x - (this.drawMargin * this.dim.width);
  if (endX === undefined) endX = pos.x + ((1 + this.drawMargin) * this.dim.width);
  var leftVisible = Math.max(0, (startX / this.stripeWidth) | 0);
  var rightVisible = Math.min(this.stripeCount - 1, (endX / this.stripeWidth) | 0);
  var bpPerBlock = Math.round(this.stripeWidth / this.pxPerBp);
  var startBase = Math.round(this.pxToBp((leftVisible * this.stripeWidth) + this.offset));
	// causing problem when network size is small, not sure this is totally fixed
	if(startBase%bpPerBlock!=0){
    startBase=Math.floor(startBase/bpPerBlock)*bpPerBlock;
	}
  var containerStart = Math.round(this.pxToBp(this.offset));
  var containerEnd = Math.round(this.pxToBp(this.offset + (this.stripeCount * this.stripeWidth)));
  this.trackIterate(function(track, view) {
    track.showRange(leftVisible, rightVisible, startBase, bpPerBlock,
      view.pxPerBp, containerStart, containerEnd, track.sortPos, track.commonSampleIndices,
    track.sortedCommonSamples);
    // the starting/ending gene id within the dragWindow
    var startBp=Math.round(view.minVisible());                                               
    var endBp=Math.round(view.maxVisible());
    //console.log(startBp+" "+endBp);
    var myid1="icon_info_label_"+track.name;
		var myid1_esc=Util.jqSelector(myid1); // escaping special characters
    if(view.trackInfoMouseOverHandlers[myid1]==undefined){
      view.trackInfoMouseOverHandlers[myid1]=$("#"+myid1_esc).on("mouseenter", function(event){
		  	$(this).addClass("labeldropmenudivhover");
		  });
        $("#"+myid1_esc).on("mouseleave", function(event){
		  	$(this).removeClass("labeldropmenudivhover");
		  });
    }
    if(view.trackInfoClickHandlers[myid1]==undefined){
      view.trackInfoClickHandlers[myid1]=$("#"+myid1_esc).on("click", function(event){
        //var targetid=$(event.target).attr("id");
				var targetid=myid1;
        //if(targetid==myid1){
          //console.log(targetid);
          box17395.nukeTooltip();
          if(targetid.slice(0,10)=="icon_info_"){
            //icon_info_label_XXXXX
            mytitle=targetid.slice(16);
            //console.log("targetid="+targetid);
            $("#sctfiltererror").css("display","none");
            // get info from trackInfo
						var result=queryTrackDataByLabel(view.brwsr.trackData, mytitle);
            for(var i=0; i<result.length; i++){
              if(result[i]["network"]==view.brwsr.currentNetwork)
                break;
            }
            var type=result[i]["type"];
            var url=result[i]["url"];
            var label=result[i]["label"];
            var title=result[i]["key"];
            //tooltip.show("Type: "+type+'<br/>'+"Name: "+ title); 
            //balloon17394.showTooltip(event, "<b>Type: </b>"+type+'<br/>'+"<b>Name: </b>"+ title); 
            var myTrackInfoDiv;
            myTrackInfoDiv=$("#currentTrackInfoTooltipDiv");
            if(!myTrackInfoDiv.length){
              myTrackInfoDiv=$("<div>").attr("id","currentTrackInfoTooltipDiv").css("display","none");
              $(view.elem).append($(myTrackInfoDiv));
            }
            view.brwsr.loadTrackInfo(label, title,"currentTrackInfoTooltipDiv", false, '');
            box17395.showTooltip(event, "load:currentTrackInfoTooltipDiv", 1, 500);
          }
       // }
    });
    }
    var myid3="icon_delete_label_"+track.name;
    var myid3_esc="icon_delete_label_"+Util.jqSelector(track.name);
    if(view.trackDeleteMouseOverHandlers[myid3]==undefined){
      view.trackDeleteMouseOverHandlers[myid3]=$("#"+myid3_esc).on("mouseenter", function(event){
		  	$(this).addClass("labeldropmenudivhover");
		  });
        $("#"+myid3_esc).on("mouseleave", function(event){
		  	$(this).removeClass("labeldropmenudivhover");
		  });
			/*
      view.trackDeleteMouseOverHandlers[myid3]=$("#"+myid3).on("mouseover",function(event){
        var targetid=$(event.target).attr("id");
        if(targetid.slice(0,12)=="icon_delete_"){
          balloon17394.showTooltip(event, "Click to remove the track");
        }
    });
				*/
    }
    if(view.trackDeleteClickHandlers[myid3]==undefined){
      view.trackDeleteClickHandlers[myid3]=$("#"+myid3_esc).on("click", function(event){
			/*
        var targetid=$(event.target).attr("id");
        if(targetid.slice(0,12)=="icon_delete_"){
          view.removeTrack(event);
        }
				*/
          view.removeTrack(myid3);
    });
    }
		var myexportid="icon_export_label_"+track.name;
		var myexportid_esc="icon_export_label_"+Util.jqSelector(track.name);
		if(view.trackExportMouseOverHandlers[myexportid]==undefined){
      view.trackExportMouseOverHandlers[myexportid]=$("#"+myexportid_esc).on("mouseenter", function(event){
		  	$(this).addClass("labeldropmenudivhover");
		  });
        $("#"+myexportid_esc).on("mouseleave", function(event){
		  	$(this).removeClass("labeldropmenudivhover");
		  });
		}
		if(view.trackExportClickHandlers[myexportid]==undefined){
			view.trackExportClickHandlers[myexportid]=$("#"+myexportid_esc).on("click", function(event){
				var targetid=myexportid;
				box17395.nukeTooltip();
				var trackPath;
				if(view.checkTrackType(track)=="SimpleTrack"){
				  trackPath=track.trackUrl;
				}
				else if(view.checkTrackType(track)=="CompositeTrack"){
				  trackPath=track.int_url;
				}
			 // disable size info for now. it is not accurate.
			 /*
				$.ajax({
					url:"download_raw_track_size.php?path="+trackPath,
					type:"GET",
					dataType:"text",
					async:false,
					success: function(o) { $("#mytrackexportsize").text(o); },
					error: function() { console.log("error downloading file"); }
				});
				*/
				box17395.showTooltip(event, "load:trackExportFormTooltipDiv", 1, 250);
				// set the submit button to the correct location and make it visible
				var myExportSubmitButton=$("#trackExportFormSubmitButton");
				//console.log(box17395);
				var margin=Math.round(box17395.padding/2);
				box17395.doShowTooltip();
				$('#sctfiltererror').css("display","none");
				var balloonTop   = box17395.getLoc('visibleBalloonElement','y1');
				var balloonRight = box17395.getLoc('visibleBalloonElement','x2');
				myExportSubmitButton.css("display","block");
				var myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
				var myExportSubmitButtonWidth=parseInt(myExportSubmitButton.css("width"));
				var myExportSubmitButtonHeight=parseInt(myExportSubmitButton.css("height"));
				var myExportSubmitButtonPaddingX=parseInt(myExportSubmitButton.css("padding-left"))+parseInt(myExportSubmitButton.css("padding-right"));
				var myExportSubmitButtonPaddingY=parseInt(myExportSubmitButton.css("padding-top"))+parseInt(myExportSubmitButton.css("padding-bottom"));
				var myExportSubmitButtonBorderX=parseInt(myExportSubmitButton.css("border-left-width"))+parseInt(myExportSubmitButton.css("border-left-width"));
				var myExportSubmitButtonBorderY=parseInt(myExportSubmitButton.css("border-bottom-width"))+parseInt(myExportSubmitButton.css("border-top-width"));
				myExportSubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-myExportSubmitButtonHeight-myExportSubmitButtonPaddingY-myExportSubmitButtonBorderY)+'px');
				myExportSubmitButton.css("left", (balloonRight-margin-myExportSubmitButtonWidth-myExportSubmitButtonPaddingX-myExportSubmitButtonBorderX-5)+'px');
				if(view.trackExportFormSubmitButtonHandler){
					$(myExportSubmitButton).off("click");
				}
				view.trackExportFormSubmitButtonHandler=true;
				$(myExportSubmitButton).on("click", function(){
					var selectedValue=Util.getCheckedRadioValueByName('myTrackExportRadioButtons');
					if(selectedValue=="export_data"){
						var trackExportOpenWindowForm=$("<form>");
						$(trackExportOpenWindowForm).attr({"id":"trackExportOpenWindowForm", "target":"export_raw_track", "method":"post", "action":"download_raw_track.php"});
						var trackExportOpenWindowFormInput=$("<input>");
						var input_data={};
					  input_data["path"]=track.int_url;
						input_data["ruler"]=view.ruler;
						input_data["type"]=track.dataType;
						input_data["name"]=track.name;
						if(track.sampleInfoFile){
						  input_data["tsi"]=1;
						}
						$(trackExportOpenWindowFormInput).attr({"id":"trackExportOpenWindowFormInput","type":"hidden", "name":"input_data", "value": JSON.stringify(input_data)});
						$(trackExportOpenWindowForm).append($(trackExportOpenWindowFormInput));
						$("body").append($(trackExportOpenWindowForm));
						var raw_track_window=window.open("", "export_raw_track");
						if (raw_track_window) {
							$("#trackExportOpenWindowForm").submit();
							$("#trackExportOpenWindowForm").remove();
						}
						//window.open("download_raw_track.php?path="+track.trackUrl,"_blank");
					}
					else{ //export image
						console.log("not yet");
					}
					box17395.nukeTooltip();
					$("#trackExportFormSubmitButton").css("display","none");  
				}
				);
			});
		}
    /* collapse the tracks to view only enabled genes */
    var mycollapseID="icon_collapse_label_"+track.name;
    var mycollapseID_esc="icon_collapse_label_"+Util.jqSelector(track.name);
    if(typeof track.isCollapseEnabled == 'function'){
    var enabledIndices=track.isCollapseEnabled(startBp, endBp);
    var collapsed_l=enabledIndices.length;
    if(collapsed_l>=view.brwsr.minCollapseSize && collapsed_l<view.brwsr.maxCollapseSize){
      if($("#"+mycollapseID_esc).length>0){
        $("#"+mycollapseID_esc+" img").attr("src","images/collapse.png");
      }
      if(view.trackCollapseMouseOverHandlers[mycollapseID]==undefined){
				view.trackCollapseMouseOverHandlers[mycollapseID]=$("#"+mycollapseID_esc).on("mouseenter", function(event){
					$(this).addClass("labeldropmenudivhover");
				});
					$("#"+mycollapseID_esc).on("mouseleave", function(event){
					$(this).removeClass("labeldropmenudivhover");
				});
				/*
        view.trackCollapseMouseOverHandlers[mycollapseID]=$("#"+mycollapseID).on("mouseover", function(event){
          var targetid=$(event.target).attr("id");
          if(targetid.slice(0,14)=="icon_collapse_"){
            balloon17394.showTooltip(event, "Click to collapse the track");
          }
       });
					*/
      }
      if(view.trackCollapseClickHandlers[mycollapseID]==undefined){
        view.trackCollapseClickHandlers[mycollapseID]=$("#"+mycollapseID_esc).on("click", function(event){
         // var targetid=$(event.target).attr("id");
					var targetid=mycollapseID;
          //if(targetid==mycollapseID){
           // figure out what is the current enabled 
            view.createCollapsedPage(enabledIndices);
         // }
        });
      }
      else{
				$("#"+mycollapseID_esc).off("click");
        view.trackCollapseClickHandlers[mycollapseID]=undefined;
        view.trackCollapseClickHandlers[mycollapseID]=$("#"+mycollapseID_esc).on("click", function(event){
          //var targetid=$(event.target).attr("id");
          //if(targetid==mycollapseID){
           // figure out what is the current enabled 
            view.createCollapsedPage(enabledIndices);
          //}
        });
      }
     }
     else{ //disable the button
       if($("#"+mycollapseID_esc).length>0){
          $("#"+mycollapseID_esc+" img").attr("src","images/collapse_disabled.png");
          if(view.trackCollapseClickHandlers[mycollapseID]){
            $("#"+mycollapseID_esc).off("click");
						$("#"+mycollapseID_esc).off("mouseenter");
						$("#"+mycollapseID_esc).off("mouseleave");
            view.trackCollapseClickHandlers[mycollapseID]=undefined;
            view.trackCollapseMouseOverHandlers[mycollapseID]=undefined;
          }
       }
     }
    }
    var myid2="icon_related_label_"+track.name;
    var myid2_esc="icon_related_label_"+Util.jqSelector(track.name);
    // for those tracks that 'related' tracks don't apply
    if(view.getRelatedTracksMouseOverHandlers[myid2]==undefined){
				view.getRelatedTracksMouseOverHandlers[myid2]=$("#"+myid2_esc).on("mouseenter", function(event){
					$(this).addClass("labeldropmenudivhover");
				});
					$("#"+myid2_esc).on("mouseleave", function(event){
					$(this).removeClass("labeldropmenudivhover");
				});
			/*
      view.getRelatedTracksMouseOverHandlers[myid2]=$("#"+myid2).on("mouseover", function(event){
        var targetid=$(event.target).attr("id");
        if(targetid.slice(0,13)=="icon_related_"){
          balloon17394.showTooltip(event, "Click to show <a style='color:red;font-weight:bold'>r</a>elated tracks");
        }
    });
				*/
    }
    if(view.getRelatedTracksClickHandlers[myid2]==undefined){
        view.getRelatedTracksClickHandlers[myid2]=$("#"+myid2_esc).on("click", function(event){
//        var targetid=$(event.target).attr("id");
				var targetid=myid2;
//        if(targetid==myid2){
          box17395.nukeTooltip();
          box17395.showTooltip(event, "load:relatedTracksFormTooltipDiv", 1, 250);
          // set the submit button to the correct location and make it visible
          var mySubmitButton=$("#relatedTracksFormSubmitButton");
          //console.log(box17395);
          var margin=Math.round(box17395.padding/2);
          box17395.doShowTooltip();
          $('#sctfiltererror').css("display","none");
          var balloonTop   = box17395.getLoc('visibleBalloonElement','y1');
          var balloonRight = box17395.getLoc('visibleBalloonElement','x2');
          mySubmitButton.css("display","block");
					mySubmitButton.addClass("disabledbutton");
					mySubmitButton.off("click");
          var myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
          var mySubmitButtonWidth=parseInt(mySubmitButton.css("width"));
          var mySubmitButtonHeight=parseInt(mySubmitButton.css("height"));
          var mySubmitButtonPaddingX=parseInt(mySubmitButton.css("padding-left"))+parseInt(mySubmitButton.css("padding-right"));
          var mySubmitButtonPaddingY=parseInt(mySubmitButton.css("padding-top"))+parseInt(mySubmitButton.css("padding-bottom"));
          var mySubmitButtonBorderX=parseInt(mySubmitButton.css("border-left-width"))+parseInt(mySubmitButton.css("border-left-width"));
          var mySubmitButtonBorderY=parseInt(mySubmitButton.css("border-bottom-width"))+parseInt(mySubmitButton.css("border-top-width"));
          mySubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-mySubmitButtonHeight-mySubmitButtonPaddingY-mySubmitButtonBorderY)+'px');
          mySubmitButton.css("left", (balloonRight-margin-mySubmitButtonWidth-mySubmitButtonPaddingX-mySubmitButtonBorderX-5)+'px');
          if(view.getRelatedTracksSubmitButtonHandler){
					  $(mySubmitButton).off("click");
					}
					var checkRelatedAllRequired=function(){
            var getRelatedRadioVal=Util.getCheckedRadioValueByName('myRelatedTracksTooltipRadioButtons');
            var getRelatedFDRRadioVal=Util.getCheckedRadioValueByName('myRelatedTracksTooltipFDR');
						mySubmitButton.addClass("disabledbutton");
						mySubmitButton.off("click");
						var allOK=false;
						if(getRelatedRadioVal && getRelatedFDRRadioVal){
						  allOK=true;
						}
						else{
						  allOK=false;
						}
						if(allOK){
							$(mySubmitButton).removeClass("disabledbutton");
							view.getRelatedTracksSubmitButtonHandler=true;
							$(mySubmitButton).on("click", function(){
									var selectedValue=Util.getCheckedRadioValueByName('myRelatedTracksTooltipRadioButtons');
									var selectedFDRValue=Util.getCheckedRadioValueByName('myRelatedTracksTooltipFDR');
									view.myRelatedTracksTooltipRadioButtons=selectedValue;
									view.curRelatedTracksCategory=selectedValue;
									view.getRelatedTracks(targetid, selectedValue, selectedFDRValue);
									box17395.nukeTooltip();
									$("#relatedTracksFormSubmitButton").css("display","none");  
								}
							);
						}
					};
         $("input[name='myRelatedTracksTooltipRadioButtons']").off("change");
				 $("input[name='myRelatedTracksTooltipRadioButtons']").on("change",function(){
						 checkRelatedAllRequired();
						 });
         $("input[name='myRelatedTracksTooltipFDR']").off("change");
				 $("input[name='myRelatedTracksTooltipFDR']").on("change",function(){
						 checkRelatedAllRequired();
						 });
    });
    }
    var myid_network_analysis="icon_network_analysis_label_"+track.name;
    var myid_network_analysis_esc="icon_network_analysis_label_"+Util.jqSelector(track.name);
    // for those tracks that 'related' tracks don't apply
    if(view.networkAnalysisMouseOverHandlers[myid_network_analysis]==undefined){
				view.networkAnalysisMouseOverHandlers[myid_network_analysis]=$("#"+myid_network_analysis_esc).on("mouseenter", function(event){
					$(this).addClass("labeldropmenudivhover");
				});
					$("#"+myid_network_analysis_esc).on("mouseleave", function(event){
					$(this).removeClass("labeldropmenudivhover");
				});
    }
    if(view.networkAnalysisClickHandlers[myid_network_analysis]==undefined){
        view.networkAnalysisClickHandlers[myid_network_analysis]=$("#"+myid_network_analysis_esc).on("click", function(event){
//      var targetid=$(event.target).attr("id");
        if(track.dataType=="sct"){
          $("#na_sbtonly").css({"display":"none"});
          $("#na_sbtonly_2").css({"display":"none"});
					$("#na_sbt_sct").css({"margin-bottom":"20px"});
					$("#na_sbt_sct_input").after($("<div>").attr({"id":"na_blank"}).css({"height":"10px"}));
					$("#myNetworkAnalysisTrackNameError").css({"display":"none"});
				}
				else{
          $("#na_sbtonly").css({"display":"block"});
          $("#na_sbtonly_2").css({"display":"block"});
					$("#na_sbt_sct").css({"margin-bottom":"5px"});
					$("#myNetworkAnalysisTrackNameError").css({"display":"block"});
					if($("#na_blank").length>0){
					 $("#na_blank").remove();
					}
				}
				var targetid=myid_network_analysis;
          box17395.nukeTooltip();
          box17395.showTooltip(event, "load:networkAnalysisFormTooltipDiv", 1, 300);
          // set the submit button to the correct location and make it visible
          var mySubmitButton=$("#networkAnalysisFormSubmitButton");
          //console.log(box17395);
          var margin=Math.round(box17395.padding/2);
          box17395.doShowTooltip();
          var balloonTop   = box17395.getLoc('visibleBalloonElement','y1');
          var balloonRight = box17395.getLoc('visibleBalloonElement','x2');
          mySubmitButton.css("display","block");
					$(mySubmitButton).addClass("disabledbutton");
					$(mySubmitButton).off("click");
          var myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
          var mySubmitButtonWidth=parseInt(mySubmitButton.css("width"));
          var mySubmitButtonHeight=parseInt(mySubmitButton.css("height"));
          var mySubmitButtonPaddingX=parseInt(mySubmitButton.css("padding-left"))+parseInt(mySubmitButton.css("padding-right"));
          var mySubmitButtonPaddingY=parseInt(mySubmitButton.css("padding-top"))+parseInt(mySubmitButton.css("padding-bottom"));
          var mySubmitButtonBorderX=parseInt(mySubmitButton.css("border-left-width"))+parseInt(mySubmitButton.css("border-left-width"));
          var mySubmitButtonBorderY=parseInt(mySubmitButton.css("border-bottom-width"))+parseInt(mySubmitButton.css("border-top-width"));
          mySubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-mySubmitButtonHeight-mySubmitButtonPaddingY-mySubmitButtonBorderY)+'px');
          mySubmitButton.css("left", (balloonRight-margin-mySubmitButtonWidth-mySubmitButtonPaddingX-mySubmitButtonBorderX-5)+'px');
					// check if some of the radio button needs to be disabled.
					var total=track.data.reduce(function (a, b) { return a + b; }, 0);
				  if(total>view.brwsr.maxTrackSizeForExtension){	
            $("input[id='networkAnalysisAllNeighbor']:radio").attr('disabled',true);  
						$("span[id='networkAnalysisAllNeighborLabel']").css({'color':'gray'});
					}
					else{
            $("input[id='networkAnalysisAllNeighbor']:radio").attr('disabled',false);  
						$("span[id='networkAnalysisAllNeighborLabel']").css({'color':'black'});
					}
					// check if we should enable the click button
					var checkAllRequired=function(){
						var naEnrichedModuleFDRVal,naEnrichedNeighborFDRVal,naEnrichedSeedsFDRVal;
						$(mySubmitButton).addClass("disabledbutton");
						$(mySubmitButton).off("click");
						// update button Y position
						myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
						mySubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-mySubmitButtonHeight-mySubmitButtonPaddingY-mySubmitButtonBorderY)+'px');
						var naRadioVal=Util.getCheckedRadioValueByName('myNetworkAnalysisTooltipRadioButtons');
						if(naRadioVal=="na_module_enrichment"){
							naEnrichedModuleFDRVal=Util.getCheckedRadioValueByName("enrichedModuleFDR");
						}
						else if(naRadioVal=="na_enriched_neighbors"){
							naEnrichedNeighborFDRVal=Util.getCheckedRadioValueByName("enrichedNeighborsFDR");
						}
						else if(naRadioVal=="na_enriched_seeds"){
							naEnrichedSeedsFDRVal=Util.getCheckedRadioValueByName("enrichedSeedsFDR");
						}
						var allOK=false;
						if(naRadioVal && naRadioVal=="na_module_enrichment" && naEnrichedModuleFDRVal){
						  allOK=true;
						}
						else if( (naRadioVal && naRadioVal=="na_enriched_neighbors" && naEnrichedNeighborFDRVal) ||  (naRadioVal && naRadioVal=="na_all_neighbors" && !$("input[id='networkAnalysisAllNeighbor']:radio").attr('disabled')) ){
							if($("#myNetworkAnalysisNewTrackName",$("#contentWrapper")).val()!=""){
								if(checkUserTrackName("myNetworkAnalysisNewTrackName", "myNetworkAnalysisTrackNameError", "contentWrapper")){
									allOK=true;
								}
							}
						}
						else if( (naRadioVal && naRadioVal=="na_enriched_seeds" && naEnrichedSeedsFDRVal) ){
							if($("#myNetworkAnalysisNewTrackName2",$("#contentWrapper")).val()!=""){
								if(checkUserTrackName("myNetworkAnalysisNewTrackName2", "myNetworkAnalysisTrackNameError", "contentWrapper")){
									allOK=true;
								}
							}
						}
						if(allOK){
							$(mySubmitButton).removeClass("disabledbutton");
							$(mySubmitButton).on("click", function(){
								var selectedValue=Util.getCheckedRadioValueByName('myNetworkAnalysisTooltipRadioButtons');
								view.myNetworkAnalysisTooltipRadioButtons=selectedValue;
								var input_data={};
								var networkType=view.brwsr.currentNetworkType();
								var currentNetwork=view.brwsr.currentNetwork;
								var newTrackName=checkUserTrackName("myNetworkAnalysisNewTrackName", "myNetworkExpansionTrackNameError", "contentWrapper");
								var newTrackName2=checkUserTrackName("myNetworkAnalysisNewTrackName2", "myNetworkExpansionTrackNameError", "contentWrapper");
								input_data["networkType"]=networkType;
								input_data["currentNetwork"]=currentNetwork;
								input_data["analysis_type"]=selectedValue;
								if(selectedValue=="na_all_neighbors" || selectedValue=="na_enriched_neighbors" || selectedValue=="na_enriched_seeds"){
									if(selectedValue=="na_all_neighbors"||selectedValue=="na_enriched_neighbors"){
										input_data["new_track_name"]=newTrackName;
										if(selectedValue=="na_enriched_neighbors"){
								      input_data["fdr"]=Util.getCheckedRadioValueByName('enrichedNeighborsFDR');
										}
									}
									else{
										input_data["new_track_name"]=newTrackName2;
								    input_data["fdr"]=Util.getCheckedRadioValueByName('enrichedSeedsFDR');
									}
									view.networkAnalysis(targetid, input_data);
								}
								else if(selectedValue=="na_module_enrichment"){
									view.curRelatedTracksCategory=view.brwsr.currentNetwork+"_module";
									//console.log(view.curRelatedTracksCategory);
									view.getRelatedTracks(targetid, view.curRelatedTracksCategory, Util.getCheckedRadioValueByName('enrichedModuleFDR'));
								}
								box17395.nukeTooltip();
								$("#networkAnalysisFormSubmitButton").css("display","none");  
							});
						}
						else{
							// update button Y position
							myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
							mySubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-mySubmitButtonHeight-mySubmitButtonPaddingY-mySubmitButtonBorderY)+'px');
							$(mySubmitButton).addClass("disabledbutton");
							$(mySubmitButton).off("click");
						}
					};
					$("input[name='myNetworkAnalysisTooltipRadioButtons']").off("change");
					$("input[name='myNetworkAnalysisTooltipRadioButtons']").on("change",function(){
						var selectedVal=Util.getCheckedRadioValueByName('myNetworkAnalysisTooltipRadioButtons');
						if(track.dataType=="sbt"){
						  view.networkAnalysisSelectedValue=selectedVal;
						}
						if(selectedVal=="na_module_enrichment"){
						  $("#enrichedModuleFDRcutoff",$("#contentWrapper")).show();
							$("#enrichedNeighborsFDRcutoff", $("#contentWrapper")).hide();
							$("#enrichedSeedsFDRcutoff", $("#contentWrapper")).hide();
						}
						else if(selectedVal=="na_enriched_neighbors"){
						  $("#enrichedModuleFDRcutoff",$("#contentWrapper")).hide();
							$("#enrichedNeighborsFDRcutoff", $("#contentWrapper")).show();
							$("#enrichedSeedsFDRcutoff", $("#contentWrapper")).hide();
						}
						else if(selectedVal=="na_enriched_seeds"){
						  $("#enrichedModuleFDRcutoff",$("#contentWrapper")).hide();
							$("#enrichedSeedsFDRcutoff", $("#contentWrapper")).show();
							$("#enrichedNeighborsFDRcutoff", $("#contentWrapper")).hide();
						}
						else{   // all neighbors
						  $("#enrichedModuleFDRcutoff", $("#contentWrapper")).hide();
							$("#enrichedNeighborsFDRcutoff", $("#contentWrapper")).hide();
							$("#enrichedSeedsFDRcutoff", $("#contentWrapper")).hide();
						}
							// update button Y position
							myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
              mySubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-mySubmitButtonHeight-mySubmitButtonPaddingY-mySubmitButtonBorderY)+'px');
						checkAllRequired();
					});
					$("input[name='enrichedModuleFDR']").off("change");
					$("input[name='enrichedModuleFDR']").on("change",function(){
						view.enricheModuleFDRValue=Util.getCheckedRadioValueByName('enrichedModuleFDR');
						checkAllRequired();
					});
					$("input[name='enrichedNeighborsFDR']").off("change");
					$("input[name='enrichedNeighborsFDR']").on("change",function(){
						view.enrichedNeighborsFDRValue=Util.getCheckedRadioValueByName('enrichedNeighborsFDR');
						checkAllRequired();
					});
					$("input[name='enrichedSeedsFDR']").off("change");
					$("input[name='enrichedSeedsFDR']").on("change",function(){
						view.enrichedSeedsFDRValue=Util.getCheckedRadioValueByName('enrichedSeedsFDR');
						checkAllRequired();
					});
					$("input[id='myNetworkAnalysisNewTrackName']").off("keyup");
					$("input[id='myNetworkAnalysisNewTrackName']").on("keyup",function(evt){
						$("#myNetworkAnalysisTrackNameError",$("#contentWrapper")).html("");
						view.networkAnalysisTrackName=$("#myNetworkAnalysisNewTrackName",$("#contentWrapper")).val();
						checkAllRequired();
					});
					$("input[id='myNetworkAnalysisNewTrackName2']").off("keyup");
					$("input[id='myNetworkAnalysisNewTrackName2']").on("keyup",function(evt){
						$("#myNetworkAnalysisTrackNameError",$("#contentWrapper")).html("");
						view.networkAnalysisTrackName2=$("#myNetworkAnalysisNewTrackName2",$("#contentWrapper")).val();
						checkAllRequired();
					});
					// if this is an sct track, there is no much choice  
					if(track.dataType=="sct"){
					  $("input:radio[name='myNetworkAnalysisTooltipRadioButtons'][value='na_module_enrichment']").prop('checked',true).change();
					}
					else{// otherwise, restore the previous selected value
						if(view.networkAnalysisSelectedValue!=""){
							$("input:radio[name='myNetworkAnalysisTooltipRadioButtons'][value='"+view.networkAnalysisSelectedValue+"']").prop('checked',true).change();
							if(view.networkAnalysisSelectedValue=="na_enriched_neighbors"){
								if(view.enrichedNeighborsFDRValue!=""){
									$("input:radio[name='enrichedNeighborsFDR'][value='"+view.enrichedNeighborsFDRValue+"']").prop('checked',true).change();
								}
							}
							if(view.networkAnalysisSelectedValue=="na_enriched_seeds"){
								if(view.enrichedSeedsFDRValue!=""){
									$("input:radio[name='enrichedSeedsFDR'][value='"+view.enrichedSeedsFDRValue+"']").prop('checked',true).change();
								}
							}
						}
						if(view.networkAnalysisTrackName!=""){
							$("#myNetworkAnalysisNewTrackName",$("#contentWrapper")).val(view.networkAnalysisTrackName).keyup();   
						}
						if(view.networkAnalysisTrackName2!=""){
							$("#myNetworkAnalysisNewTrackName2",$("#contentWrapper")).val(view.networkAnalysisTrackName2).keyup();   
						}
					}
    });
    }
    // dt: data transform
    var myid_dt="icon_transform_label_"+track.name;
    var myid_dt_esc="icon_transform_label_"+Util.jqSelector(track.name);
    // for those tracks that 'related' tracks don't apply
    if(view.dtMouseOverHandlers[myid_dt]==undefined){
				view.dtMouseOverHandlers[myid_dt]=$("#"+myid_dt_esc).on("mouseenter", function(event){
					$(this).addClass("labeldropmenudivhover");
				});
					$("#"+myid_dt_esc).on("mouseleave", function(event){
					$(this).removeClass("labeldropmenudivhover");
				});
    }
    if(view.dtClickHandlers[myid_dt]==undefined){
			view.dtClickHandlers[myid_dt]=$("#"+myid_dt_esc).on("click", function(event){
				var targetid=myid_dt;
				box17395.nukeTooltip();
				// depending on the track type, we have different options for data transformation
				$("#dtinputs").empty();
				$("#dtinputs").css("margin-left","5px");
				var dt_category;
				var dt_item;
				var dt_obj=view.brwsr.dataTransform[track.dataType];
				var dt_i;
				var category_i=0;
				/*
				// get input value from cookie, e.g. the value is a string of format: 1,2,0,1
				// if cookie does not exist, the last value of each category is checked ("no action")
				var checked_string=$.cookie(view.brwsr.container.id+"-"+track.name); 
				var checked_value;
				if(checked_string){
				checked_value=checked_string.split(","); 
				}
				else{
				checked_value=[];
				}
				*/
				$("#dtinputs").append($("<hr/>"));
				if(track.dataType=="sct"){
					$("#dtTooltipDiv").css("width","300px");
					$("#dtError").css("width","250px");
					$("#dtinputs").append($("<p>").html("<b>Set y-axis range</b>")); 
					$("#dtinputs").append($("<p>").html("current range: <span id='dtsctrange_l' class='colortext'></span> to <span id='dtsctrange_r' class='colortext'></span>")); 
					$("#dtinputs").append($("<p>").html("new range: <span id='dtsctnewrange_l' class='colortext'>??</span> to <span id='dtsctnewrange_r' class='colortext'>??</span>")); 
					$("#dtinputs").append($("<p>").html("Enter a number between <b>"+track.origMinVal+"</b> and <b>"+track.origMaxVal+"</b>")); 
					$("#dtinputs").append($("<input>").attr({"type":"text","id":"dtsctnewrangeinput"}));
				}
				else{  // cct
					$("#dtTooltipDiv").css("width","400px");
					$("#dtError").css("width","350px");
					for(dt_category in dt_obj){
						$("#dtinputs").append($("<p>").html(dt_category).css("font-weight","bold"));
						for(dt_i=0; dt_i<dt_obj[dt_category].length; dt_i++){
							dt_item=dt_obj[dt_category][dt_i];
							$("#dtinputs").append($("<input>").attr({"type":"radio", "id":"data_transform_cat_"+category_i+"_"+dt_i, "value":dt_i.toString(), "name":"data_transform_cat_"+category_i}));
							$("#dtinputs").append($("<label>").attr({"for":"data_transform_cat_"+category_i+"_"+dt_i}).text(dt_item+" "));
						}
						if(category_i<Object.keys(dt_obj).length-1){
							$("#dtinputs").append($("<hr/>"));
						}
						$("input:radio[name='data_transform_cat_"+category_i+"']").filter("[value='"+track.geneWiseTrans+"']").attr("checked", true);
						/*
						// set the checked value for the current category
						if(checked_value.length==0){  // no cookie set
						$("input:radio[name='data_transform_cat_"+category_i+"']").filter("[value='0']").attr("checked", true);
						}
						else{
						$("input:radio[name='data_transform_cat_"+category_i+"']").filter("[value='"+checked_value[category_i]+"']").attr("checked", true);
						}
						*/
						category_i++;
					}
					$("#dtinputs").append($("<p>").html("<b>Select a color scale scheme:</b>"));
					$("#dtinputs").append($("<div>").attr("id","dtcolorscale"));
					$("#dtcolorscale").append($("<input>").attr({"type":"radio","name":"dt_colorscheme", "id":"dt_colorscheme_1", "value":"BWR"})); // blue-white-red
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_l_1").addClass("colortext2"));
          $("#dtcolorscale").append($("<img>").attr("src","images/color_scale.png").css({"margin":"0px 5px 0px 5px", "height":"20px","width":"150px"}));
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_r_1").addClass("colortext2"));
					/*
					$("#dtcolorscale").append($("<p>"));
					$("#dtcolorscale").append($("<input>").attr({"type":"radio","name":"dt_colorscheme", "id":"dt_colorscheme_2", "value":"GCR"})); // green-cream-red
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_l_2").addClass("colortext2"));
          $("#dtcolorscale").append($("<img>").attr("src","images/color_scale_gcr.png").css({"margin":"0px 5px 0px 5px", "height":"20px","width":"150px"}));
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_r_2").addClass("colortext2"));
					*/
					$("#dtcolorscale").append($("<p>"));
					$("#dtcolorscale").append($("<input>").attr({"type":"radio","name":"dt_colorscheme", "id":"dt_colorscheme_3", "value":"GYR"})); // green-yellow-red
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_l_3").addClass("colortext2"));
          $("#dtcolorscale").append($("<img>").attr("src","images/color_scale_gyr.png").css({"margin":"0px 5px 0px 5px", "height":"20px","width":"150px"}));
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_r_3").addClass("colortext2"));
					/*
					$("#dtcolorscale").append($("<p>"));
					$("#dtcolorscale").append($("<input>").attr({"type":"radio","name":"dt_colorscheme", "id":"dt_colorscheme_4", "value":"GKR"})); // green-black-red
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_l_4").addClass("colortext2"));
          $("#dtcolorscale").append($("<img>").attr("src","images/color_scale_gkr.png").css({"margin":"0px 5px 0px 5px", "height":"20px","width":"150px"}));
					$("#dtcolorscale").append($("<span>").attr("id","dtcctrange_r_4").addClass("colortext2"));
					*/
					$("#dtinputs").append($("<p>").html("Enter a number to set the new color scale")); 
					$("#dtinputs").append($("<input>").attr({"type":"text","id":"dtcctnewrangeinput"}));
					$("input:radio[name='dt_colorscheme']").filter("[value='"+track.colorScheme+"']").attr("checked", true);
				}
				$("div#dtError").text("");
				box17395.showTooltip(event, "load:dtTooltipDiv", 1, 450);
				// set the submit button to the correct location and make it visible
				var mydtSubmitButton=$("#dtSubmitButton");
				var margin=Math.round(box17395.padding/2);
				box17395.doShowTooltip();
				var balloonTop   = box17395.getLoc('visibleBalloonElement','y1');
				var balloonRight = box17395.getLoc('visibleBalloonElement','x2');
				mydtSubmitButton.css("display","block");
				var myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
				var mydtSubmitButtonWidth=parseInt(mydtSubmitButton.css("width"));
				var mydtSubmitButtonHeight=parseInt(mydtSubmitButton.css("height"));
				var mydtSubmitButtonPaddingX=parseInt(mydtSubmitButton.css("padding-left"))+parseInt(mydtSubmitButton.css("padding-right"));
				var mydtSubmitButtonPaddingY=parseInt(mydtSubmitButton.css("padding-top"))+parseInt(mydtSubmitButton.css("padding-bottom"));
				var mydtSubmitButtonBorderX=parseInt(mydtSubmitButton.css("border-left-width"))+parseInt(mydtSubmitButton.css("border-left-width"));
				var mydtSubmitButtonBorderY=parseInt(mydtSubmitButton.css("border-bottom-width"))+parseInt(mydtSubmitButton.css("border-top-width"));
				mydtSubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-mydtSubmitButtonHeight-mydtSubmitButtonPaddingY-mydtSubmitButtonBorderY)+'px');
				mydtSubmitButton.css("left", (balloonRight-margin-mydtSubmitButtonWidth-mydtSubmitButtonPaddingX-mydtSubmitButtonBorderX-5)+'px');
				if(view.dtSubmitButtonHandler){
					$(mydtSubmitButton).off("click");
				}
				var mydtResetButton=$("#dtResetButton");
				mydtResetButton.css("display","block");
				var mydtResetButtonWidth=parseInt(mydtResetButton.css("width"));
				var mydtResetButtonHeight=parseInt(mydtResetButton.css("height"));
				var mydtResetButtonPaddingX=parseInt(mydtResetButton.css("padding-left"))+parseInt(mydtResetButton.css("padding-right"));
				var mydtResetButtonPaddingY=parseInt(mydtResetButton.css("padding-top"))+parseInt(mydtResetButton.css("padding-bottom"));
				var mydtResetButtonBorderX=parseInt(mydtResetButton.css("border-left-width"))+parseInt(mydtResetButton.css("border-left-width"));
				var mydtResetButtonBorderY=parseInt(mydtResetButton.css("border-bottom-width"))+parseInt(mydtResetButton.css("border-top-width"));
				mydtResetButton.css("top", (balloonTop+margin+myTooltipDivHeight-mydtResetButtonHeight-mydtResetButtonPaddingY-mydtResetButtonBorderY)+'px');
				mydtResetButton.css("left", (parseInt(mydtSubmitButton.css("left"))-mydtSubmitButtonWidth-10)+'px');
				if(view.dtResetButtonHandler){
					$(mydtResetButton).off("click");
				}
				var updateSubmitButtonPos=function(){
					myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
					mydtSubmitButton.css("top", (balloonTop+margin+myTooltipDivHeight-mydtSubmitButtonHeight-mydtSubmitButtonPaddingY-mydtSubmitButtonBorderY)+'px');
					mydtResetButton.css("top", parseInt(mydtSubmitButton.css("top"))+'px');
				};
				var spans=$("#visibleBalloonElement span");
				updateSubmitButtonPos();
				if(track.dataType=="sct"){
          $(spans).eq(0).html(track.origMaxVal);
          $(spans).eq(1).html(track.origMinVal);
					if(track.yaxis_top==null && track.yaxis_bottom==null){
						if(track.origMaxVal*track.origMinVal<0){
							var fmax=Math.abs(track.origMaxVal);
							var fmin=Math.abs(track.origMinVal);
							var mycutoff;
							if(fmax>fmin){
								mycutoff=fmax;
							}
							else{
								mycutoff=fmin;
							}
							track.yaxis_top=mycutoff;
							track.yaxis_bottom=-1.0*mycutoff;
							$(spans).eq(2).html(track.yaxis_bottom);
							$(spans).eq(3).html(track.yaxis_top);
						}
						else{
							$(spans).eq(2).html(track.origMinVal);
							$(spans).eq(3).html(track.origMaxVal);
						}
					}
           else{
             $(spans).eq(2).html(track.yaxis_bottom);
             $(spans).eq(3).html(track.yaxis_top);
           }
					var sct_newrangeinput=$("input#dtsctnewrangeinput", $("#visibleBalloonElement"));
					if(view.dtInputKeyUpHandler){
						$(sct_newrangeinput).off("keyup");
					}
					$(sct_newrangeinput).on("keyup",function(){
						if(sct_newrangeinput.val()!=""){
							var input_max=parseFloat(sct_newrangeinput.val(), 10);
							$("div#dtError").text("");
              $("#dtSubmitButton").addClass("disabledbutton");
              $("#dtsctnewrange_l",$("#visibleBalloonElement")).text("??");
              $("#dtsctnewrange_r",$("#visibleBalloonElement")).text("??");
							if(!$.isNumeric(input_max)){
								$("div#dtError").text("You must enter a valid number.");
							}
							else if(input_max>track.origMaxVal || input_max<track.origMinVal){
								$("div#dtError").text("Please enter a number within the range specified above.");
							}
              else{
                $("#dtSubmitButton").removeClass("disabledbutton");
                var low,high;
                if(track.origMaxVal>0 && track.origMinVal<0){
                  high=Math.abs(input_max);
                  low=-1.0*high;
                }
                else if(track.origMinVal>=0){ // all positive
                  low=0;
                  high=input_max;  // input already in the correct range 
                }
                else if(track.origMaxVal<=0){ // all negative
                  high=0; 
                  low=input_max;
                }
                $("#dtsctnewrange_l",$("#visibleBalloonElement")).text(low.toString());
                $("#dtsctnewrange_r",$("#visibleBalloonElement")).text(high.toString());
              }
							updateSubmitButtonPos();
						}
            else{ // no input
              $("#dtSubmitButton").addClass("disabledbutton");
              $("#dtsctnewrange_l",$("#visibleBalloonElement")).text("??");
              $("#dtsctnewrange_r",$("#visibleBalloonElement")).text("??");
							$("div#dtError").text("");
							updateSubmitButtonPos();
            }
					});
          $(mydtSubmitButton).on("click", function(){ 
            if($("#dtSubmitButton").hasClass("disabledbutton")){
              return;
            }       
            else{
              track.yaxis_top=parseFloat($("#dtsctnewrange_r",$("#visibleBalloonElement")).text());
              track.yaxis_bottom=parseFloat($("#dtsctnewrange_l",$("#visibleBalloonElement")).text());
              box17395.nukeTooltip();
              $("#dtResetButton").css("display","none");
              $("#dtSubmitButton").css("display","none");
              view.showVisibleBlocks(true);
            }
           });
					 $(mydtResetButton).on("click", function(){
					   if(track.origMaxVal*track.origMinVal<0){
						 var fmax=Math.abs(track.origMaxVal);
						 var fmin=Math.abs(track.origMinVal);
						 var mycutoff;
						 if(fmax>fmin){
							 mycutoff=fmax;
						 }
						 else{
							 mycutoff=fmin;
						 }
						 track.yaxis_top=mycutoff;
						 track.yaxis_bottom=-1.0*mycutoff;
						 }
						 else{
						   track.yaxis_top=track.origMaxVal;
						   track.yaxis_bottom=track.origMinVal;
						 }
						 box17395.nukeTooltip();
						 $("#dtResetButton").css("display","none");
						 $("#dtSubmitButton").css("display","none");
						 view.showVisibleBlocks(true);
					 });
				}
				else{ //cct
				  $("#dtSubmitButton").removeClass("disabledbutton");
					if(track.origMaxVal==null && track.origMinVal==null){
						$.ajax({
							type: "GET",
							url:track.trackUrl,
							async: false,
							dataType: "text",
							success: function(o) {
								var lines=o.split("\n");
								// only read the first few lines that start with "#"
								for(var i=0; i<lines.length-1; i++){
									if(lines[i].match("#MAX")){
										var orig_max_str=lines[i].split("=")[1];
										var orig_max=parseFloat(orig_max_str);
										track.origMaxVal=orig_max;
										$(spans).eq(0).html(orig_max);
									}
									else if(lines[i].match("#MIN")){
										var orig_min_str=lines[i].split("=")[1];
										var orig_min=parseFloat(orig_min_str);
										track.origMinVal=orig_min;
										$(spans).eq(1).html(orig_min);
									}
									else if(!lines[i].match("^\s*\#")){
										break;
									}
								}
							},
							error: function() {
								console.log("error loading track"+track.name);
							}
						});
					}
					else{
						$(spans).eq(0).html(track.origMaxVal);
						$(spans).eq(1).html(track.origMinVal);
					}
					if(track.colorscale_l==null && track.colorscale_r==null){
            var fmax=Math.abs(track.origMaxVal);
						var fmin=Math.abs(track.origMinVal);
						if(fmax>fmin){
              track.colorscale_l=-1.0*fmax;
							track.colorscale_r=fmax;
						}
						else{
              track.colorscale_l=-1.0*fmin;
							track.colorscale_r=fmin;
						}
					}
          $("#dtcctrange_l_1",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
          $("#dtcctrange_r_1",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
					/*
          $("#dtcctrange_l_2",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
          $("#dtcctrange_r_2",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
					*/
          $("#dtcctrange_l_3",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
          $("#dtcctrange_r_3",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
					/*
          $("#dtcctrange_l_4",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
          $("#dtcctrange_r_4",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
					*/
					var cct_newrangeinput=$("input#dtcctnewrangeinput", $("#visibleBalloonElement"));
					if(view.dtInputKeyUpHandler){
						$(cct_newrangeinput).off("keyup");
					}
					$(cct_newrangeinput).on("keyup",function(){
						if(cct_newrangeinput.val()!=""){
							var input_max=parseFloat(cct_newrangeinput.val(), 10);
							$("div#dtError").text("");
              $("#dtSubmitButton").addClass("disabledbutton");
              $("#dtcctrange_l_1",$("#visibleBalloonElement")).text("??");
              $("#dtcctrange_r_1",$("#visibleBalloonElement")).text("??");
							/*
              $("#dtcctrange_l_2",$("#visibleBalloonElement")).text("??");
              $("#dtcctrange_r_2",$("#visibleBalloonElement")).text("??");
							*/
              $("#dtcctrange_l_3",$("#visibleBalloonElement")).text("??");
              $("#dtcctrange_r_3",$("#visibleBalloonElement")).text("??");
							/*
              $("#dtcctrange_l_4",$("#visibleBalloonElement")).text("??");
              $("#dtcctrange_r_4",$("#visibleBalloonElement")).text("??");
							*/
							if(!$.isNumeric(input_max)){
								$("div#dtError").text("You must enter a valid number.");
							}
              else{
                $("#dtSubmitButton").removeClass("disabledbutton");
                var low,high;
                high=Math.abs(input_max);
                low=-1.0*high;
                $("#dtcctrange_l_1",$("#visibleBalloonElement")).text(low.toString());
                $("#dtcctrange_r_1",$("#visibleBalloonElement")).text(high.toString());
								/*
                $("#dtcctrange_l_2",$("#visibleBalloonElement")).text(low.toString());
                $("#dtcctrange_r_2",$("#visibleBalloonElement")).text(high.toString());
								*/
                $("#dtcctrange_l_3",$("#visibleBalloonElement")).text(low.toString());
                $("#dtcctrange_r_3",$("#visibleBalloonElement")).text(high.toString());
								/*
                $("#dtcctrange_l_4",$("#visibleBalloonElement")).text(low.toString());
                $("#dtcctrange_r_4",$("#visibleBalloonElement")).text(high.toString());
								*/
              }
							updateSubmitButtonPos();
						}
            else{ // no input
              $("#dtcctrange_l_1",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
              $("#dtcctrange_r_1",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
							/*
              $("#dtcctrange_l_2",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
              $("#dtcctrange_r_2",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
							*/
              $("#dtcctrange_l_3",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
              $("#dtcctrange_r_3",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
							/*
              $("#dtcctrange_l_4",$("#visibleBalloonElement")).text(track.colorscale_l.toString());
              $("#dtcctrange_r_4",$("#visibleBalloonElement")).text(track.colorscale_r.toString());
							*/
							$("div#dtError").text("");
              $("#dtSubmitButton").removeClass("disabledbutton");
							updateSubmitButtonPos();
            }
					});
          $(mydtSubmitButton).on("click", function(){ 
            if($("#dtSubmitButton").hasClass("disabledbutton")){
              return;
            }       
						else{
							track.colorscale_l=parseFloat($("#dtcctrange_l_1",$("#visibleBalloonElement")).text());
							track.colorscale_r=parseFloat($("#dtcctrange_r_1",$("#visibleBalloonElement")).text());
							var checked=$("input[name=data_transform_cat_0]:checked", $("#contentWrapper"));
							for(var i=0; i<checked.length; i++){
								track.geneWiseTrans=parseInt(checked[i].value,10);
							}
							checked=$("input[name=dt_colorscheme]:checked", $("#contentWrapper"));
							track.colorScheme=checked[0].value;
							/*
							for(var i=0; i<checked.length; i++){
								track.geneWiseTrans=parseInt(checked[i].value,10);
							}
							*/
							box17395.nukeTooltip();
							$("#dtResetButton").css("display","none");
							$("#dtSubmitButton").css("display","none");
							view.showVisibleBlocks(true);
						}
           });
					 $(mydtResetButton).on("click", function(){
					   track.geneWiseTrans=0;
						 track.colorScheme="BWR";
						 track.colorscale_l=null;
						 track.colorscale_r=null;
						 box17395.nukeTooltip();
						 $("#dtResetButton").css("display","none");
						 $("#dtSubmitButton").css("display","none");
						 view.showVisibleBlocks(true);
					 });
				}
				view.dtInputKeyUpHandler=true;
				view.dtSubmitButtonHandler=true;
				view.dtResetButtonHandler=true;
				/*
				var checked_string="";
				var dt_obj=view.brwsr.dataTransform[track.dataType];
				var checked=$("input[type=radio]:checked", $("#contentWrapper"));
				for(var i=0; i<checked.length; i++){
				checked_string+=checked[i].value; 
				if(i!=checked.length-1){
				checked_string+=",";
				}
				}
				// save the current selection to cookie
				$.cookie(view.brwsr.container.id+"-"+track.name, checked_string, {expires: 60});
				box17395.nukeTooltip();
				$("#dtSubmitButton").css("display","none");  
				view.showVisibleBlocks(true);
				*/
			});
		}
    var myfilterid="icon_filter_label_"+track.name;
    var myfilterid_esc="icon_filter_label_"+Util.jqSelector(track.name);
    if(view.SCT_FilterMouseOverHandlers[myfilterid]==undefined){
				view.SCT_FilterMouseOverHandlers[myfilterid]=$("#"+myfilterid_esc).on("mouseenter", function(event){
					$(this).addClass("labeldropmenudivhover");
				});
					$("#"+myfilterid_esc).on("mouseleave", function(event){
					$(this).removeClass("labeldropmenudivhover");
				});
			/*
      view.SCT_FilterMouseOverHandlers[myfilterid]=$("#"+myfilterid).on("mouseover", function(event){
        var targetid=$(event.target).attr("id");
        if(targetid.slice(0,12)=="icon_filter_"){
            balloon17394.showTooltip(event, "Click to add a <a style='color:red;font-weight:bold;'>f</a>iltered track");
           }
        });
			 */
        }
       if(view.SCT_FilterClickHandlers[myfilterid]==undefined){
        view.SCT_FilterClickHandlers[myfilterid]=$("#"+myfilterid_esc).on("click", function(event){
       // var targetid=$(event.target).attr("id");
        var targetid=myfilterid;
//        if(targetid==myfilterid){
          box17395.nukeTooltip();
          box17395.showTooltip(event, "load:SCTFilterTooltipDiv", 1, 350);
          // set the submit button to the correct location and make it visible
          var myFilterSubmitButton=$("#SCTFilterSubmitButton");
          var margin=Math.round(box17395.padding/2);
          box17395.doShowTooltip();
          //console.log(YAHOO.util.Dom.getRegion('visibleBalloonElement'));
          var balloonTop=box17395.getLoc('visibleBalloonElement','y1');
          var balloonRight=box17395.getLoc('visibleBalloonElement','x2');
          var balloonLeft=box17395.getLoc('visibleBalloonElement','x1');
          $(myFilterSubmitButton).css("display","block");
          $("#sctfiltererror").css("display","none");
          var myTooltipDivHeight=parseInt($("#visibleBalloonElement").css("height"));
          var myFilterSubmitButtonWidth=parseInt(myFilterSubmitButton.css("width"));
          var myFilterSubmitButtonHeight=parseInt(myFilterSubmitButton.css("height"));
          var myFilterSubmitButtonPaddingX=parseInt(myFilterSubmitButton.css("padding-left"))+parseInt(myFilterSubmitButton.css("padding-right"));
          var myFilterSubmitButtonPaddingY=parseInt(myFilterSubmitButton.css("padding-top"))+parseInt(myFilterSubmitButton.css("padding-bottom"));
          var myFilterSubmitButtonBorderX=parseInt(myFilterSubmitButton.css("border-left-width"))+parseInt(myFilterSubmitButton.css("border-right-width"));
          var myFilterSubmitButtonBorderY=parseInt(myFilterSubmitButton.css("border-bottom-width"))+parseInt(myFilterSubmitButton.css("border-top-width"));
          myFilterSubmitButton.css("top",(balloonTop+margin+myTooltipDivHeight-myFilterSubmitButtonHeight-myFilterSubmitButtonPaddingY-myFilterSubmitButtonBorderY)+"px");
          myFilterSubmitButton.css("left",(balloonRight-margin-myFilterSubmitButtonWidth-myFilterSubmitButtonPaddingX-myFilterSubmitButtonBorderX-5)+"px");
          var errormsg=$("#sctfiltererror");
          $(errormsg).css({"top":balloonTop+margin+myTooltipDivHeight-myFilterSubmitButtonHeight-myFilterSubmitButtonPaddingY-myFilterSubmitButtonBorderY-30+"px","left":balloonLeft+margin+5+"px"});
          // set the max and min for the current track
				 var spans=$("#visibleBalloonElement span");
				 $(spans).eq(0).html(track.origMaxVal);
				 $(spans).eq(1).html(track.origMinVal);
        // add some event handler to the input boxes
        var focusColor="#EBF5DF";
        var unfocusColor="#FFF";
			  var allSctFilterInputs=$("input", $("#visibleBalloonElement"));
        var boxIndex=[1,3,5,6,8,9];
				var radioIndex=[0,2,4,4,7,7];
        var resetAllBoxBackgroundColor=function(){
          for(var i=0; i<6; i++){
            var box=$(allSctFilterInputs).eq(boxIndex[i]); 
            $(box).css("background-color","#FFF");
          }    
        }
        // create focus and blur event handler for each box
				var i;
				var currentBox;
				view.SCTFilterBoxOnFocusHandler=[];
				view.SCTFilterBoxOnBlurHandler=[];
        var SCTFilterTrackNameInput=$("#filterUserTrackTitle", $("#visibleBalloonElement")); 
				if(view.SCTFilterTrackNameInputHandler){
				  $(SCTFilterTrackNameInput).off("keyup");
				}
				view.SCTFilterTrackNameInputHandler=true;
				$(SCTFilterTrackNameInput).on("keyup",function(){
				   var input_val=$(SCTFilterTrackNameInput).val();
					 var errormsg;
					 $("#sctfiltererror").html("");
					 if(input_val.match(/[^a-zA-Z0-9-_ ]/g)!=null){
						 errormsg="Track title can only contain a-z, A-Z, 0-9, space,'-' and '_'.<br/>";
						 $("#sctfiltererror").html(errormsg);
				     $("#sctfiltererror").css({"color":"red", "display":"block"});
					 }
				  });
				function createBoxEventHandler(idx){
         return function(){
						currentBox=$(allSctFilterInputs).eq(boxIndex[idx]); 
						if(view.SCTFilterBoxOnFocusHandler[idx]){
							$(currentBox).off("focus");
						}
						if(view.SCTFilterBoxOnBlurHandler[idx]){
							$(currentBox).off("blur");
						}
						view.SCTFilterBoxOnFocusHandler[idx]=function(){
							var box=$(allSctFilterInputs).eq(boxIndex[idx]);
							var radioButton=$(allSctFilterInputs).eq(radioIndex[idx]);
							radioButton.prop("checked",true);
							resetAllBoxBackgroundColor();
							$(box).css("background-color",focusColor).val("");
						};
						view.SCTFilterBoxOnBlurHandler[idx]=function(){
							var box=$(allSctFilterInputs).eq(boxIndex[idx]);
							$(box).css("background-color",unfocusColor);
						};
						$(currentBox).on("focus",view.SCTFilterBoxOnFocusHandler[idx]);
						$(currentBox).on("blur",view.SCTFilterBoxOnBlurHandler[idx]);
				 }
				}
				for(i=0; i<6; i++){
				  createBoxEventHandler(i)();
				}
        if(view.SCTFilterSubmitButtonHandler){
          $("#SCTFilterSubmitButton").off("click");
				}
        view.SCTFilterSubmitButtonHandler=function(cur_min,cur_max, label, data){
          return function(event){
            if(view.filterTrackSubmitButtonClicked(cur_min, cur_max, label, data)==0){
              box17395.nukeTooltip();
              $("#SCTFilterSubmitButton").css("display", "none");
              $("#sctfiltererror").css("display","none");
            }
          };
        }; 
        $(myFilterSubmitButton).on("click", function(){
					 //console.log("filter submit button clicked");
				   view.SCTFilterSubmitButtonHandler(track.filterMin, track.filterMax, track.name, track.filterOriginalData)();
					 });
     // }        
    });    
    }
    var myid="icon_graph_label_"+track.name;
    var myid_esc="icon_graph_label_"+Util.jqSelector(track.name);
    if(typeof track.isCytoscapeWebEnabled == 'function') { 
      if(track.isCytoscapeWebEnabled(startBp, endBp)){
        //console.debug(track.name+" cytoscape enabled");
        if($("#"+myid_esc).length>0){
          $("#"+myid_esc+" img").attr("src","images/graph.png");
				}
        if(view.cytoScapeMouseOverHandlers[myid]==undefined)
					view.cytoScapeMouseOverHandlers[myid]=$("#"+myid_esc).on("mouseenter", function(event){
						$(this).addClass("labeldropmenudivhover");
					});
						$("#"+myid_esc).on("mouseleave", function(event){
						$(this).removeClass("labeldropmenudivhover");
					});
					/*
          view.cytoScapeMouseOverHandlers[myid]=$("#"+myid).on("mouseover", function(event){
						var targetid=$(event.target).attr("id");
            if(targetid.slice(0,11)=="icon_graph_"){
              balloon17394.showTooltip(event, "Click to draw a <a style='color:red;font-weight:bold;'>g</a>raph of present nodes in current view");
            }
          });
						*/
      // console.debug(track.name+" connecting....");
      if(view.cytoScapeClickHandlers[myid]==undefined)
				view.cytoScapeClickHandlers[myid]=$("#"+myid_esc).on("click", function(event){
					//  var targetid=$(event.target).attr("id");
					var targetid=myid;
					//  if(targetid==myid){
						view.currentCytoScapeDialogId="cytoScapeDialog_"+Util.randomString(8);
						var currentDialogDiv=$("<div>").attr("id",view.currentCytoScapeDialogId); 
						var cytoscapeDiv=$("<div>").attr("id",view.currentCytoScapeDialogId+"_cytoscape").css({"width":"1000px","height":"500px","margin-bottom":"5px"});
						var exportCytoscapeDiv=$("<div>").attr("id",view.currentCytoScapeDialogId+"_export").html("Export as: <form id='"+view.currentCytoScapeDialogId+"_pdf_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='pdf'></form><form id='"+view.currentCytoScapeDialogId+"_png_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='png'></form><form id='"+view.currentCytoScapeDialogId+"_graphml_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='graphml'></form><form id='"+view.currentCytoScapeDialogId+"_svg_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='svg'></form><form id='"+view.currentCytoScapeDialogId+"_xgmml_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='xgmml'></form><form id='"+view.currentCytoScapeDialogId+"_sif_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='sif'></form>");
						var exportCytoscapeSelect=$("<select>").appendTo(exportCytoscapeDiv);
						$(exportCytoscapeSelect).append('<option value="pdf">pdf</option>').append('<option value="png">png</option>').append('<option value="graphml">graphml</option>').append('<option value="svg">svg</option>').append('<option value="xgmml">xgmml</option>').append('<option value="sif">sif</option>');
						var exportCytoscapeButton=$("<button>").attr("id",view.currentCytoScapeDialogId+"_button").html("Export").css("margin-left","10px").appendTo($(exportCytoscapeDiv));
						$(exportCytoscapeButton).button();
						$(cytoscapeDiv).appendTo($(currentDialogDiv));
						$(exportCytoscapeDiv).appendTo($(currentDialogDiv));
						currentDialogDiv.dialog({
							autoOpen: true,
							title: 'Graph View',
							modal:true,
							height:'600',
							width:'1050',
							open: function(){
								box17395.nukeTooltip();
							},
							close: function(){
								$(this).dialog("destroy");
								$(this).remove();
							},
							resizable:false
						});
						// initialization options
						var options = {
							swfPath: "js/cytoscapeweb/swf/CytoscapeWeb",
							flashInstallerPath: "js/cytoscape/swf/playerProductInstall"
						};
						// init and draw
						var vis = new org.cytoscapeweb.Visualization(view.currentCytoScapeDialogId+"_cytoscape", options);
						var startBp=Math.round(view.minVisible());                                               
						var endBp=Math.round(view.maxVisible());
						var draw_option=track.getCytoscapeDrawOption(startBp, endBp);
						$(exportCytoscapeButton).on("click", function(event){
							var type=$(exportCytoscapeSelect).val();
							if(type=="pdf"){
								$("#"+view.currentCytoScapeDialogId+"_pdf_form [name=content]").val(vis.pdf());
								$("#"+view.currentCytoScapeDialogId+"_pdf_form").submit();
							}
							else if(type=="png"){
								$("#"+view.currentCytoScapeDialogId+"_png_form [name=content]").val(vis.png());
								$("#"+view.currentCytoScapeDialogId+"_png_form").submit();
							}
							else if(type=="svg"){
								$("#"+view.currentCytoScapeDialogId+"_svg_form [name=content]").val(vis.svg());
								$("#"+view.currentCytoScapeDialogId+"_svg_form").submit();
							}
							else if(type=="graphml"){
								$("#"+view.currentCytoScapeDialogId+"_graphml_form [name=content]").val(vis.graphml());
								$("#"+view.currentCytoScapeDialogId+"_graphml_form").submit();
							}
							else if(type=="xgmml"){
								$("#"+view.currentCytoScapeDialogId+"_xgmml_form [name=content]").val(vis.xgmml());
								$("#"+view.currentCytoScapeDialogId+"_xgmml_form").submit();
							}
							else if(type=="sif"){
								$("#"+view.currentCytoScapeDialogId+"_sif_form [name=content]").val(vis.sif());
								$("#"+view.currentCytoScapeDialogId+"_sif_form").submit();
							}
							//vis.exportNetwork(type, 'export_cytoscape.php?type='+type, {'window':'_new'});
						});
						vis.draw(draw_option); 
						//}
				});
      }
      else{
        // console.debug(track.name+" cytoscape disabled");
        if($("#"+myid_esc).length>0){
          $("#"+myid_esc+" img").attr("src","images/graph-disabled.png");
          if(view.cytoScapeClickHandlers[myid]){
            $("#"+myid_esc).off("click");
            $("#"+myid_esc).off("mouseenter");
            $("#"+myid_esc).off("mouseleave");
            view.cytoScapeClickHandlers[myid]=undefined;
            view.cytoScapeMouseOverHandlers[myid]=undefined;
          }
        }
      }
    }
    var mybigid="icon_graph_big_label_"+track.name;
    var mybigid_esc="icon_graph_big_label_"+Util.jqSelector(track.name);
    if(typeof track.isBigCytoscapeWebEnabled == 'function') { 
      if(track.isBigCytoscapeWebEnabled(startBp, endBp)){
        //console.debug(track.name+" cytoscape enabled");
        if($("#"+mybigid_esc).length>0){
          $("#"+mybigid_esc+" img").attr("src","images/graph-big.png");
				}
        if(view.cytoScapeMouseOverHandlers[mybigid]==undefined)
					view.cytoScapeMouseOverHandlers[mybigid]=$("#"+mybigid_esc).on("mouseenter", function(event){
						$(this).addClass("labeldropmenudivhover");
					});
						$("#"+mybigid_esc).on("mouseleave", function(event){
						$(this).removeClass("labeldropmenudivhover");
					});
					/*
          view.cytoScapeMouseOverHandlers[mybigid]=$("#"+mybigid).on("mouseover", function(event){
					  var targetid=$(event.target).attr("id");
            if(targetid.slice(0,15)=="icon_graph_big_"){
            balloon17394.showTooltip(event, "Click to draw a <a style='color:red;font-weight:bold;'>G</a>raph of all nodes in the current view");
           }
          });
					 */
      // console.debug(track.name+" connecting....");
      if(view.cytoScapeClickHandlers[mybigid]==undefined)
        view.cytoScapeClickHandlers[mybigid]=$("#"+mybigid_esc).on("click", function(event){
//				var targetid=$(event.target).attr("id");
				var targetid=mybigid;
 //       if(targetid==mybigid){
          view.currentCytoScapeDialogId="cytoScapeDialog_"+Util.randomString(8);
        var currentDialogDiv=$("<div>").attr("id",view.currentCytoScapeDialogId);
        var cytoscapeDiv=$("<div>").attr("id",view.currentCytoScapeDialogId+"_cytoscape").css({"width":"1000px","height":"500px","margin-bottom":"5px"});
						var exportCytoscapeDiv=$("<div>").attr("id",view.currentCytoScapeDialogId+"_export").html("Export as: <form id='"+view.currentCytoScapeDialogId+"_pdf_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='pdf'></form><form id='"+view.currentCytoScapeDialogId+"_png_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='png'></form><form id='"+view.currentCytoScapeDialogId+"_graphml_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='graphml'></form><form id='"+view.currentCytoScapeDialogId+"_svg_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='svg'></form><form id='"+view.currentCytoScapeDialogId+"_xgmml_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='xgmml'></form><form id='"+view.currentCytoScapeDialogId+"_sif_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='sif'></form>");
						var exportCytoscapeSelect=$("<select>").appendTo(exportCytoscapeDiv);
						$(exportCytoscapeSelect).append('<option value="pdf">pdf</option>').append('<option value="png">png</option>').append('<option value="graphml">graphml</option>').append('<option value="svg">svg</option>').append('<option value="xgmml">xgmml</option>').append('<option value="sif">sif</option>');
						var exportCytoscapeButton=$("<button>").attr("id",view.currentCytoScapeDialogId+"_button").html("Export").css("margin-left","10px").appendTo($(exportCytoscapeDiv));
						$(exportCytoscapeButton).button();
						$(cytoscapeDiv).appendTo($(currentDialogDiv));
						$(exportCytoscapeDiv).appendTo($(currentDialogDiv));
						currentDialogDiv.dialog({
							autoOpen: true,
							title: 'Graph View',
							modal:true,
							height:'600',
							width:'1050',
							close: function(){
								$(this).dialog("destroy");
								$(this).remove();
							},
							resizable:false
						});
						// initialization options
						var options = {
							// where you have the Cytoscape Web SWF
							swfPath: "js/cytoscapeweb/swf/CytoscapeWeb",
							// where you have the Flash installer SWF
							flashInstallerPath: "js/cytoscape/swf/playerProductInstall"
						};
						// init and draw
						var vis = new org.cytoscapeweb.Visualization(view.currentCytoScapeDialogId+"_cytoscape", options);
						var startBp=Math.round(view.minVisible());                                               
						var endBp=Math.round(view.maxVisible());
						var draw_option=track.getBigCytoscapeDrawOption(startBp, endBp);
						$(exportCytoscapeButton).on("click", function(event){
							var type=$(exportCytoscapeSelect).val();
							//      vis.exportNetwork(type, 'export_cytoscape.php?type='+type, {'window':'_new'});
							if(type=="pdf"){
								$("#"+view.currentCytoScapeDialogId+"_pdf_form [name=content]").val(vis.pdf());
								$("#"+view.currentCytoScapeDialogId+"_pdf_form").submit();
							}
							else if(type=="png"){
								$("#"+view.currentCytoScapeDialogId+"_png_form [name=content]").val(vis.png());
								$("#"+view.currentCytoScapeDialogId+"_png_form").submit();
							}
							else if(type=="svg"){
								$("#"+view.currentCytoScapeDialogId+"_svg_form [name=content]").val(vis.svg());
								$("#"+view.currentCytoScapeDialogId+"_svg_form").submit();
							}
							else if(type=="graphml"){
								$("#"+view.currentCytoScapeDialogId+"_graphml_form [name=content]").val(vis.graphml());
								$("#"+view.currentCytoScapeDialogId+"_graphml_form").submit();
							}
							else if(type=="xgmml"){
								$("#"+view.currentCytoScapeDialogId+"_xgmml_form [name=content]").val(vis.xgmml());
								$("#"+view.currentCytoScapeDialogId+"_xgmml_form").submit();
							}
							else if(type=="sif"){
								$("#"+view.currentCytoScapeDialogId+"_sif_form [name=content]").val(vis.sif());
								$("#"+view.currentCytoScapeDialogId+"_sif_form").submit();
							}
						});
						vis.draw(draw_option); 
        //}
      });
      }
      else{
        // console.debug(track.name+" cytoscape disabled");
        if($("#"+mybigid_esc).length>0){
          $("#"+mybigid_esc+" img").attr("src","images/graph-big-disabled.png");
          if(view.cytoScapeClickHandlers[mybigid]){
            $("#"+mybigid_esc).off("click");
            $("#"+mybigid_esc).off("mouseenter");
            $("#"+mybigid_esc).off("mouseleave");
            view.cytoScapeClickHandlers[mybigid]=undefined;
            view.cytoScapeMouseOverHandlers[mybigid]=undefined;
          }
        }
      }
    }
    var mySampleIconID="icon_sample_label_"+track.name;
    var mySampleIconID_esc="icon_sample_label_"+Util.jqSelector(track.name);
		// test if sample info file is available
		if(track.sampleInfoFile){
			if(view.compsiteSampleHeatMouseOverHandlers[mySampleIconID]==undefined){
				view.compsiteSampleHeatMouseOverHandlers[mySampleIconID]=$("#"+mySampleIconID_esc).on("mouseenter", function(event){
					$(this).addClass("labeldropmenudivhover");
				});
				$("#"+mySampleIconID_esc).on("mouseleave", function(event){
					$(this).removeClass("labeldropmenudivhover");
				});
			}
			if(view.compsiteSampleHeatClickHandlers[mySampleIconID]==undefined){
				view.compsiteSampleHeatClickHandlers[mySampleIconID]=$("#"+mySampleIconID_esc).click(function(e){
					/*  var event=window.event || e;                                             
					var mytarget=event.target || event.srcElement;
					var targetid=mytarget.id;           
					*/
					var targetid=mySampleIconID;           
					if(targetid.slice(0,12)=="icon_sample_"){
						if(track.dataType!="sst"){
							var sample_heatmap_div_container_id="sample_heatmap_"+track.name+"_container"; 
							var sample_heatmap_div_container=$("#"+Util.jqSelector(sample_heatmap_div_container_id)).first();
							var sample_heatmap_div_id="sample_heatmap_"+track.name; 
							var sample_heatmap_title_div_id="sample_heatmap_title_"+track.name; 
							var sample_heatmap_show_title_icon_div_id="sample_heatmap_"+track.name+"_show_feature_title"; 
							var sample_heatmap_show_title_icon_img_id=sample_heatmap_show_title_icon_div_id+"_icon"; 
							var sample_heatmap_div=$("#"+Util.jqSelector(sample_heatmap_div_id)).first();
							var sample_heatmap_title_div=$("#"+Util.jqSelector(sample_heatmap_title_div_id)).first();
							var sample_heatmap_show_title_icon_div=$("#"+Util.jqSelector(sample_heatmap_show_title_icon_div_id)).first(); 
							var sample_heatmap_show_title_icon_img=$("#"+Util.jqSelector(sample_heatmap_show_title_icon_img_id)).first(); 
							var labelOffset=$("#label_"+Util.jqSelector(track.name)).first().offset();
							labelOffset.left=labelOffset.left-250; 
							$(sample_heatmap_div_container).offset(labelOffset);
							$(sample_heatmap_div).offset(labelOffset);
							if($(sample_heatmap_div).css("visibility")=="hidden"){
								//$(sample_heatmap_div).css({"visibility":"visible"});
								// get the position of label
								view.brwsr.visibleSampleAnnotationCount++;
								//console.log("visible sample heatmap "+view.brwsr.visibleSampleAnnotationCount);
								if(view.brwsr.visibleSampleAnnotationCount>0){
									view.brwsr.hideLeftPane();
								}
								// get the track height
								// $(sample_heatmap_div).animate({height: track.height});
								$(sample_heatmap_div).css({"height": track.height+"px"});
								$(sample_heatmap_div).css({"visibility":"visible"});
								//console.log($(sample_heatmap_div).css("visibility"));
								if(track.addedSampleFeatures.length>0){
									$(sample_heatmap_show_title_icon_div).css("visibility","visible");
									$(sample_heatmap_show_title_icon_img).attr("src","images/downarrow.png");
								}
							}
							else{
								if($("#sample_feature_select_div_"+Util.jqSelector(track.name)).length>0){
									$("#sample_feature_select_div_"+Util.jqSelector(track.name)).remove();
								}
								$(sample_heatmap_div).css({"height":"0px"});
								$(sample_heatmap_div).css({"visibility":"hidden"})
								// if sample title div is visible, hide it
								$(sample_heatmap_title_div).css("visibility","hidden");
								$(sample_heatmap_show_title_icon_div).css("visibility","hidden");
								//console.log($(sample_heatmap_div).css("visibility"));
								view.brwsr.visibleSampleAnnotationCount--;
								//console.log("visible sample heatmap "+view.brwsr.visibleSampleAnnotationCount);
								if(view.brwsr.visibleSampleAnnotationCount==0){
									view.brwsr.showLeftPane();
								}
							}
						}
						else{  // "sst" track
							var sampleCount=track.sampleArray.length;
							var sample_heatmap_div_container_id="sample_heatmap_"+track.name+"_container"; 
							var sample_heatmap_div_container=$("#"+Util.jqSelector(sample_heatmap_div_container_id)).first();
							var sample_heatmap_div_id="sample_heatmap_"+track.name; 
							var sample_heatmap_div=$("#"+Util.jqSelector(sample_heatmap_div_id)).first();
							var labelOffset=$("#label_"+Util.jqSelector(track.name)).first().offset();
							labelOffset.left=labelOffset.left-250; 
							$(sample_heatmap_div_container).offset(labelOffset);
							$(sample_heatmap_div).offset(labelOffset);
							if($(sample_heatmap_div).css("visibility")=="hidden"){
                $("#"+Util.jqSelector(sample_heatmap_div_id)+" .sstSampleName").empty();
								view.brwsr.visibleSampleAnnotationCount++;
								if(view.brwsr.visibleSampleAnnotationCount>0){
									view.brwsr.hideLeftPane();
								}
								$(sample_heatmap_div).css({"height": track.height+"px"});
								$(sample_heatmap_div).css({"visibility":"visible"});
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
							else{
								$(sample_heatmap_div).css({"height":"0px"});
								$(sample_heatmap_div).css({"visibility":"hidden"})
								view.brwsr.visibleSampleAnnotationCount--;
								if(view.brwsr.visibleSampleAnnotationCount==0){
									view.brwsr.showLeftPane();
								}
							}
						}
					}
				});
			}
		}
		else{   // no sample info available
			$("#"+mySampleIconID_esc+" img").attr("src","images/sample_disabled.png");
			if(view.compsiteSampleHeatClickHandlers[mySampleIconID]){
				$("#"+mySampleIconID_esc).off("click");
				$("#"+mySampleIconID_esc).off("mouseenter");
				$("#"+mySampleIconID_esc).off("mouseleave");
				view.compsiteSampleHeatClickHandlers[mySampleIconID]=undefined;
				view.compsiteSampleHeatMouseOverHandlers[mySampleIconID]=undefined;
			}
		}
    var myStatsIconID="icon_stats_label_"+track.name;
    var myStatsIconID_esc="icon_stats_label_"+Util.jqSelector(track.name);
		// test if sample info file is available
		if(track.sampleInfoFile){
			if(view.statsMouseOverHandlers[myStatsIconID]==undefined){
				view.statsMouseOverHandlers[myStatsIconID]=$("#"+myStatsIconID_esc).on("mouseenter", function(event){
					$(this).addClass("labeldropmenudivhover");
				});
				$("#"+myStatsIconID_esc).on("mouseleave", function(event){
					$(this).removeClass("labeldropmenudivhover");
				});
			}
		 if(view.statsClickHandlers[myStatsIconID]==undefined){
		   view.statsClickHandlers[myStatsIconID]=$("#"+myStatsIconID_esc).click(function(event){
         var targetid=myStatsIconID;
				 box17395.nukeTooltip();
				 $("#statsTooltipDiv").css({"width":"300px","height":"500px"});
				 if($("#stats_select_div_"+Util.jqSelector(track.name)).length>0){
				    $("#stats_select_div_"+Util.jqSelector(track.name)).remove();
         }
          var myintUrl=track.int_url;
			    view.currentClickedStatsTrackName=track.name;
					var myUrl=track.trackUrl;
					// remove file extension
					myintUrl=myintUrl.replace(/\.[^/.]+$/, "");
					var all_features_url=myintUrl+".all_features";
					var sample_db=myintUrl+"_sample.db";
         var mystatsGoButton=$("#statsGoButton");
					$.ajax({
						type: "GET",
						url: all_features_url,
						data: null, // Don't add any data to the URL.
						dataType:"json",
						async: false,
						success: function(mydata){
							// create a drop down
							var features=mydata["features"];
							var feature_categories_exists;
							if("feature_categories" in mydata){
							  feature_categories_exists=true;
						  }
							var sorted_features=Object.keys(features).sort(function (a, b) {
							    return a.toLowerCase().localeCompare(b.toLowerCase());
									});
							// find out the features that has type "SUR"
							var feature_with_sur_type=[];
							$(sorted_features).each(function(i, val){
								//var myval=val.replace(/ /g,'_');
								if(features[val]['type']=="SUR"){
									feature_with_sur_type.push(val);
								}
							});
							// these are the features will not need to be displayed 
							var feature_no_display=[];
							$(feature_with_sur_type).each(function(i,val){
								feature_no_display.push(val+"_Time");
								feature_no_display.push(val+"_Event");
							});
      
		          $("#stats_module_gene_level_select").val("").trigger("chosen:updated");;
              var stats_select_div_id='stats_select_div_'+track.name;   
							if($("#"+Util.jqSelector(stats_select_div_id)).length==0){
								var select_div=$('<div>').attr({'id':'stats_select_div_'+track.name}).css({"display":"none"}).appendTo($('body'));
								var stats_sel = $('<select>').attr({'data-placeholder':'Search feature','id':track.name+'_stats_feature_select'}).appendTo($(select_div));
								// add a blank option
								stats_sel.append($("<option>").attr('value','').text('').addClass('option-odd'));
								if(!feature_categories_exists){
									// if the feature is already in the view, disable it (actually it will remove the feature from the list)
									$(sorted_features).each(function(i, val) {
										if($.inArray(val, feature_no_display)!=-1){
											return true;
										}
										stats_sel.append($("<option>").attr('value',this).text(this).addClass(i % 2 ? 'option-odd' : 'option-even'));
									});
								}
								else{
								  var uniq_feature_categories=mydata["feature_categories"].sort();
						      for(var ii=0; ii<uniq_feature_categories.length; ii++){
									  var cur_group=$("<optgroup>").attr('label',uniq_feature_categories[ii]).addClass("chosen-category");
										var idx=0;
										var cur_feature;
										for(var jj=0; jj<sorted_features.length; jj++){
											cur_feature=sorted_features[jj];
										   if($.inArray(cur_feature, feature_no_display)!=-1){
											   continue;
											 }
										  if(features[cur_feature]["category"]==uniq_feature_categories[ii]){
												 idx++;
                         cur_group.append($("<option>").attr('value',cur_feature).text(cur_feature).addClass(idx%2?'option-odd':'option-even')); 
											}
										}
										stats_sel.append(cur_group);
									}
								}
								$('#'+Util.jqSelector(track.name)+'_stats_feature_select').chosen({width:"200px",disable_search_threshold: 5});
								// open the drop down list by defaut
								$('.chosen-container').css({'left':'0px'});
								$('#'+Util.jqSelector(track.name)+'_stats_feature_select').chosen().change(function(){
									view.statsFeatureSelectChanged(track,sample_db,features);
								});
								// mouse over show full feature name
								$("#stats_select_div_"+Util.jqSelector(track.name)).on("mouseover","li", function(){
										$(this).attr("title", $(this).text());
								}
								);
							}
							box17395.showTooltip(event, "load:statsTooltipDiv", 1, 450);
							box17395.doShowTooltip();
							var balloonTop=box17395.getLoc('visibleBalloonElement','y1');
							var balloonLeft= box17395.getLoc('visibleBalloonElement','x1');
							var mytop=balloonTop;
							var myleft=balloonLeft+10;
							$('#stats_moduleorgene').css({"position":"absolute", "display":"block","top":(mytop+45), "left":myleft,"z-index":99999999, "height":"0px", "border-style":"none"});
							$('#stats_select_div_'+Util.jqSelector(track.name)).css({"position":"absolute","top":mytop+100, "left":myleft,"z-index":99999998, "height":"0px", "border-style":"none"});
							/*
							var selected_type=$('#stats_module_gene_level_select').val();
							if(selected_type=="_module"){
								$("#visibleBalloonElement #stats_modulelevel").css({"display":"block"});
								$("#visibleBalloonElement #stats_genelevel").css({"display":"none"});
                $('#stats_select_div_'+track.name).css({"display":"block"});
							}
							else if(selected_type=="_gene"){
								$("#visibleBalloonElement #stats_modulelevel").css({"display":"none"});
								$("#visibleBalloonElement #stats_genelevel").css({"display":"block"});
                $('#stats_select_div_'+track.name).css({"display":"block"});
							}	
              var selected_feature=$('#'+track.name+'_stats_feature_select').val();
							// if feature already selected
							if(selected_feature!=""){
									view.statsFeatureSelectChanged(track,sample_db,features);
							}
							*/
							view.updateStatsGoButtonPos();
							$(mystatsGoButton).off("click");
							$(mystatsGoButton).addClass("disabledbutton");
						}
					});
				});
		 }
		}
		else{
			$("#"+myStatsIconID_esc+" img").attr("src","images/stats_disabled.png");
			if(view.statsClickHandlers[myStatsIconID]){
				$("#"+myStatsIconID_esc).off("click");
				$("#"+myStatsIconID_esc).off("mouseenter");
				$("#"+myStatsIconID_esc).off("mouseleave");
				view.statsClickHandlers[myStatsIconID]=undefined;
				view.statsMouseOverHandlers[myStatsIconID]=undefined;
			}
		}
    // for binary/simple track,  if is hightlighted (for venn diagram), then keep highlighted
    if(track.highlighted){
      view.brwsr.highLightVennDiagramTrack('vennTracks_'+track.name,-2);
    }
});  
   this.updateSampleHeatMapDivPosition();
	 this.brwsr.coVisFormsRealTimeButtonUpdate();
};

TrackView.prototype.addTrack = function(track) {
  // var trackNum = this.tracks.length;
  var trackDiv=document.createElement("div");
  trackDiv.className="track sortable";
  trackDiv.id="track_"+track.name;
  trackDiv.track=track;
  var labelDiv=document.createElement("div");
  labelDiv.className="track-label";
  labelDiv.id="label_"+track.name;
  // mouse over show information 
  // mouse click show a new information page
  this.trackLabels.push(labelDiv);
  var view=this;
  var heightUpdate=function(height) {
    view.trackHeightUpdate(track.name, height);
  };
  track.setViewInfo(heightUpdate, this.stripeCount, trackDiv, labelDiv,
        this.stripePercent, this.stripeWidth, this.pxPerBp);
  labelDiv.style.position="absolute";
  labelDiv.style.top="0px";
  labelDiv.style.left=this.getX()+"px";
  trackDiv.appendChild(labelDiv);
  
  // if track is composite (cct,cbt), then create a sample heatmap div (hidden first)
  if(track.dataType=="cct" || track.dataType=="cbt" || track.dataType=="sst"){
    var sampleHeatMapContainer=$("<div>").attr('id',"sample_heatmap_"+track.name+"_container").addClass("sample_heatmap");
    $(sampleHeatMapContainer).css({"position":"absolute", "background":"transparent", "z-index":100, "width":"250px", "visibility":"hidden"});
    var sampleHeatMapDiv = $("<div>").attr('id',"sample_heatmap_"+track.name);
    // click to remove select
    $(sampleHeatMapDiv).click(function(){
       $("#sample_feature_select_div_"+Util.jqSelector(track.name)).remove(); 
    });
    var sampleHeatMapDivWidth=250;
    $(sampleHeatMapDiv).css({"position":"absolute", "top":"0px", "right":"0px","z-index":100, "background-color": "#FFF", "border-style":"solid", "border-color":"#8CC63F", "border-width":"1px","height":"0px", "width":"250px", "visibility":"hidden"});
    $(sampleHeatMapDiv).appendTo($(sampleHeatMapContainer));
		if(track.dataType!="sst"){
			var sampleHeatMapTitleDivID="sample_heatmap_title_"+track.name;
			var sampleHeatMapTitleDiv = $("<div>").attr('id', sampleHeatMapTitleDivID);
			var sampleHeatMapTitleHeight=100;
			$(sampleHeatMapTitleDiv).css({"position":"relative", "top":"0px", "right":"0px","z-index":100, "background-color": "#FFF", "border-style":"solid", "border-color":"#8CC63F", "border-width":"1px","height":sampleHeatMapTitleHeight+"px", "width":"250px", "border-top-style":"none", "visibility":"hidden"});
			$(sampleHeatMapTitleDiv).appendTo($(sampleHeatMapContainer));
			// create an icon for user to select features to be added
			var addFeature=$("<div>").attr("id", "sample_heatmap_"+track.name+"_add_feature");
			$(addFeature).css({"position":"relative","left":"5px", "top":"5px","width":"16px"});
			var addFeatureIcon=$("<img width='14px'>").attr("src", "images/icon_plus_2.png");
			$(addFeatureIcon).appendTo($(addFeature));
			$(addFeature).appendTo($(sampleHeatMapDiv));
		}
		// close sample heatmap 
    var closeSampleHeatmapDiv=$("<div>").attr("id", "sample_heatmap_"+track.name+"_close");
    $(closeSampleHeatmapDiv).css({"position":"relative","left":"5px", "top":"10px","width":"16px","z-index":"100"});
    var closeSampleHeatmapDivIcon=$("<img width='14px'>").attr("src", "images/icon_close_2.png");
    $(closeSampleHeatmapDivIcon).appendTo($(closeSampleHeatmapDiv));
    $(closeSampleHeatmapDiv).appendTo($(sampleHeatMapDiv));
    // create an icon for show/hide feature titles
		if(track.dataType!="sst"){
			var showFeatureTitleDivID="sample_heatmap_"+track.name+"_show_feature_title";
			var showFeatureTitle=$("<div>").attr("id", showFeatureTitleDivID);
			$(showFeatureTitle).css({"position":"absolute","left":"5px","bottom":"5px","margin-top":"5px","visibility":"hidden"});
			var showFeatureTitleIconID=showFeatureTitleDivID+"_icon";
			var showFeatureTitleIcon=$("<img>").attr({"id":showFeatureTitleIconID,"src":"images/downarrow.png", "width":"10px","height":"10px"});
			$(showFeatureTitleIcon).appendTo($(showFeatureTitle));
			$(showFeatureTitle).appendTo($(sampleHeatMapDiv));
			// toggle icon to show/hide title div
			$(showFeatureTitle).click(function(){
				var height=$(sampleHeatMapDiv).outerHeight();
				$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css({"top":height+"px"});
				if($("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css("visibility")!="hidden"){
					$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css({"visibility":"hidden"});
					$(showFeatureTitleIcon).attr({"src":"images/downarrow.png"});
				}
				else{
					$("#"+Util.jqSelector(sampleHeatMapTitleDivID)).css({"visibility":"visible"});
					$(showFeatureTitleIcon).attr({"src":"images/uparrow.png"});
					view.showSampleHeatmapTitles(track, sampleHeatMapTitleDivID, Math.floor(230/track.maxSampleFeatures));
				}
			});
		}
		$(closeSampleHeatmapDiv).click(function(){
		if($("#sample_feature_select_div_"+Util.jqSelector(track.name)).length>0){
       $("#sample_feature_select_div_"+Util.jqSelector(track.name)).remove(); 
    };
		  $(sampleHeatMapDiv).css("height","0px");
		  $(sampleHeatMapDiv).css("visibility","hidden");
			$(sampleHeatMapTitleDiv).css("visibility","hidden");
			$(showFeatureTitle).css("visibility","hidden");
		  view.brwsr.visibleSampleAnnotationCount--;
			if(view.brwsr.visibleSampleAnnotationCount==0){
			   view.brwsr.showLeftPane();
			}
		});
		$(addFeature).click(function(){
			// if the select div is there, just return
			if($("#sample_feature_select_div_"+Util.jqSelector(track.name)).length>0){
				$("#sample_feature_select_div_"+Util.jqSelector(track.name)).remove();
			}
			// get all features from server
			// replace data with int_data
			var myintUrl=track.int_url;
			// remove file extension
			myintUrl=myintUrl.replace(/\.[^/.]+$/, "");
			var all_features_url=myintUrl+".all_features";
			$.ajax({ 
				type: "GET",
				url: all_features_url,
				data: null, // Don't add any data to the URL.
				dataType:"json", 
				success: function(mydata){
					// create a drop down 
					var features=mydata["features"];
					var feature_categories_exists;
					if("feature_categories" in mydata){
						feature_categories_exists=true;
					}
					//sort ignoring case
					var sorted_features=Object.keys(features).sort(function (a, b) {
					    return a.toLowerCase().localeCompare(b.toLowerCase());
							});
					/*
					var sample_feature_select_div=$('<div>').attr({'id':'sample_feature_select_div_'+track.name}).css({'width':'200px','border-width':'0px'});
					$(sample_feature_select_div).appendTo('body'); 
					var select_div=$('<div>').attr({'id':'select_div_'+track.name}).css('width','200px').appendTo($(sample_feature_select_div));
					*/
					var select_div=$('<div>').attr({'id':'sample_feature_select_div_'+track.name}).css('width','200px').appendTo($('body'));
					//$(select_div).css({'position':'absolute', 'top':'5px'});
					var sel = $('<select>').attr({'data-placeholder':'Search feature','id':track.name+'_sample_feature_select'}).appendTo($(select_div));
					// add a blank option
					sel.append($("<option>").attr('value','').text('').addClass('option-odd'));
					// if the feature is already in the view, disable it (actually it will remove the feature from the list)
					var myvalue;
					if(!feature_categories_exists){
						$(sorted_features).each(function(i) {
						 myvalue=this.replace(/ /g,'_');
							// if the feature has type "SUR", skip
							if(features[this]['type']=="SUR"){
								return true;
							}
							if($.inArray(myvalue, track.addedSampleFeatures)==-1)
								sel.append($("<option>").attr('value',this).text(this).addClass(i % 2 ? 'option-odd' : 'option-even'));
							else
								sel.append($("<option>").attr({'value':this,'disabled':'disabled'}).text(this).addClass(i % 2 ? 'option-odd' : 'option-even'));
						});  
					}
					else{
						var uniq_feature_categories=mydata["feature_categories"].sort();
						for(var ii=0; ii<uniq_feature_categories.length; ii++){
							var cur_group=$("<optgroup>").attr('label',uniq_feature_categories[ii]).addClass("chosen-category");
							var idx=0;
							var cur_feature;
							for(var jj=0; jj<sorted_features.length; jj++){
							  cur_feature=sorted_features[jj];
								if(features[cur_feature]['type']=="SUR"){
									continue;
								}
								if(features[cur_feature]["category"]==uniq_feature_categories[ii]){
									idx++;
									if($.inArray(cur_feature, track.addedSampleFeatures)==-1){
										cur_group.append($("<option>").attr('value',cur_feature).text(cur_feature).addClass(idx%2?'option-odd':'option-even'));
									}
									else{
										cur_group.append($("<option>").attr({'value':cur_feature,'disabled':'disabled'}).text(cur_feature).addClass(idx%2?'option-odd':'option-even'));
									}
								}
							}
							sel.append(cur_group);
						}
					}
					//$(sel).chosen();
					$('#'+Util.jqSelector(track.name)+'_sample_feature_select').chosen({width:"200px",disable_search_threshold: 10});
					// open the drop down list by defaut
//					$('.chosen-drop').css({'left':'0px','top':'20px'});
					$('.chosen-container').css({'left':'10px'});
					$(sel).chosen().change(function(){
						var value = $("#sample_feature_select_div_"+Util.jqSelector(track.name)+" .result-selected").text();
						// replace sample with "_"
						value=value.replace(/ /g,'_');
						// add the selected feature to heatmap 
						// leave 20 pixel on the left
						view.updateFeatureInSampleHeatMap(track, value, sampleHeatMapDivWidth-20, showFeatureTitleDivID, showFeatureTitleIconID, sampleHeatMapTitleDivID);
					});
					// figure out the position;
					var sampleHeatMapDivPosition=$(sampleHeatMapDiv).offset();
					var mytop=sampleHeatMapDivPosition.top+20;
					var myleft=sampleHeatMapDivPosition.left+20;
					//$(sample_feature_select_div).css({"position":"absolute", "top":mytop, "left":myleft,"z-index":120, "background-color": "#FFF", "border-style":"solid", "border-color":"#8CC63F", "border-width":"1px"});
					$('#sample_feature_select_div_'+Util.jqSelector(track.name)).css({"position":"absolute", "top":mytop, "left":myleft,"z-index":120, "height":"0px", "border-style":"none"});
				}
			}); 
		});
    $(sampleHeatMapContainer).appendTo($('body'));
  }
  var iconDiv=document.createElement("div");
  // this is not working
  var divh=labelDiv.offsetHeight;
  iconDiv.className="track_delete";
  iconDiv.id="delete_"+labelDiv.id;
	var dropIcon=document.createElement("div");
	dropIcon.className="track_drop_icon";
	dropIcon.innerHTML='<img id="icon_drop_'+labelDiv.id+'" src="images/drop.png" width="8px"></img>';
	$(dropIcon).appendTo($(iconDiv));
  var dropDownDiv=document.createElement("div");
	dropDownDiv.className="dropdown";
	dropDownDiv.id="dropdown_"+labelDiv.id;
  // should compute the height of icon 
  dropDownDiv.innerHTML='';
	if(track.dataType=="cct" || track.dataType=="cbt"){
     dropDownDiv.innerHTML+='<div class="track_icon" id="icon_stats_'+labelDiv.id+'"><img src="images/stats.png" height="14px"></img><span>Statistics Analysis</span></div>';
	}
  if(track.name!="name" && !track.isUserTrack && !track.isUploadTrack){
    if(track.dataType=="sbt" || track.dataType=="sct"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_network_analysis_'+labelDiv.id+'"><img src="images/n_expand.png" height="14px"></img><span>Network Analysis</span></div>';
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_related_'+labelDiv.id+'"><img src="images/related.png" height="14px"></img><span>Gene Set Enrichment</span></div>';
    }
    dropDownDiv.innerHTML+='<div class="track_icon" id="icon_graph_big_'+labelDiv.id+'"><img src="images/graph-big-disabled.png" height="14px"></img><span>Node-link Graph (Visible Range)</span></div>';
    if(track.dataType=="sbt"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_graph_'+labelDiv.id+'"><img src="images/graph-disabled.png" height="14px"></img><span>Node-link Graph (Present Nodes)</span></div>';
    dropDownDiv.innerHTML+='<div class="track_icon" id="icon_collapse_'+labelDiv.id+'"><img src="images/collapse_disabled.png" height="14px"></img><span>Presence-based Filtering</span></div>';
    }
    if(track.dataType=="sct"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_filter_'+labelDiv.id+'"><img src="images/filter.png" height="14px"></img><span>Value-based Filtering</span></div>';
    }
  }
  else if(track.isUserTrack || track.isUploadTrack ){
    if(track.dataType=="sbt"||track.dataType=="sct"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_network_analysis_'+labelDiv.id+'"><img src="images/n_expand.png" height="14px"></img><span>Network Analysis</span></div>';
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_related_'+labelDiv.id+'"><img src="images/related.png" height="14px"></img><span>Gene Set Enrichment</span></div>';
    }
    dropDownDiv.innerHTML+='<div class="track_icon" id="icon_graph_big_'+labelDiv.id+'"><img src="images/graph-big-disabled.png" height="14px"></img><span>Node-link Graph (Visible Range)</span></div>';
    if(track.dataType=="sbt"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_graph_'+labelDiv.id+'"><img src="images/graph-disabled.png" height="14px"></img><span>Node-link Graph (Present Nodes)</span></div>';
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_collapse_'+labelDiv.id+'"><img src="images/collapse_disabled.png" height="14px"></img><span>Presence-based Filtering</span></div>';
    }
    if(track.dataType=="sct"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_filter_'+labelDiv.id+'"><img src="images/filter.png" height="14px"></img><span>Value-based Filtering</span></div>';
    }
  }
	if(track.dataType=="cct" || track.dataType=="sct"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_transform_'+labelDiv.id+'"><img src="images/transform.png" height="14px"></img><span>Data Transform</span></div>';
	}
	if(track.dataType=="cct" || track.dataType=="cbt" || track.dataType=="sst"){
      dropDownDiv.innerHTML+='<div class="track_icon" id="icon_sample_'+labelDiv.id+'"><img src="images/sample.png" height="14px"></img><span>Subtrack Annotation</span></div>';
	}
	if(track.name!="name" && !track.isUserTrack && !track.isUploadTrack){
		dropDownDiv.innerHTML+='<div class="track_icon" id="icon_info_'+labelDiv.id+'"><img src="images/info.png" height="14px"></img><span>Track Information</span></div>';
	}
  if(track.name!="name"){
	  dropDownDiv.innerHTML+='<div class="track_icon" id="icon_export_'+labelDiv.id+'"><img src="images/export.png" height="14px"></img><span>Export</span></div>';      
	}
  dropDownDiv.innerHTML+='<div class="track_icon" id="icon_delete_'+labelDiv.id+'"><img src="images/cross.png" height="14px"></img><span>Delete</span></div>';      
  labelDiv.appendChild(iconDiv);
	$(dropDownDiv).appendTo($("body"));
	$(dropDownDiv).css("display","none");
	$(labelDiv).on("mouseenter mousemove",
	  function(event){
		  $(labelDiv).addClass("track-label-hover");
			var position = $(dropIcon).offset();
			$(dropDownDiv).css("left", position.left);
			$(dropDownDiv).css("top", position.top-$(document).scrollTop());
			$(dropDownDiv).css("display","inline");
		});
	$(labelDiv).on("mouseleave",
	  function(event){
		  $(labelDiv).removeClass("track-label-hover");
			$(dropDownDiv).css("display","none");
		});
	$(dropDownDiv).on("mouseenter mousemove",
	  function(event){
		  $(labelDiv).addClass("track-label-hover");
			var position = $(dropIcon).offset();
			$(dropDownDiv).css("left", position.left);
			$(dropDownDiv).css("top", position.top-$(document).scrollTop());
			$(dropDownDiv).css("display","inline");
	 });
	$(dropDownDiv).on("mouseleave",
	  function(event){
		  $(labelDiv).removeClass("track-label-hover");
			$(dropDownDiv).css("display","none");
		});
	if($("#zoomContainer").is(":ui-sortable")){
	  $("#zoomContainer").sortable("refresh");
	}
  return trackDiv;
};


/* this function is not trigged by an event */
TrackView.prototype.addThisTrack=function(trackLabel){
	// create the track in the browse's drag window (view) 
	var children=$("#zoomContainer").children();
	// if the track already exists, just return
	var anchor;
	for(var i=0; i<children.length; i++){
		if(children[i].id == 'track_'+trackLabel) return;
	}   
	for(var i=0; i<children.length; i++){
		if(children[i].track){
			anchor=children[i];
			if(debug5){
				console.log("andchor id :"+anchor.id);
			}
			break;
		}
	}   
	var result=queryTrackDataByLabel(this.brwsr.trackData, trackLabel);
	for(var i=0; i<result.length; i++){
		if(result[i]["network"]==this.brwsr.currentNetwork)
			break;
	}
	this.brwsr.stbox.createTrack([result[i]]);
	if(debug4){
		console.log("in addThisTack... before onVisibleTracksChanged()");
	}
	this.updateTrackList();
	// if it is a composite track, added to the "Linked Tracks" section the left pane" 
	if(result[i].datatype=='cbt'||result[i].datatype=='cct'){
		this.brwsr.addTrackToLinkedTracksForm(result[i].label, result[i].key);
	}
	else if(result[i].datatype=='sbt'){
		this.brwsr.addTrackToVennTracksForm(result[i].label, result[i].key);
		this.brwsr.addTrackToCoVisForm(result[i].label, result[i].key);
	}
	else if(result[i].datatype=='sct'){
		this.brwsr.addTrackToCoVisForm(result[i].label, result[i].key);
	}
};

/* this function is not triggered by an event */
TrackView.prototype.removeThisTrack=function(trackLabel){
  var label=trackLabel;
  $("#track_"+Util.jqSelector(label)).remove();
	this.brwsr.removeTrackFromLocalStorage(this.brwsr.container.id,label,this.brwsr.currentNetwork);
	var result=queryTrackDataByLabel(this.brwsr.trackData, label);
  for(var i=0; i<result.length; i++){
    if(result[i]["network"]==this.brwsr.currentNetwork)
      break;
  }
  var toBeRemoved=result[i];
  if(toBeRemoved.datatype=='cbt'||toBeRemoved.datatype=='cct'){
    this.brwsr.removeTrackFromLinkedTracksForm(toBeRemoved.label, toBeRemoved.key);
	}
  else if(toBeRemoved.datatype=='sbt'){
    this.brwsr.removeTrackFromVennTracksForm(toBeRemoved.label, toBeRemoved.key);
    this.brwsr.removeTrackFromCoVisForm(toBeRemoved.label, toBeRemoved.key);
	}
  else if(toBeRemoved.datatype=='sct'){
    this.brwsr.removeTrackFromCoVisForm(toBeRemoved.label, toBeRemoved.key);
	}
  var key=toBeRemoved["key"];
  if(debug){
    console.log("label="+label+",key="+key);
  }
this.updateTrackList();
};

TrackView.prototype.trackIterate = function(callback) {
  var i;
  //console.log("uiTracks.length="+this.uiTracks.length);
  //console.log("tracks.length="+this.tracks.length);
  for (i = 0; i < this.uiTracks.length; i++)
    callback(this.uiTracks[i], this);
  for (i = 0; i < this.tracks.length; i++)
    callback(this.tracks[i], this);
};

/* this function must be called whenever tracks in the TrackView
* are added, removed, or reordered
*/
TrackView.prototype.updateTrackList = function() {
  var tracks = [];
  // after a track has been dragged, the DOM is the only place
  // that knows the new ordering
  var containerChild = $(this.zoomContainer).children().get(0);
  do {
    // this test excludes UI tracks, whose divs don't have a track property
    if (containerChild.track) {
      tracks.push(containerChild.track);
      if(debug5){
        console.log("pushing.."+containerChild.track.name);
      }
    }
} while ((containerChild = $(containerChild).next().get(0)));
this.tracks = tracks;
//console.log(this.tracks);

var newIndices = {};
if(debug){
  console.log("tracks.length="+this.tracks.length);
}
var newHeights = new Array(this.tracks.length);
for (var i = 0; i < tracks.length; i++) {
  newIndices[tracks[i].name] = i;
  if(debug5){
    console.log("### tracks.name="+tracks[i].name);
  }
  if (tracks[i].name in this.trackIndices) {
    newHeights[i] = this.trackHeights[this.trackIndices[tracks[i].name]];
} else {
  newHeights[i] = 0;
}
this.trackIndices[tracks[i].name] = i;
}
this.trackIndices = newIndices;
this.trackHeights = newHeights;
var nextTop = this.topSpace;
for (var i = 0; i < this.tracks.length; i++) {
  this.trackTops[i] = nextTop;
  this.tracks[i].div.style.top = nextTop + "px";
  if (this.tracks[i].shown)
    nextTop += this.trackHeights[i] + this.trackPadding;
}
 this.updateSampleHeatMapDivPosition();
};

/* get the name of sbt categories */
TrackView.prototype.getSbtCategories= function(){
  var curTrackView = this;
  var baseurl= (this.brwsr.dataRoot?this.brwsr.dataRoot:"");
  var rel_url=this.brwsr.networkInfo['sbt_categories'];
  var url=baseurl+rel_url;
   $.ajax({
     url:url,
     type:"GET",
     dataType:"text",
     async:false,
     success: function(o) { curTrackView.loadSbtCategoriesSuccess(o); },
     error: function() { curTrackView.loadSbtCategoriesFail(); }
   });
};

TrackView.prototype.loadSbtCategoriesSuccess=function(o){
  var lines=o.split("\n");
  var size=0;
  for(var i=0; i<lines.length; i++){
    if(lines[i]!=''){
      this.sbtCategories[size]=lines[i];
      size++;
    }
  }
};

TrackView.prototype.loadSbtCategoriesFail=function(){
    console.log("loading sbt categories failed");
};

TrackView.prototype.updateSampleHeatMapDivPosition=function(){
  var view=this;
  // get the position of static_track;
  var static_track_offset=$("#static_track").offset();
  $.each(view.tracks, function(idx, track){
     var labelOffset;
     var sample_heatmap_div_container_id, sample_heatmap_div_container;
     var sample_heatmap_div, sample_heatmap_div_id;
     if(track.dataType=="cct" || track.dataType=="cbt" || track.dataType=="sst"){
		   setTimeout(function(){
       sample_heatmap_div_container_id="sample_heatmap_"+track.name+"_container";
       sample_heatmap_div_container=$("#"+Util.jqSelector(sample_heatmap_div_container_id)).first();
       sample_heatmap_div_id="sample_heatmap_"+track.name;
       sample_heatmap_div=$("#"+Util.jqSelector(sample_heatmap_div_id)).first();
       labelOffset=$("#label_"+Util.jqSelector(track.name)).first().offset();
			 if(labelOffset){
				 labelOffset.left=labelOffset.left-250;
				 $(sample_heatmap_div_container).offset(labelOffset);
				 $(sample_heatmap_div).offset(labelOffset);
				 var mySampleIconID="icon_sample_label_"+track.name;
				 /*
				 if($(sample_heatmap_div).css("visibility")=="visible"){
				 $(sample_heatmap_div).css("visibility","hidden");
				 }
				 */
				 // if the div is above the static_track, hide it
				 if(labelOffset.top < static_track_offset.top){
					 $(sample_heatmap_div_container).css('visibility','hidden');
					 $(sample_heatmap_div).css('visibility','hidden');
				 }
			 }
		  },200);
     }
  });
};


// return "SimpleTrack" ,"CompositeTrack" or "Unknown"
TrackView.prototype.checkTrackType=function(track){
  if(track.dataType=="sbt" || track.dataType=="sct"){
    return "SimpleTrack";
	}
	else if(track.dataType=="cbt" || track.dataType=="cct"){
	  return "CompositeTrack";
	}
	else{
	  return "Unknown";
	}
};

