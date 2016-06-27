//This track is for (e.g.) position and sequence information that should
//always stay visible at the top of the view

function StaticTrack(name, labelClass, posHeight) {
    Track.call(this, false, false, name, name, 'ui', true, function() {});
    this.labelClass = labelClass;
    this.posHeight = posHeight;
    this.height = posHeight;
}

StaticTrack.prototype = new Track("");

StaticTrack.prototype.fillBlock = function(blockIndex, block,
                                           leftBlock, rightBlock,
					   leftBase, rightBase, scale,
					   padding, stripeWidth) {
    var posLabel = document.createElement("div");
    posLabel.className = this.labelClass;
    posLabel.appendChild(document.createTextNode(Util.addCommas(leftBase)));
    posLabel.style.top = "0px";// y + "px";
    block.appendChild(posLabel);
    this.heightUpdate(this.posHeight, blockIndex);
		//console.log(leftBase, rightBase);
};

//This track is for drawing the vertical gridlines

function GridTrack(name) {
    Track.call(this, false, false, name, name, 'ui',true, function() {});
}

GridTrack.prototype = new Track("");

GridTrack.prototype.fillBlock = function(blockIndex, block,
                                         leftBlock, rightBlock,
                                         leftBase, rightBase, scale,
                                         padding, stripeWidth) {
    var gridline = document.createElement("div");
    gridline.className = "gridline";
    gridline.style.cssText = "left: 0%; width: 0px;";
    block.appendChild(gridline);
    this.heightUpdate(100, blockIndex);
};
