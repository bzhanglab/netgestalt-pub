/**
 * QueryBox 1.0
 */
$.declare("QueryBox", null, {
	//what should we display by default
	defaultMessage				:'  Search tracks...',
	//displayed when no resuts are found				
	noResultsMessage			:'no results where found for ',
	//url to your results script
	queryURL					:'search?q=',
	//css class to use in this QueryBox	
	cssClass					:'QueryBoxDark',
	// when focusing on the input field and hit enter where should we go. 
	// an empty string means go back to the same page we where at.					
	searchURL					:'',
	//(milis) time to wait to query backend script										
	keyDownTimeout				:200, 
	// (milis) how long until we give up waiting for results to come back.						
	requestTimeout				:5000, 
	//should we submit the query when user hasn't selected anything yet.							
	submitOnInputBlur			:true,
	//split results based on categories
	splitResultsOnCategories	:true,
	//private members you shouldn't need to change any of these.
	queryInputClass				:'QueryInput',
	resultContainerClass		:'ResultBox',
	listItemClass				:'ListItem',
	listItemSelectedClass		:'Selected',
	noResultsClass				:'NoResults',
	inputFieldID				:'lsquery_search_input',
	resultContainerID			:'lsquery_result',
	selectedContainerID 		:'lsquery_selected',
	formID						:'lsquery_form',
	lastQuery					:"",
	list						:[],
	selectedCursor				:-1,
	selectedItem				:null,	
	timer						:null,
	activeRequest				:null,
	currentQuery				:null,
	queryBoxContainerID			:null,
	spinnerImageURL				:'ajax-loader.gif',
	searchIconImageURL			:null,
	removeSpecialChar:function(str){
    var new_str;
    new_str=str.replace(/[\/\(\)]/g,'');
    return new_str;
	},
	// --------------------- PUBLIC METHODS ---------------------
	/**
	 * overrite this method in the instance if you want to customize the results box markup
	 * @param item the curren item data to render
	 * @param lastQuery the lastQuery submited to the server.
	 * */
	getItemMarkup:function(item,lastQuery){
		var title 	= this.highlightString(item.title,lastQuery);
    var myid = this.removeSpecialChar(item.label);
		var descr 	= item.description!='' ? '<p>'+this.highlightString(item.description,lastQuery)+'</p>' : '';
		var line 	= '<div class="'+this.listItemClass+'" id="searchbox_'+myid+'">'+'<h2>'+title+'&nbsp;&nbsp;'+'<div class="results_icon"><img src="images/plus.png" width="14px" id='+myid+'></img></div><div class="results_icon"><img src="images/info.png" width="14px" id="info_'+myid+'"></img></div></h2>'+descr+'</div>';
		return line;
	},
	/**
	 * overrite this method in the instance if you want to customize the results box markup
	 * @param data is an array of item objects returned from the server
	 */	
	getDropDownMarkup:function(data){
		var str = '';
		str+= '<div class="'+this.resultContainerClass+'" style="z-index:10">';
		str+= '<div class="Inside" style="z-index:10">';
		var categories={};
		var len = data.length;
		//split results by categories, depending on the type property
		if(this.splitResultsOnCategories){
			for (var n=0;n<len;n++){
				var item 	= data[n];
				var line	= this.getItemMarkup(item,this.lastQuery);
				if(categories[item.category]){
					categories[item.category]+=line;
				}else{
					categories[item.category]=line;
				}
				//str+=line;
			}
			//now build them nicely.
			for (var category in categories){
				str+='<div class="header" style="z-index:10"><h1>'+category+'</h1>'+categories[category]+'</div>';
			}
		}else{
			for (var n=0;n<len;n++){
				var item 	= data[n];
				var line	= this.getItemMarkup(item,this.lastQuery);
				str+=line;
			}
		}
		str+='</div>'; //Inside
		str+='</div>'; //ResultBox
		return str;
	},
	/**
	 * overrite this method in the instance if you want to customize the no results marukup
	 * @param lastQuery is the last query submited.
	 */
	getNoResultsMarkup:function(lastQuery){
		var str='';
		str+= '<div class="'+this.resultContainerClass+'" style="z-index:10">';
		str+= '<div class="Inside" style="z-index:10">';
		str+= '<div class="'+this.noResultsClass+'"><p>'+this.noResultsMessage+'<b>"'+lastQuery+'"</b></p></div>';
		str+= '<div>'; //Inside
		str+= '</div>'; //ResultBox
		return str;
	},
	
	// --------------------- PRIVATE METHODS ---------------------
	init:function(url,divID, networkName, brwsr, displayQuery){
		if(url){
			this.queryURL = url;
		}else{
			str = 	"ERROR instantiating QueryBox.\n"+
					"When instantiating QueryBox you must provide a URL to the script that will return the search results to QueryBox.\n"+
					"The URL should be the path to the script we'll use to query for results.\n" +
				  	"ex: var qbox = new LiveSearchQueryBox('http://domain.com/search.php?q=','my_div_id');\n";
			console.error(str);
		}
		if(divID){
			this.queryBoxContainerID = divID;
		}else{
			str = 	"ERROR instantiating QueryBox.\n"+
					"When instantiating QueryBox you must provide the ID where QueryBox will be rendered.\n"+
				  	"ex: var qbox = new LiveSearchQueryBox('http://domain.com/search.php?q=','my_div_id');\n";
			console.error(str);
		}
		if(displayQuery){
			this.currentQuery = displayQuery;
		}
		//make all these guys unique based on its own uniqueID
		var id=this.queryBoxContainerID+"_";
		this.inputFieldID=id+this.inputFieldID;
		this.resultContainerID=id+this.resultContainerID;
		this.selectedContainerID=id+this.selectedContainerID;
		this.formID=id+this.formID;
    this.networkName=networkName;
    this.brwsr=brwsr;
		var scope=this;
		$(document).ready(function(){scope.initialize()});
	},

	initialize:function(){
		if(this.render()){
			var input=$("#"+this.inputFieldID);
			var scope = this;
			if(input){
				$(input).attr("autocomplete","off");
				$(input).keydown($.proxy(this.onKeyPress, this));
				$(input).focus($.proxy(this.onTextInputFocus, this));
				$(input).blur($.proxy(this.onTextInputBlur,this));
				$(input).val(this.currentQuery?this.currentQuery:this.defaultMessage);
				//override submit event, use our own.
				$("#"+this.formID).submit($.proxy(function(e){ scope.onFormSubmit(); return false;}, this));				
			}else{
				console.error('search div not found');
			}
		}else{
			console.error('oh no, a fatal error happened while trying to render this box!');
		}
	},

	render:function(){
		var e=$("#"+this.queryBoxContainerID);
		if(e){
			e.html(this.getMarkup());
			return true;
		}else{
			console.error(this.queryBoxContainerID+' div not found! you need this div to render a QueryBox.');
			return false;
		}
	},

	getMarkup:function(){
		var value=this.currentQuery?value='value="'+this.currentQuery+'" ': '';
		var markup = 
			'<div class="'+this.cssClass+'">'+
				'<div class="'+this.queryInputClass+'">'+
				   ' <form method="get" action="'+this.searchURL+'" id="'+this.formID+'" onsubmit="return false;">'+
				    	'<div class="Input"><input type="text" name="q" id="'+this.inputFieldID+'" class="TextInput" '+value+'/></div>'+
				    	'<div class="Input Last"><input type="submit" value="Search" class="Button"/></div>'+
				    '</form>'+
			    '</div>'+
				'<div id="'+this.resultContainerID+'" style="display:none;"></div>'+
			'</div>';
		return markup;
	},

	setQueryValue:function(query){
		var input=$("#"+this.inputFieldID);
		if(input){
		  $(input).val(query);
		}else{
			console.error('querybox has not been initialized yet');
		}
	},

	onFormSubmit:function(){
		var selected=$("#"+this.selectedContainerID);
		if(selected){
			//if you changed the item markup, you will need to change the way you get to the href here too.
			var url = $("#"+this.selectedContainerID+":first-child").attr("href");
			window.location = url;
			return false;
		}else{
			//alert(this.searchURL);
			if(this.submitOnInputBlur){
			  $("#"+this.formID).submit();
			}else{
				return false;
			}
		}
	},

	onKeyPress:function(event){
		switch(event.keyCode){
			//key down
			case 40 : this.selectPrevious(event); break;
			//key up
			case 38 : this.selectNext(event); break;
			//escape
			case 27 : this.hide(); break;
			default : this.start(); break;
		}
	},

	selectNext:function(event){
		if (!this.selectedItem) {
			this.selectedCursor = this.list.length-1;
		} else {
			this.selectedCursor--;
		}
		this.selectIndex(this.selectedCursor);
		if (!$.browser.msie) { event.preventDefault(); }
	},
	
	selectPrevious:function(event){
		if (!this.selectedItem) {
			this.selectedCursor = 0;
		} else {
			this.selectedCursor++;
		}
		this.selectIndex(this.selectedCursor);
		if (!$.browser.msie) { event.preventDefault(); }
	},
	
	selectIndex:function(index){
		if (this.selectedItem) { 
			this.selectedItem.removeAttribute("id");
			this.selectedItem.className = this.listItemClass;
		}
		this.selectedItem = this.list[index];
		if (this.selectedItem) { 
			this.selectedItem.setAttribute("id",this.selectedContainerID); 
			this.selectedItem.className = this.listItemClass+' '+this.listItemSelectedClass;
		}
	},
	
	sendRequest:function(){
		var scope=this;
		var query=$("#"+this.inputFieldID).val();
		this.lastQuery = query;
		if(this.activeRequest){
			this.activeRequest.abort();
		}
		//nothing entered. hide the form
		if (query==""){
			this.hide();
			$("#searchtrackbox").height(75); // 100-titlebar height, did not find a way to get the title bar height
//		$("#searchtrackbox").dialog("option","height",100);
//			console.log($(".ui-dialog-titlebar").css("height"));
      this.displayLoader(null);
			return false;
		}
		this.displayLoader(true);
		//send a new request
		//queryURL should be the path to the script we'll use to query for results.
		//ex: "http://domain.com/search.php?q="
     this.activeRequest=$.ajax({
			 type: "GET",
       url: this.queryURL+query,
	     timeout: this.requestTimeout, // milliseconds
	     success: function(o) { 
			   var response=$.parseJSON(o);
		     scope.onRequestData(response.results);
	    	},
			  error: function(xhr, status, error) {
			  	//console.error("HTTP status code: ", status); 
			 }
     }
		);
	},
	/**
	 * TODO:
	 * probably want to switch visibility to on/off. loading is not good.
	 */
	displayLoader:function(value){
		var path='images/querybox/';
		var imageURL=value?'ajax-loader-transparent.gif':'search-icon-light.gif';
		$("#"+this.inputFieldID).css({"background-image":"url("+path+imageURL+")","background-repeat":"no-repeat","background-position":"right 10px center"});
	},

	highlightString:function(str,query){
		/*
			Grrr I hate regex!
			this should be way more efficient with something like this:
			var regex = new RegExp("(.+?)"+query+"(.+?)","g");  
			str.replace(regex,'$1<b>$2</b>$3'); 
			return str;
			but I just can't get it going properlly. any ideas?
	     */
	    var n = str.toLowerCase().indexOf(query.toLowerCase());
		if(n>=0){
			before = str.substr(0,n);
			word   = str.substr(n,query.length);
			after  = str.substr(n+query.length);
			str    = before+'<b>'+word+'</b>'+after;
			//console.log(str);
		}
		return str;
	     
	},
	onRequestData:function(data){
		this.displayLoader(false);
    this.items=data;
		var len=data.length;
		var markup=len==0?this.getNoResultsMarkup(this.lastQuery):this.getDropDownMarkup(data);
		var container=$("#"+this.resultContainerID);
		var item, label_item, info_label_item;
    if(container){
      container.html(markup);
      //make the container visible
			$(container).css("display","block");
      //container.style.zIndex="100";
      //create a list of all item divs so we can loop over them on keypress
      var queryClass = '#'+this.resultContainerID+" ."+this.listItemClass;
      this.list = $(queryClass);
      this.selectedCursor = 0;
      for(var i=0; i<len; i++){
        item=data[i];
				var mylabel=this.removeSpecialChar(item.label);
        label_item=$("#"+Util.jqSelector(mylabel));
				info_label_item=$("#info_"+Util.jqSelector(mylabel));
			  $(label_item).on("click",$.proxy(this.addTrack, this));	
        $(label_item).on("mouseover",$.proxy(this.displayAddInfo,this));
				$(label_item).on("mouseout",$.proxy(this.hideInfo,this));
				$(info_label_item).on("mouseover",$.proxy(this.displayInfo,this));
        $(info_label_item).on("mouseout",$.proxy(this.hideInfo,this));
      }
			// adjust the height for the search dialog
			 var cur_height=parseInt($(".ResultBox").css("height"));
			 var new_height=(cur_height+50)>500?500:(cur_height+50);
			 $("#searchtrackbox").height(new_height);
    }else{
			console.error('container:'+this.resultContainerID+'was not found.')
		}
	},

  displayAddInfo:function(event){
    balloon17394.showTooltip(event, "Click to add track");
  },

  displayInfo:function(event){
			var querybox=this;
      var mytitle;
      var targetid=event.target.id;
      if(targetid.match(/^info_/)){  //info_XXXXX
        mytitle=targetid.slice(5);
      }
      else if(targetid.match(/^icon_info/)){  //icon_info_trackShown_XXXXX
        mytitle=targetid.slice(21);
      }
			var index=-1;
			$(this.items).each(function(i, v){
        if(querybox.removeSpecialChar(v.label)==mytitle){
          index=i;
					return;
				}
			});
      var type=this.items[index]["type"];
      var url=this.items[index]["url"];
      var label=this.items[index]["label"];
      var title=this.items[index]["title"];
      var myTrackInfoDiv;
      myTrackInfoDiv=document.getElementById("currentTrackInfoTooltipDiv");
      if(!myTrackInfoDiv){
        myTrackInfoDiv=$("<div>").attr("id","currentTrackInfoTooltipDiv");
        $(myTrackInfoDiv).css("display","none");
				$(myTrackInfoDiv).appendTo($(this.brwsr.view.elem));
      }
      this.brwsr.loadTrackInfo(label, title,"currentTrackInfoTooltipDiv", false);
      box17395.showTooltip(event, "load:currentTrackInfoTooltipDiv");
      //box17395.showTooltip(event, "load:currentTrackInfoTooltipDiv",1);
  },
  hideInfo:function(event){
//      box17395.nukeTooltip();
  },
  /**
    * When the search result item is clicked, add it to the left pane's track div and
    * the main view pane (central) if it is 
    * not added already
    */
  addTrack:function(event){
      // create the track in the browse's drag window (view) 
		 var children=$("#zoomContainer").children();
     // if the track already exists, just return
     for(var i=0; i<children.length; i++){
       if(children[i].id == 'track_'+event.target.id){ 
			  $("<div>").html("<p style='color:red'><span class='ui-icon ui-icon-alert' style='float: left; margin: 0 7px 20px 0;'></span>Track with same name already exists.</p>").dialog({
					 "resizable": false,
					   "width": "auto", 
						 "minHeight":"auto",
						 "title": "Error"
				}); 
			   return;
			}
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
		 // should always find it
		 var found_track;
		 var label=event.target.id;
		 for(var k=0; k<this.brwsr.trackData.length; k++){
		    if(this.removeSpecialChar(this.brwsr.trackData[k].label)==label){
		      found=true;
		      found_track=this.brwsr.trackData[k];
					// if we are adding a user module level track in a user network, save it to localStorage
					if(found_track["category"] && found_track["category"].match(/ann_(.*)_module/g) && this.brwsr.currentNetworkType()=="user"){
					  if(typeof(localStorage)!=undefined){
						  var trackObjString=localStorage.getItem(label);
							if(trackObjString){
								var tmpObj=$.parseJSON(trackObjString);
							  tmpObj["url"][this.brwsr.currentNetwork]=found_track["url"];
								localStorage.setItem(label, JSON.stringify(tmpObj));
							}
							else{
								var tmpObj={};
								$.extend(tmpObj, found_track);
								var urlObj={};
								urlObj[this.brwsr.currentNetwork]=found_track["url"];
								tmpObj.url=urlObj;
								delete tmpObj.network;
								localStorage.setItem(label, JSON.stringify(tmpObj));
							}
            }
					}
		      break;
		    }
		 }
			if(found_track["url"]==""){
			 // if track category name ends with _module, it is a "user" track of "user" network
			 // otherwise, it is a "system" track of "user" network
			 var track_t;
			 if(found_track["category"].match(/ann_(.*)_module/g))
         track_t="user";
			 else
			   track_t="system";
       var newTrackObj=this.brwsr.createTrackFromIntUrl(found_track, track_t, "user");
				found_track=newTrackObj;
			  this.brwsr.trackData[k]["url"]=newTrackObj.url;	
			}
			this.createTrack([found_track]);
   // if it is a composite track, added to the "Linked Tracks" section the left pane" 
    if(found_track.datatype=='cbt'||found_track.datatype=='cct'){
      this.brwsr.addTrackToLinkedTracksForm(found_track.label, found_track.key);
		 }
     else if(found_track.datatype=='sbt'){
       this.brwsr.addTrackToVennTracksForm(found_track.label, found_track.key);
       this.brwsr.addTrackToCoVisForm(found_track.label, found_track.key);
		 }
     else if(found_track.datatype=='sct'){
       this.brwsr.addTrackToCoVisForm(found_track.label, found_track.key);
		 }
		 if($("#menu_track_clear").hasClass("menu_disabled")){
			 $("#locategenebox").prop('disabled', false);
			 $("#locategenebox").val("");
			 this.brwsr.hideLeftPaneHint();
			 $("#menu_track_clear").removeClass("menu_disabled");
			 var brwsr=this.brwsr;
			 $("#menu_track_clear").click(
				 function() {
					 box17395.nukeTooltip();
					 brwsr.clearAllTracksDialog("open");
				 });
		 $(this.brwsr.hideTrackTitleIcon).css('display','block');
		 }
 },

// trackArray: an array of tracks to be added
createTrack:function(trackArray){
  $.each(trackArray, $.proxy(function(idx, track){
  var klass = eval(track.type);
  // this function is only called when a track is first loaded after it is created. data is retrieved from server, for
  // composite tracks, they are loaded as soon as created. no data is retrieved during loading. 
  var changeCallback = function() {
      //SZ: This will cause repeated track generation when loading the site for the first time in Firefox
      //this.brwsr.view.showVisibleBlocks(true);
  };
  var newTrack = new klass(track, track.datatype, track.url, this.brwsr.refProtein, this.brwsr,
    {   
      changeCallback: changeCallback,
      trackPadding: this.brwsr.view.trackPadding,
      baseUrl: this.brwsr.dataRoot,
      charWidth: this.brwsr.view.charWidth,
      seqHeight: this.brwsr.view.seqHeight
  }, track.trackColor); 
  node = this.brwsr.view.addTrack(newTrack);
 
  var zoomcnter=document.getElementById("zoomContainer");
  var children=$("#zoomContainer").children();
  var i;
  for(i=0; i<children.length; i++){
    // find the first non-UI track
    if(children[i].track){
       break;
    }
  }
  if(i!=children.length){
    children[i].parentNode.insertBefore(node, children[i]);
  }
  else 
    zoomcnter.appendChild(node);

  this.brwsr.onVisibleTracksChanged();

  if(!this.brwsr.trackTitleShow){
     var myid=node.id;
     var mynewid=myid.replace(/track_/i, "label_");
		 $("#"+Util.jqSelector(mynewid)).css("visibility","hidden");
  }
  return node;
	}, this));
},

	hide:function() {
		this.selectIndex(-1);
    $("#"+this.resultContainerID).css("display","none");	
	},
	
	onTextInputBlur:function(){
		var input=$("#"+this.inputFieldID);
		if($(input).val()==''){
		  $(input).val(this.defaultMessage);
	  };
		var scope = this;
		//window.setTimeout(function(){scope.hide();},400);
	},
	
	onTextInputFocus:function(){
		var input=$("#"+this.inputFieldID);
		if($(input).val()==this.defaultMessage ){
			$(input).val('');
		}else{
			$(input).select();
		}
	},
	
	start:function() {
		var scope = this;
		if (scope.timer) {
			window.clearTimeout(scope.timer);
		}
		scope.timer = window.setTimeout(function(){scope.sendRequest();},scope.keyDownTimeout);
	}
});
