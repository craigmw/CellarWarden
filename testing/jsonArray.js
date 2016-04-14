//jsonArray.js: Test of processing json arrays iteratively (e.g. go cycle through running processes).

var controller = [
    {'id':'0', 'name':'KeezerTemp', 'contType':'hysteresis', 'sensorType':'temp', 'coolPin':'27', 'heatPin':'18','status1':'idling', 'activated':'TRUE' },
    {'id':'1', 'name':'KeezerHumd', 'contType':'PID', 'sensorType':'humd', 'coolPin':'14', 'heatPin':'','status1':'idling', 'activated':'TRUE' },
    {'id':'2', 'name':'Chamber1', 'contType':'PID', 'sensorType':'temp', 'coolPin':'', 'heatPin':'26','status1':'heating', 'activated':'TRUE' },
    {'id':'3', 'name':'Chamber2', 'contType':'PID', 'sensorType':'temp', 'coolPin':'', 'heatPin':'27','status1':'waiting', 'activated':'TRUE' }
];

//Print out the different records:

for (var i = 0; i < controller.length; i++ ) {
    console.log( '[' + controller[i].id + ']' ); 
    console.log( '   Name: \t' + controller[i].name );
    console.log( '   Ctrl type: \t' + controller[i].contType ); 
    console.log( '   Sens type: \t' + controller[i].sensorType );
    console.log( '   Status: \t' + controller[i].status1 );
    
};    
    
 