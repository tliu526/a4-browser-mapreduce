/**
For the requester page to submit map_reduce functions.
(c) 2016 Tony Liu, Michael Shaw
*/

function submit_forms(){

    document.getElementById("data").submit();

    var mpr_form = document.getElementById("map_reduce");
    var files = document.getElementById("mpr_select").files;
    var formData = new FormData();
    formData.append("js_upload", files[0], files[0].name);
    var xhr = createCORSRequest("POST", "/js_upload");
    xhr.send(formData);

    xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {

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