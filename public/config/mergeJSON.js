//mergeJSON.js - updates existing JSON object with new values. 
//  Addresses issue of updates to configuration objects being overwritten
//  by existing configuration objects when loaded from json file.

//Object1 is object stored in file. It may not have updated structure saved in object definition
//  due to updates in program.
var object1 = {
    name: 'Craig',
    age: 50,
    occupation: 'Professor',
    location: 'Irvine, CA'
};

//Object2 is default object/prototype setup during object/structure definition. New fields not in 
//  stored config file will not be overwritten.
var object2 = {
    name: 'Tom',
    age: 49,
    occupation: 'Professor',
    location: 'Salt Lake, UT',
    spouse: 'Kara'
};
process.stdout.write( 'Object1: ' );
console.log( object1 );
process.stdout.write( 'Object2: ' );
console.log( object2 );

//Merge the objects. Object2 is prototype.

var merged = Object.assign( object2, object1 );
process.stdout.write( 'Merged: ' );
console.log( merged );


//Can we get rid of a field if it doesn't exist in the prototype?
//Object1 is prototype.
var merged2 = Object.assign( object1, merged );
process.stdout.write( 'Object1 is prototype to merged: ' );
console.log( merged2 );

