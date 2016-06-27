var Util = {};

Util.is_ie = navigator.appVersion.indexOf('MSIE') >= 0;
Util.is_ie6 = navigator.appVersion.indexOf('MSIE 6') >= 0;

Array.prototype.unique=function() {
	var o = {}, i, l = this.length, r = [];
	for(i=0; i<l;i+=1) o[this[i]] = this[i];
	for(i in o) r.push(o[i]);
	return r;
};


//compare two interger arrays, 
Util.arraysAreEqual=function(a, b){
  if(a && b){
    if(a.length!=b.length) 
       return false;
    a.sort();
    b.sort();
    var i;
    for(i=0; i<a.length; i++){
      if(a[i]==b[i])
        continue;
      else
        return false;
    }
      return true;
  }
  else if ((a===undefined||a=="") && (b===undefined||b=="")){
    return true;
  }
  else{
    return false;
  }
};

// compare two arrays to see if they are same
Util.arraysAreEqualInOrder=function(a,b){
  if(a && b){
    if(a.length==0 && b.length==0)
      return true;
    if(a.length!=b.length)
      return false;
    var i;
    for(i=0; i<a.length; i++){
      if(a[i]==b[i])
        continue;
      else
        return false;
    }
    return true;
  }
  else if ((a===undefined && (b && b.length==0)) || ( (a && a.length==0) && b===undefined))
    return true;
  else if(a===undefined && b===undefined){
    return true;
  }
  else
    return false;
}

// This function works with array contains number and strings.
// if arrays contain only number or string, the performance can be
// improved by sorting the arrays first.
// arguments:   array whoes elements are the arrays that we need to work on
// returns: array whoes elements are the arrays that contains the indices 
// of the common elments in the original arrays
Util.arrayIntersection=function(){
  var val, arrayCount, firstArray, i, j, intersection = [], missing;
  var commonIndices=[];
//  console.log(arguments);
  //var arrays = Array.prototype.slice.call(arguments); // Convert arguments into a real array
  var arrays=[]; // Convert arguments into a real array
  for(i=0; i<arguments[0].length; i++)
     arrays.push(arguments[0][i]);
  // Search for common values
  firstArr = arrays.pop();
  if (firstArr) {
    j = firstArr.length;
    arrayCount = arrays.length;
    while (j--) {
      val = firstArr[j];
      missing = false;

      // Check val is present in each remaining array 
      i = arrayCount;
      while (!missing && i--) {
        if ($.inArray(val, arrays[i])==-1) {
          missing = true;
        }
      }
      if (!missing) {
        intersection.push(val);
      }
    }
  }
  
  arrays=[];
  for(i=0; i<arguments[0].length; i++)
     arrays.push(arguments[0][i]);
  var indiceArray;
  for(i=0; i<arrays.length; i++){
    indiceArray=[];
    for(j=0; j<intersection.length; j++){
      indiceArray.push($.inArray(intersection[j], arrays[i]));
    }
    commonIndices.push(indiceArray);
  }
  return commonIndices;
};

Util.addCommas = function(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

Util.wheel = function(event){
    var delta = 0;
    if (!event) event = window.event;
    if (event.wheelDelta) {
        delta = event.wheelDelta/120;
        if (window.opera) delta = -delta;
    } else if (event.detail) { delta = -event.detail/3;	}
    return Math.round(delta); //Safari Round
}

Util.isRightButton = function(e) {
    if (!e) var e = window.event;
    if (e.which) return e.which == 3;
    else if (e.button) return e.button == 2;
}

Util.getViewportWidth = function() {
  var width = 0;
  if( document.documentElement && document.documentElement.clientWidth ) {
    width = document.documentElement.clientWidth;
  }
  else if( document.body && document.body.clientWidth ) {
    width = document.body.clientWidth;
  }
  else if( window.innerWidth ) {
    width = window.innerWidth - 18;
  }
  return width;
};

Util.getViewportHeight = function() {
  var height = 0;
  if( document.documentElement && document.documentElement.clientHeight ) {
    height = document.documentElement.clientHeight;
  }
  else if( document.body && document.body.clientHeight ) {
    height = document.body.clientHeight;
  }
  else if( window.innerHeight ) {
    height = window.innerHeight - 18;
  }
  return height;
};

Util.findNearest = function(numArray, num) {
    var minIndex = 0;
    var min = Math.abs(num - numArray[0]);
    for (var i = 0; i < numArray.length; i++) {
        if (Math.abs(num - numArray[i]) < min) {
            minIndex = i;
            min = Math.abs(num - numArray[i]);
        }
    }
    return minIndex;
}

if (!Array.prototype.reduce)
{
  Array.prototype.reduce = function(fun /*, initial*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len == 0 && arguments.length == 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2)
    {
      var rv = arguments[1];
    }
    else
    {
      do
      {
        if (i in this)
        {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      }
      while (true);
    }

    for (; i < len; i++)
    {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  };
}

function Finisher(fun) {
    this.fun = fun;
    this.count = 0;
}

Finisher.prototype.inc = function() {
    this.count++;
};

Finisher.prototype.dec = function() {
    this.count--;
    this.finish();
};

Finisher.prototype.finish = function() {
    if (this.count <= 0) this.fun();
};

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
Util.rgbToHsl=function(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
 
    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
 
    return [h, s, l];
};
 
/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
Util.hslToRgb=function(h, s, l){
    var r, g, b;
 
    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l &lt; 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
 
    return [r * 255, g * 255, b * 255];
};
 
/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
Util.rgbToHsv=function(r, g, b){
    r = r/255, g = g/255, b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
 
    var d = max - min;
    s = max == 0 ? 0 : d / max;
 
    if(max == min){
        h = 0; // achromatic
    }else{
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
 
    return [h, s, v];
};
 
/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
Util.hsvToRgb=function(h, s, v){
    var r, g, b;
 
    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
 
    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
 
    return [r * 255, g * 255, b * 255];
};

String.prototype.times = function(n) {
    return Array.prototype.join.call({length:n+1}, this);
};

Util.randomString=function(len){
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = len;
  var randomstring = '';
  for (var i=0; i<string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum,rnum+1);
  }
  return randomstring;
};

function rgbToHex(R,G,B) {return toHex(R)+toHex(G)+toHex(B)}
function toHex(n) {
 n = parseInt(n,10);
 if (isNaN(n)) return "00";
 n = Math.max(0,Math.min(n,255));
 return "0123456789ABCDEF".charAt((n-n%16)/16)
      + "0123456789ABCDEF".charAt(n%16);
}

// compute RGB color 
Util.computeColor=function(v, max, min){
  var dv, r, g, b;
  r=g=b=1.0;

  if(v<min)
    v=min;
  if(v>max)
    v=max;
  dv=max-min;

  if(v<(min + 0.5 * dv)){
    r=2*(v-min)/dv;
    g=2*(v-min)/dv;
  }    
  else{
    g=2*(max-v)/dv;
    b=2*(max-v)/dv;
  }    
  var red, green, blue;
  red=Math.round(r*255);
  green=Math.round(g*255);
  blue=Math.round(b*255);
  return rgbToHex(red,green,blue);
};    



// this function is need to work around 
// a bug in IE related to element attributes
function hasClass(obj) {
  var result = false;
  if (obj.getAttributeNode("class") != null) {
    result = obj.getAttributeNode("class").value;
  }
  return result;
}   

function stripe(id) {
  // the flag we'll use to keep track of 
  // whether the current row is odd or even
  var even = false;
  // if arguments are provided to specify the colours
  // of the even & odd rows, then use the them;
  // otherwise use the following defaults:
  var evenColor = arguments[1] ? arguments[1] : "#fff";
  var oddColor = arguments[2] ? arguments[2] : "#eee";
  // obtain a reference to the desired table
  // if no such table exists, abort
  var table = document.getElementById(id);
  if (! table) { return; }
  // by definition, tables can have more than one tbody
  // element, so we'll have to get the list of child
  // &lt;tbody&gt;s 
  var tbodies = table.getElementsByTagName("tbody");
  // and iterate through them...
  for (var h = 0; h < tbodies.length; h++) {
    // find all the &lt;tr&gt; elements... 
    var trs = tbodies[h].getElementsByTagName("tr");
    // ... and iterate through them
    for (var i = 0; i < trs.length; i++) {
      // avoid rows that have a class attribute
      // or backgroundColor style
      if (!hasClass(trs[i]) && ! trs[i].style.backgroundColor) {
        // get all the cells in this row...
        var tds = trs[i].getElementsByTagName("td");
        // and iterate through them...
        for (var j = 0; j < tds.length; j++) {
          var mytd = tds[j];
          // avoid cells that have a class attribute
          // or backgroundColor style
          if (! hasClass(mytd) && ! mytd.style.backgroundColor) {
            mytd.style.backgroundColor = even ? evenColor : oddColor;
          }
        }
      }
      // flip from odd to even, or vice-versa
      even =  ! even;
    }
  }
}

/*
Util.getRadioValue=function(idOrName) {
  var value = null;
  var element = document.getElementById(idOrName);
  var radioGroupName = null;  

  // if null, then the id must be the radio group name
  if (element == null) {
    radioGroupName = idOrName;
  } else {
    radioGroupName = element.name;
  }
  if (radioGroupName == null) {
    return null;
  }
  var radios = document.getElementsByTagName('input');
  for (var i=0; i<radios.length; i++) {
    var input = radios[i];
    if (input.type == 'radio' && input.name == radioGroupName && input.checked) {
      value = input.value;
      break;
    }
  }
  return value;
};
*/

Util.getCheckedRadioValueByName=function(name) {
	var selected = $("input[type='radio'][name='"+name+"']:checked");
	var selectedValue;
	if (selected.length>0){
		selectedValue=selected.val();
  }
  return selectedValue;
};

Util.getSCTFilterInputValueByIndex=function(index) {
	var inputs=$("input", $("#visibleBalloonElement"));
	return inputs.eq(index).val();
};

Util.SCTFilterRadioButtonChecked=function(index){
  var inputs=$("input", $("#visibleBalloonElement"));
	if(inputs.eq(index).prop("checked"))
	  return true;
	else 
	  return false;
}

// simulate marginBox function from d-o-j-o toolkit
// parameter: jquery object, not DOM object
Util.marginBox=function(myobj){
  var return_obj={};
	return_obj.h=myobj.outerHeight();
	return_obj.w=myobj.outerWidth(); 
	var pos=myobj.position();
	return_obj.l=pos.left;
  return_obj.t=pos.top;
	return return_obj;
};

Util.stopEvent=function(evt){
    // summary:
    //        prevents propagation and clobbers the default action of the
    //        passed event
    // evt: Event
    //        The event object. If omitted, window.event is used on IE.
    //if(has("dom-addeventlistener") || (evt && evt.preventDefault)){
    if(evt && evt.preventDefault){
        evt.preventDefault();
        evt.stopPropagation();
    }else{
        evt = evt || window.event;
        evt.cancelBubble = true;
        on._preventDefault.call(evt);
    }
};

function IFrame(parentElement)
{
   // Create the iframe which will be returned
   var iframe = document.createElement("iframe");

   // If no parent element is specified then use body as the parent element
   if(parentElement == null)
      parentElement = document.body;

   // This is necessary in order to initialize the document inside the iframe
   parentElement.appendChild(iframe);

   // Initiate the iframe's document to null
   iframe.doc = null;

   // Depending on browser platform get the iframe's document, this is only
   // available if the iframe has already been appended to an element which
   // has been added to the document
   if(iframe.contentDocument)
      // Firefox, Opera
      iframe.doc = iframe.contentDocument;
   else if(iframe.contentWindow)
      // Internet Explorer
      iframe.doc = iframe.contentWindow.document;
   else if(iframe.document)
      // Others?
      iframe.doc = iframe.document;
 
   // If we did not succeed in finding the document then throw an exception
   if(iframe.doc == null)
      throw "Document not found, append the parent element to the DOM before creating the IFrame";
 
   // Create the script inside the iframe's document which will call the
   iframe.doc.open();
   iframe.doc.close();
 
   // Return the iframe, now with an extra property iframe.doc containing the
   // iframe's document
   return iframe;
}

function ObjectIsEmpty(o) {
  for(var i in o) 
     if(o.hasOwnProperty(i))
       return false;
 
 return true;
}

String.prototype.trunc =
     function(n,useWordBoundary){
         var toLong = this.length>n,
             s_ = toLong ? this.substr(0,n-1) : this;
         s_ = useWordBoundary && toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
         return  toLong ? s_ +'...' : s_;
};

// truncate a long word in the middle
String.prototype.trunc_mid = function(n){
	var tooLong = this.length>n;
	if(!tooLong){
		return this; 
	}
  var len=this.length;
  var before=this.substr(0, Math.floor((n-3)/2)) ;
	var after=this.slice(-Math.floor((n-3)/2));
	return  before+'...'+after;
};

function preload(images) {
    if (document.images) {
        var i = 0;
        var imageArray = new Array();
        imageArray = images.split(',');
        var imageObj = new Image();
        for(i=0; i<=imageArray.length-1; i++) {
          imageObj.src="images/"+imageArray[i];
        }
    }
}

// path is relative to NG root directory
Util.checkFileExistsOnServer=function(path){
  var data={};
  data['path']=path;
	var exist;
  $.ajax({
  type: "POST",
  url: "check_file_exists.php",
  data: data,
  success: function(d, textStatus){
			if(textStatus=='success'){
			  if(d=="1") 
			    exist=true; 
			  else
			    exist=false;
			}
		 },
  dataType: "json",
	async: false
}); 
  return exist;
};


function basename(path) {
    return path.replace(/\\/g,'/').replace( /.*\//, '' );
}
		 
function dirname(path) {
     return path.replace(/\\/g,'/').replace(/\/[^\/]*$/, '');;
}

function findPos(obj) {
	var curleft = 0;
	var curtop = 0;
	if(obj.offsetLeft) curleft += parseInt(obj.offsetLeft);
	if(obj.offsetTop) curtop += parseInt(obj.offsetTop);
	if(obj.scrollTop && obj.scrollTop > 0) curtop -= parseInt(obj.scrollTop);
	if(obj.offsetParent) {
		var pos = findPos(obj.offsetParent);
		curleft += pos[0];
		curtop += pos[1];
	} else if(obj.ownerDocument) {
		var thewindow = obj.ownerDocument.defaultView;
		if(!thewindow && obj.ownerDocument.parentWindow)
			thewindow = obj.ownerDocument.parentWindow;
		if(thewindow) {
			if(thewindow.frameElement) {
				var pos = findPos(thewindow.frameElement);
				curleft += pos[0];
				curtop += pos[1];
			}
		}
	}

	return [curleft,curtop];
}

function queryTrackDataByLabel(data, label){
 return $.grep(data, function(e,i){
    if(e.label==label)
     return e;
   });
}

function queryTrackDataByNetwork(data, network){
 return $.grep(data, function(e,i){
    if(e.network==network)
     return e;
   });
}

function queryTrackDataByLabelAndNetwork(data, label, network){
 return $.grep(data, function(e,i){
    if(e.network==network && e.label==label)
     return e;
   });
}

// trackNameInputID: input element id
// contextid: can be empty string
// errorDivID: where the error message should go
function checkUserTrackName(trackNameInputID, errorDivID, contextID){
	var trackName;
	if(!contextID){
		trackName=$("input[id='"+Util.jqSelector(trackNameInputID)+"']").val();
	}
	else{
		trackName=$("input[id='"+Util.jqSelector(trackNameInputID)+"']", $("#"+Util.jqSelector(contextID))).val();
	}
		if(!contextID){
			errorDiv=$("#"+errorDivID);
		}
		else{
			errorDiv=$("#"+errorDivID, $("#"+Util.jqSelector(contextID)));
		}
	if(!trackName){
		errorDiv.html("Empty track name!");
		errorDiv.css({"color":"red"});
		return null;
	}
	if(trackName.match(/[^a-zA-Z0-9-_ ]/g)){
		errorDiv.html("Track title can only contain a-z, A-Z, 0-9, space,'-' and '_'.");
		errorDiv.css({"color":"red"});
		return null;
	}
	return trackName;
}


(function() {
   jQuery.fn['bounds'] = function () {
     var bounds = {  left: Number.POSITIVE_INFINITY, 
                      top: Number.POSITIVE_INFINITY,
                    right: Number.NEGATIVE_INFINITY, 
                   bottom: Number.NEGATIVE_INFINITY};

     this.each(function (i,el) {
                 var elQ = $(el);
                 var off = elQ.offset();
                 off.right = off.left + $(elQ).width();
                 off.bottom = off.top + $(elQ).height();

                 if (off.left < bounds.left)
                   bounds.left = off.left;

                 if (off.top < bounds.top)
                   bounds.top = off.top;

                 if (off.right > bounds.right)
                   bounds.right = off.right;

                 if (off.bottom > bounds.bottom)
                   bounds.bottom = off.bottom;

               });
     return bounds;
   }
 })();


Util.searchArrayByKey = function(arr, searchFor, property) {
    var retVal = -1;
    for(var index=0; index < arr.length; index++){
        var item = arr[index];
        if (item.hasOwnProperty(property)) {
            if (item[property].toLowerCase() === searchFor.toLowerCase()) {
                retVal = index;
                return retVal;
            }
        }
    }
    return retVal;
};


// Simulates PHP's date function
Date.prototype.format = function(format) {
	var returnStr = '';
	var replace = Date.replaceChars;
	for (var i = 0; i<format.length; i++) {       
    var curChar = format.charAt(i);         
		if (i - 1 >= 0 && format.charAt(i - 1) == "\\") {
			returnStr += curChar;
		}
		else if (replace[curChar]) {
			returnStr += replace[curChar].call(this);
		} else if (curChar != "\\"){
			returnStr += curChar;
		}
	}
	return returnStr;
};

Date.replaceChars = {
	shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	longMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	longDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
	// Day
	d: function() { return (this.getDate() < 10 ? '0' : '') + this.getDate(); },
	D: function() { return Date.replaceChars.shortDays[this.getDay()]; },
	j: function() { return this.getDate(); },
	l: function() { return Date.replaceChars.longDays[this.getDay()]; },
	N: function() { return this.getDay() + 1; },
	S: function() { return (this.getDate() % 10 == 1 && this.getDate() != 11 ? 'st' : (this.getDate() % 10 == 2 && this.getDate() != 12 ? 'nd' : (this.getDate() % 10 == 3 && this.getDate() != 13 ? 'rd' : 'th'))); },
	w: function() { return this.getDay(); },
	z: function() { var d = new Date(this.getFullYear(),0,1); return Math.ceil((this - d) / 86400000); }, // Fixed now
	// Week
	W: function() { var d = new Date(this.getFullYear(), 0, 1); return Math.ceil((((this - d) / 86400000) + d.getDay() + 1) / 7); }, // Fixed now
	// Month
	F: function() { return Date.replaceChars.longMonths[this.getMonth()]; },
	m: function() { return (this.getMonth() < 9 ? '0' : '') + (this.getMonth() + 1); },
	M: function() { return Date.replaceChars.shortMonths[this.getMonth()]; },
	n: function() { return this.getMonth() + 1; },
	t: function() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 0).getDate() }, // Fixed now, gets #days of date
	// Year
	L: function() { var year = this.getFullYear(); return (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0)); },   // Fixed now
	o: function() { var d  = new Date(this.valueOf());  d.setDate(d.getDate() - ((this.getDay() + 6) % 7) + 3); return d.getFullYear();}, //Fixed now
	Y: function() { return this.getFullYear(); },
	y: function() { return ('' + this.getFullYear()).substr(2); },
	// Time
	a: function() { return this.getHours() < 12 ? 'am' : 'pm'; },
	A: function() { return this.getHours() < 12 ? 'AM' : 'PM'; },
	B: function() { return Math.floor((((this.getUTCHours() + 1) % 24) + this.getUTCMinutes() / 60 + this.getUTCSeconds() / 3600) * 1000 / 24); }, // Fixed now
	g: function() { return this.getHours() % 12 || 12; },
	G: function() { return this.getHours(); },
	h: function() { return ((this.getHours() % 12 || 12) < 10 ? '0' : '') + (this.getHours() % 12 || 12); },
	H: function() { return (this.getHours() < 10 ? '0' : '') + this.getHours(); },
	i: function() { return (this.getMinutes() < 10 ? '0' : '') + this.getMinutes(); },
	s: function() { return (this.getSeconds() < 10 ? '0' : '') + this.getSeconds(); },
	u: function() { var m = this.getMilliseconds(); return (m < 10 ? '00' : (m < 100 ? '0' : '')) + m; },
	// Timezone
	e: function() { return "Not Yet Supported"; },
	I: function() {
		var DST = null;
		for (var i = 0; i < 12; ++i) {
			var d = new Date(this.getFullYear(), i, 1);
			var offset = d.getTimezoneOffset();

			if (DST === null) DST = offset;
			else if (offset < DST) { DST = offset; break; }                     
			else if (offset > DST) break;
		}
		return (this.getTimezoneOffset() == DST) | 0;
	},
	O: function() { return (-this.getTimezoneOffset() < 0 ? '-' : '+') + (Math.abs(this.getTimezoneOffset() / 60) < 10 ? '0' : '') + (Math.abs(this.getTimezoneOffset() / 60)) + '00'; },
	P: function() { return (-this.getTimezoneOffset() < 0 ? '-' : '+') + (Math.abs(this.getTimezoneOffset() / 60) < 10 ? '0' : '') + (Math.abs(this.getTimezoneOffset() / 60)) + ':00'; }, // Fixed now
	T: function() { var m = this.getMonth(); this.setMonth(0); var result = this.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/, '$1'); this.setMonth(m); return result;},
	Z: function() { return -this.getTimezoneOffset() * 60; },
	// Full Date/Time
	c: function() { return this.format("Y-m-d\\TH:i:sP"); }, // Fixed now
	r: function() { return this.toString(); },
	U: function() { return this.getTime() / 1000; }
};

// escape special character for jquery selector
Util.jqSelector=function(str){
	return str.replace(/([;&,\/\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '\\$1');
};
