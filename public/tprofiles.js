//tprofiles.js - 
//The following sets up a table with editing properties. Works great, but needs a couple of fixes:
// 1. Deleting a row should recalculate the IDs (based on the tprof array index of each remaining segments).
// 2. Adding a row should occur below the selected row. Now it just appends a row onto the end.
// Input fields needed (from the tprof.cfg variables):
//  Duration
//  StartSP
//  EndSP
//  Hold (should only add this to the last segment).
//

//Variables for grid (grid open source plugin from Gijgo.com).
var data, grid, dialog, timeInc;

//Set up default record here.
data = [
    { "ID": 0, "Duration": "1", "StartSP": "65", "EndSP": "65", "Hold": false }
];

//Set up default time increment.
var timeInc = 'Minutes';

//Time increment to process.
var t_SEC =  1;
var t_MIN =  2;
var t_HOUR = 3;
var t_DAY =  4;

//Variables for dygraph.
var dgData = [];
var dgTitle = "";
var dgCtrls = [];
var dgInd = 0;

//Variables for loading/saving templates.
var selectMenuActive = false;
var tmpListing = [];
var tmpFile = ""; 
var profileName = "";
var tmpProfileName = "";
var tmpProf = {};
var tmpIndex = null;

//setupProfileDialog() - load prof data into table for editing and display dygraph. 
function setupProfileDialog( ctrls6, ind1 ) {

    //Initialize variables.
    var tprof = ctrls6[ind1].tprof;
    var tprofName = ctrls6[ind1].cfg.profileName;
    tmpProfileName = tprofName;
    var ctrlName = ctrls6[ind1].cfg.name;
    dgCtrls = JSON.parse( JSON.stringify( ctrls6 ) );
    dgTitle = ctrls6[ind1].cfg.name + ": " + ctrls6[ind1].cfg.profileName;
    dgInd = ind1;

    //List controller and profile names.
    $( "#tProfCtrlNameID" ).html( "Controller: " + ctrls6[ind1].cfg.name );
    $( "#tProfCtrlProfID" ).html( "Profile: " + ctrls6[ind1].cfg.profileName );

    //Copy tprof data into data array for grid.
    initData( tprof );

    //Determine time increment from ctrl.
    switch ( ctrls6[ind1].cfg.tprofTimeInc ) {
        case 2:
            timeInc = 'Minutes';
            break;
        case 3:
            timeInc = 'Hours';
            break;
        case 4:
            timeInc = 'Days';
            break;
        default:
            timeInc = 'Minutes';
    };

    //Set up the dialog.
    dialog = $("#dialog").dialog({
        title: "Add/Edit Segment",
        autoOpen: false,
        resizable: false,
        modal: true,
        buttons: {
            "Save": Save,
            "Cancel": function () { $(this).dialog("close"); }
        }
    });

    //Now, open the grid.
    callGrid();

    //Select the current segment.
    setSeletedSegment( ctrls6[ind1].tprofCurrSegm + 1, ctrls6[ind1].cfg.tprofActive );
   
    //Display current segment.
    showCurrSegm( ctrls6[ind1].tprofCurrSegm );

    //Update elapsed for current segment.
    showCurrSegmElapsed( ctrls6[ind1].tprofSegmElapsed, ctrls6[ind1].cfg.tprofTimeInc );

    //Show a dyGraph of the loaded data.
    updateDygraph();

    //Show the dygraphs again after a timeout.
    setTimeout( function() {
        updateDygraph();
    }, 100 );

    showProfActive( ctrls6[ind1].cfg.tprofActive );
  
    //Setup templates select menu.
    setupTmpSelectMenu();   
};

//initData() - initialize data array used by grid.
// tprof1 - tProf array.
function initData( tprof1 ) {
    var dSeg = { "ID": 0, "Duration": "0", "StartSP": "", "EndSP": "", "Hold": false };
    dSeg = JSON.parse( JSON.stringify( dSeg ) );
    data = [];
    var data1 = [];

    //$.alert( 'tprof1: ' + JSON.stringify( tprof1 ) );

    //First, set up array of empty rows.  
    for ( var ind2=0; ind2 < tprof1.length; ind2++ ) {
        data1.push( dSeg );
    };
    data1 = JSON.parse( JSON.stringify( data1 ) );

    //Now, fill array with data from tprof1.
    for (var ind3=0; ind3 < tprof1.length; ind3++ ) {
        //$.alert( 'tprof1['+ind3+'].cfg.startSP=' + tprof1[ind3].cfg.startSP );
        data1[ind3].ID = ind3;
        data1[ind3].Duration = tprof1[ind3].cfg.duration;
        data1[ind3].StartSP = tprof1[ind3].cfg.startSP;
        data1[ind3].EndSP = tprof1[ind3].cfg.endSP;
        data1[ind3].Hold = tprof1[ind3].cfg.hold;
    };
    data = JSON.parse( JSON.stringify( data1 ) );
};

//setSelectedSegment() - sets the selected row based on current segment value in ctrls.
function setSeletedSegment( row, tprofActive ) {
    //alert( 'Row: ' + row );
    //Only do this if profile is active.
    if (tprofActive == true ) {
        grid.setSelected( row ); 
    }; 
};

//showProfActive() - shows the status of the tprofActive flag.
function showProfActive( tprofActive ) {
    $("#tProfActiveID").html('Profile Active: ' + tprofActive );
};

//showCurrSegm() - show the current (active) segment on banner.
function showCurrSegm( segm1 ) {
    $("#tProfCurrSegmID").html( "Current Segment: " + segm1 );
}; 

//showCurrSegmElapsed() - shows the elapsed time for the current (active) segment on the banner.
function showCurrSegmElapsed( segmElapsed, timeInc1 ) {
	var timeUnit = "";
	switch ( timeInc1 ) {
		case t_MIN:
		    timeUnit = " minutes";
		    break;
		case t_HOUR:
		    timeUnit = " hours";
		    break;
		case t_DAY:
		    timeUnit = " days";
		    break;
	};
    $( "#tProfCurrSegmElapsedID" ).html( "Seg. Elapsed: " + segmElapsed.toFixed(1) + timeUnit );
};

//validateProfileData() - Get data edited by grid tool and return to calling page.
//  ctrls7 - current controller array
//  ind4 - index of controller
//  returns updated tprof array
function validateProfileData( ctrls7, ind4 ) {
    ctrls7 = JSON.parse( JSON.stringify( ctrls7 ) );
    var data2 = grid.getAll();
    data2 = JSON.parse( JSON.stringify( data2 ) );
    
    //Make a local tprof segment object.
    var tSeg = JSON.parse( JSON.stringify( ctrls7[ind4].tprof[0] ) );
    var tprof2 = [];

    //Make new tprof array of same length as data and copy config data from grid to new tprof.
    for (var i=0; i < data2.length; i++ ) {
        tprof2.push( tSeg );
    };
    tprof2 = JSON.parse( JSON.stringify( tprof2 ) ); 
    for (var i=0; i < tprof2.length; i++ ) {
        tprof2[i].cfg.duration = parseInt( data2[i].record.Duration );
        tprof2[i].cfg.startSP = parseInt( data2[i].record.StartSP );
        tprof2[i].cfg.endSP = parseInt( data2[i].record.EndSP );
        tprof2[i].cfg.hold = data2[i].record.Hold;
        tprof2[i].timeStart = 0;
        tprof2[i].timeChecked = 0;
    };

    tprof2 = JSON.parse( JSON.stringify( tprof2 ) );
    //$.alert( 'tprof2: ' + JSON.stringify( tprof2 ) );

    //Copy profile name to field in calling page.
    $( "#ctrlProfileNameID" ).html( tmpProfileName );
    
    return { profile:tprof2, profileName: tmpProfileName };
    
};

//updateDygraph() - sets up dygraph using data in grid.
function updateDygraph() {
    //Prep dygraph data array from existing data.
    var data2 = JSON.parse( JSON.stringify( grid.getAll() ) );

    //Transfer the current data into dgData.
    var dgData = [];
    var dgLine = "";
    var dgDataString="";
    var dgElapsed = 0;
    for( var i=0; i < data2.length; i++ ) {

        //Need to make two lines for each element, one for start and one for end.
        //First, the start. Use dgElapsed as time.
        dgLine += dgElapsed + ', ';
        dgLine += data2[i].record.StartSP + ', NaN\n';

        //Make the next line using the endSP. Need to add Duration to dgElapsed.
        dgElapsed += parseInt( data2[i].record.Duration ); 
        dgLine += ( dgElapsed - 0.01 ) + ', ';
        dgLine += data2[i].record.EndSP + ', NaN\n';
    };

    //Determine current position in profile by segment.
    // First, enumerate all time elapsed before current segment, then add
    // this to total elapsed time to find position.
    var tPos = 0;
    var totalTime = 0;

    //Only do this if the profile is active.
    if ( dgCtrls[dgInd].cfg.tprofActive ) {
        
        for( var n1=0; n1 < dgCtrls[dgInd].tprof.length; n1++ ) {
            totalTime += dgCtrls[dgInd].tprof[n1].cfg.duration;
            if ( dgCtrls[dgInd].tprofCurrSegm > n1 ) {
                tPos += dgCtrls[dgInd].tprof[n1].cfg.duration;
            };
        };
        tPos += dgCtrls[dgInd].tprofSegmElapsed;
        var tPosStart = tPos;
        var tPosEnd = tPos + (0.02 * totalTime );
    };
    //$.alert( 'totalTime=' + totalTime + '\ttPos=' + tPos );
    
    //dgData = JSON.parse( JSON.stringify( dgData ) );
    dgLegend = "Time (" + timeInc + "), Setpoint,\n";
    dgLine = dgLegend + dgLine;

    //Now, show the dygraph.
    var chartColors = [ 'rgb(41,170,41)' ];
    var chartLabels1 = [ "Time", "Temp" ];
    g3 = new Dygraph( 
        document.getElementById("tProfDygraphID"),
        dgLine, 
        {
            labelsDiv: document.getElementById('tProfGraphLegendID'),
            //labels: chartLabels1,
            title: "Temperature/Humidity Profile",
            colors: chartColors,
            animatedZooms: true,
            gridLineColor: '#ccc',
            displayAnnotations: false,
            strokeWidth: 3,
            ylabel: 'Temp or RH (%)',
            xlabel: 'Time (' + timeInc + ')',
            showLabelsOnHighlight: false,
            underlayCallback: function(canvas, area, g3) {
                var bottom_left = g3.toDomCoords(tPosStart, -5);
                var top_right = g3.toDomCoords(tPosEnd, +5);

                var left = bottom_left[0];
                var right = top_right[0];

                canvas.fillStyle = "rgba(255, 149, 000, 1.0)";
                canvas.fillRect(left, area.y, right - left, area.h);
            }

        }
    );
};

function Edit(e) {
    //Copy grid data into Edit dialog fields.
    $("#ID").val(e.data.id);
    $("#Duration").val(e.data.record.Duration);
    $("#StartSP").val(e.data.record.StartSP);
    $("#EndSP").val(e.data.record.EndSP);
    $("#Hold").prop("checked", e.data.record.Hold );
    $("#dialog").dialog("open");
    updateDygraph();
};

function Delete(e) {
    id=e.data.id;
    $.confirm( "Are you sure you want to delete this segment?", "Delete Segment " + (id - 1), function() {
        if( dgCtrls[dgInd].cfg.tprofActive == false ) {
            //Delete the record. 
            grid.removeRow(e.data.id);
            updateDygraph();
        } else {
            $.alert('Cannot delete segments when profile is running. Stop this profile first.', 'Error' );
        };
    });
};

function Save() {
    //Copy fields from dialog into current or new record in grid object.
    if ($("#ID").val()) {
        var id = parseInt($("#ID").val());
        grid.updateRow(id, { "ID": id, "Duration": $("#Duration").val(), "StartSP": $("#StartSP").val(), "EndSP": $("#EndSP").val(), "Hold": $("#Hold").is( ':checked' ) });
    } else {
        grid.addRow({ "ID": grid.count() + 1, "Duration": $("#Duration").val(), "StartSP": $("#StartSP").val(), "EndSP": $("#EndSP").val(), "Hold": $("#Hold").is( ':checked' ) });
    }
    $(this).dialog("close");
    updateDygraph();
};

function callGrid() {
    grid = $("#grid").grid({
        dataSource: data,
        autoload: true,
        columns: [
            { field: "ID", title: "Segment" },
            { field: "Duration", title: "Duration" + " (" + timeInc + ")" },
            { field: "StartSP", title: "Start Setpoint" },
            { field: "EndSP", title: "End Setpoint" },
            { field: "Hold", title: "Hold", type: "text" },
            { title: "", width: 20, type: "icon", icon: "ui-icon-pencil", tooltip: "Edit", events: { "click": Edit } },
            { title: "", width: 20, type: "icon", icon: "ui-icon-close", tooltip: "Delete", events: { "click": Delete } }
        ]
    });
};

//$("#btnAddID").on("click", function () {
$("#btnAddID").button().click(function( event ) {
    //Load default values into Add dialog fields. 
    $("#ID").val("");
    $("#Duration").val("");
    $("#StartSP").val("");
    $("#EndSP").val("");
    $("#Hold").prop("checked", false);
    $("#dialog").dialog("open");
});

/*
$("#btnRestartSegID").button().click(function( event ) {
    //Restart currently selected segment.
    //Send a socket to server with reset request and currently selected segment.
    //Determine currently selected segment. 
    
});
*/

$("#btnLoadTemplateID").button().click(function( event ) {

    //Check to make sure that the profile isn't running before loading dialog.
    if( dgCtrls[dgInd].cfg.tprofActive == true ) {
        $.alert( 'Cannot load a template when the current profile is active. Stop the running profile to load a template.', 'Error' );
        return;
    };

    //Send socket to request listing of template files.
    socket.emit( "loadTmpListing" );

    //Setup selectmenu handler.
    tmpListing = [];
    //setupTmpSelectMenu();

    //Set up the load dialog.
    dialog = $("#loadDialogID").dialog({
        title: "Load Template",
        autoOpen: false,
        resizable: true,
        modal: true,
        width: 400,
        height: 200,
        buttons: {
            Load : function() {
                //$.alert( 'Loading template...');
                updateProfile();
                resetTmpSelectMenu();
                $(this).dialog("close");
            },
            Delete : function () {
                deleteTemplate();  
                resetTmpSelectMenu();
                $(this).dialog("close");
            },
            Cancel : function () { 
                resetTmpSelectMenu();
                $(this).dialog("close"); 
            } 
        }
    });

    //Now open the dialog. 
    $("#loadDialogID").dialog("open"); 
    
});

function setupTmpSelectMenu() {
    
    //Avoid continually calling this if select menu is already set up.   
    if ( selectMenuActive ) {
        return;
    };

    //$.alert( 'setupTmpSelectMenu()...' );

    //Initialize selectmenu.
    $( "#loadFileListID" ).selectmenu( {
        width: 180
    }); 
    $( "#loadFilesListID" ).selectmenu({maxHeight: 150});

    //$( "#loadFileListID" ).selectmenu( "refresh" );

    //Setup the selectmenu handler for this.
    //var tmpIndex = 0;
    $("#loadFileListID" ).on( "selectmenuselect", function( event, data ) {
        tmpIndex = data.item.index;
        //$.alert( tmpIndex + ' has been selected.' );
        tmpFile = tmpListing[tmpIndex];
        $( "#loadFileID" ).val( tmpFile );
        socket.emit( "loadTemplate", tmpFile );

    });
    selectMenuActive = true;
 };  

function resetTmpSelectMenu() {
    $("#loadFileListID").find("option").remove().end();
    $("#loadFileListID").selectmenu("destroy").selectmenu({ style: 'dropdown' });
};

//updateProfile() - updates Profile dialog using loaded template parameters.
function updateProfile() {
    //Generate a tprof array object from tmpProf;
    var tprofA = JSON.parse( JSON.stringify( tmpProf.tprof ) );

    //Update fields in banner.
    $( "#tProfCtrlProfID" ).html( "Profile: " + tmpProf.name );

    //Copy profile name to tmpProfileName to save in ctrls when profile is saved.
    //$( "#cfgCtrlProfileNameID" ).val( tmpProf.name ); 
    tmpProfileName = tmpProf.name;
               
    //Copy new parameters into grid.
    initData( tprofA );

    //Update the grid.
    grid.destroy(true, true);
    callGrid();
    //updateGrid();
    //refreshGrid();

    //Update the dygraph.
    updateDygraph();
};

//deleteTemplate() - delete template file based on currently selected template file.
function deleteTemplate() {
    if (tmpIndex == null ) {
        $.alert( 'Please select a template to delete.', 'Error' );
        return;
    };
    var tmpFileName = tmpListing[tmpIndex]; 
    $.confirm( "Are you sure you want to delete template " + tmpFileName + "?", "Delete template", function() {
        socket.emit( "deleteTemplate", tmpFileName );
    });
};

$("#btnSaveTemplateID").button().click(function( event ) {
    //Set up the save template dialog.
    //Set up the dialog.
       
    dialog = $("#saveDialogID").dialog({
        title: "Save Template",
        autoOpen: false,
        resizable: true,
        modal: true,
        //width: auto,
        //height: auto,
        buttons: {
            Save : function () { 
                //$.alert( 'Saving template...');
                saveTemplate(); 
                $(this).dialog("close");
            },
            Cancel : function () { 
                $(this).dialog("close") 
            } 
        }
    });

    //Update the fields in the dialog.
    updateSaveTemplate();

    //Open the dialog.
    $("#saveDialogID").dialog("open"); 
});

//updateSaveTemplate() - fills fields of template Save dialog.
function updateSaveTemplate() {
    //If tmpFile is blank, try to make a filename using Profile Name.
    if ( tmpFile == "" ) {
        tmpFile = ( tmpProfileName == "" ) ? "" : saveCheckFileName( tmpProfileName );
    };

    $( "#saveFileID" ).val( tmpFile  );
    $( "#saveNameID" ).val( tmpProfileName );
};

//saveCheckFileName() - Parse filename on save to make sure it is acceptable to unix. Also, checks for 
//  .pro extension and adds it if not present (in a case-insensitive fashion).
function saveCheckFileName( str ) {
    //Strip punctuation characters (except . ).
    var retStr = str.replace( /!@#$%^&*()+=~`{}[]:;<>?/g,"" );

    //Remove any spaces
    retStr = retStr.replace( / /g, "" );

    //Make sure it ends with .pro. If not, add .pro to end of filename.
    var proSuffix = retStr.search( /.pro/i);
    if ( proSuffix === -1 ) {
        retStr = retStr + ".pro";
    };

    return retStr;
};

function saveTemplate() {
    //Get values from save template dialog.
    tmpFile = $( "#saveFileID" ).val();
    tmpFile = saveCheckFileName( tmpFile );
    profileName = $( "#saveNameID" ).val();
    tmpProf = {
        name : profileName,
        tprof : dgCtrls[dgInd].tprof
    };

    //Copy current grid data into tprof object.
    var data3 = grid.getAll();
    data3 = JSON.parse( JSON.stringify( data3 ) );
    
    //Make a local tprof segment object.
    var tSeg3 = JSON.parse( JSON.stringify( dgCtrls[dgInd].tprof[0] ) );
    var tprof3 = [];

    //Make new tprof array of same length as data and copy config data from grid to new tprof.
    for (var i=0; i < data3.length; i++ ) {
        tprof3.push( tSeg3 );
    };
    tprof3 = JSON.parse( JSON.stringify( tprof3 ) ); 
    for (var i=0; i < tprof3.length; i++ ) {
        tprof3[i].cfg.duration = parseInt( data3[i].record.Duration );
        tprof3[i].cfg.startSP = parseInt( data3[i].record.StartSP );
        tprof3[i].cfg.endSP = parseInt( data3[i].record.EndSP );
        tprof3[i].cfg.hold = data3[i].record.Hold;
        tprof3[i].timeStart = 0;
        tprof3[i].timeChecked = 0;
    };

    //tmpFile = tmpFile + ".pro";

    tprof3 = JSON.parse( JSON.stringify( tprof3 ) );
    var tmpProf3 = {
        name : profileName,
        tprof : tprof3
    };

    //Send saveTemplate socket to server.
    socket.emit( "saveTemplate", { fileName: tmpFile, tmpProf: tmpProf3 } );  
};    

//Socket returns...

//When sendTmpListing socket received, update display of templates in selectmenu.
socket.on("sendTmpListing",function( retData ) {
    var err = retData.err;
    var dataA = retData.data;
    if (err) {
        $.alert('Server was unable to open template folder. ERROR:' + err );
        return;
    };
    tmpListing = JSON.parse( JSON.stringify( dataA ) );
    //Initialize selectmenu options.
    //  Remove any items from selectmenu first.
    resetTmpSelectMenu();
    var i = 0;
    for (i = 0; i < tmpListing.length; i++ ) {
        $("#loadFileListID")
            .append($("<option></option>")
            .attr("value", i )
            .text( tmpListing[i] ) )
    };

    //Refresh the selectmenu
    $("#loadFileListID").selectmenu( "refresh" );
    
});

//When sendTemplate socket received, load into global template ojbect.
socket.on( "sendTemplate", function( retData ) {
    var err = retData.err;
    var dataA = retData.data;
    if (err) {
        $.alert( "Server was unable to open this template file. ERROR: " + err );
        return;
    };
    var checkTprof = tryParseJSON( dataA );
    if ( checkTprof == false ) {
        $( "#loadNameID" ).html( "" );
        $( "#loadSegsID" ).html( "" );
        $.alert( 'This file is not a valid template file. Cannot parse JSON object.', 'Error' );
        return;
    };
    tmpProf = checkTprof;

    //Check to ensure that tmpProf is a valid template object.
    var errLevel = checkTemplate( tmpProf );
    if ( errLevel !== 0 ) {
        $( "#loadNameID" ).html( "" );
        $( "#loadSegsID" ).html( "" );
        $.alert( 'This file is not a valid template file. Error code: ' + errLevel, 'Error' );
        return; 
    };

    //Update fields in the template load dialog.
    $( "#loadNameID" ).html( tmpProf.name );
    $( "#loadSegsID" ).html( tmpProf.tprof.length );
   

});

//When saveTemplateErr socket received, notify client that save template failed.
socket.on( "saveTemplateErr", function( err ) {
    $.alert( "Error saving template file. ERROR: " + err, "Error" );
});

//When deleteTemplateErr socket received, notify client that delete template failed.
socket.on( "deleteTemplateErr", function ( err ) {
    $.alert( "Error deleting template file. ERROR: " + err, "Error" );
}); 

function checkTemplate( tmpProf1 ) {

    var stringConstructor = "test".constructor;
    var arrayConstructor = [].constructor;
    var objectConstructor = {}.constructor;

    if (tmpProf1 === null ) {
        return 1;
    };

    if (tmpProf1 === undefined ) {
        return 2;
    };

    /* 
    if (tmpProf1.constructor === stringConstructor ) {
        return 3;
    };
    

    if (tmpProf1.constructor === arrayConstructor ) { 
        return 4;
    };
    */
    if (tmpProf1.name === undefined ) {
        return 5;
    };

    if (tmpProf1.tprof[0].cfg.duration === undefined ) {
        return 6;
    };

    if (tmpProf1.tprof.length === 0 ) {
        return 7;
    };

    return 0;
};

//tryParseJSON() - checks JSON object for validity. If object is not JSON,  
// it will return false, or it will return parsed JSON object.
function tryParseJSON( jsonString) {
    try {
        var o = JSON.parse(jsonString);
        if ( o && typeof o === "object" && o !== null ) {
            return o;
        }
    }
    catch (e) { }  
    
    return false;
};
    