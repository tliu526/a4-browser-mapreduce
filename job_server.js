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
var XMLWriter = require('xml-writer');
var xmldoc = require('xmldoc');
var fs = require('fs');
var path = require('path');

var local = true;

/**** WEB SERVER FUNCTIONS AND VARS ****/
const PORT = 8889;
const JOB_SERVER_URL = "http://bmr-cs339.rhcloud.com";
const IDP_URL = "http://idp-cs339.rhcloud.com";
const VOLUNTEER_HTML = "volunteer.html";

//url paths for incoming GET requests
const INDEX = "./";
const VOLUNTEER_PATH = "/volunteer";
const VOLUNTEER_JS = "/volunteer.js";

var root_url = '';

if(local){
    root_url = "http://localhost:" + PORT;
}
else {
    root_url = JOB_SERVER_URL;
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
            //file_path = './job_server_login.html';
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
                var samlRequest = create_SAML_AuthRequest();
                var htmlFile = 'job_server_login.html';

                var text = fs.readFileSync(htmlFile,'utf8');
                text = text.replace('Put SAML Request here',samlRequest);

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
                        response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
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
	    //Get post data
        console.log('got a post request!');
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function() {
	        //Determine type of post based on attributes
            var post = qs.parse(body);

            //we know we have a volunteer joining
            if(post.Volunteer != null){

                response.writeHead(301, {
                    Location: root_url + VOLUNTEER_PATH
                });
                response.end();
                /*
                console.log('volunteer join received');

                var html = process_volunteer_join();
                //console.log(html);
                response.writeHead(200, {
                    'Content-Type' : 'text/html',
                    'Content-Length' : html.length,
                    'Expires' : new Date().toUTCString(),
                    'Access-Control-Allow-Origin' : '*'
                });
                response.end(html);
                */
            }

            //we know we have a volunteer response with data
            else if(post.task_id != null){
                console.log('volunteer data received');
                var task_id = post.task_id;
                var data = post.result;
                var data = JSON.parse(data);
                var html = process_volunteer_output(task_id, data);
                //console.log(html);
                //continue servicing outstanding jobs
                if(html != null){
                    response.writeHead(200, {
                        'Content-Type' : 'text/html',
                        'Content-Length' : html.length,
                        'Expires' : new Date().toUTCString(),
                        'Access-Control-Allow-Origin' : '*'
                    });
                    response.end(html);                    
                }
                else {
                    response.end('Thanks for volunteering!');
                }
            }

	    //we know we have a SAMLResponse
	    else if(post.SAMLResponse != null) {
		//Get SAMLResponse in string
		var samlResponseBase64 = post.SAMLResponse;
		var samlResponse = new Buffer(samlResponseBase64,'base64').toString('utf8');
		var xmlObject = new xmldoc.XmlDocument(samlResponse);

		//Get issuer and ensure it's the IDP
		var issuer = xmlObject.childNamed('saml:Issuer');
		
		if (issuer.val.trim() != 'http://localhost:8890') {
		    console.log('Invalid identity provider. Response ignored');
		    return;
		}

		//Get assertion
		var assertion = xmlObject.childNamed('saml:Assertion');

		//TODO check signature

		//Check NotOnOrAfter
		var conditions = assertion.childNamed('saml:Conditions');
		var expires = conditions.attr.NotOnOrAfter;
		var now = new Date().getTime();
		if (expires < now) {
		    console.log('SAML Assertion has expired. Access will be denied');
		    //TODO display message to user
		}
		
		//Check attribute
		var attributeValue = assertion.childNamed('saml:AttributeStatement').childNamed('saml:Attribute').childNamed('saml:AttributeValue').val; 
		if (attributeValue == 'Resource volunteer') {
		    console.log('SAMLResponse has confirmed that user is a resource volunteer. Access will be granted');
		    //TODO redirect user
		} else {
		    console.log('SAMLResponse has not confirmed that user is a resource volunteer. Access will be denied');
		    //TODO redirect user
		}
	    }

        });
    }
}


/**
 * Creates and returns a SAMLAuthentication request 
 */
function create_SAML_AuthRequest() {
    var writer = new XMLWriter(true);
    
    writer.startDocument();
    
    writer.startElement('samlp:AuthnRequest');
    writer.writeAttribute('xmlns:samlp','urn:oasis:names:tc:SAML:2.0:protocol');
    writer.writeAttribute('xmlns:saml','urn:oasis:names:tc:SAML:2.0:assertion');
    writer.writeAttribute('Version','2.0');
    var now = new Date().getTime();
    writer.writeAttribute('IssueInstant',now);

    writer.writeElement('saml:Issuer','localhost:8889');
    
    writer.endElement();
    
    var samlRequest = writer.toString();
    var samlRequestBase64 = new Buffer(samlRequest).toString('base64');
    return samlRequestBase64;
}

/**
 * Creates an HTML form to send to the user with a SAML Authentication Request
 * TODO Put real values for SAMLRequest and RelayState
 */
function create_SAML_form() {
    var form = '<form method=\"POST\" action=\"http://localhost:8890\" id=\"form\">\n';
    form += '<input type=\"hidden\" name=\"SAMLRequest\" value = \"' + request + '\" />\n';
    form += '<input type=\"hidden\" name=\"RelayState\" value=\"state\" />\n';
    form += '<input type=\"submit\" value=\"Access resources\" />\n';
    form += '</form>\n';
    return form;
    
}

function create_volunteer_form() {
    var form = '<form method = \"POST\" action=\"http://localhost:8889\">\n';
    form += '<input type=\"hidden\" name=\"Volunteer\" value=\"True\" />\n';
    form += '<input type=\"submit\" value=\"Volunteer resources\" />\n';
    form += '</form>\n';
    return form;
}

/**
 * Send a new user's token to the IDP to allow for future authentication
 */
function send_new_user(newUser,expires) {
    var url = 'http://localhost:8890';
    var request = createCORSRequest('POST',url);
    if (request) {
	var data = 'newUser=' + newUser + '&expires=' + expires;
	request.send(data);
    }
    
}

/**** JOB MANAGEMENT FUNCTIONS AND VARS ****/

//A queue of jobs managed by the job server
var jobs = new structs.Queue();
var cur_job = null;

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
 * Creates the worker javascript code.
 * task is the javascript function to be embedded.
 * task_id is the map or reduce job id being serviced.
 */
function create_task_js(task, task_id){
    var js = "";

    if(local){
        url = "http://localhost:" + PORT;
    }
    else {
        url = JOB_SERVER_URL;
    }
    var func_name = get_func_name(task);

    js += "var url=" + "\"" + url + "\"" + ";\n";
    js += "var task_id=" + "\"" + task_id + "\"" + ";\n";
    js += task.toString() + "\n";
    js += createCORSRequest.toString() + "\n";
    js += process_task.toString() + "\n";

    js += "process_task(" + func_name + ", task_id, url);";

    return js;

    /*
    if(local){
        url = "http://localhost:" + PORT;
    }
    else {
        url = JOB_SERVER_URL;
    }
    var func_name = get_func_name(task);
    var html = '<!DOCTYPE html>';
    html += '<html> <head>';
    //html += "<div id=\"output\"></div>";
    html += '<script type=\"text/javascript\">\n';
    html += "var url=" + "\"" + url + "\"" + ";\n";
    html += "var task_id=" + "\"" + task_id + "\"" + ";\n";
    html += task.toString();
    html += createCORSRequest.toString();
    html += process_task.toString();
    html += "</script> </head>";
    html += "<body onload=" + "\"process_task(" + func_name + ", task_id, url);" + "\">\n";
    //html += "<header>" + task_id + "</header>\n";
    html += JSON.stringify(data);
    html += "</body>";
    html += "</html>";

    return html;
    */
}

/**
 * Processes a volunteer request to join cluster and gives them a specific task 
 * to complete.
 *
 * Returns the html of the task they have been assigned.
 */
function process_volunteer_join(){
    var html = fs.readFileSync(VOLUNTEER_HTML, 'utf8');
    /*
    var task = cur_job.get_task();
    if (task != null){
        html = html.replace('SCRIPT', create_task_js(task['func'], task['id']));
        html = html.replace('DATA', JSON.stringify(task['data']));
    }
    else {
        //TODO handle
        console.log('no more outstanding jobs');
    }
    */
    return html;
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
        return null;
    }
    else{
        var task = cur_job.get_task();
        var script = create_task_js(task['func'], task['id']);
        var data = JSON.stringify(task['data']);
        var tup = [data, script];
        return JSON.stringify(tup);
    }
}

/**** MAIN ****/
function main(){
    var server = http.createServer(request_handler);


    if(local){
        server.listen(PORT, function(){
            console.log("Server listening on: http://localhost:%s", PORT);
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
    /*
    while(!cur_job.is_complete()){
        //do nothing, for now
    //    setTimeout(cur_job.print_progress(), 300000);
    }
    
    console.log("Final output");
    console.log(cur_job.get_output());
    */
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