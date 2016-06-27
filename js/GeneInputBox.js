/**
 * GeneInputBox
 */
$.declare("GeneInputBox", null, {
	//what should we display by default
	//defaultMessage				:'Enter one gene per line',
	defaultMessage				:'',
  defaultTextAreaValue  :'Enter or paste paste genes',
  textAreaWidth:       0,
	//css class to use in this QueryBox	
	cssClass					:'QueryBoxDark',
	//(milis) time to wait to query backend script										
	keyDownTimeout				:200, 
	// (milis) how long until we give up waiting for results to come back.						
	requestTimeout				:5000, 
	//should we submit the query when user hasn't selected anything yet.							
	submitOnInputBlur			:true,
	//private members you shouldn't need to change any of these.
  textAreaClass: 'TextAreaInput',
	textAreaID			:'gene_open',
  iconClass           :'gene_open_icon',
  genecount      : null,
	timer						:null,
	activeRequest				:null,
	currentQuery				:null,
	geneBoxContainerID			:null,
	searchIconImageURL			:null,
  blurCalled : false,
  validGenes:   [],
  
	// --------------------- PRIVATE METHODS ---------------------
	init:function(divID, networkName, ruler,  brwsr){
		if(divID){
			this.geneBoxContainerID = divID;
		}else{
			str ="ERROR instantiating QueryBox.\n"+
					"When instantiating QueryBox you must provide the ID where QueryBox will be rendered.\n"+
				  "ex: var qbox = new LiveSearchQueryBox('http://domain.com/search.php?q=','my_div_id');\n";
			console.error(str);
		}
		//make all these guys unique based on its own uniqueID
		var id = this.geneBoxContainerID+"_";
//		this.textAreaID 		= id+this.textAreaID;
    this.networkName = networkName;
    this.brwsr=brwsr;
    this.ruler=ruler;
		var scope = this;
		$(document).ready(function(){scope.initialize()});
	},

	initialize:function(){
	  var gibox=this;
		if(this.render()){
      var inputtextarea=$("#gene_open");
      var footnote=this.footnote;
      var defaultTextAreaValue=this.defaultTextAreaValue;
      this.textAreaWidth=parseInt($(inputtextarea).css('width'));
      var textAreaWidth=this.textAreaWidth;
      if(inputtextarea){
			 //$(inputtextarea).keydown($.proxy(this.onTextAreaKeyPress,this));
		   $(inputtextarea).keyup($.proxy(this.onTextAreaKeyUp,this));
			 $(inputtextarea).focus($.proxy(this.onTextAreaKeyFocus,this));
			 $(inputtextarea).blur($.proxy(this.onTextAreaKeyBlur,this));
			 $(inputtextarea).bind("paste", null, function(e){
			   gibox.onTextAreaKeyFocus();
				 gibox.verifyGenes();
				});
      }
      else{
       console.error('text area div not found');
      }
		}else{
			console.error('oh no, a fatal error happened while trying to render this box!');
		}
	},

	render:function(){
		var e=$("#"+this.geneBoxContainerID);
		if(e){
      $(e).append($("<span>").html("Enter or paste gene symbols:"));
      var gene_open=$("<textarea>").attr({"tabIndex":-1, "id":"gene_open","spellcheck":false}).addClass(this.textAreaClass);
			$(gene_open).appendTo($(e));
      $(e).append($("<span>").html("Valid gene symbols:"));
      var gene_valid=$("<textarea>").attr({"tabIndex":-1, "id":"gene_valid","spellcheck":false,"disabled":"disabled"}).addClass(this.textAreaClass);
			$(gene_valid).appendTo($(e));
      $(e).append($("<span>").html("Invalid gene symbols:"));
      var gene_invalid=$("<textarea>").attr({"tabIndex":-1, "id":"gene_invalid","spellcheck":false,"disabled":"disabled"}).addClass(this.textAreaClass);
			$(gene_invalid).appendTo($(e));
      var footnote=$("<div>").attr("id","geneinput_footnote");
      this.footnote=footnote;
      $(footnote).appendTo($(e));
			var mytop=parseInt($("#gene_invalid").css("top"))+$("#gene_invalid").outerHeight();
      var note=$("<spans>").attr("id","note_message");
			$(note).html("&nbsp;".times(9)+this.defaultMessage);
			$(note).appendTo($(footnote));
      var clear=$("<div>").attr("id","cleartextarea").html("<b>Clear</b>").addClass("enter_gene_button");
			$(clear).on("click",$.proxy(function(){ 
			  $("#gene_open").val("");
			  $("#gene_valid").val("").css({"background-color":"#FFF"});
			  $("#gene_invalid").val("").css({"background-color":"#FFF"});
				this.genecount.html("<b>0</b>");
       },this)
      );
      this.clear=clear;
			$(clear).appendTo($(footnote));
      var submit=$("<div>").attr("id","create_new_track_button").html("<b>Go</b>").addClass("enter_gene_button");
			$(submit).on("mouseover",function(event){
           balloon17394.showTooltip(event, 'Click to create track');}
      );
			$(submit).on("mouseout",function(){ });
			$(submit).on("click",$.proxy(function(){ 
        this.createNewTrack();
       },this)
      );
      this.submit=submit;
			$(submit).appendTo($(footnote));
      var genecount=$("<div>").attr("id","gene_count").html("<b>0</b>").addClass("enter_gene_button");
      $(genecount).on("mouseover",function(event){
         balloon17394.showTooltip(event, 'The number of valid genes');
       }
       );
      this.genecount=genecount;
			$(genecount).appendTo($(footnote));
			return true;
		}else{
			console.error(this.geneBoxContainerID+' div not found! you need this div to render a QueryBox.');
			return false;
		}
	},

  createNewTrack:function(event){
    var notemessage=$("#note_message");
  // if the validGenes is empty, show some error message
    if(this.validGenes.length==0){
      $(notemessage).html("&nbsp;".times(9)+"<font color='red'>No valid genes</font>");
    }
    else{
      $(notemessage).html("&nbsp;".times(9)+this.defaultMessage);
      var gene_string='';
      for(var j=0; j<this.ruler.length; j++){
        if($.inArray(this.ruler[j],this.validGenes)>=0){
          gene_string=gene_string+this.ruler[j]+'|';
        }
      }
      this.brwsr.gene_string=gene_string;
			this.brwsr.currentUserTrackType="sbt";
      //this.brwsr.userEnterTrackNameDialog('geneinput_footnote', true);
      this.brwsr.userEnterTrackNameDialog('geneinput_footnote');
    }
  },
  
  onTextAreaKeyBlur:function(event){
    var footnote=this.footnote;
    var defaultTextAreaValue=this.defaultTextAreaValue;
    var textAreaWidth=this.textAreaWidth;
    window.setTimeout(
      function(){
           var gene_open=$("#gene_open");
					 //$(gene_open).css("height","12px");
					 //$(footnote).css("top",footnoteTop+"px");
           if(!$(gene_open).val().match(/\w/g)){ // empty or only white spaces
					    /*
							$(gene_open).css("padding-left", textAreaPaddingLeft+"px");
							$(gene_open).css("width", textAreaWidth+"px");
							$(gene_validation_div).css("height","0");
							*/
           }
           else if($(gene_open).val()){
             /*
						 var a=$(gene_open).val().replace(/\r\n|\r|\n/g, '; ');
             $(gene_open).val(a);
						 */
           }   
      },100);
  },

	onTextAreaKeyPress:function(event){
		switch(event.keyCode){
			//down arrow key
			case 40 : break;
			//up arrow key
			case 38 : break;
			//escape key
			case 27 : this.onTextAreaKeyBlur(); break;
			//anything else
			default :
        break;
		}
	},

  onTextAreaKeyUp:function(event){
//    var n=this.fitToContent(this.textAreaClass, this.maxTextAreaHeight, this.minTextAreaHeight);
    this.verifyGenes();
  },

  start:function(){  
    var scope = this;
    if (scope.timer) {
      window.clearTimeout(scope.timer);
    }   
    scope.timer = window.setTimeout(function(){scope.verifyGenes();},scope.keyDownTimeout);
  },

	verifyGenes:function(){
		var k;
		var new_text="";
		var mytextarea=$("#"+this.textAreaID);
    var orig_text=mytextarea.val();
		if(orig_text==""){
			$(this.genecount).html("<b>0</b>");
			$("#gene_valid").val("").css({"background-color":"#FFF"});
			$("#gene_invalid").val("").css({"background-color":"#FFF"});
			return;
		}
    // remove empty lines
    var new_text=orig_text.replace(/^\s*[\r\n]/gm,"");
   // remove trailing whitespace (not newline)
    var new_text=orig_text.replace(/[^\S\r\n]+$/gm, "")
   // remove leading whitespace
    new_text=new_text.replace(/^\s+/gm,"");
    // replace whitespaces with newline
    new_text=new_text.replace(/\s+/gm, '\n');
		var items=new_text.split(/\r\n|\r|\n/);
		var validGenes=[];
    var origValidGenes=[];
    var invalidGenes=[];
    var origInvalidGenes=[];
		for(var i=0; i<items.length; i++){
			// if the class is set to valid or invlid, skip
			item=items[i];
			itemUpper=items[i].toUpperCase();
			if ($.inArray(item, this.ruler)!=-1 || $.inArray(itemUpper,this.ruler)!=-1){
				if($.inArray(itemUpper, validGenes)==-1){
					validGenes.push(itemUpper);
					origValidGenes.push(item);
					var notemessage=$("#note_message");
					if($(notemessage).html().indexOf("No valid")!=-1){
						$(notemessage).html("&nbsp;".times(9)+this.defaultMessage);
					}
				}
			}
			else{
				if($.inArray(itemUpper, invalidGenes)==-1){
					invalidGenes.push(itemUpper); 
					origInvalidGenes.push(item);
				}
			}
		}
		this.validGenes=validGenes;
    var validGeneString="";
    var invalidGeneString="";
		for(i=0;i<origValidGenes.length;i++){
			if(i!=origValidGenes.length-1)
				validGeneString+=(origValidGenes[i]+' ');
			else
				validGeneString+=(origValidGenes[i]);
		}
		for(i=0;i<origInvalidGenes.length;i++){
			if(i!=origInvalidGenes.length-1)
				invalidGeneString+=(origInvalidGenes[i]+' ');
			else
				invalidGeneString+=(origInvalidGenes[i]);
		}
		if(validGeneString!=""){
			$("#gene_valid").val(validGeneString).css({"background-color":"#C0FFC0"});
		}  
    else{
			$("#gene_valid").val("").css({"background-color":"#FFF"});
    }
		if(invalidGeneString!=""){
			$("#gene_invalid").val(invalidGeneString).css({"background-color":"#FFC0C0"});
		}
    else{
			$("#gene_invalid").val("").css({"background-color":"#FFF"});
    }
		$(this.genecount).html("<b>"+validGenes.length+"</b>");
	},


	onTextAreaKeyFocus:function(event){
    var gene_open=$("#gene_open");
		$(gene_open).attr("spellcheck",false);
    if($(gene_open).val()==""){
      return false;
    }
    else if($(gene_open).val!=""){
     this.verifyGenes();
    }
	}
});
