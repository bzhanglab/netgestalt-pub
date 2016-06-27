NGBrowser.prototype.exportPDFClicked=function(event){
// get the position of #ui-layout-center
var arg={}; 
var dim={};
dim.top=$("#ui-layout-center").offset().top;
dim.left=$("#ui-layout-center").offset().left;
dim.width=$("#ui-layout-center").width();
dim.sHeight=$("#toppane").height()+$("#zoomContainer")[0].scrollHeight;
dim.height=$("#ui-layout-center").height();
arg.dim=dim;
var cookies={};
cookies["NGBrowser-refNetwork"]=$.cookie("NGBrowser-refNetwork");
cookies["NGBrowser-track-keys"]=$.cookie("NGBrowser-track-keys");
cookies["NGBrowser-track-labels"]=$.cookie("NGBrowser-track-labels");
cookies["NGBrowser-"+cookies["NGBrowser-refNetwork"]+"-location"]=$.cookie("NGBrowser-"+cookies["NGBrowser-refNetwork"]+"-location");
arg.cookies=cookies;
arg.root=this.ngDocRoot;
if(typeof(localStorage)!=undefined){
 var mylocalstorage={};
 var mykey;
 for(var i=0; i<localStorage.length; i++){
	 mykey=localStorage.key(i);
	 mylocalstorage[mykey]=JSON.stringify(localStorage.getItem(mykey));
 }
arg.localstorage=mylocalstorage;
}
$.ajax({
	type:"POST",
	url:"create_pdf.php",
	data:arg,
	async:true,
	dataType:"json",
	success: function(data, textStatus){
		$("#exportpdfDialog").dialog("close");
		var win=window.open("export_pdf.php?path="+data['path']);
	}
});
if($("#exportingpdfDialog").length==0){
	$("<div>").attr("id", "exportpdfDialog").appendTo($("body")).css({"display":"none","background-image":"url(images/loading-green.gif)","background-position":"center center","background-repeat":"no-repeat"});
}
this.exportpdfDialog=$("#exportpdfDialog").dialog({
	open: function(event, ui) { $(".noclose .ui-dialog-titlebar-close").hide(); },  // disable close button
	dialogClass: "noclose",
	title: "Generating PDF ...",
	height: 100,
	width: 200,
	modal: true,
	draggable: false,
	closeOnEscape: false
});
};

// when user upload a network
// update the "available network" menu
// store the info in localStore if supported by the browser
NGBrowser.prototype.addUserNetwork=function(message, optionalTrackInfo){
var brwsr=this;
var key=brwsr.userNetworkKey;
// update ng_logo.allNetworks  
var obj=$.parseJSON(message);
// if this new network/view has REQUUIRED track, add to it.  (user created view)
var trackInfo;
if(arguments.length==2){
  trackInfo=$.parseJSON(optionalTrackInfo);
}
var newNetwork=obj["info"];
if(trackInfo!=undefined){
  newNetwork["required_track"]=trackInfo; 
}
var newNetworkName=newNetwork["name"];
// console.log(newNetwork);
ng_logo.allNetworks[newNetworkName]={};
var newObj={};
newObj["type"]=newNetwork["type"];
newObj["view"]=newNetwork["view"];
newObj["directory"]=newNetwork["directory"];
newObj["network"]=newNetwork["network"];
ng_logo.allNetworks[newNetworkName]=newObj;
//update ng_logo.networkInfo 
ng_logo.networkInfo.push(newNetwork);
//console.log(ng_logo);
// rebuild the menu
var menuInputData={"allNetworks":ng_logo.allNetworks,"currentNetwork":newNetworkName};
brwsr.buildNetworkMenu(menuInputData,"menu_view_select", "menu_view_delete");
// update localStore if needed
if(typeof(localStorage)!='undefined') {
 var currentItems=JSON.parse(localStorage.getItem(key));
 if(!currentItems){
	 var item={};
	 item[newNetwork["name"]]=newNetwork;
	 localStorage.setItem(key, JSON.stringify(item));
 }
 else{ // insert to existing obj
	 currentItems[newNetwork["name"]]=newNetwork; 
	 localStorage.setItem(key, JSON.stringify(currentItems));
 }
}
};

NGBrowser.prototype.removeUserNetwork=function(name){
var brwsr=this;
var key=brwsr.userNetworkKey;
//  console.log("removeUserNetwork called");
var error_div_id='#delete-network-error-message';
var alert_div_id='#delete-network-alert-message';
if(brwsr.currentNetwork==name){
/*
 if($(error_div_id)){
	 var deleteNetworkErrorDiv=$("<div>",{id: "delete-network-error-message", title:'Error'});
	 $(deleteNetworkErrorDiv).appendTo('body');
 }
 $(error_div_id).html("<p style=\"color:red;font-weight:bold;\"><span class=\"ui-icon ui-icon-circle-close\" style=\"float: left; margin: 0 7px 50px 0;\"></span>Cannot delete current viewing network.</p>");
 $(error_div_id).dialog({
	 modal: true,
	 resizable:false,
	 buttons: {
		 Ok: function() {
			 $( this ).dialog( "close" );
		 }
	 }
 });
 return;
 */
}
else{
	// remove the network from menu 
	delete ng_logo.allNetworks[name];
	var menuInputData={"allNetworks":ng_logo.allNetworks,"currentNetwork":brwsr.currentNetwork};
	brwsr.buildNetworkMenu(menuInputData, "menu_view_select", "menu_view_delete");
	// remove network location cookie
	var oldLocCookie=$.cookie(brwsr.container.id+"-location");
  var oldLocMapDict;
  var oldLocMap;
	oldLocMapDict=$.parseJSON(window.atob(oldLocCookie));
  delete oldLocMapDict[name];
  $.cookie(this.container.id+"-location", window.btoa(JSON.stringify(oldLocMapDict)), {expires: 60});
	// update localStore if needed
	if(typeof(localStorage)!='undefined'){
		var currentItems=JSON.parse(localStorage.getItem(key));
		delete currentItems[name];
		localStorage.setItem(key, JSON.stringify(currentItems));
	}
	if($(alert_div_id)){
		var deleteNetworkAlertDiv=$("<div>",{id:"delete-network-alert-message", title:'Alert'});
		$(deleteNetworkAlertDiv).appendTo('body');
	}
	$(alert_div_id).html("<p style=\"color:blue;font-weight:bold;\"><span class=\"ui-icon ui-icon-alert\" style=\"float: left; margin: 0 7px 50px 0;\"></span>View deleted.</p>");
	$(alert_div_id).dialog({
		modal: true,
		resizable:false,
		buttons: {
			Ok: function() {
				$( this ).dialog( "close" );
			}
		}
	});
	return;
}
};

NGBrowser.prototype.zoomIntoGene=function(li){
if(li==null) return;
// get the location of selected gene  
var selectedGene=li.selectValue;
var view=b.view;
view.curZoom=view.zoomLevels.length-1;
var pos=$.inArray(selectedGene, view.ruler);
var start=(pos-1)>=0?(pos-1):0;
var end=pos+1;
//console.log("start:"+start+" end:"+end);
var locString=Util.addCommas(start)+" .. "+Util.addCommas(end);
b.navigateTo(b.networkInfo.name+":"+locString);
// add an indicator
if($('#current_vertical_ruler')){
	$('#current_vertical_ruler').remove();
}
// find out the position of found gene
setTimeout(function(){
var namedivid="#name_"+selectedGene;
var namedivid_upper="#name_"+selectedGene.toUpperCase();
var namediv=$(namedivid);
if(!namediv){
	namediv=$(namedivid_upper);
}
// check both captialized and original version
var genePos=namediv.offset();
var mybox = $('<div style="border-left:2px #ff0000 solid;position:fixed;width:5px;">').hide();
$('#gridtrack').append(mybox);
mybox.attr({id: 'current_vertical_ruler'}).css({
									//top: event.pageY , //offsets
									left: genePos.left, //offsets
									height: '100%',
									display: 'block'
});  
},1000);
};

NGBrowser.prototype.userTrackNameAlreadyExist=function(name, userTrackName){
var view=this.view;
if(name == 'track_'+userTrackName.replace(/ /g,"")) {
	return true;
}
var sbt_categories=view.sbtCategories;
for(var i=0; i<sbt_categories.length; i++){
	if(name == 'track_'+sbt_categories[i]+userTrackName.replace(/ /g,"")) 
		return true;
}
return false;
};


// the divName: div where the dialog box will be displayed next to 
NGBrowser.prototype.userEnterTrackNameDialog=function(divName){
this.currentUserEnterTrackNameDialogId="userEnterTrackNameDialog_"+Util.randomString(8);
var offset=$('#'+divName).offset();
var width=$('#'+divName).width();
var height=$('#'+divName).height();
/*
if($('#userentertracknamediv').length>0){
	$('#userentertracknamediv').remove();
	this.createUserEnterTrackNameDiv();
}
*/
if($("#usertracknameWarning").length > 0){
	$("#usertracknameWarning").remove();
}

// clear input box first
$("#userentertracknameinput").val('');
$('#userentertracknamediv').dialog({
	 autoOpen: true,
	 title: 'Please Enter Track Title:',
	 modal:true,
	 width:'350',
	 height:'auto',
	 resizable:false,
	 position: [offset.left+width-10, offset.top+height/2]
 });
};

NGBrowser.prototype.searchTracksDialog=function(){
var brwsr=this;
$("#searchtrackbox").dialog({
	position: { my:"left+50 top+50", at:"left top", of:"#menu_track_search"},
	resizable: false,
	title: 'Search system tracks',
	width:500,
	height:100,
	open:function(){
		if($("#searchtrackbox_lsquery_search_input").val()!=""){
		 var cur_height=parseInt($(".ResultBox").css("height"));
		 var new_height=(cur_height+50)>500?500:(cur_height+50);
		 $("#searchtrackbox").height(new_height);  //extra height for search box 
		}	
	},
	modal: true
});
};

NGBrowser.prototype.menuAboutDialog=function(){
var brwsr=this;
$("#ngaboutdiv").dialog({
	//position: { my:"left+50 top+50", at:"left top", of:"#menu_about"},
	resizable: false,
	title: 'About',
	width:300,
	height:150,
	modal: true
});
};

NGBrowser.prototype.userEnterTrackDialog=function(){
var brwsr=this;
$("#geneinputbox").dialog({
	position: { my:"left+50 top+50", at:"left top", of:"#menu_track_enter"},
	resizable: false,
	title: 'Enter gene symbols',
	height:350,
	width:400,
	open:function(event, ui) {
		 brwsr.gibox.onTextAreaKeyFocus();  // focus on the textarea when open
	},
	modal: true
});
};

NGBrowser.prototype.clearAllTracksDialog=function(){
var brwsr=this;
if($("#clearalltracks_confirm").length==0){
	var confirm_div=$("<div>").attr({"id":"clearalltracks_confirm","title":"Clear All Current Tracks?"});
	$(confirm_div).html("<p><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 20px 0;'></span>This will remove all tracks from current view. Do you want to continue?</p>");
	$("body").append($(confirm_div));
}
$("#clearalltracks_confirm").dialog({
	resizable: false,
	height:200,
	width:400,
	modal: true,
	buttons: {
		"Clear": function() {
			brwsr.clearAllTracks();
			$(this).dialog("close");
		},
		Cancel: function() {
			$(this).dialog("close");
		}
	}
});
};

NGBrowser.prototype.deleteUserViewDialog=function(view_name, all_views){
var brwsr=this;
var tobedeleted=view_name;
if(tobedeleted!=brwsr.currentNetwork){
  brwsr.removeUserNetwork(tobedeleted);
}
else{
	if($("#deleteuserview_confirm").length==0){
		var $confirm_div=$("<div>").attr({"id":"deleteuserview_confirm","title":"Delete "+view_name+"?"});
		$confirm_div.append("<p><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 20px 0;'></span>This will delete the view and all tracks from the system. After deletion, you want to switch to: </p>");
		var $select_div=$("<div style='margin-left:20px'>").attr({"id":"deleteuserview-confirm-select"});
		var $s=$("<select id=deleteuserview-confirm-sel name=deleteuserview-confirm-sel>");
		var i;
		for(i=0; i<all_views.length; i++){
			if(all_views[i]!=view_name){
				$("<option>", {value: all_views[i], text: all_views[i]}).appendTo($s);
			}
		}
		$s.appendTo($select_div);
		$select_div.appendTo($confirm_div);
		$select_div.append("<p>Do you want to continue?</p>");
		$("body").append($confirm_div);
	}
	$("#deleteuserview_confirm").dialog({
		resizable: false,
		height:250,
		width:400,
		modal: true,
		buttons: {
			"Delete": function() {
				brwsr.clearAllTracks();
				$(this).dialog("close");
				ng_logo.networkChanged(tobedeleted, $("#deleteuserview-confirm-sel").val());
				brwsr.removeUserNetwork(tobedeleted);
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});
}
};

// return true if have enough overlap (>50%)
NGBrowser.prototype.checkOverlap=function(oldview, newview){
/*
 var brwsr=this;
 var threshold=0.5;
 var oldRulerGenes=brwsr.getRulerByView(oldview);
 var newRulerGenes=brwsr.getRulerByView(newview);
 var intersect=$.map(oldRulerGenes,function(a){return $.inArray(a, newRulerGenes) < 0 ? null : a;})
 var len1=oldRulerGenes.length;
 var len2=newRulerGenes.length;
 var len=len1>len2?len2:len1;
 if(intersect){
	 return intersect.length/len>threshold;
 }
 else 
	 return false;
	 */
  return false;  // for now always clear existing tracks with user switch views
};

// may get called before trackview is created
NGBrowser.prototype.getRulerByView=function(viewname){
var brwsr=this;
var baseurl= (brwsr.dataRoot?brwsr.dataRoot:"");
var networkInfo=ng_logo.networkInfo;
var allNetworks=ng_logo.allNetworks;
var networkType=allNetworks[viewname]["type"];
var rulerUrl;
if(networkType=="system"){
	rulerUrl=baseurl+"data/system/tracks/"+viewname+"/0";
}
else if(networkType=="user"){
	var thisnetwork=$.grep(networkInfo, function(e,i){
		if(e.name==viewname)
			return e;
	});
	rulerUrl=baseurl+"data/user/tracks/"+thisnetwork[0]["directory"]+"/0";
}
var rulerGenes=[]; 
$.ajax({
	url:rulerUrl,
	dataType:"text",
	async:false,
	success: function(o) {  
		var lines=o.split("\n");
		var size=0;
		for(var i=0; i<lines.length-1; i++){
			// skip lines start with #
			if(!lines[i].match("^\s*\#")){
				var items=lines[i].split(",");
				if(items){
					rulerGenes[size]=items[0];
					size++;
				}
			}
		}
	 },
	error: function(xhr, status, error) { rulerGenes=null; }
	});
return rulerGenes;
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

NGBrowser.prototype.browseAllTracksDialog=function(){
  var brwsr=this;
  var randomString=Util.randomString(8);
  var currentBrowseAllTracksDialogId="browseAllTracksDialog_"+randomString;
  $('<div>').html("<div id=\"browsealltracksmain\"><div id=\"browsealltracksleft_"+randomString+"\"><div id=\"expandcollapseall\"><a href=\"javascript:void(0);\" style=\"text-decoration:none;font-size:11px;font-weight:bold;color:red\" onClick=\"tree.openAllItems(0); b.clearTrackInfo('"+randomString+"');\">Expand all </a><a href=\" javascript:void(0);\" style=\"text-decoration:none;font-size:11px;font-weight:bold;color:red\" onClick=\"tree.closeAllItems(0); b.clearTrackInfo('"+randomString+"');\">&nbsp;Collapse all</a><br/></div></div><div id=\"browsealltracksright_"+randomString+"\"><div id=\"current_selected_leaf_"+randomString+"\" class=\"current_selected_leaf\"></div></div></div>").dialog({
   autoOpen: true,
   title: 'Browse All Tracks',
   modal:true,
   height:'510',
   width:'800',
   resizable:false
 });
    $('#browsealltracksleft_'+randomString).css({'height':'450px','width':'290px','float':'left','background':'#EBF5DF', 'overflow':'auto'});
    $('#browsealltracksright_'+randomString).css({'height':'450px','width':'480px','background':'#EBF5DF','float':'left'}); //F6F2EE});
    var leftFrame=new IFrame($('#browsealltracksleft_'+randomString).get(0));
    $(leftFrame).attr("id", "browsealltracksleft_frame");
    $(leftFrame).css({"width":"290px","height":"430px","border-width":"0px"});
    var leftFrameHead=leftFrame.doc.getElementsByTagName("head")[0];
    var cssLink = document.createElement("link") 
    cssLink.href = "css/frame2.css"; 
    cssLink.rel = "stylesheet"; 
    cssLink.type = "text/css"; 
    leftFrameHead.appendChild(cssLink);
    var leftFrame_div=leftFrame.doc.createElement("div");
    leftFrame_div.id="browsealltracksleftframe_div";
    leftFrame.doc.body.appendChild(leftFrame_div);
    tree=new dhtmlXTreeObject(leftFrame.doc.getElementById("browsealltracksleftframe_div"),"100%","100%",0);
    tree.setSkin('dhx_skyblue');
    tree.setImagePath("images/dhtmlxTree/");
    tree.loadJSON("data/system/tree/netgestaltTrack.json");
    var rightTopFrame=new IFrame($('#browsealltracksright_'+randomString).get(0));
    brwsr.rightTopFrame=rightTopFrame;
    $(rightTopFrame).attr("id", "browsealltracksrighttop_"+randomString+"_frame");
		$(rightTopFrame).css({"width":"480px","height":"175px","border-width":"0px", "font-size":"11px","font-family":"sans-serif","background-color":"#EBF5DF"});
    var rightBottomFrame=new IFrame($('#browsealltracksright_'+randomString).get(0));
    brwsr.rightBottomFrame=rightBottomFrame;
    $(rightBottomFrame).attr("id", "browsealltracksrightbottom_"+randomString+"_frame");
		$(rightBottomFrame).css({"width":"480px","height":"270px","border-width":"0px", "font-size":"11px","font-family":"sans-serif","background-color":"#EBF5DF"});
    if(brwsr.treeID2originalID==undefined){
		$.ajax({
			  type: "GET",
        url:"data/system/tree/treeID2originalID.json",
				dataType:"text",
				cache: false,
        success: function(data){
					 // remove the extra "," from the data
					 data=data.replace(",}","}");
           brwsr.treeID2originalID=$.parseJSON(data);   
        },
        error: function(xhr, status, error){
          console.log("loading treeID2originalID.json error");
					console.log("status"+status);
					console.log("error"+error);
        }
			});
    }
    if(brwsr.leafNodes==undefined){
		$.ajax({
       url:"data/system/tree/leafNodes.json",
			 type: "GET",
			 dataType:"text",
			 cache: false,
       success: function(data){
           brwsr.leafNodes=$.parseJSON(data);   
        },
        error: function(){
          console.log("loading leafNodes.json error");
        }
		});
    }
    if(brwsr.label2ngid==undefined){
      var myurl;
      var networkType=brwsr.currentNetworkType();
      if(networkType=="user"){
         myurl="data/user/tracks/"+ng_logo.allNetworks[brwsr.currentNetwork]["directory"]+"/label2ngid.json";
      }
      else{
         myurl="data/system/tracks/"+brwsr.currentNetwork+"/label2ngid.json";
       }  
			$.ajax({
			  url:myurl,
				type:"GET",
				dataType:"text",
				cache: false,
        success: function(data){
           brwsr.label2ngid=$.parseJSON(data);   
        },
        error: function(){
          console.log("loading label2ngid.json error");
        }
			});
	}
	tree.brwsr=brwsr;
	tree.attachEvent("onClick", function(selectedId, prevSelectedId){
		if(selectedId==prevSelectedId){
			if(tree.hasChildren(selectedId)){
				if(tree.getOpenState(selectedId)==1){
					tree.closeItem(selectedId); 
				}
				else{
				 tree.openItem(selectedId);
				}
			 return; 
			}
			else
				return;
		} 
		var brwsr=this.brwsr;
		brwsr.clearTrackInfo(randomString);
		if(tree.hasChildren(selectedId)){
		 // toggle open state
		 if(tree.getOpenState(selectedId)==1)
			 tree.closeItem(selectedId); 
		 else
			 tree.openItem(selectedId);
		 tree.setItemStyle(prevSelectedId,"background-color:transparent;");
		 tree.setItemStyle(prevSelectedId,"border:0px;");
		 tree.setItemStyle(prevSelectedId,"font-weight:normal;");
		}
		else{
			// load info to right div
			var text=tree.getItemText(selectedId);
			$("#current_selected_leaf_"+randomString).text(text);
			tree.setItemStyle(selectedId,"background-color:#ffe6b0;");
			tree.setItemStyle(selectedId,"border:1px solid #ffb951;");
			tree.setItemStyle(selectedId,"font-weight:bold;");
			tree.setItemStyle(prevSelectedId,"background-color:transparent;");
			tree.setItemStyle(prevSelectedId,"border:0px;");
			tree.setItemStyle(prevSelectedId,"font-weight:normal;");
			var myrighttopframe=$("#browsealltracksrighttop_"+randomString+"_frame");
			var myrightbottomframe=$("#browsealltracksrightbottom_"+randomString+"_frame");
			$(myrightbottomframe).css("height","258px");
			var list_nav=$("<div>").attr({"id":"currentLeafTrackList-nav"}).prependTo($($(myrighttopframe)[0].doc.body));
			// create ul of current list of tracks
			var myul=$("<ul>").attr({"id":"currentLeafTrackList"}).insertAfter($(list_nav));
			$(myul).css({"font-size":"11px","font-family":"sans-serif","list-style-position":"inside","margin-left":"0px","padding-left":"0px"});
			var items = brwsr.leafNodes[brwsr.treeID2originalID[selectedId]];
			var myli;
			var mylink;
			if(!brwsr.view.sbtCategories){
				brwsr.view.getSbtCategories();
			}
			$.each(items, function(index, data){
			// convert data to label: remove space, remove ' and "
			// lookup label->NG_ID object to get the NG_ID
			// load NG_ID.json and format the data in right bottom frame when click the link
			 var mylabel=data.replace(/[ '"]/g,"");
			 var myid=brwsr.label2ngid[mylabel];
			 if(myid!=undefined){
				 var result=queryTrackDataByLabel(brwsr.trackData, mylabel);
				 var displayData=escape(result[0]['key']);
				 myli=$("<li>").html("<a href=\"javascript:void(0);\" onClick=\"parent.b.loadTrackInfo('"+mylabel+"','"+displayData+"','browsealltracksrightbottom_"+randomString+"_frame', true, '"+randomString+"');\" style=\"text-decoration:none; color:#8B4513\">"+unescape(displayData)+"</a>").appendTo($(myul));
			}
			});
	 }
	});
};

// called when loading track info for individual track (track info icon mouseover
// or loading to the right bottom frame of browse all track dialog 
// *** For now, only system tracks have track info **** 
NGBrowser.prototype.loadTrackInfo=function(track_label, track_key, divID, isFrame, randomString){
var brwsr=this;
track_key=unescape(track_key);
var myurl;
var networkType=brwsr.currentNetworkType();
if(networkType=="user"){
	myurl="data/user/tracks/"+ng_logo.allNetworks[brwsr.currentNetwork]["directory"]+"/label2ngid.json";
}
else{
	myurl="data/system/tracks/"+brwsr.currentNetwork+"/label2ngid.json";
}
  if(brwsr.label2ngid==undefined){
		$.ajax({
      url:myurl,
			type:"GET",
			dataType:"text",
			async:false,
      success: function(data){
         brwsr.label2ngid=$.parseJSON(data);   
      },
      error: function(){
        console.log("loading label2ugid.json error");
      }
		});
  }
  var my_ng_id=brwsr.label2ngid[track_label];
  $.ajax({
		type:"GET",
    url:"int_data/system/tracks/"+my_ng_id+".json",
    dataType:"text",
    async:false,
    success: function(o){
      var mytable, myrightbottomframe, mytooltipdiv;
			var data=$.parseJSON(o);
      if(isFrame){
        myrightbottomframe=document.getElementById(divID);
        mytable=myrightbottomframe.doc.getElementById("currentLeafTrackInfoTable");
      }
      else{
        mytooltipdiv=document.getElementById(divID);
        mytable=document.getElementById("currentTrackInfoTooltipTable");
      }
      if(mytable!=null){
        //rightBottomFrame.doc.body.removeChild(myid);
       $(mytable).remove();
      }
      // create a table from json 
      var mytrackinfotable;
      if(isFrame)
        mytrackinfotable=$("<table>").attr({"id":"currentLeafTrackInfoTable"}).prependTo($(myrightbottomframe.doc.body));
      else
        mytrackinfotable=$("<table>").attr({"id":"currentTrackInfoTooltipTable"}).prependTo($(mytooltipdiv));
        
      $(mytrackinfotable).css("width","100%");
      //mytrackinfotable.style.tableLayout="fixed";
      var new_tbody=$("<tbody>");
      var new_row, new_col, new_text;
      var row=0, col;
      new_row=$("<tr>").addClass("tr"+row);
      new_col=$("<td>").css({"border":"1px solid black","border-color":"gray","font-size":"11px","font-family":"sans-serif",
			    "text-align":"center","font-weight":"bold"}).attr("colspan","2");
      if(!isFrame){
        new_text = document.createTextNode(track_key);
        $(new_col).append($(new_text));
      }
      else{ //create icon for adding track
        //var addtrackdiv_id="frame_"+randomString+"_track_add";
        var addtrackdiv=$("<div>");
        $(addtrackdiv).css({"float":"left","margin-left":"5px"});
        var mytext = document.createTextNode(track_key);
        $(new_col).append($(mytext));
        myrightbottomframe=$("#"+divID);
				$(addtrackdiv).html("<a id='"+track_label+"' style='margin-right:5px;color:red;text-decoration:none;' href='#' onClick='return false;'>Add <span style='font-size:14px;font-weight:900'>+</span></a>");
        $(addtrackdiv).click($.proxy(function(event){brwsr.stbox.addTrack(event);}, brwsr.stbox));
				$(new_col).append($(addtrackdiv));
      }
      $(new_row).append($(new_col));
      $(new_tbody).append($(new_row));
      row=row+1;
      if(ObjectIsEmpty(data)){
        new_row=$("<tr>").addClass("tr"+row);
        new_text = document.createTextNode("No information available");
        new_col=$("<td>").css({"border":"1px solid black","border-color":"gray","font-size":"11px",
				         "font-family":"sans-serif","text-align":"center","font-weight":"bold"}).attr("colspan","2");
        $(new_col).append($(new_text));
        $(new_row).append($(new_col));
        $(new_tbody).append($(new_row));
      }
      else{
        for (var prop in data){
          new_row=$("<tr>").addClass("tr"+row);
          for(col=1;col<=2;col++) {
            new_col=$("<td>").css({"border":"1px solid black","border-color":"gray","font-size":"11px",
				         "font-family":"sans-serif","padding":"2px"}).addClass("tod"+col);
            if(col==1){
              $(new_col).css("width","20%");
              new_text = document.createTextNode(prop);
            }
            else{
              $(new_col).css("width","80%");
              var mydata=data[prop];
              var myhttpregex=/^http/;
              if(mydata.match(myhttpregex)){
								new_text=$("<a>").attr({"href":mydata,"target":"_blank"}).css({"text-decoration":"none","color":"#8B4513"});
								// limit displayed link address to 50 characters
								if(mydata.length>80){
                 new_text.text(mydata.substring(0,79)+"..."); 
								}
								else 
                  new_text.text(mydata);
               //$(new_text).attr('onclick', "box17395.nukeTooltip();");
              }
              else
                new_text=document.createTextNode(mydata);
            }
            $(new_col).append($(new_text));
            $(new_row).append($(new_col));
          }
          $(new_tbody).append($(new_row));
          row=row+1;
        }
    }
     $(mytrackinfotable).append($(new_tbody));
		 $(mytrackinfotable).css({"border-collapse":"collapse","border":"1px solid black"});
    },
    error: function(){
			console.log("error display information");
    }
  });
};

NGBrowser.prototype.clearAllTracks=function(){
// before remove all tracks, confirm with user;
// remove all tracks
var brwsr=this;
$.each($("#zoomContainer").children(), function(index, node){
	var nodeid=$(node).attr("id");
	if($(node).attr("id").match("track_")){
		var res=nodeid.replace(/^track_/,"icon_delete_label_");
		brwsr.view.removeTrack(res);
	}});
	// remove from cookie
  var oldLocCookie=$.cookie(brwsr.container.id+"-location");
  var oldLocMapDict;
  var oldLocMap;
  oldLocMapDict=$.parseJSON(window.atob(oldLocCookie));
  delete oldLocMapDict[this.currentNetwork];
  $.cookie(this.container.id+"-location", window.btoa(JSON.stringify(oldLocMapDict)), {expires: 60});
  if(typeof(localStorage)!="undefined"){
    localStorage.removeItem(this.container.id+"-track-keys"); 
    localStorage.removeItem(this.container.id+"-track-labels"); 
	}
	// disable the menu item
	$("#menu_track_clear").addClass("menu_disabled");
	$("#menu_track_clear").off();
	$("#locategenebox").prop('disabled', true);
	$("#locategenebox").val("Add track to enable...");
	brwsr.hideLeftPane();
	$(this.hideTrackTitleIcon).css("display","none");
	// remove linked track form
	$('#linkedTracksForm').remove();
	$('#relatedtracksformdiv').empty();
	$('#vennTracksForm').remove();
	if($('#venndiagramdiv')){
		$('#venndiagramdiv').remove();
	}
	$('#coVisForm').empty();
	$("#covisformheader").css("display","none");
	$("#covissubmitbuttons").css("display","none");
};

NGBrowser.prototype.removeRelatedTrackDiv=function(){
if($('#relatedTracksFormSubmitButton').length>0){
	$('#relatedTracksFormSubmitButton').remove();    
}
if($('#visibleBalloonElement').length>0){
	$('#visibleBalloonElement').remove();
}
if($('#closeButton').length>0){
	$('#closeButton').remove();
}
};

NGBrowser.prototype.removeExportTrackDiv=function(){
if($('#trackExportFormSubmitButton').length>0){
	$('#trackExportFormSubmitButton').remove();    
}
if($('#visibleBalloonElement').length>0){
	$('#visibleBalloonElement').remove();
}
if($('#closeButton').length>0){
	$('#closeButton').remove();
}
};

NGBrowser.prototype.removeDropdownMenus=function(){
if($('.dropdown').length>0){
	$('.dropdown').remove();    
}
};

NGBrowser.prototype.removeSampleHeatmap=function(){
if($('.sample_heatmap').length>0){
	$('.sample_heatmap').remove();    
}
};

NGBrowser.prototype.removeUserEnterTrackNameDiv=function(){
if($('#userentertracknamediv').length>0){
	$('#userentertracknamediv').remove();    
}
};

NGBrowser.prototype.removeGeneInputBox=function(){
if($('#geneinputbox').length>0){
	$('#geneinputbox').remove();    
}
};

NGBrowser.prototype.removeSearchTrackBox=function(){
if($('#searchtrackbox').length>0){
	$('#searchtrackbox').remove();    
}
};

NGBrowser.prototype.removeFilterDiv=function(){
if($('#SCTFilterSubmitButton').length>0){
	$('#SCTFilterSubmitButton').remove();    
}
if($('#visibleBalloonElement').length>0){
	$('#visibleBalloonElement').remove();
}
if($('#sctfiltererror').length>0){
	$('#sctfiltererror').remove();
}
if($('#closeButton').length>0){
	$('#closeButton').remove();
}
};


// SZA-Nature Methods
NGBrowser.prototype.toggleGeneLocatorDiv=function(mydiv, icon){ 
if(this.geneLocatorShown){
	$(this.geneLocator_plusminus).html('show');
	$(this.geneLocatorDiv).css({'display':'none'});
	this.geneLocatorShown=false;
}
else{
 $(this.geneLocator_plusminus).html('hide');
	$(this.geneLocatorDiv).css({'display':'block'});
	this.geneLocatorShown=true;
}
};
// SZA-Nature Methods

NGBrowser.prototype.toggleRelatedTracksFormDiv=function(mydiv, icon){ 
if(this.relatedTracksFormShown){
	$(icon).html("show");
	$(this.relatedTracksFormDiv).css("display","none");
	$("#defaultrelatedmsg").css("display","none");
	this.relatedTracksFormShown=false;
}
else{
	$(icon).html("hide");
	if(this.view.relatedTracksShown){
		$(this.relatedTracksFormDiv).css("display","block");
		$("#defaultrelatedmsg").css("display","none");
	}
	else{
		$("#defaultrelatedmsg").css("display","block");
	}
	this.relatedTracksFormShown=true;
}
};

NGBrowser.prototype.toggleLinkedFormDiv=function(mydiv, icon){
if(this.linkedTracksFormShown){
	$(icon).html("show");
	$(this.linkedTracksFormDiv).css("display","none");
	this.linkedTracksFormShown=false;
}
else{
 $(icon).html("hide");
 $(this.linkedTracksFormDiv).css("display","block");
 this.linkedTracksFormShown=true;
}
};

NGBrowser.prototype.toggleVennTracksFormDiv=function(mydiv, icon){
if(this.vennTracksFormShown){
	$(icon).html("show");
	$(this.vennTracksFormDiv).css("display","none");
		$("#defaultvennmsg").css("display","none");
    this.vennTracksFormShown=false;
  }
  else{
   $(icon).html("hide");
   var sbtCount=0;
  var tracks=this.view.tracks;
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt'){
      sbtCount++;
    }
  }
  if(sbtCount<2){
    $("#defaultvennmsg").css("display","block");
  }
  else{
    $("#venntracksformdiv").css("display","block");
    $("#defaultvennmsg").css("display","none");
  }
   this.vennTracksFormShown=true;
  }
};

NGBrowser.prototype.toggleCovisFormDiv=function(icon){
  if(this.covisFormShown){
    $(icon).html("show");
    $(this.coVisFormDiv).css("display","none");
    $(this.coVisFormHeader).css("display","none");
    $(this.coVisDefaultMsg).css("display","none");
    this.covisFormShown=false;
  }
	else{
		$(icon).html("hide");
		var sbtOrSct=0;
		var tracks=this.view.tracks;
		for(i=0; i<tracks.length; i++){
			if(tracks[i].dataType=='sbt' || tracks[i].dataType=='sct'){
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
		}
		this.covisFormShown=true;
	}
};

NGBrowser.prototype.toggleSigModulesFormDiv=function(mydiv, icon){
	if(this.sigModulesFormShown){
		$(icon).html("show");
		$(this.sigModulesFormDiv).css("display","none");
		$("#defaultsigmodulesmsg").css("display","none");
		this.sigModulesFormShown=false;
	}
	else{
		$(icon).html("hide");
		if(this.view.sigModulesShown){
			$(this.sigModulesFormDiv).css("display","block");
			$("#defaultsigmodulesmsg").css("display","none");
			console.log("display");
		}
		else{
			$("#defaultsigmodulesmsg").css("display","block");
		}
		this.sigModulesFormShown=true;
	}
};

// When new cct or cbt is created, add to linked tracks form 
NGBrowser.prototype.addTrackToLinkedTracksForm=function(trackLabel, trackKey){
/* remove comment to enable linked tracks
  var brwsr=this;
  if(!$("#linkedTracksForm")){
    var linkedTracksForm=$("<form>").attr('id','linkedTracksForm').addClass('leftPaneDivForm');
    $('#linkedtracksformdiv').append($(linkedTracksForm));
  }
  var allinputs=$('#linkedTracksForm :input');
  var checkedCount=0;
  for(var i=0; i<$(allinputs).length; i++){
    if($(allinputs).eq(i).is(":checked"))
      checkedCount++;
  }
  var refNode=$("#linkedTracksForm:first-child");
  // preprend the new track
  var mylabel=$("<label>").html(trackKey+"<br>").attr("for", "linkedTracks_"+trackLabel);
  if(refNode){
	  $(mylabel).insertBefore($(refNode));
	}
  else{
    $('#linkedTracksForm').append($(mylabel));
	}
  var myinput=$("<input>").addClass("form-input").attr({"type":"checkbox","id":"linkedTracks_"+trackLabel, "name":"trackName",
	          "value":"xxxx"});
	$(myinput).insertBefore($(mylabel));
  // if there are already 2 tracks checked, disable the newly added track
  if(checkedCount==2){
     $(myinput).attr("disabled","disabled");
     $(mylabel).css("color","gray");
  }
  else if(checkedCount==1){ // test if the new track should be disabled or not
    brwsr.onlyOneLinkedTrackChecked();
  }
  $("#linkedTracks_"+trackLabel).change(function(){brwsr.linkedTracksFormInputChanged(brwsr)});
	*/
};

NGBrowser.prototype.removeTrackFromLinkedTracksForm=function(trackLabel, trackKey){
/* remove comment to enable linked tracks
  var brwsr=this;
  var allinputs=$("#linkedTracksForm :input");
  var alllabels=$("#linkedTracksForm label");
  // get the current checkedCount
  var checkedCount=0;
  for(var i=0; i<$(allinputs).length; i++){
    if($(allinputs).eq(i).is(":checked")){
      checkedCount++;
	  }
  }
  // find the track label/input and remove it
  var targetTrack=$.grep(brwsr.view.tracks, function(n,i){
      return (brwsr.view.tracks[i].name)==trackLabel; 
  });
  for(var i=0; i<$(allinputs).length; i++){
    if($(allinputs).eq(i).attr("id")=="linkedTracks_"+trackLabel){
      if($(allinputs).eq(i).is(":checked"){
        if(checkedCount==2){
          $(brwsr.findLinkedTracksFormLabelForControl($(allinputs).eq(i))).remove();
          $(allinputs.eq(i).remove();
          brwsr.onlyOneLinkedTrackChecked();
          break;
        }
        else if(checkedCount==1){
          for(var j=0; j<$(allinputs).length; j++){
            if($(allinputs).eq(j).is(":disabled"){
              var mylabel=brwsr.findLinkedTracksFormLabelForControl($(allinputs).eq(j));
              $(mylabel).css("color","black");
              $(allinputs).eq(j).removeAttr("disabled");
            }    
          }                     
          $(brwsr.findLinkedTracksFormLabelForControl($(allinputs).eq(i))).remove();
          $(allinputs).eq(i).remove();
          break;
       }
     }
      // remove the input element
      $(brwsr.findLinkedTracksFormLabelForControl($(allinputs).eq(i))).remove();
      $(allinputs).eq(i).remove();
      break;
    }
  }
	*/
};

NGBrowser.prototype.findLinkedTracksFormLabelForControl=function(el){
  var elID=$(el).attr("id");
  var alllabels=$("#linkedTracksForm label");
	$(alllabels).filter(function(idx){
    if($(this).attr("for")==elID)
		  return $(this);
	 });
};

NGBrowser.prototype.onlyOneLinkedTrackChecked=function(){
  var browser=this;
  var allinputs=$("#linkedTracksForm input");
  var checkedIndex=[];
   $.each($(allinputs),function(idx){
		   if($(this).is(":checked")){
			   checkIndex.push(idx);
			 }
		});
    var commonSamples=[];
    var targetSamples, otherSamples, otherTrack;
    var targetTrack=$(browser.view.tracks).filter(function(idx){
       return ("linkedTracks_"+$(this).name==$(allinputs).eq(checkedIndex[0]).attr("id")); 
    });
    targetSamples=$(targetTrack).eq(0).samples.split(' ');
    $.each($(allinputs), function(i){
      // if the track's samples has <80% of the checked track's sample, disabled it 
      if(!($(this).is(":checked"))){
         otherTrack=$.grep(browser.view.tracks, function(n, idx){
            return ("linkedTracks_"+n.name)==$(allinputs).eq(i).attr("id"); 
         });
         otherSamples=$(otherTrack).eq(0).samples.split(' ');
         //console.log(otherSamples);
         commonSamples=$.grep(otherSamples, function(n, i) {
                  if($.inArray(n,targetSamples)!=-1)
                     return true;
                  else 
                     return false;
                  });
        //console.log(commonSamples);
        if(commonSamples.length<Math.round(0.8*targetSamples.length)){
           var mylabel=browser.findLinkedTracksFormLabelForControl($(allinputs).eq(i));
           $(mylabel).css("color","gray");
           $(allinputs).eq(i).attr("disabled","disabled");
        }
        else{
           mylabel=browser.findLinkedTracksFormLabelForControl($(allinputs).eq(i));
           $(mylabel).css("color","black");
           $(allinputs).eq(i).removeAttr("disabled");
        }
      }
    });
};

NGBrowser.prototype.linkedTracksFormInputChanged=function(brwsr){
  var browser=brwsr;
  var allinputs=$("#linkedTracksForm input");
  var highLightTrack=function(id){
    var targetTrack=$.grep(brwsr.view.tracks, function(n, i){
       return ("linkedTracks_"+n.name)==id; 
    });
    targetTrack[0].imageClass='image-track-selected'; 
    var blockImages=$("#track_"+targetTrack[0].name+" img");
		$.each($(blockImages), function(i, val){
		  if($(this).attr("id").match(/^icon/g)){
        $(this).addClass("image-track-selected");
			}
		});
  };

  var unHighLightTrack=function(id){
    var targetTrack=$.grep(brwsr.view.tracks, function(n, i){
       return ("linkedTracks_"+n.name)==id; 
    });
    targetTrack[0].imageClass=''; 
    var blockImages=$("#track_"+targetTrack[0].name+" img");
		$.each($(blockImages), function(i, val){
		  if($(this).attr("id").match(/^icon/g)){
        $(this).removeClass("image-track-selected");
			}
    });
    return function(e){
      if($(e.target).is(":checked")){
        var checkedCount=0;
        var checkedIndex=[];
        for(i=0; i<$(allinputs).length; i++){
          if($(allinputs).eq(i).is(":checked")){
            checkedCount++;
            checkedIndex.push(i);
          }
        }
        // if no one else is checked, figure out who should be disabled due to low sample overlap
        if(checkedCount==1){ 
          browser.linkedTrackNames=[];
          browser.onlyOneLinkedTrackChecked(); 
          highLightTrack(e.target.id); 
        }
        // now the two checked tracks are linked,  everything else should be disabled
        //  TODO : may need to support 3 or more tracks be linked
        else if(checkedCount==2){ 
          // at this point, we have two linked sort tracks 
          browser.linkedTrackNames=[];
          for(i=0; i<$(allinputs).length; i++){
            if(!$(allinputs).eq(i).is(":checked")){
              $(allinputs.eq(i)).attr("disabled","disabled");
              mylabel=browser.findLinkedTracksFormLabelForControl($(allinputs).eq(i));
              $(mylabel).css("color","gray");
            }
            else{
              var checkedTrackID=$(allinputs).eq(i).attr("id");
              highLightTrack(e.target.id);
              browser.linkedTrackNames.push(checkedTrackID.replace(/linkedTracks_/,''));
            }
          }
        }
      }
      else{  // target unchecked
        unHighLightTrack(e.target.id);
        checkedCount=0;
        for(i=0; i<$(allinputs).length; i++){
          if($(allinputs).eq(i).is(":checked")){
            checkedCount++;
          }
        }
        // if nothing else is checked, enable everything
        if(checkedCount==0){ 
          browser.linkedTrackNames=[];
          for(i=0; i<$(allinputs).length; i++){
            mylabel=browser.findLinkedTracksFormLabelForControl($(allinputs)[i]);
            $(mylabel).css("color","black");
            $(allinputs).eq(i).disabled='';
          }
        }
        else if(checkedCount==1){
          browser.linkedTrackNames=[];
          browser.onlyOneLinkedTrackChecked();
        }
      }
    }
  }
};

// All composite tracks will be listed in the form
NGBrowser.prototype.updateLinkedTracksForm=function(){
/*
  //console.log("updateLinkedTracksForm");
  var tracks=this.view.tracks;
  //console.log(tracks);
  var brwsr=this;
  var innerHTML="";
  if($("#linkedTracksForm")){
    $("#linkedTracksForm").remove();
  }
  var linkedTracksForm=$("<form>").attr("id","linkedTracksForm").addClass("leftPaneDivForm");
  var myinput, mylabel;

  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='cct' || tracks[i].dataType=='cbt'){
      //innerHTML+="<input class='form-input' type='checkbox' id='linkedTracks_";
      //innerHTML+=tracks[i].name+"' name='trackName' value='xxxx' >";
      //innerHTML+=tracks[i].key;
      //innerHTML+="<br>";
      myinput=$("<input>").addClass("form-input").attr({"type":"checkbox","id":"linkedTracks_"+tracks[i].name,"value":"xxxx"});
      $(linkedTracksForm).append($(myinput));
      mylabel=$("<label>").html(tracks[i].key+"<br>").attr("for",$(myinput).attr("id"));
      $(linkedTracksForm).append($(mylabel));
      //myinput.onclick=function(mylabel){
      //  return function(e){
      //    var evt=window.event || e;
      //    var mytarget;
      //    mytarget=evt.target || evt.srcElement;
      //    if(mytarget.checked){
      //      mylabel.style.fontWeight='bold';
      //      highLightTrack(mytarget.id);
      //    }
      //    else{
      //     mylabel.style.fontWeight='normal';
      //     unHighLightTrack(mytarget.id);
      //    }
      //   };
      //}(mylabel);
    }
  }
  //linkedTracksForm.innerHTML=innerHTML;
  this.linkedTracksForm=linkedTracksForm;
  $(this.linkedTracksFormDiv).append($(linkedTracksForm));
  var allinputs=$("#linkedTracksForm input");
  for(var i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='cct' || tracks[i].dataType=='cbt'){
      $("#linkedTracks_"+tracks[i].name).change(function(){ brwsr.linkedTracksFormInputChanged(brwsr);});
    }
  }
*/
};


//////////// Venn Diagram
NGBrowser.prototype.highLightVennDiagramTrack=function(id, colorIndex){
	var brwsr=this;
	var targetTrack=$.grep(brwsr.view.tracks, function(n,i){
		return ("vennTracks_"+n.name)==id; 
	});
	var blockImages=$("#track_"+targetTrack[0].name+" img");
	targetTrack[0].highlighted=true;
	if(colorIndex!=-2)
		targetTrack[0].highlightColorIndex=colorIndex;
	for(var i=0; i<blockImages.length; i++){
		if(!$(blockImages).eq(i).attr("id").match(/^icon/g)){
			$(blockImages).eq(i).addClass("image-track-selected");
			if(colorIndex!=-2){
				$(blockImages).eq(i).css("border-top-color", brwsr.vennColors[colorIndex]);
				$(blockImages).eq(i).css("border-bottom-color", brwsr.vennColors[colorIndex]);
			}
			else{
				$(blockImages).eq(i).css("border-top-color", brwsr.vennColors[targetTrack[0].highlightColorIndex]);
				$(blockImages).eq(i).css("border-bottom-color", brwsr.vennColors[targetTrack[0].highlightColorIndex]);
			}
		}
	}
};

NGBrowser.prototype.nextAvailableVennColorIndex=function(){
  var brwsr=this;
  for(var i=0; i<3; i++){
    if(brwsr.vennColorUsed[i]==0)
      return i;
  }
  return -1; // should not get to this point
};

NGBrowser.prototype.addTrackToCoVisForm=function(trackLabel, trackKey){
  var brwsr=this;
	/*
	if($("#defaultcovismsg")){
		$("#defaultcovismsg").remove();
	}
	*/
  if($("#coVisForm").length==0){
    var coVisForm= $("<form>").attr("id","coVisForm").addClass("leftPaneDivForm");
    $("#covisformdiv").prepend($(coVisForm));
  }
	if($("#covissubmitbuttons").css("display")=="none"){
	  $("#covissubmitbuttons").css("display","block");
		// both buttons are disabled
	  brwsr.disableNGButton($("#covissubmitbutton_g"));
	  brwsr.disableNGButton($("#covissubmitbutton_big_g"));
	}
	if($("#covisformheader").css("display")=="none"){
	  $("#covisformheader").css("display","block");
	}
  var allinputs=$("#coVisForm input");
  var checkedCount=0;
	var checkedInputIds=[];
  for(var i=0; i<$(allinputs).length; i++){
    if($(allinputs).eq(i).is(":checked")){
		  checkedInputIds.push($(allinputs).eq(i).attr("id"));
      checkedCount++;
	  }
  }
  var refNode=$("#coVisForm input").eq(0);
  // preprend the new track
  var mylabel=$("<label>");//.attr("for", "covis_"+trackLabel); 
  // some track label can be very long, truncate it before displaying in the form
	var trackKeyDisplay=trackKey.trunc(27, false);
  $(mylabel).html("<span id=\"covisLabel_"+trackLabel+"\">"+trackKeyDisplay+"</span><br>");
  if($(refNode).length!=0){
    $(mylabel).insertBefore($(refNode));
	}
  else{
	  $("#coVisForm").append($(mylabel));
	}
  var myborderinput=$("<input>").addClass("form-input").attr({"id":"covis_border_"+trackLabel, "type":"checkbox", "value":"xxxx", "name":"trackName"});
	$(myborderinput).insertBefore($(mylabel));
  var myfillinput=$("<input>").addClass("form-input").attr({"id":"covis_fill_"+trackLabel, "type":"checkbox", "value":"xxxx", "name":"trackName"});
	$(myfillinput).insertBefore($(mylabel));
	if(checkedCount==1){
	  if(checkedInputIds[0].match(/border_/g)){
      $(myborderinput).attr("disabled","disabled");
      $(mylabel).css("color","black");
		}
		else{
      $(myfillinput).attr("disabled","disabled");
		}
	}
  else if(checkedCount==2){
     $(myborderinput).attr("disabled","disabled");
     $(myfillinput).attr("disabled","disabled");
     $(mylabel).css("color","gray");
  }
	$("#covisLabel_"+Util.jqSelector(trackLabel)).on("mouseover",function(event){                                                 
	    balloon17394.showTooltip(event,trackLabel);
	});
  $("#covis_border_"+Util.jqSelector(trackLabel)).on("change",function(){ brwsr.coVisFormInputChanged(brwsr)(event);});
  $("#covis_fill_"+Util.jqSelector(trackLabel)).on("change",function(){ brwsr.coVisFormInputChanged(brwsr)(event);});
	var sbtOrSct=0;
	var tracks=brwsr.view.tracks;
	for(i=0; i<tracks.length; i++){	
		if(tracks[i].dataType=='sbt' || tracks[i].dataType=='sct'){
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
	}

};

NGBrowser.prototype.addTrackToVennTracksForm=function(trackLabel, trackKey){
  var brwsr=this;
/*
	if($("#defaultvennmsg")){
    $("#defaultvennmsg").remove();
	}
*/
  if($("#vennTracksForm").length==0){
    var vennTracksForm= $("<form>").attr("id","vennTracksForm").addClass("leftPaneDivForm");
    $("#venntracksformdiv").append($(vennTracksForm));
  }
  var allinputs=$("#vennTracksForm input");
  var checkedCount=0;
  for(var i=0; i<$(allinputs).length; i++){
    if($(allinputs).eq(i).is(":checked"))
      checkedCount++;
  }
  var refNode=$("#vennTracksForm input").eq(0);
  // preprend the new track
  var mylabel=$("<label>").attr("for", "vennTracks_"+trackLabel); 
  // some track label can be very long, truncate it before displaying in the form
	var trackKeyDisplay=trackKey.trunc(27, false);
  $(mylabel).html("<span id=\"vennTracksLabel_"+trackLabel+"\">"+trackKeyDisplay+"</span><br>");
  if($(refNode).length!=0){
    $(mylabel).insertBefore($(refNode));
	}
  else{
	  $("#vennTracksForm").append($(mylabel));
	}
  var myinput=$("<input>").addClass("form-input").attr({"id":"vennTracks_"+trackLabel, "type":"checkbox", "value":"xxxx", "name":"trackName"});
	$(myinput).insertBefore($(mylabel));
  // if there are already 3 tracks checked, disable the newly added track
  if(checkedCount==3){
     $(myinput).attr("disabled","disabled");
     $(mylabel).css("color","gray");
  }
	$("#vennTracksLabel_"+Util.jqSelector(trackLabel)).on("mouseover",function(event){                                                 
	    balloon17394.showTooltip(event,trackLabel);});
  $("#vennTracks_"+Util.jqSelector(trackLabel)).on("change",function(){ brwsr.vennTracksFormInputChanged(brwsr)(event);});
  var sbtCount=0;
  var tracks=brwsr.view.tracks;
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt'){
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
};


NGBrowser.prototype.removeTrackFromRelatedTracks=function(trackLabel, trackKey){
  var brwsr=this; 
	// if the current displayed related track is the same as the one about to be deleted
	if(brwsr.view.currentRelatedTrack && trackLabel==brwsr.view.currentRelatedTrack){
     $("#relatedtracksformdiv").html(brwsr.relatedTracksDefaultText);
	}
};

NGBrowser.prototype.removeTrackFromSigModuleDiv=function(trackLabel, trackKey){
  var brwsr=this; 
	// if the current displayed related track is the same as the one about to be deleted
	if(brwsr.view.currentSigModuleTrack && trackLabel==brwsr.view.currentSigModuleTrack){
     $("#sigmodulesformdiv").html(brwsr.sigModuleDefaultText);
	}
};

NGBrowser.prototype.removeTrackFromCoVisForm=function(trackLabel, trackKey){
	var brwsr=this;
	var allinputs=$("#coVisForm input");
	var alllabels=$("#coVisForm label");
	// get the current checkedCount
	var checkedCount=0;
	for(var i=0; i<$(allinputs).length; i++){
		if($(allinputs).eq(i).is(":checked"))
			checkedCount++;
	}
	// find the track label/input and remove it
	var targetTrack=$.grep(brwsr.view.tracks, function(n, i){
		return (n.name)==trackLabel; 
	});

	if($("input[id='covis_border_"+Util.jqSelector(trackLabel)+"']").is(":checked")){
		for(var i=0; i<$(allinputs).length; i++){
			if($(allinputs).eq(i).attr("id").match(/covis_border/g)){
			  if(!$("#"+$(allinputs).eq(i).attr("id").replace("_border","_fill")).is(":checked")){
				  $(allinputs).eq(i).removeAttr("disabled");
				  $("#"+$(allinputs).eq(i).attr("id").replace("_border","Label")).css("color","black");
				}
			}
		}
	  brwsr.disableNGButton($("#covissubmitbutton_g"));
	  brwsr.disableNGButton($("#covissubmitbutton_big_g"));
	}
	else if($("input[id='covis_fill_"+Util.jqSelector(trackLabel)+"']").is(":checked")){
		for(var i=0; i<$(allinputs).length; i++){
			if($(allinputs).eq(i).attr("id").match(/covis_fill/g)){
			  if(!$("#"+$(allinputs).eq(i).attr("id").replace("_fill","_border")).is(":checked")){
				  $(allinputs).eq(i).removeAttr("disabled");
				  $("#"+$(allinputs).eq(i).attr("id").replace("_fill","Label")).css("color","black");
				}
			}
		}
	  brwsr.disableNGButton($("#covissubmitbutton_g"));
	  brwsr.disableNGButton($("#covissubmitbutton_big_g"));
	}
	var myspanid;
	myspanid="covisLabel_"+trackLabel;
	$("#"+Util.jqSelector(myspanid)).parent().remove();
	$("#covis_border_"+Util.jqSelector(trackLabel)).remove();
	$("#covis_fill_"+Util.jqSelector(trackLabel)).remove();
	// if this is the last track to be removed, hide submit button
	allinputs=$("#coVisForm input");
	if(allinputs.length==0){
		$("#covisformheader").css("display","none");
		$("#covissubmitbuttons").css("display","none");
		if(!$("#defaultcovismsg")){
		  $("#covisformheader").before($("<div>").attr({"id":"defaultcovismsg"}).css({"margin-left":"5px","padding":"5px", "background-color":"#F6F2EE"}).html(brwsr.covisTracksDefaultText));
		}
		else{
      $("#defaultcovismsg").css("display","block");
		}
	}
  var sbtOrSct=0;
  var tracks=brwsr.view.tracks;
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt' || tracks[i].dataType=='sct'){
      sbtOrSct++;
    }
  }
  if(sbtOrSct<=2){
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
  }
};

NGBrowser.prototype.removeTrackFromVennTracksForm=function(trackLabel, trackKey){
  var brwsr=this;
  var allinputs=$("#vennTracksForm input");
  var alllabels=$("#vennTracksForm label");
  // get the current checkedCount
  var checkedCount=0;
  for(var i=0; i<$(allinputs).length; i++){
    if($(allinputs).eq(i).is(":checked"))
      checkedCount++;
  }
  // find the track label/input and remove it
  var targetTrack=$.grep(brwsr.view.tracks, function(n, i){
      return (n.name)==trackLabel; 
  });

  for(var i=0; i<$(allinputs).length; i++){
    if($(allinputs).eq(i).attr("id")=="vennTracks_"+trackLabel){
      if($(allinputs).eq(i).is(":checked")){
       //release the color used
       brwsr.vennColorUsed[targetTrack[0].highlightColorIndex]=0;
       if(checkedCount==1){ // the only checked track
         $('#venndiagramdiv').remove();
       }
			 else if(checkedCount==2){
				 // oringally 2 tracks checked, 1 just got removed, redraw the venn diagram
				 // find out which one is still checked
				 $('#venndiagramdiv').empty();
				 for(var j=0; j<$(allinputs).length; j++){
					 if($(allinputs).eq(j).is(":checked") && j!=i){
						 var mytargetTrack=$.grep(brwsr.view.tracks, function(n,i){         
							 return ("vennTracks_"+n.name)==$(allinputs).eq(j).attr("id"); 
						 });
						 break;
					 }
				 }
				 brwsr.vennDiagramOneTrack(mytargetTrack[0], mytargetTrack[0].highlightColorIndex);
			 }
       else if(checkedCount==3){
       // oringally 3 tracks checked, 1 just got removed
          for(var j=0; j<$(allinputs).length; j++){
            if($(allinputs).eq(j).attr("disabled")){
              var mylabel=brwsr.findVennTracksFormLabelForControl($(allinputs).eq(j));
							$(mylabel).css("color","black");
							$(allinputs).eq(j).removeAttr("disabled");
            }    
          }                     
         $('#venndiagramdiv').empty();
         //find out what the other two tracks left to be checked
         var myOtherTwoTracks=[];
         for(var j=0; j<$(allinputs).length; j++){
           if($(allinputs).eq(j).is(":checked") && j!=i){
             var mytargetTrack=$.grep(brwsr.view.tracks, function(n,i){         
              return ("vennTracks_"+n.name)==$(allinputs).eq(j).attr("id"); 
             });
             myOtherTwoTracks.push(mytargetTrack[0]);
           }
         }
          brwsr.vennDiagramTwoTracks(myOtherTwoTracks[0], myOtherTwoTracks[1]);
       }
     }
      // remove the input element
      $(brwsr.findVennTracksFormLabelForControl($(allinputs).eq(i))).remove();
			if($(allinputs).length<2){
				if($("#defaultvennmsg").length==0){
					$("#venntracksformdiv").prepend($("<div>").attr({"id":"defaultvennmsg"}).html(brwsr.vennTracksDefaultText));
				}
			}
			$(allinputs).eq(i).remove();
      break;
    }
  }
  var sbtCount=0;
  var tracks=brwsr.view.tracks;
  for(i=0; i<tracks.length; i++){
    if(tracks[i].dataType=='sbt'){
      sbtCount++;
    }
  }
  // sbtCount is the number before removing the track
  if(sbtCount<3){
    $("#venntracksformdiv").css("display","none");
    $("#defaultvennmsg").css("display","block");
  }
  else{
    $("#venntracksformdiv").css("display","block");
    $("#defaultvennmsg").css("display","none");
  }
};

NGBrowser.prototype.findVennTracksFormLabelForControl=function(el){
  var elID=$(el).attr("id");
  var alllabels=$("#vennTracksForm label");
  for(i=0; i<$(alllabels).length; i++){
    if($(alllabels).eq(i).attr("for")==elID)
      return $(alllabels).eq(i);
  }    
};

NGBrowser.prototype.findCoVisFormLabelForControl=function(el){
  var elID=$(el).attr("id");
  var alllabels=$("#coVisForm label");
  for(i=0; i<$(alllabels).length; i++){
    if($(alllabels).eq(i).attr("for")==elID)
      return $(alllabels).eq(i);
  }    
};

Array.prototype.sum=function(){
  var sum=0;
  for (var i = 0, L = this.length, sum = 0; i < L; sum += this[i++]);
     return sum;
};

NGBrowser.prototype.vennDiagramOneTrack=function(track, colorIndex){
  var browser=this;
  var vh=$("#venndiagramdiv").height();
  var vw=$("#venndiagramdiv").width();
  var paper=Raphael('venndiagramdiv',vw, vh);
  //var txt=paper.text(vx+Math.round(vw/2.0-0.4*(vh-30)), vh-30, 'this is a test');
  var count=track.data.sum();
  // 30px for text
  // assume vw > vh
  var r=(vw>=vh)?0.4*vh:0.4*vw;
  var circle1=paper.circle(Math.round(vw/2), Math.round(vh/2), Math.round(r));
  circle1.attr("fill", this.vennColors[colorIndex]);
  circle1.attr("stroke","none");
  circle1.attr("fill-opacity","1");
  circle1.attr("title", track.key);
  circle1.mouseover(function(){
      //circle1.animate({translation: '0,100', fill: '#ff0', 'stroke-width': 6}, 100); 
      circle1.attr({'stroke':browser.vennColors[colorIndex],'stroke-width':3}); 
      //txt.attr({'fill':browser.vennColors[colorIndex],'opacity':1});
      });
  circle1.mouseout(function(){
      //circle1.animate({translation: '0,100', fill: browser.vennColors[colorIndex], 'stroke-width': 6}, 100); 
      circle1.attr({'stroke':'none'});
      //txt.attr({'fill':browser.vennColors[colorIndex],'opacity':0});
     });
  var txt=paper.text(Math.round(vw/2.0), Math.round(vh/2.0), count);
  txt.attr({'fill':'#C2C2C2', 'stroke':'none', 'opacity':1, 'font-size':12, 'font-weight':'bold'});
  var outRect=paper.rect(0,0,vw,vh);                                                                             
  outRect.attr({'fill':'#ffffff', 'fill-opacity':'1.0'});
  outRect.toBack();
};


NGBrowser.prototype.binaryTwoArraysIntersect=function(a1, op1, a2, op2){
  if(a1.length!=a2.length)
    return;
 var results=new Array();
  var a=new Array();
	var b = new Array();
  for(var i=0; i<a1.length; i++){
    if(a1[i]==op1 && a2[i]==op2){
      a.push(1);
			b.push(i);
		}
    else 
      a.push(0);
  }
	results.push(a);
	results.push(b);
  return results;
};

NGBrowser.prototype.binaryTwoArraysUnion=function(a1, a2){
  var a=new Array();
  for(var i=0; i<a1.length; i++){
    if(a1[i]==1 || a2[i]==1)
      a.push(1);
    else
      a.push(0);
  }
  return a;

};

//get the intersection points of two Raphael circles
NGBrowser.prototype.circleIntersection=function(r, a, b) {
  var a, h, cx, cy, px, py;
  var ax = a.attr("cx");
  var ay = a.attr("cy");
  var bx = b.attr("cx");
  var by = b.attr("cy");
  var ra = a.attr("r");
  var rb = b.attr("r");
  var points=[];
 
  var dx = Math.abs(ax - bx);
  var dy = Math.abs(ay - by);
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > (ra + rb)) {
    // no solutions
  } else if (d < Math.abs(ra - rb)) {
    // no collisions, one inside other
  } else if (d == 0 && ra == rb) {
    // circles are coincident   
  } else {
    // there is a collision
    a = (ra * ra - rb * rb + d * d) / (2 * d);
    h = Math.sqrt(ra * ra - a * a);
    cx = ax + a * (bx - ax) / d;
    cy = ay + a * (by - ay) / d;
    // point c (draw here)
    var tx = h * (by - ay) / d;
    var ty = h * (bx - ax) / d;
    px = cx + tx;
    py = cy - ty;
    points.push({x:px, y:py});
    px = cx - tx;
    py = cy + ty;
    points.push({x:px, y:py});
  }
  return points;
};

//return 4 closed paths for the two intersected circles
// c1 is the left circle
NGBrowser.prototype.twoCirclesIntersect=function(p, c1, c2){
  var browser=this;
  var closedPaths=[];
  // points[0] is the top point
  var points=browser.circleIntersection(p,c1, c2);
  // first find the 4 partial open paths, then combined them

  // two circles with same radius size
  var c_r=c1.attr('r');
  var path1=''; //left path
  path1+='M '+points[0].x+' '+points[0].y+' ';
  path1+=' A '+c_r+' '+c_r+', 0, 1, 0 '+points[1].x+' '+points[1].y; 
  path1+=' A '+c_r+' '+c_r+', 0, 0, 1 '+points[0].x+' '+points[0].y; 
  path1+=' Z'; 
  closedPaths.push(path1);
  
  var path2=''; //middle path
  path2+='M '+points[0].x+' '+points[0].y+' ';
  path2+=' A '+c_r+' '+c_r+', 0, 0, 1 '+points[1].x+' '+points[1].y; 
  path2+=' A '+c_r+' '+c_r+', 0, 0, 1 '+points[0].x+' '+points[0].y; 
  path2+=' Z'; 
  closedPaths.push(path2);

  var path3=''; //right path
  path3+='M '+points[0].x+' '+points[0].y+' ';
  path3+=' A '+c_r+' '+c_r+', 0, 0, 1 '+points[1].x+' '+points[1].y; 
  path3+=' A '+c_r+' '+c_r+', 0, 1, 0 '+points[0].x+' '+points[0].y; 
  path3+=' Z'; 
  closedPaths.push(path3);

  var path4=''; //union path
  path4+='M '+points[0].x+' '+points[0].y+' ';
  path4+=' A '+c_r+' '+c_r+', 0, 1, 0 '+points[1].x+' '+points[1].y; 
  path4+=' A '+c_r+' '+c_r+', 0, 1, 0 '+points[0].x+' '+points[0].y; 
  path4+=' Z'; 
  closedPaths.push(path4);
  
  return closedPaths;
};


NGBrowser.prototype.vennDiagramTwoTracks=function(track1, track2){
  var browser=this;
  var vh=$("#venndiagramdiv").height();
  var vw=$("#venndiagramdiv").width();
  var paper=Raphael('venndiagramdiv',vw, vh);
  // find the intersection of two track data
  
  var newtracks=[];
	var indicesOfOne=[];
  var t1_not_t2=browser.binaryTwoArraysIntersect(track1.data, 1, track2.data, 0);
  newtracks.push(t1_not_t2[0]);
  indicesOfOne.push(t1_not_t2[1]);
  var t1_and_t2=browser.binaryTwoArraysIntersect(track1.data, 1, track2.data, 1);
  newtracks.push(t1_and_t2[0]);
  indicesOfOne.push(t1_and_t2[1]);
  var t2_not_t1=browser.binaryTwoArraysIntersect(track1.data, 0, track2.data, 1);
  newtracks.push(t2_not_t1[0]);
  indicesOfOne.push(t2_not_t1[1]);
  var all_union=browser.binaryTwoArraysUnion(track1.data, track2.data); 
  newtracks.push(all_union);

  var counts=[];
	var t1_not_t2_size, t1_and_t2_size, t2_not_t1_size, all_union_size;
  t1_not_t2_size=t1_not_t2[0].sum();
  counts.push(t1_not_t2_size);
  t1_and_t2_size=t1_and_t2[0].sum();
  counts.push(t1_and_t2_size);
  t2_not_t1_size=t2_not_t1[0].sum();
  counts.push(t2_not_t1_size);
  var all_union_size=all_union.sum();
  counts.push(all_union_size);

  var currentColors=[];
  var overlapPixel=40;
   // calculate r
  var r=Math.round((0.8*vw+overlapPixel)/4.0<(vh*0.8)/2.0?(0.8*vw+overlapPixel)/4.0:(vh*0.8)/2.0);
  var padding=Math.round((vw-(4*r-overlapPixel))/2);
  var circle1=paper.circle(padding+Math.round(r), Math.round(vh/2), r);
  circle1.attr("fill", browser.vennColors[track1.highlightColorIndex]);
  circle1.attr("stroke","none");
  circle1.attr("fill-opacity","1");
  currentColors.push(browser.vennColors[track1.highlightColorIndex]);
  //currentColors.push(browser.vennColors2[2]); // red
  currentColors.push('#000000'); // red
  var txts=[];
  var txt1=paper.text(padding+Math.round(r), Math.round(vh/2.0), t1_not_t2_size);
  txt1.attr({'fill':'#C2C2C2', 'stroke':'none', 'opacity':1, 'font-size':12, 'font-weight':'bold'});
  var circle2=paper.circle(padding+Math.round(3*r-overlapPixel), Math.round(vh/2), r);
  txts.push(txt1);
  circle2.attr("fill", browser.vennColors[track2.highlightColorIndex]);
  circle2.attr("stroke","none");
  circle2.attr("fill-opacity","1");
  currentColors.push(browser.vennColors[track2.highlightColorIndex]);
  currentColors.push(browser.vennColors2[3]); //white
  var txt2=paper.text(padding+Math.round(3*r-overlapPixel), Math.round(vh/2.0), t2_not_t1_size);
  txt2.attr({'fill':'#C2C2C2', 'stroke':'none', 'opacity':1, 'font-size':12, 'font-weight':'bold'});
  txts.push(txt2);
  var txt3=paper.text(padding+Math.round(2*r-overlapPixel/2.0), Math.round(vh/2.0), t1_and_t2_size);
  txt3.attr({'fill':'#C2C2C2', 'stroke':'none', 'opacity':1, 'font-size':12, 'font-weight':'bold'});
  txts.push(txt3);
  var txt4=paper.text(padding+Math.round(2*r-overlapPixel/2.0), Math.round(vh/2.0), all_union_size);
  txt4.attr({'fill':'#C2C2C2', 'stroke':'none', 'opacity':1, 'font-size':12, 'font-weight':'bold'});
  txt4.toBack();
  var closedPaths=browser.twoCirclesIntersect(paper, circle1, circle2);     
  // now add these paths and mouse events;     
  var myPaths=[];
  var pathAttr={
   //"fill": "#d3d3d3",
  "stroke": "#fff",
  "stroke-opacity": "1",
  "stroke-linejoin": "round",
  "stroke-miterlimit": "4",
  "stroke-width": "0.75",
  "stroke-dasharray": "none"
  };
  for(var i=0; i<4; i++){
   var pth=paper.path(closedPaths[i]); 
   pth.attr(pathAttr);
	 pth.attr({'fill':currentColors[i], 'fill-opacity':'1'});
   if(i==3)
     pth.toBack();
   myPaths.push(pth);
  }
  var color1=circle1.attr('fill');
  var color2=circle2.attr('fill');
  for(i=0; i<myPaths.length-1; i++){
  (function (brwsr, path, index, count, trackData) {
    path[0].style.cursor = "pointer";
    /*
    path[0].onmouseover = function () {
      path.animate({'fill': 'yellow', 'fill-opacity':'1.0'}, 10);
      if(count!=0)
        path.attr("title", "Click to add a track");
      path.toFront();
      paper.safari();
      for(var j=0; j<txts.length; j++)
        txts[j].toFront();
    };
    path[0].onmouseout=function(){
     console.log("onmouseout");
     if(index==0)
       path.animate({'fill':color1, 'fill-opacity':'1'}, 10);
     else if(index==1)
       path.animate({'fill':'#d3ded3', 'fill-opacity':'1'},10);
     else if(index==2)
       path.animate({'fill':color2, 'fill-opacity':'1'},10);
      path.toFront();
      for(var j=0; j<txts.length; j++)
        txts[j].toFront();
      paper.safari();
    };
    */
    path.hover(
      function(event){
      path.animate({'fill': 'yellow', 'fill-opacity':'1.0'}, 10);
      if(count!=0)
        path.attr("title", "Click to add a track");
      //  path.toFront();
      paper.safari();
     // for(var j=0; j<txts.length; j++)
      //  txts[j].toFront();
      },
      function(event){
     if(index==0)
       path.animate({'fill':color1, 'fill-opacity':'1'}, 10);
     else if(index==1)
       //path.animate({'fill':browser.vennColors2[2], 'fill-opacity':'1'},10);
       path.animate({'fill':'#000000', 'fill-opacity':'1'},10);
     else if(index==2)
       path.animate({'fill':color2, 'fill-opacity':'1'},10);
      path.toFront();
      for(var j=0; j<txts.length; j++)
        txts[j].toFront();
      paper.safari();
      }
   );
    if(count!=0){
      path[0].onclick= function(){
        //click to bring up a dialog box for user to enter name
        //set gene_string
        var gene_string="";
        for(var j=0; j<trackData[index].length; j++){
          if(trackData[index][j]==1){
            //gene_string=gene_string+'1\n';
            gene_string=gene_string+browser.view.ruler[j]+'|';
				  }
 //         else
//          gene_string=gene_string+'0\n';
        }   
        brwsr.gene_string=gene_string;
 			  brwsr.currentUserTrackType="sbt";
        brwsr.userEnterTrackNameDialog('venndiagramdiv');
      };
    }
  })(this, myPaths[i], i, counts[i], newtracks);
  }
  // the last path is the paper outline
  var outRect=paper.rect(0,0,vw,vh);
  outRect.attr({'fill':'#ffffff', 'fill-opacity':'1.0'});
  outRect.toBack();
  outRect[0].onmouseover=function(){
   myPaths[3].animate({'fill': 'yellow', 'fill-opacity':'1.0'}, 10);
   myPaths[3].toFront();
   txt4.toFront();
   outRect.attr('title','click to add the union track');
   paper.safari();
  };
  outRect[0].onmouseout=function(){
   myPaths[3].animate({'fill': '#ffffff', 'fill-opacity':'1.0'}, 10);
   myPaths[3].toBack();
   txt4.toBack();
   paper.safari();
  };
  var brwsr=this;
  var addUnionClickHandler=function(brwsr, trackData, colors, ioo){ 
    return function(){
    var gene_string="";
		var track_color=[];
		if(trackData.length==0)
		   return;
    for(var j=0; j<trackData[3].length; j++){
      if(trackData[3][j]==1)
       // gene_string=gene_string+'1\n';
        gene_string=gene_string+brwsr.view.ruler[j]+'|';
		 /*
      else
        gene_string=gene_string+'0\n';
				*/
    }   
		// preapre the color value
		for(var k=0; k<3; k++){
      for(var m=0; m<ioo[k].length; m++){
			  track_color[ioo[k][m]]=colors[k];
			}
		}
		for(k=0; k<trackData[3].length; k++){
      if(track_color[k]==undefined){
			  track_color[k]=colors[3];
			}
		}
    brwsr.currentUserTrackType="sbt";
    brwsr.gene_string=gene_string;  
		brwsr.trackColor=track_color;
    brwsr.userEnterTrackNameDialog('venndiagramdiv');
  };
 };
 outRect[0].onclick=addUnionClickHandler(brwsr, newtracks, currentColors, indicesOfOne);
 for(var j=0; j<txts.length; j++)
    txts[j].toFront();
  circle1.remove();
  circle2.remove();
};

// all 3 arrays are of same length;
NGBrowser.prototype.binaryThreeArraysIntersect=function(a1, op1, a2, op2, a3, op3){
  var results=new Array();
  var a=new Array();
	var b=new Array();
  for(var i=0; i<a1.length; i++){
    if(a1[i]==op1 && a2[i]==op2 && a3[i]==op3){
      a.push(1);
			b.push(i);
		}
    else
      a.push(0);
    }
	 results.push(a);
	 results.push(b);
   return results;
};

NGBrowser.prototype.binaryThreeArraysUnion=function(a1,a2,a3){
  // assume all arrays are of same size
  var a=new Array();
  for(var i=0; i<a1.length; i++){
    if(a1[i]==1 || a2[i]==1 || a3[i]==1)
      a.push(1);
    else
      a.push(0);
  }
  return a;
};


// return 8 paths
NGBrowser.prototype.threeCirclesIntersect=function(p,c1,c2,c3){
  var browser=this;
  var closedPaths=[];
  var points12=browser.circleIntersection(p,c1,c2);
  var points23=browser.circleIntersection(p,c2,c3);
  var points13=browser.circleIntersection(p,c1,c3);
  var c_r=c1.attr('r');
  // three circles with same radius size
  var path1='';
  path1+='M '+points12[0].x+' '+points12[0].y+' ';
  path1+=' A '+c_r+' '+c_r+',0, 1 ,0 '+points13[1].x+' '+points13[1].y;
  path1+=' A '+c_r+' '+c_r+',0, 0 ,1 '+points23[1].x+' '+points23[1].y;
  path1+=' A '+c_r+' '+c_r+',0, 0 ,1 '+points12[0].x+' '+points12[0].y;
  path1+=' Z';
  closedPaths.push(path1);

  var path2='';
  path2+='M '+points12[0].x+' '+points12[0].y+' ';
  path2+=' A '+c_r+' '+c_r+',0, 0 ,0 '+points23[1].x+' '+points23[1].y;
  path2+=' A '+c_r+' '+c_r+',0, 0 ,1 '+points13[0].x+' '+points13[0].y;
  path2+=' A '+c_r+' '+c_r+',0, 0 ,0 '+points12[0].x+' '+points12[0].y;
  path2+=' Z';
  closedPaths.push(path2);

  var path3='';
  path3+='M '+points12[0].x+' '+points12[0].y+' ';
  path3+=' A '+c_r+' '+c_r+',0, 0 ,1 '+points13[0].x+' '+points13[0].y;
  path3+=' A '+c_r+' '+c_r+',0, 0 ,1 '+points23[0].x+' '+points23[0].y;
  path3+=' A '+c_r+' '+c_r+',0, 1 ,0 '+points12[0].x+' '+points12[0].y;
  path3+=' Z';
  closedPaths.push(path3);

  var path4='';
  path4+='M '+points23[1].x+' '+points23[1].y+' ';
  path4+=' A '+c_r+' '+c_r+',0, 0 ,0 '+points13[1].x+' '+points13[1].y;
  path4+=' A '+c_r+' '+c_r+',0, 0 ,0 '+points12[1].x+' '+points12[1].y;
  path4+=' A '+c_r+' '+c_r+',0, 0, 1 '+points23[1].x+' '+points23[1].y;
  path4+=' Z';
  closedPaths.push(path4);

  var path5='';
  path5+='M '+points23[1].x+' '+points23[1].y+' ';
  path5+=' A '+c_r+' '+c_r+',0, 0 ,0 '+points12[1].x+' '+points12[1].y;
  path5+=' A '+c_r+' '+c_r+',0, 0 ,0 '+points13[0].x+' '+points13[0].y;
  path5+=' A '+c_r+' '+c_r+',0, 0, 0 '+points23[1].x+' '+points23[1].y;
  path5+=' Z';
  closedPaths.push(path5);

  var path6='';
  path6+='M '+points13[0].x+' '+points13[0].y+' ';
  path6+=' A '+c_r+' '+c_r+',0, 0 ,1 '+points12[1].x+' '+points12[1].y;
  path6+=' A '+c_r+' '+c_r+',0, 0 ,0 '+points23[0].x+' '+points23[0].y;
  path6+=' A '+c_r+' '+c_r+',0, 0, 0 '+points13[0].x+' '+points13[0].y;
  path6+=' Z';
  closedPaths.push(path6);

  var path7='';
  path7+='M '+points12[1].x+' '+points12[1].y+' ';
  path7+=' A '+c_r+' '+c_r+',0, 0 ,1 '+points13[1].x+' '+points13[1].y;
  path7+=' A '+c_r+' '+c_r+',0, 1 ,0 '+points23[0].x+' '+points23[0].y;
  path7+=' A '+c_r+' '+c_r+',0, 0, 1 '+points12[1].x+' '+points12[1].y;
  path7+=' Z';
  closedPaths.push(path7);

  var path8=''; //union path
  path8+='M '+points12[0].x+' '+points12[0].y+' ';
  path8+=' A '+c_r+' '+c_r+',0, 1 ,0 '+points13[1].x+' '+points13[1].y;
  path8+=' A '+c_r+' '+c_r+',0, 1 ,0 '+points23[0].x+' '+points23[0].y;
  path8+=' A '+c_r+' '+c_r+',0, 1, 0 '+points12[0].x+' '+points12[0].y;
  path8+=' Z';
  closedPaths.push(path8);

  return closedPaths;

};

NGBrowser.prototype.vennDiagramThreeTracks=function(track1, track2, track3){
  var browser=this;
  var vh=$("#venndiagramdiv").height();
  var vw=$("#venndiagramdiv").width();
  var paper=Raphael('venndiagramdiv',vw, vh);
  // find the intersection of two track data
  var newtracks=[];
	var indicesOfOne=[];
  var t1_not_t2_not_t3=browser.binaryThreeArraysIntersect(track1.data, 1, track2.data, 0, track3.data, 0);
  newtracks.push(t1_not_t2_not_t3[0]);
  indicesOfOne.push(t1_not_t2_not_t3[1]);
  var t1_t2_not_t3=browser.binaryThreeArraysIntersect(track1.data, 1, track2.data, 1, track3.data, 0);
  newtracks.push(t1_t2_not_t3[0]);
  indicesOfOne.push(t1_t2_not_t3[1]);
  var t2_not_t1_not_t3=browser.binaryThreeArraysIntersect(track1.data,0, track2.data, 1, track3.data, 0);
  newtracks.push(t2_not_t1_not_t3[0]);
  indicesOfOne.push(t2_not_t1_not_t3[1]);
  var t1_t3_not_t2=browser.binaryThreeArraysIntersect(track1.data, 1, track2.data, 0, track3.data, 1);
  newtracks.push(t1_t3_not_t2[0]);
  indicesOfOne.push(t1_t3_not_t2[1]);
  var t1_t2_t3=browser.binaryThreeArraysIntersect(track1.data, 1, track2.data, 1, track3.data, 1);
  newtracks.push(t1_t2_t3[0]);
  indicesOfOne.push(t1_t2_t3[1]);
  var t2_t3_not_t1=browser.binaryThreeArraysIntersect(track1.data, 0, track2.data, 1, track3.data, 1);
  newtracks.push(t2_t3_not_t1[0]);
  indicesOfOne.push(t2_t3_not_t1[1]);
  var t3_not_t1_not_t2=browser.binaryThreeArraysIntersect(track1.data, 0, track2.data, 0, track3.data,1);
  newtracks.push(t3_not_t1_not_t2[0]);
  indicesOfOne.push(t3_not_t1_not_t2[1]);
  var all_union=browser.binaryThreeArraysUnion(track1.data, track2.data, track3.data);
  newtracks.push(all_union);

  var counts=[];
  var t1_not_t2_not_t3_size=t1_not_t2_not_t3[0].sum();
  counts.push(t1_not_t2_not_t3_size);
  var t1_t2_not_t3_size=t1_t2_not_t3[0].sum();
  counts.push(t1_t2_not_t3_size);
  var t2_not_t1_not_t3_size=t2_not_t1_not_t3[0].sum();
  counts.push(t2_not_t1_not_t3_size);
  var t1_t3_not_t2_size=t1_t3_not_t2[0].sum();
  counts.push(t1_t3_not_t2_size);
  var t1_t2_t3_size=t1_t2_t3[0].sum();
  counts.push(t1_t2_t3_size);
  var t2_t3_not_t1_size=t2_t3_not_t1[0].sum();
  counts.push(t2_t3_not_t1_size);
  var t3_not_t1_not_t2_size=t3_not_t1_not_t2[0].sum();
  counts.push(t3_not_t1_not_t2_size);
  var all_union_size=all_union.sum();
  counts.push(all_union_size);

  var currentColors=[];
  var overlapPixel=40;
  var txts=[];
   // calculate r
  var r=0.9*Math.round((0.8*vw+overlapPixel)/4.0<(vh+overlapPixel)/4.0?(0.8*vw+overlapPixel)/4.0:(vh+overlapPixel)/4.0);
  var x_padding=Math.round((vw-(4*r-overlapPixel))/2);
  var y_padding=Math.round((vh-(4*r-overlapPixel))/2);
  var circle1=paper.circle(x_padding+Math.round(r), Math.round(y_padding+r), r);
  circle1.attr("fill", browser.vennColors[track1.highlightColorIndex]);
  circle1.attr("fill-opacity","1");
	currentColors.push(browser.vennColors[track1.highlightColorIndex]);
	currentColors.push(browser.vennColors[3]);
  var circle2=paper.circle(x_padding+Math.round(3*r-overlapPixel), Math.round(y_padding+r), r);
  circle2.attr("fill", browser.vennColors[track2.highlightColorIndex]);
  circle2.attr("fill-opacity","1");
	currentColors.push(browser.vennColors[track2.highlightColorIndex]);
	currentColors.push(browser.vennColors[4]);
	currentColors.push(browser.vennColors[5]);
	currentColors.push(browser.vennColors[6]);
  var circle3=paper.circle(x_padding+Math.round(2*r-overlapPixel/2.0), Math.round(y_padding+3*r-overlapPixel), r);
  circle3.attr("fill", browser.vennColors[track3.highlightColorIndex]);
  circle3.attr("fill-opacity","1");
	currentColors.push(browser.vennColors[track3.highlightColorIndex]);
	currentColors.push(browser.vennColors[7]);
  var points12=browser.circleIntersection(paper,circle1,circle2);
  var points23=browser.circleIntersection(paper,circle2,circle3);
  var points13=browser.circleIntersection(paper,circle1,circle3);
  var txtattr={'fill':'#C2C2C2', 'stroke':'none', 'opacity':1, 'font-size':12, 'font-weight':'bold'};
  var txt1=paper.text(x_padding+Math.round(r), Math.round(y_padding+r), t1_not_t2_not_t3_size);
  txt1.attr({'text-anchor':'end'});
  txts.push(txt1);
  var txt2=paper.text(points12[0].x, (points12[0].y+points23[1].y)/2.0,t1_t2_not_t3_size);
  txt2.attr({'text-anchor':'middle'});
  txts.push(txt2);
  var txt3=paper.text(x_padding+Math.round(3*r-overlapPixel), Math.round(y_padding+r), t2_not_t1_not_t3_size);
  txt3.attr({'text-anchor':'start'});
  txts.push(txt3);
  var txt4=paper.text((points13[1].x+points12[0].x)/2.0, (points23[1].y+points13[1].y)/2.0, t1_t3_not_t2_size);
  txts.push(txt4);
  var txt5=paper.text(points12[0].x, (points23[1].y+points12[1].y)/2.0, t1_t2_t3_size);
  txts.push(txt5);
  var txt6=paper.text((points23[0].x+points12[0].x)/2.0, (points23[1].y+points13[1].y)/2.0, t2_t3_not_t1_size);
  txts.push(txt6);
  var txt7=paper.text(x_padding+Math.round(2*r-overlapPixel/2.0), Math.round(y_padding+3*r-overlapPixel), t3_not_t1_not_t2_size);
  txts.push(txt7);
  var txt8=paper.text(points12[0].x, (points23[1].y+points12[1].y)/2.0 , all_union_size);
  txts.push(txt8);
  for(var i=0; i<txts.length; i++)
    txts[i].attr(txtattr);
  var closedPaths=browser.threeCirclesIntersect(paper, circle1, circle2, circle3);     
  // now add these paths and mouse events;     
  var myPaths=[];
  var pathAttr={
   //"fill": "#d3d3d3",
  "stroke": "#fff",
  "stroke-opacity": "1",
  "stroke-linejoin": "round",
  "stroke-miterlimit": "4",
  "stroke-width": "0.75",
  "stroke-dasharray": "none"
  };
  for(var i=0; i<8; i++){
   var pth=paper.path(closedPaths[i]); 
   pth.attr(pathAttr);
   pth.attr({'fill':currentColors[i], 'fill-opacity':'1'});
	 if(i==7)
	   pth.toBack();
	 /*
   if(i==0)
     pth.attr({'fill':circle1.attr('fill'), 'fill-opacity':'1'});
   else if(i==1)
      pth.attr({'fill':browser.vennColors[3], 'fill-opacity':'1'});
   else if(i==2)
     pth.attr({'fill':circle2.attr('fill'), 'fill-opacity':'1'});
   else if(i==3)
     pth.attr({'fill':browser.vennColors[4], 'fill-opacity':'1'});
   else if(i==4)
     pth.attr({'fill':'#696969', 'fill-opacity':'1'});
   else if(i==5)
		 pth.attr({'fill':browser.vennColors[5], 'fill-opacity':'1'});
   else if(i==6)
     pth.attr({'fill':circle3.attr('fill'), 'fill-opacity':'1'});
   else if(i==7){
     pth.attr({'fill':'#fff', 'fill-opacity':'1'});
     pth.toBack();
   }
		 */
   myPaths.push(pth);
  }
  for(i=0; i<txts.length;i++)
    txts[i].toFront();
  txts[txts.length-1].toBack();
  var color1=circle1.attr('fill');
  var color2=circle2.attr('fill');
  var color3=circle3.attr('fill');
  for(i=0; i<myPaths.length-1; i++){
  (function (brwsr, path, index, count, trackData) {
    path[0].style.cursor = "pointer";
    path[0].onmouseover = function () {
      path.animate({'fill': 'yellow', 'fill-opacity':'1.0'}, 10);
      if(count!=0)
        path.attr("title", "Click to add a track");
      //path.toFront();
      //txts[index].toFront();
      paper.safari();
    };
    path[0].onmouseout = function(){
     if(index==0)
       path.animate({'fill':color1, 'fill-opacity':'1'},10);
     else if(index==1)
       //path.animate({'fill':'#d3ded3', 'fill-opacity':'1'},10);
       path.animate({'fill':browser.vennColors[3], 'fill-opacity':'1'},10);
     else if(index==2)
       path.animate({'fill':color2, 'fill-opacity':'1'},10);
     else if(index==3)
       //path.animate({'fill':'#d3ded3', 'fill-opacity':'1'},10);
       path.animate({'fill':browser.vennColors[4], 'fill-opacity':'1'},10);
     else if(index==4)
       path.animate({'fill': browser.vennColors[5], 'fill-opacity':'1'},10);
     else if(index==5)
       //path.animate({'fill':'#d3ded3', 'fill-opacity':'1'},10);
       path.animate({'fill':browser.vennColors[6], 'fill-opacity':'1'},10);
     else if(index==6)
       path.animate({'fill':color3, 'fill-opacity':'1'},10);
      paper.safari();
    };
    if(count!=0){
		  var clickHandler=function(){
        return function(event){
					var gene_string='';
					for(var j=0; j<trackData[index].length; j++){
						if(trackData[index][j]==1)
						//gene_string=gene_string+'1\n';
              gene_string=gene_string+browser.view.ruler[j]+'|';
					  /*
						else
							gene_string=gene_string+'0\n';
							*/
					}
					brwsr.gene_string=gene_string;
					brwsr.currentUserTrackType="sbt";
					brwsr.userEnterTrackNameDialog('venndiagramdiv');
				};
			};
      path[0].onclick=clickHandler();
    }
  })(this, myPaths[i], i, counts[i], newtracks);
  }
  // the last path is the paper outline

  var outRect=paper.rect(0,0,vw,vh);                                                                             
  outRect.attr({'fill':'#ffffff', 'fill-opacity':'1.0'});
  outRect.toBack();
  outRect[0].onmouseover=function(){
   myPaths[7].animate({'fill': 'yellow', 'fill-opacity':'1.0'}, 10);
   myPaths[7].toFront();
   txts[txts.length-1].toFront();
   paper.safari();
  };
  outRect[0].onmouseout=function(){
   myPaths[7].animate({'fill': '#ffffff', 'fill-opacity':'1.0'}, 10);
   myPaths[7].toBack();
   txts[txts.length-1].toBack();
   paper.safari();
  };
  var brwsr=this;
  var addUnionClickHandler=function(brwsr, trackData, colors, ioo){
    return function(){
      var gene_string='';
			var track_color=[];
      for(var j=0; j<trackData[7].length; j++){
        if(trackData[7][j]==1)
          //gene_string=gene_string+'1\n';
          gene_string=gene_string+brwsr.view.ruler[j]+'|';
			 /*
        else
          gene_string=gene_string+'0\n';
			*/
      }
			 // prepare the color value
			for(var k=0; k<7; k++){
				for(var m=0; m<ioo[k].length; m++){
  	      track_color[ioo[k][m]]=colors[k];
				}
			}
			for(k=0; k<trackData[7].length; k++){
				if(track_color[k]==undefined){
					track_color[k]=colors[7];
				}
			}
      brwsr.gene_string=gene_string;
			brwsr.trackColor=track_color;
			//console.log(track_color);
		  brwsr.currentUserTrackType="sbt";
      brwsr.userEnterTrackNameDialog('venndiagramdiv');
    };
  };
  outRect[0].onclick=addUnionClickHandler(brwsr, newtracks, currentColors, indicesOfOne);
  circle1.remove();
  circle2.remove();
  circle3.remove();
};

// when two tracks are checked in covisform, the two buttons status needs to 
// be updated when user changes view
NGBrowser.prototype.coVisFormsRealTimeButtonUpdate=function(){
	var brwsr=this;
	var allinputs=$("#coVisForm input");
	var checkedCount=0;
	for(i=0; i<$(allinputs).length; i++){
		if($(allinputs).eq(i).is(":checked")){
			checkedCount++;
		}
	}
	// if there is only 1 checked track, do nothing
	// at this point, other checkboxes are already disabled
	if(checkedCount==2){
		// what kind of tracks are checked?  sbt, sct
		var checkedInputIds=[];
		var count=0;
		for(i=0; i<$(allinputs).length; i++){
			if($(allinputs).eq(i).is(":checked")){
				checkedInputIds.push($(allinputs).eq(i).attr("id"));
				count++;
				if(count==2)
					break;
			}
		}
		targetTracks=$.grep(brwsr.view.tracks, function(item,i){
			//				 return (("covis_border_"+item.name)==checkedInputIds[0] || ("covis_border_"+item.name)==checkedInputIds[1] 
			//				      || ("covis_fill_"+item.name)==checkedInputIds[0]  || ("covis_fill_"+item.name)==checkedInputIds[1]);
			return (($.inArray("covis_border_"+item.name, checkedInputIds)!=-1) || 
			($.inArray("covis_fill_"+item.name, checkedInputIds)!=-1));
		});
		var myTypes=[]; 
		var visTypes=[];
		for(i=0; i<targetTracks.length; i++){
			myTypes.push(targetTracks[i].dataType);
			if($.inArray("covis_border_"+targetTracks[i].name, checkedInputIds)!=-1){
				visTypes.push("border"); 
			}
			else{
				visTypes.push("fill"); 
			}
		}
		var startBp=Math.round(brwsr.view.minVisible());
		var endBp=Math.round(brwsr.view.maxVisible());
		if((myTypes[0]=="sbt" && myTypes[1]=="sct") || (myTypes[0]=="sct" && myTypes[1]=="sbt") || (myTypes[0]=="sct" && myTypes[1]=="sct")){
			// to check if we are in the appropriate scale to show the graph
			if(targetTracks[0].isBigCytoscapeWebEnabled(startBp,endBp)){
				brwsr.enableNGButton($("#covissubmitbutton_big_g"), targetTracks, visTypes);
			}
			else{
				brwsr.disableNGButton($("#covissubmitbutton_big_g"));
			}
		}
		else if(myTypes[0]=="sbt" && myTypes[1]=="sbt"){
			if(targetTracks[0].isCytoscapeWebEnabled(startBp,endBp) && targetTracks[1].isCytoscapeWebEnabled(startBp, endBp)){
				brwsr.enableNGButton($("#covissubmitbutton_g"), targetTracks, visTypes);
			}
			else{
				brwsr.disableNGButton($("#covissubmitbutton_g"));
			}
			if(targetTracks[0].isBigCytoscapeWebEnabled(startBp,endBp)){
				brwsr.enableNGButton($("#covissubmitbutton_big_g"), targetTracks, visTypes);
			}
			else{
				brwsr.disableNGButton($("#covissubmitbutton_big_g"));
			}
		}
	}
	else{
	  return;
  }
};

NGBrowser.prototype.coVisFormInputChanged=function(b){
 var brwsr=b;
 var allinputs=$("#coVisForm input");
 var i;
 return function(e){
   var tmpid;
	 var myspanid;
	 if(e.target.checked){  // a track is checked
     // the rest of inputs with same category (border or fill) will all be disabled
		 if(e.target.id.match(/covis_border_/g)!=null){
			 for(i=0; i<$(allinputs).length; i++){
				 if($(allinputs).eq(i).attr("id").match(/covis_border_/g) && $(allinputs).eq(i).attr("id")!=e.target.id){
				   $(allinputs).eq(i).attr("disabled", "disabled");
					 tmpid=$(allinputs).eq(i).attr("id").replace("_border","_fill");
					 // gray out track name when both inputs are disabled
					 if($("input[id='"+Util.jqSelector(tmpid)+"']").attr("disabled")=="disabled"){
					   myspanid=$(allinputs).eq(i).attr("id").replace("_border","Label");
					   $("#"+myspanid).css("color","gray");
					 }
				 }
				 if(e.target.id.replace("border_","fill_")==$(allinputs).eq(i).attr("id")){
					 $(allinputs).eq(i).attr("disabled", "disabled");
				 }
			 }
		 }
		 else{
			 for(i=0; i<$(allinputs).length; i++){
				 if($(allinputs).eq(i).attr("id").match(/covis_fill_/g) && $(allinputs).eq(i).attr("id")!= e.target.id){
					 $(allinputs).eq(i).attr("disabled", "disabled");
					 tmpid=$(allinputs).eq(i).attr("id").replace("_fill","_border");
					 // gray out track name when both inputs are disabled
					 if($("input[id='"+Util.jqSelector(tmpid)+"']").attr("disabled")=="disabled"){
					   myspanid=$(allinputs).eq(i).attr("id").replace("_fill","Label");
					   $("#"+myspanid).css("color","gray");
					 }
				 }
				 if(e.target.id.replace("fill_","border_")==$(allinputs).eq(i).attr("id")){
					 $(allinputs).eq(i).attr("disabled", "disabled");
				 }
			 }
		 }

		 var checkedCount=0;
		 for(i=0; i<$(allinputs).length; i++){
			 if($(allinputs).eq(i).is(":checked")){
				 checkedCount++;
			 }
		 }
		 // if there is only 1 checked track, do nothing
		 // at this point, other checkboxes are already disabled
		 if(checkedCount==2){
			 // what kind of tracks are checked?  sbt, sct
			 var checkedInputIds=[];
			 var count=0;
			 for(i=0; i<$(allinputs).length; i++){
				 if($(allinputs).eq(i).is(":checked")){
					 checkedInputIds.push($(allinputs).eq(i).attr("id"));
					 count++;
					 if(count==2)
						 break;
				 }
			 }
			 targetTracks=$.grep(brwsr.view.tracks, function(item,i){
//				 return (("covis_border_"+item.name)==checkedInputIds[0] || ("covis_border_"+item.name)==checkedInputIds[1] 
//				      || ("covis_fill_"+item.name)==checkedInputIds[0]  || ("covis_fill_"+item.name)==checkedInputIds[1]);
           return (($.inArray("covis_border_"+item.name, checkedInputIds)!=-1) || 
					         ($.inArray("covis_fill_"+item.name, checkedInputIds)!=-1));
			 });
			 var myTypes=[]; 
			 var visTypes=[];
			 for(i=0; i<targetTracks.length; i++){
			   myTypes.push(targetTracks[i].dataType);
				 if($.inArray("covis_border_"+targetTracks[i].name, checkedInputIds)!=-1){
				    visTypes.push("border"); 
				 }
				 else{
				    visTypes.push("fill"); 
				 }
			 }
			 var startBp=Math.round(brwsr.view.minVisible());
			 var endBp=Math.round(brwsr.view.maxVisible());
			 if((myTypes[0]=="sbt" && myTypes[1]=="sct") || (myTypes[0]=="sct" && myTypes[1]=="sbt") || (myTypes[0]=="sct" && myTypes[1]=="sct")){
				 // to check if we are in the appropriate scale to show the graph
				 if(targetTracks[0].isBigCytoscapeWebEnabled(startBp,endBp)){
					 brwsr.enableNGButton($("#covissubmitbutton_big_g"), targetTracks, visTypes);
				 }
			 }
			 else if(myTypes[0]=="sbt" && myTypes[1]=="sbt"){
			    if(targetTracks[0].isCytoscapeWebEnabled(startBp,endBp) && targetTracks[1].isCytoscapeWebEnabled(startBp, endBp)){
			      brwsr.enableNGButton($("#covissubmitbutton_g"), targetTracks, visTypes);
					}
					if(targetTracks[0].isBigCytoscapeWebEnabled(startBp,endBp)){
						brwsr.enableNGButton($("#covissubmitbutton_big_g"), targetTracks, visTypes);
					}
			 }
		 }
	 }
	 else{ // a track is unchecked
		 checkedCount=0;
		 checkedInputIds=[];
		 for(i=0; i<$(allinputs).length; i++){
			 if($(allinputs).eq(i).is(":checked")){
			   checkedInputIds.push($(allinputs).eq(i).attr("id"));
				 checkedCount++;
			 }
		 }
		 if(checkedCount==1){
			 if(e.target.id.match(/border_/g)){
				 for(i=0; i<$(allinputs).length; i++){
				   if($(allinputs).eq(i).attr("id").match(/border_/g) && $(allinputs).eq(i).attr("disabled")
					   && $(allinputs).eq(i).attr("id")!=checkedInputIds[0].replace("fill_","border_")){
						 $(allinputs).eq(i).removeAttr("disabled");
				     myspanid=$(allinputs).eq(i).attr("id").replace("_border","Label");
				     $("#"+myspanid).css("color","black");
					 }
				 }
			 }
			 else{
				 for(i=0; i<$(allinputs).length; i++){
				   if($(allinputs).eq(i).attr("id").match(/fill_/g) && $(allinputs).eq(i).attr("disabled")
					   && $(allinputs).eq(i).attr("id")!=checkedInputIds[0].replace("border_","fill_")){
						 $(allinputs).eq(i).removeAttr("disabled");
				     myspanid=$(allinputs).eq(i).attr("id").replace("_fill","Label");
				     $("#"+myspanid).css("color","black");
					 }
				 }
			 }
		 }
		 else if(checkedCount==0){
			 for(i=0; i<$(allinputs).length; i++){
				 if($(allinputs).eq(i).attr("disabled")){
					 $(allinputs).eq(i).removeAttr("disabled");
				 }
			 }
			 $("#covisformdiv span").css("color","black");
     }  
	   brwsr.disableNGButton($("#covissubmitbutton_g"));
	   brwsr.disableNGButton($("#covissubmitbutton_big_g"));
	 }
 };
};

NGBrowser.prototype.disableNGButton=function(btn){
  //$(btn).addClass("ng_button_disabled");
	$(btn).off("click");
	if($(btn).attr("id")=="covissubmitbutton_g"){
	  $("#covissubmitbutton_g img").attr("src","images/graph-disabled.png");
		$(btn).on("mouseover", function(evt){
			balloon17394.showTooltip(evt, "Covisualization not entable in the current range");
		});
	}
	else if($(btn).attr("id")=="covissubmitbutton_big_g"){
	  $("#covissubmitbutton_big_g img").attr("src","images/graph-big-disabled.png");
		$(btn).on("mouseover", function(evt){
			balloon17394.showTooltip(evt, "Covisualization not enabled in the current zoom level");
		});
	}
};

NGBrowser.prototype.enableNGButton=function(btn, targetTracks, visTypes){
	var brwsr=this;
	$(btn).off("click");
	if($(btn).attr("id")=="covissubmitbutton_g"){
		$("#covissubmitbutton_g img").attr("src","images/graph.png");
		$(btn).on("mouseover", function(evt){
			balloon17394.showTooltip(evt, "click to covisualize all present nodes");
		});
	}
	else if($(btn).attr("id")=="covissubmitbutton_big_g"){
		$("#covissubmitbutton_big_g img").attr("src","images/graph-big.png");
		$(btn).on("mouseover", function(evt){
			balloon17394.showTooltip(evt, "click to covisualize all nodes in the current range");
		});
	}
	$(btn).on("click", function(event){
		brwsr.view.currentCytoScapeDialogId="cytoScapeDialog_"+Util.randomString(8);
		var currentDialogDiv=$("<div>").attr("id",brwsr.view.currentCytoScapeDialogId);
		var cytoscapeDiv=$("<div>").attr("id",brwsr.view.currentCytoScapeDialogId+"_cytoscape").css({"width":"1000px","height":"500px","margin-bottom":"5px"});
		var exportCytoscapeDiv=$("<div>").attr("id",brwsr.view.currentCytoScapeDialogId+"_export").html("Export as: <form id='"+brwsr.view.currentCytoScapeDialogId+"_pdf_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='pdf'></form><form id='"+brwsr.view.currentCytoScapeDialogId+"_png_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='png'></form><form id='"+brwsr.view.currentCytoScapeDialogId+"_graphml_form' method='post' action='export_cytoscape.php'> <input type='hidden' name='content'><input type='hidden' name='type' value='graphml'></form><form id='"+brwsr.view.currentCytoScapeDialogId+"_svg_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='svg'></form><form id='"+brwsr.view.currentCytoScapeDialogId+"_xgmml_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='xgmml'></form><form id='"+brwsr.view.currentCytoScapeDialogId+"_sif_form' method='post' action='export_cytoscape.php'><input type='hidden' name='content'><input type='hidden' name='type' value='sif'></form>");
		var exportCytoscapeSelect=$("<select>").appendTo(exportCytoscapeDiv);
		$(exportCytoscapeSelect).append('<option value="pdf">pdf</option>').append('<option value="png">png</option>')
		                        .append('<option value="graphml">graphml</option>').append('<option value="svg">svg</option>')
		                        .append('<option value="xgmml">xgmml</option>').append('<option value="sif">sif</option>');
		var exportCytoscapeButton=$("<button>").attr("id",brwsr.view.currentCytoScapeDialogId+"_button").html("Export").css("margin-left","10px").appendTo($(exportCytoscapeDiv));
		$(exportCytoscapeButton).button();
		$(cytoscapeDiv).appendTo($(currentDialogDiv));
		$(exportCytoscapeDiv).appendTo($(currentDialogDiv));

		var myCytoscapeDialog=currentDialogDiv.dialog({
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
		var vis = new org.cytoscapeweb.Visualization(brwsr.view.currentCytoScapeDialogId+"_cytoscape", options);
		var draw_option;
		if($(btn).attr("id")=="covissubmitbutton_g"){
		  draw_option=brwsr.getCoVisDrawOption(targetTracks, visTypes);
		}
		else if($(btn).attr("id")=="covissubmitbutton_big_g"){
		  draw_option=brwsr.getBigCoVisDrawOption(targetTracks, visTypes);
		}
		$(exportCytoscapeButton).on("click", function(event){
			//			vis.ready(function() {
				var type=$(exportCytoscapeSelect).val();
				if(type=="pdf"){
					$("#"+brwsr.view.currentCytoScapeDialogId+"_pdf_form [name=content]").val(vis.pdf());
					$("#"+brwsr.view.currentCytoScapeDialogId+"_pdf_form").submit();
				}
				else if(type=="png"){
					$("#"+brwsr.view.currentCytoScapeDialogId+"_png_form [name=content]").val(vis.png());
					$("#"+brwsr.view.currentCytoScapeDialogId+"_png_form").submit();
				}
				else if(type=="svg"){
					$("#"+brwsr.view.currentCytoScapeDialogId+"_svg_form [name=content]").val(vis.svg());
					$("#"+brwsr.view.currentCytoScapeDialogId+"_svg_form").submit();
				}
				else if(type=="graphml"){
					$("#"+brwsr.view.currentCytoScapeDialogId+"_graphml_form [name=content]").val(vis.graphml());
					$("#"+brwsr.view.currentCytoScapeDialogId+"_graphml_form").submit();
				}
				else if(type=="xgmml"){
					$("#"+brwsr.view.currentCytoScapeDialogId+"_xgmml_form [name=content]").val(vis.xgmml());
					$("#"+brwsr.view.currentCytoScapeDialogId+"_xgmml_form").submit();
				}
				else if(type=="sif"){
					$("#"+brwsr.view.currentCytoScapeDialogId+"_sif_form [name=content]").val(vis.sif());
					$("#"+brwsr.view.currentCytoScapeDialogId+"_sif_form").submit();
				}
				//		vis.exportNetwork(type, 'export_cytoscape.php?type='+type, {'window':'_new'});
				//			});
		});
		vis.draw(draw_option);
	});
};

NGBrowser.prototype.getBigCoVisDrawOption=function(targetTracks,visTypes){
	var brwsr=this;
	var startBp=Math.round(brwsr.view.minVisible());
	var endBp=Math.round(brwsr.view.maxVisible());
	var i,j;
	var draw_option={};
	var network_json={};
	var ruler=brwsr.view.ruler;
	var edges=brwsr.networkData;
	var minVisible, maxVisible;

	if(typeof(brwsr.view.currentModuleStartBp)!="undefined"){
		minVisible=brwsr.view.currentModuleStartBp;
		maxVisible=brwsr.view.currentModuleEndBp;
	} 
	else{
		minVisible=startBp;
		maxVisible=endBp;
	}
	minVisible--;
	maxVisible--;
	var getSCTColor=function(track,index){
		if(!isNaN(track.data[index])){
		  return '#'+Util.computeColor(track.data[index], track.max, track.min);
		}
		else{
			return '#a9a9a9';
		}
	};
	var visible=[];
	var colors=[];
	var borderColors=[];
	var fc="#88c353"; // green fill
	var bc="#88c353"; // red border
	var white="#f0f0f0";
	for(i=minVisible; i<=maxVisible; i++){
		visible.push(ruler[i]);
		if(visTypes[0]=="border"){
      if(targetTracks[0].dataType=="sbt"){
				if(targetTracks[0].data[i]==1){
					borderColors.push(bc);
				}
				else{
					borderColors.push(white);
				}
			}
			else{
			  borderColors.push(getSCTColor(targetTracks[0],i));
			}
			if(targetTracks[1].dataType=="sbt"){
				if(targetTracks[1].data[i]==1){
					colors.push(fc);
				}
				else{
					colors.push(white);
				}
			}
			else{
			  colors.push(getSCTColor(targetTracks[1],i));
			}
		}
		else{
      if(targetTracks[0].dataType=="sbt"){
				if(targetTracks[0].data[i]==1){
					colors.push(fc);
				}
				else{
					colors.push(white);
				}
			}
			else{
			  colors.push(getSCTColor(targetTracks[0],i));
			}
      if(targetTracks[1].dataType=="sbt"){
				if(targetTracks[1].data[i]==1){
					borderColors.push(bc);
				}
				else{
					borderColors.push(white);
				}
			}
			else{
			  borderColors.push(getSCTColor(targetTracks[1],i));
			}
		}
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
			'tooltipText': "<b>${label}</b>",
			'borderWidth':'8',
			'opacity':'1'
		},  
		'edges':{
			'color':"#D3BCA5",
			'width':4
		}   
	};  
	//prepare color setting
	var color_entries=[];
	var border_color_entries=[];
	for(i=0; i<visible.length; i++){
		color_entries.push({'attrValue':visible[i], 'value':colors[i]});
		border_color_entries.push({'attrValue':visible[i], 'value':borderColors[i]});
	}   
	var color_setting={
		'discreteMapper':{
			'attrName':'id',
			'entries': color_entries
		}
	};  
	var borderColor_setting={
		'discreteMapper':{
			'attrName':'id',
			'entries': border_color_entries
		}
	};  
	visual_style['nodes']['color']=color_setting; 
	visual_style['nodes']['borderColor']=borderColor_setting; 
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

// sbt sbt covis
NGBrowser.prototype.getCoVisDrawOption=function(targetTracks,visTypes){
	var brwsr=this;
	var startBp=Math.round(brwsr.view.minVisible());
	var endBp=Math.round(brwsr.view.maxVisible());
	var i,j;
	var draw_option={};
	var network_json={};
	var ruler=brwsr.view.ruler;
	var edges=brwsr.networkData;
	var minVisible, maxVisible;

	if(typeof(brwsr.view.currentModuleStartBp)!="undefined"){
		minVisible=brwsr.view.currentModuleStartBp;
		maxVisible=brwsr.view.currentModuleEndBp;
	} 
	else{
		minVisible=startBp;
		maxVisible=endBp;
	}
	minVisible--;
	maxVisible--;
	var visible=[];
	var colors=[];
	var borderColors=[];
	var fc="#88c353"; // green fill
	var fc0="#f0f0f0"; // default gray fill
	var bc="#88c353"; // red border
	var bc0="#f0f0f0"; // default gray border
	for(i=minVisible; i<=maxVisible; i++){
		// union of two tracks
		if(targetTracks[0].data[i]==1 || targetTracks[1].data[i]==1){
			visible.push(ruler[i]);
			if(targetTracks[0].data[i]==1 && targetTracks[1].data[i]==0){
				if(visTypes[0]=="border"){
					borderColors.push(bc);
					colors.push(fc0);
				}
				else{
					borderColors.push(bc0);
					colors.push(fc);
				}
			}
			else if(targetTracks[0].data[i]==0 && targetTracks[1].data[i]==1){
				if(visTypes[1]=="border"){
					borderColors.push(bc);
					colors.push(fc0);
				}
				else{
					borderColors.push(bc0);
					colors.push(fc);
				}
			}
			else { // both 1
				borderColors.push(bc);
				colors.push(fc);
			}
		}
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
			'tooltipText': "<b>${label}</b>",
			'borderWidth':'8',
			'opacity':'1'
		},  
		'edges':{
			'color':"#D3BCA5",
			'width':4
		}   
	};  
	//visual_style['nodes']['color']="#88c353";
	//prepare color setting
	var color_entries=[];
	var border_color_entries=[];
	for(i=0; i<visible.length; i++){
		color_entries.push({'attrValue':visible[i], 'value':colors[i]});
		border_color_entries.push({'attrValue':visible[i], 'value':borderColors[i]});
	}   
	var color_setting={
		'discreteMapper':{
			'attrName':'id',
			'entries': color_entries
		}
	};  
	var borderColor_setting={
		'discreteMapper':{
			'attrName':'id',
			'entries': border_color_entries
		}
	};  
	visual_style['nodes']['color']=color_setting; 
	visual_style['nodes']['borderColor']=borderColor_setting; 
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

NGBrowser.prototype.vennTracksFormInputChanged=function(b){
  var brwsr=b;
  var unHighLightTrack=function(id){
    var targetTrack=$.grep(brwsr.view.tracks, function(n, i){
       return ("vennTracks_"+n.name)==id; 
    });
    targetTrack[0].highlighted=false;
     targetTrack[0].imageClass='';
      var blockImages=$("#track_"+targetTrack[0].name+" img");
      for(var i=0; i<$(blockImages).length; i++){
        if(!$(blockImages).eq(i).attr("id").match(/^icon/g))
				  $(blockImages).eq(i).removeClass();
      }
  };
  var allinputs=$("#vennTracksForm input");
  return function(e){
      if(e.target.checked){
        var checkedCount=0;
        var i;
        for(i=0; i<$(allinputs).length; i++){
          if($(allinputs).eq(i).is(":checked")){
            checkedCount++;
          }
        }
        // one track just got checked
        if(checkedCount==1){ 
					if($("#venndiagramdiv").length!=1){
						var vennDiagramDiv=$("<div>").attr('id','venndiagramdiv');
						brwsr.vennDiagramDiv=vennDiagramDiv;
						$(brwsr.vennTracksFormDiv).append($(vennDiagramDiv));
					}
          //highlight the track and form input label
          // since this is the first track got highlighted, use the first color
//        var colorIndex=brwsr.nextAvailableVennColorIndex();
          brwsr.highLightVennDiagramTrack(e.target.id, 0);
          brwsr.vennColorUsed[0]=1;
          mylabel=brwsr.findVennTracksFormLabelForControl($(e.target));
					$(mylabel).css({"color":brwsr.vennTextColors[0], "font-weight":"bold"});
          // draw one circle 
          var targetTrack=$.grep(brwsr.view.tracks, function(n, i){
             return ("vennTracks_"+n.name)==e.target.id; 
          });
          $('#venndiagramdiv').empty();
          brwsr.vennDiagramOneTrack(targetTrack[0], 0);
        }
        else if(checkedCount==2){ 
          //highlight the track and form input label
          var colorIndex=brwsr.nextAvailableVennColorIndex();
          brwsr.highLightVennDiagramTrack(e.target.id, colorIndex);
          brwsr.vennColorUsed[colorIndex]=1;
          mylabel=brwsr.findVennTracksFormLabelForControl($(e.target));
          $(mylabel).css({"color":brwsr.vennTextColors[colorIndex],"font-weight":"bold"});
          if($('#venndiagramdiv').length)
            $('#venndiagramdiv').empty();
          //find out which ones are currently checked
          var checkedInputIds=new Array();
          var count=0;
          for(i=0; i<$(allinputs).length; i++){
            if($(allinputs).eq(i).is(":checked")){
              checkedInputIds.push($(allinputs).eq(i).attr("id")); 
              count++;
              if(count==2)
                break;
            }
          }
          targetTrack=$.grep(brwsr.view.tracks, function(item,i){
            return (("vennTracks_"+item.name)==checkedInputIds[0] || ("vennTracks_"+item.name)==checkedInputIds[1]); 
          });
          brwsr.vennDiagramTwoTracks(targetTrack[0], targetTrack[1]);
        }
        else if(checkedCount==3){
          //highlight the track and form input label
          var colorIndex=brwsr.nextAvailableVennColorIndex();
          brwsr.highLightVennDiagramTrack(e.target.id, colorIndex);
          brwsr.vennColorUsed[colorIndex]=1;
          mylabel=brwsr.findVennTracksFormLabelForControl($(e.target));
          $(mylabel).css({"color":brwsr.vennTextColors[colorIndex],"font-weight":"bold"});
         // now disable other input selection since we support at most 3 track venn diagram
          for(i=0; i<$(allinputs).length; i++){
            if(!$(allinputs).eq(i).is(":checked")){
              $(allinputs).eq(i).attr("disabled", "disabled");
              mylabel=brwsr.findVennTracksFormLabelForControl($(allinputs).eq(i));
							$(mylabel).css("color","gray");
            }
            else{
              var checkedTrackID=$(allinputs).eq(i).attr("id");
            }
          }
          // find out the 3 checked tracks
          var checkedInputIds=new Array();
          var count=0;
          for(i=0; i<$(allinputs).length; i++){
            if($(allinputs).eq(i).is(":checked")){
              checkedInputIds.push($(allinputs).eq(i).attr("id")); 
              count++;
              if(count==3)
                break;
            }
          }
          targetTrack=$.grep(brwsr.view.tracks, function(item,i){
            return (("vennTracks_"+item.name)==checkedInputIds[0] || ("vennTracks_"+item.name)==checkedInputIds[1] || ("vennTracks_"+item.name)==checkedInputIds[2] ); 
          });
          $('#venndiagramdiv').empty();
          brwsr.vennDiagramThreeTracks(targetTrack[0], targetTrack[1], targetTrack[2]);
        }
      }
      else{  // target unchecked
        // first unhighlight the track and form label
        unHighLightTrack(e.target.id);
        mylabel=brwsr.findVennTracksFormLabelForControl($(e.target));
        $(mylabel).css({"color":"black","font-weight":"normal"});
        var targetTrack=$.grep(brwsr.view.tracks, function(item, i){
          return ("vennTracks_"+item.name)==e.target.id; 
        });
        //release the used color
        brwsr.vennColorUsed[targetTrack[0].highlightColorIndex]=0;
        checkedCount=0;
        for(i=0; i<$(allinputs).length; i++){
          if($(allinputs).eq(i).is(":checked")){
            checkedCount++;
          }
        }
        // if nothing else is checked, enable everything
        if(checkedCount==0){ 
          $("#venndiagramdiv").remove();
        }
        else if(checkedCount==1){
          var colorIdx;
          $('#venndiagramdiv').empty();
          //find out which color is currently used;
          for(i=0;i<3;i++){
            if(brwsr.vennColorUsed[i]==1){
              colorIdx=i;
              break;
            }
          }
          //find out which one is currently checked
          var checkedInputId;
          for(i=0; i<$(allinputs).length; i++){
            if($(allinputs).eq(i).is(":checked")){
              checkedInputId=$(allinputs).eq(i).attr("id"); 
              break;
            }
          }
          targetTrack=$.grep(brwsr.view.tracks, function(item, i){
            return ("vennTracks_"+item.name)==checkedInputId; 
          });
          brwsr.vennDiagramOneTrack(targetTrack[0], colorIdx);
        }
        else if(checkedCount==2){  // enable all 
          for(i=0; i<$(allinputs).length; i++){
            if($(allinputs).eq(i).attr("disabled")){
              mylabel=brwsr.findVennTracksFormLabelForControl($(allinputs).eq(i));
              $(mylabel).css("color","black");
              $(allinputs).eq(i).removeAttr("disabled");
            }
          }
          //find out which ones are currently checked
          var checkedInputIds=new Array();
          var count=0;
          for(i=0; i<$(allinputs).length; i++){
            if($(allinputs).eq(i).is(":checked")){
              checkedInputIds.push($(allinputs).eq(i).attr("id")); 
              count++;
              if(count==2)
                break;
            }
          }
          targetTrack=$.grep(brwsr.view.tracks, function(item, i){
            return (("vennTracks_"+item.name)==checkedInputIds[0] || ("vennTracks_"+item.name)==checkedInputIds[1]); 
        });
          $('#venndiagramdiv').empty();
          brwsr.vennDiagramTwoTracks(targetTrack[0], targetTrack[1]);
      }
    }
  }
};

NGBrowser.prototype.displayInfo=function(event){
  var mytitle;
  var targetid=event.target.id;           
  //icon_info_trackShown_XXXXX
  mytitle=targetid.slice(21);
 // get info from trackInfo
	var result=queryTrackDataByLabel(this.trackData, mytitle);
  for(var i=0; i<result.length; i++){
      if(result[i]["network"]==this.currentNetwork)
        break;
  }
  var type=result[i]["type"];
  var url=result[i]["url"];
  var label=result[i]["label"];
  var title=result[i]["key"];
  //tooltip.show("Type: "+type+'<br/>'+"Name: "+ title);
  balloon17394.showTooltip(event, "Type: "+type+'<br/>'+"Name: "+ title);
}

NGBrowser.prototype.hideInfo=function(event){
//     tooltip.hide();
};


/* hide left pane when sample info is active */
NGBrowser.prototype.hideLeftPane=function(){
  //$("#ui-layout-west").css("visibility","hidden");
	//$("#ui-layout-west").css({opacity: 0, visibility: "hidden"}).animate({opacity: 0.8}, 200);
	$("#ui-layout-west").fadeTo("fast",0.3);
};

/* show left pane when sample info is inactive */
NGBrowser.prototype.showLeftPane=function(){
  //$("#ui-layout-west").css("visibility","visible");
	$("#ui-layout-west").fadeTo("fast",1.0);
	//$("#ui-layout-west").css({opacity: 0.8, visibility: "visible"}).animate({opacity: 0}, 200);
};

/* hide left pane when sample info is active */
NGBrowser.prototype.showLeftPaneHint=function(){
  //$("#ui-layout-west").css("visibility","hidden");
	//$("#ui-layout-west").css({opacity: 0, visibility: "hidden"}).animate({opacity: 0.8}, 200);
	$("#ui-layout-west").fadeTo("fast",0.3);
	if($("#ng_hint_add_track").length==0){
		$("#NGBrowser").append($("<div>").attr({"id":"ng_hint_add_track"}).css({"position":"absolute","top":"100px","left":"20px","width":"210px","padding":"10px 5px 10px 5px","background-color":"#D3BCA5","font":"16px arial,sans-serif","border":"1px solid #D3BCA5","border-radius":"5px"}).html("Add track to enable the left pane. Please refer to the <a target='_new' style='color:red' href='doc/NetGestalt_Manual.pdf'>manual</a> if you are new to NetGestalt."));
	}
};

/* show left pane when sample info is inactive */
NGBrowser.prototype.hideLeftPaneHint=function(){
  //$("#ui-layout-west").css("visibility","visible");
	$("#ui-layout-west").fadeTo("fast",1.0);
	$("#ng_hint_add_track").remove();
	//$("#ui-layout-west").css({opacity: 0.8, visibility: "visible"}).animate({opacity: 0}, 200);
};

NGBrowser.prototype.userCreateViewSwitch=function(storageName, msm, orig_cct_name){
  var brwsr=this;
	$.ajax({
    url:"generate_user_created_view.php",
		type:"post",
		data:{"msm":msm,"orig_cct_name":orig_cct_name},
		dataTye:"json",
		async:true,
		beforeSend: function(){
			// show busy loading image
      $(".userCreateViewDialog .ui-dialog-buttonset").before("<div id='user-createview-error' style='color:red'></div><div id='usercreateviewloading' style='margin-left:20px;margin-top:10px;'><img width=\"32px\" src=\"images/loading2.gif\"><img></div>");
		},
		complete: function(){
		},
		success:function(data){
      //console.log(data);
      var response=$.parseJSON(data);
      var obj=response["create_network_status"];
			if(response.status=!"OK"){
        $("#usercreateviewloading").hide();
				$("#user-createview-error").html("Error: "+response.status);
			}
			else{
			  // the second parameter is only for user created view, that track is REQUIRED to be associated with that view.
				brwsr.addUserNetwork(JSON.stringify(response["create_network_status"]), JSON.stringify(response["create_track_status"]));
				var oldValue=brwsr.currentNetwork;
				var newValue=obj["info"]["name"];
				if($("#changeview_confirm_2")){
					var confirm_div=$("<div>").attr({"id":"changeview_confirm_2","title":"Select view"});
					$(confirm_div).html("<p><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 20px 0;'></span>Selecting the new view will clear all tracks in the current view. Do you want to continue?</p>");
					$("body").append($(confirm_div));
				}
				$("#changeview_confirm_2").dialog({
					resizable: false,
					height:200,
					width:400,
					modal: true,
					buttons: {
						"Continue": function() {
							brwsr.clearAllTracks();
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
							brwsr.view.setLocation(brwsr.networkInfo);
							setTimeout(function(){ng_logo.networkChanged(oldValue, newValue, false)}, 1000);
							// add track
							// this is the urls for the actual track data
							var results=response["create_track_status"];
							var tUrls=results.url;
							var tIntUrls=results.int_url;
							var tType=results.type;
							var tNames=results.name;
							// tUrls.length should be 1 
							for(var l=0; l<tUrls.length; l++){
								var userTrack={};
								userTrack.url=tUrls[l];
								userTrack.int_url=tIntUrls[l];
								userTrack.network=brwsr.currentNetwork;
								userTrack.type='CompositeTrack';
								if('sampleinfo' in results){
									userTrack.sampleinfo=results.sampleinfo[l];
								}
								userTrack.samples=results.samples[l];
								userTrack.datatype=tType;
								userTrack.key=tNames[l];
								userTrack.label=tNames[l].replace(/ /g,"");
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
								brwsr.stbox.addTrack(evt); 
							}
              $("#usercreateviewloading").hide();
	            $("#userCreateViewDiv").dialog("close");
						},
						"Cancel": function(){
							$(this).dialog("close");
							return;
						}
					}
				});
			}
		}
		});
// remove storage itme after user switched to the new view
  if(typeof(localStorage)!='undefined'){
    localStorage.removeItem(storageName);
    localStorage.removeItem(storageName+"-submittime");
	}
};

NGBrowser.prototype.setUpUserCreateViewDialog=function(storageName){
	var userCreateViewDivAccordionHtml="<div id='user-createview-accordion' style='position:absolute;overflow-y:scroll'><h3>Primary Inputs</h3><div style='width:450px' id='netsamparams_input_files'><form action='create_view.php' method='post' enctype='multipart/form-data' name='userCreateViewForm' id='userCreateViewForm'><input name='currentNetwork' type='hidden' id='currentNetwork' value=''><div id='cv_uploadcct'><span>Matrix </span><span style='color:red;font-size:10px'>(required)</span><span>: </span><input name='userCreateViewCctFile' type='file' id='userCreateViewCctFile' style='width:50%'/></div><div style='margin-top:5px' id='cv_uploadtsi'><span>Sample annotation </span><span style='color:blue;font-size:10px'>(optional)</span><span>: </span><input name='userCreateViewTsiFile' type='file' id='userCreateViewTsiFile' style='width:50%'/></div></form></div><h3>Basic Options</h3><div style='width:450px' id='netsamparams_basic'></div><h3>Advanced Options</h3><div style='width:450px' id='netsamparams_advanced'></div></div>";
	var userCreateViewDiv=$("#userCreateViewDiv");
	if(userCreateViewDiv.length==0){
		userCreateViewDiv=$('<div>').attr({'id':'userCreateViewDiv'});
	}
	userCreateViewDiv.html(userCreateViewDivAccordionHtml);
	var userCreateViewDialog=userCreateViewDiv.dialog({
		autoOpen:false,
		title:'Create View',
		modal:true,
		height:'600',
		width:'550',
		resizable:false,
		dialogClass:'userCreateViewDialog',
		close: function(){
			$('#userCreateViewCctFile').val('');
			$('#userCreateViewTsiFile').val('');
		},
		buttons: {
			"Submit":{
				text: "Submit",
				//class: 'userCreateViewSubmit',
				click: function() {
					// TSI file is not required.
					if($("#userCreateViewCctFile").val()==""){
						updateViewErrorMsg("Please select a matrix file.","error");
						return false;
					}
					else if($("#netsamparams_id_type_sel").val()!="hgnc_symbol" && $("#netsamparams_id_type_sel").val()!="NULL" && $("#netsamparams_collapse_to_symbol_sel").val()==""){
						updateViewErrorMsg("Please choose collapsing data set to gene symbol (True or False)","error");
						return false;
					}
					else{
							updateViewErrorMsg("");
							$('form#userCreateViewForm').ajaxSubmit({
								beforeSubmit: function(){
									// show loading image
									$("#cv_error_before_submit").html("<img style='margin-top:5px' src='images/loading2.gif'></img>"); 
									userCreateViewDialog.dialog("option", "buttons", [
										{text:"OK", click:function() {
											updateViewErrorMsg("");
											$(this).dialog("close");
										} 
										}
									]);
								},
								data:{
									"organism":ng_logo.organism,
									"collapse_to_symbol":$("#netsamparams_collapse_to_symbol_sel").val(),
									"id_type":$("#netsamparams_id_type_sel").val(),
									"naPer":$("#netsamparams_naPer_input").val() || $("#netsamparams_naPer_input").attr("placeholder"),
									"meanPer":$("#netsamparams_meanPer_input").val() || $("#netsamparams_meanPer_input").attr("placeholder"),
									"varPer":$("#netsamparams_varPer_input").val() || $("#netsamparams_varPer_input").attr("placeholder"),
									"matNetMethod":$("#netsamparams_coexpMethod_sel").val(),
									"moduleSigMethod":$("#netsamparams_method_sel").val(),
									"collapse_mode":$("#netsamparams_collapse_mode_sel").val(),
									"corrType":$("#netsamparams_corrType_sel").val(),
									"networkType":$("#netsamparams_networkType_sel").val(),
									"valueThr":$("#netsamparams_valueThr_input").val() || $("#netsamparams_valueThr_input").attr("placeholder"),
									"rankBest":$("#netsamparams_rankBest_input").val() || $("#netsamparams_rankBest_input").attr("placeholder"),
									"fdrMethod":$("#netsamparams_fdrMethod_sel").val(),
									"fdrth":$("#netsamparams_fdrth_input").val() || $("#netsamparams_fdrth_input").attr("placeholder"),
									"minModule":$("#netsamparams_minModule_input").val() || $("#netsamparams_minModule_input").attr("placeholder"),
									"stepIte":$("#netsamparams_stepIte_sel").val(),
									"maxStep":$("#netsamparams_maxStep_input").val() || $("#netsamparams_maxStep_input").attr("placeholder"),
									"modularityThr":$("#netsamparams_ModularityThr_input").val() || $("#netsamparams_ModularityThr_input").attr("placeholder"),
									"zRandomNum":$("#netsamparams_ZRandomNum_input").val() || $("#netsamparams_ZRandomNum_input").attr("placeholder"),
									"permuteNum":$("#netsamparams_permuteNum_input").val() || $("#netsamparams_permuteNum_input").attr("placeholder"),
									"ranSig":$("#netsamparams_pThr_input").val() || $("#netsamparams_pThr_input").attr("placeholder"),
									"idNumThr":10000  // the threshold of the number of ids in the data matrix
								},
								success: function(responseText){
									$("#cv_error_before_submit").html("");
									var result=$.parseJSON(responseText);
									var details;
									var status=result["status"];
									if(status=="Error"){
										try{
											details=window.atob(result["details"]);
										}
										catch(exception){
											details=result["details"];
										}
										updateViewErrorMsg("Job submission failed.<br>"+details,"error");
										return false;
									}
									else if(status="Submit_Ok"){
										updateViewErrorMsg("Job submitted successfully. To check job status, click menu \"View\", then \"Create\".","info");
										var myDate=new Date();
										var cur_time=myDate.format("H\\:i\\:s \\(T\\), M jS, Y");
										if(typeof(localStorage)!='undefined'){
                      localStorage.setItem(storageName+"-submittime",JSON.stringify({"submit_time":cur_time}));
										}
										var storageData={};
										storageData["job_id"]=result["job_id"];
										storageData["orig_cct_path"]=result["orig_cct_path"];
										storageData["orig_tsi_path"]=result["orig_tsi_path"];
										storageData["output_file"]=result["output_file"];
										storageData["msm_file"]=result["msm_file"];
										storageData["orig_cct_name"]=result["orig_cct_name"];
										if(typeof(localStorage)!='undefined'){
										  localStorage.setItem(storageName,JSON.stringify(storageData));
										}
										// do something 
										//console.log(result);
										// update cookie  
										// $.cookie(cookieName,JSON.stringify(result)); 
									}
								}
							});
					}
					//						userCreateViewDialog.dialog('close');
				}
			},
			"Cancel": function() {
				$('#userCreateViewCctFile').val('');
				$('#userCreateViewTsiFile').val('');
				updateViewErrorMsg(""); //clear error
				$(this).dialog("close");
			}
		}
	});
	userCreateViewDialog.css({"min-height":"150px"});
	userCreateViewDialog.css({"max-height":"600px"});
	/*
	var updateViewErrorMsg=function(errorCode){
	// 99 -- no error msg (clear all)
	// NEEDS UPDATE ..........
	// 0 -- upload success
	// -1 -- no cct file selected
	// -2 -- no tsi file selected
	var divIds=['cv_uploadnoerror', 'cv_nocctfileselected', 'cv_notsifileselected', 'cv_fileextensionerror', 'cv_errorgeneratingview','cv_filesizerror','cv_uploadfilebusy','cv_NOTUSED'];
	for(var i=0; i<divIds.length; i++){
	$('#'+divIds[i]).hide();
	}
	if(errorCode!=99){
	$('#'+divIds[Math.abs(errorCode)]).show();
	}
	};
	*/
	var updateViewErrorMsg=function(msg, type){
		$("#cv_error_before_submit").html(msg);
		if(type=="error"){
			$("#cv_error_before_submit").css({"color":"red"});
		}
		else{
			$("#cv_error_before_submit").css({"color":"blue"});
		}
	}
	var error_css="margin:0px 0px 5px 10px;color:red;display:none;";
	//	var error_msg="<div id='cv_uploadfilebusy' style='margin-top:10px;display:none'><img src='images/loading2.gif'></img></div><div id='cv_nocctfileselected' style='"+error_css+"'><br>Please select a cct file to upload!</div><div id='cv_notsifileselected' style='"+error_css+"'><br>Please select a tsi file to upload!</div><div id='cv_errorgeneratingview' style='"+error_css+"'><br>Error generating view.</div><div id='cv_fileextensionerror' style='"+error_css+"'><br>File type not supported</div><div id='cv_filesizerror' style='"+error_css+"'><br>File size too large (Maximum upload size is 8 MB).</div><div id='cv_uploadnoerror' style='color:blue;display:none;margin-bottom:5px'>Files uploaded successfully!</div>";
	if($("#cv_error_before_submit").length==0){
		var error_msg=$("<div>").attr({"id":"cv_error_before_submit"}).css({"margin":"10px 0px 5px 10px","max-height":"100px","overflow":"scroll"});
		$(".userCreateViewDialog .ui-dialog-buttonset").before(error_msg);
	}
	$(".userCreateViewDialog .ui-dialog-buttonset").before(error_msg);
	var netsamparams_input_files=$("#netsamparams_input_files");
	/*
	var netsamparams_organism=$("<div>").addClass("netsamparams").attr({"id":"netsamparams_organism"}).html("Organism: ");
	var netsamparams_organism_sel=$("<select id=netsamparams_organism_sel name=netsamparams_organism_sel>");
	var organism_choices=["hsapiens","mmusculus","rnorvegicus","drerio","celegans","scerevisiae","cfamiliaris","dmelanogaster"];
	for(var i=0; i<organism_choices.length; i++) {
		$("<option />", {value: organism_choices[i], text: organism_choices[i]}).appendTo(netsamparams_organism_sel);
	}
	netsamparams_organism_sel.appendTo(netsamparams_organism);
	nsetsamparams_organism.appendTo(netsamparams_input_files);
	*/
  $("#cv_uploadcct").addClass("netsamparams_background");
  $("#cv_uploadtsi").addClass("netsamparams_background_white");
	var netsamparams_id_type=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_id_type"}).html("ID type:");
	var id_type_sel=$("<select id=netsamparams_id_type_sel name=netsamparams_id_type_sel>").css({"margin-top":"5px","margin-left":"25px"});
	var idTypeVals=ngIdTypes[ng_logo.organism];
	for(var i=0; i<idTypeVals.length; i++){
		if(idTypeVals[i]!="None of the above"){
			$("<option>", {value: "NULL", text: idTypeVals[i]}).appendTo(id_type_sel);
		}
		else{
			$("<option>", {value: idTypeVals[i], text: idTypeVals[i]}).appendTo(id_type_sel);
		}
	}
	id_type_sel.appendTo(netsamparams_id_type); 
	netsamparams_id_type.appendTo(netsamparams_input_files);
	var netsamparams_collapse_to_symbol=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_collapse_to_symbol"}).html("<span>Map to gene symbol: </span>");
	var s=$("<select id=netsamparams_collapse_to_symbol_sel name=netsamparams_collapse_to_symbol_sel>");
	$("<option>", {value: "", text: ""}).appendTo(s);
	$("<option>", {value: "FALSE", text: "False"}).appendTo(s);
	$("<option>", {value: "TRUE", text: "True"}).appendTo(s);
	s.appendTo(netsamparams_collapse_to_symbol); 
	netsamparams_collapse_to_symbol.appendTo(netsamparams_input_files);

	var netsamparams_basic=$("#netsamparams_basic");
	var netsamparams_naPer=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_naPer"}).html("<span>naPer: </span>");
	var netsamparams_naPer_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_naPer_input', name: 'netsamparams_naPer_input', maxlength:"5", size:"5", placeholder: "0.7" }).appendTo(netsamparams_naPer);
	netsamparams_naPer.appendTo(netsamparams_basic);
	var netsamparams_meanPer=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_meanPer"}).html("<span>meanPer: </span>");
	var netsamparams_meanPer_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_meanPer_input', name: 'netsamparams_meanPer_input', maxlength:"5", size:"5", placeholder: "0.8" }).appendTo(netsamparams_meanPer);
	netsamparams_meanPer.appendTo(netsamparams_basic);
	var netsamparams_varPer=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_varPer"}).html("<span>varPer: </span>");
	var netsamparams_varPer_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_varPer_input', name: 'netsamparams_varPer_input', maxlength:"5", size:"5", placeholder:"0.8" }).appendTo(netsamparams_varPer);
	netsamparams_varPer.appendTo(netsamparams_basic);
	var netsamparams_coexpMethod=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_coexpMethod"}).html("<span>Method for constructing co-dependent network: </span>");
	var netsamparams_coexpMethod_sel=$("<select id=netsamparams_coexpMethod_sel name=netsamparams_coexpMethod_sel>");
	var coexpMethod_choices=["rank","value"];
	for(var i=0; i<coexpMethod_choices.length; i++) {
		$("<option />", {value: coexpMethod_choices[i], text: coexpMethod_choices[i]}).appendTo(netsamparams_coexpMethod_sel);
	}
	netsamparams_coexpMethod_sel.appendTo(netsamparams_coexpMethod); 
	netsamparams_coexpMethod.appendTo(netsamparams_basic);
	var netsamparams_method=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_method"}).html("<span>Method for identifying significant modules: </span>");
	var netsamparams_method_sel=$("<select id=netsamparams_method_sel name=netsamparams_method_sel>");
	var method_choices=["cutoff","zscore","permutation"];
	for(var i=0; i<method_choices.length; i++) {
		$("<option />", {value: method_choices[i], text: method_choices[i]}).appendTo(netsamparams_method_sel);
	}
	netsamparams_method_sel.appendTo(netsamparams_method); 
	netsamparams_method.appendTo(netsamparams_basic);
	var netsamparams_advanced=$("#netsamparams_advanced");
	var netsamparams_collapse_mode=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_collapse_mode"}).html("<span>Collapse method: </span>");
	var netsamparams_collapse_mode_sel=$("<select id=netsamparams_collapse_mode_sel name=netsamparams_collapse_mode_sel>");
	var cm_choices=["maxSD", "max", "maxIQR", "mean","median", "min"];
	for(var i=0; i<cm_choices.length; i++) {
		$("<option />", {value: cm_choices[i], text: cm_choices[i]}).appendTo(netsamparams_collapse_mode_sel);
	}
	netsamparams_collapse_mode_sel.appendTo(netsamparams_collapse_mode); 
	netsamparams_collapse_mode.appendTo(netsamparams_advanced);
	var netsamparams_corrType=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_corrType"}).html("<span>Correlation type: </span>");
	var netsamparams_corrType_sel=$("<select id=netsamparams_corrType_sel name=netsamparams_corrType_sel>");
	var corrType_choices=["spearman","pearson"];
	for(var i=0; i<corrType_choices.length; i++) {
		$("<option />", {value: corrType_choices[i], text: corrType_choices[i]}).appendTo(netsamparams_corrType_sel);
	}
	netsamparams_corrType_sel.appendTo(netsamparams_corrType); 
	netsamparams_corrType.appendTo(netsamparams_advanced);
	var netsamparams_networkType=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_networkType"}).html("<span>Network sign: </span>");
	var netsamparams_networkType_sel=$("<select id=netsamparams_networkType_sel name=netsamparams_networkType_sel>");
	var nt_choices=["signed","unsigned"];
	for(var i=0; i<nt_choices.length; i++) {
		$("<option />", {value: nt_choices[i], text: nt_choices[i]}).appendTo(netsamparams_networkType_sel);
	}
	netsamparams_networkType_sel.appendTo(netsamparams_networkType); 
	netsamparams_networkType.appendTo(netsamparams_advanced);
	var netsamparams_valueThr=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_valueThr"}).html("<span>Value Threshold: </span>");
	var netsamparams_valueThr_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_valueThr_input', name: 'netsamparams_valueThr_input', maxlength:"5", size:"5", placeholder:"0.6" }).appendTo(netsamparams_valueThr);
	netsamparams_valueThr.appendTo(netsamparams_advanced);
	var netsamparams_rankBest=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_rankBest"}).html("<span>Rank best percentage: </span>");
	var netsamparams_rankBest_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_rankBest_input', name: 'netsamparams_rankBest_input', maxlength:"3", size:"5", placeholder:"0.3" }).appendTo(netsamparams_rankBest);
	netsamparams_rankBest.append("<span style='display:inline'>%</span>");
	netsamparams_rankBest.appendTo(netsamparams_advanced);
	var netsamparams_fdrMethod=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_fdrMethod"}).html("<span>FDR Method for identifying significant co-dependent pairs: </span>");
	var netsamparams_fdrMethod_sel=$("<select id=netsamparams_fdrMethod_sel name=netsamparams_fdrMethod_sel>");
	var fm_choices=["BH","bonferroni","BY","hochberg","holm", "hommel","none"];
	for(var i=0; i<fm_choices.length; i++) {
		$("<option />", {value: fm_choices[i], text: fm_choices[i]}).appendTo(netsamparams_fdrMethod_sel);
	}
	netsamparams_fdrMethod_sel.appendTo(netsamparams_fdrMethod); 
	netsamparams_fdrMethod.appendTo(netsamparams_advanced);
	var netsamparams_fdrth=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_fdrth"}).html("<span>FDR Threshold: </span>");
	var netsamparams_fdrth_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_fdrth_input', name: 'netsamparams_fdrth_input', maxlength:"5", size:"5", placeholder:"0.05" }).appendTo(netsamparams_fdrth);
	netsamparams_fdrth.appendTo(netsamparams_advanced);
	var netsamparams_minModule=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_minModule"}).html("<span>Minimum module percentage: </span>");
	var netsamparams_minModule_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_minModule_input', name: 'netsamparams_minModule_input', maxlength:"5", size:"5", placeholder:"0.3" }).appendTo(netsamparams_minModule);
	netsamparams_minModule.append("<span style='display:inline'>%</span>");
	netsamparams_minModule.appendTo(netsamparams_advanced);
	var netsamparams_stepIte=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_stepIte"}).html("<span>Step iteration: </span>");
	s=$("<select id=netsamparams_stepIte_sel name=netsamparams_stepIte_sel>");
	$("<option />", {value: "FALSE", text: "False"}).appendTo(s);
	$("<option />", {value: "TRUE", text: "True"}).appendTo(s);
	s.appendTo(netsamparams_stepIte); 
	netsamparams_stepIte.appendTo(netsamparams_advanced);
	var netsamparams_maxStep=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_maxStep"}).html("<span>Max Step number: </span>");
	var netsamparams_maxStep_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_maxStep_input', name: 'netsamparams_maxStep_input', maxlength:"5", size:"5", placeholder:"4"}).appendTo(netsamparams_maxStep);
	netsamparams_maxStep.appendTo(netsamparams_advanced);
	var netsamparams_ModularityThr=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_ModularityThr"}).html("<span>Modularity threshold: </span>");
	var netsamparams_ModularityThr_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_ModularityThr_input', name: 'netsamparams_ModularityThr_input', maxlength:"5", size:"5", placeholder:"0.2" }).appendTo(netsamparams_ModularityThr);
	netsamparams_ModularityThr.appendTo(netsamparams_advanced);
	var netsamparams_ZRandomNum=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_ZRandomNum"}).html("<span>Random number for Z score: </span>");
	var netsamparams_ZRandomNum_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_ZRandomNum_input', name: 'netsamparams_ZRandomNum_input', maxlength:"5", size:"5", placeholder:"10" }).appendTo(netsamparams_ZRandomNum);
	netsamparams_ZRandomNum.appendTo(netsamparams_advanced);
	var netsamparams_permuteNum=$("<div>").addClass("netsamparams_background").addClass("netsamparams").attr({"id":"netsamparams_permuteNum"}).html("<span>Random number for permutation: </span>");
	var netsamparams_permuteNum_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_permuteNum_input', name: 'netsamparams_permuteNum_input', maxlength:"5", size:"5", placeholder:"100" }).appendTo(netsamparams_permuteNum);
	var netsamparams_pThr=$("<div>").addClass("netsamparams_background_white").addClass("netsamparams").attr({"id":"netsamparams_pThr"}).html("<span>P value threshold for Z score or permutation: </span>");
	var netsamparams_pThr_input=$('<input>').addClass("netsamparams_input numbersonly").attr({ type: 'text', id: 'netsamparams_pThr_input', name: 'netsamparams_pThr_input', maxlength:"5", size:"5", placeholder:"0.05" }).appendTo(netsamparams_pThr);
	netsamparams_permuteNum.appendTo(netsamparams_advanced);
	netsamparams_pThr.appendTo(netsamparams_advanced);
	$(".netsamparams_input").focus(function(){
		$(this).data('placeholder',$(this).attr('placeholder'))
		$(this).attr('placeholder','');
	});
	$(".netsamparams_input").blur(function(){
		$(this).attr('placeholder',$(this).data('placeholder'));
	});
	$("#user-createview-accordion").accordion({ heightStyle:"content"});
	// add selection change event
	$("#netsamparams_id_type_sel").change(function(){
   if($("#netsamparams_id_type_sel").val()=="NULL"){
	    $("#netsamparams_collapse_to_symbol_sel").val("");
			$("#netsamparams_collapse_to_symbol_sel").prop('disabled', true);
	 }
   else if($("#netsamparams_id_type_sel").val()=="hgnc_symbol"){
	    $("#netsamparams_collapse_to_symbol_sel").val("TRUE");
			$("#netsamparams_collapse_to_symbol_sel").prop('disabled', true);
	}
	 else{
	    $("#netsamparams_collapse_to_symbol_sel").val("");
			$("#netsamparams_collapse_to_symbol_sel").prop('disabled', false);
	 }
	});
	$("#netsamparams_coexpMethod_sel").change(function() {
		if($("#netsamparams_coexpMethod_sel").val()=="rank"){
			$("#netsamparams_rankBest_input").prop('disabled', false);
			$("#netsamparams_fdrMethod_sel").prop('disabled', false);
			$("#netsamparams_fdrth_input").prop('disabled', false);
			$("#netsamparams_valueThr_input").prop('disabled', true);
		}
		else{ // val()=="value"
			$("#netsamparams_rankBest_input").prop('disabled', true);
			$("#netsamparams_fdrMethod_sel").prop('disabled',true);
			$("#netsamparams_fdrth_input").prop('disabled',true);
			$("#netsamparams_valueThr_input").prop('disabled', false);
		}
	});
	$("#netsamparams_method_sel").change(function(){
		if($("#netsamparams_method_sel").val()=="cutoff"){
			$("#netsamparams_ModularityThr_input").prop('disabled',false);
			$("#netsamparams_ZRandomNum_input").prop('disabled',true);
			$("#netsamparams_permuteNum_input").prop('disabled',true);
			$("#netsamparams_pThr_input").prop('disabled',true);
		}
		else if($("#netsamparams_method_sel").val()=="zscore"){
			$("#netsamparams_ModularityThr_input").prop('disabled', true);
			$("#netsamparams_ZRandomNum_input").prop('disabled',false);
			$("#netsamparams_permuteNum_input").prop('disabled',true);
			$("#netsamparams_pThr_input").prop('disabled',false);
		}
		else{ //permutation
			$("#netsamparams_ModularityThr_input").prop('disabled', true);
			$("#netsamparams_ZRandomNum_input").prop('disabled',true);
			$("#netsamparams_permuteNum_input").prop('disabled',false);
			$("#netsamparams_pThr_input").prop('disabled',false);
		}
	});
	if($(".numbersonly").unbind("keyup")){
		$(".numbersonly").keyup(function () {
			if(this.value != this.value.replace(/[^0-9\.]/g, '')) {
				this.value = this.value.replace(/[^0-9\.]/g, '');
			}
		});
	}
	$("#netsamparams_id_type_sel").change();
	$("#netsamparams_method_sel").change();
	$("#netsamparams_coexpMethod_sel").change();
	return(userCreateViewDialog);
};

NGBrowser.prototype.toggleUserCreationViewErrorDetail=function(mydiv, icon){
	var isDisplayed=$("#"+mydiv).css("display");
	if(isDisplayed=="none"){
		$("#"+icon).html("hide");
		$("#"+mydiv).css("display","block");
	}
	else{
		$("#"+icon).html("show");
		$("#"+mydiv).css("display","none");
	}
};

NGBrowser.prototype.cancelRunningViewCreationJob=function(storageName){
 // get current job ID etc.
 var  jobInfo;
 
 if(typeof(localStorage)!='undefined'){
   jobInfo=$.parseJSON(localStorage.getItem(storageName)); 
 }
 else{
   return;
 }
 
 var job_id=jobInfo["job_id"];
 var orig_cct_path=jobInfo["orig_cct_path"];
 var orig_tsi_path=jobInfo["orig_tsi_path"];
 var arg={
   "job_id":job_id,
   "orig_cct_path":orig_cct_path,
   "orig_tsi_path":orig_tsi_path
 };
 $.ajax({
	 type: "POST",
	 url: "cancel_running_create_view_job.php",
	 data: arg,
	 async: false,
	 success:function(data){
	 }});
 if(typeof(localStorage)!='undefined'){
   localStorage.setItem(storageName, JSON.stringify({"status":"Cancelled"}));
 }
};
