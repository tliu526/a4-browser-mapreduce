/**
For the requester page to submit map_reduce functions.
(c) 2016 Tony Liu, Michael Shaw
*/

function submit_forms(){

    //document.getElementById("data").submit();

    var data_form = document.getElementById("data_reduce");
    var files = document.getElementById("data_select").files;
    var formData = new FormData();

    for(var i = 0; i < files.length; i++){
        formData.append("data_upload", files[i], files[i].name);
    }
    
    var data_xhr = createCORSRequest("POST", "/data_upload");
    data_xhr.send(formData);

    var mpr_form = document.getElementById("map_reduce");
    var files = document.getElementById("mpr_select").files;
    var formData = new FormData();
    formData.append("js_upload", files[0], files[0].name);
    var xhr = createCORSRequest("POST", "/js_upload");
    xhr.send(formData);

    data_xhr.onreadystatechange = function() {
            if (data_xhr.readyState == XMLHttpRequest.DONE) {

                window.location.href = "/requester/start_job";
            }
        };
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