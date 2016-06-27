Logo = function(params){
  var logo=this;
  logo.networkInfo=params.networkInfo;
	logo.ngDocRoot=params.ngDocRoot;
	logo.allNetworks=params.allNetworks;
  logo.userNetworkKey="ng_user_networks";
	logo.organism=params.organism;
  logo.onload=params.onload;
  logo.browserContainerID=params.browserContainerID;
  logo.networkOptions=[];
	logo.networkChangedNB=function(oldValue, newValue){
		if(b.currentNetwork==newValue){
			return;
		}
		// check how much new and old view overlap, if overlap percentage
		// is less than 50%, clear all tracks before switch to the new view
		if(!b.checkOverlap(oldValue, newValue)){
			if($("#changeview_confirm").length==0){
				var confirm_div=$("<div>").attr({"id":"changeview_confirm","title":"Select view"});
				//$(confirm_div).html("<p><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 20px 0;'></span>Due to the low overlapping between the two views, selecting the new view will clear all tracks in the current view. Do you want to continue?</p>");
				$(confirm_div).html("<p><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 20px 0;'></span>Switching to the new view will clear all tracks in the current view. Do you want to continue?</p>");
				$("body").append($(confirm_div));
			}
			$("#changeview_confirm").dialog({
				resizable: false,
				height:200,
				width:400,
				modal: true,
				buttons: {
					"Continue": function() {
						b.clearAllTracks();
						$(this).dialog("close");
						if($("#mymodal2").length==0){
							var mymodal2=$("<div>").attr({id:'mymodal2'}).appendTo($('body'));;
							$(mymodal2).css({
								'display':'block',
								'position':'fixed',
								'z-index':10000,
								'top':0,
								'left':0,
								'height':'100%',
								'width':'100%',
								'background': 'rgba(255,255,255,0.8) url("images/loading_netgestalt.png") 50% 50% no-repeat'
							});
						}
						setTimeout(function(){logo.networkChanged(oldValue, newValue)}, 1000);
					},
					"Cancel": function() {
						$(this).dialog("close");
						return; 
					}
				}
			}); 	     
			return;
		}
		if($("#mymodal2").length==0){
			var mymodal2=$("<div>").attr({id:'mymodal2'}).appendTo($('body'));;
			$(mymodal2).css({
				'display':'block',
				'position':'fixed',
				'z-index':10000,
				'top':0,
				'left':0,
				'height':'100%',
				'width':'100%',
				'background': 'rgba(255,255,255,0.8) url("images/loading_netgestalt.png") 50% 50% no-repeat'
			});
		}
		// when user switch network and open some dialog, the zoomContainer area becomes gray, this is a temp fix 
		b.view.setLocation(b.networkInfo);
		setTimeout(function(){logo.networkChanged(oldValue, newValue)}, 1000);
	};
	logo.networkChanged=function(oldValue, newValue, loadRequiredTrack){
		var selectedIndex,oldIndex;
		for(var i=0; i<logo.networkInfo.length; i++){
			if(logo.networkInfo[i]["name"]==newValue){
				selectedIndex=i; 
			}
			if(logo.networkInfo[i]["name"]==oldValue){
				oldIndex=i; 
			}
		}
		if(selectedIndex==undefined && oldIndex!=undefined)
			selectedIndex=oldIndex; 
		else if(selectedIndex==undefined && oldIndex==undefined)
			return;
		// the first time page is loaded,  networkChanged function will be called, but we don't want to 
		// create a new NGBrowser
		// remove old view  
		b.networkInfo=logo.networkInfo[selectedIndex];
		b.currentNetwork=newValue;
		//remove old container
		$("#"+logo.browserContainerID).remove();
		var container=$("<div>").attr("id",logo.browserContainerID);
		b.container=container;
		b.container.id=logo.browserContainerID;
		// remove the related track UI (not part of the widget)
		b.removeRelatedTrackDiv();
		b.removeExportTrackDiv();
		b.removeFilterDiv();
		b.removeUserEnterTrackNameDiv();
		b.removeGeneInputBox();
		b.removeSearchTrackBox();
		// remove all track drop down menus
		b.removeDropdownMenus(); 
		b.removeSampleHeatmap(); 
		$(".submitbutton").remove();
		$(".ac_results").remove();
		$("#clearalltracks_confirm").remove();
		$("#cancel-running-view-creation-confirm").remove();
		$("#deleteuserview_confirm").remove();
		$("#changeview_confirm").remove();
		$("#changeview_confirm_2").remove();
		$("#uploadingchangeview_confirm").remove();
		$("#ngaboutdiv").remove();
		$("#stats_moduleorgene").remove();
		//		 $(".ui-dialog").remove();
		$("body").append(container);
		// user vs. system network  
		var networkType=logo.networkInfo[selectedIndex]["type"];
		var trackInfoFile;
		if(networkType=="system")
			trackInfoFile="data/system/info/"+logo.networkInfo[selectedIndex]["name"]+"/trackInfo.js";
		else
			trackInfoFile="data/user/info/"+logo.networkInfo[selectedIndex]["directory"]+"/trackInfo.js";
		trackInfo=[];
		$.ajax({
			url: trackInfoFile,
			async: false,
			dataType: "json",
			success: function(data){trackInfo=data;}
		});
		b = new NGBrowser({          
			containerID: "NGBrowser",
			networkInfo: logo.networkInfo[selectedIndex],
			trackData: trackInfo,
			userNetworkKey: logo.userNetworkKey,
			defaultTracks: logo.networkInfo[selectedIndex]["default_track"],
			currentNetwork: logo.networkInfo[selectedIndex]["name"] 
		}); 
		logo.currentClass=logo.networkInfo[selectedIndex]["view"];
		// after the first time, set the value to false, so that furthur network change will create new NGBrowser
		// $('#currentnetworkdiv').html("Current view &raquo; "+ng_logo.allNetworks[newValue]["view"]+" &raquo; <a href=\"#\">"+newValue+"</a>");
		b.setCurrentViewInfo("currentnetworkdiv");
		logo.onload=false;
		/*
		$("body").removeClass("loading"); 
		*/
		// if the network has required track associated with it (e.g. msm view), add the track
		if("required_track" in logo.networkInfo[selectedIndex] && (arguments.length==2 || (arguments.length==3 && loadRequiredTrack==true))){
      var results=logo.networkInfo[selectedIndex]["required_track"];
			//should this go into a function?
			var tUrls=results.url;
			var tIntUrls=results.int_url;
			var tType=results.type;
			var tNames=results.name;
			/*
      var networkType=b.currentNetworkType();
      var myCurrentNetwork;
      if(networkType=="system")
         myCurrentNetwork=b.currentNetwork;
      else
        myCurrentNetwork=ng_logo.allNetworks[b.currentNetwork]["directory"];
				*/
			// tUrls.length should be 1
			for(var l=0; l<tUrls.length; l++){
				var userTrack={};
				userTrack.url=tUrls[l];
				userTrack.int_url=tIntUrls[l];
				userTrack.network=logo.networkInfo[selectedIndex]["name"];
				userTrack.type='CompositeTrack';
				userTrack.samples=results.samples[l];
				if('sampleinfo' in results){
					userTrack.sampleinfo=results.sampleinfo[l];
				}
				userTrack.datatype=tType;
				userTrack.key=tNames[l];
				userTrack.label=tNames[l].replace(/ /g,"");
				userTrack.name=userTrack.label;
				userTrack.link='NULL';
				userTrack.catergory='User Track';
				userTrack.isUserTrack=true;
				userTrack.isUploadTrack=true;
				b.trackData.push(userTrack);
				// save userTrack into localStorage
				if(typeof(localStorage)!='undefined') {
					// if already exists in localStorage, update it ( insert the new url corresponding to the network )
					var objString=localStorage.getItem(userTrack.label);
					if(objString){
						var tmpObj=$.parseJSON(objString);
						tmpObj["url"][b.currentNetwork]=userTrack.url;
						tmpObj["trackColor"][b.currentNetwork]=userTrack.trackColor;
						localStorage.setItem(userTrack.label, JSON.stringify(tmpObj));
					}
					else{
						var localStorageTrackObj={};
						$.extend(localStorageTrackObj, userTrack); // make a copy, not a reference
						var urlObj={};
						urlObj[b.currentNetwork]=userTrack.url;
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
				b.stbox.addTrack(evt);
			}
		}
		// end of a function??

		$("#mymodal2").remove();
	};

 $(document).ready(
    function(){
      logo.container=$("#"+params.containerID);
      var logodiv=$("<div>",{id:'logoimg'}).html("<a href=\"../index.html\"><img id=\"logoimg\" height=\"50px\" src=\"images/logo2.png\"></a>").css("float","left");
      $(logo.container).append($(logodiv));
      if($.browser.msie){
        var ie_notice=$("<div>").html("<img id=\"ie_notice\" width=\"650px\" src=\"images/ie_notice_small.png\" />").attr("id","ie_notice_small");
        $(logo.container).append($(ie_notice));
      }
	 // user upload network button
		var exportPDFDiv=$("<image>").attr("id","exportpdfdiv").css({"position":"relative","float":"right","top":"30px","right":"40px","font-size":"12px","font-family":"sans-serif","color":"#000"});
//		$(exportPDFDiv).appendTo($(logo.container));
		$("#exportpdfdiv").attr("src","images/pdf_icon.png");
		$("#exportpdfdiv").css({"height":"30px","margin-left":"10px"});
		$("#exportpdfdiv").on("mouseover",function(event) {
		  balloon17394.showTooltip(event, "Click to export track images as PDF.");
		});
		var uploadingNetworkErrorMsg=function(errorCode){
		 // 99 -- no error msg (clear all)
		 // 0 -- upload success
		 // -1 -- no file selected
		 // -2 -- wrong file extension
		 // -3 -- error processing file
		 // -4 -- file size error
		 // -5 -- uploading/processing busy
		 // -6 --           (not used)
		 // -7 -- network name cannot contain special characters
		 // -8 -- wrong number of sections
		 // -9 -- network exists
		   var divIds=['networkuploadnoerror', 'nonetworkfileselected', 'networkfileextensionerror', 'errorgeneratingnetwork','networkfilesizeerror','uploadnetworkbusy','NOTUSED', 'wrongnetworkname', 'wrongsection','networkexists'];
		 for(var i=0; i<divIds.length; i++){
       $('#'+divIds[i]).hide();
		 }
		 if(errorCode!=99){
       $('#'+divIds[Math.abs(errorCode)]).show();
		 }
		};
    var $userUploadNetworkDialog=$('<div>').attr({'id':'userUploadNetworkDiv'}).html("Choose a file to upload <br/><br/><form action='upload_network.php' method='post' enctype='multipart/form-data' name='userUploadNetworkForm' id='userUploadNetworkForm'><input name='currentNetwork' type='hidden' id='currentNetwork' value=''><input name='userUploadNetworkFile' type='file' id='userUploadNetworkFile' size='30'/></form><div id='uploadnetworkbusy' style='margin-top:10px;display:none'><img src='images/loading2.gif'></img></div><div id='nonetworkfileselected' style='color:red;display:none'><br>Please select a file to upload</div><div id='errorgeneratingnetwork' style='color:red;display:none'><br>Error generating network. Please make sure that your file format is correct.</div><div id='networkfileextensionerror' style='color:red;display:none'><br>File type not supported</div><div id='networkfilesizeerror' style='color:red;display:none'><br>File size too large (Maximum upload size is <span id=\"ng-maxuploadviewsizemb\"></span> MB).</div><div id='wrongnetworkname' style='color:red;display:none'><br>Network file name cannot contain special characteres.</div><div id='networkexists' style='color:red;display:none'><br>Network with the same name already exists. Please upload another network or change the .nsm file name.</div><div id='wrongsection' style='color:red;display:none'><br>Uploaded network file should contain .rul, .hmi and optionally .net sections.</div><div id='networkuploadnoerror' style='color:blue;display:none;margin-top:10px'>Network uploaded successfully!</div><div style='margin-top:25px;width:450px'>NetGestalt supports two types of view files.  <br><ul><li>NSM: networks in an edge list format can be converted to the nsm format using the NetSAM function in the R package <a href='http://bioinfo.vanderbilt.edu/netsam/index.php' target='_blank'>NetSAM</a>. Please refer to the NetSAM manual for instructions on the use of the function. Here is an example nsm file: <a href='doc/exampleNetwork.nsm' target='_blank'>exampleNetwork.nsm</a></li><li>MSM: data matrices can be converted to the msm format using the MatSAM function in the R package <a href='http://bioinfo.vanderbilt.edu/netsam/index.php' target='_blank'>NetSAM</a>. Please refer to the NetSAM manual for instructions on the use of the function. Here is an example msm file: <a href='doc/exampleMatrix.msm' target='_blank'>exampleMatrix.msm</a></li></ul></div>").dialog({
	 autoOpen:false,
	 title:'Upload View',
	 modal:true,
	 height:'450',
	 width:'500',
	 resizable:false,
	 open: function() {
	   $("#ng-maxuploadviewsizemb").text(b.maxUploadViewSizeMB);
	 },
	 close: function(){
		$('#userUploadNetworkFile').val('');
		uploadingNetworkErrorMsg(99);
	 },
   buttons: {
         "Submit": function() {
				    if($('#userUploadNetworkFile').val()==''){
              uploadingNetworkErrorMsg(-1);
							return false;
						}
						else{
						  uploadingNetworkErrorMsg(-5);
							$('form#userUploadNetworkForm').ajaxSubmit(
								{
									data:{},
									success:function(responseText){
									  //console.log(responseText);
										var obj=$.parseJSON(responseText);
										// should check this on the client side
										if(obj.message=="Network file name cannot contain special characters.") {
											uploadingNetworkErrorMsg(-7);
											return;
										}
										else if(obj.message=="Uploaded network file should contain .rul, .hmi and optionally .net sections."){
											uploadingNetworkErrorMsg(-8);
											return;
										}
										else if(obj.message=="msm file should contain at leaset: ruler, hmi, network, expression data, sample annotation sections."){
											uploadingNetworkErrorMsg(-8);
											return;
									  }
										else if(obj.message=="Wrong file type."){
											uploadingNetworkErrorMsg(-2);
											return;
										}
										//console.log(responseText);
										if("create_network_status" in obj && "create_track_status" in obj){
											b.addUserNetwork(JSON.stringify(obj["create_network_status"]), JSON.stringify(obj["create_track_status"]));
										}
										else{
										  b.addUserNetwork(JSON.stringify(obj));
										}
										uploadingNetworkErrorMsg(0);
										// after upload the network, switch to it.
										// check how much new and old view overlap, if overlap percentage
										// is less than 50%, clear all tracks before switch to the new view
										var oldValue=b.currentNetwork;
										//console.log(obj);
										var newValue;
										if("create_network_status" in obj){
											newValue=obj["create_network_status"]["info"]["name"];
										}
										else{
											newValue=obj["info"]["name"];
										}
                    //console.log(oldValue);
                    //console.log(newValue);
                    $("#userUploadNetworkDiv").dialog("close");
										if(!b.checkOverlap(oldValue, newValue)){
											if($("#changeview_confirm").length==0){
												var confirm_div=$("<div>").attr({"id":"uploadingchangeview_confirm","title":"Uploading network"});
												//$(confirm_div).html("<div class='ui-icon ui-icon-alert' style='float:left; margin: 0 7px 10px 0;'></div><div style='float:left;'>Network uploaded successfully. Due to the low overlapping between the two views, switching to the new view will clear all tracks in the current view. Do you want to continue?</div>");
												$(confirm_div).html("<div class='ui-icon ui-icon-alert' style='float:left; margin: 0 7px 10px 0;'></div><div style='float:left;'>Network uploaded successfully. Switching to the new view will clear all tracks in the current view. Do you want to continue?</div>");
												$("body").append($(confirm_div));
											}
											$("#uploadingchangeview_confirm").dialog({
												resizable: false,
												height:220,
												width:400,
												modal: true,
												buttons: {
													"Continue": function() {
														b.clearAllTracks();
														$(this).dialog("close");
														if($("#mymodal2").length==0){
															var mymodal2=$("<div>").attr({id:'mymodal2'}).appendTo($('body'));;
															$(mymodal2).css({
																'display':'block',
																'position':'fixed',
																'z-index':10000,
																'top':0,
																'left':0,
																'height':'100%',
																'width':'100%',
																'background': 'rgba(255,255,255,0.8) url("images/loading_netgestalt.png") 50% 50% no-repeat'
															});
														}
														// when user switch network and open some dialog, the zoomContainer area becomes gray, this is a temp fix
							              b.view.setLocation(b.networkInfo);
   						              setTimeout(function(){ng_logo.networkChanged(oldValue, newValue, false)}, 1000);
														// uploading msm also create a cct track
														if("create_track_status" in obj){
															// add track
															// this is the urls for the actual track data
															var results=obj["create_track_status"];
															var tUrls=results.url;
															var tIntUrls=results.int_url;
															var tType=results.type;
															var tNames=results.name;
															// tUrls.length should be 1
															for(var l=0; l<tUrls.length; l++){
																var userTrack={};
																userTrack.url=tUrls[l];
																userTrack.int_url=tIntUrls[l];
																userTrack.network=b.currentNetwork;
																userTrack.type='CompositeTrack';
																userTrack.samples=results.samples[l];
																if('sampleinfo' in results){
																	userTrack.sampleinfo=results.sampleinfo[l];
																}
																userTrack.datatype=tType;
																userTrack.key=tNames[l];
																userTrack.label=tNames[l].replace(/ /g,"");
																userTrack.name=userTrack.label;
																userTrack.link='NULL';
																userTrack.catergory='User Track';
																userTrack.isUserTrack=true;
																userTrack.isUploadTrack=true;
																b.trackData.push(userTrack);
																// save userTrack into localStorage
																if(typeof(localStorage)!='undefined') {
																	// if already exists in localStorage, update it ( insert the new url corresponding to the network )
																	var objString=localStorage.getItem(userTrack.label);
																	if(objString){
																		var tmpObj=$.parseJSON(objString);
																		tmpObj["url"][b.currentNetwork]=userTrack.url;
																		tmpObj["trackColor"][b.currentNetwork]=userTrack.trackColor;
																		localStorage.setItem(userTrack.label, JSON.stringify(tmpObj));
																	}
																	else{
																		var localStorageTrackObj={};
																		$.extend(localStorageTrackObj, userTrack); // make a copy, not a reference
																		var urlObj={};
																		urlObj[b.currentNetwork]=userTrack.url;
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
																b.stbox.addTrack(evt);
															}
														}
													},
													"Cancel": function() {
														var menuInputData={"allNetworks":ng_logo.allNetworks,"currentNetwork":b.currentNetwork};
														b.buildNetworkMenu(menuInputData,"menu_view_select", "menu_view_delete");
														$(this).dialog("close");
														return;
													}
												}
											});
										}
										else{
											logo.networkChanged(oldValue, newValue);
										}
									}
								}
							);
				  	}
         },
				 "Cancel": function() {
					 $(this).dialog("close");
				 }
   }
	});
	 $('#userUploadNetworkFile').change(function(){
			if($('#userUploadNetworkFile').val()==''){ // no file selected
		    uploadingNetworkErrorMsg(-1);
				return false;
			}
			else if(this.files[0].size/1024/1024>b.maxUploadViewSizeMB){ // check file size on the client side
				uploadingNetworkErrorMsg(-4);
				return false;
			}
			else if(b.networkExists(this.value)){
			  uploadingNetworkErrorMsg(-9);
				return false;
			}
			else{
			   var re=/(?:\.([^.]+))?$/;
				 // get file extension
				 var ext=re.exec(this.value)[1];
	       // look at the next to last extension if file extension is "txt", e.g.  a.nsm.txt should be ok, it is assumed as an nsm file.
				 if(ext=="txt"){
           var re2=/(.*)\.[^.]+$/;
					 var tmpstring=re2.exec(this.value)[1];
					 ext=re.exec(tmpstring)[1];
				 }
				 switch(ext){
           case 'nsm':
		          uploadingNetworkErrorMsg(99);
							break;
           case 'msm':
		          uploadingNetworkErrorMsg(99);
							break;
					default:
		          uploadingNetworkErrorMsg(-2);
				 }
			}
	 });
		// create upload dialog
		var uploadingTrackErrorMsg=function(errorCode, detail){
		 // 99 -- no error msg, clear all
		 // 0 -- upload success
		 // -1 -- no file selected
		 // -2 -- wrong file extension
		 // -3 -- error processing file
		 // -4 -- file size error
		 // -5 -- too many tracks in the file
		 // -6 -- uploading/processing busy
		 // -7 -- sample not match
		 // -8 -- duplicated sample
		 // -9 -- duplicated genes
		 // -10 -- special characters
		 // -11 -- no overlapping genes
		 // -12 -- column number does not match
		 // -13 -- invalid data in tsi
		 // -14 -- tsi barcode must be unique
		 // -15 -- cbt file contains values other than 0 and 1
		 // -16 -- sbt: if the "All" track is provided, all genes in the other tracks should be included in the "All" track
		 // -17 -- no gene map 
		 // -18 -- error mapping id to gene symbol
		   var divIds=['usertrackuploadnoerror','nofileselected', 'fileextensionerror', 'errorgeneratingtrack','filesizerror','toomanytracks', 'uploadtrackbusy', 'samplesnotmatch', 'sampleduplicated', 'geneduplicated', 'specialcharacters','nooverlapping','colnotmatch','datainvalid','uniquebarcode', 'cbtvalueerror', "sbtallgeneserror", "nogenemap", "mappingerror"];
		 $('#useruploadtrackdetail').hide();
		 for(var i=0; i<divIds.length; i++){
       $('#'+divIds[i]).hide();
		 }
		 if(errorCode!=99){
       $('#'+divIds[Math.abs(errorCode)]).show();
		 }
		 if(detail){
		   $('#useruploadtrackdetail').show();
		   $('#useruploadtrackdetail').html(detail);
		 }
		};
		/*
		var checkUploadFileSize=function(id){
		  if(!$.browser.msie){
					if($(id)[0].files[0].size>20971520){ // < 20M
						uploadingTrackErrorMsg(-4);
						return -1;
					}
					else{
						return 0;
					}
			}
			else{ //ie
			 return 0;
			 }
		};
		*/
    var idTypeVals=ngIdTypes[ng_logo.organism]; 
		var idTypes_html="";
		for(var i=0; i<idTypeVals.length; i++){
		  if(idTypeVals[i]!="None of the above"){
        idTypes_html+=("<option value='"+idTypeVals[i]+"'>"+idTypeVals[i]+"</option>");
			}
			else{
        idTypes_html+=("<option value='NULL'>"+idTypeVals[i]+"</option>");
			}
		}
    var $userUploadTrackDialog=$('<div>').attr({'id':'userUploadTracksDiv'}).dialog({
	 autoOpen:false,
	 title:"Upload Track",
	 modal:true,
	 height:"500",
	 width:"500",
	 resizable:false,
	 open:function() {
     $("#ng-maxuploadtracksizemb").text(b.maxUploadTrackSizeMB);
	 },
   close: function(){
				  $("#userUploadFile").val("");
					$("#useruploadsampleinfo").css("display","none");
				  $("#userUploadSampleInfoFile").val("");
					$("#userUploadTracksIdType").val("hgnc_symbol");
					$("#userUploadTracksMapToGeneSymbol").val("True");
          uploadingTrackErrorMsg(99);
   },
   buttons: {
         "Submit": function() {
              if($('#userUploadFile').val()==''){
							  uploadingTrackErrorMsg(-1);
                return false;
              }
							else if($('#userUploadTracksIdType').val()!='hgnc_symbol' && $('#userUploadTracksIdType').val()!='NULL' && $('#userUploadTracksMapToGeneSymbol').val()==''){
							  uploadingTrackErrorMsg(-17);
                return false;
							}
              else{
								var enableButtons=function(){
									$(".ui-dialog-buttonpane button:contains('Submit')").button("enable");
									$(".ui-dialog-buttonpane button:contains('Cancel')").button("enable");
									$(".ui-dialog-titlebar-close").show();
								};
							   uploadingTrackErrorMsg(-6);
								 /*if(checkUploadFileSize('#userUploadFile')==-1)
									  return false;
										*/
								 var networkType=b.currentNetworkType();
								 var myCurrentNetwork;
								 if(networkType=="system")
								    myCurrentNetwork=b.currentNetwork;
								 else
								    myCurrentNetwork=ng_logo.allNetworks[b.currentNetwork]["directory"];
                $('form#userUploadTracksForm').ajaxSubmit(
								 {
								 data: {
								    //'currentNetwork':$('input#currentNetwork').val()
								    'currentNetwork':myCurrentNetwork,
									  'networkType':networkType,
										'ruler':JSON.stringify(b.view.ruler),
										'organism':ng_logo.organism,
										'mapToGeneSymbol':$("#userUploadTracksMapToGeneSymbol").val(),
										'idType':$("#userUploadTracksIdType").val()
										},
								 /*
                 beforeSubmit: function() {
							      uploadingTrackErrorMsg(6);
										checkUploadFileSize('#userUploadFile');
                  },
									*/
								 success: function(responseText){
											var results=$.parseJSON(responseText);
											if(results.message=="File too large")
										  {
                        uploadingTrackErrorMsg(-4);
												enableButtons();
												return;
											}
											else if(results.message=="Error"){
                        uploadingTrackErrorMsg(-3);
												enableButtons();
												return;
											}
											else if(results.message=="Error mapping ID to symbol"){
                        uploadingTrackErrorMsg(-18, window.atob(results.detail));
												enableButtons();
												return;
											}
											// only support file has <= 3 tracks
											else if(results.message=="Too many tracks"){
                        uploadingTrackErrorMsg(-5);
												enableButtons();
												return;
											}
											else if(results.message=="Samples not match"){
                        uploadingTrackErrorMsg(-7, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="Samples duplicated"){
                        uploadingTrackErrorMsg(-8, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="Gene duplicated"){
                        uploadingTrackErrorMsg(-9, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="Special characters"){
                        uploadingTrackErrorMsg(-10, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="No overlapping genes"){
                        uploadingTrackErrorMsg(-11);
												enableButtons();
												return;
											}
											else if(results.message=="Column number not match"){
                        uploadingTrackErrorMsg(-12, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="Invalid data in tsi"){
                        uploadingTrackErrorMsg(-13, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="Duplicated sample feature"){
                        uploadingTrackErrorMsg(-14, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="CBT value error"){
                        uploadingTrackErrorMsg(-15, window.atob(results.detail));
												enableButtons();
												return;
											}
											else if(results.message=="SBT all genes error"){
                        uploadingTrackErrorMsg(-16, window.atob(results.detail));
												enableButtons();
												return;
											}
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
												userTrack.network=b.currentNetwork;
												if(results.type=="sbt" || results.type=="sct"){
												  userTrack.type='SimpleTrack';
												  userTrack.trackColor=null;
											  }
												else{
												  userTrack.type='CompositeTrack';
													userTrack.samples=results.samples[l];
													if('sampleinfo' in results){
													  userTrack.sampleinfo=results.sampleinfo[l];
													}
												}
												userTrack.datatype=tType;
												userTrack.key=tNames[l];
												userTrack.label=tNames[l].replace(/ /g,"");
												userTrack.name=userTrack.label;
												userTrack.link='NULL';
												userTrack.catergory='User Track';
												userTrack.isUserTrack=true;
												userTrack.isUploadTrack=true;
												b.trackData.push(userTrack); 
												// save userTrack into localStorage 
												if(typeof(localStorage)!='undefined') {
													// if already exists in localStorage, update it ( insert the new url corresponding to the network )
													var objString=localStorage.getItem(userTrack.label);
													if(objString){
														var tmpObj=$.parseJSON(objString);
														tmpObj["url"][b.currentNetwork]=userTrack.url;
														tmpObj["trackColor"][b.currentNetwork]=userTrack.trackColor;
														localStorage.setItem(userTrack.label, JSON.stringify(tmpObj));
													}    
													else{
														var localStorageTrackObj={};
														$.extend(localStorageTrackObj, userTrack); // make a copy, not a reference
														var urlObj={};
														urlObj[b.currentNetwork]=userTrack.url;
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
												b.stbox.addTrack(evt);
											}
							        uploadingTrackErrorMsg(0);
											enableButtons();
								    },
                 error: function() { 
							        uploadingTrackErrorMsg(-3);
											enableButtons();
								 }
								 }
								 );
						// disable the buttons after clicking submit
						  $(".ui-dialog-buttonpane button:contains('Submit')").button("disable");
						  $(".ui-dialog-buttonpane button:contains('Cancel')").button("disable");
							$(".ui-dialog-titlebar-close").hide();
						 }
         },
         "Cancel": function() {
          $(this).dialog("close");
        }
   }
	});
    $("#userUploadTracksDiv").html("Choose a track file:<br><form action='upload_track.php' method='post' enctype='multipart/form-data' name='userUploadTracksForm' id='userUploadTracksForm'><input name='currentNetwork' type='hidden' id='currentNetwork' value=''><input name='userUploadFile' type='file' id='userUploadFile' size='30'/><br><div id='useruploadsampleinfo'>Choose a track sample information file (<span style='color:blue'>optional</span>):<br><input name='userUploadSampleInfoFile' type='file' id='userUploadSampleInfoFile' size='30'/></div><br>ID type:<br><div><select style='margin-top:5px' id='userUploadTracksIdType' name='userUploadTracksIdType'>"+idTypes_html+"</select></div><br>Map to gene symbol:<br><div><select style='margin-top:5px' id='userUploadTracksMapToGeneSymbol' name='userUploadTracksMapToGeneSymbol'><option value=''></option><option value='False'>False</option><option value='True'>True</option></select></div></form><div id='uploadtrackbusy' style='margin-top:10px;display:none'><img src='images/loading2.gif'></img></div><div id='nofileselected' style='color:red;display:none'><br>Please select a file to upload!</div><div id='errorgeneratingtrack' style='color:red;display:none'><br>Error generating track. Please make sure that your file format is correct.</div><div id='fileextensionerror' style='color:red;display:none'><br>File type not supported!</div><div id='filesizerror' style='color:red;display:none'><br>File size too large (Maximum upload size is <span id='ng-maxuploadtracksizemb'></span> MB).</div><div id='toomanytracks' style='color:red;display:none'><br>Too many tracks in the file! (Maximum: 3)</div><div id='samplesnotmatch' style='color:red;display:none'><br>Samples do not match!</div><div id='sampleduplicated' style='color:red;display:none'><br>Samples duplicated in track and/or sample information file!</div><div id='geneduplicated' style='color:red;display:none'><br>Genes duplicated</div><div id='specialcharacters' style='color:red;display:none'><br>File contains special characters! Allowed characters: a-z, A-Z, 0-9, ., -, _</div><div id='nooverlapping' style='color:red;display:none'><br>No gene in the file overlaps with the network!</div><div id='colnotmatch' style='color:red;display:none'><br>Number of fields in each row does not match!</div><div id='datainvalid' style='color:red;display:none'><br>Invalid data in tsi file!</div><div id='uniquebarcode' style='color:red;display:none'><br>Sample feature must be unique!</div><div id='cbtvalueerror' style='color:red;display:none'><br>cbt file contains value other than 0 or 1!</div><div id='sbtallgeneserror' style='color:red;display:none'><br>sbt track contains gene(s) not listed in the first line!</div><div id='nogenemap' style='color:red;display:none'><br>Please select gene map to symbol (True or False)!</div><div id='mappingerror' style='color:red;display:none'><br>Error generating track. Please make sure that the selected ID type is correct!</div><div id='usertrackuploadnoerror' style='color:blue;display:none;margin-top:10px'>Track uploaded successfully!</div><div id='useruploadtrackdetail' style='height:75px;overflow-y:scroll;color:red;display:none;margin-top:10px'></div><div style='margin-top:10px;width:450px'>NetGestalt supports four types of track files. Please refer to <a href='doc/NetGestalt_Manual.pdf' target='_blank'>NetGestalt manual</a> for instructions on how to prepare track files. Here are some examples for each type of track files. <ul><li>SBT: <a href='doc/Sabates-Bellver_Normal_Adenomas_Siggene.sbt' target='_blank'>Sabates-Bellver_Normal_Adenomas_Siggene.sbt</a></li><li>SCT: <a href='doc/Sabates-Bellver_Normal_Adenomas_statistic.sct' target='_blank'>Sabates-Bellver_Normal_Adenomas_statistic.sct</a></li><li>CBT: <a href='doc/TCGA_GBM_Mutation_Combined.cbt' target='_blank'>TCGA_GBM_Mutation_Combined.cbt</a></li><li>CCT: <a href='doc/Sabates-Bellver_Normal_Adenomas.cct' target='_blank'>Sabates-Bellver_Normal_Adenomas.cct</a><br>TSI: <a href='doc/Sabates-Bellver_Normal_Adenomas.tsi' target='_blank'>Sabates-Bellver_Normal_Adenomas.tsi</a><br>(TSI is an optional annotation file for corresponding CCT)</li></ul></div>");
	  $("#userUploadFile").change(function(){
		  // reset userUploadSampleInfoFile value
			$("#userUploadSampleInfoFile").replaceWith($("#userUploadSampleInfoFile").clone(true));
			$("#userUploadSampleInfoFile").off("change");
			// check tsi file size before uploading
			$("#userUploadSampleInfoFile").change(function(){
				if(this.files[0].size/1024/1024>b.maxUploadTrackSizeMB){ // check file size on the client side
					uploadingTrackErrorMsg(-4);
					return false;
				}
			});
			if($("#userUploadFile").val()==''){ // no file selected
		    uploadingTrackErrorMsg(-1);
			}
			else if(this.files[0].size/1024/1024>b.maxUploadTrackSizeMB){ // check file size on the client side
				uploadingTrackErrorMsg(-4);
				return false;
			}
			else{
			   var re=/(?:\.([^.]+))?$/;
				 // get file extension
				 var ext=re.exec(this.value)[1];
	       // look at the next to last extension if file extension is "txt", e.g.  a.sbt.txt should be ok, it is assumed as an sbt file.
				 if(ext=="txt"){
           var re2=/(.*)\.[^.]+$/;
					 var tmpstring=re2.exec(this.value)[1];
					 ext=re.exec(tmpstring)[1];
				 }
				 switch(ext){
           case 'sbt':
					 case 'sct':
		          uploadingTrackErrorMsg(99);
							$("#useruploadsampleinfo").css("display","none");
							break;
					 case 'cbt':
					 case 'cct':
		          uploadingTrackErrorMsg(99);
							$("#useruploadsampleinfo").css("display","block");
							break;
					default:
		          uploadingTrackErrorMsg(-2);
				 }
			}
		});
	  $("#userUploadSampleInfoFile").change(function(){
		 if($("#userUploadSampleInfoFile").val()!=""){
			   re=/(?:\.([^.]+))?$/;
				 ext=re.exec(this.value)[1];
				 if(ext=="txt"){
           re2=/(.*)\.[^.]+$/;
					 tmpstring=re2.exec(this.value)[1];
					 ext=re.exec(tmpstring)[1];
				 }
				 switch(ext){
					 case 'tsi':
		          uploadingTrackErrorMsg(99);
							break;
					default:
		          uploadingTrackErrorMsg(-2);
         }
		 }
    });
		$("#userUploadTracksMapToGeneSymbol").change(function(){
		 if($("#userUploadSampleInfoFile").val()!=""){
		   uploadingTrackErrorMsg(99);
		 }
		});
		$("#userUploadTracksIdType").change(function(){
			if($("#userUploadTracksIdType").val()=="NULL"){
		    $("#userUploadTracksMapToGeneSymbol").val('');
		    $("#userUploadTracksMapToGeneSymbol").prop('disabled', true);
			}
			else if($("#userUploadTracksIdType").val()=="hgnc_symbol"){
		    $("#userUploadTracksMapToGeneSymbol").val('True');
		    $("#userUploadTracksMapToGeneSymbol").prop('disabled', true);
			}
			else{
		    $("#userUploadTracksMapToGeneSymbol").val('');
		    $("#userUploadTracksMapToGeneSymbol").prop('disabled', false);
			}
		});
		$("#userUploadTracksIdType").change();
		// show the current viewing network, this should float to the right 
		var currentNetworkDiv=$('<div>',{id:'currentnetworkdiv'}).appendTo($(logo.container));
		$(currentNetworkDiv).css({'padding':'4px','top':'25px', 'position':'absolute', 'right':'20px'});
   // add top menu
	 var topmenu_ul=$('<ul>',{id:'nav'}).appendTo($(logo.container));
	 $(topmenu_ul).append("<li><a class='fly'>Track</a><ul class='dd'><li><a id='menu_track_browse'>Browse System Tracks</a></li><li><a id='menu_track_search'>Search System Tracks</a></li><li><a id='menu_track_upload'>Upload Track File</a></li><li><a id='menu_track_enter'>Enter Gene Symbols</a></li><li><a id='menu_track_clear'>Clear All Tracks</a></li></ul></li><li><a class='fly'>View</a><ul class='dd'><li><a class='fly' id='menu_view_select'>Select</a><ul><li><a>View 1</a></li><li><a>View 2</a></li></ul></li><li><a class='fly' id='menu_view_delete'>Delete</a><ul><li><a>Delete 1</a></li><li><a>Delete 2</a></li></ul></li><li><a id='menu_view_upload'>Upload</a></li><li><a id='menu_view_create'>Create</a></li></ul></li><li><a class='fly2' id='menu_about'>About</a></li>");
	 $("#menu_track_browse").click(
		 function() {
		   box17395.nukeTooltip();
			 b.browseAllTracksDialog("open");
		 });
		 $("#menu_track_upload").click(
			 function() {
				 // temporarily fix
				 // when user switch network and click upload network or track, the zoomContainer area becomes gray
				 /*
				 if(!b.fixUploadTrack){
					 $userUploadTrackDialog.dialog('open');
					 $userUploadTrackDialog.dialog('close');
					 b.view.setLocation(b.networkInfo);
					 $userUploadTrackDialog.dialog('open');
					 b.fixUploadTrack=true;
				 }
				 else{
					 $userUploadTrackDialog.dialog('open');
				 }
				 */
					 $userUploadTrackDialog.dialog('open');
					 $userUploadTrackDialog.dialog('close');
					 b.view.setLocation(b.networkInfo);
					 $userUploadTrackDialog.dialog('open');
			 }
		 );
	 	$("#menu_track_search").click(function(){
	    b.searchTracksDialog("open");	
		});
	 	$("#menu_track_enter").click(function(){
	    b.userEnterTrackDialog("open");	
		});
	 	$("#menu_about").click(function(){
	    b.menuAboutDialog("open");	
		});
		 $("#menu_view_upload").click(
			 function() {
				 // temporarily fix
				 // when user switch network and click upload network or track, the zoomContainer area becomes gray
				 /*
				 if(!b.fixUploadNetwork){
					 $userUploadNetworkDialog.dialog('open');
					 $userUploadNetworkDialog.dialog('close');
					 b.view.setLocation(b.networkInfo);
					 $userUploadNetworkDialog.dialog('open');
					 b.fixUploadNetwork=true;
				 }
				 else{
					 $userUploadNetworkDialog.dialog('open');
				 }
				 */
					 $userUploadNetworkDialog.dialog('open');
					 $userUploadNetworkDialog.dialog('close');
					 b.view.setLocation(b.networkInfo);
					 $userUploadNetworkDialog.dialog('open');
			 }
		 );
		 $("#menu_view_create").click(
			 function() {
				 // temporarily fix
				 // when user switch network and click upload network or track, the zoomContainer area becomes gray
				 /*
				 if(!b.fixUploadNetwork){
				 $userUploadNetworkDialog.dialog('open');
				 $userUploadNetworkDialog.dialog('close');
				 b.view.setLocation(b.networkInfo);
				 $userUploadNetworkDialog.dialog('open');
				 b.fixUploadNetwork=true;
				 }
				 else{
				 $userCreateViewDialog.dialog('open');
				 }
				 */
				 var userCreateViewDialog=b.setUpUserCreateViewDialog(logo.browserContainerID+"-viewCreation");
				 if(window.FileReader && window.File && window.FileList && window.Blob){
					 $("#userCreateViewCctFile").change(function(){
						 if(this.files[0].size/1024/1024>b.maxCreateViewUploadCCTSizeMB){
               $("#cv_error_before_submit").html("File size exceed limit ("+b.maxCreateViewUploadCCTSizeMB+"MB)").css({"color":"red"});
							 $("#userCreateViewCctFile").val("");
						 }
						 else{
               $("#cv_error_before_submit").html("");
						 }
					 });
					 $("#userCreateViewTsiFile").change(function(){
						 if(this.files[0].size/1024/1024>b.maxCreateViewUploadTSISizeMB){
               $("#cv_error_before_submit").html("File size exceed limit ("+b.maxCreateViewUploadCCTSizeMB+"MB)").css({"color":"red"});
							 $("#userCreateViewTsiFile").val("");
						 }
						 else{
               $("#cv_error_before_submit").html("");
						 }
					 });
				 }
				 // temporarily fix
				 // when user switch network and click upload network or track, the zoomContainer area becomes gray
				 $userUploadNetworkDialog.dialog('open');
				 $userUploadNetworkDialog.dialog('close');
				 b.view.setLocation(b.networkInfo);
				 //end of fix
				 userCreateViewDialog.dialog('open');
				 $("#user-createview-error").html("");
				 // check if user already has pending view creation
				 var existingViewCreationStorage;
				 if(typeof(localStorage)!='undefined'){
           existingViewCreationStorage=localStorage.getItem(logo.browserContainerID+"-viewCreation");
				 }
				 // display ongoing view creation status
				 var existingViewCreation;
				 var currentDialogHeight;
				 var msmFile;
				 var orig_cct_name;
				 var cur_status;
				 var time_used, num_of_nodes, num_of_edges, num_of_modules;
				 var submit_time, submitTimeStorage;
				 var userCreateViewDiv=$("#userCreateViewDiv");
				 var arg={};
				 if(existingViewCreationStorage !== undefined){
					 existingViewCreation=JSON.parse(existingViewCreationStorage); 
				 }
				 if(!$.isEmptyObject(existingViewCreation)){
					 // only if job just got cancelled
					 arg["status"]=existingViewCreation["status"];
					 // any other status
					 arg["job_id"]=existingViewCreation["job_id"];
					 arg["orig_cct_path"]=existingViewCreation["orig_cct_path"];
					 arg["orig_tsi_path"]=existingViewCreation["orig_tsi_path"];
					 arg["output_file"]=existingViewCreation["output_file"];
					 arg["msm_file"]=existingViewCreation["msm_file"];
					 arg["orig_cct_name"]=existingViewCreation["orig_cct_name"];
					 // need to check status based on JOB ID
					 //console.log(arg);
					 $.ajax({
						 type: "POST",
						 url: "check_create_view_job_status.php",
						 data: arg,
						 async: false,
						 success:function(data){
							 $("#cv_error_before_submit").html("");
							 var status_response=JSON.parse(data); 
							 cur_status=status_response.status;
							 time_used=status_response.time_used;
							 num_of_nodes=status_response.num_of_nodes;
							 num_of_edges=status_response.num_of_edges;
							 num_of_modules=status_response.num_of_modules;
               if(typeof(localStorage)!='undefined'){
							   submitTimeStorage=localStorage.getItem(logo.browserContainerID+"-viewCreation"+"-submittime");
							   submit_time=JSON.parse(submitTimeStorage);
							 }
							 else{
                 submit_time={"submit_time":"Unknown"};
							 }
							 userCreateViewDiv.html("<div id='user-create-view-existing'><p>You submitted a job at <span style='color:blue'>"+submit_time.submit_time+"</span>.</p><p>Current status: <span id='user-create-view-status'>"+cur_status+"</span></p><div id='user-create-view-extra-info' style='visibility:hidden'><p id='user-create-view-time-used'>Time used: <span style='color:blue'>"+time_used+"</span></p><p id='user-create-view-num-of-nodes'>Number of nodes: <span style='color:blue'>"+num_of_nodes+"</span></p><p id='user-create-view-num-of-edges'>Number of edges: <span style='color:blue'>"+num_of_edges+"</span></p><p id='user-create-view-num-of-modules'>Number of modules: <span style='color:blue'>"+num_of_modules+"</span></p></div></div>");
							 if(cur_status=="Done"){
								 $("#user-create-view-existing").append("<p>The generated msm file is ready. Click <span id='user-create-view-switch' style='text-decoration:underline;color:#a67c52;cursor:pointer;'>here</span> to switch to the new view.</p>");
								 $("#user-create-view-status").css({"color":"blue"});
								 msmFile=status_response["msm"];
								 orig_cct_name=status_response["orig_cct_name"];
								 $("#user-create-view-extra-info").css({"visibility":"visible"});
							 }
							 else if(cur_status=="Running"){
								 $("#user-create-view-status").css({"color":"blue"});
								 $("#user-create-view-extra-info").css({"visibility":"hidden"});
							 }
							 else if(cur_status=="Unknown" || cur_status=="Error" || cur_status=="Queued" || cur_status=="Cancelled"){
								 $("#user-create-view-extra-info").css({"visibility":"hidden"});
								 $("#user-create-view-status").css({"color":"red"});
								 if(cur_status=="Error"){
									 // error details encoded in Base64
									 var error_detail=$("<div>").attr({"id":"user-create-view-status-detail"}).html("Error details: <div style='display:inline-block' id='toggleUserCreationViewErrorDetail'>show</div>");
									 var detail_msg;
									 try{
										 detail_msg=window.atob(status_response["details"]);
									 }
									 catch(exception){
										 //console.log(exception);
										 detail_msg=status_response["details"];
									 }
									 error_detail.append($("<div>").attr({"id":"user-create-view-status-detail-info"}).css({"max-height":"350px","display":"none", "padding":"10px","border":"2px solid","border-color":"#ffd737","border-radius":"10px", "background-color":"#fff6bf", "overflow":"scroll", "word-wrap":"break-word","margin-top":"5px"}).html(detail_msg));
									 $("#user-create-view-status").after(error_detail);
									 $("#toggleUserCreationViewErrorDetail").css({"font-size":"10px","color":"blue"});
									 $("#toggleUserCreationViewErrorDetail").click(function(event){
										 b.toggleUserCreationViewErrorDetail("user-create-view-status-detail-info", "toggleUserCreationViewErrorDetail");
										 var currentDialogContentHeight=$("#user-create-view-existing").height();
										 userCreateViewDialog.dialog("option", "height", currentDialogContentHeight+200);
									 });
								 }
							 }
							 currentDialogHeight=$("#user-create-view-existing").height();
							 $("#user-create-view-switch").click(function(){
								 // show busy icon
								 //$(".userCreateViewDialog .ui-dialog-buttonset").before("<img width=\"20px\" src=\"images/loading2.gif\"></img>");
								 b.userCreateViewSwitch(logo.browserContainerID+"-viewCreation", msmFile, orig_cct_name);
								 //$("#userCreateViewDiv").dialog("close");
							 });
							 userCreateViewDiv.height(currentDialogHeight);
							 if(cur_status=="Unknown" || cur_status=="Error" || cur_status=="Done" || cur_status=="Cancelled"){
								 userCreateViewDialog.dialog("option", "buttons", [{text:"New Submission", click:function() { 
									 // clear storage item
									 if(typeof(localStorage)!='undefined'){
										 localStorage.removeItem(logo.browserContainerID+"-viewCreation");
										 localStorage.removeItem(logo.browserContainerID+"-viewCreation-submittime");
									 }
									 $("#user-create-view-existing").empty();
									 b.setUpUserCreateViewDialog(logo.browserContainerID+"-viewCreation");
									 $("#userCreateViewDiv").dialog('open'); 
								 }}, {text:"OK", click:function() {$(this).dialog("close");} } ]);
							 }
							 else if(cur_status=="Running"){
								 // user can canel the job
								 userCreateViewDialog.dialog("option", "buttons",  [{text:"Cancel Job", click:function(){
									 //confirm dialog 
									 if($("#cancel-running-view-creation-confirm").length==0){
										 var confirm_div=$("<div>").attr({"id":"cancel-running-view-creation-confirm","title":"Cancel running job?"});
										 $(confirm_div).html("<p><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 20px 0;'></span>This will cancel the current running job. Do you want to continue?</p>");
										 $("body").append($(confirm_div));
									 }
									 $("#cancel-running-view-creation-confirm").dialog({
										 resizable: false,
										 height:200,
										 width:400,
										 modal: true,
										 buttons: {
											 "Yes": function() {
												 b.cancelRunningViewCreationJob(logo.browserContainerID+"-viewCreation");
												 $(this).dialog("close");
												 userCreateViewDialog.dialog("close");
											 },
											 Cancel: function() {
												 $(this).dialog("close");
												 userCreateViewDialog.dialog("close");
											 }
										 }
									 });
								 }},{text:"OK", click:function() { $( this ).dialog( "close" );} } ]);
							 }
							 else{
								 userCreateViewDialog.dialog("option", "buttons",  [{text:"OK", click:function() { $( this ).dialog( "close" );} } ]);
							 }
							 userCreateViewDialog.dialog("option", "height", currentDialogHeight+200);
							 userCreateViewDialog.css({"max-height":"600px"});
							 userCreateViewDialog.css({"min-height":"150px"});
						 },
						 error: function(request, error){
							 console.log(error);
						 }
					 }); 
				 }
			 }
		 );
		// get the information of user previously uploaded networks (if existed in localStorage)
		if(typeof(localStorage)!=undefined){
			var currentItems=JSON.parse(localStorage.getItem(logo.userNetworkKey));
			if(currentItems){
				for(var localUserNetwork in currentItems){
					// check if still exists on server
					//console.log(localUserNetwork);
					if(Util.checkFileExistsOnServer(currentItems[localUserNetwork]["module_info"])){
						logo.allNetworks[localUserNetwork]={};
						logo.allNetworks[localUserNetwork]["type"]=currentItems[localUserNetwork]["type"];
						logo.allNetworks[localUserNetwork]["view"]=currentItems[localUserNetwork]["view"];
						logo.allNetworks[localUserNetwork]["directory"]=currentItems[localUserNetwork]["directory"];
						// also update networkInfo
						var classItem={};
						classItem["ruler"]=localUserNetwork;
						classItem["rulerClass"]=currentItems[localUserNetwork]["view"];
						allRulerClass["items"].push(classItem);
						ng_logo.networkInfo.push(currentItems[localUserNetwork]);
					}
					else{ // network deleted on server, remove it from localStorage
						delete currentItems[localUserNetwork];
						localStorage.setItem(logo.userNetworkKey, JSON.stringify(currentItems));
					}
				}
			}
		}
    // which one is selected?  If there is a cookie value, set it
    // otherwise, default to the first network
    // once network changed, modify the cookie value
    var network;
		try{
			network= window.atob($.cookie(logo.browserContainerID + "-refNetwork"));
		}
		catch(exception){
			network= $.cookie(logo.browserContainerID + "-refNetwork");
      $.cookie(logo.browserContainerID+"-refNetwork", window.btoa(network),{expires: 60});
		}
     var found=false;
     logo.currentClass='';
     if(typeof network!='undefined'){
       for(var i=0; i<allRulerClass.items.length; i++){
         if(allRulerClass.items[i]["ruler"]==network){
           logo.currentNetwork=network;
           $.cookie(logo.browserContainerID+"-refNetwork", window.btoa(network),{expires: 60});
           found=true;
           break; 
         }
       }  
      // if not found, the old network is no longer in the drop down list
      // probably the user has regenerated the track data
      if(!found){
       logo.currentNetwork=allRulerClass.items[0]["ruler"];
       $.cookie(logo.browserContainerID +"-refNetwork",window.btoa(logo.currentNetwork),{expires: 60});
      }
     }
     else{ // no network cookie has been set
       logo.currentNetwork=allRulerClass.items[0]["ruler"];
       $.cookie(logo.browserContainerID+"-refNetwork",window.btoa(logo.currentNetwork),{expires: 60});
     }
    // search for network index
    for(i=0; i<logo.networkInfo.length; i++){
      if(logo.networkInfo[i]["name"]==logo.currentNetwork){
        logo.networkIndex=i;
        break;
      } 
    }
		var networkType=logo.networkInfo[i]["type"];
		logo.currentClass=logo.networkInfo[i]["view"];
		var trackInfoFile;
		if(networkType=="system")
		  trackInfoFile="data/system/info/"+logo.networkInfo[i]["name"]+"/trackInfo.js";
		else
		  trackInfoFile="data/user/info/"+logo.networkInfo[i]["directory"]+"/trackInfo.js";
		 trackInfo=[];
		 $.ajax({
			 url: trackInfoFile,
			 async: false,
			 dataType: "json",
			 success: function(data){ 
				 trackInfo=data;
				 /*
				 $("body").addClass("loading"); 
				 $("#mymodal").css({'display':'block'});
				 */
				 b = new NGBrowser({      
					 containerID: "NGBrowser",
					 networkInfo: logo.networkInfo[logo.networkIndex],
					 trackData: trackInfo,
			     defaultTracks: logo.networkInfo[logo.networkIndex]["default_track"],
           userNetworkKey: logo.userNetworkKey,
					 currentNetwork: logo.currentNetwork,
					 ngDocRoot:logo.ngDocRoot
				 });
				 /*
				 $("body").removeClass("loading"); 
				 $("#mymodal").css({'display':'none'});
				 */
			 }
		 });
    $("#NGBrowser").css("border-top-color","#8CC63F");
		var menuInputData={"allNetworks":logo.allNetworks, "currentNetwork":logo.currentNetwork};
		b.buildNetworkMenu(menuInputData, "menu_view_select", "menu_view_delete");
    });
		  
    if(document.pub) {
       document.pub();
    }
};

var NGBrowser = function(params) {
  var brwsr = this;
  brwsr.userNetworkKey=params.userNetworkKey;
  brwsr.networkInfo=params.networkInfo;
  brwsr.trackData=params.trackData;
	brwsr.ngDocRoot=params.ngDocRoot;
  brwsr.deferredFunctions = [];     
  brwsr.curUserTrackID=1;
  brwsr.userTracks={};  // holds all current user created tracks
  brwsr.loadingFromCookie=true;
	//brwsr.relatedTracks={}; // holds related tracks for current source track 
	brwsr.currentUserTrackType=null;
  brwsr.trackTitleShow=true;
  brwsr.linkedTrackNames=[];
  brwsr.leafNodes=undefined;
  brwsr.label2ngid=undefined;
  brwsr.treeID2originalID=undefined;
  // the minimum size is by default 2;
  brwsr.maxCytoscapeWebSize=500;
  brwsr.maxCollapseSize=100;
  brwsr.minCollapseSize=2;
  brwsr.maxTrackSizeForExtension=10;
  // keep track of how many sample heatmap (annotation) is currently visible
  brwsr.visibleSampleAnnotationCount=0;
  brwsr.isInitialized = false;
  brwsr.gene_string=""; // holds actual gene names for current user created track
  brwsr.trackColor=[]; // specical user track that assign colors to different gene
	brwsr.geneLocatorShown=true;
	brwsr.linkedTracksFormShown=true;
	brwsr.relatedTracksFormShown=true;
	brwsr.sigModulesFormShown=true;
	brwsr.vennTracksFormShown=true;
	brwsr.covisFormShown=true;
//	brwsr.fixUploadTrack=false;
//	brwsr.fixUploadNetwork=false;
	brwsr.relatedTracksDefaultText="No enrichment analysis performed";
	brwsr.sigModulesDefaultText="No enrichment analysis performed";
	brwsr.vennTracksDefaultText="Not enough applicable tracks added";
	brwsr.covisTracksDefaultText="Not enough applicable tracks added";
	brwsr.maxStatModuleSize=1000000; // disabled for now. maximum module size for module level statistical analysis
	brwsr.maxCreateViewUploadCCTSizeMB=50;
	brwsr.maxCreateViewUploadTSISizeMB=50;
	brwsr.maxUploadViewSizeMB=100;
	brwsr.maxUploadTrackSizeMB=50;
	// the data transform categories may change in the future
	// sct, cct data transform
	// if the order of these transfomr is changed, the image generating program should also be modified.
  brwsr.dataTransform={  // the last item is always "no action"
	                     "cct":{
												 /*
	                       "log transformation":["yes","no"],
											   "truncation (visualization only)":["no truncation", "99%","95%","90%","75%","50%"],
	                       "gene-wise standarization":["none","substracting mean","substracting median","z-score"]
	                       "sample-wise normalization":["quantile","mean","none"],
												 */
	                       "Gene-wise Standardization":["none","subtracting mean","subtracting median"]
											 },
											 "sct":{
												 /*"log transformation":["yes","no"],
												 "truncation (visualization only)":["no truncation","99%","95%","90%","75%","50%"]
												 */
											 }
											};
  $(document).ready(
    function() {
	    // preload images 
	    preload('graph.png,graph-big.png,graph-disabled.png,graph-big-disabled.png');
      // TODO if user network, load more trackData from localStorage if existed.
      brwsr.container=$("#"+params.containerID);
			brwsr.container.id=params.containerID;
      brwsr.currentNetwork=params.currentNetwork;
			// set the value in user upload track dialog
      $('input#currentNetwork').val(brwsr.currentNetwork);
      var uiWestDiv=$("<div>").attr("id","ui-layout-west").css("overflow","scroll");
      brwsr.uiWestDiv=uiWestDiv;
      $(brwsr.container).append($(uiWestDiv));
      var centerContainer=$("<div>").attr("id","ui-layout-center");
      $(brwsr.container).append($(centerContainer));
			// toppane: center-north
      var topPaneDiv=$("<div>").attr("id","toppane").addClass("toppane");
      brwsr.topPaneDiv=topPaneDiv;
      $(centerContainer).append(topPaneDiv);
      var overview=$("<div>").attr("id","overview").addClass("overview");
      $(topPaneDiv).append($(overview));
			// dragWindow: center-center
      var viewElemDiv=$("<div>").attr("id","dragWindow").addClass("dragWindow");
      $(centerContainer).append($(viewElemDiv));
      //trackListDiv.className = "container handles";
	// if user just reloaded the browser, load tracks from old cookies if exists
  var oldTrackListLabels=[];  // array
  var oldTrackListKeys=[];  // array
	var oldTrackListLabelString, oldTrackListKeyString;
  var objString;

	if(typeof(localStorage)!="undefined"){
		oldTrackListLabelString=localStorage.getItem(brwsr.container.id+"-track-labels");
		oldTrackListKeyString=localStorage.getItem(brwsr.container.id+"-track-keys");
		if(oldTrackListLabelString && oldTrackListKeyString){
		  oldTrackListLabels=$.parseJSON(oldTrackListLabelString);  // will be an array
		  oldTrackListKeys=$.parseJSON(oldTrackListKeyString);  // will be an array
		}
	}

		// if no cookies are set, that's fine. don't show any track.
  brwsr.oldTrackListLabelString=oldTrackListLabelString;
  brwsr.oldTrackListKeyString=oldTrackListKeyString;
  brwsr.oldTrackListLabels=oldTrackListLabels;
  brwsr.oldTrackListKeys=oldTrackListKeys;

  var mainContentTabDiv=$("<div>").attr("id","main-content-tab");
  var helpTabDiv=$("<div>").attr("id","help-tab");
  //var aboutTabDiv=$("<div>").attr("id","about-tab").css("margin-left","10px").html("<br><br>Shi Z.,Wang J.,Zhang B. (2013). <a href='http://www.nature.com/nmeth/journal/v10/n7/full/nmeth.2517.html' target='_blank'>NetGestalt: integrating multidimensional omics data over biological networks</a>. <i>Nat Methods</i>. 10:597-598.").css("font-size","12px");
  var tab_ul=$("<ul>").appendTo($(uiWestDiv));
	$(tab_ul).append($("<li>").html("<a href=\"#main-content-tab\">Main</a>"));
	$(tab_ul).append($("<li>").html("<a href=\"#help-tab\">Help</a>"));
	$(mainContentTabDiv).appendTo($(uiWestDiv));
	$(helpTabDiv).appendTo($(uiWestDiv));

// top panel
if(params.networkInfo.module_info){
  brwsr.createModuleDiv(topPaneDiv);
}

if(params.networkInfo.network){
  brwsr.loadNetworkData();
}

var navBox=brwsr.createNavBox(topPaneDiv);
brwsr.navBox=navBox;
brwsr.locationTrap=$("<div>").addClass("locationTrap").attr("id","locationTrap").css("overflow","hidden");
$(topPaneDiv).append($(brwsr.locationTrap));
var tview= new TrackView(brwsr, viewElemDiv[0], 250, brwsr.networkInfo, 0.5);
brwsr.view=tview;
//add crosshair guide
brwsr.view.mouseguide=true;
$("#dragWindow").append($("<div>").attr("id","crosshair-v").addClass("hair"));
$("#dragWindow").on('mousemove',function(e){
	/*
  if(brwsr.view.mouseguide && $("#crosshair-v").css("display")=="none" && !brwsr.view.dragging){
	   $("#crosshair-v").css("display", "block");
	}
	*/
  $('#crosshair-v').css('left',e.pageX);
});
brwsr.viewElemDiv=viewElemDiv;
viewElemDiv.view=tview;
//update dragWindow top
brwsr.createHideShowTrackTitleButton();
// add icon to expand/collapse module div
var mod_div=$("#modulediv");
if($(mod_div).length){
  var collapseModuleDivIcon=$("<img>").attr({"src":"images/uparrow.png", "id":"collapseModuleDivIcon"});
  $(collapseModuleDivIcon).css({"position":"absolute","bottom":"0px","right":"30px","width":"16px","height":"18px","z-index":"100"});
  $(brwsr.topPaneDiv).append(collapseModuleDivIcon);
  var expandModuleDivIcon=$("<img>").attr({"src":"images/downarrow.png","id":"expandModuleDivIcon"});
  var overview_h=$("#overview").outerHeight();
  $(expandModuleDivIcon).css({"display":"none","position":"absolute","top":overview_h+"px","right":"30px","width":"16px","height":"18px","z-index":"100"});
  $("#overview").append($(expandModuleDivIcon));
}
collapseModuleDiv=function(){
	 $("#modulediv").css("display","none");
   $("#dragWindow").animate({ 
     top: Util.marginBox($("#overview")).t+Util.marginBox($("#overview")).h+Util.marginBox($("#navbox")).h,
	 });
   brwsr.view.onFineMove(brwsr.view.minVisible(), brwsr.view.maxVisible());
   $("#expandModuleDivIcon").css("display","block");
   $("#collapseModuleDivIcon").css("display","none");
};

expandModuleDiv=function(){
	 $("#modulediv").css("display","block");
   $("#locationTrap").css("display","block");
   $("#dragWindow").animate({ 
     top: Util.marginBox($("#overview")).t+Util.marginBox($("#overview")).h+Util.marginBox($("#navbox")).h+Util.marginBox($("#modulediv")).h,
	 });
   brwsr.view.onFineMove(brwsr.view.minVisible(), brwsr.view.maxVisible());
   $("#expandModuleDivIcon").css("display","none");
   $("#collapseModuleDivIcon").css("display","block");
};

$("#collapseModuleDivIcon").click(collapseModuleDiv);
$("#expandModuleDivIcon").click(expandModuleDiv);

var resizeId;
brwsr.windowResized=function(){
	function doneResizing(){
		//console.log("windowResized");
		brwsr.view.sizeInit();
		brwsr.view.locationTrapHeight=Util.marginBox($(navBox)).h;
		brwsr.view.overviewBox=Util.marginBox(brwsr.view.overview, brwsr.layout);
		//console.log("overviewBox w --"+brwsr.view.overview.css("width"));
		tview.showVisibleBlocks();
		tview.resizeModuleDiv();
		tview.showFine();
		tview.showCoarse(); 
	}
  clearTimeout(resizeId);
	resizeId=setTimeout(doneResizing, 500);
};
//$(viewElemDiv).resize(function(){windowResized();});
brwsr.view.locationTrapHeight=Util.marginBox($(navBox)).h;
$(window).resize(function(){brwsr.windowResized();});
// if cookie is set, show tracks 
var trackShownDiv=$("#trackShown");
if (params.tracks) {
 /* not used */
 } else if (oldTrackListLabels.length>0) {
   //console.log(oldTrackListLabelString);
   brwsr.showTracks($.parseJSON(oldTrackListLabelString));
   if (!brwsr.isInitialized) {
     brwsr.deferredFunctions.push(
         function() { 
					 /* remove comment to enable linked tracks 
           brwsr.updateLinkedTracksForm();
           brwsr.linkedTracksForm.style.display='block';
           brwsr.linkedTracksFormShown=true;
					 */
           brwsr.updateVennTracksForm();
           brwsr.updateCoVisForm();
           // hide it when first load
           $(brwsr.vennTracksForm).css("display",'block');
           brwsr.vennTracksFormShown=true;
         }
         );
   }   
 } else if (params.defaultTracks) {
    for(var i=0; i<params.defaultTracks.length; i++){
      $("<div>").addClass("tracklist-label").attr("id","trackShown_"+params.defaultTracks[i]).html(params.defaultTracks[i]).appendTo($(trackShownDiv)); 
    }
   brwsr.showTracks(params.defaultTracks);
	/* remove comment to enable linked tracks 
   brwsr.updateLinkedTracksForm();
	 */
   brwsr.updateVennTracksForm();
	 brwsr.updateCoVisForm();
}

$(uiWestDiv).tabs().removeClass('ui-corner-all').css({"border":"none"});
// remove padding in tabs
$("div.ui-tabs-panel").css('padding','0px');
var NG_layout=$('#NGBrowser').layout({
    fxName:"slide",
    center__paneSelector:"#ui-layout-center",
    west__paneSelector:"#ui-layout-west" ,
		resizable: false,
		closable: false,
		west__size: 260,
    spacing_open:   2,  // ALL panes
    spacing_closed:   2, // ALL panes
		center__childOptions: {
			closable: false,
			center__paneSelector: "#dragWindow",
			north__paneSelector:  "#toppane",
			spacing_open:   0,  // ALL panes
			spacing_closed:  0 // ALL panes
		}
});
brwsr.layout=NG_layout;
NG_layout.options.west.onopen_end=function () {
	var oldLocCookie=$.cookie(brwsr.container.id+"-location");
	var oldLocMapDict;
	var oldLocMap;
	if(oldLocCookie){
		oldLocMapDict=$.parseJSON(window.atob(oldLocCookie)); 
		oldLocMap=oldLocMapDict[brwsr.currentNetwork];
	}
	if(oldLocMap){
		brwsr.navigateTo(brwsr.networkInfo.name + ":" + oldLocMap);
	}
	else{
		brwsr.navigateTo(brwsr.networkInfo.name
			+ ":" + ((((brwsr.networkInfo.start + brwsr.networkInfo.end)
			* 0.4) | 0)
			+ " .. " + (((brwsr.networkInfo.start + brwsr.networkInfo.end)
			* 0.6) | 0)));
	}
	brwsr.windowResized(); 
};
NG_layout.options.west.onclose_end = function () {
	var oldLocCookie=$.cookie(brwsr.container.id+"-location");  
	var oldLocMapDict;
	var oldLocMap;
	if(oldLocCookie){
		oldLocMapDict=$.parseJSON(window.atob(oldLocCookie));
		oldLocMap=oldLocMapDict[brwsr.currentNetwork];
	}
	if(oldLocMap){
		brwsr.navigateTo(brwsr.networkInfo.name + ":" + oldLocMap);
	}
	else{
		brwsr.navigateTo(brwsr.networkInfo.name
			+ ":" + ((((brwsr.networkInfo.start + brwsr.networkInfo.end)
			* 0.4) | 0)
			+ " .. " + (((brwsr.networkInfo.start + brwsr.networkInfo.end)
			* 0.6) | 0)));
	}
	brwsr.windowResized(); 
};
// track search box 
brwsr.networkInfo=params.networkInfo;
brwsr.createMainContent(mainContentTabDiv);
brwsr.createHelpPane($(helpTabDiv));
//set initial location
var oldLocCookie=$.cookie(brwsr.container.id+"-location");
var oldLocMapDict;
var oldLocMap;
if(oldLocCookie){
	oldLocMapDict=$.parseJSON(window.atob(oldLocCookie));
	oldLocMap=oldLocMapDict[brwsr.currentNetwork];
}
//var oldLocMap = $.cookie(brwsr.container.id +"-"+brwsr.currentNetwork+"-location") || "";  
brwsr.view.sizeInit();
brwsr.view.overviewBox=Util.marginBox(brwsr.view.overview);
brwsr.view.resizeModuleDiv();
if (params.location) {
  brwsr.navigateTo(params.location);
} else if (oldLocMap) {
  brwsr.navigateTo(brwsr.networkInfo.name + ":" + oldLocMap);
} else if (params.defaultLocation){
  brwsr.navigateTo(params.defaultLocation);
} else {
/*
  brwsr.navigateTo(brwsr.networkInfo.name
      + ":" + ((((brwsr.networkInfo.start + brwsr.networkInfo.end)
            * 0.4) | 0)
        + " .. " + (((brwsr.networkInfo.start + brwsr.networkInfo.end)
            * 0.6) | 0)));
*/
// default to the entire network range
  brwsr.navigateTo(brwsr.networkInfo.name+":"+((brwsr.networkInfo.start|0)+" .. "+(brwsr.networkInfo.end|0)));
}

brwsr.isInitialized=true;
//$('#currentnetworkdiv').html("Current view &raquo; "+ng_logo.allNetworks[brwsr.currentNetwork]["view"]+" &raquo; <a href=\"#\">"+brwsr.currentNetwork+"</a>");
brwsr.setCurrentViewInfo("currentnetworkdiv");

var sortedRuler=brwsr.view.ruler.slice(0);
sortedRuler.sort();
$('#locategenebox').autocompleteArray(sortedRuler,
   {
      delay:10,
      minChars:1,
      matchSubset:1,
      onItemSelect:brwsr.zoomIntoGene,
      onFindValue:brwsr.zoomIntoGene,
      autoFill:true,
      maxItemsToShow:10
    }
);

//if someone calls methods on this browser object
//before it's fully initialized, then we defer
//those functions until now
for (var i = 0; i < brwsr.deferredFunctions.length; i++){
  brwsr.deferredFunctions[i]();
 }
 brwsr.deferredFunctions = [];
// enable drag and drop to reorder existing tracks
$('#zoomContainer').sortable({
    connectWith:"#zoomContainer",
    mouse:"pointer",
		items:".sortable",
		handle:".track-label",
    axis: "y",
    //tolerance: "pointer",
    //placeholder:"placer",
		//helper:"clone",
		helper: function(){
       var node=$("<div>").addClass("tracklist-label-helper").html("abc");
			 return node;
    },
		forcePlaceholderSize: true,
		forceHelperSize: true,
    refreshPosition: true,
		//revert: true,
		dropOnEmpty: true,
		start: function(event, ui){
		    event.stopPropagation();
		    ui.item.show();
        // get track label "left" position;
        var track_id=$(ui.item).attr("id");
        var label_id=track_id.replace("track_","label_");
        var label_delete_id="delete_"+label_id;
        var label_left=parseInt($("#"+Util.jqSelector(label_id)).css("left"));
        var label_width=parseInt($("#"+Util.jqSelector(label_id)).css("width"))-parseInt($("#"+Util.jqSelector(label_delete_id)).css("width"));
        $(ui.helper).css({"height":"15px", "left":label_left+"px", "width":(label_width+10)+"px"});
        var key;
        $.each(brwsr.view.tracks, function(index, track){
          if("track_"+track.name==track_id){
             key=track.key;
             return false;
          }
        });
        $(ui.helper).html(key);
				ui.item.data('oldIndex', ui.item.index());
				ui.item.data('oldOrder', $(this).sortable('toArray'));
				if(brwsr.view.mouseguide){
				    $('#crosshair-v').css("display","none");
			  }
	   },
    stop: function (event, ui) {
		    var newOrder=$(this).sortable('toArray').toString();
       // check if the order is changed, if not don't update
			 if(newOrder!=ui.item.data("oldOrder")){
				 brwsr.onVisibleTracksChanged();
			 }
				brwsr.sortingTrack=false;
				if(brwsr.view.mouseguide){
				    $('#crosshair-v').css("display","block");
			  }
			  brwsr.reorderVennTracksForm();
			  brwsr.reorderCovisTracksForm();
		},
    sort: function(event, ui){
      var currentIndex=ui.placeholder.index();
			var oldIndex=ui.item.data("oldIndex");
			if(currentIndex>oldIndex){
			  currentIndex--;
			}
//  	console.log("oldIndex="+oldIndex+" newIndex="+currentIndex);
      if(currentIndex!=oldIndex){
        $(ui.helper).css({"background-color":"#2EFE2E"});
      }
      else{
        $(ui.helper).css({"background-color":"#FFFF45"});
      }
    }
});
/*
$('#zoomContainer').bind("sortstop", function(event, ui) {
    $(ui.helper).css("background-color","#EBF5DF");
 });
*/
$('#zoomContainer').disableSelection();
// get the initial zoomContainer position, the top is kept unchanged during dragging
brwsr.view.zoomContainerTop=$("#zoomContainer").offset().top;
});
if(brwsr.currentNetwork){
	var menuInputData={"allNetworks":ng_logo.allNetworks,"currentNetwork":brwsr.currentNetwork};
	brwsr.buildNetworkMenu(menuInputData, "menu_view_select", "menu_view_delete");
}
$('#exportpdfdiv').on('click', function(event){
  brwsr.exportPDFClicked(event);
});

// create about menu item
var time=new Date();
var year=time.getFullYear();

// if the network kind is is "msm", it will always have a default tracks
if(brwsr.networkInfo["kind"]=="msm"){
  brwsr.hideLeftPaneHint();
}
if(brwsr.networkInfo["mapping_status"]!="0"){
   $("#menu_track_browse").css({"display":"none"});   
   $("#menu_track_search").css({"display":"none"});   
   $("#menu_track_enter").css({"display":"none"});   
}
else{
   $("#menu_track_browse").css({"display":"block"});   
   $("#menu_track_search").css({"display":"block"});   
   $("#menu_track_enter").css({"display":"block"});   
}

$("body").append($("<div>").attr({"id":"ngaboutdiv"}).css({"display":"none"}).html("Version 1.2<br><br><img src='images/ng-email.png'><img><br><br>&copy" + year));
};


NGBrowser.prototype.buildNetworkMenu=function(network_data, view_select_id, view_delete_id){
	var brwsr=this;
  var all_views=Object.keys(network_data["allNetworks"]);
	var view_select=$("#"+view_select_id);
	view_select.next().remove();
	var view_delete=$("#"+view_delete_id);
	view_delete.next().remove();
	var all_views_len=all_views.length;
	var all_user_views_len=0;
	var i;
	var select_menu_items, delete_menu_items;
	// first test if there any additonal views
	for(i=0; i<all_views.length; i++){
		if(network_data["allNetworks"][all_views[i]].type=="user"){
		  all_user_views_len++;
		}
	}
  if(all_views_len>0){
	  select_menu_items=$("<ul>").insertAfter(view_select);
		if(!view_select.hasClass("fly")){
			view_select.addClass("fly");
			view_delete.removeClass("menu_disabled");
		}
	}
	else{
		if(view_select.hasClass("fly")){
			view_select.removeClass("fly");
			view_delete.addClass("menu_disabled");
		}
	}
	if(all_user_views_len>0){
    delete_menu_items=$("<ul>").insertAfter(view_delete);
		if(!view_delete.hasClass("fly")){
			view_delete.addClass("fly");
			view_delete.removeClass("menu_disabled");
		}
	}
	else{
		if(view_delete.hasClass("fly")){
			view_delete.removeClass("fly");
			view_delete.addClass("menu_disabled");
		}
	}
	var view_select_handler=function(name){
     return function(){
		    ng_logo.networkChangedNB(brwsr.currentNetwork, name);
		 };
	};
	var view_delete_handler=function(name, all_views){
     return function(){
				brwsr.deleteUserViewDialog(name, all_views);
		 };
	};
	for(i=0; i<all_views.length; i++){
		if(network_data["currentNetwork"]==all_views[i]){
			//select_menu_items.append($("<li>").append($("<a>").addClass("menu_disabled").text(all_views[i]).on("mouseover",function(evt, name){return function(){ balloon17394.showTooltip(evt, name);}}(event, all_views[i]))));
			select_menu_items.append($("<li>").append($("<a>").addClass("menu_disabled").text(all_views[i].trunc_mid(20))));
			if(network_data["allNetworks"][all_views[i]].type=="user"){
				// now allow user to delete the current viewing view
			  //delete_menu_items.append($("<li>").append($("<a>").addClass("menu_disabled").text(all_views[i])));
			  //delete_menu_items.append($("<li>").append($("<a>").text(all_views[i]).click(view_delete_handler(all_views[i], all_views)).on("mouseover",function(evt, name){return function(){balloon17394.showTooltip(evt, name);}}(event, all_views[i]))));
			  delete_menu_items.append($("<li>").append($("<a>").text(all_views[i].trunc_mid(20)).click(view_delete_handler(all_views[i], all_views))));
			}
		}
		else{
			//select_menu_items.append($("<li>").append($("<a>").text(all_views[i]).click(view_select_handler(all_views[i])).on("mouseover",function(evt, name){return function(){ balloon17394.showTooltip(evt, name);}}(event, all_views[i]))));
			select_menu_items.append($("<li>").append($("<a>").text(all_views[i].trunc_mid(20)).click(view_select_handler(all_views[i]))));
			if(network_data["allNetworks"][all_views[i]].type=="user"){
			  //delete_menu_items.append($("<li>").append($("<a>").text(all_views[i]).click(view_delete_handler(all_views[i], all_views)).on("mouseover",function(evt, name){return function(){ balloon17394.showTooltip(evt, name);}}(event, all_views[i]))));
			  delete_menu_items.append($("<li>").append($("<a>").text(all_views[i].trunc_mid(20)).click(view_delete_handler(all_views[i], all_views))));
			}
		}
	}
};

NGBrowser.prototype.clearTrackInfo=function(randomString){
  var brwsr=this;
  var current_selected_leaf_div=$("#current_selected_leaf_"+randomString);
  if(current_selected_leaf_div)
    $(current_selected_leaf_div).text("");
  var rightTopFrame=brwsr.rightTopFrame;
  var rightBottomFrame=brwsr.rightBottomFrame;
  var myid=rightTopFrame.doc.getElementById("currentLeafTrackList-nav");
  if(myid!=null){
    rightTopFrame.doc.body.removeChild(myid);
    var myid2=rightTopFrame.doc.getElementById("currentLeafTrackList");
    rightTopFrame.doc.body.removeChild(myid2);
  }
  myid=rightBottomFrame.doc.getElementById("currentLeafTrackInfoTable");
  if(myid!=null){
    //rightBottomFrame.doc.body.removeChild(myid);
    $(myid).remove();
  }
};

// return "user" or "system"
NGBrowser.prototype.currentNetworkType=function(){
  var brwsr=this;
	var currentNetwork=brwsr.currentNetwork;
  return ng_logo.allNetworks[currentNetwork]["type"];
};


NGBrowser.prototype.createMainContent=function(mainContent){
  var brwsr=this;
  brwsr.mainContent=mainContent;
	var searchTrackBox=brwsr.createSearchTrackBox(brwsr.uiWestDiv, brwsr.currentNetwork);
	brwsr.searchTrackBox=searchTrackBox;
	$("body").append($(brwsr.searchTrackBox));
  var geneInputBox=brwsr.createGeneInputBox(brwsr.uiWestDiv, brwsr.currentNetwork, this.view.ruler);
  brwsr.geneInputBox=geneInputBox;
  $("body").append($(this.geneInputBox));
  $(mainContent).append($(brwsr.createUserEnterTrackNameDiv()));
  var linkedTracks=$("<div>").attr("id","linkedtracks").addClass("leftpanediv").css({"position":"relative"});
  this.linkedTracks=linkedTracks;
  var text1=$("<p>").html("&nbsp;Linked Sort").addClass("left-pane-header");
  $(linkedTracks).append($(text1));
  var linked_plusminus=$("<span>").html("hide").addClass("header-icon");
  this.linked_plusminus=linked_plusminus;
  $(linkedTracks).append($(linked_plusminus));
  var linkedTracksFormDiv=$("<div>").attr("id","linkedtracksformdiv");
  this.linkedTracksFormDiv=linkedTracksFormDiv;
  $(linkedTracks).append($(linkedTracksFormDiv));
  $(linked_plusminus).click(function(event){brwsr.toggleLinkedFormDiv('linkedtracksformdiv',linked_plusminus);});
	// Remove comment to add linked sort back to main content panel
  //$(mainContent).append($(linkedTracks));

  // this div deals with gene locator
  // SZA-Nature Methods
  var geneLocator=$('<div>',{id:'genelocator'});
  this.geneLocator=geneLocator;
  $(geneLocator).addClass('leftpanediv');
  $(geneLocator).css({'position':'relative'});
  textGeneLocator=$("<p>").html("&nbsp;Zoom to a Gene").css("margin-top","0px");
  $(textGeneLocator).addClass('left-pane-header');
  $(textGeneLocator).appendTo($(geneLocator));
  var geneLocator_plusminus=$('<span>');
  this.geneLocator_plusminus=geneLocator_plusminus;
  $(geneLocator_plusminus).html('hide');
  $(geneLocator_plusminus).addClass('header-icon');
  $(geneLocator_plusminus).appendTo($(geneLocator));
  var geneLocatorDiv=$('<div>',{id:'genelocatordiv'});
  $(geneLocatorDiv).appendTo($(geneLocator));
  this.geneLocatorDiv=geneLocatorDiv;
  $(geneLocator_plusminus).click(function(event){
         brwsr.toggleGeneLocatorDiv('genelocatordiv', geneLocator_plusminus);
     });   
  $(geneLocator_plusminus).hover(function(event){
        $(this).toggleClass('toggleColor');

     });   
  var locateGeneBox=brwsr.createLocateGeneBox(brwsr.uiWestDiv, brwsr.currentNetwork);
  brwsr.locateGeneBox=locateGeneBox;
  $(locateGeneBox).appendTo($(geneLocatorDiv));
  $(geneLocator).appendTo($(mainContent));
  var relatedTracks=$("<div>").attr("id","relatedtracks").addClass("leftpanediv").css("position","relative");
  this.relatedTracks=relatedTracks;
  this.relatedTracksUrl="get_related_tracks.php";
  text1=$("<p>").html("&nbsp;Enrichment Results").addClass("left-pane-header");
  $(relatedTracks).append($(text1));
  var related_plusminus=$("<span>").html("hide").addClass("header-icon");
  this.related_plusminus=related_plusminus;
  $(relatedTracks).append($(related_plusminus));
  var relatedTracksFormDiv=$("<div>").attr("id","relatedtracksformdiv").css({"margin-left":"5px","padding":"5px", "display":"none", "background-color":"#F6F2EE"});
	var relatedDefaultMsg=$("<div>").attr("id","defaultrelatedmsg").css({"margin-left":"5px","padding":"5px", "background-color":"#F6F2EE"}).html(brwsr.relatedTracksDefaultText);
	$(relatedTracks).append($(relatedDefaultMsg));
  $(relatedTracks).append($(relatedTracksFormDiv));
  this.relatedTracksFormDiv=relatedTracksFormDiv;
  $(related_plusminus).click(function(event){
            brwsr.toggleRelatedTracksFormDiv('relatedtracksformdiv',related_plusminus);
          }    
   );   
  $(related_plusminus).hover(function(event){
        $(this).toggleClass('toggleColor');
  });
  $(mainContent).append($(relatedTracks)); 
  var sigModules=$("<div>").attr("id","sigmodules").addClass("leftpanediv").css("position","relative");
  this.sigModules=sigModules;
  //this.relatedTracksUrl="get_related_tracks.php";
  text1=$("<p>").html("&nbsp;Significant Modules").addClass("left-pane-header");
  $(sigModules).append($(text1));
  var sigmodules_plusminus=$("<span>").html("hide").addClass("header-icon");
  this.sigmodules_plusminus=sigmodules_plusminus;
  $(sigModules).append($(sigmodules_plusminus));
  var sigModulesFormDiv=$("<div>").attr("id","sigmodulesformdiv").css({"margin-left":"5px","padding":"5px","display":"none","background-color":"#F6F2EE"});
	var sigModulesDefaultMsg=$("<div>").attr("id","defaultsigmodulesmsg").css({"margin-left":"5px","padding":"5px", "background-color":"#F6F2EE"}).html(brwsr.sigModulesDefaultText);
  this.sigModulesFormDiv=sigModulesFormDiv;
  $(sigModules).append($(sigModulesDefaultMsg));
  $(sigModules).append($(sigModulesFormDiv));
  $(sigmodules_plusminus).click(function(event){
            brwsr.toggleSigModulesFormDiv('sigmodulesformdiv',sigmodules_plusminus);
          }    
   );   
  $(sigmodules_plusminus).hover(function(event){
        $(this).toggleClass('toggleColor');
  });
  $(mainContent).append($(sigModules)); 
  var vennTracks=$("<div>").attr("id","venntracks").addClass("leftpanediv").css("position","relative");
  this.vennTracks=vennTracks;
  text1=$("<p>").html("&nbsp;Track Comparison").addClass("left-pane-header");
  $(vennTracks).append($(text1));
  var venn_plusminus=$("<span>").html("hide").addClass("header-icon");
  this.venn_plusminus=venn_plusminus;
  $(vennTracks).append($(venn_plusminus));
  var vennTracksFormDiv=$("<div>");
  this.vennTracksFormDiv=vennTracksFormDiv;
  //this.vennColors=['#F08080','#32CD32','#4682B4', '#FFCC00', '#FF99FF', '#66CCFF']; 
  //this.vennColors=['#F08080','#32CD32','#4682B4', '#CC3300', '#FF3399', '#0099CC']; 
  //this.vennColors=['#F08080','#32CD32','#4682B4','#8B4513','#9400D3','#808080','#1E90FF','#FFFFFF']; 
  //this.vennColors=['#F7BDBD','#ABEBAB','#B4CDE2','#8B4513','#9400D3','#FF0000','#1E90FF','#FFFFFF']; 
  if(screenshot)
    this.vennColors=['#008000','#000080','#FF0000','#8B4513','#9400D3','#000000','#1E90FF','#FFFFFF']; 
  else
    this.vennColors=['#ABEBAB','#B4CDE2','#F7BDBD','#8B4513','#9400D3','#FF0000','#1E90FF','#FFFFFF']; 
  this.vennTextColors=['#32CD32','#4682B4', '#F08080'];
	// for two circles case
  this.vennColors2=['#F7BDBD', '#ABEBAB','#FF0000','#FFFFFF']; 
  this.vennColorUsed=[0,0,0]; //keep track of which colors are currently used.
  $(vennTracksFormDiv).attr("id", "venntracksformdiv").css("position", "relative").css({"margin-left":"5px","padding":"5px", "background-color":"#F6F2EE"});
	var vennDefaultMsg=$("<div>").attr("id","defaultvennmsg").css({"margin-left":"5px","padding":"5px", "background-color":"#F6F2EE"}).html(brwsr.vennTracksDefaultText);
	$(vennTracks).append($(vennDefaultMsg));
  $(vennTracks).append($(vennTracksFormDiv));
  $(venn_plusminus).click(function(event){brwsr.toggleVennTracksFormDiv('venntracksformdiv',venn_plusminus);});
  $(venn_plusminus).hover(function(event){
        $(this).toggleClass('toggleColor');
	});
  $(mainContent).append($(vennTracks));
	// track covisualization
  var covisualize=$("<div>").attr("id","covisualize").addClass("leftpanediv").css({"position":"relative"});
	this.covisualize=covisualize;
  text1=$("<p>").html("&nbsp;Track Co-visualization").addClass("left-pane-header");
  $(covisualize).append($(text1));
  var covis_plusminus=$("<span>").html("hide").addClass("header-icon");
  this.covis_plusminus=covis_plusminus;
  $(covisualize).append($(covis_plusminus));
  $(covis_plusminus).click(function(event){brwsr.toggleCovisFormDiv(covis_plusminus);});
  $(covis_plusminus).hover(function(event){
        $(this).toggleClass('toggleColor');
	});
  var covisFormDiv=$("<div>");
  this.coVisFormDiv=covisFormDiv;
  var covisFormHeader=$("<div>").attr("id","covisformheader").css({"position":"relative","margin-top":"5px","font":"12px Arial, sans-serif","display":"none"});
	var covisDefaultMsg=$("<div>").attr("id","defaultcovismsg").css({"margin-left":"5px","padding":"5px", "background-color":"#F6F2EE"}).html(brwsr.covisTracksDefaultText);
	$(covisualize).append($(covisDefaultMsg));
	$(covisualize).append($(covisFormHeader));
	this.coVisFormHeader=covisFormHeader;
	this.coVisDefaultMsg=covisDefaultMsg;
	var border_icon=$("<div>").attr("id","covis_border_icon").css({"float":"left","margin-left":"10px"});
	$(border_icon).append($("<img>").attr("src","images/border_icon.png").css({"width":"12px"}));
  $(border_icon).on("mouseover", function(evt){ 
	  balloon17394.showTooltip(evt, "Show with border");
	});
	var fill_icon=$("<div>").attr("id","covis_fill_icon").css({"float":"left","margin-left":"8px"});
	$(fill_icon).append($("<img>").attr("src","images/fill_icon.png").css({"width":"12px"}));
  $(fill_icon).on("mouseover", function(evt){ 
	  balloon17394.showTooltip(evt, "Show with fill");
	});
	var covis_track_name=$("<div>").attr("id","covis_track_name").html("Track Name").css({"float":"left","margin-left":"8px"});
	$(border_icon).appendTo($(covisFormHeader));
	$(fill_icon).appendTo($(covisFormHeader));
	$(covis_track_name).appendTo($(covisFormHeader));
	$("<div>").css("clear","left").appendTo($(covisFormHeader));
  $(covisFormDiv).attr("id", "covisformdiv").css("position", "relative");
  $(covisualize).append($(covisFormDiv));
  var covisSubmitButtons=$("<div>").attr("id","covissubmitbuttons").css({"display":"none","position":"relative"});
	var covisSubmitButton_g=$("<div>").attr("id","covissubmitbutton_g").addClass("ng_button").addClass("ng_button_disabled").css("right","5px").append($("<img>").attr("src","images/graph-disabled.png").css("width","14px"));
	var covisSubmitButton_big_g=$("<div>").attr("id","covissubmitbutton_big_g").addClass("ng_button").addClass("ng_button_disabled").css("right","40px").append($("<img>").attr("src","images/graph-big-disabled.png").css("width","14px"));
	$(covisSubmitButton_g).appendTo($(covisSubmitButtons));
	$(covisSubmitButton_big_g).appendTo($(covisSubmitButtons));
	$(covisFormDiv).append($(covisSubmitButtons));
  $(mainContent).append($(covisualize));

	if(brwsr.oldTrackListLabels.length>0){
		$("#menu_track_clear").removeClass("menu_disabled");
		$("#menu_track_clear").click(
			function() {
				box17395.nukeTooltip();
				brwsr.clearAllTracksDialog("open");
			});
		$("#locategenebox").prop('disabled', false);
		$("#locategenebox").val("");
    brwsr.hideLeftPaneHint();
		$(this.hideTrackTitleIcon).css({"position":"absolute","bottom":"0px","left":"0px","width":"16px","height":"18px","z-index":"100"});
		$(this.showTrackTitleIcon).css({"display":"none","position":"absolute","bottom":"0px","left":"0px","width":"16px","height":"18px","z-index":"100"});
	}
  else{
    $(this.hideTrackTitleIcon).css("display","none");
    $(this.showTrackTitleIcon).css("display","none");
		$("#menu_track_clear").addClass("menu_disabled");
		$("#menu_track_clear").off();
		$("#locategenebox").prop('disabled', true);
		$("#locategenebox").val("Add track to enable...");
		brwsr.showLeftPaneHint();
  }
};


NGBrowser.prototype.createHelpPane=function(helpTabDiv){
  var brwsr=this;
  var helpdiv=helpTabDiv;
	var ngMouseGestures=$("<div>").attr("id","ngmousegestures");
  $(ngMouseGestures).addClass('leftpanediv');
  $(ngMouseGestures).css({'position':'relative'});
  var ngMouseGesturesHeader=$("<p>").html("&nbsp;Mouse+keyboard Navigation").css("margin-top","0px");
  $(ngMouseGesturesHeader).addClass('left-pane-header');
  $(ngMouseGesturesHeader).appendTo($(helpdiv));
  var helptable;
  helptable=$("<table>").attr("id", "helptbl").css({"margin-top":"10px","width":"250px"});
  row=[];
  cell=[];
  row_num=6;
  tbo=$("<tbody>");
  for(c=0;c<row_num;c++){
    row[c]=$("<tr>");
    cell[0]=$("<td>").css("width","30px");
    cell[1]=$("<td>").css("width","230px");
    if(c==0){
      var img=$("<img>").attr("src","images/pan.png");
      $(cell[0]).append($(img));
      var pantext=$("<span>").html("Drag any where in the track panel");
			var lb1=document.createElement("BR");
      var pantext2=$("<span>").html("to pan");
      $(cell[1]).append($(pantext));
      $(cell[1]).append($(lb1));
      $(cell[1]).append($(pantext2));
    }
    else if(c==1){
      var img=$("<img>").attr("src","images/zoomin.png");
      $(cell[0]).append($(img));
      var zoomintext=document.createTextNode("Double click to zoom in");
      $(cell[1]).append($(zoomintext));
    }
    else if(c==2){
      var img=$("<img>").attr("src","images/zoomout.png");
      $(cell[0]).append($(img));
      var zoomouttext=document.createTextNode("Hold Shift key, double click to");
			var lb1=document.createElement("BR");
      var zoomouttext2=document.createTextNode("zoom out");
      $(cell[1]).append($(zoomouttext));
      $(cell[1]).append($(lb1));
      $(cell[1]).append($(zoomouttext2));
    }
    else if(c==3){
      var img=$("<img>").attr("src","images/zoomin.png");
      $(cell[0]).append($(img));
      var zoomouttext=document.createTextNode("Alt+drag in the track view area to ");
			var lb1=document.createElement("BR");
      var zoomouttext2=document.createTextNode("zoom into selected region");
      $(cell[1]).append($(zoomouttext));
      $(cell[1]).append($(lb1));
      $(cell[1]).append($(zoomouttext2));
    }
		/*
    else if(c==5){
      var img=document.createElement("img");
      img.setAttribute('src','images/sort.png');
      img.setAttribute('width','22px');
      cell[0].appendChild(img);
      var zoomouttext=document.createTextNode("Shift+click in a composite track to sort subtracks");
      cell[1].appendChild(zoomouttext);
    }
		*/
    $(row[c]).append($(cell[0]));
    $(row[c]).append($(cell[1]));
    $(tbo).append($(row[c]));
  }
  $(helptable).append($(tbo));
  $(helpdiv).append($(helptable));
  var ngManualHeader=$("<p>").html("&nbsp;NetGestalt Manual").css("margin-top","0px");
  $(ngManualHeader).addClass('left-pane-header');
  $(ngManualHeader).appendTo($(helpdiv));
  var manualLink=$("<div>").html("<img src=\"images/download_icon.png\" height=\"14px\" style=\"margin-right:10px\"></img><a href=\"doc/NetGestalt_Manual.pdf\" target=\"_blank\" style=\"color:red\">Download</a>").css({"color":"red","margin-left":"10px","margin-top":"5px","margin-bottom":"10px"});
  $(manualLink).appendTo($(helpdiv));
  var ngCitationHeader=$("<p>").html("&nbsp;Citation").css("margin-top","0px");
  $(ngCitationHeader).addClass('left-pane-header');
  $(ngCitationHeader).appendTo($(helpdiv));
  var citationLink=$("<div>").html("Shi Z.,Wang J.,Zhang B. (2013). <a href='http://www.nature.com/nmeth/journal/v10/n7/full/nmeth.2517.html' target='_blank'>NetGestalt: integrating multidimensional omics data over biological networks</a>. <i>Nat Methods</i>. 10:597-598.").css({"margin-left":"10px","margin-top":"5px","margin-bottom":"10px"});
  $(citationLink).appendTo($(helpdiv));
	var toggleMouseGuide=$("<div>").attr("id","togglemouseguide");
  $(toggleMouseGuide).addClass('leftpanediv');
  $(toggleMouseGuide).css({'position':'relative'});
  var toggleMouseGuideHeader=$("<p>").html("&nbsp;Show Mouse Guide").css("margin-top","0px");
  $(toggleMouseGuideHeader).addClass('left-pane-header');
  $(toggleMouseGuideHeader).appendTo($(toggleMouseGuide));
  $(toggleMouseGuide).appendTo($(helpdiv));
  var mouseGuideRadio=$("<div>").attr("id", "mouseguideradiodiv").css("padding-left","5px");
  var mouseGuideYes=$('<input type="radio" id="mouseguideradioyes" name="mouseguideradio" value="yes"/>').appendTo($(mouseGuideRadio)); 
  var mouseGuideYesLabel=$('<label for="mouseguideradio" />').text("On").appendTo($(mouseGuideRadio)); 
  var mouseGuideNon=$('<input type="radio" id="mouseguideradiono" name="mouseguideradio" value="no"/>').css("margin-left","20px").appendTo($(mouseGuideRadio)); 
  var mouseGuideNoLabel=$('<label for="mouseguideradio" />').text("Off").appendTo($(mouseGuideRadio)); 
  $(mouseGuideRadio).appendTo($(helpdiv));
  // set value based on cookie
  if($.cookie(brwsr.container.id+"-mouseguide")=="1"){
    brwsr.view.mouseguide=true;
    $('#crosshair-v').show();
    $("#mouseguideradioyes").prop("checked", true);
  }
  else{
    brwsr.view.mouseguide=false;
    $('#crosshair-v').hide();
    $("#mouseguideradiono").prop("checked", true);
  }
  $("input[name='mouseguideradio']").change( 
		function(){ 
			if($(this).val()=="yes") { 
        brwsr.view.mouseguide=true;
        $('#crosshair-v').show();
        $.cookie(brwsr.container.id+"-mouseguide", "1", {expires: 60});
			} 
			else { 
        brwsr.view.mouseguide=false;
        $('#crosshair-v').hide();
        $.cookie(brwsr.container.id+"-mouseguide", "0", {expires: 60});
			} 
		}); 
};

NGBrowser.prototype.createNavBox=function(parent){
  var brwsr=this;
  var navbox = $("<div>").attr("id","navbox").css({"text-align":"center","padding":"2px 0px 2px 0px","z-index":"10"}); 
 $(parent).append($(navbox));
 var spacedivider=$("<div>").attr("id", "spacedivider");
 $(navbox).append($(spacedivider));
 return navbox;
};

NGBrowser.prototype.loadNetworkData=function(){
  var brwsr=this;
	$.ajax({
		url: brwsr.networkInfo.network,
		async: false,
		dataType: "json",
		success: function(o){
			brwsr.networkData=o;  
		}
	});
};

NGBrowser.prototype.createHideShowTrackTitleButton=function(){
  var brwsr=this;
  var hideTrackTitleIcon=$("<img>").attr({"src":"images/leftarrow.png","id":"hideTrackTitleDivIcon"});
  $(hideTrackTitleIcon).css({"position":"absolute","bottom":"0px","left":"0px","width":"18px","height":"16px","z-index":100});
  $(this.topPaneDiv).append($(hideTrackTitleIcon));
  $("#hideTrackTitleDivIcon").on("mouseover", function(event){
       //tooltip.show("Click to hide track titles"); });
       balloon17394.showTooltip(event, "Click to hide track titles");
       });
  $("#hideTrackTitleDivIcon").on("mouseout",function(){
      // tooltip.hide();
   });
  var showTrackTitleIcon=$("<img>").attr({"src":"images/rightarrow.png","id":"showTrackTitleDivIcon"});
  $(showTrackTitleIcon).css({"display":"none","position":"absolute","bottom":"0px","left":"0px","width":"18px","height":"16px","z-index":100});
  $(this.topPaneDiv).append($(showTrackTitleIcon));
  $("#showTrackTitleDivIcon").on("mouseover",function(event){
      balloon17394.showTooltip(event,"Click to show track titles"); });
  $("#showTrackTitleDivIcon").on("mouseout",function(){
       //tooltip.hide();
       });
  this.hideTrackTitleIcon=hideTrackTitleIcon;
  this.showTrackTitleIcon=showTrackTitleIcon;
  hideTrackTitle=function(){
    $("#hideTrackTitleDivIcon").css("display", "none");
    $("#showTrackTitleDivIcon").css("display", "block");
    $.each(brwsr.view.trackLabels, function(index,curLabel){
       $(curLabel).css("visibility","hidden");
    });
   brwsr.trackTitleShow=false;
  };
  showTrackTitle=function(){
    $("#hideTrackTitleDivIcon").css("display", "block");
    $("#showTrackTitleDivIcon").css("display", "none");
    $.each(brwsr.view.trackLabels, function(index,curLabel){
       $(curLabel).css("visibility","visible");
    });
    brwsr.trackTitleShow=true;
  };
  $("#hideTrackTitleDivIcon").click(hideTrackTitle);
  $("#showTrackTitleDivIcon").click(showTrackTitle);
};

NGBrowser.prototype.createModuleDiv=function(parent){
  var brwsr=this;
  brwsr.moduleDiv=$("<div>").attr("id","modulediv").addClass("modulediv");
  brwsr.moduleData=[];
  $.ajax({
        url: brwsr.networkInfo.module_info,
        dataType: "json",
        async: false,
        success: function(o){
            brwsr.moduleData=o;  
            var i;
            var level_total=0;
            var curLevel=-1;
            var level_best=0;
            for(i=0; i<o.length; i++){
               if(o[i]["level"]!=curLevel){
                 level_total++;
                 curLevel=o[i]["level"];
                 if(o[i]["best"]=='Y'){
                   level_best++;
                 }
               }
            }
            brwsr.moduelLevelTotalCount=level_total;
            brwsr.moduleLevelBestCount=level_best;
        }
  });
  $(parent).append($(brwsr.moduleDiv));
};

NGBrowser.prototype.createGeneInputBox=function(parent, networkName, ruler){
  var brwsr=this;
  var geneInputBox=$("<div>").attr("id","geneinputbox").addClass("geneinputbox");
  this.gibox=new GeneInputBox($(geneInputBox).attr("id"), networkName, ruler, brwsr); 
  return geneInputBox;
}

NGBrowser.prototype.createSearchTrackBox=function(parent, networkName){
  var brwsr=this;
  var searchTrackBox=$("<div>").attr("id","searchtrackbox").addClass("searchtrackbox");
	var info=ng_logo.allNetworks[networkName];
	var name=networkName;
	var dir;
	var type=info["type"]; // user or system
	if(info["type"]=="user"){
	  dir=info["directory"];
	}
  else{
		dir=name;
	}
  this.stbox=new QueryBox("search_track.php?n="+networkName+"&d="+dir+"&t="+type+"&q=",$(searchTrackBox).attr("id"), networkName, brwsr);
  return searchTrackBox;
};

NGBrowser.prototype.createLocateGeneBox=function(parent, networkName){
  var brwsr=this;
  var locateGeneBox=$('<input>',{id:'locategenebox'});
  $(locateGeneBox).addClass('genelocate');
  //$(locateGeneBox).val("Enter a gene...");
  brwsr.lgbox=locateGeneBox;
  return locateGeneBox;
};

/**
 * @private
 */
NGBrowser.prototype.onCoarseMove = function(startbp, endbp) {
    //   console.log(arguments.callee.caller);
   //console.log("onCarseMove: "+startbp+" "+endbp);
   var brwsr=this;
   if(this.view.indicator){
      $(this.view.indicator).remove();
		 delete  this.view.currentModuleStartBp;
		 delete this.view.currentModuleEndBp;
   }
	 if($('#current_vertical_ruler')){
	     $('#current_vertical_ruler').remove();
		}
    var length = this.view.ref.end - this.view.ref.start;
		/*
		console.log("startbp:"+startbp+" endbp:"+endbp);
		console.log("ref.start:"+this.view.ref.start+" ref.end:"+this.view.ref.end);
		console.log(length);
		console.log(this.view.overviewBox.w+" "+this.view.overviewBox.l);
		console.log("overviewbox w:"+this.view.overviewBox.w);
		*/
    var trapLeft = Math.round((((startbp-1-this.view.ref.start) / length)
                               * this.view.overviewBox.w) + this.view.overviewBox.l);
    var trapRight = Math.round((((endbp - this.view.ref.start) / length)
                                * this.view.overviewBox.w) + this.view.overviewBox.l);
    var h=(this.view.overviewBox.h-parseInt(this.view.locationThumb.css("border-top-width"))-parseInt(this.view.locationThumb.css("border-bottom-width")));
    var l=trapLeft;
    var w=(trapRight-trapLeft);
   $(this.view.locationThumb).css({
	    "height":(this.view.overviewBox.h-parseInt(this.view.locationThumb.css("border-top-width"))-parseInt(this.view.locationThumb.css("border-bottom-width")))+"px",
      "left":trapLeft+"px",
      "width":(trapRight-trapLeft)+"px",
      "z-index":20
			});
	  //console.log("left:"+l);
    if (! this.isInitialized) return;
    var locString = Util.addCommas(Math.round(startbp)) + " .. " + Util.addCommas(Math.round(endbp));  
    //console.log("saving cookie: "+locString);
		var oldLocCookie=$.cookie(brwsr.container.id+"-location");
		var oldLocMapDict;
		var oldLocMap;
		if(oldLocCookie){
			oldLocMapDict=$.parseJSON(window.atob(oldLocCookie));
			oldLocMapDict[brwsr.currentNetwork]=locString;
		}
    else{
		  oldLocMapDict={};
			oldLocMapDict[brwsr.currentNetwork]=locString;
		}
    $.cookie(this.container.id+"-location", window.btoa(JSON.stringify(oldLocMapDict)), {expires: 60});
    //document.title = this.networkInfo.name + ":" + locString;
};

NGBrowser.prototype.onFineMove = function(startbp, endbp) {
    var length = this.view.ref.end - this.view.ref.start;
    var trapLeft=Math.round((((startbp-1-this.view.ref.start)/length)*this.view.overviewBox.w)+this.view.overviewBox.l);
    var trapRight = Math.round((((endbp - this.view.ref.start) / length)
                                * this.view.overviewBox.w) + this.view.overviewBox.l);
    var locationTrapStyle;
    var marginBox;
		var modulediv;
    if(this.moduleData){
		  modulediv=$("#modulediv");
		}
    if($(modulediv).length!=0 && $(modulediv).css("display")!="none"){
       marginBoxH=$(modulediv).height();
		}
    else{
       marginBoxH=0;
		}
   $(this.locationTrap).css({"top":this.view.overviewBox.t+"px","height":(this.view.overviewBox.h+marginBoxH)+"px","left":this.view.overviewBox.l+"px","width":(trapRight - trapLeft)+"px","border-width":"0px "+(this.view.overviewBox.w - trapRight)+"px "+(this.view.locationTrapHeight)+"px "+trapLeft+"px"});
};

NGBrowser.prototype.navigateTo = function(loc) {
  if (!this.isInitialized) {
    var brwsr = this;
    // the first time this function called is when loading cookie tracks
    // after this function is called, set loadingFromCookie to false, so that 
    // in onVisibleTracksChanged(), showVisibleBlocks is called.
    this.deferredFunctions.push(function() { brwsr.navigateTo(loc); brwsr.loadingFromCookie=false; });
    return;
  }
    loc=$.trim(loc);
    // (network)    (    start      )   (  sep     )     (    end   )
    var matches = String(loc).match(/^(((\S*)\s*:)?\s*(-?[0-9,.]*[0-9])\s*(\.\.|-|\s+))?\s*(-?[0-9,.]+)$/i);
    //matches potentially contains location components:
    //matches[3] = network (optional)
    //matches[4] = start base (optional)
    //matches[6] = end base (or center base, if it's the only one)
    if (matches) {
      if (matches[3]) {
      /*
        var refName;
        for (ref in this.allRefs) {
          if ((matches[3].toUpperCase() == ref.toUpperCase())
              ||
              ("CHR" + matches[3].toUpperCase() == ref.toUpperCase())
              ||
              (matches[3].toUpperCase() == "CHR" + ref.toUpperCase())) {

            refName = ref;
          }
        }
        */
        var refName=matches[3]; 
        if(debug4){
          console.log("matches[4]="+matches[4]+" matches[6]="+matches[6]);
        }
        if(refName){
          $.cookie(this.container.id + "-refNetwork", window.btoa(refName), {expires: 60});
          if(refName==this.networkInfo.name) {
            if(debug4){
              console.log("refName="+refName+", this.networkInfo.name="+this.networkInfo.name);
              console.log(parseInt(matches[4].replace(/[,.]/g, ""))+" "+parseInt(matches[6].replace(/[,.]/g, "")));
            }
            //go to given start, end on current networkInfo
            if(debug4){
              console.log("setting location ............"+ parseInt(matches[4].replace(/[,.]/g, ""))+".."+ parseInt(matches[6].replace(/[,.]/g, "")));
            }
            this.view.setLocation(this.networkInfo,
                parseInt(matches[4].replace(/[,.]/g, "")),
                parseInt(matches[6].replace(/[,.]/g, "")));
          } else{
					  /* this should not happen */
          }
          return;
        }
      } else if(matches[4]) {
        //go to start, end on this networkInfo
        this.view.setLocation(this.networkInfo,
            parseInt(matches[4].replace(/[,.]/g, "")),
            parseInt(matches[6].replace(/[,.]/g, "")));
        return;
      } else if(matches[6]){
        //center at given base
        this.view.centerAtBase(parseInt(matches[6].replace(/[,.]/g, "")));
        return;
      }
    }
    /*
    //if we get here, we didn't match any expected location format
    var brwsr = this;
    this.names.exactMatch(loc, function(nameMatches) {
      var goingTo;
      //first check for exact case match
      for (var i = 0; i < nameMatches.length; i++) {
    if (nameMatches[i][1] == loc)
        goingTo = nameMatches[i];
      }
      //if no exact case match, try a case-insentitive match
            if (!goingTo) {
                for (var i = 0; i < nameMatches.length; i++) {
                    if (nameMatches[i][1].toLowerCase() == loc.toLowerCase())
                        goingTo = nameMatches[i];
                }
            }
            //else just pick a match
      if (!goingTo) goingTo = nameMatches[0];
      var startbp = goingTo[3];
      var endbp = goingTo[4];
      var flank = Math.round((endbp - startbp) * .2);
      //go to location, with some flanking region
      brwsr.navigateTo(goingTo[2]
           + ":" + (startbp - flank)
           + ".." + (endbp + flank));
      brwsr.showTracks(brwsr.names.extra[nameMatches[0][0]]);
  });
  */
};

NGBrowser.prototype.showTracks = function(trackNameList) {
  if (!this.isInitialized) {
    var brwsr = this;
    this.deferredFunctions.push(
       function() { brwsr.showTracks(trackNameList); }
        );
    return;
  }   
  var trackNames=trackNameList;
  // reverse the order 
  trackNames.reverse();
  var brwsr = this;
  // insert the track list 
  var container = this.view.zoomContainer;
  var found;
  var label_cookies, key_cookies;
  var myindex;
  var found_track;
  var newTrackObj;
	var networkType=brwsr.currentNetworkType();
//	console.log(this.trackData);
	for(var n=0; n<trackNames.length; n++){
		found=false;
		for(var i=0; i<this.trackData.length; i++){
			if(this.trackData[i].label==trackNames[n]){
				found=true;
				found_track=this.trackData[i];
				break;
			}
		}
		if(found){ // system track
       // if it is user network we are viewing, it is possible that track is not generated 
			 if(found_track["url"]==""){
				 var track_t;
				 var myregex=/ann_(.*)_module/g;
				 var matched=myregex.exec(found_track["category"]);
				 if(matched && matched[1]==brwsr.currentNetwork)
					 track_t="user";
				 else
					 track_t="system";
				 newTrackObj=brwsr.createTrackFromIntUrl(found_track, track_t, "user");
				 found_track=newTrackObj;
				 // update this.trackData in memory, not the trackInfo.js file
				 this.trackData[i]["url"]=newTrackObj.url;
			 }
		}
		else{
			// search local storage if it is a user track
			if(typeof(localStorage)!=undefined){
				var trackObjString=localStorage.getItem(trackNames[n]);
				var trackObj;
				if(trackObjString){
					trackObj=JSON.parse(trackObjString);
					if(trackObj["url"][brwsr.currentNetwork]){
						// test to make sure the data has not been deleted on server
						// if deleted, we will not add the track
						if(Util.checkFileExistsOnServer(trackObj.url[brwsr.currentNetwork])){
							found=true;
							var tmpObj={};
							$.extend(tmpObj, trackObj);
							tmpObj.url=trackObj.url[brwsr.currentNetwork];
							if(trackObj.trackColor && trackObj.trackColor[brwsr.currentNetwork])
   							tmpObj.trackColor=trackObj.trackColor[brwsr.currentNetwork];
							tmpObj.network=brwsr.currentNetwork;
							found_track=tmpObj;
							brwsr.trackData.push(found_track);
						}
						else{ //track file deleted
							//localStorage.removeItem(trackNames[n]);       
							// check if intermediate track exists,
							if(Util.checkFileExistsOnServer(trackObj.int_url)){
								//generate the track file
								newTrackObj=brwsr.createTrackFromIntUrl(trackObj, "user", networkType);
							  found=true;
								found_track=newTrackObj;
                //update local storage.
                if(typeof(localStorage)!=undefined){
                  trackObj["url"][brwsr.currentNetwork]=newTrackObj.url;
                  localStorage.setItem(trackNames[n], JSON.stringify(trackObj));
                }
								brwsr.trackData.push(found_track);
							}
						}
					}
					else{
						// network has changed, need to generated new track data ???
						// use the int_url to generated a new track for the new network 
						if(Util.checkFileExistsOnServer(trackObj.int_url)){
							 newTrackObj=brwsr.createTrackFromIntUrl(trackObj, "user", networkType);
							 found=true;
               found_track=newTrackObj; 
               if(typeof(localStorage)!=undefined){
								 var urlObj=trackObj["url"];
								 urlObj[brwsr.currentNetwork]=newTrackObj.url;
								 trackObj["url"]=urlObj;
                 localStorage.setItem(trackNames[n], JSON.stringify(trackObj));
               }
							 brwsr.trackData.push(found_track);
						}
					}
				}   
				else{  // not found in localStorage 
          // something is wrong. 
				}
			}
			// if user browser does not support local storage, the track will not be added.
		}
		if(found){
		  brwsr.stbox.createTrack([found_track]);
		}
		//this.onVisibleTracksChanged();
	}
};

// trackObj: the item from localStorage
// type: user or system track
// ntype: user or system network
NGBrowser.prototype.createTrackFromIntUrl=function(trackObj, type, ntype){
  var brwsr=this;
  var arg={};
	var trkObj={};
	arg.int_url=trackObj.int_url;
	arg.type=type;
	arg.ntype=ntype;
	if(ntype=="system")
	  arg.currentNetwork=brwsr.currentNetwork;
	else 
	  arg.currentNetwork=ng_logo.allNetworks[brwsr.currentNetwork]["directory"];
	$.ajax({
		type: "POST",
		url: "create_track_from_int.php",
		data: arg,
		async: false,
		beforeSend:function(){
		/*
			$("body").addClass("loading"); 
			$("#mymodal").css({'display':'block'});
			*/
		},  
		complete:function(){
		/*
			$("body").removeClass("loading"); 
			$("#mymodal").css({'display':'none'});
			*/
		},  
		success: function(data, textStatus){
			if(textStatus=='success'){
				$.extend(trkObj,trackObj);
				trkObj["url"]=data.url[0];      
				trkObj["network"]=brwsr.currentNetwork;      
			}
		},
		dataType: "json"
	});
	return trkObj;
};

NGBrowser.prototype.onVisibleTracksChanged = function() {
	// update the sample heatmap container position
	this.view.updateTrackList();
	// make sure that only unique track keys will be saved in cookie.
	var trackKeys=$.map(this.view.tracks,
		function(track) { return track.key; }); 
		var trackLabels=$.map(this.view.tracks,
			function(track) { return track.name; }); 

			if(typeof(localStorage)!="undefined"){
				localStorage.setItem(this.container.id+"-track-labels",JSON.stringify(trackLabels));
				localStorage.setItem(this.container.id+"-track-keys", JSON.stringify(trackKeys));
			}
			this.view.showVisibleBlocks(true);
			//  this.view.updateSampleHeatMapDivPosition(); 
			//	this.view.updateVisibleSampleHeatmap();
			if($("#zoomContainer").is(":ui-sortable")){
				$("#zoomContainer").sortable("refresh");
			}
};

NGBrowser.prototype.removeTrackFromLocalStorage=function(containerId, trackLabel, network){
	var brwsr=this;
	var oldStorageLabelValues;
	var oldStorageLabels;

  if(typeof(localStorage)!="undefined"){
    oldStorageLabelValues=localStorage.getItem(brwsr.container.id+"-track-labels");
    oldStorageLabels=$.parseJSON(oldStorageLabelValues);  // will be an array
  }

	var newStorageLabels=oldStorageLabels.slice(0); //copy
	var idx=$.inArray(trackLabel,oldStorageLabels); 
	if(idx!=-1){
		newStorageLabels.splice(idx,1);
    if(typeof(localStorage)!="undefined"){
      localStorage.setItem(brwsr.container.id+"-track-labels", JSON.stringify(newStorageLabels));
    }
	}
	var result=queryTrackDataByLabel(brwsr.trackData, trackLabel);
	for(var i=0; i<result.length; i++){
		if(result[i]["network"]==network)
			break;
	}
	var key=result[i]["key"];
	var oldStorageKeyValues;
	var oldStorageKeys;

  if(typeof(localStorage)!="undefined"){
    oldStorageKeyValues=localStorage.getItem(brwsr.container.id+"-track-keys");
      oldStorageKeys=$.parseJSON(oldStorageKeyValues);  // will be an array
  }

	var newStorageKeys=oldStorageKeys.slice(0);
	idx=$.inArray(key,oldStorageKeys); 
	if(idx!=-1){
		newStorageKeys.splice(idx,1);
    if(typeof(localStorage)!="undefined"){
      localStorage.setItem(brwsr.container.id+"-track-keys", JSON.stringify(newStorageKeys));
    }
	}
};

/**
 * @private
 * add new tracks to the track list
 * @param trackList list of track information items
 * @param replace true if this list of tracks should replace any existing
 * tracks, false to merge with the existing list of tracks
 */
NGBrowser.prototype.addTracks = function(trackList, replace) {    
	if (!this.isInitialized) {
		var brwsr = this;
		this.deferredFunctions.push(
			function() {brwsr.addTracks(trackList, show); } 
		);
		return;
	}    
	this.tracks.concat(trackList);
	if (show || (show === undefined)) {
		this.showTracks($.map(trackList,
			function(t) {
				return t.label;}));
	}    
};

NGBrowser.prototype.networkExists=function(userNetwork){
  // network name will be appended a random string 
	return false;
/*
	// find the path seperator
	var pos=userNetwork.indexOf("/");
	var sep; // 1 - '\', 2 -'/'
  if(pos==-1)
	  sep=1;
	else
	  sep=2;
  var name; // without basename
	if(sep==1)
	  name=userNetwork.replace(/.*\\/,"");
	else
	  name=userNetwork.replace(/.*\//,"");
	var items=name.split(".");
  if(items[0] in ng_logo.allNetworks)
	 return true;
	else 
	 return false;
	 */
};


NGBrowser.prototype.createUserEnterTrackNameDiv=function(){
  var userEnterTrackNameDiv=$("<div>").attr("id","userentertracknamediv").css("display","none");
  var userEnterTrackNameForm=$("<form>").attr({"id":"userentertracknameform",
                                     "action":"create_user_track.php","method":"post"});
  $(userEnterTrackNameForm).appendTo($(userEnterTrackNameDiv));
  var userEnterTrackNameInput=$("<input>").attr({"type":"text","value":"","id":"userentertracknameinput",
         "size":"32"}).css({"border":"1px solid #808080","padding":"2px"});
  $(userEnterTrackNameForm).append($(userEnterTrackNameInput));
  var userEnterTrackNameButton=$("<button>").attr({"id":"userentertracknamebutton"}).html("Add");
  $(userEnterTrackNameForm).append($(userEnterTrackNameButton));
  // if the userentertracknamediv already exist, clear it
   if($("#usertracknameWarning").length > 0){
       $("#usertracknameWarning").html("");
    }
  // prevent user submit form with "Enter"
  $(userEnterTrackNameInput).keypress(function(evt){
    var event= window.event || evt;
    if(event.keyCode == 13 || event.which == 13 || event.charCode == 13){
      event.preventDefault();
      return false;
    }
    else
      return true;
  });
  $(userEnterTrackNameButton).button().bind('click', {brwsr: this}, function(evnt){
     // now add the track
     var data=evnt.data;
     var brwsr=data.brwsr;
     var userTrackName=$("#userentertracknameinput").val();
     evnt.preventDefault();
		 if(!userTrackName){
			 if($("#usertracknameWarning").length > 0){
				 $("#usertracknameWarning").remove();
			 }
			 var warningDiv=$("<div>").attr('id', 'usertracknameWarning');
			 $(warningDiv).html("<br><b>Track title cannot be empty!</b>");
			 $(warningDiv).css({'color':'red'});
			 $(warningDiv).appendTo($('#userentertracknameform'));
			 return;
		 }
		 if(userTrackName.match(/[^a-zA-Z0-9-_ ]/g)){
			 if($("#usertracknameWarning").length > 0){
				 $("#usertracknameWarning").remove();
			 }
			 var warningDiv=$("<div>").attr('id', 'usertracknameWarning');
			 $(warningDiv).html("<br><b>Track title can only contain a-z, A-Z, 0-9, space,'-' and '_'.</b>");
			 $(warningDiv).css({'color':'red'});
			 $(warningDiv).appendTo($('#userentertracknameform'));
			 return;
		 }
     var zoomcnter=$("#zoomContainer")[0];
     var children=zoomcnter.childNodes;
		 for(var i=0; i<children.length; i++){
			 // check duplicated user track name
			 if(brwsr.userTrackNameAlreadyExist(children[i].id, userTrackName)) {
				 if($("#usertracknameWarning").length > 0){
					 $("#usertracknameWarning").remove();
				 }
				 var warningDiv=$("<div>").attr('id', 'usertracknameWarning');
				 $(warningDiv).html("<br><b>Track with same title already exist.</b>");
				 $(warningDiv).css({'color':'red'});
				 $(warningDiv).appendTo($('#userentertracknameform'));
				 return;
			 }
		 }
     // submit the form to the server and create the track, then add the track
     // server return a url for the track
     var networkType=brwsr.currentNetworkType();
     var myCurrentNetwork;
     if(networkType=="system")
       myCurrentNetwork=brwsr.currentNetwork;
     else
       myCurrentNetwork=ng_logo.allNetworks[brwsr.currentNetwork]["directory"];
		/* this function has been moved to a dedicated track context menu button
     // in the case of use create a track from gene input box, there is an option for including network neighbors.
		 if($("#userentertrackcheckbox").length!=0 && $('#userentertrackcheckbox').is(':checked')){
        var edges=brwsr.networkData; 
				// add neighbors to the list
				var tmp_gene_string=brwsr.gene_string.slice(0,-1); // remove the trailing "|"
        var entered_genes=tmp_gene_string.split("|"); 
				var gene_plus_neighbors=[];
				var mycolors=[];
				var allneighbors=[];
        for(var ll=0; ll<entered_genes.length; ll++){
				   gene_plus_neighbors.push(entered_genes[ll].toUpperCase());
					 allneighbors=allneighbors.concat(Object.keys(edges[entered_genes[ll].toUpperCase()]));
					 var neighbors=Object.keys(edges[entered_genes[ll].toUpperCase()]);
					 gene_plus_neighbors=gene_plus_neighbors.concat(Object.keys(edges[entered_genes[ll].toUpperCase()]));
				}
				var new_gene_string=gene_plus_neighbors.join("|");
        new_gene_string=new_gene_string+"|";
        brwsr.gene_string=new_gene_string;
				// set colors
        var ruler=brwsr.view.ruler;
				for(var kk=0; kk<ruler.length; kk++){
           if($.inArray(ruler[kk], gene_plus_neighbors)==-1){
					   mycolors.push("#FFF");
					 }
					 else if($.inArray(ruler[kk], entered_genes)!=-1){
					   mycolors.push("#F00");
					 }
					 else if($.inArray(ruler[kk], allneighbors)!=-1){
					   mycolors.push("#0000FF");
					 }
				}
				brwsr.trackColor=mycolors;
		 }
		 */

			// the only two cases for cct user track:
			// 1.user add "all releated module" track after enrichment analysis 
			// 2. user add "all significant modules" after performing module level statistical analysis on cct/cbt track
		  // the default action is create_user_track.php
		if(brwsr.currentUserTrackType=="cct" && brwsr.currentUserTrackAllSigModules){
				$('form#userentertracknameform').attr("action", "create_all_sig_modules_track.php"); 
		}
		 else if(brwsr.currentUserTrackType=="cct"){
			 $('form#userentertracknameform').attr("action", "create_all_related_module_track.php"); 
		 }
		 else{ 
		  $('form#userentertracknameform').attr("action", "create_user_track.php"); 
		 }
     $('form#userentertracknameform').ajaxSubmit(
      {
				beforeSubmit: function(){
         $('#userentertracknamediv').dialog("close");
					if($("#useraddtrackDialog").length==0){
						$("<div>").attr("id", "useraddtrackDialog").appendTo($("body")).css({"display":"none","background-image":"url(images/loading-green.gif)","background-position":"center center","background-repeat":"no-repeat"});
						}
						brwsr.view.userAddTrackDialog=$("#useraddtrackDialog").dialog({
							open: function(event, ui) { $(".noclose .ui-dialog-titlebar-close").hide(); },  // disable close button
							dialogClass: "noclose",
							title: "Creating track ...",
							height: 100,
							width: 200,
							modal: true,
							draggable: false,
							closeOnEscape: false
						});
				},
       data: {
        'currentNetwork':myCurrentNetwork,
        //'geneString':brwsr.gene_string.replace(/\n/g,'_')
        'trackType': brwsr.currentUserTrackType,
        'networkType':networkType,
        'geneString':brwsr.gene_string,  // GENE1|GENE2|... for simple tracks, an object for cct
        'trackName':userTrackName,
				'allModules':brwsr.networkInfo.module_info, // only needed for cct
				'ruler':brwsr.view.ruler  // only needed for cct
       },
			 success: function(responseText){
				 var result=$.parseJSON(responseText);
				 var userTrack={};
				 userTrack.url=result.url[0];
				 userTrack.int_url=result.int_url[0];
				 userTrack.network=brwsr.currentNetwork;
				 if(result.type=="sbt" || result.type=="sct"){
					 userTrack.type='SimpleTrack';
				   userTrack.trackColor=brwsr.trackColor;
				 }
				 else{
					 userTrack.type='CompositeTrack';
					 userTrack.samples=result.samples[0];
				   userTrack.trackColor=null;
					 if('sampleinfo' in result){
						 userTrack.sampleinfo=result.sampleinfo[0];
					 }
				 }
				 // user track can be sbt or sct or cbt
				 userTrack.datatype=brwsr.currentUserTrackType;
				 userTrack.key=userTrackName;
				 userTrack.label=userTrackName.replace(/ /g,"");
				 userTrack.name=userTrack.label;
				 userTrack.link='NULL';
				 userTrack.catergory='User Track';
				 userTrack.isUserTrack=true;
				 userTrack.isUploadTrack=true;
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
				 brwsr.gene_string='';
				 brwsr.trackColor=[];
				 brwsr.stbox.addTrack(evt);
				 $('#useraddtrackDialog').dialog("close");
			 }
       });
  }); 

  return userEnterTrackNameDiv;
};


NGBrowser.prototype.updateCoVisForm=function(){
  var tracks=this.view.tracks;
  var brwsr=this;
  //var innerHTML="";
  if($("#coVisForm").length){
    $("#coVisForm").remove();
  }
  var coVisForm=$("<form>").attr("id","coVisForm").addClass("leftPaneDivForm");
  var myinput, mylabel;
	var sbtOrSct=0;
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt' || tracks[i].dataType=='sct'){
      myborderinput=$("<input>").addClass("form-input").attr({"type":"checkbox","id":"covis_border_"+tracks[i].name,"name":"trackName", "value":"xxxx"});
      $(coVisForm).append($(myborderinput));
      myfillinput=$("<input>").addClass("form-input").attr({"type":"checkbox","id":"covis_fill_"+tracks[i].name,"name":"trackName", "value":"xxxx"});
      $(coVisForm).append($(myfillinput));
      mylabel=$("<label>");
      var trackKeyDisplay=tracks[i].key.trunc(27, false);
      $(mylabel).html("<span id=\"covisLabel_"+tracks[i].name+"\">"+trackKeyDisplay+"</span><br>");
      $(coVisForm).append($(mylabel));
			if($("#covissubmitbuttons").css("display")=="none"){
			  $("#covissubmitbuttons").css("display","block");
			}
			if($("#covisformheader").css("display")=="none"){
			  $("#covisformheader").css("display","block");
			}
		  sbtOrSct++;
    }
  }
	if(sbtOrSct<2){
		$("#covisformheader").css("display","none");
		$("#covissubmitbuttons").css("display","none");
		$("#covisformdiv").css("display","none");
		$("#defaultcovismsg").css("display","block");
	}
	else{
		$("#covisformheader").css("display","block");
		$("#covissubmitbuttons").css("display","block");
		$("#covisformdiv").css("display","block");
		$("#defaultcovismsg").css("display","none");
		// disable the button originally
  	brwsr.disableNGButton($("#covissubmitbutton_g"));
    brwsr.disableNGButton($("#covissubmitbutton_big_g"));
	}

  brwsr.coVisForm=coVisForm;
  $(brwsr.coVisFormDiv).prepend($(coVisForm));
  for(var i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt' || tracks[i].dataType=='sct'){
      $("#covis_border_"+Util.jqSelector(tracks[i].name)).change(function(event){ brwsr.coVisFormInputChanged(brwsr)(event);});
      $("#covis_fill_"+Util.jqSelector(tracks[i].name)).change(function(event){ brwsr.coVisFormInputChanged(brwsr)(event);});
      //$("label[for='covis_"+tracks[i].name+"']").on("mouseover", function(evt, key){ 
      $("#covisLabel_"+Util.jqSelector(tracks[i].name)).on("mouseover", function(evt, key){ 
			  return function(){
				  balloon17394.showTooltip(evt, key);
				}
			}(event, tracks[i].key));
    }
  }
};

NGBrowser.prototype.updateVennTracksForm=function(){
  var tracks=this.view.tracks;
  var brwsr=this;
  //var innerHTML="";
  if($("#vennTracksForm").length){
    $("#vennTracksForm").remove();
  }
  var vennTracksForm=$("<form>").attr("id","vennTracksForm").addClass("leftPaneDivForm");
  var myinput, mylabel;
	var sbtCount=0;
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt'){
      myinput=$("<input>").addClass("form-input").attr({"type":"checkbox","id":"vennTracks_"+tracks[i].name,"name":"trackName", "value":"xxxx"});
      $(vennTracksForm).append($(myinput));
      mylabel=$("<label>");
      var trackKeyDisplay=tracks[i].key.trunc(27, false);
      $(mylabel).html("<span id=\"vennTracksLabel_"+tracks[i].name+"\">"+trackKeyDisplay+"</span><br>").attr("for",$(myinput).attr("id")
);
      $(vennTracksForm).append($(mylabel));
      sbtCount++;
    }
  }
  if(sbtCount<2){
    $("#venntracksformdiv").css("display","none");
    $("#defaultvennmsg").css("display","block");
  }
  else{
    $("#venntracksformdiv").css("display","block");
    $("#defaultvennmsg").css("display","none");
  }

  this.vennTracksForm=vennTracksForm;
  $(this.vennTracksFormDiv).append(vennTracksForm);
  for(var i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt'){
      $("#vennTracks_"+Util.jqSelector(tracks[i].name)).change(function(event){ brwsr.vennTracksFormInputChanged(brwsr)(event);});
      $("label[for='vennTracks_"+Util.jqSelector(tracks[i].name)+"']").on("mouseover", function(evt, key){ 
			  return function(){
				  balloon17394.showTooltip(evt, key);
				}
			}(event, tracks[i].key));
  }
 }
};

// this function is called when the order of tracks has changed (with drag-and-drop sortable)
NGBrowser.prototype.reorderVennTracksForm=function(){
  var tracks=this.view.tracks;
  var brwsr=this;

 // get current inputs
	var allInputs={};
  $("form#vennTracksForm :input").each(function(){
	 var input = $(this); // This is the jquery object of the input, do what you will
	  if($(input).prop("checked")){
      allInputs[$(input).attr("id")]=1;
		}
		else{
      allInputs[$(input).attr("id")]=0;
		}
	 });
	 //console.log(allInputs);
	 //console.log($("form#vennTracksForm").html());
	 var formHTML=$("form#vennTracksForm").html();
	 var formHTMLArray=formHTML.split("</label>");
	 // remove the last empty element;
	 formHTMLArray.pop();
	 // add back "</label>"
	 $.each(formHTMLArray, function(index, elem){
	   formHTMLArray[index]=elem+"</label>";
	 });

  var myinput, mylabel;
	var neworder=[];
	var i,j;
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt'){
      neworder.push("vennTracksLabel_"+tracks[i].name);
    }
  }
	// reconstruct the form html
	var newHTMLArray=[];
	for(i=0; i<neworder.length; i++){
		for(j=0; j<formHTMLArray.length; j++){
		   if(formHTMLArray[j].indexOf(neworder[i])>=0){
			   newHTMLArray.push(formHTMLArray[j]);
				 break;
       }
		}
	}
	$("form#vennTracksForm").html(newHTMLArray.join(""));
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt'){
      $("#vennTracks_"+Util.jqSelector(tracks[i].name)).change(function(event){ brwsr.vennTracksFormInputChanged(brwsr)(event);});
      $("label[for='vennTracks_"+tracks[i].name+"']").on("mouseover", function(evt, key){ 
			  return function(){
				  balloon17394.showTooltip(evt, key);
				}
			}(event, tracks[i].key));
    }
  }
	for(i=0; i<brwsr.vennColorUsed.length; i++){
     brwsr.vennColorUsed[i]=0;
	}
  $("form#vennTracksForm :input").each(function(){
	 var input = $(this); // This is the jquery object of the input, do what you will
   if(allInputs[$(input).attr("id")]==1){
	    $(input).trigger('click');
	  }
	 });
};

// this function is called when the order of tracks has changed (with drag-and-drop sortable)
NGBrowser.prototype.reorderCovisTracksForm=function(){
	var tracks=this.view.tracks;
	var brwsr=this;

 // get current inputs
	var allInputs={};
  $("form#coVisForm :input").each(function(){
	 var input = $(this); // This is the jquery object of the input, do what you will
	  if($(input).prop("checked")){
      allInputs[$(input).attr("id")]=1;
		}
		else{
      allInputs[$(input).attr("id")]=0;
		}
	 });

	var formHTML=$("form#coVisForm").html();
	var formHTMLArray=formHTML.split("</label>");
	// remove the last empty element;
	formHTMLArray.pop();
	// add back "</label>"
	$.each(formHTMLArray, function(index, elem){
		formHTMLArray[index]=elem+"</label>";
	});

	var myinput, mylabel;
	var neworder=[];
	var i,j;
	for(i=0; i<tracks.length; i++){
		if(tracks[i].dataType=='sbt' || tracks[i].dataType=='sct'){
			neworder.push("covisLabel_"+tracks[i].name);
		}
	}
	// reconstruct the form html
	var newHTMLArray=[];
	for(i=0; i<neworder.length; i++){
		for(j=0; j<formHTMLArray.length; j++){
			if(formHTMLArray[j].indexOf(neworder[i])>=0){
				newHTMLArray.push(formHTMLArray[j]);
				break;
			}
		}
	}
	$("form#coVisForm").html(newHTMLArray.join(""));
	for(i=0; i<tracks.length; i++){
		if(tracks[i].dataType=='sbt' || tracks[i].dataType=='sct'){
			$("#covis_border_"+Util.jqSelector(tracks[i].name)).on("change",function(){ brwsr.coVisFormInputChanged(brwsr)(event);});
			$("#covis_fill_"+Util.jqSelector(tracks[i].name)).on("change",function(){ brwsr.coVisFormInputChanged(brwsr)(event);});
			$("#covisLabel_"+Util.jqSelector(tracks[i].name)).on("mouseover", function(evt, key){ 
				return function(){
					balloon17394.showTooltip(evt, key);
				}
			}(event, tracks[i].key));
		}
	}
  $("form#coVisForm :input").each(function(){
	 var input = $(this); // This is the jquery object of the input, do what you will
   if(allInputs[$(input).attr("id")]==1){
	    $(input).trigger('click');
	  }
	 });
};

NGBrowser.prototype.setCurrentViewInfo=function(div_id){
	var brwsr=this;
  var input_data={};
	$("#"+div_id).html("");
	$("#"+div_id).append("Current view &raquo; "+ng_logo.allNetworks[brwsr.currentNetwork]["view"]+" &raquo; ");
	if(ng_logo.allNetworks[brwsr.currentNetwork]["type"]=="user"){
    var dir=ng_logo.allNetworks[brwsr.currentNetwork]["directory"];
    input_data["dirname"]=dir;
    input_data["output_name"]=brwsr.currentNetwork;
		$("#"+div_id).append("<a href='#' <span id=current-view-name>"+brwsr.currentNetwork+"</span></a>");
		$("#current-view-name").on("mouseover", function(evt){
			return function(){
				balloon17394.showTooltip(evt,"Click to download the view file.");
			}
		}(event));
		$("#current-view-name").on("click",function(evt){
			var downloadViewFileForm=$("<form>");
			$(downloadViewFileForm).attr({"id":"downloadViewFileForm", "target":"download_view_window", "method":"post", "action":"download_view_file.php"});
			var downloadViewFileFormInput=$("<input>");
			$(downloadViewFileFormInput).attr({"id":"downloadViewFileFormInput","type":"hidden", "name":"input_data", "value": JSON.stringify(input_data)});
			$(downloadViewFileFormInput).appendTo($(downloadViewFileForm));
			$("body").append($(downloadViewFileForm));
			var download_view_window=window.open("", "download_view_window");
			if(download_view_window) {
				$("#downloadViewFileForm").submit(); 
				$("#downloadViewFileForm").remove(); 
			}
		});
	}
	else{
		$("#"+div_id).append(brwsr.currentNetwork);
	}
};
