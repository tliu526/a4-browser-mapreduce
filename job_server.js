/**
 * The Job Server for serving both volunteer and job requests.
 * (c) 2016 Tony Liu, Michael Shaw.
 */

//"Include" statements
var http = require('http');
var structs = require('./structs');

/**** WEB SERVER FUNCTIONS AND VARS ****/
const PORT = 8889;

/**
 * Handles the requests sent to the webserver.
 * TODO actually handle requests
 */
function request_handler(request, response){
    response.end('Hello world! Path hit: ' + request.url);
}


/**** JOB MANAGEMENT FUNCTIONS AND VARS ****/

var map_tasks = []; //Queue of structs.Tasks
var reduce_tasks = []; //Queue of structs.Tasks

var job_id = 0; //Global job ID 


/**
 * Submits a job with the specified map and reduce functions to the job server.
 */
function submit_job(map, reduce, data){
    job_id += 1;
}

/**
 * Splits the data in some manner and places tasks in the map_tasks queue.
 */
function create_map_tasks(map, data, job_id){

}

/**
 * Takes intermediate output from maps, creating and queueing reduce tasks.
 * TODO think about parameters
 */
function create_reduce_tasks(){}


/**** MAIN ****/
function main(){
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
        console.log("Server listening on: http://localhost:%s", PORT);
    });
}

main();