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
var SignedXml = require('xml-crypto').SignedXml;

const PORT = 8890;

var relayState;

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
		    //Save relayState for later. TODO this is probably bad
		    relayState = post.RelayState;
		    //Case 1: Initial SAMLRequest
		    console.log('Just received a SAML request.');
		    
		    var htmlFile = 'identity_provider_login.html';
		    var text = fs.readFileSync(htmlFile,'utf8');
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
		    add_new_user(newUser,expires,responsePath);

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

/**
 * TODO do we need this function?
 * Takes a parsed qs object and extracts the SAML request
 */
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

/**
 * Check SQLite database for a user's privileges
 */
function validate_user(user,responsePath) {
    
    var db = new sqlite3.Database(file);
    
    db.get('SELECT TOKEN, EXPIRE FROM USERS WHERE TOKEN = ' + user + ';',function(err,row) {
	    var now = new Date().getTime();
    
	    if (typeof row == 'undefined') {
		console.log('User-specified token not found in database. Access will be denied.');
		//TODO redirect user
	    } else {
		var token = row.TOKEN;
		var expire = row.EXPIRE;
		var currentDateTime = new Date().getTime();
		if (expire < currentDateTime) {
		    console.log('User\'s token has expired. Access will be denied');
		    //TODO redirect user
		} else {
		    console.log('Token is valid. Access will be granted');
		    send_response(token,expire,true,responsePath);
		}
	    }
	});
    db.close();
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

/**
 * Create SAML Response with Assertion
 */
function send_response(user,expire,authenticated,responsePath) {

    //Create SAMLResponse
    var writer = new XMLWriter(true);

    //Start document
    writer.startDocument();

    //Start samlp:Response element and write attributes
    writer.startElement('samlp:Response');
    writer.writeAttribute('xmlns:samlp','urn:oasis:names:tc:SAML:2.0:protocol');
    writer.writeAttribute('xmlns:saml','urn:oasis:names:tc:SAML:2.0:assertion');
    writer.writeAttribute('Version','2.0');
    var datetime = new Date().getTime();
    writer.writeAttribute('IssueInstant',datetime);

    //Issuer element                                                   
    writer.startElement('saml:Issuer');
    writer.text('http://localhost:8890');
    writer.endElement();    

    //Start saml:Assertion element and write attributes
    writer.startElement('saml:Assertion');
    writer.writeAttribute('xmlns:saml', 'urn:oasis:names:tc:SAML:2.0:assertion');
    writer.writeAttribute('IssueInstant',datetime);
    writer.writeAttribute('Version','2.0');

    //Issuer
    writer.startElement('saml:Issuer');
    writer.text('http://localhost:8890');
    writer.endElement();

    //put signature here

    //Subject, NameID
    writer.startElement('saml:Subject');
    writer.writeElement('saml:NameID',user.toString());
    writer.endElement();

    //Conditions, Audience Restriction, and Audience
    writer.startElement('saml:Conditions');
    writer.writeAttribute('NotOnOrAfter',expire.toString());

    //saml:AudienceRestriction element
    writer.startElement('saml:AudienceRestriction');
    writer.startElement('saml:Audience');
    writer.text('Service for which user is authorized');
    writer.endElement();
    writer.endElement();
    
    //End conditions element
    writer.endElement();
    
    //AttributeStatement, Attribute, and AttributeValue
    //Identifies the user as a resource volunteer
    writer.startElement('saml:AttributeStatement');
    writer.startElement('saml:Attribute');
    writer.startElement('saml:AttributeValue');

    if (authenticated) writer.text('Resource volunteer');
    else writer.text('Not a resource volunteer');
    writer.endElement();
    writer.endElement();
    writer.endElement();

    //End Assertion
    writer.endElement();

    //End SAMLResponse
    writer.endElement();

    //Get saml response in a string
    var samlResponse = writer.toString();

    //Sign the response
    samlResponse = sign_saml(samlResponse);

    //Encode saml response in base64
    var samlResponseBase64 = new Buffer(samlResponse).toString('base64');

    var htmlFile = 'identity_provider_responseForm.html';
    var text = fs.readFileSync(htmlFile,'utf8');
    text = text.replace('Put SAML Response here',samlResponseBase64);
    text = text.replace('Put RelayState here',relayState);
    
    responsePath.writeHead(200, {
	    'Content-Type' : 'text/html',
		'Content-Length' : text.length,
		'Access-Control-Allow-Origin' : '*'
		});
    responsePath.end(text);
    console.log('Sent POST form to user');
}

/**
 * Takes a SAMLResponse, signs it, and returns it
 */

function sign_saml(samlResponse) {
    var signature = new SignedXml();
    signature.addReference('//*[local-name(.)=\'Assertion\']');
    signature.signingKey = fs.readFileSync('privateNoPass.pem');
    signature.computeSignature(samlResponse);
    samlResponse = signature.getSignedXml();
    return samlResponse;
}


function main() {
    //Add a new user to the DB and print out their authentication token
    //Expires after 300 seconds
    var now = new Date().getTime();
    console.log('New token: ' + now);
    var expires = now + 300000;
    console.log('Expires: ' + expires);
    add_new_user(now,expires);

    //Clear expired users from the database
    clear_expired_users();

    //Create server and listen for requests
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
	console.log("Identity provider listening on: http://localhost:%s", PORT);
    });
}

main();