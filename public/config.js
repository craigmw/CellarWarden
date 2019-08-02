//config.js - 
//Display and edit config data - returns a copy of edited config data.
//  Use onclick statement in calling routine to determine whether to Save or Cancel copy
//  of new data to clientConfig object.

 

//configDialogData() - display initial config data
function configDialogData( data ) {

    var newData = JSON.parse( JSON.stringify( data) );

    //alert( "DS18Id1: " + DS18Id1 + " DS18Id2: " + DS18Id2 );
    

    //Display edit fields
    
     
    //Fill fields with current values
    //    General
    if (newData.pwProtect ) { 
        $("input:radio[id=cfgPwProtectID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgPwProtectID]:nth(1)").attr( "checked", true);
    };
    $( "#cfgPassWordID" ).val( newData.passWord );
    $( "#cfgTitleID" ).val( newData.configTitle );
    $( "#cfgServerAddrID" ).val( newData.listenAddress );
    $( "#cfgServerPortID" ).val( newData.listenPort );
    if (newData.tempScale == "F" ) { 
        $("input:radio[id=cfgTempScaleID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgTempScaleID]:nth(1)").attr( "checked", true);
    };
    if (newData.rejectExtremes ) { 
        $("input:radio[id=cfgRejectID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgRejectID]:nth(1)").attr( "checked", true);
    };
    $( "#cfgRejThrID" ).spinner( {min: 0, max: 100, step: 2} );
    $( "#cfgRejThrID" ).spinner( "value", ( newData.rejectThreshold) );
    $( "#cfgShowTooltipsID" ).prop("checked", newData.showTooltips );

    //    Sensors 
    //        DHT
    switch (newData.DHTtype1 ) {
        case 11: 
            $("input:radio[id=cfgDHTtype1ID]:nth(0)").attr( "checked", true);
            break;
        case 22:
            $("input:radio[id=cfgDHTtype1ID]:nth(1)").attr( "checked", true);
            break;
        default:
            $("input:radio[id=cfgDHTtype1ID]:nth(2)").attr( "checked", true);
    };
    $( "#cfgDHTpin1ID").val( newData.DHTpin1 );
    $( "#cfgDHTlabel1ID").val( newData.DHTlabel1 );
    switch (newData.DHTtype2 ) {
        case 11: 
            $("input:radio[id=cfgDHTtype2ID]:nth(0)").attr( "checked", true);
            break;
        case 22:
            $("input:radio[id=cfgDHTtype2ID]:nth(1)").attr( "checked", true);
            break;
        default:
            $("input:radio[id=cfgDHTtype2ID]:nth(2)").attr( "checked", true);
    };
    $( "#cfgDHTpin2ID").val( newData.DHTpin2 );
    $( "#cfgDHTlabel2ID").val( newData.DHTlabel2 ); 

    //        OneWire
    loadOwData( newData );
                 
    //    Calibration
    $( "#cfgDHToffsetT1ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDHToffsetT1ID" ).spinner( "value", newData.DHToffsetT1 ); 
    $( "#cfgDHToffsetT2ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDHToffsetT2ID" ).spinner( "value", newData.DHToffsetT2 ); 
    $( "#cfgDHToffsetH1ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDHToffsetH1ID" ).spinner( "value", newData.DHToffsetH1 ); 
    $( "#cfgDHToffsetH2ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDHToffsetH2ID" ).spinner( "value", newData.DHToffsetH2 ); 

    $( "#cfgDS18offset1ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset1ID" ).spinner( "value", newData.DS18offset1 ); 
    $( "#cfgDS18offset2ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset2ID" ).spinner( "value", newData.DS18offset2 );
    $( "#cfgDS18offset3ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset3ID" ).spinner( "value", newData.DS18offset3 ); 
    $( "#cfgDS18offset4ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset4ID" ).spinner( "value", newData.DS18offset4 );
    $( "#cfgDS18offset5ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset5ID" ).spinner( "value", newData.DS18offset5 ); 
    $( "#cfgDS18offset6ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset6ID" ).spinner( "value", newData.DS18offset6 );
    $( "#cfgDS18offset7ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset7ID" ).spinner( "value", newData.DS18offset7 ); 
    $( "#cfgDS18offset8ID" ).spinner( {min: -10, max: 10, step: 0.2} );
    $( "#cfgDS18offset8ID" ).spinner( "value", newData.DS18offset8 );

    //    Logging
    $( "#cfgLogFileID").val( newData.logFileName );
    if (newData.logAveraging ) { 
        $("input:radio[id=cfgLogAvgID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgLogAvgID]:nth(1)").attr( "checked", true);
    };
    $( "#cfgLogIncID").val( newData.logIncrement );
    if (newData.compress ) { 
        $("input:radio[id=cfgLogCompID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgLogCompID]:nth(1)").attr( "checked", true);
    };
    $( "#cfgLogPresID").val( newData.cmpPreserve );
    $( "#cfgLogGranID").val( newData.cmpGranularity );
    if (newData.cmpAutoExec ) { 
        $("input:radio[id=cfgLogAutoCompID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgLogAutoCompID]:nth(1)").attr( "checked", true);
    };
    var cmpTime = newData.cmpExecuteTime.split( ":" );
    var cmpHours = cmpTime[0];
    var cmpMins = cmpTime[1];
    $( "#cfgLogCompTimeHoursID").val( cmpHours );
    $( "#cfgLogCompTimeMinsID").val( cmpMins );

    //    Hardware
    $( "#cfgLcdExistsID" ).prop("checked", newData.lcdExists );
    if (newData.lcdType == 0 ) { 
        $("input:radio[id=cfgLcdTypeID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgLcdTypeID]:nth(1)").attr( "checked", true);
    };
    $( "#cfgLcdColsID" ).val(newData.lcdCols );
    $( "#cfgLcdRowsID" ).val(newData.lcdRows );
    $( "#cfgLcdI2cBusID" ).val(newData.lcdI2cBus );
    $( "#cfgLcdI2cAddressID" ).val( newData.lcdI2cAddress );
    $( "#cfgLcdRsPinID" ).val(newData.lcdRsPin );
    $( "#cfgLcdEPinID" ).val(newData.lcdEPin );
    $( "#cfgLcdBLPinID" ).val(newData.lcdBlPin );
    $( "#cfgLcdDataPin0ID" ).val(newData.lcdDataPin0 );
    $( "#cfgLcdDataPin1ID" ).val(newData.lcdDataPin1 );
    $( "#cfgLcdDataPin2ID" ).val(newData.lcdDataPin2 );
    $( "#cfgLcdDataPin3ID" ).val(newData.lcdDataPin3 );
    
    if (newData.doorSwitchExists ) { 
        $("input:radio[id=cfgDoorExists1ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgDoorExists1ID]:nth(1)").attr( "checked", true);
    };
    $( "#cfgDoorGpio1ID" ).val(newData.doorSwitchPin );
    if (newData.doorSwitchExists2 ) { 
        $("input:radio[id=cfgDoorExists2ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=cfgDoorExists2ID]:nth(1)").attr( "checked", true);
    };
    $( "#cfgDoorGpio2ID" ).val(newData.doorSwitchPin2 );
    $( "#cfgDoorClosedID" ).val(newData.doorClosed );
    $( "#cfgDoorOpenID" ).val(newData.doorOpen );

    
    // BUTTONS
    //On cfgShowServerLogID button click, request server log from server and load this into a dialog window.
    $( "#cfgShowServerLogID" ).button().click( function(event) {
        event.preventDefault();
        socket.emit( "showServerLog" );
    });

    //On cfgClearServerLogID button click, tell server to clear out server log.
    $( "#cfgClearServerLogID" ).button().click( function(event) {
        event.preventDefault();
        $.confirm( "Clear out the server log?", "Initialize Server Log", function() {
            socket.emit ( "clearServerLog" );
        });
    });

    //On cfgRebootRPiID button click, tell server to clear out server log.
    $( "#cfgRebootRPiID" ).button().click( function(event) {
        event.preventDefault();
        $.confirm( "Are you sure you want to reboot the Rasberry Pi?", "Reboot RPi", function() {
            socket.emit ( "rebootRPi" );
            //Close the dialog so that config data is refreshed after RPi reboots.
            $( "#config-dialogID" ).dialog( "close" );
        });
    });

    //On cfgOneWireDevicesSearch button click, reload devices on OneWire bus and update the fields
    $( "#cfgOneWireDevicesSearchID" ).button().click( function( event ) {
        event.preventDefault();
        //Remove all elements from dropdown to prevent duplicaton of options
        $( "#cfgOneWireId1ID" ).empty();
        $( "#cfgOneWireId2ID" ).empty();
        $( "#cfgOneWireId3ID" ).empty();
        $( "#cfgOneWireId4ID" ).empty();
        $( "#cfgOneWireId5ID" ).empty();
        $( "#cfgOneWireId6ID" ).empty();
        $( "#cfgOneWireId7ID" ).empty();
        $( "#cfgOneWireId8ID" ).empty();
        socket.emit( "loadOwDevices", newData );
        
    });

    //On cfgLogFileReset button click, delete logfile.
    $( "#cfgLogFileResetID" ).button().click( function( event ) {
        $.confirm( "Are you sure you want to reset the logfile? This will delete all logged data.", "Reset Logfile", function() {
            socket.emit( "resetFile", { reset: "mainlogfile", filename: newData.logFileName } );
        });
    });
    
    //On cfgLogCompNow button click, get compression parameters and run compression.
    $( "#cfgLogCompNowID" ).button().click( function( event ) {
        event.preventDefault();
        //First, get the compression parameters from the dialog, then send socket to tell server to compress
        newData.cmpPreserve = parseInt( $( "#cfgLogPresID" ).val() );
        newData.cmpGranularity = parseInt( $( "#cfgLogGranID" ).val() );
        var action1 = (newData.cmpGranularity == 0) ? "delete" : "compress";
        var action2 = (newData.cmpGranularity == 0) ? "Truncate" : "Compress";
        var title1 = action2 + " Logfile...";
        var text1 = "This command will " + action1 +" all data older than " + newData.cmpPreserve + " days. These data cannot be recovered!";
        $.confirm( text1, title1, function() {
            socket.emit( "compressLogFile", newData );
        });
    });  
    
    return newData;
};


//Sockets stuff...
//When serverLogReturn socket received, show dialog with server log.
socket.on("serverLogReturn", function( data ) {
    //$.alert( data, "Server Log" );
    
    //Replace all line-feeds with <br> to show carriage returns in HTML object.
    //data = data.replace(/(?:\r\n|\r|\n)/g, '<br />');
    //Replace unix color escape codes with html color tags.
     
    $("#cfgServerLogDlgID").dialog({ 
        width: 600,
        height: 400,
        autoopen: false,
        resizable: false,
        title: "Server Log", 
        modal: true, 
        dialogClass: "no-close",
        closeOnEscape: true,
        open: function(event, ui) { 
            // Remove the closing 'X' from the dialog
            $(".ui-dialog-titlebar-close").hide(); 
            //Load data into div
            $( "#cfgServerLogWindowID" ).show();
            $( "#cfgServerLogWindowID" ).text( data );
        }, 
        buttons: {
            "Ok": function() {
                $(this).dialog("close");
                //okAction();
            },
            /* "Cancel": function() {
                $(this).dialog("close");
            } */
        },
        close: function(event, ui) { $(this).hide(); },
    });

});

//When newOwDevices socket received, update display of OneWire devices
socket.on("newOwDevices",function( data ) {
    var newData = JSON.parse( JSON.stringify( data) );
    loadOwData( newData );
});

/* //On showCompressBox socket, show popup detailing logfile compression progress.
socket.on( 'showCompressBox', function() {
    BeginProgressBar( "Compressing Logfile...", 500 );

}); 

//On closeCompressBox socket, close popup showing logfile compression progress.
socket.on( 'closeCompressBox', function() {
    EndProgressBar();
}); */



//loadOwData() - Load OneWire device data into fields
function loadOwData( data ) {
    var newData = JSON.parse( JSON.stringify( data) );
    var deviceString = "";
    var deviceArray = "";
    $( "#cfgOneWireGpioID" ).val(newData.oneWirePin);
    
    //Prepare array of devices for dropdown menus of IDs, or none.
    deviceString = newData.oneWireDevices.toString(); //Make array of valid OW devices
    deviceArray = deviceString.split(',');
    deviceArray.push( "None" );  //Add none so that "" can be added to this to avoid sensor calls.

    //Show dropdown menu for DS18id1
    //$( "#cfgOneWireId1ID" ).destroy();
    
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId1ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId1ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id1 ); //Find index for existing value
    $("#cfgOneWireId1ID" ).val( idIndex );
    $("#cfgOneWireId1ID" ).selectmenu( "refresh" );            

    $( "#cfgOneWireLabel1ID" ).val(newData.DS18label1 );
    
    //Show dropdown menu for DS18id2
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId2ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId2ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id2 ); //Find index for existing value
    $("#cfgOneWireId2ID" ).val( idIndex );
    $("#cfgOneWireId2ID" ).selectmenu( "refresh" );  
    $( "#cfgOneWireLabel2ID" ).val(newData.DS18label2 ); 

    //Show dropdown menu for DS18id3
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId3ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId3ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id3 ); //Find index for existing value
    $("#cfgOneWireId3ID" ).val( idIndex );
    $("#cfgOneWireId3ID" ).selectmenu( "refresh" );  
    $( "#cfgOneWireLabel3ID" ).val(newData.DS18label3 ); 

    //Show dropdown menu for DS18id4
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId4ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId4ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id4 ); //Find index for existing value
    $("#cfgOneWireId4ID" ).val( idIndex );
    $("#cfgOneWireId4ID" ).selectmenu( "refresh" );  
    $( "#cfgOneWireLabel4ID" ).val(newData.DS18label4 ); 

    //Show dropdown menu for DS18id5
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId5ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId5ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id5 ); //Find index for existing value
    $("#cfgOneWireId5ID" ).val( idIndex );
    $("#cfgOneWireId5ID" ).selectmenu( "refresh" );  
    $( "#cfgOneWireLabel5ID" ).val(newData.DS18label5 ); 

    //Show dropdown menu for DS18id6
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId6ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId6ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id6 ); //Find index for existing value
    $("#cfgOneWireId6ID" ).val( idIndex );
    $("#cfgOneWireId6ID" ).selectmenu( "refresh" );  
    $( "#cfgOneWireLabel6ID" ).val(newData.DS18label6 ); 

    //Show dropdown menu for DS18id7
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId7ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId7ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id7 ); //Find index for existing value
    $("#cfgOneWireId7ID" ).val( idIndex );
    $("#cfgOneWireId7ID" ).selectmenu( "refresh" );  
    $( "#cfgOneWireLabel7ID" ).val(newData.DS18label7 ); 

     //Show dropdown menu for DS18id8
    $.each(deviceArray, function(key, value) {
        $('#cfgOneWireId8ID').append($("<option/>", {
            value: key,
            text: value
        }));
    });
    $( "#cfgOneWireId8ID" ).selectmenu( {
        width: 170
    });
    var idIndex = deviceArray.indexOf( newData.DS18id8 ); //Find index for existing value
    $("#cfgOneWireId8ID" ).val( idIndex );
    $("#cfgOneWireId8ID" ).selectmenu( "refresh" );  
    $( "#cfgOneWireLabel8ID" ).val(newData.DS18label8 ); 

};

// validateConfigData() - update config values if valid
function validateConfigData( newData ) {

    //General
    var pwProtect = $( "input[name=cfgPwProtect]:checked" ).val();
    if ( pwProtect == "true" ) {
        newData.pwProtect = true;
    } else {
        newData.pwProtect = false;
    };
    newData.passWord = $( "#cfgPassWordID" ).val();
    newData.configTitle = $( "#cfgTitleID" ).val();
    newData.listenAddress = $( "#cfgServerAddrID" ).val();
    newData.listenPort = $( "#cfgServerPortID" ).val();
    newData.tempScale = $( "input[name=cfgTempScale]:checked" ).val();
    var rejectExt = $( "input[name=cfgReject]:checked" ).val();
    if ( rejectExt == "true" ) {
        newData.rejectExtremes = true;
    } else {
        newData.rejectExtremes = false;
    };
    newData.rejectThreshold = $( "#cfgRejThrID" ).spinner( "value" );
    newData.showTooltips = $( "#cfgShowTooltipsID" ).prop( "checked" );
   
    //Sensors - DHT
    newData.DHTtype1 = parseInt( $( "input[name=cfgDHTtype1]:checked" ).val() );
    newData.DHTpin1 = parseInt( $( "#cfgDHTpin1ID").val() );
    newData.DHTlabel1 = $( "#cfgDHTlabel1ID").val();
    
    //newData.DHTtype2 = 22;
    newData.DHTtype2 = parseInt( $( "input[name=cfgDHTtype2]:checked" ).val() );
    newData.DHTpin2 = parseInt( $( "#cfgDHTpin2ID").val() );
    newData.DHTlabel2 = $( "#cfgDHTlabel2ID").val();

    //Sensors - One Wire
    newData.oneWirePin = parseInt( $( "#cfgOneWireGpioID" ).val() );
    var owKey1 = $( "#cfgOneWireId1ID" ).val();
    var owKey2 = $( "#cfgOneWireId2ID" ).val();
    var owKey3 = $( "#cfgOneWireId3ID" ).val();
    var owKey4 = $( "#cfgOneWireId4ID" ).val();
    var owKey5 = $( "#cfgOneWireId5ID" ).val();
    var owKey6 = $( "#cfgOneWireId6ID" ).val();
    var owKey7 = $( "#cfgOneWireId7ID" ).val();
    var owKey8 = $( "#cfgOneWireId8ID" ).val();
    var deviceString = newData.oneWireDevices.toString(); //Make array of valid OW devices
    var deviceArray = deviceString.split(',');
    deviceArray.push( "None" ); 
    newData.DS18id1 = deviceArray[ owKey1 ];
    newData.DS18id2 = deviceArray[ owKey2 ];
    newData.DS18id3 = deviceArray[ owKey3 ];
    newData.DS18id4 = deviceArray[ owKey4 ];           
    newData.DS18id5 = deviceArray[ owKey5 ];            
    newData.DS18id6 = deviceArray[ owKey6 ];            
    newData.DS18id7 = deviceArray[ owKey7 ];            
    newData.DS18id8 = deviceArray[ owKey8 ];             

    newData.DS18label1 = $( "#cfgOneWireLabel1ID" ).val();
    newData.DS18label2 = $( "#cfgOneWireLabel2ID" ).val();
    newData.DS18label3 = $( "#cfgOneWireLabel3ID" ).val();
    newData.DS18label4 = $( "#cfgOneWireLabel4ID" ).val();
    newData.DS18label5 = $( "#cfgOneWireLabel5ID" ).val();
    newData.DS18label6 = $( "#cfgOneWireLabel6ID" ).val();
    newData.DS18label7 = $( "#cfgOneWireLabel7ID" ).val();
    newData.DS18label8 = $( "#cfgOneWireLabel8ID" ).val();

    //Calibration
    newData.DHToffsetT1 = $( "#cfgDHToffsetT1ID" ).spinner( "value" );
    newData.DHToffsetT2 = $( "#cfgDHToffsetT2ID" ).spinner( "value" );
    newData.DHToffsetH1 = $( "#cfgDHToffsetH1ID" ).spinner( "value" );
    newData.DHToffsetH2 = $( "#cfgDHToffsetH2ID" ).spinner( "value" );
    newData.DS18offset1 = $( "#cfgDS18offset1ID" ).spinner( "value" );
    newData.DS18offset2 = $( "#cfgDS18offset2ID" ).spinner( "value" );
    newData.DS18offset3 = $( "#cfgDS18offset3ID" ).spinner( "value" );
    newData.DS18offset4 = $( "#cfgDS18offset4ID" ).spinner( "value" );
    newData.DS18offset5 = $( "#cfgDS18offset5ID" ).spinner( "value" );
    newData.DS18offset6 = $( "#cfgDS18offset6ID" ).spinner( "value" );
    newData.DS18offset7 = $( "#cfgDS18offset7ID" ).spinner( "value" );
    newData.DS18offset8 = $( "#cfgDS18offset8ID" ).spinner( "value" );

    //Logging
    newData.logFileName = $( "#cfgLogFileID" ).val();
    var logAveraging = $( "input[name=cfgLogAvg]:checked" ).val();
    if ( logAveraging == "true" ) {
        newData.logAveraging = true;
    } else {
        newData.logAveraging = false;
    };
    newData.logIncrement = parseInt( $( "#cfgLogIncID").val() );
    var logCompress = $( "input[name=cfgLogComp]:checked" ).val();
    if ( logCompress == "true" ) {
        newData.compress = true;
    } else {
        newData.compress = false;
    };
    newData.cmpPreserve = parseInt( $( "#cfgLogPresID" ).val() );
    newData.cmpGranularity = parseInt( $( "#cfgLogGranID" ).val() );
    var cmpAutoExec = $( "input[name=cfgLogAutoComp]:checked" ).val();
    if ( cmpAutoExec == "true" ) {
        newData.cmpAutoExec = true;
    } else {
        newData.cmpAutoExec = false;
    };
    var cmpHours = parseInt( $( "#cfgLogCompTimeHoursID" ).val() );
    var cmpMins = parseInt( $( "#cfgLogCompTimeMinsID" ).val() );
    if ( cmpHours < 0 || cmpHours > 23 ) { 
        cmpHours = 1;
    };
    if ( cmpMins < 0 || cmpMins > 59 ) { 
        cmpMins = 0;
    }; 
    newData.cmpExecuteTime = ( cmpHours < 10 ) ? "0" + cmpHours.toString() : cmpHours.toString();
    newData.cmpExecuteTime += ":"; 
    newData.cmpExecuteTime += ( cmpMins < 10 ) ? "0" + cmpMins.toString() : cmpMins.toString();
   
    //Hardware
    newData.lcdExists = $( "#cfgLcdExistsID" ).prop( "checked" );
    var lcdType = parseInt( $( "input[name=cfgLcdType]:checked" ).val() );
    switch ( lcdType ) {
        case 0:
            newData.lcdType = 0;
            break;
        case 1:
            newData.lcdType = 1;
            break;
        default:
            newData.lcdType = 0;
    };
    newData.lcdCols = parseInt( $( "#cfgLcdColsID" ).val() );
    newData.lcdRows = parseInt( $( "#cfgLcdRowsID" ).val() );
    newData.lcdI2cBus = parseInt( $( "#cfgLcdI2cBusID").val() );
    newData.lcdI2cAddress = $( "#cfgLcdI2cAddressID" ).val();            
    newData.lcdRsPin = parseInt( $( "#cfgLcdRsPinID" ).val() );
    newData.lcdEPin = parseInt( $( "#cfgLcdEPinID" ).val() );
    newData.lcdBlPin = parseInt( $( "#cfgLcdBLPinID" ).val() );
    newData.lcdDataPin0 = parseInt( $( "#cfgLcdDataPin0ID" ).val() );
    newData.lcdDataPin1 = parseInt( $( "#cfgLcdDataPin1ID" ).val() );
    newData.lcdDataPin2 = parseInt( $( "#cfgLcdDataPin2ID" ).val() );
    newData.lcdDataPin3 = parseInt( $( "#cfgLcdDataPin3ID" ).val() );
    var doorSwitchExists = $( "input[name=cfgDoorExists1]:checked" ).val();
    if ( doorSwitchExists == "true" ) {
        newData.doorSwitchExists = true;
    } else {
        newData.doorSwitchExists = false;
    };
    newData.doorSwitchPin = parseInt( $( "#cfgDoorGpio1ID" ).val() );
    var doorSwitchExists2 = $( "input[name=cfgDoorExists2]:checked" ).val();
    if ( doorSwitchExists2 == "true" ) {
        newData.doorSwitchExists2 = true;
    } else {
        newData.doorSwitchExists2 = false;
    };
    newData.doorSwitchPin2 = parseInt( $( "#cfgDoorGpio2ID" ).val() );
    newData.doorClosed = parseInt( $( "#cfgDoorClosedID" ).val() );
    newData.doorOpen = parseInt( $( "#cfgDoorOpenID" ).val() );
    
    return true;
};

