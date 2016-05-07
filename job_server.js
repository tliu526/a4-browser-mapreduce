/**
 * The Job Server for serving both volunteer and job requests.
 * (c) 2016 Tony Liu, Michael Shaw.
 */

//"Include" statements
var http = require('http');
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
const JSON_UPLOAD = "/json_upload";
const VOLUNTEER_JS = "/volunteer.js";

const NO_TASK = "DONE"; //the xhr text when there are no outstanding tasks.

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

//    response.end('Hello world! Path hit: ' + request.url);

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
        var body = '';

        if(request.url == JSON_UPLOAD){
            var form = new formidable.IncomingForm();

            form.parse(request, function(err, fields, files) {
              response.writeHead(200, {'content-type': 'text/plain'});
              response.write('received upload:\n\n');
              response.end(util.inspect({fields: fields, files: files}));
          });

            return;
        }

        //Get post data
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function() {
	        //Determine type of post based on attributes
            var post = qs.parse(body);
            if(post.Volunteer != null){

                response.writeHead(301, {
                    Location: job_root_url + VOLUNTEER_PATH
                });
                response.end();
            }

            //we have a volunteer task request
            else if(post.task_req != null){
                console.log('volunteer task request received');

                var content = process_volunteer_request();
                //we have an idle volunteer, with no tasks outstanding
                if(content == NO_TASK){
                    //NOTE, returns undefined when testing locally
                    add_volunteer(request.headers['x-forwarded-for']);

                    var token = new Date().getTime();
                    var expires = token + 60000000;
                    send_new_user(token,expires)

                    //console.log(request.headers['x-forwarded-for']);
                }

                response.writeHead(200, {
                    'Content-Type' : 'text/html',
                    'Content-Length' : content.length,
                    'Expires' : new Date().toUTCString(),
                    'Access-Control-Allow-Origin' : '*'
                });
                response.end(content);   
            }

            //Case 2: Volunteer response
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

	        //Case 3: SAML Response
	        else if(post.SAMLResponse != null) {
                var status = saml.validate_response(post.SAMLResponse);
                console.log(status);
                //TODO redirect based on status code
            }
        });
    }
}

/**
 * Send a new user's token to the IDP to allow for future authentication
 */
 function send_new_user(newUser,expires) {
    var url = idp_root_url;
    var request = createCORSRequest('POST',url);
    if (request) {
       var data = 'newUser=' + newUser + '&expires=' + expires;
       request.send(data);
   }

}

/**** JOB MANAGEMENT FUNCTIONS AND VARS ****/


var jobs = new structs.Queue(); //A queue of jobs managed by the job server
var cur_job = null;

var avail_volunteers = {}; //tracks the number of available (idle) volunteers

/**
 * Submits a job with the specified map and reduce functions to the job server. TODOO
 */
 function submit_job(map, reduce, data){
    //TODO
}

/**
 * Helper function for retrieving the function name of func
 */
 function get_func_name(func){
    var f_str = func.toString();
    f_str = f_str.substring('function '.length);
    return f_str.substring(0, f_str.indexOf('('));
}

/**
 * Assigns a task (if any are available) to a volunteer. Returns a JSON obje
 */
 function process_volunteer_request(){
    if(!cur_job.is_complete()){
        var task = cur_job.get_task();
        //need to stringify the array of arrays
        task['data'] = JSON.stringify(task['data']);
        return JSON.stringify(task);
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
        console.log(cur_job.get_output());
        return NO_TASK;
    }
    else{
        return process_volunteer_request();
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

    console.log("There are currently " + Object.keys(avail_volunteers).length + " volunteers available");
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
    
    check_volunteers();

    /*
    while(!cur_job.is_complete()){
        //do nothing, for now
    //    setTimeout(cur_job.print_progress(), 300000);
    }
    
    console.log("Final output");
    console.log(cur_job.get_output());
    */
}


function check_volunteers(){
    update_volunteers();
    setTimeout(check_volunteers, 3000);
}

function test(){
    /*
    var t = new structs.Task('id3', function(){console.log('hi')}, 'dataaaaa');
    console.log(t['id']);
    console.log(t['func']);
    console.log(t['data']);
    */
    
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

test();
main();