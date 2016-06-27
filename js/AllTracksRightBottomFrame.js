 /* not included in main.html, but in NGBrowser.js */
 var balloon17396             = new Balloon;
   balloon17396.padding         = 10;
   balloon17396.shadow          = 0;
   balloon17396.stemHeight      = 20;
   balloon17396.stemOverlap     = 1;
   balloon17396.stem            = true;
   balloon17396.fontColor       = 'black';
   balloon17396.fontFamily      = 'Arial, sans-serif';
   balloon17396.fontSize        = '9pt';
   balloon17396.images          = 'images/balloon17396';
   balloon17396.balloonImage    = 'balloon.png';
   balloon17396.upLeftStem      = 'up_left.png';
   balloon17396.upRightStem     = 'up_right.png';
   balloon17396.downLeftStem    = 'down_left.png';
   balloon17396.downRightStem   = 'down_right.png';
   balloon17396.closeButton     = 'close.png';
   balloon17396.ieImage         = null;
   balloon17396.configured      = true;

function mouseoverhandler(event){
  balloon17396.showTooltip(event, "Click to add track");
}
