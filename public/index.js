//index.js - main javascript for CellarWarden client.        

        //var showConfig = "initConfig is here";
        var clientConfig = {};   //Client side copy of config object retrieved from server.
        var returnConfig;        //Temp config data returned by config dialog.
        var clientAlarms;        //Client side alarm config
        var returnAlarms;        //Temp alarm config data returned by alarms dialog.
        var clientCtrls = [];    //Controllers array passed from server.
        var returnCtrls = [];    //Temp ctrls data returned by config dialog.
        var newCtrl = [];        //New ctrl object passed from server. Used to add new controller objects to array ctrls.
        var pwCorrect = false;   //Flag to ensure password has been entered. 
        var chartLabels = ['Time', 'Temp1', 'Humi1', 'Temp2', 'Humi2', 'onew1', 'onew2', 'onew3', 'onew4','onew5','onew6','onew7','onew8','Amps', 'Door1', 'Door2' ];
        var chartColors = [ 'rgb(41,170,41)', 'rgb(240, 100, 100)', 'rgb(89, 184, 255)',  'rgb(255, 161, 76)', 'rgb(235, 40, 241)', 'rgb(119,0,255)', 'rgb(3, 142, 161)', 'rgb(101, 3, 161)', 'rgb(63, 161, 3)', 'rgb(171, 168, 2)', 'rgb(186, 7, 121)', 'rgb(32, 102, 77)', 'rgb(0, 0, 255)', 'rgb(0,0,0)' ];
        var rollPeriod = 10;     //Number of days to average over in Dygraphs
        var annots = [];         //Annotations from alarmslog.csv
        var alarmsLogFile = "./alarmsLog.csv"  //Filename for alarm log file
        //var progressbar = $("#compressBoxID");  //DIV for progress bar
        var currIndex = 0;       //Current ctrls index. Used to keep track of currently selected controller.
        var activeTab;           //Index of Currently opened tab.
        var ctrlWindowInitialized = false;  //Flag to determine if ctrlWindow has been initialized yet.
        var showSockets = true;  //Flag for showing all sockets received from server. Turn on to debug.

        //Make dialogs respond to enter key
        $(".ui-dialog").keyup( function(e) {
            if (e.keyCode === 13) {
                $('.ok-button', $(this) ).first().click();
            }
        });
        
        //----------- Sockets Stuff -----------------     

        //var socket;              //Socket handler.
        var socket = io.connect( window.location.href );

        //Update socket connection to server using path and port from config.json
        /* $.getJSON( "config.json" ).done(function( tempConfig ) {
            if (tempConfig.listenAddress !=="" || tempConfig.listenPort !=="" ) {
               var socketAddress = tempConfig.listenAddress + ":" + tempConfig.listenPort );
               socket = io.connect( socketAddress );
            };
        }).fail(function( jqxhr, textStatus, error ) {
            var err = textStatus + ", " + error;
            $.alert( "Request Failed: " + err );
        }); */
        
        //On server startup, load config data when server sends it
        socket.on('initConfig', function( data ){
            if (showSockets) { debugInfo( 'initConfig') };
            clientConfig = JSON.parse( JSON.stringify( data ) );
            chartLabels = ['Time', 
               ( clientConfig.DHTlabel1 !=="" ) ? ( clientConfig.DHTlabel1 + " temp" ) : "Temp1",
               ( clientConfig.DHTlabel1 !=="" ) ? ( clientConfig.DHTlabel1 + " humd" ) : "Humd1", 
               ( clientConfig.DHTlabel2 !=="" ) ? ( clientConfig.DHTlabel2 + " temp" ) : "Temp2", 
               ( clientConfig.DHTlabel2 !=="" ) ? ( clientConfig.DHTlabel2 + " humd" ) : "Humd2",
               ( clientConfig.DS18label1 !=="" ) ? ( clientConfig.DS18label1 + " temp" ) : "onew1",
               ( clientConfig.DS18label2 !=="" ) ? ( clientConfig.DS18label2 + " temp" ) : "onew2",
               ( clientConfig.DS18label3 !=="" ) ? ( clientConfig.DS18label3 + " temp" ) : "onew3",  
               ( clientConfig.DS18label4 !=="" ) ? ( clientConfig.DS18label4 + " temp" ) : "onew4",  
               ( clientConfig.DS18label5 !=="" ) ? ( clientConfig.DS18label5 + " temp" ) : "onew5",  
               ( clientConfig.DS18label6 !=="" ) ? ( clientConfig.DS18label6 + " temp" ) : "onew6",  
               ( clientConfig.DS18label7 !=="" ) ? ( clientConfig.DS18label7 + " temp" ) : "onew7",  
               ( clientConfig.DS18label8 !=="" ) ? ( clientConfig.DS18label8 + " temp" ) : "onew8",    
               "Amps", 
               "Door1_Open",
               "Door2_Open"
            ]; 

            var yaxisLabel = 'Temp (' + clientConfig.tempScale + ') or RH (%)'; 
            var logFileName = clientConfig.logFileName;
            g2.updateOptions({
                file: logFileName,
                ylabel: yaxisLabel,
                labels: chartLabels,
                title: clientConfig.configTitle
            });
            //Update the display options
            //updateDisplayOptions( clientConfig, chartLabels, chartColors );

        });

        //On server startup, load alarms data when server sends it.
        socket.on('initAlarms', function( data ) {
            if (showSockets) { debugInfo( 'initAlarms') };

            //$.alert( 'initAlarms socket received.');
            clientAlarms = JSON.parse( JSON.stringify( data ) );
            g2.ready( function() { 
                annots = loadAnnots();
            });
        });

        //On server startup, load controllers data when server sends it.
        socket.on('initControllers', function( data ) {
            if (showSockets) { debugInfo( 'initControllers') };
            clientCtrls = JSON.parse( JSON.stringify( data ) );
            initCtrlWindow();
            loadCtrlDygraph();
            updateCtrlDygraph();
            //debugInfo( 'initControllers socket received.' );
        });

        //When server saves controller logfiles, update display on controller window.
        socket.on('newctrlsdata', function( data ) {
            if (showSockets) { debugInfo( 'newctrlsdata') };
            clientCtrls = JSON.parse( JSON.stringify( data ) );
            //initCtrlWindow();
            updateCtrlDygraph();
        });

        //On server startup, load initialized ctrl object when server sends it.
        //  Used for adding a new ctrl element to ctrls array.
        socket.on('sendCtrl', function( data ) {
            if (showSockets) { debugInfo( 'sendCtrl') };
            newCtrl = JSON.parse( JSON.stringify( data ) );
        });
                         
        //If alarm has been triggered, display a dialog box about this.
        socket.on('newAlarms', function( data1 ) {
            if (showSockets) { debugInfo( 'newAlarms') };
            clientAlarms = JSON.parse( JSON.stringify( data1 ) );
            //$.alert( "ALARM triggered. Reload page for more info.", "Alarm Triggered!!!" );
            showAlarmNotification( clientAlarms );
            g2.ready( function() {
                annots = loadAnnots();
            });
        });

        //Reset annotations if this socket received.
        socket.on( 'resetAnnotations', function() {
            if (showSockets) { debugInfo( 'resetAnnotations') };
            g2.ready( function() { 
                annots = loadAnnots();
            });
        });
        	
        //Update the LCD screen element when newsensordata is sent from server
        socket.on('newsensordata',function( data ){
            //if (showSockets) { debugInfo( 'newsensordata') };
            lcdDisplay0.innerHTML = data.lcdRow0;
            lcdDisplay1.innerHTML = data.lcdRow1;
            lcdDisplay2.innerHTML = data.lcdRow2;
            lcdDisplay3.innerHTML = data.lcdRow3;
        });

        //Update chart each time new data is saved in logfile.csv
        socket.on('newlogfiledata', function(){
            if (showSockets) { debugInfo( 'newlogfiledata') };
            var logFileName = clientConfig.logFileName;
            g2.updateOptions({
                file: logFileName
                //file: "../logfile.csv"
                
            });
            //debugInfo( "Received newlogfiledata socket from server." );
        });

        //On showCompressBox socket, show popup detailing logfile compression progress.
        socket.on( 'showCompressBox', function() {
            if (showSockets) { debugInfo( 'showCompressBox') };
            showCompressBox();
        });

        //On closeCompressBox socket, close popup showing logfile compression progress.
        socket.on( 'closeCompressBox', function( data ) {
            if (showSockets) { debugInfo( 'closeCompressBox') };
            closeCompressBox( data );
        });

        //When saveTemplateErr socket received, notify client that save template failed. 
        socket.on( "deleteFileErr", function( err ) { 
            $.alert( "Error resetting/deleting file. ERROR: " + err, "Error" ); 
        }); 


        //----------- End of Socket Stuff -----------------     

        
        
         
        $(function() {
            $( "#tabs-containerID" ).tabs({
                activate: function (event, ui) {
                    activeTab = $('#tabs-containerID').tabs('option', 'active');
                    //$.alert( 'Active tab is: ' + activeTab );
                    switch ( activeTab ) {
                        case 0:
                            //Processing for page 0.
                            break;
                        case 1:
                            //Processing for page 1.
                            if ( ctrlWindowInitialized ) {
                                //Update the Dygraph.
                                //$.alert( 'Calling updateCtrlDygraph from tabs setup...' );
                                updateCtrlDygraph();
                            } else {
                                //Initialize the ctrl window and display Dygraph.              
                                //$.alert( 'Calling loadCtrlDygraph from tabs setup...' );
                                initCtrlWindow();
                                loadCtrlDygraph();
                                updateCtrlDygraph();
                                ctrlWindowInitialized = true;
                            }; 
                            break;
                        default:
                            //Processing for undefined tab.
                    };
                }
                
             });
        }); 


        //Set up tabs click handler.
        //activeTab = $( "#tabs-containerID" ).tabs( "option", "active" );
        //$( "#tabs-containerID" ).on( "click", function() {
        //});

        //------- Main Window ---------
        //Plot out chart
        var g2 = new Dygraph(
            document.getElementById("graphdiv2"),
            "../logfile.csv", { 
                labelsDiv: document.getElementById('legend-containerID'),
                title: "Temperature and Humidity",
                labels: chartLabels, 
                colors: chartColors,
                axisLineWidth: 4,
                animatedZooms: true,
                gridLineColor: '#ccc',
                gridLineWidth: '0.1px',
                strokeWidth: 1,
                displayAnnotations: true,
                strokeWidth: 3,
                axisLabelFontSize: 14,
                rollPeriod: rollPeriod,
                showRoller: true,
                //ylabel: 'Temp or RH (%)',
                xlabel: 'Time',
                highlightCircleSize: 2,
                /* highlightSeriesOpts: {
                    strokeWidth: 1.5,
                    strokeBorderWidth: 1,
                    highlightCircleSize: 5
                }, */
                //legend: 'always',
                labelsSeparateLines: true,
                series: {
                    Door1_Open: { fillGraph: true },
                    Door2_Open: { fillGraph: true }
                }
                
            }          
        );

        //Add annotations to Dygraph
        g2.ready( function() { 
           annots = loadAnnots();
        });

        //Load annotations from alarms logfile into array
        function loadAnnots() {
            var buffer1 ="";
            var retVal = [];
           
            $.get( alarmsLogFile ).done(function( buffer1 ) {
                //If success, do this here.
                retVal = processAnnotations( buffer1 );
                g2.setAnnotations( retVal );
                
            }).fail(function( jqxhr, textStatus, error ) {
                var err = textStatus + ", " + error;
                $.alert( "Could not open alarms logfile: " + err );
            });
             
            //$.alert( "retVal[1].text = " + retVal[1].text );
            return retVal;
        };

        //ProcessAnnotations: callback function of loadAnnots() to parse buffer of CSV data into array of objects
        function processAnnotations( buffer2 ) {
            var textLines = buffer2.split(/\r\n|\n/);
            //var fields = textLines[0].split(',');
            var jsonLine;
            var ants = [];
            
            for (var i=0; i < textLines.length; i++) {
                var data = textLines[i].split(',');
                //data[0] = date, data[1] = seriesKey (minus one), data[2] = text
                var seriesKey = parseInt( data[1] );
                var series1 = chartLabels[ seriesKey + 1 ];
                jsonLine = 
                  {
                    series: series1,
                    x: data[0],
                    shortText: parseInt(i + 1),
                    text: "Alarm " + parseInt(i + 1) + ": " + data[2]
                };
                ants[i] = jsonLine;
            };
       
            //alert( "Line1 = " + ants[1].text );
            return( ants );

        };
        
        
        //updateDisplayOptions: updates list of available data to plot
        function updateDisplayOptions( cfg, labels, colors ) {
            dispTemp1ID.innerHTML = labels[1];
            dispHumi1ID.innerHTML = labels[2];
            dispTemp2ID.innerHTML = labels[3];
            dispHumi2ID.innerHTML = labels[4];
            dispOW1ID.innerHTML  =  labels[5];
            dispOW2ID.innerHTML  =  labels[6];
            dispOW3ID.innerHTML  =  labels[7];
            dispOW4ID.innerHTML  =  labels[8];
            dispOW5ID.innerHTML  =  labels[9];
            dispOW6ID.innerHTML  =  labels[10];
            dispOW7ID.innerHTML  =  labels[11];
            dispOW8ID.innerHTML  =  labels[12];
            dispAmpsID.innerHTML =  labels[13];
            dispDoor1ID.innerHTML = labels[14];  

            //Use the stored colors
            $("#dispTemp1ID").css("color", colors[0] );       
            $("#dispHumi1ID").css("color", colors[1] );
            $("#dispTemp2ID").css("color", colors[2] );       
            $("#dispHumi2ID").css("color", colors[3] );       
            $("#dispOW1ID").css("color", colors[4] );       
            $("#dispOW2ID").css("color", colors[5] );       
            $("#dispOW3ID").css("color", colors[6] );       
            $("#dispOW4ID").css("color", colors[7] );       
            $("#dispOW5ID").css("color", colors[8] );       
            $("#dispOW6ID").css("color", colors[9] );       
            $("#dispOW7ID").css("color", colors[10] );       
            $("#dispOW8ID").css("color", colors[11] );       
            $("#dispAmpsID").css("color", colors[12] );
            $("#dispDoor1ID").css("color", colors[13] );                     
                 
        };

        //------- End of Main Window ---------

        //------- Controller Window ----------
        //Set up selectmenu
        //$( "#ctrl-selectID" ).selectmenu( {
        //       width: 200
        //});

        //Initialize controller window.
        //initCtrlWindow(); 
        //loadCtrlDygraph();


        //------- End of Controller Window ----------
        
    
        /* ----------------DIALOGS-----------------------------*/  
        //Set up button handlers for main banner.
 
        //On button click, open Config dialog
        $( "#config-buttonID").button().click(function( event ) {
            event.preventDefault();
            
            //Check password before opening config dialog
            //var validPW = true; //checkPW( clientConfig.passWord );
            if ( pwCorrect ) {
                $( "#config-dialogID" ).load( "config.html", function(){
                    returnConfig = configDialogData( clientConfig );
                    //returnCtrls = ctrlsDialogData( clientCtrls );
                    $( "#cfgInfoID" ).tabs( {active: 0} );
                    $( "#config-dialogID" ).dialog( "open" );
                });
            };
            
        });

        //On button click, open Ctrls dialog.
        $( "#ctrls-buttonID").button().click(function( event ) {
            event.preventDefault();
            if ( pwCorrect ) {
                $( "#ctrls-dialogID" ).load( "controllers.html", function(){
                    //Should probably request socket for new ctrl data and place the init routine in the callback.
                    //Send a copy of initialized newCtrl to controllers.html
                    sendNewCtrl( newCtrl );
                    var tempData = ctrlsDialogData( clientCtrls, 0 ); //ctrlsDialogData( clientCtrls, currCtrls );
                    returnCtrls = tempData.retCtrls;
                    //currIndex = tempData.retIndex;
                    //$.alert( JSON.stringify( returnCtrls ), 'INDEX ctrls-ButtonID setup: returnCtrls...' );
                    $( "#ctrls-dialogID" ).dialog( "open" );
                });
            };
        }); 

        //On button click, open Alarms dialog
        $( "#alarm-buttonID").button().click(function( event ) {
            event.preventDefault();
            if ( pwCorrect ) {
                $( "#alarm-dialogID" ).load( "alarms.html", function(){
                    returnAlarms = alarmsDialogData( clientAlarms );
                    $( "#almInfoID" ).tabs( {active: 0} );
                    $( "#alarm-dialogID" ).dialog( "open" );
                });
            };
        }); 
        
        //On button click, open Help dialog
        $( "#help-buttonID").button().click(function( event ) {
            event.preventDefault();
            $( "#help-dialogID" ).load( "./help/help.html" );
            $( "#help-dialogID" ).dialog( "open" );
        });

 
        //Set up dialogs and load data into these.  
        //Open Config dialog and save data on 'Save'
        $(function() {
           
            $( "#config-dialogID" ).dialog({
                autoOpen: false,
                resizable: false,
                width: 720,
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
                }
            });
            $( "#config-dialogID" ).dialog({
                
                buttons: [
                    { 
                        text: "Save",
                        click: function() {
                            //If valid config data, Save data to clientConfig.
                            if ( validateConfigData( returnConfig ) ) {
                                clientConfig = JSON.parse( JSON.stringify( returnConfig ) );
                                socket.emit( "changeConfig", clientConfig );
                            };
                            $( this ).dialog("close");
                        }
                    }, { 
                        text: "Cancel",
                        click: function() {
                            //Don't save data and don't notify server.
                            //Just exit out.
                            $( this ).dialog("close");
                        }
                    }, {
                        text: "Apply",
                        click: function() {
                            //If valid ctrls data, Save data to clientConfig.
                            if ( validateConfigData( returnConfig ) ) {
                                clientConfig = JSON.parse( JSON.stringify( returnConfig ) );
                                socket.emit( "changeConfig", clientConfig );
                            };
                        }
                    }
                ]
                
            });
        });
        
        //Set up Controllers dialog button handlers.
        $(function() {
           
            $( "#ctrls-dialogID" ).dialog({
                autoOpen: false,
                resizable: false,
                width: 720,
                height: 680,
                modal: false,   
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
                }
            });
            $( "#ctrls-dialogID" ).dialog({
                buttons: [
                    { 
                        text: "Save",
                        /*icons: {
                            primary: "ui-icon-heart"
                        }, */
                        click: function() {
                            //Make a copy of ctrlIndex so we can reopen ctrls dialog with this selected.
                            //currIndex = sendCtrlIndex();

                            //If valid controllers data, save data to clientCtrls.
                            returnCtrls = validateCtrlsData();
                            if( returnCtrls ) {
                                clientCtrls = JSON.parse( JSON.stringify( returnCtrls ) );
                                //$.alert( JSON.stringify( clientCtrls ), 'INDEX.html - clientCtrls...' );
                                socket.emit( "changeCtrls", clientCtrls );
                            };
                            $( this ).dialog("close");
                        }
                    }, { 
                        text: "Cancel",
                        click: function() {
                            //Make a copy of ctrlIndex so we can reopen ctrls dialog with this selected.
                            //currIndex = sendCtrlIndex();

                            //Don't save data and don't notify server.
                            //Just exit out.
                            $( this ).dialog("close");
                        }
                    }
                ]
                
            });
        });

        //Open Alarm dialog and save data on 'Save'
        $(function() {
           
            $( "#alarm-dialogID" ).dialog({
                autoOpen: false,
                resizable: false,
                width: 720,
                //height: 480,
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
                }
            });
            $( "#alarm-dialogID" ).dialog({
                
                buttons: [
                    { 
                        text: "Save",
                        click: function() {
                            //If valid data, Save data to configLocal and close the dialog box.
                            if ( validateAlarmsData( returnAlarms )) {
                                clientAlarms = JSON.parse( JSON.stringify( returnAlarms ) );
                                socket.emit( "changeAlarms", clientAlarms );
                            };
                            $( this ).dialog("close");
                            //$.alert( 'Current ctrlIndex: ' + currIndex );

                        }
                    }, { 
                        text: "Cancel",
                        click: function() {
                            //Don't save data and don't notify server.
                            //Just exit out.
                            $( this ).dialog("close");
                            //$.alert( 'Current ctrlIndex: ' + currIndex );

                        }
                    }
                ]
                
            });
        });

        //Open help dialog. Close when item selected.
        $(function() {
            $( "#help-dialogID" ).dialog({
                autoOpen:false,
                resizable: false,
                width: 400,
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
                }
            });
            $( "#help-dialogID" ).dialog({
                buttons: [
                    { 
                        text: "OK",
                        click: function() {
                            $( this ).dialog("close");
                        }
                    }
                ]
            });
        });
      
 

    // On page load, get config.json and Password protect page.
    $(document).ready(function() {
        //Load config.json and pass parameters into clientConfig
        var tempConfig;


        $.getJSON( "config.json" )
            .done(function( tempConfig ) {
                if (tempConfig.pwProtect) {
                    checkPW( tempConfig.passWord );
                } else {
                    pwCorrect = true;
                };
                clientConfig = JSON.parse( JSON.stringify( tempConfig ) );

                //Load jQuery tooltips.
                $( "*" ).tooltip();

                if ( clientConfig.showTooltips ) {
                    showTooltips( true );  //Toggle tooltip visibility.
                } else {
                    showTooltips( false );
                };

            })
            .fail(function( jqxhr, textStatus, error ) {
                var err = textStatus + ", " + error;
                $.alert( "Request Failed: " + err );
                checkPW( "WinePi" );
        });

        //Load ctrls window.
        initCtrlWindow();

        //Load ctrl dygraph.
        loadCtrlDygraph();

        //Load it again.
        loadCtrlDygraph();

        //Load alarms.json and show alarm if it is active.
        $.getJSON( "alarms.json" )
            .done(function( tempAlarms ) {
                if (tempAlarms.alarmString !=="") {
                    showAlarmNotification( tempAlarms );
                };
            }) 
            .fail(function( jqxhr, textStatus, error ) {
                var err = textStatus + ", " + error;
                $.alert( "Could not open alarms file! Error code: " + err );
        }); 
    });

    //showTooltips: Turn on (or off) tooltip visibility.
    function showTooltips( isTrue ) {
        if ( isTrue ) {
             $( "*" ).tooltip( "enable" );
        } else {
             $( "*" ).tooltip( "disable" );
             //$( "*" ).removeAttr( "title" );
             $( "*" ).live( "hover", hideTips );
        };
    };

    //Suppress display of all tooltips.
    function hideTips( event ) {  
        var saveAlt = $( this ).attr('alt');
        var saveTitle = $( this ).attr('title');
        if ( event.type == 'mouseenter' ) {
            $( this ).attr('title','');
            $( this ).attr('alt','');
        } else {
            if ( event.type == 'mouseleave' ){
                $( this ).attr('alt',saveAlt);
                $( this ).attr('title',saveTitle);
            };
        };
    };


    //checkPW: Check password before allowing entry. 
    function checkPW( passWord ) {       
        var returnPW;
        //$("#cfgPW-containerID").parents('ui-dialog').first().find('ui-button').first().click();
        //$('.ui-dialog-buttonpane > button:last').focus();
                
        $( "#cfgPW-containerID" ).dialog( {
            autoopen: false,
            resizable: false,
            title: "Enter Password...", 
            modal: true, 
            dialogClass: "no-close",
            closeOnEscape: false,
            open: function(event, ui) { 
                $(".ui-dialog-titlebar-close").hide();
                $(".ui-dialog-buttonpane button:eq(0)").focus(); 
            }, 
            
            buttons: [
                { 
                    text: "Submit",
                    type: "submit",
                    open: function() {
                    //    $(this).parent('.ui-dialog-buttonpane button:eq(0)').focus(); 
                    
                    },
                    click: function() {
                        //form.submit();
                        //Check to see if password correct
                        returnPW = $( "#cfgPwID" ).val();
                        if ( returnPW === passWord ) {
                            pwCorrect = true;
                            $( this ).dialog( {title: "Password correct" } );
                        } else {
                            pwCorrect = false;
                            $( "#cfgPW-configID").effect( "shake").delay(10000);
                            $( this ).dialog( {title: "Password incorrect!!!" }).effect( "shake");
                            delay(3000);
                            window.location.reload(); 
                        };
                        $( this ).dialog("close");
                    }
                },
            ]
        }); 

               
        return returnValue;
    };

    //showAlarmsNotification: shows a dialog box describing alarm condition.
    function showAlarmNotification( alarms1 ) {
        var notifyTitle = "Alarm triggered!!!";
        var notifyText = alarms1.alarmString;
        $.alert( notifyText, notifyTitle );
    };

    //showCompressBox: show a progressbar tracking compression of logfile
    function showCompressBox() {
        var progressbar = $( "#compressBarID");
        $( ".compressBar-label" ).text("Compressing Log File...");
        var progressLabel = $( ".compressBar-label" );
        progressLabel.text( "Starting..." );
        $("#compressBoxID").dialog({
            autoopen: false,
            resizable: false,
            title: "Compressing Logfile", 
            modal: true, 
            dialogClass: "no-close",
            closeOnEscape: false,
            open: function(event, ui) { 
                // Remove the closing 'X' from the dialog
                $(".ui-dialog-titlebar-close").hide(); 
                $(".ui-dialog-buttonpane button:contains('Ok')").button("disable");
                //$(".ui-dialog-buttonpane").hide();
            }, 
            /* buttons: {
                "Ok": function() {
                    $(this).dialog("close");
                    //okAction();
                },
                "Cancel": function() {
                    $(this).dialog("close");
                }
            }, */
            close: function(event, ui) { $(this).remove(); },
            
        });
       
        progressbar.progressbar({
            value: false,
            change: function() {
                progressLabel.text( progressbar.progressbar( "value" ) + "%" );
            },
            complete: function() {
                progressLabel.text( "Completed!" );
                setTimeout( progress, 2000 );
            }
        });

                   
        function progress() {
           var val = progressbar.progressbar( "value") || 0;

           progressbar.progressbar( "value", val + 1 );
           if ( val < 99 ) {
               setTimeout( progress, 100 );
           };
        };
        setTimeout( progress, 3000 );
    };  

    //closeCompressBox: removes box that informs about status of logfile compression
    function closeCompressBox( data ) {
        //progressbar.progressbar( "value", 100);
        //$( "#compressBarID").text( "Completed!" );
        setTimeout( killCompressBox, 2000);
        if (data ) {
            $.alert( 'Error compressing logfile. Error: ' + data, 'Error' );
        };
    };

    //KillCompressBox
    function killCompressBox() {
        $( "#compressBarID").progressbar( "destroy" );
        $( "#compressBoxID").dialog("destroy");
        $( "#compressBarID").text( "" );
        $( ".compressBar-label" ).text( "" );
    };
    
    //Make a nicer alert() box
    $.extend({ alert: function (message, title) {
        $("<div></div>").dialog( {
            buttons: { "Ok": function () { $(this).dialog("close"); } },
            close: function (event, ui) { $(this).remove(); },
            resizable: false,
            title: title,
            modal: true
        }).text(message); }
    });

    //Make a nicer confirm() box
    // Usage:
    //    $.confirm(
    //        "message",
    //        "title",
    //        function() { /* Ok action here*/
    //        });
    $.extend({
        confirm: function(message, title, okAction) {
            $("<div></div>").dialog({
                // Remove the closing 'X' from the dialog
                open: function(event, ui) { $(".ui-dialog-titlebar-close").hide(); }, 
                buttons: {
                    "Ok": function() {
                        $(this).dialog("close");
                        okAction();
                    },
                    "Cancel": function() {
                        $(this).dialog("close");
                    }
                },
                close: function(event, ui) { $(this).remove(); },
                resizable: false,
                title: title,
                modal: true
            }).text(message);
        }
    });

    //debugInfo: show debug info in debugDivID at bottom of screen
    function debugInfo( text ) {
        var timeNow = new Date();
        var debugStr = timeNow + " - " + text;
        $( "#debugTextID" ).text( debugStr );
    };

    //Initialize controller window.
    function initCtrlWindow() {

        //Set up selectmenu
        $( "#ctrl-selectID" ).selectmenu( {
               width: 220
        });

        //First, destroy the selectmenu options in case it has been initialized before.
        $('#ctrl-selectID').find('option').remove().end();

        //Initialize selectmenu options.
        //alert( 'clientCtrls: ' + JSON.stringify( clientCtrls ) );
        var i = 0;
        for (i = 0; i < clientCtrls.length; i++ ) {
            $("#ctrl-selectID")
                .append($("<option></option>")
                .attr("value", i )
                .text( (clientCtrls[i].cfg.deleteFlag ) ? 'Deleted' : i.toString() + '-' + clientCtrls[i].cfg.name))
            //Disable options with deleteFlag == true;
            if ( clientCtrls[i].cfg.deleteFlag == true ) {
                document.getElementById("ctrl-selectID").options[i].disabled = true;
            };
        };

        //$( "#ctrl-selectID" ).selectmenu( "refresh" );
        //Load the last control accessed into selectmenu.
        $( "#ctrl-selectID" ).val( currIndex );
        $( "#ctrl-selectID" ).selectmenu('refresh'); 

        //Get the currently selected option and pull up data.
        $("#ctrl-selectID" ).on( "selectmenuselect", function( event, data ) {
            currIndex = data.item.index;
            showCtrlData();
            loadCtrlDygraph();
            updateCtrlDygraph();
        });
  
        //Show the data for currently selected item. 
        showCtrlData();

        //Setup profile buttons.
        initProfileButtons();

        //Load dygraph for selected controller.
        //loadCtrlDygraph(); 
   
    };

    //showCtrlData() - show the data for currently selected controller in controller window.
    function showCtrlData() {
        $( "#ctrl-nameID" ).attr( 'style', 'margin-right: 10px; font-weight: bold;' );
        $( "#ctrl-nameID" ).text( clientCtrls[currIndex].cfg.logFileName );
        $( "#ctrl-sensorID" ).attr( 'style', 'margin-right: 10px; font-weight: bold;' );
        $( "#ctrl-sensorID").text( clientCtrls[currIndex].cfg.sensor );
        $( "#ctrl-statusID" ).attr( 'style', 'margin-right: 10px; font-weight: bold;' );
        $( "#ctrl-statusID").text( clientCtrls[currIndex].isActive ? 'Active' : 'Inactive' );
        $( "#ctrl-profileID" ).attr( 'style', 'margin-right: 10px; font-weight: bold;' );
        var profileString = clientCtrls[currIndex].cfg.profileName;
        if (profileString == '' ) {
            profileString = '(not used)';
        } else {
            profileString = clientCtrls[currIndex].cfg.profileName + ' (' + 
            ( clientCtrls[currIndex].cfg.tprofActive ? 'Running)' : 'Stopped)' );
        };   
        $( "#ctrl-profileID").text( profileString );
    };

    //loadCtrlDygraph() - Loads the dygraph for selected control based on logFileName.
    function loadCtrlDygraph() {
        var ctrlFileName = './ctrlDefault.csv';
        var ctrlTitle = clientCtrls[currIndex].cfg.type == 'TEMP' ? 'Temperature vs. Output' : 'Humidity vs. Output';
        var ctrlChartLabels = ['Time','Input','Setpoint','Heating','Cooling'];
        var ctrlChartColors = [ 'rgb(0,0,0)', 'rgb(10,204,23)', 'rgb(252,121,136)', 'rgb(0,236,252)' ];
        var ctrlXlabel = 'Time'; 
        var ctrlYLabel = clientCtrls[currIndex].cfg.type == 'TEMP' ? 'Temp (' + clientConfig.tempScale + ')' : ' RH (%)'; 
        //alert('Debug', 'Y-axis label is:' + ctrlYlabel );
        
        g4 = new Dygraph(
            document.getElementById("ctrl-graph-areaID"),
            ctrlFileName, { 
                labelsDiv: document.getElementById('ctrl-graph-legendID'),
                title: ctrlTitle,
                labels: ctrlChartLabels, 
                colors: ctrlChartColors,
                axisLineWidth: 4,
                animatedZooms: true,
                gridLineColor: '#ccc',
                gridLineWidth: '0.1px',
                strokeWidth: 1,
                displayAnnotations: false,
                strokeWidth: 3,
                axisLabelFontSize: 14,
                rollPeriod: 1,
                showRoller: true,
                ylabel: ctrlYLabel,
                y2label: 'Output (%)',
                xlabel: ctrlXlabel,
                highlightCircleSize: 2,
                //legend: 'always',
                labelsSeparateLines: true,
                series: {
                    Heating: { fillGraph: false, axis: 'y2' },
                    Cooling: { fillGraph: false, axis: 'y2' }
                },
                axes: {
                	y2: {
                	    valueRange: [0, 100],
                        axisLabelFormatter: function(y2) {
                            return "" //Number( y2.toFixed() ) 
                        }    
                	}    
                }
            }          
        );
    };

    //updateCtrlDygraph() - Updates loaded Controller Dygraph.
    function updateCtrlDygraph() {
        //debugInfo( 'Updating ctrl dygraph...', 'Status' );
        var ctrlFileName = './controls/' + clientCtrls[currIndex].cfg.logFileName;
        if (g4 ) {
            g4.updateOptions({
                file: ctrlFileName               
            });
        };
    };


    
    //initProfileButtons() - Loads button handlers for profile buttons in Controller tab.
    function initProfileButtons() {

        //On ctrlOpenProfBtnID, open profiles dialog (inside profiles.html).
        $( "#ctrl-openProfBtnID" ).button().click( function(event) {

            //Open a new dialog and load grid into it.
            clientCtrls = editProfile2( clientCtrls, currIndex );
                
        });

        //On ctrlActiveProfBtnID, toggle tprofActive flag.
        //First, need to set up button value based on status.
        //Set up the button with jquery.
        $( "#ctrl-activateProfBtnID" ).button();
        setProfBtnState();
        $( "#ctrl-activateProfBtnID" ).button().click( function(event) {
            if ( clientCtrls[currIndex].cfg.tprofActive == false ) {
                clientCtrls[currIndex].cfg.tprofActive = true;
                setProfBtnState();
                $.alert( 'Starting profile ' + clientCtrls[currIndex].cfg.profileName + ' on controller ' +
                    currIndex + ' (' + clientCtrls[currIndex].cfg.name + ')...', 'Profile Started');
            } else {
                $.confirm( 'Are you sure you wish to stop this profile?' + 
                     '\nThis will require a restart of the profile.' , 'Stop profile?', function() {
                    clientCtrls[currIndex].cfg.tprofActive = false;
                    setProfBtnState();
                });
            };
        });     


    };

    
    //setButtonState() - sets button state(s) for selected controller.
    function setProfBtnState() {
        if ( clientCtrls[currIndex].cfg.tprofActive == false ) {
            //Set button text to start.
            $( "#ctrl-activateProfBtnID" ).prop('value', "Start Profile" );
            $( "#ctrl-activateProfBtnID").button('refresh');
        } else {
            //Set value to stop.
            $( "#ctrl-activateProfBtnID" ).prop('value', "Stop Profile" );
            $( "#ctrl-activateProfBtnID").button('refresh');
        };
    };

       
    //editProfile() - edit tprofile parameters.
    function editProfile2( ctrls5, index ) {
        var ctrlsNew = JSON.parse( JSON.stringify( ctrls5 ) );
        var tprof1 = ctrls5[index].tprof;
        var retCtrls = [];

        //Set up profiles dialog.    
        $( "#profileDivID" ).dialog( {
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
                    clientCtrls[currIndex].tprof = JSON.parse( JSON.stringify( retData.profile ) );
                    clientCtrls[currIndex].cfg.profileName = retData.profileName;

                    //Update profile name
                    //$.alert( 'profileName: ' + currCtrls[ctrlIndex].cfg.profileName );
                    //$( "#ctrlProfileNameID" ).val( currCtrls[ctrlIndex].cfg.profileName );

                    //Now, need to send the updated clientCtrls object to the server.

                    $( this ).dialog( "close" );
                },
                Cancel: function() {
                    //Just close.
                    $( this ).dialog( "close" );
                }
            }
        }); 
        $( "#profileDivID" ).load("tprofiles.html", function() {
            //Load data into tprofiles.html for editing.
            setupProfileDialog( ctrls5, index ); 
            $( "#profileDivID" ).dialog( "open" );
        }); 
        //$.alert( 'Temperature Profiles would open here...');
        return ctrlsNew;
    };
    