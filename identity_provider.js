/**
 * Identity provider for the Job Server.
 * (c) 2016 Tony Liu, Michael Shaw.
 */


//"Include" statements
var http = require('http');
var XMLWriter = require('xml-writer');
var qs = require('querystring');

var fs = require('fs');
var file = 'users.db';
var exists = fs.existsSync(file);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(file);

const PORT = 8890;

/**
 * Handle incoming requests 
 */
function request_handler(request,response) {
    
    if (request.method == 'POST') {
	
	//Convert POST data into an object
	var data = '';
	request.on('data', function (chunk) {
		data += chunk;
	    });
	request.on('end', function () {
		var post = qs.parse(data);	

		if (post.SAMLRequest != null) {
		    //Case 1: Initial SAMLRequest
		    console.log('Just received a SAML request. Request: ' + post.SAMLRequest);
		    var html = create_login_page();
		    response.writeHead(200, {
			    'Content-Type' : 'text/html',
				'Content-Length' : html.length,
				'Access-Control-Allow-Origin': '*'
				});
		    response.end(html);
		    
		    
		} else if (post.token != null) {
		    //Case 2: Response from user login attempt
		    console.log('Just received an authentication token. Token: ' + post.token);
		    var token = post.token;
		    if (validate_user(token)) {
			//TODO respond with a SAMLAssertion verifying user
		    } else {
			//TODO display 'access denied' page
		    }
		    
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
		}
	    });
    }
}

//Takes a parsed qs object and extracts the SAML request
function extract_saml(post) {
    //Get saml in string
    var samlString = post.SAMLRequest;

    //Convert to XML doc                                               
    var samlXml = new XmlDocument(samlString);
    var samlAuthnRequest = samlXml.childNamed('samlp:AuthnRequest');
    var issuer = samlAuthnRequest.childNamed('saml:Issuer');

    if (!issuer.val.equals('PUT NAME OF SERVICE PROVIDER HERE')) {
	console.log('Identity provider does not service this provider');
    }

}

function create_login_page() {
    var html = '<!DOCTYPE html>';
    html += '<form action = \"http://localhost:8890\" method=\"POST\">';
    html += 'Authentication token:<br>';
    html += '<input type=\"text\" name=\"token\"><br>';
    html += '<input type=\"submit\" value=\"Submit\">';
    html += '</form>';
    return html;
}


/**
 * Check SQLite database for a user's privileges
 */
function validate_user(user) {
    var token;
    var validated = false;
    db.get('SELECT ' + user + ' FROM USERS',function(err,row){ 
	    if (typeof row == "undefined") {
		console.log('User-specified token not found in database. Access denied.');
	    } else {
		var token = row.token;
		var expire = row.expire;
		var currentDateTime = new Date().getTime();
		if (expire < currentDateTime) {
		    console.log('User\'s token has expired. Access denied');
		} else {
		    console.log('Token is valid. Access granted');
		    validated = true;
		}
	    }
    });
    return validated;
}

function add_new_user(user,expires) {
    var stmt = db.prepare('INSERT INTO USERS VALUES (' + user + ', ' + expires + ');'); 
    stmt.run();
    console.log('Added a user with token ' + user + ' to database');
}

/**
 * Create SAML assertion
 */
function create_assertion(user) {
    var writer = new XMLWriter(true);

    //Opening Assertion tag
    writer.startDocument();
    writer.startElement('saml:Assertion');
    writer.writeAttribute('xmlns:saml','urn:oasis:names:tc:SAML:2.0:assertion');
    writer.writeAttribute('Version','2.0');

    //Issuer
    writer.startElement('saml:Issuer');
    writer.text('Identity provider');
    writer.endElement();

    //put signature here

    //Subject, NameID
    writer.startElement('saml:Subject');
    writer.startElement('saml:NameID');
    writer.text(user);
    writer.endElement(); 
    writer.endElement();

    //Conditions, Audience Restriction, and Audience
    writer.startElement('saml:Conditions');
    
    //Use milliseconds
    writer.writeAttribute('NotOnOrAfter','milliseconds');

    writer.startElement('saml:AudienceRestriction');
    writer.startElement('saml:Audience');
    writer.text('Service for which user is authorized');
    writer.endElement();
    writer.endElement();
    writer.endElement();
    
    //Attribute and AttributeValue
    writer.startElement('saml:Attribute');
    writer.startElement('AttributeValue');
    writer.text('Resource volunteer');
    writer.endElement();
    writer.endElement();

    //End Assertion
    writer.endElement();
    
    var xml_string = writer.toString();
    console.log(xml_string);
}

function main() {
    //Add a new user to the DB and print out their authentication token
    var now = new Date().getTime();
    console.log('Current millis: ' + now);
    var stmt = db.prepare('INSERT INTO USERS VALUES (' + now + ', ' + now + 10000000000 + ');');
    stmt.run();
    console.log('Added a user with token ' + now + ' to databse');

    //Create server and listen for requests
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
	console.log("Identity provider listening on: http://localhost:%s", PORT);
    });
}

main();