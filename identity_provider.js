/**
 * Identity provider for the Job Server.
 * (c) 2016 Tony Liu, Michael Shaw.
 */


//"Include" statements
var http = require('http');
var XMLWriter = require('xml-writer');
var qs = require('querystring');

var fs = requrie('fs');
var file = 'users.db';
var exists = fs.existsSync(file);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(file);

const PORT = 8890;

/**
 * Handle incoming requests 
 */
function request_handler(request,response) {
    //First request will be a SAML authentication request. TODO The IDP must then prompt the user to enter credentials (how??)
    if (request.method.equals('POST')) {
	
	//Convert POST data into an object
	var data = '';
	request.on('data',function(chunk) {
	    data += chunk;
	});
	request.on('end',function() {
	    var post = qs.parse(data)
	});
	
	//Get SAMLRequest in string
	var samlString = post.SAMLRequest;
	
	//Convert to XML doc
	var samlXml = new XmlDocument(samlString);
	var samlAuthnRequest = samlXml.childNamed('samlp:AuthnRequest');
	var issuer = samlAuthnRequest.childNamed('saml:Issuer');
	
	if (!issuer.val.equals('PUT NAME OF SERVICE PROVIDER HERE')) {
	    console.log('Identity provider does not service this provider');
	}
	
	//TODO URL-decode, then base64-decode, then inflate
	
	
    }
    
    //Second request will be the user's credentials. The IDP must check in the SQLite database for the user, then return a SAML assertion

    //TODO get credentials

    //Create SAML string assertion
    var assertion = create_assertion(user);
    
    //TODO Now send it back to the user
    
}


/**
 * Check SQLite database for a user's privileges
 */
function validate_user(user) {
    db.get('SELECT ' + user + 'FROM USERS',function(err,row){ 
	var token = row.token;
	var expire = row.expire;
    });
    if (token == null) {
	//TODO deny access
    } else {
	var currentdata = new Date();
	var datetime = currentdate
	//TODO allow access if not expired
    }
    
}


/**
 * Return current date time. Format: YYYY/MM/DD hh:mm:ss 
 * Citation: http://stackoverflow.com/questions/10211145/getting-current-date-and-time-in-javascript
 */
function getDateTime() {
    var now     = new Date(); 
    var year    = now.getFullYear();
    var month   = now.getMonth()+1; 
    var day     = now.getDate();
    var hour    = now.getHours();
    var minute  = now.getMinutes();
    var second  = now.getSeconds(); 
    if(month.toString().length == 1) {
        var month = '0'+month;
    }
    if(day.toString().length == 1) {
        var day = '0'+day;
    }   
    if(hour.toString().length == 1) {
        var hour = '0'+hour;
    }
    if(minute.toString().length == 1) {
        var minute = '0'+minute;
    }
    if(second.toString().length == 1) {
        var second = '0'+second;
    }   
    var dateTime = year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second;   
    return dateTime;
}


/**
 * Create an XML string
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
    writer.writeAttribute('NotOnOrAfter','yyyy-mm-ddThh:mm:ss');
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
    create_assertion();
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
	console.log("Identity provider listening on: http://localhost:%s", PORT);
    });
}

main();