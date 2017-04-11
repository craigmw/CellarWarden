//alarms.js - 
//Display and edit alarms data - returns a copy of edited alarms data.
//  Use onclick statement in calling routine to determine whether to Save or Cancel copy
//  of new data to clientAlarms object.


//alarmsDialogData: display initial config data
function alarmsDialogData( data ) {


    var newData = JSON.parse( JSON.stringify( data) );

    //General tab
    if (newData.alarmsOn ) { 
        $("input:radio[id=almAlarmsOnID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almAlarmsOnID]:nth(1)").attr( "checked", true);
    };
    if (newData.autoclear ) { 
        $("input:radio[id=almAutoClearID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almAutoClearID]:nth(1)").attr( "checked", true);
    };
    if (newData.suppress ) { 
        $("input:radio[id=almSuppressID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almSuppressID]:nth(1)").attr( "checked", true);
    };
    $( "#almEmailServiceID" ).val(newData.mailService );
    $( "#almSenderID" ).val(newData.mailUser );
    $( "#almSenderPwID" ).val(newData.mailPass );
    $( "#almToAddress1ID" ).val(newData.emailAddr1 );
    $( "#almToAddress2ID" ).val(newData.emailAddr2 );

    //Temperatures tab
    if (newData.tempMon1 ) { 
        $("input:radio[id=almTempMon1ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almTempMon1ID]:nth(1)").attr( "checked", true);
    };
    switch (newData.tempSensor1 ) {
        case "temp1": 
            $("input:radio[id=almTempSensor1ID]:nth(0)").attr( "checked", true);
            break;
        case "temp2":
            $("input:radio[id=almTempSensor1ID]:nth(1)").attr( "checked", true);
            break;
        case "onew1":
            $("input:radio[id=almTempSensor1ID]:nth(2)").attr( "checked", true);
            break;
        default:
            $("input:radio[id=almTempSensor1ID]:nth(3)").attr( "checked", true);
    };
    $( "#almTempMax1ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almTempMax1ID" ).spinner( "value", newData.tempMax1 ); 
    $( "#almTempMin1ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almTempMin1ID" ).spinner( "value", newData.tempMin1 ); 
    $( "#almTempDur1ID" ).spinner( {min: 0, max: 1440, step: 1} );
    $( "#almTempDur1ID" ).spinner( "value", newData.tempDur1 ); 
    $( "#almTempString1ID" ).val(newData.tempString1);
    if (newData.tempMon2 ) { 
        $("input:radio[id=almTempMon2ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almTempMon2ID]:nth(1)").attr( "checked", true);
    };
    switch (newData.tempSensor2 ) {
        case "temp1": 
            $("input:radio[id=almTempSensor2ID]:nth(0)").attr( "checked", true);
            break;
        case "temp2":
            $("input:radio[id=almTempSensor2ID]:nth(1)").attr( "checked", true);
            break;
        case "onew1":
            $("input:radio[id=almTempSensor2ID]:nth(2)").attr( "checked", true);
            break;
        default:
            $("input:radio[id=almTempSensor2ID]:nth(3)").attr( "checked", true);
    };
    $( "#almTempMax2ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almTempMax2ID" ).spinner( "value", newData.tempMax2 ); 
    $( "#almTempMin2ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almTempMin2ID" ).spinner( "value", newData.tempMin2 ); 
    $( "#almTempDur2ID" ).spinner( {min: 0, max: 1440, step: 1} );
    $( "#almTempDur2ID" ).spinner( "value", newData.tempDur2 ); 
    $( "#almTempString2ID" ).val(newData.tempString2);
     
    //Humidity tab
    if (newData.humiMon1 ) { 
        $("input:radio[id=almHumiMon1ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almHumiMon1ID]:nth(1)").attr( "checked", true);
    };
    switch (newData.humiSensor1 ) {
        case "dht1": 
            $("input:radio[id=almHumiSensor1ID]:nth(0)").attr( "checked", true);
            break;
        default:
            $("input:radio[id=almHumiSensor1ID]:nth(1)").attr( "checked", true);
    };
    $( "#almHumiMax1ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almHumiMax1ID" ).spinner( "value", newData.humiMax1 ); 
    $( "#almHumiMin1ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almHumiMin1ID" ).spinner( "value", newData.humiMin1 ); 
    $( "#almHumiDur1ID" ).spinner( {min: 0, max: 1440, step: 1} );
    $( "#almHumiDur1ID" ).spinner( "value", newData.humiDur1 ); 
    $( "#almHumiString1ID" ).val(newData.humiString1);
    if (newData.humiMon2 ) { 
        $("input:radio[id=almHumiMon2ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almHumiMon2ID]:nth(1)").attr( "checked", true);
    };
    switch (newData.humiSensor2 ) {
        case "dht1": 
            $("input:radio[id=almHumiSensor2ID]:nth(0)").attr( "checked", true);
            break;
        default:
            $("input:radio[id=almHumiSensor2ID]:nth(1)").attr( "checked", true);
    };
    $( "#almHumiMax2ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almHumiMax2ID" ).spinner( "value", newData.humiMax2 ); 
    $( "#almHumiMin2ID" ).spinner( {min: 0, max: 100, step: 1} );
    $( "#almHumiMin2ID" ).spinner( "value", newData.humiMin2 ); 
    $( "#almHumiDur2ID" ).spinner( {min: 0, max: 1440, step: 1} );
    $( "#almHumiDur2ID" ).spinner( "value", newData.humiDur2 ); 
    $( "#almHumiString2ID" ).val(newData.humiString2);
    

    //Doors tab
    if (newData.doorMon1 ) { 
        $("input:radio[id=almDoorMon1ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almDoorMon1ID]:nth(1)").attr( "checked", true);
    };
    $( "#almDoorDur1ID" ).spinner( {min: 0, max: 1440, step: 1} );
    $( "#almDoorDur1ID" ).spinner( "value", newData.doorDur1 ); 
    $( "#almDoorString1ID" ).val(newData.doorString1);
    if (newData.doorMon2 ) { 
        $("input:radio[id=almDoorMon2ID]:nth(0)").attr( "checked", true);
    } else {
        $("input:radio[id=almDoorMon2ID]:nth(1)").attr( "checked", true);
    };
    $( "#almDoorDur2ID" ).spinner( {min: 0, max: 1440, step: 1} );
    $( "#almDoorDur2ID" ).spinner( "value", newData.doorDur2 ); 
    $( "#almDoorString2ID" ).val(newData.doorString2);


    //Power tab
    
    //Buttons
    //On ResetAlamrs button click, clear all active alarms by sending resetAlarms socket
    $( "#almResetAlarmsID" ).button().click( function( event ) {
        event.preventDefault();
        //$.alert( "Resetting all active alarms...", "Reset Alarms" );
       $.confirm( "Reset all active alarms?", "Reset Alarms", function() {
            newData.alarmString = "";
            newData = clearAlarmsClient( newData );
            socket.emit( "clearAlarms", newData ); 
            //Close the dialog to prevent saving loaded data back to alarms object (e.g. non-zeroed alarm times)
            //$( #alarm-dialogID ).dialog("close");   
        });
        
    });

    //On ShowAlarms button click, send socket to load alarm history into dialog
    $( "#almShowAlarmsLogID" ).button().click( function(event) {
        event.preventDefault();
        socket.emit( "showAlarmsLog" );
    });


    //On almClearAlarmsLogBtn button click, remove all items from alarms logfile.
    $( "#almClearAlarmsLogID" ).button().click( function( event ) {
        event.preventDefault();
        $.confirm( "Clear alarms history?\n\nThis will remove all alarm annotations.", "Clear Alarms Logfile", function() {
            socket.emit( "clearAlarmLogFile", newData );
        });
    });

    //On SendEmail button click, send a test email by initiating a socket
    $( "#almTestEmailID").button().click(function( event ) {
        event.preventDefault();
        getEmailData( data );
        
        //Prepare email
        var emData = {
            service: "",
            user: "",
            password: "",
            addresses: "",
            subject: "",
            text: ""
        };
        emData.service = data.mailService;
        emData.user = data.mailUser;
        emData.password = data.mailPass;
        emData.addresses = data.emailAddr1;
        if (data.emailAddr2 != "" ) {
            emData.addresses = emData.addresses + ", " + data.emailAddr2;
        };
        emData.subject = "Test notification from CellarWarden";
        emData.text = "Testing the email notification function of CellarWarden.";                

        $.confirm( "Send test email?", "Test Email/SMS Addresses", function() {
            //Send a socket to tell the server to send a test email.
            socket.emit( "testEmail", emData );
        });
    });

    return newData;
};

//clearAlarmsClient: Clears out alarm flags from client copy of alarms object
function clearAlarmsClient( data ) {
    data.tempTime1 = 0;
    data.tempTime2 = 0;
    data.humiTime1 = 0;
    data.humiTime2 = 0;
    data.doorTime1 = 0;
    data.powerTime1 = 0;
    return data;
};

//When alarmsLogReturn socket received, show dialog with server log.
socket.on("alarmsLogReturn", function( data ) {
    //$.alert( data, "Alarm History" );
    
    //Replace all line-feeds with <br> to show carriage returns in HTML object.
    //data = data.replace(/(?:\r\n|\r|\n)/g, '<br />');
    //$("#almAlarmsLogDlgID").dialog({ autoOpen: false });  //Initialize dialog before opening it. 
    $("#almAlarmsLogDlgID").dialog({ 
        width: 600,
        height: 400,
        autoopen: false,
        resizable: false,
        title: "Alarms History", 
        modal: true, 
        dialogClass: "no-close",
        closeOnEscape: true,
        open: function(event, ui) { 
            // Remove the closing 'X' from the dialog
            $(".ui-dialog-titlebar-close").hide(); 
            //Load data into div
            $( "#almAlarmsLogWindowID" ).show();
            $( "#almAlarmsLogWindowID" ).text( data );
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


// validateAlarmsData: update config values if valid
function validateAlarmsData( newData ) {

    //General tab
    var alarmsOn = $( "input[name=almAlarmsOn]:checked" ).val();
    if ( alarmsOn == "true" ) {
        newData.alarmsOn = true;
    } else {
        newData.alarmsOn = false;
    };
    var autoclear = $( "input[name=almAutoClear]:checked" ).val();
    if ( autoclear == "true" ) {
        newData.autoclear = true;
    } else {
        newData.autoclear = false;
    };
    var suppress = $( "input[name=almSuppress]:checked" ).val();
    if ( suppress == "true" ) {
        newData.suppress = true;
    } else {
        newData.suppress = false;
    };
    getEmailData( newData ); //Saves the email data 

    //Temperatures tab
    var tempMon1 = $( "input[name=almTempMon1]:checked" ).val();
    if ( tempMon1 == "true" ) {
        newData.tempMon1 = true;
    } else {
        newData.tempMon1 = false;
    };
    newData.tempSensor1 = $( "input[name=almTempSensor1]:checked" ).val();
    newData.tempMax1 = $( "#almTempMax1ID" ).spinner( "value" );
    newData.tempMin1 = $( "#almTempMin1ID" ).spinner( "value" );
    newData.tempDur1 = $( "#almTempDur1ID" ).spinner( "value" );
    newData.tempString1 = $( "#almTempString1ID" ).val();
    var tempMon2 = $( "input[name=almTempMon2]:checked" ).val();
    if ( tempMon2 == "true" ) {
        newData.tempMon2 = true;
    } else {
        newData.tempMon2 = false;
    };
    newData.tempSensor2 = $( "input[name=almTempSensor2]:checked" ).val();
    newData.tempMax2 = $( "#almTempMax2ID" ).spinner( "value" );
    newData.tempMin2 = $( "#almTempMin2ID" ).spinner( "value" );
    newData.tempDur2 = $( "#almTempDur2ID" ).spinner( "value" );
    newData.tempString2 = $( "#almTempString2ID" ).val();


    //Humidity tab
    var humiMon1 = $( "input[name=almHumiMon1]:checked" ).val();
    if ( humiMon1 == "true" ) {
        newData.humiMon1 = true;
    } else {
        newData.humiMon1 = false;
    };
    newData.humiSensor1 = $( "input[name=almHumiSensor1]:checked" ).val();
    newData.humiMax1 = $( "#almHumiMax1ID" ).spinner( "value" );
    newData.humiMin1 = $( "#almHumiMin1ID" ).spinner( "value" );
    newData.humiDur1 = $( "#almHumiDur1ID" ).spinner( "value" );
    newData.humiString1 = $( "#almHumiString1ID" ).val();
    var humiMon2 = $( "input[name=almHumiMon2]:checked" ).val();
    if ( humiMon2 == "true" ) {
        newData.humiMon2 = true;
    } else {
        newData.humiMon2 = false;
    };
    newData.humiSensor2 = $( "input[name=almHumiSensor2]:checked" ).val();
    newData.humiMax2 = $( "#almHumiMax2ID" ).spinner( "value" );
    newData.humiMin2 = $( "#almHumiMin2ID" ).spinner( "value" );
    newData.humiDur2 = $( "#almHumiDur2ID" ).spinner( "value" );
    newData.humiString2 = $( "#almHumiString2ID" ).val();


    //Doors tab
    var doorMon1 = $( "input[name=almDoorMon1]:checked" ).val();
    if ( doorMon1 == "true" ) {
        newData.doorMon1 = true;
    } else {
        newData.doorMon1 = false;
    };
    newData.doorDur1 = $( "#almDoorDur1ID" ).spinner( "value" );
    newData.doorString1 = $( "#almDoorString1ID" ).val();
    var doorMon2 = $( "input[name=almDoorMon2]:checked" ).val();
    if ( doorMon2 == "true" ) {
        newData.doorMon2 = true;
    } else {
        newData.doorMon2 = false;
    };
    newData.doorDur2 = $( "#almDoorDur2ID" ).spinner( "value" );
    newData.doorString2 = $( "#almDoorString2ID" ).val();

    //Power tab 
  
    //alert( "AlarmsOn: " + newData.alarmsOn ); //+ newdata.suppress );

    
    
    return true;
};

//getEmailData: gets email data from General tab
function getEmailData( newData ) {   
    newData.mailService = $( "#almEmailServiceID" ).val();
    newData.mailUser = $( "#almSenderID" ).val();
    newData.mailPass = $( "#almSenderPwID" ).val();
    newData.emailAddr1 = $( "#almToAddress1ID" ).val();
    newData.emailAddr2 = $( "#almToAddress2ID" ).val();
};



