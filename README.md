# Final Project for CSCI 339 Distributed Systems

One of the goals with this project is to implement a collaborative in-browser computation system with volunteers and job requesters. Participants can open a specified URL to contribute CPU cycles to an ongoing computation. We're currently utilizing a MapReduce framework as a proof of concept, but in theory any sort of computational work can be distributed across the compute nodes. 

We are also implementing an authentication service that allows users to make use of the shared resources. The idea is that if users become volunteers, they then get access to an authentication token that allows them to submit MapReduce jobs to the cluster. These tokens are verified through an identity provider utilizing the SAML protocol. Another goal of this project is to simulate how real-world users might exploit vulnerabilities in SAML libraries to gain unauthorized access.

Questions?
Email tl4@williams.edu or mgs1@williams.edu

## Dependencies

We are using Node.js for implementing our Job Server.

npm packages currently installed:
- sqllite3
- xml-writer
- querystring
- xmldoc
- path
- xml-crypto
- xpath
- xmldom
- formidable (for parsing file uploads)
- http
- fs

## How to run

Job server: 
	node job_server
Identity provider:
	node identity_provider
Navigate to:
	bmr-cs339/rhcloud.com 

## How to commit a Signature wrapping attack

1) Start the system as described above
2) Click 'Access resources' and provide any value for the token
3) When the identity provider prompts you to press a button to return to the job server, instead of clicking it view the HTML source of the page. Copy the value of SAMLResponse stored in the button's code.
4) Launch malicious_user.js with the copied SAMLResponse as a command line argument
	node malicious_user [SAMLResponse]
5) Navigate to the provided URL and click the button that is displayed. You now have access. 

