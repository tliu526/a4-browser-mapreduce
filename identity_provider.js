3/**
 * Identity provider for the Job Server.
 * (c) 2016 Tony Liu, Michael Shaw.
 */


//"Include" statements
var http = require('http');
var XMLWriter = require('xml-writer');
var qs = require('querystring');
var path = require('path');
var fs = require('fs');
var file = 'users.db';
var exists = fs.existsSync(file);
var sqlite3 = require('sqlite3').verbose();
var SignedXml = require('xml-crypto').SignedXml;
var saml = require('./saml_functions')

var relayState = "sampleRelayState";

const JOB_PORT = 8889;
const IDP_PORT = 8890;
const JOB_SERVER_URL = "http://bmr-cs339.rhcloud.com";
const IDP_URL = "http://idp-cs339.rhcloud.com";
var job_root_url = '';
var idp_root_url = '';

var local = true;

if(local){
    job_root_url = "http://localhost:" + JOB_PORT;
    idp_root_url = "http://localhost:" + IDP_PORT;
}
else {
    job_root_url = JOB_SERVER_URL;
    idp_root_url = IDP_URL;
}


/**
 * Handle incoming requests 
 */
 function request_handler(request,response) {

  if(request.method == 'GET'){

    var file_path = '.' + request.url;

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

      case '.json':
      content_type = 'application/json';
      break;

      case '.txt':
      content_type = 'text/plain';
      break;

      case '.png':
      content_type = 'image/png';
      break;


      default:
      content_type = 'text/html';
      file_path = file_path + '.html';
    }

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

  if (request.method == 'POST') {

	//Convert POST data into an object
	var data = '';
	request.on('data', function (chunk) {
		data += chunk;
   });
	request.on('end', function () {
		var post = qs.parse(data);	

		if (post.SAMLRequest != null) {
		    //Save relayState for later. TODO this is probably bad
		    relayState = post.RelayState;
		    //Case 1: Initial SAMLRequest
		    console.log('Just received a SAML request.');
		    
		    var htmlFile = 'identity_provider_login.html';
		    var text = fs.readFileSync(htmlFile,'utf8');
            text = text.replace('Put path here',idp_root_url)
		    response.writeHead(200, {
             'Content-Type' : 'text/html',
             'Content-Length' : text.length,
             'Access-Control-Allow-Origin': '*'
         });
		    response.end(text);
		    
		    
		} else if (post.token != null) {
		    //Case 2: Response from user login attempt
		    console.log('Just received an authentication token. Token: ' + post.token);
		    var token = post.token;

		    //Validate the user and send appropriate response
		    validate_user(token,response);
		    
		    
		} else if (post.newUser != null) {
		    //Case 3: New user's token to be added to database
		    var newUser = post.newUser;
		    var expires = post.expires
		    console.log('Just received a new user. New user\'s token: ' + post.newUser + '. Adding new user to database');
		    add_new_user(newUser,expires);

		    //Respond with success message to job_server
		    response.writeHead(200, {
             'Content-Type' : 'text/html',
             'Access-Control-Allow-Origin': '*'
         });
		    var body = "Added user: " + newUser;
		    response.end(body);
		
  } else if (post.removeUser != null) {
        //Case 4: Request to remove user from database
        var user = post.removeUser;
        console.log('Just received a request to remove a user. User to be removed: ' + post.removeUser);
        remove_user(user);

        //Respond with success message to job_server
        response.writeHead(200, {
             'Content-Type' : 'text/html',
             'Access-Control-Allow-Origin': '*'
         });
        var body = "Removed user: " + user;
        response.end(body);
  }
   });
}
}



/**
 * Check SQLite database for a user's privileges
 */
 function validate_user(user,responsePath) {

    var db = new sqlite3.Database(file);
    
    //Check for user in database
    db.get('SELECT TOKEN, EXPIRE FROM USERS WHERE TOKEN = ' + user + ';',function(err,row) {
     var now = new Date().getTime();

        //Check for existence
        if (typeof row == 'undefined') {
            console.log('User-specified token not found in database. Access will be denied.');
            send_response(user,0,false,responsePath);
        } else {
            var token = row.TOKEN;
            var expire = row.EXPIRE;
            var currentDateTime = new Date().getTime();

            //Check for expired
            if (expire < currentDateTime) {
                console.log('User\'s token has expired. Access will be denied');
                send_response(token,expire,false,responsePath);
		      } else {
                console.log('Token is valid. Access will be granted');
                send_response(token,expire,true,responsePath);
            }
        }
        db.close();
    });
    
}

/**
 * Creates a SAML Response and sends it to the user
 */
 function send_response(user,expire,authenticated,responsePath) {

    //Create a base64 encoded SAML Response
    var samlResponse = saml.create_response(user,expire,authenticated);

    //Insert SAML Response into HTML file
    var htmlFile = 'identity_provider_responseForm.html';
    var text = fs.readFileSync(htmlFile,'utf8');
    text = text.replace('Put path here',job_root_url);
    text = text.replace('Put SAML Response here',samlResponse);
    text = text.replace('Put RelayState here',relayState);
    
    //Send SAML Response
    responsePath.writeHead(200, {
       'Content-Type' : 'text/html',
       'Content-Length' : text.length,
       'Access-Control-Allow-Origin' : '*'
   });
    responsePath.end(text);
    console.log('Sent POST form to user');
}

/**
 * Add a new user to the database, along with when their authentication expires
 */
 function add_new_user(user,expires) {
    var db = new sqlite3.Database(file);
    var stmt = 'INSERT INTO USERS VALUES (' + user + ', ' + expires + ');'; 
    db.run(stmt,function(err) {
       if (err != null) {
          console.log('An error occured while adding a user');
      } else {
          console.log('Added user with token ' + user);
      }
      db.close();
  });
}

/**
* Removes a given user from the database
*/
function remove_user(user) {
  var db = new sqlite3.Database(file);
  var stmt = 'DELETE FROM USERS WHERE ID = ?';
  db.run(stmt,user,function(err) {
    if (err != null) {
      console.log('An error occured while removing a user');
    } else {
      console.log('Successfully removed user: ' + user);
    }
    db.close();
  });
}

/**
 * Deletes all users whose authentication tokens have expired
 */
 function clear_expired_users() {
    var db = new sqlite3.Database(file);
    var now = new Date().getTime();
    var stmt = 'DELETE FROM USERS WHERE EXPIRE < ' + now;
    db.run(stmt,function(err) {
       if (err != null) {
          console.log('An error occured while removing expired users');
      } else {
          console.log('Successfully removed users with expired tokens');
      }
      db.close();
  });
}


function main() {
    //Add a new user to the DB and print out their authentication token
    //Expires after 300 seconds
    // var now = new Date().getTime();
    // console.log('New token: ' + now);
    // var expires = now + 300000;
    // console.log('Expires: ' + expires);
    // add_new_user(now,expires);

    //Clear expired users from the database
    clear_expired_users();

    //Create server and listen for requests
    var server = http.createServer(request_handler);
    server.listen(IDP_PORT, function(){
       console.log("Identity provider listening on: http://localhost:%s", IDP_PORT);
   });
}

main();