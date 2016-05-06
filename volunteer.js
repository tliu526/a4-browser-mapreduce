/**
 * The volunteer javascript functions that will be run.
 * (c) 2016 Tony Liu, Michael Shaw.
 */

//for debugging on localhost
var local = true;

//to check whether a task is already being processed
var working = false;
var complete_tasks = 0;

const PORT = 8889;
const JOB_SERVER_URL = "http://bmr-cs339.rhcloud.com";

var post_url = '';

if(local){
    post_url = "http://localhost:" + PORT;
}
else {
    post_url = JOB_SERVER_URL;
}

const TASK_REQ = "task_req=true"; //the POST data for a task request

const NO_TASK = "DONE"; //the xhr text when there are no outstanding tasks.

/**
 * Processes a single task appropriately, and sends the response. Will continue to
 * query the job server until there are no outsanding tasks or the volunteer exits.
 * This function is embedded in the html page of the volunteer client, so no
 * references outside of this scope can be made.
 */
function process_task(){
    var data = JSON.parse(document.getElementById("data").innerHTML);
    console.log(data);
    //uh-oh eval
    var func = eval("(" + html_format(document.getElementById("task").innerHTML) + ")");
    console.log(func);
    var id = document.getElementById("task_id").innerHTML;

    var out = [];

    //map task
    if(id.substring(0,1) == 'm'){
        for (var i = 0; i < data.length; i++){
            var k = data[i][0];
            var v = data[i][1];
            //TODO assumes that output of the map is a list
            out = out.concat(func(k, v));
        }
    }
    else if(id.substring(0,1) == 'r'){
        for (var i = 0; i < data.length; i++){
            var k = data[i][0];
            var v = data[i][1];
            out.push([k, func(k, v)]);
        }
    }

    var out_str = JSON.stringify(out);
    var response = "task_id=" + id + "&" + "result=" + out_str;
    
    //display results to volunteer
    complete_tasks += 1;
    document.getElementById("result").innerHTML = complete_tasks;

    send_post(response, post_url);
    working = false;
}


/**
 * Formats str to be html compliant. Specifically escapes < and >.
 */
function html_format(str){
    str = str.split("&lt;").join("<");
    str = str.split("&gt;").join(">");
    console.log(str);
    return str;
}

/**
 * Creates and sends a post message; used for posting output back to job server
 * and requesting new tasks.
 */
function send_post(message){
    //Create and send back POST form
    var xmlhttp = createCORSRequest("post", post_url);

    //parses the response from the sent output, and parses the response, if applicable
    if(xmlhttp){
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                var response = xmlhttp.responseText;
                if(response != NO_TASK){
                    //var script = document.createElement("script");
                    //document.getElementsByTagName('head')[0].appendChild(script);

                    //the returned tuple from process_volunteer_output
                    var task = JSON.parse(xmlhttp.responseText);

                    document.getElementById("task_id").innerHTML = task['id'];
                    document.getElementById("data").innerHTML = task['data'];
                    document.getElementById("task").innerHTML = task['func'];

                    working = true;
                    process_task();
                }
            }
        }

        console.log("sending post!");     
        xmlhttp.send(message);
    }
}

/**
 * Appropriately formats and creates an XMLHttpRequest (to deal with cross domain)
 */
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
/**
 * continually asks the job server for a task, if the volunteer is not working.
 */
function request_task(){
    console.log("request_task");
    if(!working){
        send_post(TASK_REQ);        
    }
    setTimeout(request_task, 3000);
}

request_task();

