# Final Project for CSCI 339 Distributed Systems

One of the goals with this project is to implement a collaborative in-browser computation system with volunteers and job requesters. Participants can open a specified URL to contribute CPU cycles to an ongoing computation. We're currently utilizing a MapReduce framework as a proof of concept, but in theory any sort of computational work can be distributed across the compute nodes. 

We are also implementing an authentication service that allows users to make use of the shared resources. The idea is that if users become volunteers, they then get access to an authentication token that allows them to submit MapReduce jobs to the cluster. These tokens are verified through an identity provider utilizing the SAML protocol. Another goal of this project is to simulate how real-world users might exploit vulnerabilities in SAML libraries to gain unauthorized access. We do this by simulating a man-in-the-middle attack in which a user alters a SAML document to get access to our system's resources despite not having been authenticated.

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

1) Start the job server: node job_server
2) Start the identity provider: node identity_provider
3a) Navigate to: http://localhost:8889
3b) Alternatively, we have a version running online at http://bmr-cs339/rhcloud.com 


## Demo

We provide the tools for a sample MapReduce job in the demo folder. This folder contains Map and Reduce functions that get the word count of each word in a document. These functions are written in word_count.js. The demo folder also contains sentences.json, which is a short collection of sentences on which functions in word_count.js can be run.


## How to commit a Signature wrapping attack

1) Start the system as described above
2) Click 'Access resources' and provide any value for the token
3) When the identity provider prompts you to press a button to return to the job server, instead of clicking it view the HTML source of the page. Copy the value of SAMLResponse stored in the button's code.
4) Launch malicious_user.js with the copied SAMLResponse as a command line argument
	node malicious_user [SAMLResponse]
5) Navigate to the provided URL and click the button that is displayed. You now have access. 

