

//Variables to set up for this module.
//Global variables 
var ctrlIndex = 0;
var lastCtrlIndex = 0;
var newCtrl;
var currCtrls = [];           //Local copy of ctrls array passed from index.html.
window.configCtrls = [];      //Need this to return edited ctrls object to calling program in validateCtrls(). 
var autotuneActive = false;   //Flag is true if autotune is active, false if not active.

//Receive a copy of newCtrl from index.html when this dialog opened. Used for adding new ctrl to ctrls object.
function sendNewCtrl( ctrl1 ) {
    newCtrl = JSON.parse( JSON.stringify (ctrl1) );
};

//Receive a copy of ctrls from index.html. Use this as local copy until validate has been activated, then return.
function sendCtrls( data ) {
    currCtlrs = JSON.parse( JSON.stringify( data ) );
};

//ctrlsDialogData() - display initial controllers data then allow selection of controller from array
function ctrlsDialogData( data, index1 ) {
    var newData = JSON.parse( JSON.stringify( data) );

    //Set lastCtrlIndex to index1 to pull up recently edited controller.
    lastCtrlIndex = index1;  
    
    //Clear out global copy of ctrls.
    window.configCtrls = newData;

    //Set local copy of ctrls.
    currCtrls = JSON.parse( JSON.stringify( newData ) );

    //Set up buttons.
    ctrlsButtonsInit();

    //Set up click handlers.
    setClickHandlers();

    //Activate tooltips.
    //$('.tooltip').tooltipster();

    //Update PID Autotune button state.
    autotuneButtonState();

    //Disable PWM checkboxes until this is implemented.
    $( "#ctrlCoolPwmID" ).prop( "disabled", true );
    $( "#ctrlHeatPwmID" ).prop( "disabled", true );

    newData = selectCtrls( newData );
    currCtrls = JSON.parse( JSON.stringify( newData ) );
    var retVal = { retCtrls: currCtrls, retIndex : ctrlIndex }; 
    return retVal;
};

//ctrlsButtonsInit() - Initialize buttons for the controllers dialog.
function ctrlsButtonsInit() {

    //On ctrlAddBtnID button click, request new ctrl from server and add this to ctrls.
    $( "#ctrlAddBtnID" ).button().click( function(event) {
        event.preventDefault();

        //Add newCtrl to currCtrls. 
        currCtrls.push( newCtrl );
        
        //Update the selectmenu.
        var key = currCtrls.length - 1;

        $("#cfgCurrCtrlID").append($("<option/>", {
            value: key,
            text: key.toString() + ' - ' + currCtrls[key].cfg.name
        }));
        //Now, set selectmenu index to the last to point to new option.
        $("#cfgCurrCtrlID").prop("selectedIndex", currCtrls.length-1 ).selectmenu('refresh');
        $("#cfgCurrCtrlID" ).selectmenu( "refresh" );   
    });

    //On ctrlDelBtnID button click, inactivate this ctrl from selectmenu and mark for delete.
    $( "#ctrlDelBtnID" ).button().click( function(event) {
        event.preventDefault();
        if ( ctrlIndex === 0 ) {
        	$.alert( 'Cannot delete controller 0. Uncheck the Active checkbox to disable.', 'Error' );
        } else {
            $.confirm( 'Are you sure you want to delete controller ' + ctrlIndex + ' ('+ currCtrls[ctrlIndex].cfg.name + ')?', 'Delete Controller', function() {
                //Mark this controller as disabled in the selectmenu options.
                currCtrls[ctrlIndex].cfg.deleteFlag = true; 

                //Now mark this option as disabled in the selectmenu.
                //  The line below doesn't work, so use plain javascript.
                //$("#cfgCurrCtrlID option[value='" + ctrlIndex+ "' ]").remove(); 
                document.getElementById("cfgCurrCtrlID").options[ctrlIndex].disabled = true;
                //document.getElementById("cfgCurrCtrlID").options[i].text = 'Disabled';

                //Set selection on first option and refresh.
                $("#cfgCurrCtrlID").prop("selectedIndex", 0 ).selectmenu('refresh');
                $("#cfgCurrCtrlID" ).selectmenu( "refresh" );
            });
        };    
    });

    //On ctrlLogFileResetID, send socket to reset (delete) the logfile.
    $( "#ctrlLogFileResetID" ).button().click( function( event ) {
        $.confirm( "Are you sure you want to reset the controller's logfile? This will delete all logged data.", 
            "Reset Controller " + ctrlIndex + " Logfile", function() {
            socket.emit( "resetFile", { reset: "ctrllogfile", filename: currCtrls[ctrlIndex].cfg.logFileName } );
        });
    });

    //On ctrlCoolTestBtnID, send socket to server to test actuator (cool pin).
    $( "#ctrlCoolTestBtnID" ).button().click( function(event) {
    	currCtrls = saveCtrlParams( currCtrls, ctrlIndex );
        var testActuator = { 
            pin: currCtrls[ctrlIndex].cfg.coolPin, 
            inverted: currCtrls[ctrlIndex].cfg.coolPinInvert,
            pwm: currCtrls[ctrlIndex].cfg.heatUsePwm 
        };
        socket.emit( 'testActuator', testActuator );
        //$.alert( 'Testing gpio pin ' + testActuator.pin + '...', 
        //    'Testing ' + ( currCtrls[ctrlIndex].cfg.type == 'TEMP' ? 'Cooling' : 'Dehumidifier' ) + ' Actuator', 2000 );
    });

    //On ctrlCoolAutotuneID, set up dialog to start autotuning. 
    $( "#ctrlCoolAutotuneID ").button().click( function(event) {
    	//Save current controller parameters and open dialog.
    	currCtrls = saveCtrlParams( currCtrls, ctrlIndex );
        autotuneDialog( currCtrls, ctrlIndex, "cool");
    });

    //On ctrlHeatTestBtnID, send socket to server to test actuator (heat pin).
    $( "#ctrlHeatTestBtnID" ).button().click( function(event) {
    	currCtrls = saveCtrlParams( currCtrls, ctrlIndex );
        var testActuator = { 
            pin: currCtrls[ctrlIndex].cfg.heatPin, 
            inverted: currCtrls[ctrlIndex].cfg.heatPinInvert, 
            pwm: currCtrls[ctrlIndex].cfg.heatUsePwm
        };
        socket.emit( 'testActuator', testActuator );
        //$.alert( 'Testing gpio pin ' + testActuator.pin + '...', 
        //    'Testing ' + ( currCtrls[ctrlIndex].cfg.type == 'TEMP' ? 'Heating' : 'Humidifier' ) + ' Actuator', 2000 );
    });

    //On ctrlHeatAutotuneID, set up dialog to start autotuning. 
    $( "#ctrlHeatAutotuneID ").button().click( function(event) {
  		//Save current controller parameters and open dialog.
    	currCtrls = saveCtrlParams( currCtrls, ctrlIndex );
        autotuneDialog( currCtrls, ctrlIndex, "heat");
    });

   //On ctrlOpenProfBtnID, open profiles dialog (inside profiles.html).
    $( "#ctrlOpenProfBtnID" ).button().click( function(event) {

        //Save current paramenters to currCtrls.
        currCtrls = saveCtrlParams( currCtrls, ctrlIndex ); 

        //Open a new dialog and load grid into it.
        currCtrls = editProfile( currCtrls, ctrlIndex );
        
    });

    //On ctrlActiveProfBtnID, toggle tprofActive flag.
    //First, need to set up button value based on status.
    //Set up the button with jquery.
    $( "#ctrlActiveProfBtnID" ).button();
    setButtonState();
    $( "#ctrlActiveProfBtnID" ).button().click( function(event) {
        if ( currCtrls[ctrlIndex].cfg.tprofActive == false ) {
            currCtrls[ctrlIndex].cfg.tprofActive = true;
            setButtonState();
            $.alert( 'Starting profile ' + currCtrls[ctrlIndex].cfg.profileName + ' on controller ' +
               ctrlIndex + ' (' + currCtrls[ctrlIndex].cfg.name + ')...', 'Profile Started');
        } else {
            $.confirm( 'Are you sure you wish to stop this profile?' + 
                 '\nThis will require a restart of the profile.' , 'Stop profile?', function() {
                currCtrls[ctrlIndex].cfg.tprofActive = false;
                setButtonState();
            });
        };
    });

};

//selectCtrls() - select a controller to edit via dropdown select menu.
//  data - ctrls array of controllers
//  returns index of currently selected controller.
function selectCtrls() {

    //Initialize selectmenu options.
    var i = 0;
    for (i = 0; i < currCtrls.length; i++ ) {
        $("#cfgCurrCtrlID")
            .append($("<option></option>")
            .attr("value", i )
            .text( (currCtrls[i].cfg.deleteFlag ) ? 'Deleted' : i.toString() + '-' + currCtrls[i].cfg.name))
        //Disable options with deleteFlag == true;
        if ( currCtrls[i].cfg.deleteFlag == true ) {
            document.getElementById("cfgCurrCtrlID").options[i].disabled = true;
        };
    };

    //Initialize selectmenu.
    $( "#cfgCurrCtrlID" ).selectmenu( {
        width: 170
    }); 
    $("#cfgCurrCtrlID" ).selectmenu( "refresh" );

    //Get last selected control (first on startup)  
    getSelectedCtrl( lastCtrlIndex );

    //Load the last control accessed into selectmenu.
    $("#cfgCurrCtrlID" ).val( lastCtrlIndex );
    $( "#cfgCurrCtrlID" ).selectmenu('refresh');  
    
    //Once a selection has been made, load that record for editing or deletion.
    $("#cfgCurrCtrlID" ).on( "selectmenuselect", function( event, data ) {
        ctrlIndex = data.item.index;

        //If name changed, update the list of controllers with this.

        //Save data for last selected before pulling up new data.
        currCtrls = saveCtrlParams( currCtrls, lastCtrlIndex ); 

        //Now pull up data for this selection.
        getSelectedCtrl( ctrlIndex );

        //Set the button state.
        setButtonState();
        
        //Save any changes in case the selected controller is edited.
        //currCtrls = saveCtrlParams( currCtrls, ctrlIndex );

        lastCtrlIndex = ctrlIndex;
    }); 
    //$.alert( JSON.stringify( currCtrls ), 'selectCtrls() - currCtrls' ); 
    return currCtrls;  //ctrlIndex;
};

//setClickHandlers() - sets up click handlers for different elements.
function setClickHandlers() {

	//Change output units if auto (degrees/RH) vs. manual (percent)
    $( "input:radio[id=ctrlOutputModeID]:nth(0)" ).click( function() {
        $( "#ctrlSetpointUnitID" ).html( " degrees/%RH   ");
    });  
    $( "input:radio[id=ctrlOutputModeID]:nth(1)" ).click( function() {
        $( "#ctrlSetpointUnitID" ).html( " percent output");
    });  
    $( "input:radio[id=ctrlOutputModeID]:nth(2)" ).click( function() {
        $( "#ctrlSetpointUnitID" ).html( " percent output");
    });  

    //If coolModeHys activated, do the same for heat Hys
    $( "input:radio[id=ctrlCoolModeID]:nth(0)" ).click( function() {
    	$( "input:radio[id=ctrlHeatModeID]:nth(0)" ).prop("checked", true );
    });

    //If coolMode PID activated, do the same for heat PID
    $( "input:radio[id=ctrlCoolModeID]:nth(1)" ).click( function() {
    	$( "input:radio[id=ctrlHeatModeID]:nth(1)" ).prop("checked", true );
    });

    //If heatModeHys activated, do the same for cool Hys
    $( "input:radio[id=ctrlHeatModeID]:nth(0)" ).click( function() {
    	$( "input:radio[id=ctrlCoolModeID]:nth(0)" ).prop("checked", true );
    });

    //If heatModePID activated, do the same for cool PID
    $( "input:radio[id=ctrlHeatModeID]:nth(1)" ).click( function() {
    	$( "input:radio[id=ctrlCoolModeID]:nth(1)" ).prop("checked", true );
    });


};


//setButtonState() - sets button state(s) for selected controller.
function setButtonState() {
    if ( currCtrls[ctrlIndex].cfg.tprofActive == false ) {
        //Set button text to start.
        $( "#ctrlActiveProfBtnID" ).prop('value', "Start Profile" );
        $( "#ctrlActiveProfBtnID").button('refresh');
    } else {
        //Set value to stop.
        $( "#ctrlActiveProfBtnID" ).prop('value', "Stop Profile" );
        $( "#ctrlActiveProfBtnID").button('refresh');
    };
};

//getSelectedCtrl() - loads selected controller parameters into form.
function getSelectedCtrl( i ) {
    ctrls2 = JSON.parse( JSON.stringify( currCtrls ) );
    //Name
    $( "#ctrlNameID" ).val( ctrls2[i].cfg.name );
    //Sensor Type
    switch (ctrls2[i].cfg.type ) {
        case 'TEMP': 
            $("input:radio[id=ctrlTypeID]:nth(0)").prop( "checked", true);
            break;
        case 'HUMD':
           $("input:radio[id=ctrlTypeID]:nth(1)").prop( "checked", true);
            break;
        default:
            $("input:radio[id=ctrlTypeID]:nth(1)").prop( "checked", true);
       
    };
    //Activate
    $( "#ctrlActivateID" ).prop("checked", ctrls2[i].cfg.activate );

    //OutputMode
    switch ( parseInt( ctrls2[i].cfg.outputMode ) ) {
        case 0:
            $("input:radio[id=ctrlOutputModeID]:nth(0)").prop( "checked", true);
            break;
        case 1:
            $("input:radio[id=ctrlOutputModeID]:nth(1)").prop( "checked", true);
            break;
        case 2:
            $("input:radio[id=ctrlOutputModeID]:nth(2)").prop( "checked", true);
            break;
        default:
            $("input:radio[id=ctrlOutputModeID]:nth(0)").prop( "checked", true);
    };
    //Update ctrlSetpointUnit if this is manual (%) or automatic (F or C)
    if ( ctrls2[i].cfg.outputMode > 0 ) {
        $( "#ctrlSetpointUnitID" ).html( " percent output");
    } else {
        $( "#ctrlSetpointUnitID" ).html( " degrees/%RH   ");
    };
    
    //Sensor- use selectmenu for this.
    $("#ctrlSensorID").selectmenu({style:"dropdown", width:100});
    $("#ctrlSensorID").val( ctrls2[i].cfg.sensor );
    $("#ctrlSensorID").selectmenu("refresh");

    //Sensor2 priority
    $( "#ctrlSensor2PriorityID" ).val( ctrls2[i].cfg.sensor2Priority );

    //Sensor2 - use selectmenu for this as well.
    $("#ctrlSensor2ID").selectmenu({style:"dropdown", width:100});
    var sensor2 = ( ctrls2[i].cfg.sensor2 == "" ? "none" : ctrls2[i].cfg.sensor2 );
    $("#ctrlSensor2ID").val( sensor2 );
    $("#ctrlSensor2ID").selectmenu("refresh");


    //Setpoint
    $( "#ctrlSetpointID" ).val( ctrls2[i].cfg.endSetpoint ); 

    //Log data ?
    $( "#ctrlLogDataID" ).prop( "checked", ctrls2[i].cfg.logData );
      
    //Logfile name
    $( "#ctrlLogFileID" ).val( ctrls2[i].cfg.logFileName );
    
    //Cooling Parameters
    $( "#ctrlCoolPinID" ).val( ctrls2[i].cfg.coolPin );
    
    //Cooling Pin inverted?
    $( "#ctrlCoolInvertID" ).prop( "checked", ctrls2[i].cfg.coolPinInvert );

    //Cooling PWM mode?
    $( "#ctrlCoolPwmID" ).prop( "checked", ctrls2[i].cfg.coolUsePWM );

    $( "#ctrlCoolDelayID" ).val( ctrls2[i].cfg.coolDelay );

    //Cooling Mode
    switch (ctrls2[i].cfg.coolCtrlMode ) {
        case 'HYS': 
            $("input:radio[id=ctrlCoolModeID]:nth(0)").prop( "checked", true);
            break;
        case 'PID':
           $("input:radio[id=ctrlCoolModeID]:nth(1)").prop( "checked", true);
            break;
        default:
            $("input:radio[id=ctrlCoolModeID]:nth(0)").prop( "checked", true);
    };

    $( "#ctrlCoolHysID" ).val( ctrls2[i].cfg.coolHys );

    //Cooling PID parameters: 
    $( "#ctrlCoolPidKpID" ).val( ctrls2[i].cfg.coolKp );
    $( "#ctrlCoolPidKiID" ).val( ctrls2[i].cfg.coolKi );
    $( "#ctrlCoolPidKdID" ).val( ctrls2[i].cfg.coolKd );
    $( "#ctrlCoolPidWindowID" ).val( ctrls2[i].cfg.coolTpWindow );

    //Heating Parameters...
    $( "#ctrlHeatPinID" ).val( ctrls2[i].cfg.heatPin );

    //Heating Pin inverted?
    $( "#ctrlHeatInvertID" ).prop( "checked", ctrls2[i].cfg.heatPinInvert );

    //Heating PWM mode?
    $( "#ctrlHeatPwmID" ).prop( "checked", ctrls2[i].cfg.heatUsePWM );

    $( "#ctrlHeatDelayID" ).val( ctrls2[i].cfg.heatDelay );
    
    //Heating Controller Mode
    switch (ctrls2[i].cfg.heatCtrlMode ) {
        case 'HYS': 
            $("input:radio[id=ctrlHeatModeID]:nth(0)").prop( "checked", true);
            break;
        case 'PID':
           $("input:radio[id=ctrlHeatModeID]:nth(1)").prop( "checked", true);
            break;
        default:
            $("input:radio[id=ctrlHeatModeID]:nth(0)").prop( "checked", true);
    };

    $( "#ctrlHeatHysID" ).val( ctrls2[i].cfg.heatHys );
    
    //Heating PID parameters: 
    $( "#ctrlHeatPidKpID" ).val( ctrls2[i].cfg.heatKp );
    $( "#ctrlHeatPidKiID" ).val( ctrls2[i].cfg.heatKi );
    $( "#ctrlHeatPidKdID" ).val( ctrls2[i].cfg.heatKd );
    $( "#ctrlHeatPidWindowID" ).val( ctrls2[i].cfg.heatTpWindow );

    //Profile stuff. ctrlUseProfile
    $( "#ctrlUseProfileID" ).prop( "checked", ctrls2[i].cfg.useProfile );

    $( "#ctrlProfileNameID" ).val( ctrls2[i].cfg.profileName );
    var tprofTimeInc = parseInt( ctrls2[i].cfg.tprofTimeInc );
    switch ( tprofTimeInc ) {
        case 2: 
            $("input:radio[name=ctrlTinc]:nth(0)").prop( "checked", true);
            //$.alert( 'case 2' );
            break;
        case 3:
            $("input:radio[name=ctrlTinc]:nth(1)").prop( "checked", true);
            //$.alert( 'case 3' );
            break;
        case 4:
            $("input:radio[name=ctrlTinc]:nth(2)").prop( "checked", true);
            //$.alert( 'case 3' );
            break;
        default:
            $("input:radio[name=ctrlTinc]:nth(0)").prop( "checked", true);
            //$.alert( 'default' );                    
    };
    //$.alert( 'getSelectedCtrl - Index: ' + i + ': ctrls2[i].cfg.heatUsePWM: ' + ctrls2[i].cfg.heatUsePWM + 
    //	'\nName: ' + ctrls2[i].cfg.name );
}; 
                                
//saveCtrlParams() - Save any changes in case the selected controller is edited.
function saveCtrlParams( ctrls3, i ) {
    var ctrls4 = JSON.parse( JSON.stringify( ctrls3 ) );
    ctrls4[i].cfg.name = $( "#ctrlNameID" ).val();
    ctrls4[i].cfg.activate = $( "#ctrlActivateID" ).prop( "checked" );
    var outputMode = parseInt( $( "input[name=ctrlOutputMode]:checked" ).val() );
    switch ( outputMode ) {
        case 0:
            ctrls4[i].cfg.outputMode = 0;
            break;
        case 1:
            ctrls4[i].cfg.outputMode = 1;
            break;

        case 2:
            ctrls4[i].cfg.outputMode = 2;
            break;
        default:
            ctrls4[i].cfg.outputMode = 0;
     };

    ctrls4[i].cfg.type = $( "input[name=ctrlType]:checked" ).val();
    ctrls4[i].cfg.sensor = $( '#ctrlSensorID :selected' ).html();
    ctrls4[i].cfg.sensor2Priority = parseInt( $( "#ctrlSensor2PriorityID" ).val() );
    if ( ctrls4[i].cfg.sensor2Priority < 0 ) ctrls4[i].cfg.sensor2Priority = 0;
    if ( ctrls4[i].cfg.sensor2Priority > 100 ) ctrls4[i].cfg.sensor2Priority = 100;
    var sensor2 = $('#ctrlSensor2ID :selected').html();            
    ctrls4[i].cfg.sensor2 = ( sensor2 == "none" ? "" : sensor2 );
    ctrls4[i].cfg.endSetpoint = parseFloat( $( "#ctrlSetpointID" ).val() );
    ctrls4[i].cfg.logData = $( "#ctrlLogDataID" ).prop( "checked" );
    ctrls4[i].cfg.logFileName = $( "#ctrlLogFileID" ).val(); 

    //Cooling pin
    ctrls4[i].cfg.coolPin = $( "#ctrlCoolPinID" ).val();
    ctrls4[i].cfg.coolPinInvert = $( "#ctrlCoolInvertID" ).prop( "checked" );
    ctrls4[i].cfg.coolUsePWM = $( "#ctrlCoolPwmID" ).prop( "checked" );
    ctrls4[i].cfg.coolDelay = parseInt( $( "#ctrlCoolDelayID" ).val() );
    ctrls4[i].cfg.coolCtrlMode = $( "input[name=ctrlCoolMode]:checked" ).val();
    //Cooling mode parameters
    ctrls4[i].cfg.coolHys = parseFloat( $( "#ctrlCoolHysID" ).val() );
    ctrls4[i].cfg.coolKp = parseFloat( $( "#ctrlCoolPidKpID" ).val() );
    ctrls4[i].cfg.coolKi = parseFloat( $( "#ctrlCoolPidKiID" ).val() );
    ctrls4[i].cfg.coolKd = parseFloat( $( "#ctrlCoolPidKdID" ).val() );
    ctrls4[i].cfg.coolTpWindow = parseInt( $( "#ctrlCoolPidWindowID" ).val() );

    //Heating pin
    ctrls4[i].cfg.heatPin = $( "#ctrlHeatPinID" ).val();
    ctrls4[i].cfg.heatPinInvert = $( "#ctrlHeatInvertID" ).prop( "checked" );
    ctrls4[i].cfg.heatUsePWM = $( "#ctrlHeatPwmID" ).prop( "checked" );
    ctrls4[i].cfg.heatDelay = parseInt( $( "#ctrlHeatDelayID" ).val() );
    ctrls4[i].cfg.heatCtrlMode = $( "input[name=ctrlHeatMode]:checked" ).val();
    //Heating mode parameters
    ctrls4[i].cfg.heatHys = parseFloat( $( "#ctrlHeatHysID" ).val() );
    ctrls4[i].cfg.heatKp = parseFloat( $( "#ctrlHeatPidKpID" ).val() );
    ctrls4[i].cfg.heatKi = parseFloat( $( "#ctrlHeatPidKiID" ).val() );
    ctrls4[i].cfg.heatKd = parseFloat( $( "#ctrlHeatPidKdID" ).val() );
    ctrls4[i].cfg.heatTpWindow = parseInt( $( "#ctrlHeatPidWindowID" ).val() );

    //Profiles info.
    ctrls4[i].cfg.useProfile = $( "#ctrlUseProfileID" ).prop( "checked" );            
    ctrls4[i].cfg.profileName = $( "#ctrlProfileNameID" ).val();
    //ctrls4[i].cfg.tprofTimeInc = parseInt( $( "input[name=ctrlTimeInc]:checked" ).val() );
    var tprofTimeInc = parseInt( $( "input[name=ctrlTinc]:checked" ).val() );
    switch ( tprofTimeInc ) {
        case 2:
            ctrls4[i].cfg.tprofTimeInc = 2;
            break;
        case 3:
            ctrls4[i].cfg.tprofTimeInc = 3;
            break;

        case 4:
            ctrls4[i].cfg.tprofTimeInc = 4;
            break;
        default:
            ctrls4[i].cfg.tprofTimeInc = 0;
     };
    //$.alert( 'ctrls4['+i+'].cfg.tprofTimeInc='+ctrls4[i].cfg.tprofTimeInc );
    
    //Save local copies.
    window.configCtrls = JSON.parse( JSON.stringify( ctrls4 ) ); //Make a local copy of ctrls object to return in validateCtrls().
    currCtrls = JSON.parse( JSON.stringify( ctrls4 ) );
    //$.alert( 'saveCtrlParams - Index: ' + i + ': ctrls4[i].cfg.heatUsePWM: ' + ctrls4[i].cfg.heatUsePWM +
    //    '    Name: ' + ctrls4[i].cfg.name );            
    return currCtrls;
};  

//validateCtrlsData() - update ctrls values if valid
function validateCtrlsData() {
    
    //Save currently selected page in case selectmenu not used. 
    //  Also, retrieves the local ctrls object for return to calling program.  
    
    
    //var retCtrls = JSON.parse( JSON.stringify( saveCtrlParams( window.configCtrls, lastCtrlIndex ) ) );
    var retCtrls = JSON.parse( JSON.stringify( saveCtrlParams( currCtrls, lastCtrlIndex ) ) );
    
    return retCtrls; //Note that this returns the actual object and not true/false.
};

//sendCtrlIndex() - sends currently selected ctrl index back to index.html
function sendCtrlIndex() {
    return ctrlIndex;
};

//editProfile() - edit tprofile parameters.
function editProfile( ctrls5, index ) {
    var ctrlsNew = JSON.parse( JSON.stringify( ctrls5 ) );
    var tprof1 = ctrls5[index].tprof;
    var retCtrls = [];

    //Set up profiles dialog.    
    $( "#tProfDivID" ).dialog( {
        autoOpen: false,
        resizable: false,
        width: 500,
        modal: true,
        show: {
            effect: "fade",
            duration: 300
        },
        hide: {
            effect: "fade",
            duration: 300
        },
        open: function(event, ui) { 
            $(".ui-dialog-titlebar-close").hide();
        },
        buttons: {
            Save: function() {
                //Get modified tprof object into currCtrl, then close.
                var retData = validateProfileData( currCtrls, ctrlIndex );
                currCtrls[ctrlIndex].tprof = JSON.parse( JSON.stringify( retData.profile ) );
                currCtrls[ctrlIndex].cfg.profileName = retData.profileName;

                //Update profile name
                //$.alert( 'profileName: ' + currCtrls[ctrlIndex].cfg.profileName );
                $( "#ctrlProfileNameID" ).val( currCtrls[ctrlIndex].cfg.profileName );

                $( this ).dialog( "close" );
            },
            Cancel: function() {
                //Just close.
                $( this ).dialog( "close" );
            }
         }
    }); 
    $( "#tProfDivID" ).load("tprofiles.html", function() {
        //Load data into tprofiles.html for editing.
        setupProfileDialog( ctrls5, index ); 
        $( "#tProfDivID" ).dialog( "open" );
    }); 
    //$.alert( 'Temperature Profiles would open here...');
    return ctrlsNew;
};

//autotuneDialog() - Opens autotuning dialog to tune selected PID.
//  ctrls - array of controller objects
//  i - index of current controller
//  actuator - "cool" or "heat"
function autotuneDialog( ctrls, i, actuator) {
    //Check to ensure controller is using PID mode, otherwise notify user and exit.
    if ( ctrls[i].cfg.coolCtrlMode !== "PID" || ctrls[i].cfg.heatCtrlMode !== "PID" ) {
        $.alert( "Cannot start autotuning under hysteresis mode. Change controller to PID mode.", "Error");
        return;
    }; 

	//Can only set up one autotuner at a time, so search ctrls to see if autotune active.
	var atIndex = -1;
	var atAct = "";
	for (var x = 0; x < ctrls.length; x++ ) {
        if ( ctrls[x].cfg.pidAutoTune !== "" ) {
            atIndex = x;
            atAct = ctrls[x].cfg.pidAutoTune;  
        };
	};
    
    
    if ( atIndex == -1 ) {  //Autotune is not running on any actuators.
	    $.confirm( "Start autotuning for " + (actuator == "cool" ? "cooling/dehumidifying actuator?" : "heating/humidifying actuator?"),"Start autotuning?", function() {

            currCtrls[ctrlIndex].cfg.pidAutoTune = actuator;

            //Change the button status to show it is running.
            autotuneButtonState();

            //Flag that autotuning is on.
            autotuneActive = true;
        });

    } else { //Autotune is running on an actuator. Is it this one?
    	//Check to see if this actuator is autotuning. If it is, cancel it.
    	if ( ( atIndex == i ) && ( atAct == actuator ) ) {
    		$.confirm( "Are you sure you want to cancel autotuning on this actuator?", "Cancel Autotune", function() {
    			
    			ctrls[i].cfg.pidAutoTune = "";

    			//Change the button status to show it is not running.
    			autotuneButtonState();

    			//Flag that autotuning is off.
    			autotuneActive = false;
    		});
    	} else {
    		$.alert( "Autotune is already running on controller " + atIndex + ". Cancel autotuning first.", "Error");
    	};
    };
    
};

//autotuneButtonState() - Set autotune button state based on .cfg.pidAutoTune field
function autotuneButtonState() {
    switch (currCtrls[ctrlIndex].cfg.pidAutoTune ) {

        case "cool" :
            //$( #ctrlHeatAutotuneID ).
            $( "#ctrlCoolAutotuneID" ).prop('value', "Cancel Autotune" );
            $( "#ctrlCoolAutotuneID").button('refresh');
            break;

        case "heat" :
            $( "#ctrlHeatAutotuneID" ).prop('value', "Cancel Autotune" );
            $( "#ctrlHeatAutotuneID").button('refresh');
            break;

        case "" :
            $( "#ctrlCoolAutotuneID" ).prop('value', "PID Autotune" );
            $( "#ctrlCoolAutotuneID").button('refresh');
            $( "#ctrlHeatAutotuneID" ).prop('value', "PID Autotune" );
            $( "#ctrlHeatAutotuneID").button('refresh');
            break;

        default:

    };
};