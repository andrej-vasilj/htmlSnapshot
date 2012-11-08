/*
 * JQuery plugin for generating an html 5 canvas from html elements
 * By: Andrej Vasilj (andrej_vasilj@hotmail.com)
 * 
 */

(function( $ ) {

    // default settings
    var settings = {
    };
    
    //original element
    var el; 
      
    //position normalization factor
    var normX = 0, normY = 0;
    
    //drawing context
    var context = null;
    
    // available functions
    var methods = {
        
        //Initialize and execute the plugin behavior
        init : function( options ) { 
            
            //extend the default settings
            settings = $.extend( settings, options);

            //save the original element
            el = this;
            
            //calculate canvas dimensions
            var borderWidth = methods.cssNumber(this, 'border-top-width') / 2;
            var width = this.width() + borderWidth;
            var height = this.height() + borderWidth;
            
            //create a canvas element
            var canvas = $('<canvas id="htmlSnapshot_canvas" width="' + width + '" height="' + height + '"/>');
            
            //create a html5 context to draw with (use .get(0) to retrieve the DOM element)
            context = canvas.get(0).getContext('2d');
                  
            //offset all further positions using the positions of the parent element
            methods.calculateNormalizationFactors.apply(this);
            
            //call the recursive render method to start rendering children
            methods.recursiveRender.apply(this);
            
            // force canvas download by sending the data to the server, saving as a file on the server, and sending back to the browser
            $.ajax({
                type: "POST",
                data: 
                {
                    'data' : canvas.get(0).toDataURL(),
                    'filename' : 'wellplate_screenshot.png',
                    'filetype' : 'image/png'
                },
                url: 'createTempFile',
                success: function(data) { 
                    $('#secretIFrame').attr('src', "downloadTempFile/wellplate_screenshot.png");
                },
                error: function(jqXHR, textStatus) {
                    alert("Error. " + jqXHR.responseText);
                }
            });
           
            //return this for chainability
            return this;
        },
        
        //recursively render sub elements onto the canvas
        recursiveRender : function ( ){
           
            var bounds = methods.getBounds( this ); //get the element boundries
            var styles = methods.getStyles( this ); //get the element styles
            var borders = methods.getBorders( this ); //get the element border properties
            
            //draw a rectangle for this element
            methods.drawRectR(bounds, borders, styles);
            
            //draw a border for this element
            if (borders.lineWidth > 0){
                methods.strokeRectR(bounds, borders, styles);
            }
            
            //draw any text (define text as any html without < inside)
            if ( !this.html().match(/</)){
                context.font = styles.font;
                context.fillStyle = styles.fontColor;
                context.textAlign = styles.fontAlign;
                context.textBaseline = "middle";
                var center = methods.getElementCenter( this );
                context.fillText( this.html(), center.x, center.y);
            }
        
            //subsequently render the child elements
            this.children().each( function() {
                methods.recursiveRender.apply( $(this) );
            });
        },
        
        // Draw a rounded rectangle onto the canvas using the provided context and boundries
        drawRectR : function ( bounds, borders, styles ){
        
            var x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
            var tlr = borders.topLeftRadius, trr = borders.topRightRadius, blr = borders.bottomLeftRadius, brr = borders.bottomRightRadius;
            
            context.beginPath();
            context.moveTo(x + tlr, y);
            context.lineTo(x+ w - trr,y);
            context.arcTo(x + w,y, x + w, y + trr, trr);
            context.lineTo(x + w, y + h - brr);
            context.arcTo(x + w, y + h, x + w - brr, y + h, brr);
            context.lineTo(x + blr, y + h);
            context.arcTo(x, y + h, x, y + h - blr, blr);
            context.lineTo(x, y + tlr);
            context.arcTo(x, y, x + tlr, y, tlr);
            context.closePath();
            
            if (styles.background == null){
                context.fillStyle = styles.backgroundColor; 
            } else {
                context.fillStyle = styles.background;
            }
             
            context.fill();
        },
        
        // Draw a rounded rectangle border onto the canvas using the provided context and boundries
        strokeRectR : function ( bounds, borders, styles ){
            
            var x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
            var tlr = borders.topLeftRadius, trr = borders.topRightRadius, blr = borders.bottomLeftRadius, brr = borders.bottomRightRadius;
           
            context.beginPath();
            context.moveTo(x + tlr, y);
            context.lineTo(x+ w - trr,y);
            context.arcTo(x + w,y, x + w, y + trr, trr);
            context.lineTo(x + w, y + h - brr);
            context.arcTo(x + w, y + h, x + w - brr, y + h, brr);
            context.lineTo(x + blr, y + h);
            context.arcTo(x, y + h, x, y + h - blr, blr);
            context.lineTo(x, y + tlr);
            context.arcTo(x, y, x + tlr, y, tlr);
            context.closePath();
            context.lineWidth = borders.lineWidth;
            context.strokeStyle = borders.lineColor;
            context.stroke();
        },
        
        //calculate position normalization factors
        calculateNormalizationFactors : function (){
            var pos = this.offset();
            normX = pos.left;
            normY = pos.top;
        },
        
        //get the boundaries of an element
        getBounds : function ( element ){
            
            //get the border width / 2
            var borderWidth = methods.cssNumber(element, 'border-top-width') / 2;
            
            //get the offset of the element (use offset to get the value relative to the document as opposed to the position function which is relative to the parent offset)
            var pos = element.offset();
            
            return {
                x : pos.left - normX + borderWidth,
                y : pos.top - normY + borderWidth,
                width: element.width(),
                height: element.height()
            };
        },
    
        //get element style properties
        getStyles : function ( element ){
         // -moz-linear-gradient(45deg, #0004ff 0%, #e5f9ff 39%, #54d7ff 100%);
            //list of possible gradient attributes
            var grads = [
                /^(-moz-radial-gradient)/,
                /^(-webkit-radial-gradient)/,
                /^(-o-radial-gradient)/,
                /^(-ms-radial-gradient)/,
                /^(-radial-gradient)/,
                /^(radial-gradient)/,
                /^(-moz-linear-gradient)/,
                /^(-webkit-linear-gradient)/,
                /^(-o-linear-gradient)/,
                /^(-ms-linear-gradient)/,
                /^(-linear-gradient)/,
                /^(linear-gradient)/,
                /^(webkit-gradient)/
            ];
         
            //find out if we have any gradient defined
            var css = element.css('background-image'); 
            
            var grad_flag = false;
            for (var x = 0; x < grads.length; x++){
                if (css.match(grads[x])){ 
                    grad_flag = true;
                    break;
                }
            }
  
            //parse the gradient
            var retrieved_properties = [];
            var gradient_properties = [];
            var gradient = null;
            var bgImage = null;
            
            //first try to generate a gradient if the css style defines one
            if (grad_flag){
                
                switch(x){
                    
                    //most linear gradient
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                        retrieved_properties = methods.regexParse(css, ['(\\d{1,3})deg,', '(rgb\\(\\d{1,3},\\s\\d{1,3},\\s\\d{1,3}\\)\\s\\d{1,3})']);
                        
                        //parse the mozilla properties into properties that can be used by the canvas
                        gradient_properties.push( methods.getPointsFromDegrees( element, retrieved_properties[0] ) );
                        for ( var y = 1; y < retrieved_properties.length; y++ ){
                            gradient_properties.push(methods.rgbStopToHexStop( retrieved_properties[y] ));
                        }
                        
                        //create the gradient
                        gradient = methods.createLinearGradient(gradient_properties);
                    break;
                    
                    //radial gradients
                    case 5:
                        retrieved_properties = methods.regexParse(css, ['(rgb\\(\\d{1,3},\\s\\d{1,3},\\s\\d{1,3}\\)\\s\\d{1,3})']);
                        
                        //make a start and end circle
                        var endCircle = methods.getElementCenter( element );
                        var startCircle = {
                            x : endCircle.x,
                            y : endCircle.y,
                            radius : 1
                        }
                        gradient_properties.push(startCircle, endCircle);
                        
                        //get the color stops
                        for ( var y = 0; y < retrieved_properties.length; y++ ){
                            gradient_properties.push(methods.rgbStopToHexStop( retrieved_properties[y] ));
                        }
                        
                        //create the gradient
                        gradient = methods.createRadialGradient(gradient_properties);
                        
                    break;
                }
            } else if (css.match(/^(url)/)){
                //check if we have a background image instead
                
            }
            
            //create a font style from the css values
            var font = element.css('font-weight') + " " + 
                    element.css('font-size') + " " + 
                    element.css('font-family');
                    
            return {
                backgroundColor: element.css('backgroundColor'),
                background: gradient,
                font: font,
                fontColor: element.css('color'),
                fontAlign: element.css('text-align')
            };
        },
               
        //get the center point of an element
        getElementCenter : function ( element ){
            
            var bounds = methods.getBounds(element);
            return {
                x: bounds.x + (bounds.width / 2),
                y: bounds.y + (bounds.height / 2),
                radius: Math.sqrt((bounds.width * bounds.width) + (bounds.height * bounds.height)) / 2 // object diagonal divided by 2
            };
        },
        
        //get gradient orientation points from degrees
        getPointsFromDegrees : function ( element, degrees ){
            
            var offset = 90;
            var centerPoint = methods.getElementCenter(element);
            return {
                endX: centerPoint.x + (centerPoint.radius * Math.cos( (degrees + offset) * 3.14159 / 180 )),
                endY: centerPoint.y + (centerPoint.radius * Math.sin( (degrees + offset) * 3.14159 / 180 )),
                startX: centerPoint.x + (centerPoint.radius * Math.cos( ((degrees + offset) + 180) * 3.14159 / 180 )),
                startY: centerPoint.y + (centerPoint.radius * Math.sin( ((degrees + offset) + 180) * 3.14159 / 180 )),
            }
            
        },
        
        //create a linear gradient for the canvas
        createLinearGradient : function (properties){
            
            //array of start and end points
            var pnt = properties[0];
            
            //create the gradient
            var grd = context.createLinearGradient(pnt.startX, pnt.startY, pnt.endX, pnt.endY);
            
            //add all of the stops
            for ( var x = 1; x < properties.length; x++){
                grd.addColorStop(properties[x].stop, properties[x].color);
            }
  
            return grd;
        },
        
        //create a radial gradient for the canvas
        createRadialGradient : function (properties){
            
            var startCircle = properties[0];
            var endCircle = properties[1];
            
            //create the gradient
            var grd = context.createRadialGradient(startCircle.x, startCircle.y, startCircle.radius, endCircle.x, endCircle.y, endCircle.radius);
            
            //add all of the stops
            for ( var x = 2; x < properties.length; x++){
                grd.addColorStop(properties[x].stop, properties[x].color);
            }
  
            return grd;
        },
        
        //use a regular expression to collect information from a string
        regexParse : function ( css, regexps ){
            
            var properties = [];
            
            for ( var x = 0; x < regexps.length; x++ ){
                
                css.replace(
                    new RegExp(regexps[x], "g"),
                    function($0, $1, $2, $3) { 
                        properties.push($1);
                    }
                );       
            }
            
            return properties;
        },
        
        //use regex to parse info
        parseGradientStops: function (css) {
            
     
            
        },
        
        //get the properties of the border
        getBorders : function ( element ){
            
            return {
                topLeftRadius : methods.cssNumber(element, 'border-top-left-radius'),
                topRightRadius : methods.cssNumber(element, 'border-top-right-radius'),
                bottomLeftRadius : methods.cssNumber(element, 'border-bottom-left-radius'),
                bottomRightRadius : methods.cssNumber(element, 'border-bottom-right-radius'),
                lineWidth : methods.cssNumber(element, 'border-top-width'),                
                lineColor: element.css('border-top-color')
            };
        },
        
        //get the numeric value of a css attribute
        cssNumber : function( element, attribute ){
            var v = parseInt( element.css( attribute ),10 );
            return isNaN(v) ? 0 : v;
        },
        
        //converting rgb colors to hex
        rgbStopToHexStop : function (str){
            
            var rgb = [];
            str.replace(
                new RegExp('(\\d{1,3})', "g"),
                function($0, $1, $2, $3) { 
                    rgb.push($1);
                }
            );    

            return {
                color: "#" + ("0000" + (rgb[0] << 16 | rgb[1] << 8 | rgb[2]).toString(16)).slice(-6),
                stop: rgb[3] / 100
            }

        },

        //debugging function
        dump : function(obj) {
            
            var out = '';
            for (var i in obj) {
                out += i + ": " + obj[i] + "\n";
            }

            alert(out);
        }
        
    };

    $.fn.htmlSnapshot = function( method ) {

        // Method calling logic
        if ( methods[method] ) {

          return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));

        } else if ( typeof method === 'object' || ! method ) {

          return methods.init.apply( this, arguments );

        } else {

          $.error( 'Method ' +  method + ' does not exist on jQuery.htmlSnapshot' );

        }    

    };
    
})( jQuery );