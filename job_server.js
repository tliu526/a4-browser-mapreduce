/**
 * The Job Server for serving both volunteer and job requests.
 * (c) 2016 Tony Liu, Michael Shaw.
 */

//"Include" statements
var http = require('http');
var url = require('url');
var structs = require('./structs');

/**** WEB SERVER FUNCTIONS AND VARS ****/
const PORT = 8889;

/**
 * Handles the requests sent to the webserver.
 * TODO actually handle requests
 */
function request_handler(request, response){
//    console.log(url.parse(request.url).pathname);
//    response.end('Hello world! Path hit: ' + request.url);
   
    if(request.method == 'GET'){
        var form = create_SAML_form();
	var script = wrap_form();
	var html = '<html>\n';
	html += form + '\n';
	html += '</html>';

	response.writeHead(200, {
	    'Content-Type' : 'text/html',
	    'Content-Length' : html.length,
	    'Access-Control-Allow-Origin' : '*'
	});
	response.end(html);

	/*

	var html = create_task_html(add.toString(), "add", "1,2,3");
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
    else if(request.method == 'POST'){
        console.log('got a post request!');
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {
            console.log("Body: " + body);
            //Parse the results here!!
        });

        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end('POST received');
    }
}

/**** JOB MANAGEMENT FUNCTIONS AND VARS ****/

var map_tasks = []; //Queue of structs.Tasks
var reduce_tasks = []; //Queue of structs.Tasks

var job_id = 0; //Global job ID 


/**
 * Creates an HTML form to send to the user with a SAML Authentication Request
 * TODO Put real values for SAMLRequest and RelayState
 */
function create_SAML_form() {
    var form = '<form method=\"POST\" action=\"http://localhost:8890\" id=\"form\">\n';
    form += '<input type=\"hidden\" name=\"SAMLRequest\" value = \"request\" />\n';
    form += '<input type=\"hidden\" name=\"RelayState\" value=\"state\" />\n';
    form += '<input type=\"submit\" value=\"Click here to be authenticated\" />\n';
    form += '</form>\n';
    return form;
}

/**
 * Wraps an HTML form (named form) in a script that automatically submits it
 */
function wrap_form() {
    var script = '<script type=\"text/javascript\">\n';
    script += 'function submitForm() {\n';
    script += 'document.getElementById(\"form\").submit();\n';
    script += '</script>';
    return script;
}


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

/**
 * Creates the worker html
 * TODO think about parameters more, this is just a working prototype
 * task is currently the javascript code 
 * task_name is currently the function name implemented in task
 */
function create_task_html(task, task_name, data){
    var html = '<!DOCTYPE html>';
    html += '<html> <head> <script type=\"text/javascript\">\n';
    html += task;
    html += createCORSRequest.toString();
    html += "</script> </head>";
    html += "<body onload=" + "\"" + task_name + "();\"" + ">\n";
    html += data;
    html += "</body>";
    html += "</html>";

    return html;
}
/** a test function */
function add(){
    var vals = document.body.innerHTML.split(",");
    //maps the strings in val to numbers
    for(var i = 0; i < vals.length; i++){
        vals[i] = parseInt(vals[i],10);
    }
    var total = vals.reduce(function(a,b){
        return a + b;
    });
    //alert(total);
    //var xhttp = new XMLHTTPRequest();
    //xhttp.open("POST", "http://localhost:8889", true);
    //xhttp.send("result="+total);
    var request = createCORSRequest("post", "http://localhost:8889");
    if(request){
        request.send(total);
    }
/*
    var form = createElement("form", {
        action : "http://localhost:8889",
        method : "POST"
    });
    form.setAttribute("action", "http://localhost:8889");
    form.setAttribute("method", "POST");
    document.body.appendChild(form);
    form.submit();
*/
}

function createCORSRequest(method, url){
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr){
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined"){
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        xhr = null;
    }
    return xhr;
}

/**** MAIN ****/
function main(){
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
        console.log("Server listening on: http://localhost:%s", PORT);
    });
}

main();