/**
 * The Job Server for serving both volunteer and job requests.
 * TODO stretch goal: be able to service multiple jobs at once, need to track
 * partial results with requester ids, possibly storing them to a DB?
 * (c) 2016 Tony Liu, Michael Shaw.
 */

//"Include" statements
var http = require('http');
http.post = require('http-post');
var url = require('url');
var qs = require('querystring');
var structs = require('./structs');
var map_red = require('./map_red');
var saml = require('./saml_functions');
var XMLWriter = require('xml-writer');
var xmldoc = require('xmldoc');
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var util = require('util');
var JOBS_DB = 'jobs.db';
var exists = fs.existsSync(JOBS_DB);
var sqlite3 = require('sqlite3').verbose();

//signature requirements
var select = require('xml-crypto').xpath;
var dom = require('xmldom').DOMParser;
var SignedXml = require('xml-crypto').SignedXml;
var FileKeyInfo = require('xml-crypto').FileKeyInfo;

var local = true;

/**** WEB SERVER FUNCTIONS AND VARS ****/
const JOB_PORT = 8889;
const IDP_PORT = 8890;
const JOB_SERVER_URL = "http://bmr-cs339.rhcloud.com";
const IDP_URL = "http://idp-cs339.rhcloud.com";
const VOLUNTEER_HTML = "volunteer.html";

//the number of milliseconds volunteers can be live
const LIFETIME = 4000;

//url paths for incoming GET requests
const INDEX = "./job_server_login.html";
const VOLUNTEER_PATH = "/volunteer";
const JS_UPLOAD = "/js_upload";
const DATA_UPLOAD = "/data_upload";
const VOLUNTEER_JS = "/volunteer.js";

const NO_TASK = "DONE"; //the xhr text when there are no outstanding tasks.
const OUTPUT_NAME = "./output.json";
var job_root_url = '';
var idp_root_url = '';

if(local){
    job_root_url = "http://localhost:" + JOB_PORT;
    idp_root_url = "http://localhost:" + IDP_PORT;
}
else {
    job_root_url = JOB_SERVER_URL;
    idp_root_url = IDP_URL;
}


/**
 * Handles the requests sent to the webserver.
 * TODO actually handle requests
 */
 function request_handler(request, response){

    if(request.method == 'GET'){

        console.log(request.url);

        var file_path = '.' + request.url;

        if (file_path == './') {
                //TODO change to index.html
                file_path = './job_server_login.html';
        }

            var ext = path.extname(file_path);
            var content_type = '';
            switch(ext){
                case '.js':
                content_type = 'text/javascript';
                break;

                case '.html':
                content_type = 'text/html';
                break;

                case '.ico':
                content_type = 'image/x-icon';
                break;

                case '.png':
                content_type = 'image/png';
                break;

                case '.json':
                content_type = 'application/json';
                break;

                case '.txt':
                content_type = 'text/plain';
                break;

                default:
                content_type = 'text/html';
                file_path = file_path + '.html';
            }

    	//Send a SAML Authentication Request in an HTML form
    	
    	//Get a base64 encoded SAML AuthnRequest
    	//TODO generalize
    	if(file_path == INDEX){
           var samlRequest = saml.create_saml_authnRequest();
           var htmlFile = 'job_server_login.html';

           var text = fs.readFileSync(htmlFile,'utf8');
           text = text.replace('Put SAML Request here',samlRequest);
           text = text.replace('Put idp url here',idp_root_url);

           response.writeHead(200, {
            'Content-Type' : 'text/html',
            'Content-Length' : text.length,
            'Access-Control-Allow-Origin' : '*'
        });
           response.end(text);
       }

       else{
           fs.readFile(file_path, function(error, content) {
               if (error) {
                response.writeHead(500);
                response.end('Sorry, check with the site adminstrator for error: '+error.code+' ..\n');
                response.end(); 
            }
            else {
                response.writeHead(200, 
                    {'Content-Type' : content_type,
                    'Content-Length' : content.length,
                    'Expires' : new Date().toUTCString(),
                    'Access-Control-Allow-Origin' : '*'
                });
                response.end(content, 'utf-8');
            }
        });
       }
    }

    else if(request.method == 'POST'){
        var ip;
        if(local){ ip = "120.0.0.1"; }
        else { ip = request.headers['x-forwarded-for'][0]; }

        /** CASE 1: If there is uploaded data incoming **/
        if(request.url.includes('_upload')){
            var form = new formidable.IncomingForm();
            form.keepExtensions = true;
            form.parse(request, function(err, fields, files) {

                response.writeHead(301, {
                    Location: job_root_url + 'requester/start_job'
                });
                response.end();
            });

            form.on('end', function(fields, files){

                for(var i = 0; i < this.openedFiles.length; i++){
                    //console.log(this.openedFiles[i].path);
                    var file = this.openedFiles[i];
                    var temp_path = file.path;
                    var ext = path.extname(temp_path);
                    console.log("file extension: " + ext);
                    console.log("type?: " + file.type);
                    
                    if(request.url == JS_UPLOAD){

                        console.log("received map_reduce functions");
                        requester_funcs = require(temp_path);
                        add_user_func(ip, requester_funcs);
                    }
                    else if(request.url == DATA_UPLOAD){
                        var text = fs.readFileSync(temp_path,'utf8');
                        console.log("received data");
                        switch(ext){
                            case '.json':
                            requester_data = JSON.parse(text);
                            add_user_json_data(ip, requester_data);
                            break;

                            case '.txt':
                            add_user_txt_data(ip, file.name, text);
                            break;
                        }
                    }
                }
            });
            return;
        }

        //Get post data, determine type of post based on attributes
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function() {
            var post = qs.parse(body);
            
            /** CASE 2: redirect to volunteer page **/
            if(post.Volunteer != null){

                var token = new Date().getTime();
                var expires = token + 86400000;
                send_new_user(token,expires);

                var html = fs.readFileSync('volunteer.html','utf8');
                html = html.replace('Put token here',token);

                response.writeHead(200, {
                    'Content-Type' : content_type,
                    'Content-Length' : html.length,
                    'Expires' : new Date().toUTCString(),
                    'Access-Control-Allow-Origin' : '*'
                });
                response.end(html, 'utf-8');
            }

            /** CASE 3: have a volunteer task request **/
            else if(post.task_req != null){
                console.log('volunteer task request received');

                var content = process_volunteer_request();
                //we have an idle volunteer, with no tasks outstanding
                if(content == NO_TASK){
                    //NOTE, returns undefined when testing locally
                    add_volunteer(request.headers['x-forwarded-for']);
                }

                response.writeHead(200, {
                    'Content-Type' : 'text/html',
                    'Content-Length' : content.length,
                    'Expires' : new Date().toUTCString(),
                    'Access-Control-Allow-Origin' : '*'
                });
                response.end(content);   
            }

            /** CASE 4: Volunteer output received **/
            else if(post.task_id != null){
                console.log('volunteer data received');
                var task_id = post.task_id;
                var data = post.result;
                var data = JSON.parse(data);
                var content = process_volunteer_output(task_id, data);

                //continue servicing outstanding jobs
                if(content != null){
                    response.writeHead(200, {
                        'Content-Type' : 'text/html',
                        'Content-Length' : content.length,
                        'Expires' : new Date().toUTCString(),
                        'Access-Control-Allow-Origin' : '*'
                    });
                    response.end(content);                    
                }
                else {
                    response.end('Thank ya for volunteering!');
                }
            }

	        //CASE 5: SAML Response
	        else if(post.SAMLResponse != null) {
                var status = saml.validate_response(post.SAMLResponse);
                console.log(status);  
                var redirectPage = '';
                switch(status) {
                    case 'INVALID SIGNATURE':
                        redirectPage = job_root_url + '/invalid_signature.html';
                        break;
                    case 'INVALID IDP':
                        redirectPage = job_root_url + '/invalid_idp.html';
                        break; 
                    case 'EXPIRED ASSERTION':
                        redirectPage = job_root_url + '/expired_assertion.html';
                        break;
                    case 'NOT A RESOURCE VOLUNTEER':
                        redirectPage = job_root_url + '/not_volunteer.html';
                        break;
                    case 'VALIDATED RESOURCE VOLUNTEER':
                        redirectPage = job_root_url + '/requester';
                        break;
                    default:
                        console.log('error');
                }
                console.log(redirectPage);

               response.writeHead(301, {
                    Location : redirectPage
               });
               response.end();
           
            }
            //CASE 6: Job requester requesting job starting
            else if(post.num_maps != null){
                var num_maps = parseInt(post.num_maps);
                var num_reds = parseInt(post.num_reduces);
                submit_job(user_requests[ip], num_maps, num_reds);
                delete user_requests[ip];

                var content = "Job started";

                response.writeHead(200, {
                    'Content-Type' : 'text/html',
                    'Content-Length' : content.length,
                    'Expires' : new Date().toUTCString(),
                    'Access-Control-Allow-Origin' : '*'
                });
                response.end(content);
            }

            //CASE 7: Job requester requesting current job status
            else if(post.job_status != null){
                var content = "0,0,0";
                if(cur_job != null){
                    //if(!cur_job.is_complete()){
                        content = cur_job.get_progress();

                        response.writeHead(200, {
                            'Content-Type' : 'text/html',
                            'Content-Length' : content.length,
                            'Expires' : new Date().toUTCString(),
                            'Access-Control-Allow-Origin' : '*'
                        });
                        response.end(content);   
                    //}
                    /*
                    else {
                        
                        var stat = fs.statSync(OUTPUT_NAME);
                        var readStream = fs.createReadStream(OUTPUT_NAME);
                        response.writeHead(200, {
                            'Content-Type' : 'application/json',
                            'Content-Length' : stat.size,
                            'Expires' : new Date().toUTCString(),
                            'Content-Disposition': 'attachment; filename='+OUTPUT_NAME,
                            'Access-Control-Allow-Origin' : '*'
                        });
                        readStream.pipe(response);
                        response.end();
                       
                    }
                    */
                }
            }

            else if(post.job_id != null) {
                download_output(post.job_id, function(content){
                    console.log("Content:");
                    console.log(content);
                    response.writeHead(200, {
                        'Content-Type' : 'text/html',
                        'Content-Length' : content.length,
                        'Expires' : new Date().toUTCString(),
                        'Access-Control-Allow-Origin' : '*'
                    });
                    response.end(content);   
                });
            }

        });
    }
}

/**
 * Send a new user's token to the IDP to allow for future authentication
 */
 function send_new_user(newUser,expires) {
    http.post(idp_root_url,{ newUser: newUser, expires: expires}, function(res) {
        //response.setEncoding('utf8');
        res.on('data',function(chunk) {
            //console.log(chunk);
        });
    });
}

/**** JOB MANAGEMENT FUNCTIONS AND VARS ****/


var jobs = new structs.Queue(); //A queue of jobs managed by the job server
var cur_job = null;

//a dict of partial user requests
var user_requests = {};

var avail_volunteers = {}; //tracks the number of available (idle) volunteers

/**
 * adds uploaded user json data to user_reqs.
 */
function add_user_json_data(user_ip, data){

    if(!(user_ip in user_requests)){
        user_requests[user_ip] = new structs.Task(user_ip);
    }
    user_requests[user_ip]['data'] = data;
}

/**
 * Adds uploaded user txt data to user_reqs. Note that txt files will be read in
 * as an entry in data as a [filename, text] tuple. 
 */
function add_user_txt_data(user_ip, file_name, data){
    
}

/**
 * adds uploaded user func to user_reqs
 * Note: func is an object carrying the map and reduce functions.
 */
function add_user_func(user_ip, func){
    if(!(user_ip in user_requests)){
        user_requests[user_ip] = new structs.Task(user_ip);
    }
    user_requests[user_ip]['func'] = func;
}

/**
 * Submits a job with the specified map and reduce functions to the job server. 
 */
function submit_job(task, num_maps, num_reds){
    console.log("submitting job!");
    var funcs = task['func'];
    var data = task['data'];
    if ((funcs.map == undefined) || (funcs.reduce == undefined)) {
        //TODO send error message to user
    }
    var job = new map_red.Job(funcs.map, funcs.reduce, data, num_maps, num_reds);
    job.insert_job();
    jobs.enq(job);
}

/**
 * Assigns a task (if any are available) to a volunteer. Returns a JSON object
 */
 function process_volunteer_request(){
    if((cur_job != null) && !(cur_job.is_complete())){
        var task = cur_job.get_task();
        //need to stringify the array of arrays
        if(task != null){
            task['data'] = JSON.stringify(task['data']);
            return JSON.stringify(task);
        }
        else {
            return NO_TASK;
        }
    }
    else {
        return NO_TASK;
    }
}

/**
 * Processes the data returned from the volunteer request, and updates the cur_job.
 * Then, redirects volunteer to a new task.
 * 
 * Returns a JSON array of [data, script].
 */
 function process_volunteer_output(task_id, data){
    cur_job.submit_output(task_id, data);

    if(cur_job.is_complete()){
        console.log("Complete output:");
        write_output(OUTPUT_NAME);
        return NO_TASK;
    }
    else{
        return process_volunteer_request();
    }
}
/**
 * Writes the current job's finished output to out_name.
 */
function write_output(out_name){
    if (cur_job.is_complete()) {
        var db = new sqlite3.Database(JOBS_DB);
        var stmt = 'UPDATE JOBS SET ISCOMPLETE = \'TRUE\', OUTPUT = ? WHERE ID = ?;';
        var data = structs.escape_sql_str(JSON.stringify(cur_job.get_output()));  
        db.run(stmt, data, cur_job.id,function(err) {
            if (err != null) {
                console.log('An error occured while submitting job output');
            } else {
                console.log('Saved job output for job ' + cur_job.id);
            }   
        });
        db.close();
    }
}

/**
 * Maintains and updates the avail_volunteers dict.
 * (K,V) = (IP, timestamp). We remove entries that are stale.
 */
 function add_volunteer(ips){
    if(ips != undefined){
        var ip = ips.split(", ")[0];
        avail_volunteers[ip] = Date.now();
    }
}

/**
 * Checks avail_volunteers for "stale" volunteer nodes
 */
 function update_volunteers(){
    var cur_time = Date.now();

    for( var key in avail_volunteers){
        if(avail_volunteers.hasOwnProperty(key)){
            if ((cur_time - avail_volunteers[key]) > LIFETIME) {
                delete avail_volunteers[key];
            }
        }
    }


    var num_vols = Object.keys(avail_volunteers).length;
    console.log("There are currently " +  num_vols + " volunteers available");

    return num_vols;
}

function download_output(jobId, callback) {
    var db = new sqlite3.Database(JOBS_DB);
    var stmt = 'SELECT OUTPUT FROM JOBS WHERE ID = ?';
    var output = 'nothing';
    db.get(stmt,jobId,function(err,row) {
        if (err != null) {
            console.log('Error downloading output for job ' + jobId);
        } else {
            output = row.OUTPUT;
        }
    });
    db.close(function(err){
        if(err != null){
            console.log('error closing db');
        }
        else{
            callback(output);
        }

    });
}

/**** MAIN ****/
function main(){
    var server = http.createServer(request_handler);

    if(local){
        server.listen(JOB_PORT, function(){
            console.log("Server listening on: http://localhost:%s", JOB_PORT);
        });
    }
    //For deployment on OpenShift
    else {
        var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
        var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

        server.listen(server_port, server_ip_address, function () {
            console.log( "Listening on " + server_ip_address + ", server_port " + server_port )
        });
    }
    
    check_jobs();
    //check_volunteers();
}


function check_volunteers(){
    update_volunteers();
    setTimeout(check_volunteers, 3000);
}
/**
 * looping function that checks job status and updates the current job appropriately.
 */
function check_jobs(){
    console.log("checking jobs");
    if(cur_job == null){
        if(jobs.size() > 0){
            cur_job = jobs.deq();
            cur_job.create_map_tasks();
        }
    }
    else if(cur_job.is_complete()){
        if(jobs.size() > 0){
            cur_job = jobs.deq();
            cur_job.create_map_tasks();
        }
    }
    else {
        console.log(cur_job.print_progress());
    }
    setTimeout(check_jobs, 3000);
}

function test(){
    
    var data = [
    ['frase primera', 'primer trozo de informacion para procesado primer trozo'],
    ['segunda frase', 'segundo trozo de informacion trozo de'],
    ['cacho 3', 'otro trozo para ser procesado otro otro otro trozo'],
    ['cuarta frase', 'primer trozo de informacion para procesado primer trozo'],
    ['frase 5', 'segundo trozo de informacion trozo de'],
    ['sexto cacho', 'otro trozo para ser procesado otro otro otro trozo']
    ];

    var job = new map_red.Job(wc_map, wc_red, data);
    var num_tasks = job.create_map_tasks(6);
    console.log("The number of map tasks:" + num_tasks);
    var str = JSON.stringify(data);
    console.log(str);
    cur_job = job;
}

//TEST MAP FOR MAPREDUCE
function wc_map(k, v){
    var vals = v.split(" ");
    var res = [];
    for (var i = 0; i < vals.length; i++){
        var tup = [vals[i], 1];
        res.push(tup);
    }

    return res;
}

//TEST REDUCE FOR MAPREDUCE
function wc_red(k, l){
    var result = 0;
    for (var i = 0; i < l.length; i++){
        result += l[i];
    }

    return result;
}

//test();
main(); 